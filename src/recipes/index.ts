import type { Recipe } from '../types'
import raw from './recipes.json'
import { validateRecipes } from './schema'

export const bundledRecipes: Recipe[] = validateRecipes(raw)
