/**
 * Soft-launch gate: only allowlisted buyer-facing paths stay live.
 * Flip SOFT_LAUNCH_ENABLED to false to restore full access.
 */

export const SOFT_LAUNCH_ENABLED = true

const EXACT_ALLOWED = new Set([
  '/',
  '/main',
  '/mobile-discover',
  '/jeton',
  '/home-redesign',
  '/oauth-bridge',
  '/auth/telegram-callback',
  '/auction',
  '/co-investment',
  '/shares',
  '/debts',
  '/test-drive',
  '/about',
  '/news',
  '/buyer',
  /** Marketing landing «Для продавца» — not the owner cabinet. */
  '/seller',
  '/private-club',
  '/profile',
  '/profile-legacy',
  '/profile/bookings',
  '/data',
  '/history',
  '/subscriptions',
  '/wallet',
  '/deposit',
  '/bonuses',
  '/favorites',
  '/compare',
  '/map',
  '/calculator',
])

/** UI features blocked during soft-launch (entry points + deep links). */
const BLOCKED_FEATURES = new Set([
  'aiAssistant',
  'aiRealEstate',
  'managerChat',
])

function normalizePathname(pathname = '') {
  if (!pathname || pathname === '/') return '/'
  const trimmed = String(pathname).split('?')[0].replace(/\/+$/, '')
  return trimmed || '/'
}

/** Internal tools — never gated. */
export function isSoftLaunchExemptPath(pathname = '') {
  const path = normalizePathname(pathname)
  return (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    path === '/marketer' ||
    path.startsWith('/marketer/')
  )
}

/**
 * Seller cabinet / owner contour — blocked while soft-launch is on.
 * Exact `/seller` is the public marketing page and stays allowed.
 */
export function isSoftLaunchSellerContourPath(pathname = '') {
  const path = normalizePathname(pathname)
  if (path.startsWith('/seller/')) return true
  if (path === '/owner' || path.startsWith('/owner/')) return true
  if (path === '/owner-test' || path.startsWith('/owner-test/')) return true
  if (path === '/main-owner-test') return true
  if (path === '/owner-test-drive') return true
  if (/^\/owner-[a-z0-9-]*-test(\/|$)/.test(path)) return true
  if (/^\/property\/[^/]+\/edit$/.test(path)) return true
  return false
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isSoftLaunchPathAllowed(pathname = '') {
  const path = normalizePathname(pathname)

  if (
    isSoftLaunchSellerContourPath(path) &&
    !isSoftLaunchFeatureBlocked('sellerCabinet')
  ) return true

  if (EXACT_ALLOWED.has(path)) return true

  if (path.startsWith('/auction/')) return true
  if (path.startsWith('/co-investment/')) return true
  if (path.startsWith('/shares/')) return true
  if (path.startsWith('/debts/')) return true
  if (path.startsWith('/test-drive/')) return true
  if (path.startsWith('/news/')) return true

  // /property/:id and /property/:id/test-drive — not /edit
  const propertyMatch = path.match(/^\/property\/([^/]+)(?:\/([^/]+))?$/)
  if (propertyMatch) {
    const suffix = propertyMatch[2]
    if (!suffix || suffix === 'test-drive') return true
    return false
  }

  if (/^\/profile\/bookings\/[^/]+\/check-in$/.test(path)) return true

  return false
}

/**
 * Whether the soft-launch gate should replace the page with «Пока недоступно».
 */
export function shouldShowSoftLaunchUnavailable(pathname = '') {
  if (!SOFT_LAUNCH_ENABLED) return false
  if (isSoftLaunchExemptPath(pathname)) return false
  if (isSoftLaunchSellerContourPath(pathname)) {
    return isSoftLaunchFeatureBlocked('sellerCabinet')
  }
  if (isSoftLaunchPathAllowed(pathname)) return false
  return true
}

/**
 * @param {'sellerRole'|'sellerCabinet'|'aiAssistant'|'aiRealEstate'|'smartInvestor'|'managerChat'|'map'} feature
 */
export function isSoftLaunchFeatureBlocked(feature = '') {
  if (!SOFT_LAUNCH_ENABLED) return false
  return BLOCKED_FEATURES.has(feature)
}

/**
 * Resolve a nav href / path to a soft-launch blocked feature key, if any.
 * @param {string} href
 * @returns {string|null}
 */
export function getSoftLaunchBlockedFeatureForHref(href = '') {
  if (!SOFT_LAUNCH_ENABLED) return null
  const raw = String(href)
  const path = normalizePathname(raw)
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''

  if (
    (path === '/calculator' || path.startsWith('/calculator/')) &&
    isSoftLaunchFeatureBlocked('smartInvestor')
  ) return 'smartInvestor'
  if (path === '/chat' || path.startsWith('/chat/')) {
    if (query.includes('assistant=1')) return 'aiAssistant'
    if (query.includes('manager=1')) return 'managerChat'
    return 'aiRealEstate'
  }
  if (
    (path === '/map' || path.startsWith('/map/')) &&
    isSoftLaunchFeatureBlocked('map')
  ) return 'map'
  if (
    isSoftLaunchSellerContourPath(path) &&
    isSoftLaunchFeatureBlocked('sellerCabinet')
  ) return 'sellerCabinet'
  if (shouldShowSoftLaunchUnavailable(path)) return 'unavailable'
  return null
}

export function isSoftLaunchHrefBlocked(href = '') {
  return getSoftLaunchBlockedFeatureForHref(href) != null
}
