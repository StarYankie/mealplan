import { useState } from 'react'
import type { Difficulty, Meal, WeekSettings } from '../types'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: '아침' },
  { key: 'lunch', label: '점심' },
  { key: 'dinner', label: '저녁' },
]
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: '간단', 2: '보통', 3: '공들임' }

export function SettingsScreen({ settings, onChange }: { settings: WeekSettings; onChange: (s: WeekSettings) => void }) {
  const [sel, setSel] = useState<{ day: number; meal: Meal } | null>(null)

  const update = (day: number, meal: Meal, patch: Partial<WeekSettings[number][Meal]>) =>
    onChange(settings.map((d, i) => (i === day ? { ...d, [meal]: { ...d[meal], ...patch } } : d)))

  const selected = sel ? settings[sel.day][sel.meal] : null
  const selLabel = sel ? `${DAYS[sel.day]}요일 ${MEALS.find((m) => m.key === sel.meal)!.label}` : ''

  return (
    <section>
      <h2>요일·끼니 설정</h2>
      <p className="hint">칸을 눌러 인원과 난이도를 바꾸세요. 인원이 0이면 그 끼니는 건너뜁니다.</p>
      <table className="settings-grid">
        <thead>
          <tr>
            <th />
            {MEALS.map((m) => (
              <th key={m.key}>{m.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d, day) => (
            <tr key={d}>
              <th>{d}</th>
              {MEALS.map((m) => {
                const slot = settings[day][m.key]
                const isSel = sel?.day === day && sel.meal === m.key
                return (
                  <td key={m.key}>
                    <button
                      data-testid="slot"
                      aria-label={`${d}요일 ${m.label}`}
                      aria-pressed={isSel}
                      className={slot.people === 0 ? 'slot off' : 'slot'}
                      onClick={() => setSel({ day, meal: m.key })}
                    >
                      {slot.people === 0 ? '안 먹음' : `${slot.people}명·${DIFFICULTY_LABEL[slot.maxDifficulty]}`}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {sel && selected && (
        <div className="editor" role="group" aria-label={selLabel}>
          <strong>{selLabel}</strong>
          <label>
            인원
            <input
              type="number"
              min={0}
              value={selected.people}
              onChange={(e) => update(sel.day, sel.meal, { people: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
            />
          </label>
          <label>
            난이도
            <select
              value={selected.maxDifficulty}
              onChange={(e) => update(sel.day, sel.meal, { maxDifficulty: Number(e.target.value) as Difficulty })}
            >
              <option value={1}>간단</option>
              <option value={2}>보통</option>
              <option value={3}>공들임</option>
            </select>
          </label>
          <button onClick={() => setSel(null)}>닫기</button>
        </div>
      )}
    </section>
  )
}
