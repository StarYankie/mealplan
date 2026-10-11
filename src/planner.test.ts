import { generatePlan, rerollMeal, nextMonday } from './planner'
import { defaultSettings } from './settings'
import type { Difficulty, Meal, Recipe } from './types'

function r(id: string, meals: Meal[], difficulty: Difficulty, names: string[] = [id]): Recipe {
  return {
    id,
    name: id,
    meals,
    difficulty,
    minutes: 10,
    ingredients: names.map((n) => ({ name: n, amount: 1, unit: '개', category: '기타' as const })),
    steps: ['만든다'],
  }
}
const many = (prefix: string, meal: Meal, d: Difficulty, n: number) =>
  Array.from({ length: n }, (_, i) => r(`${prefix}${i}`, [meal], d))

const seq = () => {
  let i = 0
  return () => ((i++ * 0.37 + 0.11) % 1)
}
const dayDiff = (a: string, b: string) =>
  Math.abs(Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000

describe('generatePlan', () => {
  const recipes = [...many('L', 'lunch', 1, 10), ...many('D', 'dinner', 2, 10)]

  it('skips slots with zero people (Wednesday lunch) and zero-people breakfast', () => {
    const s = defaultSettings()
    s[2].lunch.people = 0 // 수요일
    const plan = generatePlan({ settings: s, recipes, startDate: '2026-10-12', weeks: 1, rng: seq() })
    expect(plan.meals.find((m) => m.date === '2026-10-14' && m.meal === 'lunch')).toBeUndefined()
    expect(plan.meals.some((m) => m.meal === 'breakfast')).toBe(false)
    expect(plan.meals).toHaveLength(7 * 2 - 1)
  })

  it('respects the difficulty ceiling without relaxing when enough recipes exist', () => {
    const mixed = [...many('E', 'lunch', 1, 8), ...many('H', 'lunch', 3, 3), ...many('D', 'dinner', 2, 10)]
    const plan = generatePlan({ settings: defaultSettings(), recipes: mixed, startDate: '2026-10-12', weeks: 1, rng: seq() })
    const lunches = plan.meals.filter((m) => m.meal === 'lunch')
    expect(lunches.every((m) => m.recipeId.startsWith('E') && !m.relaxed)).toBe(true)
  })

  it('does not repeat a recipe within 7 days over four weeks', () => {
    const plan = generatePlan({ settings: defaultSettings(), recipes, startDate: '2026-10-12', weeks: 4, rng: seq() })
    expect(plan.meals).toHaveLength(28 * 2)
    for (const a of plan.meals)
      for (const b of plan.meals)
        if (a !== b && a.recipeId === b.recipeId) expect(dayDiff(a.date, b.date)).toBeGreaterThanOrEqual(7)
  })

  it('maps dates and weekdays correctly across a year boundary from a non-Monday start', () => {
    const s = defaultSettings()
    for (const d of s) d.lunch.people = 2
    s[3].lunch.people = 0 // 목요일
    const plan = generatePlan({ settings: s, recipes, startDate: '2025-12-31', weeks: 4, rng: seq() })
    const lunchDates = plan.meals.filter((m) => m.meal === 'lunch').map((m) => m.date)
    expect(lunchDates).toContain('2025-12-31')
    for (const thu of ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22'])
      expect(lunchDates).not.toContain(thu)
    expect(lunchDates).toContain('2026-01-27') // 28일째
    expect(lunchDates).not.toContain('2026-01-28')
  })

  it('relaxes difficulty one level and warns when too few recipes fit', () => {
    const few = [...many('E', 'lunch', 1, 3), ...many('M', 'lunch', 2, 10), ...many('D', 'dinner', 2, 10)]
    const plan = generatePlan({ settings: defaultSettings(), recipes: few, startDate: '2026-10-12', weeks: 1, rng: seq() })
    const relaxed = plan.meals.filter((m) => m.relaxed)
    expect(relaxed.length).toBeGreaterThan(0)
    expect(relaxed.every((m) => m.recipeId.startsWith('M'))).toBe(true)
    expect(plan.warnings.length).toBeGreaterThan(0)
  })

  it('allows repeats with a warning when even relaxing cannot fill the week', () => {
    const tiny = [...many('E', 'lunch', 1, 2), ...many('D', 'dinner', 2, 10)]
    const plan = generatePlan({ settings: defaultSettings(), recipes: tiny, startDate: '2026-10-12', weeks: 1, rng: seq() })
    expect(plan.meals.filter((m) => m.meal === 'lunch')).toHaveLength(7)
    expect(plan.warnings.length).toBeGreaterThan(0)
  })

  it('returns an empty plan without throwing when everyone is zero', () => {
    const s = defaultSettings()
    for (const d of s) {
      d.breakfast.people = 0
      d.lunch.people = 0
      d.dinner.people = 0
    }
    const plan = generatePlan({ settings: s, recipes, startDate: '2026-10-12', weeks: 4 })
    expect(plan.meals).toEqual([])
  })

  it('keeps locked meals passed in via keep', () => {
    const locked = { date: '2026-10-12', meal: 'dinner' as const, recipeId: 'D3', people: 2, locked: true, relaxed: false }
    const plan = generatePlan({ settings: defaultSettings(), recipes, startDate: '2026-10-12', weeks: 1, rng: seq(), keep: [locked] })
    expect(plan.meals.find((m) => m.date === '2026-10-12' && m.meal === 'dinner')).toEqual(locked)
  })
})

describe('rerollMeal', () => {
  const recipes = [...many('L', 'lunch', 1, 10), ...many('D', 'dinner', 2, 10)]
  const base = generatePlan({ settings: defaultSettings(), recipes, startDate: '2026-10-12', weeks: 1, rng: seq() })

  it('changes only the chosen meal', () => {
    const i = base.meals.findIndex((m) => m.meal === 'dinner')
    const next = rerollMeal(base, i, { settings: defaultSettings(), recipes, rng: seq() })
    expect(next.meals[i].recipeId).not.toBe(base.meals[i].recipeId)
    expect(next.meals.filter((_, j) => j !== i)).toEqual(base.meals.filter((_, j) => j !== i))
  })

  it('does not change a locked meal', () => {
    const locked = { ...base, meals: base.meals.map((m, j) => (j === 0 ? { ...m, locked: true } : m)) }
    expect(rerollMeal(locked, 0, { settings: defaultSettings(), recipes, rng: seq() })).toEqual(locked)
  })
})

describe('nextMonday', () => {
  it('returns the coming Monday, or today if it is Monday', () => {
    expect(nextMonday(new Date(2026, 9, 11))).toBe('2026-10-12') // 일요일
    expect(nextMonday(new Date(2026, 9, 12))).toBe('2026-10-12') // 월요일
    expect(nextMonday(new Date(2026, 9, 14))).toBe('2026-10-19') // 수요일
  })
})
