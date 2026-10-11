import { renderHook, act } from '@testing-library/react'
import { resolveDark, useApplyTheme } from './theme'

type Listener = () => void
function mockMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<Listener>()
  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    addEventListener: (_: string, l: Listener) => listeners.add(l),
    removeEventListener: (_: string, l: Listener) => listeners.delete(l),
  })) as unknown as typeof window.matchMedia
  return (next: boolean) => {
    matches = next
    listeners.forEach((l) => l())
  }
}

describe('resolveDark', () => {
  it('follows the system only when the preference is "system"', () => {
    expect(resolveDark('system', true)).toBe(true)
    expect(resolveDark('system', false)).toBe(false)
    expect(resolveDark('dark', false)).toBe(true)
    expect(resolveDark('light', true)).toBe(false)
  })
})

describe('useApplyTheme', () => {
  const root = document.documentElement
  afterEach(() => {
    root.classList.remove('dark')
    // @ts-expect-error 테스트 후 목 제거
    delete window.matchMedia
  })

  it('adds the dark class for "dark" and removes it for "light"', () => {
    mockMatchMedia(false)
    const { rerender } = renderHook(({ p }) => useApplyTheme(p), { initialProps: { p: 'dark' as const } as { p: 'dark' | 'light' } })
    expect(root.classList.contains('dark')).toBe(true)
    rerender({ p: 'light' })
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('follows the system setting and reacts when it changes', () => {
    const setSystemDark = mockMatchMedia(true)
    renderHook(() => useApplyTheme('system'))
    expect(root.classList.contains('dark')).toBe(true)
    act(() => setSystemDark(false))
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('does not crash when matchMedia is unavailable', () => {
    renderHook(() => useApplyTheme('system'))
    expect(root.classList.contains('dark')).toBe(false)
  })
})
