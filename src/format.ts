import type { Meal } from './types'

export const MEAL_LABEL: Record<Meal, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁' }
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export const fmtAmount = (n: number): string => String(Math.round(n * 100) / 100)

export function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${DAY_NAMES[d.getUTCDay()]})`
}
