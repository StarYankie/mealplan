import { buildShoppingList, weekCount } from './shopping'
import type { Plan, Recipe } from './types'

const egg: Recipe = {
  id: 'egg', name: '계란볶음밥', meals: ['lunch'], difficulty: 1, minutes: 10, steps: ['볶는다'],
  ingredients: [
    { name: '계란', amount: 2, unit: '개', category: '육류·계란' },
    { name: '양파', amount: 0.5, unit: '개', category: '채소·과일' },
  ],
}
const soup: Recipe = {
  id: 'soup', name: '양파국', meals: ['dinner'], difficulty: 2, minutes: 20, steps: ['끓인다'],
  ingredients: [
    { name: '양파', amount: 100, unit: 'g', category: '채소·과일' },
    { name: '두부', amount: 0.5, unit: '모', category: '기타' },
  ],
}
const recipes = [egg, soup]
const m = (date: string, recipeId: string, meal: 'lunch' | 'dinner', people: number) =>
  ({ date, meal, recipeId, people, locked: false, relaxed: false })
const plan = (meals: Plan['meals'], weeks: 1 | 4 = 1): Plan => ({ startDate: '2026-10-12', weeks, meals, warnings: [] })

describe('buildShoppingList', () => {
  it('sums same name and unit, scaled by people', () => {
    const p = plan([m('2026-10-12', 'egg', 'lunch', 2), m('2026-10-13', 'egg', 'lunch', 1)])
    const list = buildShoppingList(p, recipes, 0, new Set())
    expect(list.find((i) => i.name === '계란')).toMatchObject({ amount: 6, unit: '개' })
    expect(list.find((i) => i.name === '양파')).toMatchObject({ amount: 1.5, unit: '개' })
  })

  it('keeps different units on separate lines', () => {
    const p = plan([m('2026-10-12', 'egg', 'lunch', 2), m('2026-10-12', 'soup', 'dinner', 2)])
    const onions = buildShoppingList(p, recipes, 0, new Set()).filter((i) => i.name === '양파')
    expect(onions.map((i) => i.unit).sort()).toEqual(['g', '개'])
  })

  it('excludes pantry items', () => {
    const p = plan([m('2026-10-12', 'egg', 'lunch', 2)])
    const list = buildShoppingList(p, recipes, 0, new Set(['계란']))
    expect(list.some((i) => i.name === '계란')).toBe(false)
  })

  it('only includes meals from the requested week', () => {
    const p = plan([m('2026-10-12', 'egg', 'lunch', 1), m('2026-10-19', 'soup', 'dinner', 1)], 4)
    expect(buildShoppingList(p, recipes, 0, new Set()).some((i) => i.name === '두부')).toBe(false)
    expect(buildShoppingList(p, recipes, 1, new Set()).some((i) => i.name === '두부')).toBe(true)
  })

  it('sorts by category then name', () => {
    const p = plan([m('2026-10-12', 'egg', 'lunch', 1), m('2026-10-12', 'soup', 'dinner', 1)])
    const cats = buildShoppingList(p, recipes, 0, new Set()).map((i) => i.category)
    expect(cats).toEqual([...cats].sort((a, b) => ['채소·과일', '육류·계란', '기타'].indexOf(a) - ['채소·과일', '육류·계란', '기타'].indexOf(b)))
  })

  it('skips unknown recipe ids without crashing', () => {
    const p = plan([m('2026-10-12', 'gone', 'lunch', 2), m('2026-10-12', 'egg', 'lunch', 1)])
    expect(buildShoppingList(p, recipes, 0, new Set()).some((i) => i.name === '계란')).toBe(true)
  })
})

describe('weekCount', () => {
  it('returns the number of weeks in the plan', () => {
    expect(weekCount(plan([], 4))).toBe(4)
    expect(weekCount(plan([], 1))).toBe(1)
  })
})
