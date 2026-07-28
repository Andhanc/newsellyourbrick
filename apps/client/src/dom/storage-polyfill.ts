type StorageName = 'localStorage' | 'sessionStorage'

function createMemoryStorage(): Storage {
  const values = new Map<string, string>()

  return {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(String(key)) ?? null
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key) {
      values.delete(String(key))
    },
    setItem(key, value) {
      values.set(String(key), String(value))
    },
  }
}

function ensureStorage(name: StorageName) {
  if (typeof window === 'undefined') return

  try {
    if (window[name]) return
  } catch {
    // Android's file:// WebView may expose the property but throw while reading it.
  }

  Object.defineProperty(window, name, {
    configurable: true,
    enumerable: true,
    value: createMemoryStorage(),
  })
}

ensureStorage('localStorage')
ensureStorage('sessionStorage')
