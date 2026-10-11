import type { Category, Plan, Recipe } from './types'

export interface ShoppingItem {
  name: string
  amount: number
  unit: string
  category: Category
}

const CATEGORY_ORDER: Category[] = ['채소·과일', '육류·계란', '기타']
const DAY_MS = 86400000
// 낱개로만 살 수 있는 단위는 올림해서 보여 준다 (g, 큰술, 컵 등은 그대로).
const COUNTABLE = new Set(['개', '대', '모', '봉', '캔', '장', '쪽', '단', '조각', '공기'])
const forShop = (amount: number, unit: string) => {
  const rounded = Math.round(amount * 100) / 100
  return COUNTABLE.has(unit) ? Math.ceil(rounded) : rounded
}

export const weekCount = (plan: Plan): number => plan.weeks

export function buildShoppingList(plan: Plan, recipes: Recipe[], weekIndex: number, pantry: Set<string>): ShoppingItem[] {
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const start = Date.parse(plan.startDate + 'T00:00:00Z')
  const sums = new Map<string, ShoppingItem>()

  for (const meal of plan.meals) {
    const week = Math.floor((Date.parse(meal.date + 'T00:00:00Z') - start) / DAY_MS / 7)
    if (week !== weekIndex) continue
    const recipe = byId.get(meal.recipeId)
    if (!recipe) continue
    for (const ing of recipe.ingredients) {
      if (pantry.has(ing.name)) continue
      const key = `${ing.name}|${ing.unit}`
      const prev = sums.get(key)
      const amount = ing.amount * meal.people
      if (prev) prev.amount += amount
      else sums.set(key, { name: ing.name, amount, unit: ing.unit, category: ing.category })
    }
  }

  return [...sums.values()]
    .map((i) => ({ ...i, amount: forShop(i.amount, i.unit) }))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name, 'ko'))
}
