/**
 * API Base URL for Vite web and Expo Android/iOS DOM.
 *
 * Web (Vite): relative `/api` via proxy.
 * Native DOM (file:): absolute production API — relative paths do not work.
 */

const PRODUCTION_API =
  'https://newsellyourbrick-production-6ed8.up.railway.app/api'

function normalizeBase(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.replace(/\/+$/, '')
}

function resolveApiBaseUrl() {
  const fromExpo =
    typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_BASE_URL : ''
  if (normalizeBase(fromExpo)) return normalizeBase(fromExpo)

  const fromVite = import.meta.env?.VITE_API_BASE_URL
  if (normalizeBase(fromVite)) return normalizeBase(fromVite)

  // Android/iOS Expo DOM runs under file:// — relative /api cannot reach the backend.
  if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
    return PRODUCTION_API
  }

  return '/api'
}

const API_BASE_URL = resolveApiBaseUrl()

/**
 * Получает API Base URL
 */
export async function getApiBaseUrl() {
  return API_BASE_URL
}

/**
 * Синхронная версия
 */
export function getApiBaseUrlSync() {
  return API_BASE_URL
}

/**
 * База для EventSource. SSE держит соединение всё время жизни вкладки; через Vite proxy
 * оно делит с обычными запросами лимит Chrome в 6 соединений на localhost:5173, и при
 * нескольких открытых вкладках fetch/модули ждут в очереди десятки секунд. В dev SSE идёт
 * напрямую на бэкенд (другой host:port — отдельный пул соединений, CORS для localhost разрешён).
 */
export async function getEventsBaseUrl() {
  const base = await getApiBaseUrl()
  if (
    import.meta.env?.DEV &&
    base === '/api' &&
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    return `http://127.0.0.1:${import.meta.env.VITE_BACKEND_PORT || 3000}/api`
  }
  return base
}

/**
 * Сбрасывает кэш (для совместимости, но не используется)
 */
export function resetApiUrlCache() {
  // Не используется, но оставляем для совместимости
}
