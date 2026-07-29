/**
 * Путь к статике из public/ — корректно на Railway и при любом import.meta.env?.BASE_URL.
 * Пример: publicAsset('images/owner-test/owner-promo-sidebar-buyer.png')
 */
const BASE =
  (typeof window !== 'undefined' && window.location?.protocol === 'file:' && './') ||
  (typeof process !== 'undefined' && process.env?.EXPO_BASE_URL) ||
  import.meta.env?.BASE_URL ||
  '/'

export function publicAsset(relativePath) {
  const trimmed = String(relativePath || '').trim().replace(/^\/+/, '')
  if (!trimmed) return BASE === '/' ? '/' : BASE

  const base = BASE.endsWith('/') ? BASE : `${BASE}/`
  return `${base}${trimmed}`
}
