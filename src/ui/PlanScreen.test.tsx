import { useState } from 'react'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanScreen } from './PlanScreen'
import { generatePlan } from '../planner'
import { defaultSettings } from '../settings'
import type { Difficulty, Meal, Plan, Recipe, WeekSettings } from '../types'

const mk = (id: string, meal: Meal, d: Difficulty): Recipe => ({
  id,
  name: `메뉴-${id}`,
  meals: [meal],
  difficulty: d,
  minutes: 10,
  ingredients: [{ name: '계란', amount: 2, unit: '개', category: '육류·계란' }],
  steps: [`${id} 조리 순서 하나`],
})
const recipes = [
  ...Array.from({ length: 10 }, (_, i) => mk(`L${i}`, 'lunch', 1)),
  ...Array.from({ length: 10 }, (_, i) => mk(`D${i}`, 'dinner', 2)),
]

function Harness({
  settings = defaultSettings(),
  initialPlan = null,
  onPlan,
}: {
  settings?: WeekSettings
  initialPlan?: Plan | null
  onPlan?: (p: Plan | null) => void
}) {
  const [plan, setPlan] = useState<Plan | null>(initialPlan)
  return (
    <PlanScreen
      settings={settings}
      recipes={recipes}
      plan={plan}
      onPlan={(p) => {
        setPlan(p)
        onPlan?.(p)
      }}
    />
  )
}
const rows = () => screen.getAllByTestId('meal-row')
const makeBtn = () => screen.getByRole('button', { name: /^식단 (다시 )?만들기$/ })
const nameOf = (row: HTMLElement) => within(row).getByTestId('meal-name').textContent

describe('PlanScreen', () => {
  it('generates and reports a plan when pressing 식단 만들기', async () => {
    const seen: (Plan | null)[] = []
    render(<Harness onPlan={(p) => seen.push(p)} />)
    expect(screen.getByRole('heading', { name: '식단 만들어 볼까요?' })).toBeInTheDocument()
    await userEvent.click(makeBtn())
    expect(rows()).toHaveLength(14)
    expect(seen.at(-1)!.meals).toHaveLength(14)
  })

  it('has no period choice and always makes a one-week plan', async () => {
    const seen: (Plan | null)[] = []
    render(<Harness onPlan={(p) => seen.push(p)} />)
    expect(screen.queryByRole('button', { name: '4주' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '1주' })).not.toBeInTheDocument()
    await userEvent.click(makeBtn())
    expect(seen.at(-1)!.weeks).toBe(1)
    expect(rows()).toHaveLength(14)
    expect(screen.queryByText('1주차')).not.toBeInTheDocument()
  })

  it('replaces an old four-week plan with a one-week plan when regenerated', async () => {
    const old = generatePlan({ settings: defaultSettings(), recipes, startDate: '2026-10-12', weeks: 4 })
    const seen: (Plan | null)[] = []
    render(<Harness initialPlan={old} onPlan={(p) => seen.push(p)} />)
    expect(rows()).toHaveLength(56) // 예전에 만든 4주 식단은 그대로 보인다
    await userEvent.click(makeBtn())
    expect(seen.at(-1)!.weeks).toBe(1)
    expect(rows()).toHaveLength(14)
  })

  it('keeps a locked meal when regenerating', async () => {
    render(<Harness />)
    await userEvent.click(makeBtn())
    const before = nameOf(rows()[0])
    await userEvent.click(within(rows()[0]).getByTestId('meal-name'))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '고정' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '닫기' }))
    await userEvent.click(makeBtn())
    expect(nameOf(rows()[0])).toBe(before)
  })

  it('rerolls only the chosen meal', async () => {
    render(<Harness />)
    await userEvent.click(makeBtn())
    const before = rows().map(nameOf)
    await userEvent.click(within(rows()[1]).getByRole('button', { name: '다시 뽑기' }))
    const after = rows().map(nameOf)
    expect(after[1]).not.toBe(before[1])
    expect(after.filter((_, i) => i !== 1)).toEqual(before.filter((_, i) => i !== 1))
  })

  it('shows the recipe with ingredients scaled by people when a menu is clicked', async () => {
    render(<Harness />)
    await userEvent.click(makeBtn())
    await userEvent.click(within(rows()[0]).getByTestId('meal-name'))
    const sheet = screen.getByRole('dialog')
    expect(within(sheet).getByText('계란 4개')).toBeInTheDocument() // 1인분 2개 × 2명
    expect(within(sheet).getByText(/조리 순서 하나/)).toBeInTheDocument()
  })

  it('explains an empty plan when everyone is zero', async () => {
    const s = defaultSettings()
    for (const d of s) {
      d.lunch.people = 0
      d.dinner.people = 0
    }
    render(<Harness settings={s} />)
    await userEvent.click(makeBtn())
    expect(screen.getByText(/만들 끼니가 없어요/)).toBeInTheDocument()
  })

  it('tells the user when settings changed after the plan was made', async () => {
    const { rerender } = render(<Harness />)
    await userEvent.click(makeBtn())
    expect(screen.queryByText(/설정이 바뀌었어요/)).not.toBeInTheDocument()
    const changed = defaultSettings()
    changed[0].dinner.people = 5
    rerender(<Harness settings={changed} />)
    expect(screen.getByText(/설정이 바뀌었어요/)).toBeInTheDocument()
  })
})

