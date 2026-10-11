import type { Recipe } from '../types'
import breakfast from './breakfast.json'
import dinner from './dinner.json'
import lunch from './lunch.json'
import { validateRecipes } from './schema'

export const bundledRecipes: Recipe[] = validateRecipes([...breakfast, ...lunch, ...dinner])
