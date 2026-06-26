import { isSeoNoindexPath, normalizeSeoPathname } from './seoRobots.js'

/** Публичные страницы без динамической проверки slug (SPA-маршруты). */
const PUBLIC_EXACT_PATHS = new Set([
  '/',
  '/auction',
  '/debts',
  '/co-investment',
  '/test-drive',
  '/about',
  '/news',
  '/map',
  '/sections',
  '/calculator',
  '/private-club',
  '/main',
  '/shares',
])

/** Префиксы валидных публичных разделов (включая noindex-кабинеты — им нужен 200, не 404). */
const PUBLIC_PREFIX_PATHS = [
  '/auction/',
  '/debts/',
  '/co-investment/',
  '/property/',
  '/news/',
  '/shares/',
  '/search-results/',
  '/auth/',
]

/**
 * Известный маршрут приложения (не «битая» ссылка).
 * @param {string} pathname
 */
export function isKnownPublicAppPath(pathname) {
  const path = normalizeSeoPathname(pathname)
  if (!path || path === '/') return true
  if (PUBLIC_EXACT_PATHS.has(path)) return true
  if (PUBLIC_PREFIX_PATHS.some((prefix) => path.startsWith(prefix))) return true
  if (isSeoNoindexPath(path)) return true
  return false
}
