import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsScreen } from './SettingsScreen'
import { defaultSettings } from '../settings'
import type { WeekSettings } from '../types'

function Harness({ onChange }: { onChange?: (s: WeekSettings) => void }) {
  const [s, setS] = useState(defaultSettings())
  return (
    <SettingsScreen
      settings={s}
      theme="system"
      onThemeChange={() => {}}
      onChange={(n) => {
        setS(n)
        onChange?.(n)
      }}
    />
  )
}

const openDay = async (day: string) => {
  await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${day}`) }))
  return screen.getByRole('dialog', { name: `${day} 설정` })
}

describe('SettingsScreen', () => {
  it('lists the seven days with a summary of the meals eaten', () => {
    render(<Harness />)
    expect(screen.getAllByTestId('day-row')).toHaveLength(7)
    const monday = screen.getByRole('button', { name: /^월요일/ })
    expect(monday).toHaveTextContent('점심 2명')
    expect(monday).toHaveTextContent('저녁 2명')
    expect(monday).not.toHaveTextContent('아침')
  })

  it('opens a sheet with breakfast, lunch and dinner for the chosen day', async () => {
    render(<Harness />)
    const sheet = await openDay('수요일')
    for (const meal of ['아침', '점심', '저녁']) expect(within(sheet).getByRole('group', { name: meal })).toBeInTheDocument()
  })

  it('turns a meal off with the switch and reports people 0', async () => {
    const seen: WeekSettings[] = []
    render(<Harness onChange={(s) => seen.push(s)} />)
    const sheet = await openDay('수요일')
    await userEvent.click(within(sheet).getByRole('switch', { name: '점심 안 먹어요' }))
    expect(seen.at(-1)![2].lunch.people).toBe(0)
    await userEvent.click(within(sheet).getByRole('button', { name: '확인' }))
    expect(screen.getByRole('button', { name: /^수요일/ })).toHaveTextContent('점심 안 먹음')
  })

  it('turns a meal back on with 1 person', async () => {
    const seen: WeekSettings[] = []
    render(<Harness onChange={(s) => seen.push(s)} />)
    const sheet = await openDay('월요일')
    const sw = within(sheet).getByRole('switch', { name: '아침 안 먹어요' })
    expect(sw).toHaveAttribute('aria-checked', 'true') // 기본값: 아침은 안 먹음
    await userEvent.click(sw)
    expect(seen.at(-1)![0].breakfast.people).toBe(1)
  })

  it('changes people with the stepper and never goes below 0', async () => {
    const seen: WeekSettings[] = []
    render(<Harness onChange={(s) => seen.push(s)} />)
    const sheet = await openDay('월요일')
    const dinner = within(sheet).getByRole('group', { name: '저녁' })
    await userEvent.click(within(dinner).getByRole('button', { name: '인원 늘리기' }))
    expect(seen.at(-1)![0].dinner.people).toBe(3)
    for (let i = 0; i < 3; i++) await userEvent.click(within(dinner).getByRole('button', { name: '인원 줄이기' }))
    expect(seen.at(-1)![0].dinner.people).toBe(0)
    expect(within(dinner).queryByRole('button', { name: '인원 줄이기' })).not.toBeInTheDocument()
  })

  it('changes difficulty', async () => {
    const seen: WeekSettings[] = []
    render(<Harness onChange={(s) => seen.push(s)} />)
    const sheet = await openDay('월요일')
    const dinner = within(sheet).getByRole('group', { name: '저녁' })
    await userEvent.click(within(dinner).getByRole('button', { name: '공들임' }))
    expect(seen.at(-1)![0].dinner.maxDifficulty).toBe(3)
    expect(within(dinner).getByRole('button', { name: '공들임' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('SettingsScreen theme', () => {
  it('shows the three screen modes and reports the chosen one', async () => {
    const picked: string[] = []
    render(<SettingsScreen settings={defaultSettings()} onChange={() => {}} theme="system" onThemeChange={(t) => picked.push(t)} />)
    const group = screen.getByRole('group', { name: '화면 모드' })
    expect(within(group).getByRole('button', { name: '시스템 설정' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(within(group).getByRole('button', { name: '다크' }))
    expect(picked).toEqual(['dark'])
  })
})
