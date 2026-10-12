import { useState } from 'react'
import { DAY_LONG, DIFFICULTY_LABEL, MEAL_LABEL } from '../format'
import type { Difficulty, Meal, Slot, ThemePref, WeekSettings } from '../types'
import { PageTitle } from './PageTitle'
import { Sheet } from './Sheet'

const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner']

// 한 번에 바꾸는 요일 묶음. 요일별 행은 그대로 두어 예외(예: 수요일 출근)를 따로 고칠 수 있다.
const GROUPS = [
  { label: '평일(월~금)', days: [0, 1, 2, 3, 4] },
  { label: '주말(토·일)', days: [5, 6] },
]

interface Target {
  label: string
  days: number[]
}

// 아침은 안 먹는 집이 많아서 0명이면 요약에서 뺀다.
function summary(day: Record<Meal, Slot>): string {
  return MEALS.filter((m) => m !== 'breakfast' || day[m].people > 0)
    .map((m) => `${MEAL_LABEL[m]} ${day[m].people === 0 ? '안 먹음' : `${day[m].people}명`}`)
    .join(' · ')
}

function groupSummary(settings: WeekSettings, days: number[]): string {
  const same = days.every((d) => JSON.stringify(settings[d]) === JSON.stringify(settings[days[0]]))
  return same ? summary(settings[days[0]]) : '요일마다 달라요'
}

const THEME_LABEL: Record<ThemePref, string> = { system: '시스템 설정', light: '라이트', dark: '다크' }

interface Props {
  settings: WeekSettings
  onChange: (s: WeekSettings) => void
  theme: ThemePref
  onThemeChange: (t: ThemePref) => void
}

function Row({ title, sub, testId, onClick }: { title: string; sub: string; testId: string; onClick: () => void }) {
  return (
    <li data-testid={testId}>
      <button className="flex w-full items-center px-5 py-3.5 text-left active:bg-line" onClick={onClick}>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">{title}</span>
          <span className="block text-xs text-mute">{sub}</span>
        </span>
        <span aria-hidden className="text-lg text-faint">
          ›
        </span>
      </button>
    </li>
  )
}

export function SettingsScreen({ settings, onChange, theme, onThemeChange }: Props) {
  const [open, setOpen] = useState<Target | null>(null)

  // 시트에서 바꾼 항목은 대상 요일 전체에 적용된다. 시트에는 대상의 첫 요일 값이 보인다.
  const update = (days: number[], meal: Meal, patch: Partial<Slot>) =>
    onChange(settings.map((d, i) => (days.includes(i) ? { ...d, [meal]: { ...d[meal], ...patch } } : d)))

  return (
    <section>
      <PageTitle icon="gear" subtitle="평일·주말은 한 번에, 다른 날은 요일을 눌러 따로 바꿔요">
        몇 명이 먹나요?
      </PageTitle>

      <div className="px-5 pb-1 text-xs font-semibold text-mute">한 번에 바꾸기</div>
      <ul>
        {GROUPS.map((g) => (
          <Row
            key={g.label}
            testId="group-row"
            title={g.label}
            sub={groupSummary(settings, g.days)}
            onClick={() => setOpen({ label: g.label, days: g.days })}
          />
        ))}
      </ul>

      <div className="px-5 pb-1 pt-5 text-xs font-semibold text-mute">요일별로 바꾸기</div>
      <ul>
        {DAY_LONG.map((name, day) => (
          <Row key={name} testId="day-row" title={name} sub={summary(settings[day])} onClick={() => setOpen({ label: name, days: [day] })} />
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

      {open && (
        <Sheet label={`${open.label} 설정`} onClose={() => setOpen(null)}>
          <h2 className="mb-4 text-lg font-bold">{open.label}</h2>
          {MEALS.map((meal) => {
            const slot = settings[open.days[0]][meal]
            const off = slot.people === 0
            return (
              <div key={meal} role="group" aria-label={MEAL_LABEL[meal]} className="border-b border-line py-4 last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold">{MEAL_LABEL[meal]}</span>
                  <button
                    role="switch"
                    aria-checked={off}
                    aria-label={`${MEAL_LABEL[meal]} 안 먹어요`}
                    onClick={() => update(open.days, meal, { people: off ? 1 : 0 })}
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
                          onClick={() => update(open.days, meal, { people: slot.people - 1 })}
                        >
                          −
                        </button>
                        <b className="min-w-[2.5rem] text-center text-[17px]">{slot.people}명</b>
                        <button
                          aria-label="인원 늘리기"
                          className="h-8 w-8 rounded-full bg-line text-lg leading-none text-sub"
                          onClick={() => update(open.days, meal, { people: slot.people + 1 })}
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
                          onClick={() => update(open.days, meal, { maxDifficulty: d })}
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
