type StorageName = 'localStorage' | 'sessionStorage'

const PRODUCTION_API =
  'https://newsellyourbrick-production-6ed8.up.railway.app/api'
const PRODUCTION_ORIGIN =
  'https://newsellyourbrick-production-6ed8.up.railway.app'

function ensureViteEnvForNativeDom() {
  const api =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
    PRODUCTION_API
  const origin =
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MEDIA_ORIGIN) ||
    PRODUCTION_ORIGIN

  try {
    const meta = import.meta as ImportMeta & { env?: Record<string, string> }
    const current = { ...(meta.env || {}) }
    if (!current.VITE_API_BASE_URL) current.VITE_API_BASE_URL = String(api).replace(/\/+$/, '')
    if (!current.BASE_URL) current.BASE_URL = './'
    meta.env = current
  } catch {
    // import.meta.env may be frozen depending on bundler — apiConfig still covers getApiBaseUrl.
  }

  if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
    try {
      ;(window as Window & { __SYB_API_BASE__?: string }).__SYB_API_BASE__ =
        String(api).replace(/\/+$/, '')
      ;(window as Window & { __SYB_MEDIA_ORIGIN__?: string }).__SYB_MEDIA_ORIGIN__ =
        String(origin).replace(/\/+$/, '')
    } catch {
      // ignore
    }
  }
}

ensureViteEnvForNativeDom()

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
