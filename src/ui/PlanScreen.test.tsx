import { useState } from 'react'
import { render, screen, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanScreen } from './PlanScreen'
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

function Harness({ settings = defaultSettings(), onPlan }: { settings?: WeekSettings; onPlan?: (p: Plan | null) => void }) {
  const [plan, setPlan] = useState<Plan | null>(null)
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
const nameOf = (row: HTMLElement) => within(row).getByTestId('meal-name').textContent

describe('PlanScreen', () => {
  it('generates and reports a plan when pressing 식단 만들기', async () => {
    const seen: (Plan | null)[] = []
    render(<Harness onPlan={(p) => seen.push(p)} />)
    expect(screen.getByText(/아직 식단이 없어요/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '식단 만들기' }))
    expect(rows()).toHaveLength(14)
    expect(seen.at(-1)!.meals).toHaveLength(14)
  })

  it('supports a four-week plan shown by week', async () => {
    render(<Harness />)
    await userEvent.selectOptions(screen.getByLabelText('기간'), '4')
    await userEvent.click(screen.getByRole('button', { name: '식단 만들기' }))
    expect(rows()).toHaveLength(56)
    expect(screen.getByText('4주차')).toBeInTheDocument()
  })

  it('keeps a locked meal when regenerating', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: '식단 만들기' }))
    const before = nameOf(rows()[0])
    await userEvent.click(within(rows()[0]).getByRole('button', { name: '고정' }))
    await userEvent.click(screen.getByRole('button', { name: '식단 만들기' }))
    expect(nameOf(rows()[0])).toBe(before)
  })

  it('rerolls only the chosen meal', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: '식단 만들기' }))
    const before = rows().map(nameOf)
    await userEvent.click(within(rows()[1]).getByRole('button', { name: '다시 뽑기' }))
    const after = rows().map(nameOf)
    expect(after[1]).not.toBe(before[1])
    expect(after.filter((_, i) => i !== 1)).toEqual(before.filter((_, i) => i !== 1))
  })

  it('shows the recipe with ingredients scaled by people when a menu is clicked', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: '식단 만들기' }))
    await userEvent.click(within(rows()[0]).getByTestId('meal-name'))
    expect(screen.getByText('계란 4개')).toBeInTheDocument() // 1인분 2개 × 2명
    expect(screen.getByText(/조리 순서 하나/)).toBeInTheDocument()
  })

  it('explains an empty plan when everyone is zero', async () => {
    const s = defaultSettings()
    for (const d of s) {
      d.lunch.people = 0
      d.dinner.people = 0
    }
    render(<Harness settings={s} />)
    await userEvent.click(screen.getByRole('button', { name: '식단 만들기' }))
    expect(screen.getByText(/만들 끼니가 없어요/)).toBeInTheDocument()
  })

  it('lets the start date be changed', async () => {
    const seen: (Plan | null)[] = []
    render(<Harness onPlan={(p) => seen.push(p)} />)
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-12-31' } })
    await userEvent.click(screen.getByRole('button', { name: '식단 만들기' }))
    expect(seen.at(-1)!.startDate).toBe('2026-12-31')
  })
})
