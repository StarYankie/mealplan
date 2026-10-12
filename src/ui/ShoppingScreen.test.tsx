import { useState } from 'react'
import { render, renderHook, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShoppingScreen } from './ShoppingScreen'
import { useAppState } from './useAppState'
import { KEYS, type KeyValueStore } from '../storage'
import type { Plan, Recipe } from '../types'

const rec = (id: string, ing: string): Recipe => ({
  id,
  name: id,
  meals: ['dinner'],
  difficulty: 1,
  minutes: 10,
  steps: ['만든다'],
  ingredients: [
    { name: ing, amount: 1, unit: '개', category: '채소·과일' },
    { name: '소금', amount: 1, unit: '큰술', category: '기타' },
  ],
})
const recipes = [rec('A', '양파'), rec('B', '두부')]
const plan: Plan = {
  startDate: '2026-10-12',
  weeks: 4,
  warnings: [],
  meals: [
    { date: '2026-10-12', meal: 'dinner', recipeId: 'A', people: 2, locked: false, relaxed: false },
    { date: '2026-10-19', meal: 'dinner', recipeId: 'B', people: 2, locked: false, relaxed: false },
  ],
}

function Harness({ p = plan as Plan | null, initialPantry = [] as string[] }) {
  const [pantry, setPantry] = useState(new Set(initialPantry))
  const [bought, setBought] = useState<Set<string>>(new Set())
  const [shown, setShown] = useState(true)
  return (
    <>
      <button onClick={() => setShown((v) => !v)}>토글 화면</button>
      {shown && (
    <ShoppingScreen
      plan={p}
      recipes={recipes}
      pantry={pantry}
      bought={bought}
      onToggleBought={(k) =>
        setBought((prev) => {
          const next = new Set(prev)
          if (next.has(k)) next.delete(k)
          else next.add(k)
          return next
        })
      }
      onTogglePantry={(n) =>
        setPantry((prev) => {
          const next = new Set(prev)
          if (next.has(n)) next.delete(n)
          else next.add(n)
          return next
        })
      }
    />
      )}
    </>
  )
}

describe('ShoppingScreen', () => {
  it('asks for a plan first when there is none', () => {
    render(<Harness p={null} />)
    expect(screen.getByText(/먼저 식단을 만드세요/)).toBeInTheDocument()
  })

  it('shows only the selected week and switches with the week tabs', async () => {
    render(<Harness />)
    expect(screen.getByText('양파 2개')).toBeInTheDocument()
    expect(screen.queryByText('두부 2개')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '2주차' }))
    expect(screen.getByText('두부 2개')).toBeInTheDocument()
    expect(screen.queryByText('양파 2개')).not.toBeInTheDocument()
  })

  it('removes an item with 안 사도 돼요 and offers to undo it right away', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: '양파 안 사도 돼요' }))
    expect(screen.queryByText('양파 2개')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('양파를 목록에서 뺐어요')
    expect(screen.getByRole('button', { name: /안 사도 되는 재료 1개/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }))
    expect(screen.getByText('양파 2개')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /안 사도 되는 재료/ })).not.toBeInTheDocument()
  })

  it('lists the removed items in a summary row at the top and lets them be bought again', async () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: /안 사도 되는 재료/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '양파 안 사도 돼요' }))
    const summary = screen.getByRole('button', { name: /안 사도 되는 재료 1개/ })
    const firstItem = screen.getByRole('checkbox')
    expect(summary.compareDocumentPosition(firstItem) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('button', { name: '양파 다시 사기' })).not.toBeInTheDocument()
    await userEvent.click(summary)
    await userEvent.click(screen.getByRole('button', { name: '양파 다시 사기' }))
    expect(screen.getByText('양파 2개')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /안 사도 되는 재료/ })).not.toBeInTheDocument()
  })

  it('hides the undo message after a few seconds', () => {
    vi.useFakeTimers()
    try {
      render(<Harness />)
      fireEvent.click(screen.getByRole('button', { name: '양파 안 사도 돼요' }))
      expect(screen.getByRole('status')).toBeInTheDocument()
      act(() => void vi.advanceTimersByTime(5000))
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /안 사도 되는 재료 1개/ })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('lets items be checked off as bought', async () => {
    render(<Harness />)
    const box = screen.getByRole('checkbox', { name: '양파 2개' })
    expect(box).not.toBeChecked()
    await userEvent.click(box)
    expect(box).toBeChecked()
  })

  it('shows how many items have been bought', async () => {
    render(<Harness />)
    expect(screen.getByText(/2개 중 0개 샀어요/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: '양파 2개' }))
    expect(screen.getByText(/2개 중 1개 샀어요/)).toBeInTheDocument()
  })

  it('does not carry checkmarks over to another week with the same items', async () => {
    const other: Plan = { ...plan, startDate: '2026-11-02', meals: plan.meals.map((m, i) => ({ ...m, date: i === 0 ? '2026-11-02' : '2026-11-09' })) }
    const { rerender } = render(<Harness />)
    await userEvent.click(screen.getByRole('checkbox', { name: '양파 2개' }))
    expect(screen.getByRole('checkbox', { name: '양파 2개' })).toBeChecked()
    rerender(<Harness p={other} />)
    expect(screen.getByRole('checkbox', { name: '양파 2개' })).not.toBeChecked()
  })

  it('keeps checkmarks when the screen is left and reopened', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('checkbox', { name: '양파 2개' }))
    await userEvent.click(screen.getByRole('button', { name: '토글 화면' }))
    await userEvent.click(screen.getByRole('button', { name: '토글 화면' }))
    expect(screen.getByRole('checkbox', { name: '양파 2개' })).toBeChecked()
  })
})

describe('pantry persistence', () => {
  const memStore = (): KeyValueStore => {
    const m = new Map<string, string>()
    return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) }
  }
  it('survives a reload', () => {
    const store = memStore()
    const first = renderHook(() => useAppState(store, []))
    act(() => first.result.current.togglePantry('양파'))
    expect(store.get(KEYS.pantry)).toBe('["양파"]')
    const second = renderHook(() => useAppState(store, []))
    expect(second.result.current.pantry.has('양파')).toBe(true)
  })
})
