import type { Meal } from './types'

export const MEAL_LABEL: Record<Meal, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁' }
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export const fmtAmount = (n: number): string => String(Math.round(n * 100) / 100)

export function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${DAY_NAMES[d.getUTCDay()]})`
}

export const DIFFICULTY_LABEL = { 1: '간단', 2: '보통', 3: '공들임' } as const
export const DAY_LONG = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
