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
