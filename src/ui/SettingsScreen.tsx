import { useState } from 'react'
import { DAY_LONG, DIFFICULTY_LABEL, MEAL_LABEL } from '../format'
import type { Difficulty, Meal, Slot, ThemePref, WeekSettings } from '../types'
import { Sheet } from './Sheet'

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner']

// 아침은 안 먹는 집이 많아서 0명이면 요약에서 뺀다.
function summary(day: Record<Meal, Slot>): string {
  return MEALS.filter((m) => m !== 'breakfast' || day[m].people > 0)
    .map((m) => `${MEAL_LABEL[m]} ${day[m].people === 0 ? '안 먹음' : `${day[m].people}명`}`)
    .join(' · ')
}

const THEME_LABEL: Record<ThemePref, string> = { system: '시스템 설정', light: '라이트', dark: '다크' }

interface Props {
  settings: WeekSettings
  onChange: (s: WeekSettings) => void
  theme: ThemePref
  onThemeChange: (t: ThemePref) => void
}

export function SettingsScreen({ settings, onChange, theme, onThemeChange }: Props) {
  const [open, setOpen] = useState<number | null>(null)

  const update = (day: number, meal: Meal, patch: Partial<Slot>) =>
    onChange(settings.map((d, i) => (i === day ? { ...d, [meal]: { ...d[meal], ...patch } } : d)))

  return (
    <section>
      <h1 className="px-5 pb-1 pt-10 text-2xl font-bold leading-snug">
        언제, 몇 명이
        <br />
        먹나요?
      </h1>
      <p className="px-5 pb-4 text-sm text-sub">요일을 눌러 끼니별로 바꿔요</p>

      <ul>
        {DAY_LONG.map((name, day) => (
          <li key={name} data-testid="day-row">
            <button className="flex w-full items-center px-5 py-3.5 text-left active:bg-line" onClick={() => setOpen(day)}>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{name}</span>
                <span className="block text-xs text-mute">{summary(settings[day])}</span>
              </span>
              <span aria-hidden className="text-lg text-faint">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div role="group" aria-label="화면 모드" className="mt-6 px-5 pb-2">
        <div className="pb-1 text-xs font-semibold text-mute">화면 모드</div>
        <div className="flex rounded-xl bg-line p-[3px]">
          {(['system', 'light', 'dark'] as ThemePref[]).map((t) => (
            <button
              key={t}
              aria-pressed={theme === t}
              onClick={() => onThemeChange(t)}
              className={`flex-1 rounded-[10px] py-2 text-[13px] font-semibold ${theme === t ? 'bg-surface text-ink shadow-sm' : 'text-mute'}`}
            >
              {THEME_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {open !== null && (
        <Sheet label={`${DAY_LONG[open]} 설정`} onClose={() => setOpen(null)}>
          <h2 className="mb-4 text-lg font-bold">{DAY_LONG[open]}</h2>
          {MEALS.map((meal) => {
            const slot = settings[open][meal]
            const off = slot.people === 0
            return (
              <div key={meal} role="group" aria-label={MEAL_LABEL[meal]} className="border-b border-line py-4 last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold">{MEAL_LABEL[meal]}</span>
                  <button
                    role="switch"
                    aria-checked={off}
                    aria-label={`${MEAL_LABEL[meal]} 안 먹어요`}
                    onClick={() => update(open, meal, { people: off ? 1 : 0 })}
                    className="flex items-center gap-2 text-xs text-sub"
                  >
                    안 먹어요
                    <span className={`relative h-6 w-[42px] rounded-full transition-colors ${off ? 'bg-toss' : 'bg-faint/60'}`}>
                      <i
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${off ? 'left-[20px]' : 'left-0.5'}`}
                      />
                    </span>
                  </button>
                </div>

                {!off && (
                  <>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-sub">인원</span>
                      <span className="flex items-center gap-4">
                        <button
                          aria-label="인원 줄이기"
                          className="h-8 w-8 rounded-full bg-line text-lg leading-none text-sub"
                          onClick={() => update(open, meal, { people: slot.people - 1 })}
                        >
                          −
                        </button>
                        <b className="min-w-[2.5rem] text-center text-[17px]">{slot.people}명</b>
                        <button
                          aria-label="인원 늘리기"
                          className="h-8 w-8 rounded-full bg-line text-lg leading-none text-sub"
                          onClick={() => update(open, meal, { people: slot.people + 1 })}
                        >
                          +
                        </button>
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-sub">난이도</div>
                    <div className="mt-2 flex rounded-xl bg-line p-[3px]">
                      {([1, 2, 3] as Difficulty[]).map((d) => (
                        <button
                          key={d}
                          aria-pressed={slot.maxDifficulty === d}
                          onClick={() => update(open, meal, { maxDifficulty: d })}
                          className={`flex-1 rounded-[10px] py-2 text-[13px] font-semibold ${
                            slot.maxDifficulty === d ? 'bg-surface text-ink shadow-sm' : 'text-mute'
                          }`}
                        >
                          {DIFFICULTY_LABEL[d]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
          <button className="mt-4 w-full rounded-2xl bg-toss py-3.5 text-[15px] font-bold text-white" onClick={() => setOpen(null)}>
            확인
          </button>
        </Sheet>
      )}
    </section>
  )
}
