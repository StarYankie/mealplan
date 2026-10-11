export type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=월 … 6=일
export type Meal = 'breakfast' | 'lunch' | 'dinner'
export type Difficulty = 1 | 2 | 3 // 1=간단 2=보통 3=공들임
export type Category = '채소·과일' | '육류·계란' | '기타'

export interface Ingredient {
  name: string
  amount: number // 1인분 기준
  unit: string
  category: Category
}

export interface Recipe {
  id: string
  name: string
  meals: Meal[]
  difficulty: Difficulty
  minutes: number
  ingredients: Ingredient[]
  steps: string[]
}

export interface Slot {
  people: number
  maxDifficulty: Difficulty
}

export type WeekSettings = Record<Meal, Slot>[] // 길이 7, 인덱스 = Day

export interface PlannedMeal {
  date: string // YYYY-MM-DD
  meal: Meal
  recipeId: string
  people: number
  locked: boolean
  relaxed: boolean
}

export interface Plan {
  startDate: string
  weeks: 1 | 4
  meals: PlannedMeal[]
  warnings: string[]
}
