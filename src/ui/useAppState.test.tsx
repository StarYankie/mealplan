import { renderHook, act } from '@testing-library/react'
import { useAppState } from './useAppState'
import { defaultSettings } from '../settings'
import { KEYS, type KeyValueStore } from '../storage'

const memStore = (initial: Record<string, string> = {}): KeyValueStore => {
  const m = new Map(Object.entries(initial))
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) }
}

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