describe('start date chips', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 11, 12)) // 일요일 → 이번 주 월요일 10/5, 다음 주 10/12
  })
  afterEach(() => vi.useRealTimers())

  const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true'
  const planFor = (startDate: string, weeks: 1 | 4 = 1) => generatePlan({ settings: defaultSettings(), recipes, startDate, weeks })

  it('shows 이번 주 / 다음 주 / 날짜 선택 and defaults to the coming Monday', () => {
    render(<Harness />)
    expect(pressed('이번 주')).toBe(false)
    expect(pressed('다음 주')).toBe(true) // 일요일에 열면 다음 주 월요일(10/12)
    expect(pressed('날짜 선택')).toBe(false)
    expect(screen.queryByLabelText('시작일')).not.toBeInTheDocument() // 예전 입력칸은 없다
  })

  it('only selects a chip while there is no plan, then 식단 만들기 uses it', async () => {
    const seen: (Plan | null)[] = []
    render(<Harness onPlan={(p) => seen.push(p)} />)
    await userEvent.click(screen.getByRole('button', { name: '이번 주' }))
    expect(seen).toHaveLength(0)
    expect(pressed('이번 주')).toBe(true)
    await userEvent.click(makeBtn())
    expect(seen.at(-1)!.startDate).toBe('2026-10-05')
  })

  it('regenerates right away for the tapped week when a plan already exists', async () => {
    const seen: (Plan | null)[] = []
    render(<Harness initialPlan={planFor('2026-10-12')} onPlan={(p) => seen.push(p)} />)
    await userEvent.click(screen.getByRole('button', { name: '이번 주' }))
    expect(seen.at(-1)!.startDate).toBe('2026-10-05')
    expect(pressed('이번 주')).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: '다음 주' }))
    expect(seen.at(-1)!.startDate).toBe('2026-10-12')
  })

  it('lets any date be picked with 날짜 선택', async () => {
    const seen: (Plan | null)[] = []
    render(<Harness onPlan={(p) => seen.push(p)} />)
    fireEvent.change(screen.getByLabelText('시작일 직접 선택'), { target: { value: '2026-12-31' } })
    expect(pressed('날짜 선택')).toBe(true)
    expect(seen).toHaveLength(0)
    await userEvent.click(makeBtn())
    expect(seen.at(-1)!.startDate).toBe('2026-12-31')
  })

  it.each([
    ['2026-10-05', '이번 주 식단이에요'],
    ['2026-10-12', '다음 주 식단이에요'],
    ['2026-12-31', '12/31 시작 식단'],
  ])('titles a plan starting %s as "%s"', (start, title) => {
    render(<Harness initialPlan={planFor(start)} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(title)
    expect(h1.textContent!.length).toBeLessThanOrEqual(11)
  })

  it('keeps the title for an old four-week plan', () => {
    render(<Harness initialPlan={planFor('2026-10-05', 4)} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('한 달 식단이에요')
  })
})

