import type { Recipe } from '../types'

const MEALS = ['breakfast', 'lunch', 'dinner']
const CATEGORIES = ['채소·과일', '육류·계란', '기타']

export function validateRecipes(raw: unknown): Recipe[] {
  if (!Array.isArray(raw)) throw new Error('recipes must be an array')
  const seen = new Set<string>()
  for (const r of raw as Recipe[]) {
    const fail = (why: string): never => {
      throw new Error(`recipe "${r?.id}": ${why}`)
    }
    if (!r || typeof r.id !== 'string' || !r.id) fail('missing id')
    if (seen.has(r.id)) fail('duplicate id')
    seen.add(r.id)
    if (!r.name) fail('missing name')
    if (!Array.isArray(r.meals) || r.meals.length === 0 || !r.meals.every((m) => MEALS.includes(m)))
      fail('meals must be a non-empty list of breakfast/lunch/dinner')
    if (![1, 2, 3].includes(r.difficulty)) fail('difficulty must be 1-3')
    if (!(r.minutes > 0)) fail('minutes must be positive')
    if (!Array.isArray(r.steps) || r.steps.length === 0) fail('steps must not be empty')
    if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) fail('ingredients must not be empty')
    for (const i of r.ingredients) {
      if (!i.name || !i.unit) fail('ingredient needs name and unit')
      if (!(i.amount > 0)) fail(`ingredient "${i.name}" amount must be > 0`)
      if (!CATEGORIES.includes(i.category)) fail(`ingredient "${i.name}" has invalid category`)
    }
  }
  return raw as Recipe[]
}
