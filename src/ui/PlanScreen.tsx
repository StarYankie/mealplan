import { useState } from 'react'
import { fmtDate, MEAL_LABEL } from '../format'
import { generatePlan, nextMonday, rerollMeal } from '../planner'
import type { Plan, Recipe, WeekSettings } from '../types'
import { RecipeView } from './RecipeView'

interface Props {
  settings: WeekSettings
  recipes: Recipe[]
  plan: Plan | null
  onPlan: (p: Plan | null) => void
}

export function PlanScreen({ settings, recipes, plan, onPlan }: Props) {
  const [startDate, setStartDate] = useState(() => plan?.startDate ?? nextMonday(new Date()))
  const [weeks, setWeeks] = useState<1 | 4>(plan?.weeks ?? 1)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const byId = new Map(recipes.map((r) => [r.id, r]))

  const make = () => {
    setOpenIndex(null)
    onPlan(generatePlan({ settings, recipes, startDate, weeks, keep: plan?.meals.filter((m) => m.locked) }))
  }
  const toggleLock = (index: number) =>
    plan && onPlan({ ...plan, meals: plan.meals.map((m, i) => (i === index ? { ...m, locked: !m.locked } : m)) })
  const reroll = (index: number) => plan && onPlan(rerollMeal(plan, index, { settings, recipes }))

  const open = plan && openIndex !== null ? plan.meals[openIndex] : null
  const openRecipe = open ? byId.get(open.recipeId) : undefined

  const weekOf = (date: string) =>
    Math.floor((Date.parse(date + 'T00:00:00Z') - Date.parse(plan!.startDate + 'T00:00:00Z')) / 86400000 / 7)

  return (
    <section>
      <h2>식단</h2>
      <div className="controls">
        <label>
          시작일
          <input type="date" value={startDate} onChange={(e) => e.target.value && setStartDate(e.target.value)} />
        </label>
        <label>
          기간
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value) === 4 ? 4 : 1)}>
            <option value={1}>1주</option>
            <option value={4}>4주</option>
          </select>
        </label>
        <button onClick={make}>식단 만들기</button>
      </div>

      {!plan && <p className="hint">아직 식단이 없어요. 시작일과 기간을 정하고 식단 만들기를 눌러 보세요.</p>}
      {plan?.settings && JSON.stringify(plan.settings) !== JSON.stringify(settings) && (
        <p className="warn">설정이 바뀌었어요. 식단 만들기를 누르면 새 설정이 반영돼요. (고정한 메뉴는 유지돼요)</p>
      )}
      {plan?.warnings.map((w) => (
        <p className="warn" key={w}>
          {w}
        </p>
      ))}
      {plan && plan.meals.length === 0 && (
        <p className="hint">만들 끼니가 없어요. 설정에서 인원을 확인해 주세요.</p>
      )}

      {openRecipe && open && <RecipeView recipe={openRecipe} people={open.people} onClose={() => setOpenIndex(null)} />}

      {plan &&
        Array.from({ length: plan.weeks }, (_, w) => {
          const items = plan.meals.map((m, index) => ({ m, index })).filter(({ m }) => weekOf(m.date) === w)
          if (items.length === 0) return null
          return (
            <div key={w}>
              {plan.weeks > 1 && <h3>{w + 1}주차</h3>}
              {items.map(({ m, index }) => (
                <div className="meal-cell" data-testid="meal-row" key={`${m.date}-${m.meal}`}>
                  <span>
                    {fmtDate(m.date)} {MEAL_LABEL[m.meal]}
                  </span>
                  <button className="name" data-testid="meal-name" onClick={() => setOpenIndex(index)}>
                    {byId.get(m.recipeId)?.name ?? '(알 수 없는 레시피)'}
                  </button>
                  <button aria-label="다시 뽑기" aria-pressed={undefined} disabled={m.locked} onClick={() => reroll(index)}>
                    🔄
                  </button>
                  <button aria-label="고정" aria-pressed={m.locked} onClick={() => toggleLock(index)}>
                    {m.locked ? '🔒' : '🔓'}
                  </button>
                </div>
              ))}
            </div>
          )
        })}
    </section>
  )
}
