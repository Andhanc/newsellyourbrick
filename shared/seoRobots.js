/** Пути, которые не должны индексироваться (robots.txt + meta robots). */
export const SEO_ROBOTS_DISALLOW_PREFIXES = [
  '/api',
  '/admin',
  '/owner',
  '/profile',
  '/oauth-bridge',
  '/auth',
  '/wallet',
  '/deposit',
  '/chat',
  '/favorites',
  '/compare',
  '/history',
  '/subscriptions',
  '/bonuses',
  '/marketer',
  '/data',
  '/search-results',
  '/test-drive/survey/',
  '/test-drive/feedback/',
  '/test',
  '/owner-test',
  '/main-owner-test',
  '/owner-properties-test',
  '/owner-property-analytics-test',
  '/owner-test-drive',
  '/owner-subscriptions-test',
  '/owner-sales-test',
  '/owner-wallet-test',
  '/owner-profile-test',
  '/owner-add-property-test',
  '/documents',
]

export function normalizeSeoPathname(pathname = '') {
  const raw = String(pathname || '').split('?')[0].split('#')[0] || '/'
  if (raw === '/main') return '/auction'
  if (raw === '/home-redesign') return '/'
  return raw.startsWith('/') ? raw : `/${raw}`
}

/** @param {string} pathname */
export function isSeoNoindexPath(pathname) {
  const path = normalizeSeoPathname(pathname)
  return SEO_ROBOTS_DISALLOW_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}

/** Строки для robots.txt (без дублирования /api и /api/). */
export function seoRobotsDisallowLines() {
  const seen = new Set()
  /** @type {string[]} */
  const lines = []
  for (const prefix of SEO_ROBOTS_DISALLOW_PREFIXES) {
    const line = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
    if (seen.has(line)) continue
    seen.add(line)
    lines.push(`Disallow: ${line}`)
  }
  return lines
}
