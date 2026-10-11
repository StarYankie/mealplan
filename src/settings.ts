import type { WeekSettings } from './types'

export function defaultSettings(): WeekSettings {
  return Array.from({ length: 7 }, () => ({
    breakfast: { people: 0, maxDifficulty: 1 as const },
    lunch: { people: 2, maxDifficulty: 1 as const },
    dinner: { people: 2, maxDifficulty: 2 as const },
  }))
}
