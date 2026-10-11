import { useState } from 'react'
import { DAY_LONG, DIFFICULTY_LABEL, MEAL_LABEL } from '../format'
import { generatePlan, nextMonday, rerollMeal } from '../planner'
import type { Meal, Plan, PlannedMeal, Recipe, WeekSettings } from '../types'
import { RecipeView } from './RecipeView'
import { Sheet } from './Sheet'

interface Props {
  settings: WeekSettings
  recipes: Recipe[]
  plan: Plan | null
  onPlan: (p: Plan | null) => void
}

const DOT: Record<Meal, string> = {
  breakfast: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  lunch: 'bg-toss-soft text-toss',
  dinner: 'bg-line text-sub',
}
const DAY_MS = 86400000
const utc = (iso: string) => Date.parse(iso + 'T00:00:00Z')
const dayName = (iso: string) => DAY_LONG[(new Date(utc(iso)).getUTCDay() + 6) % 7]
const monthDay = (iso: string) => `${new Date(utc(iso)).getUTCMonth() + 1}월 ${new Date(utc(iso)).getUTCDate()}일`

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
  const weekOf = (date: string) => Math.floor((utc(date) - utc(plan!.startDate)) / DAY_MS / 7)

  const title = !plan ? '식단을 만들어 볼까요?' : plan.weeks === 1 ? '이번 주 식단이에요' : '한 달 식단이에요'
  const subtitle = plan ? `${monthDay(plan.startDate)}부터 ${plan.weeks * 7}일` : '시작일과 기간을 정해 주세요'
  const settingsChanged = !!plan?.settings && JSON.stringify(plan.settings) !== JSON.stringify(settings)

  const notice = (text: string) => (
    <p key={text} className="mx-5 mb-2 rounded-xl bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
      {text}
    </p>
  )

  return (
    <section>
      <h1 className="px-5 pb-1 pt-10 text-2xl font-bold leading-snug">{title}</h1>
      <p className="px-5 pb-4 text-sm text-sub">{subtitle}</p>

      <label className="flex items-center justify-between px-5 py-2.5">
        <span className="text-sm text-sub">시작일</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => e.target.value && setStartDate(e.target.value)}
          className="rounded-lg bg-line px-3 py-1.5 text-sm text-ink"
        />
      </label>
      <div className="flex gap-1.5 px-5 pb-3">
        {([1, 4] as const).map((w) => (
          <button
            key={w}
            aria-pressed={weeks === w}
            onClick={() => setWeeks(w)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${weeks === w ? 'bg-ink text-surface' : 'bg-line text-sub'}`}
          >
            {w}주
          </button>
        ))}
      </div>

      {settingsChanged && notice('설정이 바뀌었어요. 식단 만들기를 누르면 새 설정이 반영돼요. (고정한 메뉴는 유지돼요)')}
      {plan?.warnings.map(notice)}
      {plan && plan.meals.length === 0 && <p className="px-5 py-6 text-sm text-mute">만들 끼니가 없어요. 설정에서 인원을 확인해 주세요.</p>}

      {plan &&
        Array.from({ length: plan.weeks }, (_, w) => {
          const items = plan.meals.map((m, index) => ({ m, index })).filter(({ m }) => weekOf(m.date) === w)
          if (items.length === 0) return null
          const dates = [...new Set(items.map(({ m }) => m.date))]
          return (
            <div key={w}>
              {plan.weeks > 1 && <h2 className="px-5 pb-1 pt-6 text-lg font-bold">{w + 1}주차</h2>}
              {dates.map((date) => (
                <div key={date}>
                  <div className="px-5 pb-1 pt-4 text-xs font-semibold text-mute">
                    {dayName(date)} · {monthDay(date)}
                  </div>
                  {items
                    .filter(({ m }) => m.date === date)
                    .map(({ m, index }) => {
                      const recipe = byId.get(m.recipeId)
                      return (
                        <MealRow
                          key={`${m.date}-${m.meal}`}
                          meal={m}
                          recipe={recipe}
                          onOpen={() => setOpenIndex(index)}
                          onReroll={() => reroll(index)}
                        />
                      )
                    })}
                </div>
              ))}
            </div>
          )
        })}

      <div className="fixed inset-x-0 bottom-[58px] z-10 mx-auto max-w-md bg-gradient-to-t from-surface via-surface to-transparent px-4 pb-3 pt-6">
        <button className="w-full rounded-2xl bg-toss py-4 text-[15px] font-bold text-white active:brightness-95" onClick={make}>
          {plan ? '식단 다시 만들기' : '식단 만들기'}
        </button>
      </div>

      {open && openRecipe && openIndex !== null && (
        <Sheet label={openRecipe.name} onClose={() => setOpenIndex(null)}>
          <RecipeView recipe={openRecipe} people={open.people} />
          <div className="mt-6 flex gap-2">
            <button
              disabled={open.locked}
              onClick={() => reroll(openIndex)}
              className="flex-1 rounded-2xl bg-line py-3.5 text-[15px] font-semibold text-sub disabled:opacity-40"
            >
              다시 뽑기
            </button>
            <button
              onClick={() => toggleLock(openIndex)}
              className="flex-1 rounded-2xl bg-toss-soft py-3.5 text-[15px] font-semibold text-toss"
            >
              {open.locked ? '고정 해제' : '고정'}
            </button>
            <button onClick={() => setOpenIndex(null)} className="flex-1 rounded-2xl bg-toss py-3.5 text-[15px] font-bold text-white">
              닫기
            </button>
          </div>
        </Sheet>
      )}
    </section>
  )
}

function MealRow({
  meal,
  recipe,
  onOpen,
  onReroll,
}: {
  meal: PlannedMeal
  recipe: Recipe | undefined
  onOpen: () => void
  onReroll: () => void
}) {
  const sub = recipe
    ? [`${recipe.minutes}분`, DIFFICULTY_LABEL[recipe.difficulty], meal.relaxed && '난이도 완화', meal.locked && '고정됨']
        .filter(Boolean)
        .join(' · ')
    : ''
  return (
    <div data-testid="meal-row" className="flex items-center gap-3 px-5 py-2.5">
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl text-xs font-bold ${DOT[meal.meal]}`}>
        {MEAL_LABEL[meal.meal]}
      </span>
      <button className="min-w-0 flex-1 text-left" onClick={onOpen}>
        <b data-testid="meal-name" className="block truncate text-[15px] font-semibold">
          {recipe?.name ?? '(알 수 없는 레시피)'}
        </b>
        <span className="block text-xs text-mute">{sub}</span>
      </button>
      <button
        aria-label="다시 뽑기"
        disabled={meal.locked}
        onClick={onReroll}
        className="flex-none rounded-lg px-2 py-1.5 text-xs font-semibold text-mute disabled:opacity-30"
      >
        다시 뽑기
      </button>
    </div>
  )
}
