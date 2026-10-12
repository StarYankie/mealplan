import { useCallback, useState } from 'react'
import { nextMonday } from '../planner'
import { bundledRecipes } from '../recipes'
import { defaultSettings } from '../settings'
import { KEYS, loadJSON, localStore, saveJSON, type KeyValueStore } from '../storage'
import { THEME_PREFS } from '../theme'
import type { Plan, Recipe, ThemePref, WeekSettings } from '../types'

const MEALS = ['breakfast', 'lunch', 'dinner'] as const

function validSettings(s: unknown): s is WeekSettings {
  return (
    Array.isArray(s) &&
    s.length === 7 &&
    s.every((d) => d && MEALS.every((m) => typeof d[m]?.people === 'number' && [1, 2, 3].includes(d[m]?.maxDifficulty)))
  )
}
function validMeal(m: any): boolean {
  return (
    !!m &&
    typeof m.date === 'string' &&
    MEALS.includes(m.meal) &&
    typeof m.recipeId === 'string' &&
    typeof m.people === 'number' &&
    typeof m.locked === 'boolean' &&
    typeof m.relaxed === 'boolean'
  )
}
function validPlan(p: any): p is Plan {
  return (
    !!p &&
    typeof p === 'object' &&
    typeof p.startDate === 'string' &&
    (p.weeks === 1 || p.weeks === 4) &&
    Array.isArray(p.warnings) &&
    p.warnings.every((w: unknown) => typeof w === 'string') &&
    Array.isArray(p.meals) &&
    p.meals.every(validMeal) &&
    (p.settings === undefined || validSettings(p.settings))
  )
}

const MAX_PLANS = 8
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// 주마다 식단을 따로 보관한다 (시작일 → 식단). 오래된 것은 최근 MAX_PLANS 개만 남긴다.
function prune(plans: Record<string, Plan>): Record<string, Plan> {
  const keep = Object.keys(plans).sort().slice(-MAX_PLANS)
  return Object.fromEntries(keep.map((k) => [k, plans[k]]))
}

function loadPlans(store: KeyValueStore): { plans: Record<string, Plan>; start: string } {
  const stored = loadJSON<unknown>(store, KEYS.plans, null)
  const plans: Record<string, Plan> = {}
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    for (const [k, v] of Object.entries(stored as Record<string, unknown>)) if (validPlan(v) && v.startDate === k) plans[k] = v
  }
  // 예전 버전은 식단 하나만 'mp.plan' 에 저장했다.
  const legacy = loadJSON<unknown>(store, KEYS.plan, null)
  if (Object.keys(plans).length === 0 && validPlan(legacy)) plans[legacy.startDate] = legacy
  const saved = loadJSON<unknown>(store, KEYS.start, null)
  const fallback = validPlan(legacy) ? legacy.startDate : nextMonday(new Date())
  return { plans, start: typeof saved === 'string' && DATE_RE.test(saved) ? saved : fallback }
}

export function useAppState(store: KeyValueStore = localStore, recipes: Recipe[] = bundledRecipes) {
  const [settings, setSettingsState] = useState<WeekSettings>(() => {
    const s = loadJSON<unknown>(store, KEYS.settings, null)
    return validSettings(s) ? s : defaultSettings()
  })
  const [initial] = useState(() => loadPlans(store))
  const [plans, setPlansState] = useState<Record<string, Plan>>(initial.plans)
  const [startDate, setStartDateState] = useState<string>(initial.start)
  const plan = plans[startDate] ?? null
  const [pantry, setPantryState] = useState<Set<string>>(() => {
    const p = loadJSON<unknown>(store, KEYS.pantry, [])
    return new Set(Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [])
  })

  const [bought, setBoughtState] = useState<Set<string>>(() => {
    const b = loadJSON<unknown>(store, KEYS.bought, [])
    return new Set(Array.isArray(b) ? b.filter((x): x is string => typeof x === 'string') : [])
  })

  const [theme, setThemeState] = useState<ThemePref>(() => {
    const t = loadJSON<unknown>(store, KEYS.theme, 'system')
    return THEME_PREFS.includes(t as ThemePref) ? (t as ThemePref) : 'system'
  })

  const setSettings = useCallback(
    (s: WeekSettings) => {
      saveJSON(store, KEYS.settings, s)
      setSettingsState(s)
    },
    [store],
  )
  const setStartDate = useCallback(
    (d: string) => {
      saveJSON(store, KEYS.start, d)
      setStartDateState(d)
    },
    [store],
  )
  // 식단을 그 시작일 칸에 보관한다. null 이면 지금 보고 있는 주의 식단을 지운다.
  const setPlan = useCallback(
    (p: Plan | null) => {
      setPlansState((prev) => {
        const next = { ...prev }
        if (p) next[p.startDate] = p
        else delete next[startDate]
        const pruned = prune(next)
        saveJSON(store, KEYS.plans, pruned)
        return pruned
      })
      if (p && p.startDate !== startDate) setStartDate(p.startDate)
    },
    [store, startDate, setStartDate],
  )
  const togglePantry = useCallback(
    (name: string) => {
      setPantryState((prev) => {
        const next = new Set(prev)
        if (next.has(name)) next.delete(name)
        else next.add(name)
        saveJSON(store, KEYS.pantry, [...next])
        return next
      })
    },
    [store],
  )

  const setTheme = useCallback(
    (t: ThemePref) => {
      saveJSON(store, KEYS.theme, t)
      setThemeState(t)
    },
    [store],
  )

  const toggleBought = useCallback(
    (key: string) => {
      setBoughtState((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        saveJSON(store, KEYS.bought, [...next])
        return next
      })
    },
    [store],
  )

  return { recipes, settings, setSettings, plan, plans, setPlan, startDate, setStartDate, pantry, togglePantry, bought, toggleBought, theme, setTheme }
}
