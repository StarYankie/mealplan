import { renderHook, act } from '@testing-library/react'
import { useAppState } from './useAppState'
import { defaultSettings } from '../settings'
import { KEYS, type KeyValueStore } from '../storage'
import type { Plan } from '../types'

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

describe('useAppState theme', () => {
  it('defaults to following the system', () => {
    const { result } = renderHook(() => useAppState(memStore(), []))
    expect(result.current.theme).toBe('system')
  })
  it('ignores an invalid stored theme', () => {
    const { result } = renderHook(() => useAppState(memStore({ [KEYS.theme]: '"purple"' }), []))
    expect(result.current.theme).toBe('system')
  })
  it('persists the chosen theme', () => {
    const store = memStore()
    const first = renderHook(() => useAppState(store, []))
    act(() => first.result.current.setTheme('dark'))
    const second = renderHook(() => useAppState(store, []))
    expect(second.result.current.theme).toBe('dark')
  })
})

describe('useAppState plans per week', () => {
  const planOf = (startDate: string, tag = 'x'): Plan => ({
    startDate,
    weeks: 1,
    warnings: [],
    meals: [{ date: startDate, meal: 'dinner', recipeId: tag, people: 2, locked: false, relaxed: false }],
  })

  it('keeps a separate plan for each start date and switches between them', () => {
    const { result } = renderHook(() => useAppState(memStore(), []))
    act(() => result.current.setPlan(planOf('2026-10-12', 'A')))
    expect(result.current.startDate).toBe('2026-10-12')
    act(() => result.current.setStartDate('2026-10-05'))
    expect(result.current.plan).toBeNull()
    act(() => result.current.setPlan(planOf('2026-10-05', 'B')))
    act(() => result.current.setStartDate('2026-10-12'))
    expect(result.current.plan!.meals[0].recipeId).toBe('A')
    act(() => result.current.setStartDate('2026-10-05'))
    expect(result.current.plan!.meals[0].recipeId).toBe('B')
  })

  it('persists the plans and the selected week', () => {
    const store = memStore()
    const first = renderHook(() => useAppState(store, []))
    act(() => first.result.current.setPlan(planOf('2026-10-12', 'A')))
    act(() => first.result.current.setPlan(planOf('2026-10-05', 'B')))
    const second = renderHook(() => useAppState(store, []))
    expect(second.result.current.startDate).toBe('2026-10-05')
    expect(Object.keys(second.result.current.plans).sort()).toEqual(['2026-10-05', '2026-10-12'])
  })

  it('moves an old single saved plan into the per-week storage', () => {
    const old = planOf('2026-09-28', 'OLD')
    const { result } = renderHook(() => useAppState(memStore({ [KEYS.plan]: JSON.stringify(old) }), []))
    expect(result.current.startDate).toBe('2026-09-28')
    expect(result.current.plan).toEqual(old)
  })

  it('keeps only the 8 most recent weeks', () => {
    const { result } = renderHook(() => useAppState(memStore(), []))
    const days = ['2026-01-10', '2026-01-11', '2026-01-12', '2026-01-13', '2026-01-14', '2026-01-15', '2026-01-16', '2026-01-17', '2026-01-18', '2026-01-19']
    days.forEach((d, i) => act(() => result.current.setPlan(planOf(d, 'P' + i))))
    const keys = Object.keys(result.current.plans).sort()
    expect(keys).toHaveLength(8)
    expect(keys).not.toContain('2026-01-10') // 가장 오래된 두 개가 빠진다
    expect(keys).not.toContain('2026-01-11')
  })

  it('ignores broken entries in the stored plans', () => {
    const good = planOf('2026-10-12', 'A')
    const stored = { '2026-10-12': good, '2026-10-05': { startDate: '2026-10-05' }, nope: null }
    const store = memStore({ [KEYS.plans]: JSON.stringify(stored), [KEYS.start]: '"2026-10-12"' })
    const { result } = renderHook(() => useAppState(store, []))
    expect(Object.keys(result.current.plans)).toEqual(['2026-10-12'])
    expect(result.current.plan).toEqual(good)
  })
})

