/**
 * Утилита для определения API Base URL
 *
 * Локально фронт ходит на относительный `/api` — Vite проксирует на бэкенд
 * (см. vite.config.js: `SERVER_PORT` или 3000). То же прокси задано для `vite preview`.
 * Если видите «Failed to fetch» или 404 по `/api/*`, поднимите API:
 * `npm run server` или `npm run dev:all`.
 */

// Используем относительный путь для работы через Vite proxy
const API_BASE_URL = '/api'

/**
 * Получает API Base URL
 * Возвращает localhost URL для локальной разработки
 */
export async function getApiBaseUrl() {
  return API_BASE_URL
}

/**
 * Синхронная версия - возвращает localhost URL
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


