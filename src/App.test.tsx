import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('orders the bottom tabs as 식단, 장보기, 설정', () => {
    render(<App />)
    const tabs = within(screen.getByRole('navigation')).getAllByRole('button')
    expect(tabs.map((t) => t.textContent)).toEqual(['식단', '장보기', '설정'])
  })

  it('opens on the 식단 tab and can switch to the other tabs', async () => {
    render(<App />)
    expect(screen.getByRole('button', { name: '식단' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { name: /식단/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '설정' }))
    expect(screen.getByRole('heading', { name: /몇 명이/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '장보기' }))
    expect(screen.getByText(/먼저 식단을 만드세요/)).toBeInTheDocument()
  })
})

describe('App dark mode', () => {
  afterEach(() => document.documentElement.classList.remove('dark'))
  it('applies the dark class when 다크 is chosen in 설정', async () => {
    localStorage.clear()
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: '설정' }))
    await userEvent.click(screen.getByRole('button', { name: '다크' }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: '라이트' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

describe('App page titles', () => {
  beforeEach(() => localStorage.clear())

  const titleOf = () => {
    const h1 = screen.getByRole('heading', { level: 1 })
    return { h1, icon: h1.parentElement!.querySelector('[data-icon]') as HTMLElement | null }
  }

  it('shows a different icon beside the title on each of the three tabs', async () => {
    render(<App />)
    const icons = [titleOf().icon?.dataset.icon]
    await userEvent.click(screen.getByRole('button', { name: '장보기' }))
    icons.push(titleOf().icon?.dataset.icon)
    await userEvent.click(screen.getByRole('button', { name: '설정' }))
    icons.push(titleOf().icon?.dataset.icon)
    expect(icons.every(Boolean)).toBe(true)
    expect(new Set(icons).size).toBe(3)
  })

  it('keeps every title on one line (no line break, short, no wrapping)', async () => {
    render(<App />)
    for (const tab of [null, '장보기', '설정']) {
      if (tab) await userEvent.click(screen.getByRole('button', { name: tab }))
      const { h1 } = titleOf()
      expect(h1.querySelector('br')).toBeNull()
      expect(h1).toHaveClass('whitespace-nowrap')
      expect(h1.textContent!.length).toBeLessThanOrEqual(11)
    }
  })

  it('hides the decorative icon from screen readers', () => {
    render(<App />)
    expect(titleOf().icon).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('App title layout is identical on every tab', () => {
  beforeEach(() => localStorage.clear())

  it('uses the same classes for the title row, icon badge and title text', async () => {
    render(<App />)
    const sigs: string[] = []
    for (const tab of [null, '장보기', '설정']) {
      if (tab) await userEvent.click(screen.getByRole('button', { name: tab }))
      const h1 = screen.getByRole('heading', { level: 1 })
      const icon = h1.parentElement!.querySelector('[data-icon]') as HTMLElement
      sigs.push([h1.parentElement!.className, icon.className, h1.className, icon.querySelector('svg')!.getAttribute('width')].join('|'))
    }
    expect(new Set(sigs).size).toBe(1)
  })
})
