import { useState } from 'react'
import { render, screen, renderHook, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsScreen } from './SettingsScreen'
import { useAppState } from './useAppState'
import { defaultSettings } from '../settings'
import { KEYS, type KeyValueStore } from '../storage'
import type { WeekSettings } from '../types'

function Harness({ onChange }: { onChange?: (s: WeekSettings) => void }) {
  const [s, setS] = useState(defaultSettings())
  return (
    <SettingsScreen
      settings={s}
      onChange={(n) => {
        setS(n)
        onChange?.(n)
      }}
    />
  )
}

const memStore = (initial: Record<string, string> = {}): KeyValueStore => {
  const m = new Map(Object.entries(initial))
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) }
}

describe('SettingsScreen', () => {
  it('renders a slot for each of 7 days x 3 meals', () => {
    render(<Harness />)
    expect(screen.getAllByTestId('slot')).toHaveLength(21)
  })

  it('marks a slot "안 먹음" when people is set to 0 and reports the change', async () => {
    const seen: WeekSettings[] = []
    render(<Harness onChange={(s) => seen.push(s)} />)
    await userEvent.click(screen.getByRole('button', { name: '수요일 점심' }))
    const people = screen.getByLabelText('인원')
    await userEvent.clear(people)
    await userEvent.type(people, '0')
    expect(screen.getByRole('button', { name: '수요일 점심' })).toHaveTextContent('안 먹음')
    expect(seen.at(-1)![2].lunch.people).toBe(0)
  })

  it('changes difficulty', async () => {
    const seen: WeekSettings[] = []
    render(<Harness onChange={(s) => seen.push(s)} />)
    await userEvent.click(screen.getByRole('button', { name: '월요일 저녁' }))
    await userEvent.selectOptions(screen.getByLabelText('난이도'), '3')
    expect(seen.at(-1)![0].dinner.maxDifficulty).toBe(3)
  })
})

describe('useAppState', () => {
  it('falls back to default settings when stored JSON is broken', () => {
    const { result } = renderHook(() => useAppState(memStore({ [KEYS.settings]: '{broken' }), []))
    expect(result.current.settings).toEqual(defaultSettings())
  })
  it('falls back to default settings when stored JSON has the wrong shape', () => {
    const { result } = renderHook(() => useAppState(memStore({ [KEYS.settings]: '{}' }), []))
    expect(result.current.settings).toEqual(defaultSettings())
  })
  it('persists settings changes to the store', () => {
    const store = memStore()
    const { result } = renderHook(() => useAppState(store, []))
    const next = defaultSettings()
    next[0].lunch.people = 5
    act(() => result.current.setSettings(next))
    expect(JSON.parse(store.get(KEYS.settings)!)[0].lunch.people).toBe(5)
  })

  const goodMeal = { date: '2026-10-12', meal: 'dinner', recipeId: 'x', people: 2, locked: false, relaxed: false }
  it.each([
    ['missing weeks and warnings', { startDate: '2026-10-12', meals: [] }],
    ['null meal entry', { startDate: '2026-10-12', weeks: 1, warnings: [], meals: [null] }],
    ['unsupported weeks', { startDate: '2026-10-12', weeks: 3, warnings: [], meals: [goodMeal] }],
    ['meal missing fields', { startDate: '2026-10-12', weeks: 1, warnings: [], meals: [{ date: '2026-10-12' }] }],
  ])('ignores a stored plan with %s', (_name, bad) => {
    const { result } = renderHook(() => useAppState(memStore({ [KEYS.plan]: JSON.stringify(bad) }), []))
    expect(result.current.plan).toBeNull()
  })
  it('keeps a well-formed stored plan', () => {
    const good = { startDate: '2026-10-12', weeks: 1, warnings: [], meals: [goodMeal] }
    const { result } = renderHook(() => useAppState(memStore({ [KEYS.plan]: JSON.stringify(good) }), []))
    expect(result.current.plan).toEqual(good)
  })
  it('persists bought checkmarks across reloads', () => {
    const store = memStore()
    const first = renderHook(() => useAppState(store, []))
    act(() => first.result.current.toggleBought('0|양파|개|2'))
    const second = renderHook(() => useAppState(store, []))
    expect(second.result.current.bought.has('0|양파|개|2')).toBe(true)
    act(() => second.result.current.toggleBought('0|양파|개|2'))
    expect(second.result.current.bought.has('0|양파|개|2')).toBe(false)
  })
})
