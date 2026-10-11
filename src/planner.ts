import type { Difficulty, Meal, Plan, PlannedMeal, Recipe, WeekSettings } from './types'

const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner']
const MIN_GAP_DAYS = 7
const DAY_MS = 86400000

const toUtc = (iso: string) => Date.parse(iso + 'T00:00:00Z')
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const mondayIndex = (ms: number) => (new Date(ms).getUTCDay() + 6) % 7
const daysBetween = (a: string, b: string) => Math.abs(toUtc(a) - toUtc(b)) / DAY_MS

export function nextMonday(from: Date): string {
  const local = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())
  const add = (7 - mondayIndex(local)) % 7
  return fromUtc(local + add * DAY_MS)
}

interface PickCtx {
  recipes: Recipe[]
  meal: Meal
  maxDifficulty: Difficulty
  date: string
  others: PlannedMeal[] // 이미 정해진 다른 끼니
  startDate: string
  avoid?: string // 가능하면 피할 레시피 id (다시 뽑기용)
  rng: () => number
}
interface Pick {
  recipe: Recipe
  relaxed: boolean
  repeated: boolean
}

const weekOf = (startDate: string, date: string) => Math.floor((toUtc(date) - toUtc(startDate)) / DAY_MS / 7)

function pick(c: PickCtx): Pick | null {
  const pool = c.recipes.filter((r) => r.meals.includes(c.meal))
  if (pool.length === 0) return null
  const byId = new Map(c.recipes.map((r) => [r.id, r]))
  const tooClose = (r: Recipe) =>
    c.others.some((o) => o.recipeId === r.id && daysBetween(o.date, c.date) < MIN_GAP_DAYS)

  const sameWeekNames = new Set<string>()
  for (const o of c.others)
    if (weekOf(c.startDate, o.date) === weekOf(c.startDate, c.date))
      for (const i of byId.get(o.recipeId)?.ingredients ?? []) sameWeekNames.add(i.name)
  const overlap = (r: Recipe) => r.ingredients.filter((i) => sameWeekNames.has(i.name)).length

  const choose = (cands: Recipe[]) => {
    const preferred = cands.filter((r) => r.id !== c.avoid)
    const list = preferred.length > 0 ? preferred : cands
    const best = Math.max(...list.map(overlap))
    const top = list.filter((r) => overlap(r) === best)
    return top[Math.floor(c.rng() * top.length) % top.length]
  }

  for (let d = c.maxDifficulty; d <= 3; d++) {
    const cands = pool.filter((r) => r.difficulty <= d && !tooClose(r))
    if (cands.length > 0) return { recipe: choose(cands), relaxed: d > c.maxDifficulty, repeated: false }
  }
  // 7일 간격을 지킬 수 없으면 반복을 허용하고, 가장 오래전에 쓴 레시피를 고른다.
  const lastUse = (r: Recipe) =>
    Math.max(-Infinity, ...c.others.filter((o) => o.recipeId === r.id).map((o) => -daysBetween(o.date, c.date)))
  const ok = pool.filter((r) => r.difficulty <= c.maxDifficulty)
  const fallback = ok.length > 0 ? ok : pool
  const oldest = Math.min(...fallback.map(lastUse))
  return { recipe: choose(fallback.filter((r) => lastUse(r) === oldest)), relaxed: false, repeated: true }
}

export function generatePlan(o: {
  settings: WeekSettings
  recipes: Recipe[]
  startDate: string
  weeks: 1 | 4
  rng?: () => number
  keep?: PlannedMeal[]
}): Plan {
  const rng = o.rng ?? Math.random
  const keep = (o.keep ?? []).filter((k) => k.locked)
  const meals: PlannedMeal[] = []
  let relaxedCount = 0
  let repeatCount = 0
  let missing = 0

  for (let offset = 0; offset < o.weeks * 7; offset++) {
    const ms = toUtc(o.startDate) + offset * DAY_MS
    const date = fromUtc(ms)
    const day = o.settings[mondayIndex(ms)]
    for (const meal of MEAL_ORDER) {
      const slot = day[meal]
      if (slot.people <= 0) continue
      const kept = keep.find((k) => k.date === date && k.meal === meal)
      if (kept) {
        meals.push(kept)
        continue
      }
      const others = [...meals, ...keep.filter((k) => k.date > date)]
      const p = pick({ recipes: o.recipes, meal, maxDifficulty: slot.maxDifficulty, date, others, startDate: o.startDate, rng })
      if (!p) {
        missing++
        continue
      }
      if (p.relaxed) relaxedCount++
      if (p.repeated) repeatCount++
      meals.push({ date, meal, recipeId: p.recipe.id, people: slot.people, locked: false, relaxed: p.relaxed })
    }
  }

  const warnings: string[] = []
  if (relaxedCount > 0) warnings.push(`${relaxedCount}끼는 난이도 조건에 맞는 레시피가 부족해 더 어려운 메뉴로 채웠어요.`)
  if (repeatCount > 0) warnings.push(`${repeatCount}끼는 레시피가 부족해 7일 안에 같은 메뉴가 반복돼요.`)
  if (missing > 0) warnings.push(`${missing}끼는 맞는 레시피가 없어 비워 뒀어요.`)
  return { startDate: o.startDate, weeks: o.weeks, meals, warnings }
}

export function rerollMeal(
  plan: Plan,
  index: number,
  o: { settings: WeekSettings; recipes: Recipe[]; rng?: () => number },
): Plan {
  const target = plan.meals[index]
  if (!target || target.locked) return plan
  const slot = o.settings[mondayIndex(toUtc(target.date))][target.meal]
  const p = pick({
    recipes: o.recipes,
    meal: target.meal,
    maxDifficulty: slot.maxDifficulty,
    date: target.date,
    others: plan.meals.filter((_, i) => i !== index),
    startDate: plan.startDate,
    avoid: target.recipeId,
    rng: o.rng ?? Math.random,
  })
  if (!p) return plan
  const meals = plan.meals.map((m, i) =>
    i === index ? { ...m, recipeId: p.recipe.id, people: slot.people > 0 ? slot.people : m.people, relaxed: p.relaxed } : m,
  )
  return { ...plan, meals }
}
