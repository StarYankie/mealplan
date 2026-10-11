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
