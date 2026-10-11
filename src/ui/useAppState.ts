import { useCallback, useState } from 'react'
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

export function useAppState(store: KeyValueStore = localStore, recipes: Recipe[] = bundledRecipes) {
  const [settings, setSettingsState] = useState<WeekSettings>(() => {
    const s = loadJSON<unknown>(store, KEYS.settings, null)
    return validSettings(s) ? s : defaultSettings()
  })
  const [plan, setPlanState] = useState<Plan | null>(() => {
    const p = loadJSON<unknown>(store, KEYS.plan, null)
    return validPlan(p) ? p : null
  })
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
  const setPlan = useCallback(
    (p: Plan | null) => {
      saveJSON(store, KEYS.plan, p)
      setPlanState(p)
    },
    [store],
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

  return { recipes, settings, setSettings, plan, setPlan, pantry, togglePantry, bought, toggleBought, theme, setTheme }
}
