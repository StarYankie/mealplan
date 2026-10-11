import { loadJSON, saveJSON, KEYS, type KeyValueStore } from './storage'

function memStore(initial: Record<string, string> = {}): KeyValueStore {
  const m = new Map(Object.entries(initial))
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) }
}

describe('storage', () => {
  it('returns the fallback when nothing is stored', () => {
    expect(loadJSON(memStore(), KEYS.settings, { a: 1 })).toEqual({ a: 1 })
  })
  it('returns the fallback when the stored JSON is broken', () => {
    const store = memStore({ [KEYS.settings]: '{broken' })
    expect(loadJSON(store, KEYS.settings, [1])).toEqual([1])
  })
  it('round-trips saved values', () => {
    const store = memStore()
    saveJSON(store, KEYS.pantry, ['양파', '대파'])
    expect(loadJSON<string[]>(store, KEYS.pantry, [])).toEqual(['양파', '대파'])
  })
})
