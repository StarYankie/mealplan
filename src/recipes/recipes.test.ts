import { bundledRecipes as all } from './index'
import { validateRecipes } from './schema'

const UNITS = ['g', 'ml', '개', '큰술', '모', '대', '캔', '봉', '장', '공기', '줌', '컵', '쪽', '단', '조각']
// 집에 항상 있다고 보는 기본 양념: 재료 목록에는 넣지 않고 조리 순서에서만 언급한다.
const STAPLES = ['소금', '후추', '식용유', '설탕', '간장', '참기름', '깨', '고춧가루', '다진마늘', '물', '올리브유']

describe('bundled recipes', () => {
  it('pass schema validation', () => {
    expect(() => validateRecipes(all)).not.toThrow()
  })

  it('has enough recipes per meal and difficulty', () => {
    const count = (f: (r: (typeof all)[number]) => boolean) => all.filter(f).length
    expect(all.length).toBeGreaterThanOrEqual(90)
    expect(count((r) => r.meals.includes('lunch'))).toBeGreaterThanOrEqual(30)
    expect(count((r) => r.meals.includes('dinner'))).toBeGreaterThanOrEqual(50)
    expect(count((r) => r.meals.includes('breakfast'))).toBeGreaterThanOrEqual(10)
    expect(count((r) => r.meals.includes('lunch') && r.difficulty === 1)).toBeGreaterThanOrEqual(15)
  })

  it('uses only known units', () => {
    for (const r of all) for (const i of r.ingredients) expect(UNITS, `${r.id}/${i.name}`).toContain(i.unit)
  })

  it('does not list staple seasonings as ingredients', () => {
    for (const r of all) for (const i of r.ingredients) expect(STAPLES, `${r.id}/${i.name}`).not.toContain(i.name)
  })

  it('keeps one category per ingredient name', () => {
    const seen = new Map<string, string>()
    for (const r of all)
      for (const i of r.ingredients) {
        const prev = seen.get(i.name)
        if (prev) expect(i.category, `${r.id}/${i.name}`).toBe(prev)
        seen.set(i.name, i.category)
      }
  })

  it('has unique recipe names', () => {
    expect(new Set(all.map((r) => r.name)).size).toBe(all.length)
  })
})

describe('bundled recipes with the planner', () => {
  it('fill a default four-week plan without warnings', async () => {
    const { generatePlan } = await import('../planner')
    const { defaultSettings } = await import('../settings')
    const plan = generatePlan({ settings: defaultSettings(), recipes: all, startDate: '2026-10-12', weeks: 4 })
    expect(plan.meals).toHaveLength(28 * 2)
    expect(plan.warnings).toEqual([])
  })
})

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('variety with the bundled recipes', () => {
  it('does not put the same dishes in every one-week plan', async () => {
    const { generatePlan } = await import('../planner')
    const { defaultSettings } = await import('../settings')
    const counts = new Map<string, number>()
    for (let s = 0; s < 20; s++) {
      const plan = generatePlan({ settings: defaultSettings(), recipes: all, startDate: '2026-10-12', weeks: 1, rng: seeded(s) })
      for (const id of new Set(plan.meals.map((m) => m.recipeId))) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(12)
    expect(counts.size).toBeGreaterThanOrEqual(60)
  })

  it('uses a recipe at most three times in a four-week plan', async () => {
    const { generatePlan } = await import('../planner')
    const { defaultSettings } = await import('../settings')
    const plan = generatePlan({ settings: defaultSettings(), recipes: all, startDate: '2026-10-12', weeks: 4, rng: seeded(7) })
    const counts = new Map<string, number>()
    for (const m of plan.meals) counts.set(m.recipeId, (counts.get(m.recipeId) ?? 0) + 1)
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3)
  })

  it('offers many different dishes when rerolling the same meal', async () => {
    const { generatePlan, rerollMeal } = await import('../planner')
    const { defaultSettings } = await import('../settings')
    const settings = defaultSettings()
    let plan = generatePlan({ settings, recipes: all, startDate: '2026-10-12', weeks: 1, rng: seeded(1) })
    const seen = new Set([plan.meals[0].recipeId])
    for (let i = 0; i < 30; i++) {
      plan = rerollMeal(plan, 0, { settings, recipes: all, rng: seeded(100 + i) })
      seen.add(plan.meals[0].recipeId)
    }
    expect(seen.size).toBeGreaterThanOrEqual(5)
  })
})
