export const OWNER_TEST_PATH = '/owner-test'

/** Standalone owner-test page routes (non-embedded). */
export const OWNER_TEST_STANDALONE_HREF_MAP = {
  home: OWNER_TEST_PATH,
  properties: `${OWNER_TEST_PATH}/properties`,
  sales: OWNER_TEST_PATH,
  testdrive: `${OWNER_TEST_PATH}/test-drive`,
  wallet: `${OWNER_TEST_PATH}/wallet`,
  subscriptions: `${OWNER_TEST_PATH}/subscriptions`,
  settings: `${OWNER_TEST_PATH}/profile`,
}

export const OWNER_VIEWS = {
  HOME: 'home',
  PROPERTIES: 'properties',
  PROPERTY_ANALYTICS: 'property-analytics',
  TEST_DRIVE: 'test-drive',
  SUBSCRIPTIONS: 'subscriptions',
  SALES: 'sales',
  WALLET: 'wallet',
  PROFILE: 'profile',
  ADD_PROPERTY: 'add-property',
}

const VALID_VIEWS = new Set(Object.values(OWNER_VIEWS))

export const VIEW_PAGE_ACTIVE = {
  [OWNER_VIEWS.HOME]: 'mot-page-active',
  [OWNER_VIEWS.PROPERTIES]: 'op-page-active',
  [OWNER_VIEWS.PROPERTY_ANALYTICS]: 'opa-page-active',
  [OWNER_VIEWS.TEST_DRIVE]: 'otd-page-active',
  [OWNER_VIEWS.SUBSCRIPTIONS]: 'ost-page-active',
  [OWNER_VIEWS.SALES]: 'osl-page-active',
  [OWNER_VIEWS.WALLET]: 'owl-page-active',
  [OWNER_VIEWS.PROFILE]: 'opr-page-active',
  [OWNER_VIEWS.ADD_PROPERTY]: 'oap-page-active',
}

export const NAV_ID_TO_VIEW = {
  home: OWNER_VIEWS.HOME,
  properties: OWNER_VIEWS.PROPERTIES,
  sales: OWNER_VIEWS.SALES,
  wallet: OWNER_VIEWS.WALLET,
  testdrive: OWNER_VIEWS.TEST_DRIVE,
  subscriptions: OWNER_VIEWS.SUBSCRIPTIONS,
  settings: OWNER_VIEWS.PROFILE,
}

export function isTabbarView(view) {
  return view !== OWNER_VIEWS.ADD_PROPERTY
}

const OWNER_CABINET_SCROLL_ROOTS = [
  '.app-layout',
  '.app-layout__content',
  '.otc-stage',
]

const OWNER_CABINET_SCROLL_PANELS = [
  '.mot-main',
  '.mot-content',
  '.op-body',
  '.op-workspace',
  '.opa-body',
  '.opa-workspace',
  '.otd-body',
  '.otd-workspace',
  '.ost-body',
  '.ost-workspace',
  '.osl-body',
  '.osl-workspace',
  '.opr-body',
  '.opr-workspace',
  '.owl-body',
  '.owl-workspace',
  '.owl-content',
  '.oap-shell',
  '.oap-content',
]

