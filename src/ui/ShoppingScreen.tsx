import { useState } from 'react'
import { fmtAmount } from '../format'
import { buildShoppingList, weekCount } from '../shopping'
import type { Plan, Recipe } from '../types'

interface Props {
  plan: Plan | null
  recipes: Recipe[]
  pantry: Set<string>
  onTogglePantry: (name: string) => void
  bought: Set<string>
  onToggleBought: (key: string) => void
}

export function ShoppingScreen({ plan, recipes, pantry, onTogglePantry, bought, onToggleBought }: Props) {
  const [week, setWeek] = useState(0)

  if (!plan) {
    return (
      <section>
        <h1 className="px-5 pb-1 pt-10 text-2xl font-bold leading-snug">장볼 재료예요</h1>
        <p className="px-5 text-sm text-sub">먼저 식단을 만드세요. 식단 탭에서 만들 수 있어요.</p>
      </section>
    )
  }

  const weeks = weekCount(plan)
  const current = Math.min(week, weeks - 1)
  const items = buildShoppingList(plan, recipes, current, pantry)
  const keyOf = (i: (typeof items)[number]) => `${current}|${i.name}|${i.unit}|${i.amount}`
  const boughtCount = items.filter((i) => bought.has(keyOf(i))).length
  const categories = [...new Set(items.map((i) => i.category))]

  return (
    <section>
      <h1 className="px-5 pb-1 pt-10 text-2xl font-bold leading-snug">장볼 재료예요</h1>
      <p className="px-5 pb-3 text-sm text-sub">
        {weeks > 1 ? `${current + 1}주차 · ` : ''}
        {items.length}개 중 {boughtCount}개 샀어요
      </p>

      {weeks > 1 && (
        <div className="flex gap-1.5 px-5 pb-2">
          {Array.from({ length: weeks }, (_, w) => (
            <button
              key={w}
              aria-pressed={w === current}
              onClick={() => setWeek(w)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${w === current ? 'bg-ink text-white' : 'bg-line text-sub'}`}
            >
              {w + 1}주차
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && <p className="px-5 py-6 text-sm text-mute">이 주에는 사야 할 재료가 없어요.</p>}
      {categories.map((cat) => (
        <div key={cat}>
          <div className="px-5 pb-1 pt-4 text-xs font-semibold text-mute">{cat}</div>
          {items
            .filter((i) => i.category === cat)
            .map((i) => {
              const key = keyOf(i)
              const text = `${i.name} ${fmtAmount(i.amount)}${i.unit}`
              const done = bought.has(key)
              return (
                <div key={key} className="flex items-center gap-3 px-5 py-2.5">
                  <input
                    type="checkbox"
                    id={key}
                    aria-label={text}
                    checked={done}
                    onChange={() => onToggleBought(key)}
                    className="h-[22px] w-[22px] flex-none appearance-none rounded-full border-2 border-faint checked:border-toss checked:bg-toss"
                  />
                  <label htmlFor={key} className={`flex-1 text-[15px] font-semibold ${done ? 'text-faint line-through' : ''}`}>
                    {text}
                  </label>
                  <button
                    aria-label={`${i.name} 안 사도 돼요`}
                    onClick={() => onTogglePantry(i.name)}
                    className="flex-none rounded-lg px-2 py-1.5 text-xs font-semibold text-mute"
                  >
                    안 사도 돼요
                  </button>
                </div>
              )
            })}
        </div>
      ))}

      {pantry.size > 0 && (
        <div className="pb-4">
          <div className="px-5 pt-6 text-xs font-semibold text-mute">안 사도 되는 재료</div>
          <p className="px-5 pb-2 text-xs text-mute">집에 있어서 목록에서 뺐어요. 모든 주에서 빠져요.</p>
          <div className="flex flex-wrap gap-1.5 px-5">
            {[...pantry].map((name) => (
              <button
                key={name}
                aria-label={`${name} 다시 사기`}
                onClick={() => onTogglePantry(name)}
                className="rounded-full bg-line px-3 py-1.5 text-[13px] font-semibold text-sub"
              >
                {name} 다시 사기
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
