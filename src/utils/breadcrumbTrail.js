/**
 * Хлебные крошки по текущему URL (pathname + query).
 * @typedef {{ to: string | null, label: string }} BreadcrumbItem
 */

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return pathname || '/'
  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
}

/** Как в PropertyList — нормализация category= из URL */
export function normalizeCategoryFromUrl(rawCategory) {
  const normalized = String(rawCategory || '')
    .trim()
    .toLowerCase()
  if (!normalized) return null
  if (['apartment', 'apartments', 'апартамент', 'апартаменты'].includes(normalized)) return 'апартаменты'
  if (['flat', 'flats', 'квартира', 'квартиры'].includes(normalized)) return 'квартира'
  if (['villa', 'villas', 'вилла', 'виллы'].includes(normalized)) return 'вилла'
  if (['house', 'houses', 'townhouse', 'townhouses', 'дом', 'дома'].includes(normalized)) return 'дом'
  if (['all', 'все'].includes(normalized)) return 'все'
  return null
}

const CATEGORY_I18N = {
  все: 'propertyTypeAll',
  квартира: 'propertyTypeFlat',
  апартаменты: 'propertyTypeApartment',
  вилла: 'propertyTypeVilla',
  дом: 'propertyTypeHouse',
}

/**
 * @param {{ pathname: string, search?: string }} location
 * @param {string} homeTo
 * @param {(key: string) => string} t
 * @returns {BreadcrumbItem[]}
 */
export function buildBreadcrumbTrail(location, homeTo, t) {
  const pathnameRaw = location.pathname || '/'
  const pathname = normalizePathname(pathnameRaw === '/main' ? '/auction' : pathnameRaw)
  const search = location.search || ''
  const q = new URLSearchParams(search)

  const home = { to: homeTo, label: t('home') }

  /** @type {BreadcrumbItem[]} */
  let crumbs = []

  if (pathname === '/auction' || pathnameRaw === '/main') {
    const filter = q.get('filter')
    const categoryRaw = q.get('category')
    const normalizedCat = normalizeCategoryFromUrl(categoryRaw)
    const hasSaleFilter = filter === 'buy_now' || filter === 'ended'
    const hasCategory = Boolean(normalizedCat && normalizedCat !== 'все')

    if (!hasSaleFilter && !hasCategory) {
      crumbs = [home, { to: null, label: t('auction') }]
    } else {
      crumbs = [home, { to: '/auction', label: t('auction') }]
      if (hasSaleFilter) {
        const fs = filter === 'buy_now' ? 'buy_now' : 'ended'
        crumbs.push({
          to: `/auction?filter=${fs}`,
          label: filter === 'buy_now' ? t('buyNowSectionTitle') : t('auctionFilterEnded'),
        })
      }
      if (hasCategory) {
        const qs = new URLSearchParams()
        if (hasSaleFilter) qs.set('filter', filter)
        qs.set('category', categoryRaw || normalizedCat)
        const key = CATEGORY_I18N[normalizedCat]
        crumbs.push({
          to: `/auction?${qs.toString()}`,
          label: key ? t(key) : categoryRaw || normalizedCat,
        })
      }
      const last = crumbs[crumbs.length - 1]
      crumbs[crumbs.length - 1] = { ...last, to: null }
    }
    return crumbs
  }

  if (pathname === '/shares') {
    return [home, { to: null, label: t('sharesTitle') }]
  }

  if (/^\/shares\/[^/]+$/.test(pathname)) {
    return [
      home,
      { to: '/shares', label: t('sharesTitle') },
      { to: null, label: t('listingDefault') },
    ]
  }

  if (pathname === '/debts') {
    return [home, { to: null, label: t('debtsTitle') }]
  }

  if (pathname === '/bonuses') {
    const tab = q.get('tab')
    if (tab === 'seller') {
      return [
        home,
        { to: '/bonuses', label: t('bonuses') },
        { to: null, label: t('bonusesTitleSeller') },
      ]
    }
    return [home, { to: null, label: t('bonuses') }]
  }

  if (pathname === '/private-club') {
    return [home, { to: null, label: t('privateClubPageTitle') }]
  }

  if (pathname === '/owner') {
    return [home, { to: null, label: t('ownerDashboard') }]
  }

  if (pathname === '/owner/property/new') {
    return [
      home,
      { to: '/owner', label: t('ownerDashboard') },
      { to: null, label: t('addProperty') },
    ]
  }

  if (pathname === '/profile') {
    return [home, { to: null, label: t('profile') }]
  }

  if (pathname === '/profile/bookings') {
    return [
      home,
      { to: '/profile', label: t('profile') },
      { to: null, label: t('buyerBookings_title') },
    ]
  }

  if (/^\/profile\/bookings\/[^/]+\/check-in$/.test(pathname)) {
    return [
      home,
      { to: '/profile', label: t('profile') },
      { to: '/profile/bookings', label: t('buyerBookings_title') },
      { to: null, label: t('buyerBookings_checkInCta') },
    ]
  }

  if (/^\/property\/[^/]+\/test-drive$/.test(pathname)) {
    const id = pathname.split('/')[2]
    return [
      home,
      { to: `/property/${id}`, label: t('listingDefault') },
      { to: null, label: t('testDrive') },
    ]
  }

  if (/^\/property\/[^/]+\/edit$/.test(pathname)) {
    const id = pathname.split('/')[2]
    return [
      home,
      { to: `/property/${id}`, label: t('listingDefault') },
      { to: null, label: t('addProperty') },
    ]
  }

  const staticKeys = {
    '/about': 'aboutUs',
    '/sections': 'sectionsNavTitle',
    '/map': 'mapLink',
    '/calculator': 'calculator',
    '/favorites': 'favorites',
    '/compare': 'buyerCabinet_compare',
    '/wallet': 'wallet',
    '/deposit': 'buyerCabinet_tileDepositTitle',
    '/data': 'data',
    '/subscriptions': 'subscriptions',
    '/history': 'history',
    '/chat': 'chat',
    '/search-results': 'search',
    '/admin': 'adminPanel',
  }

  const key = staticKeys[pathname]
  if (key) {
    return [home, { to: null, label: t(key) }]
  }

  if (pathname.startsWith('/property/')) {
    return [home, { to: null, label: t('listingDefault') }]
  }

  return [home, { to: null, label: t('breadcrumbFallback') }]
}
