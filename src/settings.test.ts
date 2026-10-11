import { defaultSettings } from './settings'

describe('defaultSettings', () => {
  it('has seven days with breakfast off', () => {
    const s = defaultSettings()
    expect(s).toHaveLength(7)
    for (const day of s) expect(day.breakfast.people).toBe(0)
  })
  it('defaults lunch to 2 people simple and dinner to 2 people normal', () => {
    const s = defaultSettings()
    expect(s[0].lunch).toEqual({ people: 2, maxDifficulty: 1 })
    expect(s[0].dinner).toEqual({ people: 2, maxDifficulty: 2 })
  })
})
