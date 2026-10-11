import { validateRecipes } from './schema'

const good = {
  id: 'egg-fried-rice',
  name: '계란볶음밥',
  meals: ['lunch'],
  difficulty: 1,
  minutes: 10,
  ingredients: [{ name: '계란', amount: 2, unit: '개', category: '육류·계란' }],
  steps: ['팬에 계란을 볶는다.'],
}

describe('validateRecipes', () => {
  it('returns valid recipes unchanged', () => {
    expect(validateRecipes([good])).toEqual([good])
  })
  it('rejects duplicate ids', () => {
    expect(() => validateRecipes([good, good])).toThrow(/egg-fried-rice/)
  })
  it('rejects non-positive ingredient amounts', () => {
    const bad = { ...good, ingredients: [{ ...good.ingredients[0], amount: 0 }] }
    expect(() => validateRecipes([bad])).toThrow(/egg-fried-rice/)
  })
  it('rejects empty meals', () => {
    expect(() => validateRecipes([{ ...good, meals: [] }])).toThrow(/egg-fried-rice/)
  })
  it('rejects difficulty outside 1-3', () => {
    expect(() => validateRecipes([{ ...good, difficulty: 4 }])).toThrow(/egg-fried-rice/)
  })
  it('rejects empty steps', () => {
    expect(() => validateRecipes([{ ...good, steps: [] }])).toThrow(/egg-fried-rice/)
  })
})
