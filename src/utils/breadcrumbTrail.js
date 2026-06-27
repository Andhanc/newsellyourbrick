/**
 * Хлебные крошки по текущему URL (pathname + query).
 * @typedef {{ to: string | null, label: string }} BreadcrumbItem
 */

import { CO_INVESTMENT_PATH } from './sectionRoutes'
import {
  CATALOG_TYPE_PLURALS,
  CATALOG_SALE_TABS,
  isCatalogCountrySegment,
} from './catalogGeoUrl'
import { getCanonicalRegionLabel } from './propertySearchLocation'
import {
  buildAuctionFilterPath,
  isAuctionRoute,
  parseAuctionFilterPath,
} from './auctionFilterUrl'

const CATALOG_TYPE_I18N = {
  apartments: 'oap_propertyTypeApartments',
  villas: 'propertyTypeVilla',
  houses: 'propertyTypeHouse',
  commercial: 'propertyTypeCommercial',
}

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

  if (isAuctionRoute(pathname) || pathnameRaw === '/main') {
    const parsed = parseAuctionFilterPath(pathname, search)
    const hasSaleFilter = parsed.saleFilters.length === 1
    const hasCategory = parsed.propertyTypes.length === 1

    if (!hasSaleFilter && !hasCategory) {
      crumbs = [home, { to: null, label: t('auction') }]
    } else {
      crumbs = [home, { to: '/auction', label: t('auction') }]
      if (hasSaleFilter) {
        const filter = parsed.saleFilters[0]
        const saleLabelKey =
          filter === 'buy_now'
            ? 'buyNowSectionTitle'
            : filter === 'ended'
              ? 'auctionFilterEnded'
              : filter === 'pre_auction'
                ? 'auctionFilterPreAuction'
                : 'modalPurchaseTypeAuction'
        crumbs.push({
          to: hasCategory
            ? buildAuctionFilterPath({ saleFilter: filter, categorySlug: null })
            : null,
          label: t(saleLabelKey),
        })
      }
      if (hasCategory) {
        const normalizedCat = parsed.propertyTypes[0]
        const key = CATEGORY_I18N[normalizedCat]
        crumbs.push({
          to: parsed.canonicalPath,
          label: key ? t(key) : normalizedCat,
        })
      }
      const last = crumbs[crumbs.length - 1]
      crumbs[crumbs.length - 1] = { ...last, to: null }
    }
    return crumbs
  }

  if (pathname === CO_INVESTMENT_PATH || pathname === '/shares') {
    return [home, { to: null, label: t('coInvestment') }]
  }

  if (
    pathname.startsWith(`${CO_INVESTMENT_PATH}/`) ||
    /^\/shares\/[^/]+$/.test(pathname)
  ) {
    return [
      home,
      { to: CO_INVESTMENT_PATH, label: t('coInvestment') },
      { to: null, label: t('listingDefault') },
    ]
  }

  if (pathname === '/debts') {
    return [home, { to: null, label: t('debtsTitle') }]
  }

  if (pathname === '/test-drive') {
    return [home, { to: null, label: t('testDrive') }]
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

  if (pathname === '/search-results' || pathname.startsWith('/search-results/')) {
    return [home, { to: null, label: t('search') }]
  }

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length >= 2 && isCatalogCountrySegment(segments[0])) {
    const [country, city, typePlural] = segments
    const cityLabel = getCanonicalRegionLabel(city, city)
    /** @type {BreadcrumbItem[]} */
    let catalogCrumbs = [home, { to: `/${country}/${city}`, label: cityLabel }]

    if (typePlural && CATALOG_TYPE_PLURALS[typePlural]) {
      const typeKey = CATALOG_TYPE_I18N[typePlural]
      catalogCrumbs.push({
        to: `/${country}/${city}/${typePlural}`,
        label: typeKey ? t(typeKey) : typePlural,
      })
    }

    const sale = String(q.get('sale') || '').toLowerCase()
    if (sale && sale !== 'all' && CATALOG_SALE_TABS.includes(sale)) {
      const basePath = typePlural
        ? `/${country}/${city}/${typePlural}`
        : `/${country}/${city}`
      const saleLabel =
        sale === 'auction'
          ? t('auction')
          : sale === 'co-investment'
            ? t('coInvestment')
            : sale === 'debts'
              ? t('debtsTitle')
              : sale
      catalogCrumbs.push({
        to: `${basePath}?sale=${sale}`,
        label: saleLabel,
      })
    }

    const last = catalogCrumbs[catalogCrumbs.length - 1]
    catalogCrumbs[catalogCrumbs.length - 1] = { ...last, to: null }
    return catalogCrumbs
  }

  if (pathname.startsWith('/property/')) {
    return [home, { to: null, label: t('listingDefault') }]
  }

  return [home, { to: null, label: t('breadcrumbFallback') }]
}
