import { useEffect } from 'react'
import type { ThemePref } from './types'

export const THEME_PREFS: ThemePref[] = ['system', 'light', 'dark']

export const resolveDark = (pref: ThemePref, systemDark: boolean): boolean =>
  pref === 'dark' || (pref === 'system' && systemDark)

const DARK_QUERY = '(prefers-color-scheme: dark)'

// <html> 에 dark 클래스를 붙이거나 뗀다. 'system' 이면 폰의 설정이 바뀔 때도 따라간다.
export function useApplyTheme(pref: ThemePref): void {
  useEffect(() => {
    const root = document.documentElement
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null
    const apply = () => root.classList.toggle('dark', resolveDark(pref, mq?.matches ?? false))
    apply()
    if (pref !== 'system' || !mq) return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])
}
