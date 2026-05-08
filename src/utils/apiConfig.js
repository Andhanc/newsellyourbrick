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
 * Сбрасывает кэш (для совместимости, но не используется)
 */
export function resetApiUrlCache() {
  // Не используется, но оставляем для совместимости
}


