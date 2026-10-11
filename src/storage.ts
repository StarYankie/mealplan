export interface KeyValueStore {
  get(key: string): string | null
  set(key: string, value: string): void
}

export const KEYS = { settings: 'mp.settings', plan: 'mp.plan', pantry: 'mp.pantry' } as const

export const localStore: KeyValueStore = {
  get(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* 저장 실패는 무시 (사생활 보호 모드 등) */
    }
  },
}

export function loadJSON<T>(store: KeyValueStore, key: string, fallback: T): T {
  const raw = store.get(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON(store: KeyValueStore, key: string, value: unknown): void {
  store.set(key, JSON.stringify(value))
}
