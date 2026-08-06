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
 * Сбрасывает кэш (для совместимости, но не используется)
 */
export function resetApiUrlCache() {
  // Не используется, но оставляем для совместимости
}