/** Прокрутка кабинета продавца в начало (window + вложенные scroll-контейнеры). */
export function scrollOwnerCabinetToTop() {
  if (typeof window === 'undefined') return

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0

  const selectors = [...OWNER_CABINET_SCROLL_ROOTS, ...OWNER_CABINET_SCROLL_PANELS]
  for (const selector of selectors) {
    document.querySelectorAll(selector).forEach((node) => {
      node.scrollTop = 0
      if (typeof node.scrollTo === 'function') {
        node.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
    })
  }
}

export function resolveOwnerTestView(searchParams) {
  const view = searchParams.get('view') || OWNER_VIEWS.HOME
  if (!VALID_VIEWS.has(view)) return OWNER_VIEWS.HOME
  if (view === OWNER_VIEWS.SALES) return OWNER_VIEWS.HOME
  if (view === OWNER_VIEWS.PROPERTY_ANALYTICS && !searchParams.get('propertyId')) {
    return OWNER_VIEWS.PROPERTIES
  }
  return view
}

export function sanitizeOwnerTestView(view) {
  const next = String(view || '').trim().toLowerCase()
  if (!VALID_VIEWS.has(next)) return OWNER_VIEWS.HOME
  if (next === OWNER_VIEWS.SALES) return OWNER_VIEWS.HOME
  return next
}

export function buildOwnerTestPath(view, params = {}) {
  const nextView = sanitizeOwnerTestView(view)
  if (nextView === OWNER_VIEWS.HOME) return OWNER_TEST_PATH
  if (nextView === OWNER_VIEWS.PROPERTY_ANALYTICS) {
    const propertyId = String(params.propertyId || '').trim()
    if (!propertyId) return `${OWNER_TEST_PATH}/${OWNER_VIEWS.PROPERTIES}`
    return `${OWNER_TEST_PATH}/${OWNER_VIEWS.PROPERTY_ANALYTICS}/${encodeURIComponent(propertyId)}`
  }
  return `${OWNER_TEST_PATH}/${nextView}`
}

export function buildOwnerTestQueryParams(params = {}) {
  const sp = new URLSearchParams()
  if (params.tab && params.tab !== 'personal') sp.set('tab', params.tab)
  if (params.highlight) sp.set('highlight', params.highlight)
  if (params.listing_fee_checkout) sp.set('listing_fee_checkout', params.listing_fee_checkout)
  return sp
}

/**
 * @param {{ routeView?: string, routePropertyId?: string, searchParams?: URLSearchParams }} options
 */
export function resolveOwnerTestRoute(options = {}) {
  const routeViewRaw = String(options.routeView || '').trim()
  const routePropertyIdRaw = String(options.routePropertyId || '').trim()
  const sp = options.searchParams instanceof URLSearchParams ? options.searchParams : new URLSearchParams()

  const legacyViewRaw = sp.get('view') || ''
  const rawView = routeViewRaw || legacyViewRaw || OWNER_VIEWS.HOME
  let view = sanitizeOwnerTestView(rawView)

  const propertyId = routePropertyIdRaw || sp.get('propertyId') || ''
  if (view === OWNER_VIEWS.PROPERTY_ANALYTICS && !propertyId) {
    view = OWNER_VIEWS.PROPERTIES
  }

  return {
    view,
    propertyId: String(propertyId || '').trim(),
    tab: sp.get('tab') || 'personal',
    highlight: sp.get('highlight') || '',
    listing_fee_checkout: sp.get('listing_fee_checkout') || '',
    legacyViewUsed: Boolean(legacyViewRaw),
  }
}

export function buildOwnerTestSearchParams(view, params = {}) {
  const sp = new URLSearchParams()
  if (view && view !== OWNER_VIEWS.HOME) sp.set('view', view)
  if (params.propertyId) sp.set('propertyId', params.propertyId)
  if (params.tab && params.tab !== 'personal') sp.set('tab', params.tab)
  if (params.highlight) sp.set('highlight', params.highlight)
  return sp
}

export function ownerTestHref(view, params = {}) {
  const path = buildOwnerTestPath(view, params)
  const sp = buildOwnerTestQueryParams(params)
  const qs = sp.toString()
  return qs ? `${path}?${qs}` : path
}

export function isNavItemActive(navId, view) {
  const mapped = NAV_ID_TO_VIEW[navId]
  if (!mapped) return false
  if (mapped === OWNER_VIEWS.PROPERTIES) {
    return view === OWNER_VIEWS.PROPERTIES || view === OWNER_VIEWS.PROPERTY_ANALYTICS
  }
  return mapped === view
}

export function isTabItemActive(tabId, view, { aiChatOpen = false, menuOpen = false } = {}) {
  if (tabId === 'home') return view === OWNER_VIEWS.HOME
  if (tabId === 'properties') {
    return view === OWNER_VIEWS.PROPERTIES || view === OWNER_VIEWS.PROPERTY_ANALYTICS
  }
  if (tabId === 'ai') return aiChatOpen
  if (tabId === 'more') {
    if (menuOpen) return true
    return (
      view === OWNER_VIEWS.PROFILE ||
      view === OWNER_VIEWS.SUBSCRIPTIONS ||
      view === OWNER_VIEWS.WALLET ||
      view === OWNER_VIEWS.TEST_DRIVE
    )
  }
  return false
}
