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
        <h2>장보기</h2>
        <p className="hint">먼저 식단을 만드세요. 식단 탭에서 만들 수 있어요.</p>
      </section>
    )
  }

  const weeks = weekCount(plan)
  const current = Math.min(week, weeks - 1)
  const items = buildShoppingList(plan, recipes, current, pantry)

  const categories = [...new Set(items.map((i) => i.category))]

  return (
    <section>
      <h2>장보기</h2>
      {weeks > 1 && (
        <div className="week-tabs">
          {Array.from({ length: weeks }, (_, w) => (
            <button key={w} aria-pressed={w === current} onClick={() => setWeek(w)}>
              {w + 1}주차
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && <p className="hint">이 주에는 사야 할 재료가 없어요.</p>}
      {categories.map((cat) => (
        <div key={cat}>
          <div className="cat">{cat}</div>
          {items
            .filter((i) => i.category === cat)
            .map((i) => {
              const key = `${current}|${i.name}|${i.unit}|${i.amount}`
              const text = `${i.name} ${fmtAmount(i.amount)}${i.unit}`
              return (
                <div className={bought.has(key) ? 'item done' : 'item'} key={key}>
                  <input
                    type="checkbox"
                    id={key}
                    aria-label={text}
                    checked={bought.has(key)}
                    onChange={() => onToggleBought(key)}
                  />
                  <label className="label" htmlFor={key}>
                    {text}
                  </label>
                  <button aria-label={`${i.name} 집에 있음`} onClick={() => onTogglePantry(i.name)}>
                    집에 있음
                  </button>
                </div>
              )
            })}
        </div>
      ))}

      {pantry.size > 0 && (
        <div>
          <div className="cat">집에 있는 재료 (장보기에서 제외됨)</div>
          {[...pantry].map((name) => (
            <button key={name} aria-label={`${name} 장보기에 다시 넣기`} onClick={() => onTogglePantry(name)}>
              {name} ✕
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
