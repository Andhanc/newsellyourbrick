/** Базовый путь раздела аукциона. */
export const AUCTION_PATH = '/auction'

/** SEO-slug типа продажи → внутренний ключ фильтра. */
export const AUCTION_SALE_SLUGS = {
  bidding: 'auction',
  'buy-now': 'buy_now',
  ended: 'ended',
  'pre-auction': 'pre_auction',
}

/** @type {Record<string, string>} */
export const AUCTION_SALE_SLUG_BY_FILTER = {
  auction: 'bidding',
  buy_now: 'buy-now',
  ended: 'ended',
  pre_auction: 'pre-auction',
}

const SALE_SLUG_SET = new Set(Object.keys(AUCTION_SALE_SLUGS))

/** SEO-slug категории → внутренний тип (как в PropertyList). */
export const AUCTION_CATEGORY_SLUGS = {
  apartments: 'апартаменты',
  flats: 'квартира',
  villas: 'вилла',
  houses: 'дом',
  commercial: 'коммерческая',
  land: 'земля',
}

const CATEGORY_SLUG_SET = new Set(Object.keys(AUCTION_CATEGORY_SLUGS))

/** @type {Record<string, string>} */
const INTERNAL_TYPE_TO_CATEGORY_SLUG = {
  апартаменты: 'apartments',
  квартира: 'flats',
  вилла: 'villas',
  дом: 'houses',
  коммерческая: 'commercial',
  земля: 'land',
}

const LEGACY_CATEGORY_TO_SLUG = {
  apartment: 'apartments',
  apartments: 'apartments',
  flat: 'flats',
  flats: 'flats',
  villa: 'villas',
  house: 'houses',
  houses: 'houses',
  commercial: 'commercial',
  land: 'land',
  квартира: 'flats',
  квартиры: 'flats',
  апартаменты: 'apartments',
  апартамент: 'apartments',
  вилла: 'villas',
  виллы: 'villas',
  дом: 'houses',
  дома: 'houses',
  коммерческая: 'commercial',
}

export function isAuctionRoute(pathname) {
  const path = String(pathname || '')
  return path === AUCTION_PATH || path.startsWith(`${AUCTION_PATH}/`)
}

export function legacyCategoryToSlug(raw) {
  if (!raw) return null
  const key = String(raw).trim().toLowerCase()
  return LEGACY_CATEGORY_TO_SLUG[key] || (CATEGORY_SLUG_SET.has(key) ? key : null)
}

export function internalTypeToCategorySlug(type) {
  return INTERNAL_TYPE_TO_CATEGORY_SLUG[String(type || '').trim()] || null
}

/**
 * @param {{ saleFilter?: string | null, categorySlug?: string | null }} params
 * @returns {string}
 */
export function buildAuctionFilterPath({ saleFilter = null, categorySlug = null } = {}) {
  const parts = [AUCTION_PATH]
  const saleSlug = saleFilter ? AUCTION_SALE_SLUG_BY_FILTER[saleFilter] : null
  if (saleSlug) parts.push(saleSlug)

  const cat = categorySlug ? legacyCategoryToSlug(categorySlug) || categorySlug : null
  if (cat && CATEGORY_SLUG_SET.has(cat)) {
    parts.push(cat)
  }

  return parts.length === 1 ? AUCTION_PATH : parts.join('/')
}

/**
 * @param {string} search
 * @returns {string | null}
 */
export function buildAuctionPathFromLegacySearch(search = '') {
  const q = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  const filter = q.get('filter')
  const category = q.get('category')
  if (!filter && !category) return null

  let saleFilter = null
  if (filter === 'auction') saleFilter = 'auction'
  else if (filter === 'buy_now') saleFilter = 'buy_now'
  else if (filter === 'ended') saleFilter = 'ended'
  else if (filter === 'pre_auction') saleFilter = 'pre_auction'

  const categorySlug = legacyCategoryToSlug(category)
  const path = buildAuctionFilterPath({ saleFilter, categorySlug })
  if (path === AUCTION_PATH && !saleFilter && !categorySlug) return null
  return path
}

/**
 * @param {string} pathname
 * @param {string} [search]
 */
export function parseAuctionFilterPath(pathname, search = '') {
  /** @type {{ saleFilters: string[], propertyTypes: string[], categorySlug: string | null, saleFilter: string | null, canonicalPath: string }} */
  const empty = {
    saleFilters: [],
    propertyTypes: [],
    categorySlug: null,
    saleFilter: null,
    canonicalPath: AUCTION_PATH,
  }

  const legacyPath = buildAuctionPathFromLegacySearch(search)
  if (legacyPath) {
    return { ...parseAuctionFilterPath(legacyPath, ''), legacyRedirect: legacyPath }
  }

  if (!isAuctionRoute(pathname)) return empty

  const segments = pathname.slice(AUCTION_PATH.length).split('/').filter(Boolean)
  const [seg1, seg2] = segments

  let saleFilter = null
  let categorySlug = null

  if (seg1 && SALE_SLUG_SET.has(seg1)) {
    saleFilter = AUCTION_SALE_SLUGS[seg1]
    if (seg2 && CATEGORY_SLUG_SET.has(seg2)) categorySlug = seg2
  } else if (seg1 && CATEGORY_SLUG_SET.has(seg1)) {
    categorySlug = seg1
  }

  const saleFilters = saleFilter ? [saleFilter] : []
  const propertyTypes = categorySlug ? [AUCTION_CATEGORY_SLUGS[categorySlug]] : []

  return {
    saleFilters,
    propertyTypes,
    categorySlug,
    saleFilter,
    canonicalPath: buildAuctionFilterPath({ saleFilter, categorySlug }),
  }
}

/**
 * Построить SEO-путь из текущего UI-состояния фильтров (один sale + один type).
 * @param {string[]} saleFilters
 * @param {string[]} propertyTypes
 */
export function buildAuctionFilterPathFromState(saleFilters = [], propertyTypes = []) {
  const saleFilter = saleFilters.length === 1 ? saleFilters[0] : null
  const type = propertyTypes.length === 1 ? propertyTypes[0] : null
  const categorySlug = type ? internalTypeToCategorySlug(type) : null
  return buildAuctionFilterPath({ saleFilter, categorySlug })
}
