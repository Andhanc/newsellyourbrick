import { CATALOG_FILTER_CURRENCY_CODES, normalizeCurrencyCode } from './currency'
import { hasCatalogPriceFilter, parseCatalogPriceValue } from './catalogPriceFilter'

export const CATALOG_FILTERS_STORAGE_KEY = 'propertySearchFilters'

export const CATALOG_PROPERTY_TYPE_OPTIONS = [
  { value: '', labelKey: 'propertyTypeAll' },
  { value: 'Квартира', labelKey: 'propertyTypeFlat' },
  { value: 'Апартаменты', labelKey: 'propertyTypeApartment' },
  { value: 'Вилла', labelKey: 'propertyTypeVilla' },
  { value: 'Дом', labelKey: 'propertyTypeHouse' },
  { value: 'Земля', labelKey: 'propertyTypeLand' },
  { value: 'Коммерческая недвижимость', labelKey: 'propertyTypeCommercial' },
  { value: 'Таунхаус', labelKey: 'propertyTypeTownhouse' },
]

/** Соответствие подписи фильтра и property_type из API (как на /auction). */
export const CATALOG_PROPERTY_TYPE_API_MAP = {
  Квартира: ['apartment', 'flat'],
  Апартаменты: ['apartment', 'commercial'],
  Вилла: ['villa'],
  Дом: ['house', 'townhouse'],
  Таунхаус: ['townhouse', 'house'],
  Земля: ['land'],
  'Коммерческая недвижимость': ['commercial'],
}

const PROPERTY_TYPE_TITLE_FALLBACK = {
  Квартира: (title) => title.includes('квартир') || title.includes('студи'),
  Апартаменты: (title) => title.includes('апартамент'),
  Вилла: (title) => title.includes('вилл'),
  Дом: (title) => title.includes('дом') || title.includes('таунхаус'),
  Таунхаус: (title) => title.includes('таунхаус'),
  Земля: (title) => title.includes('земл') || title.includes('участ'),
  'Коммерческая недвижимость': (title) =>
    title.includes('коммер') || title.includes('офис') || title.includes('склад'),
}

export function propertyMatchesCatalogPropertyType(property, propertyTypeLabel = '') {
  const label = String(propertyTypeLabel || '').trim()
  if (!label) return true

  const allowed = CATALOG_PROPERTY_TYPE_API_MAP[label]
  if (!allowed?.length) return false

  const apiType = property?.property_type
  if (apiType && allowed.includes(apiType)) return true

  const titleLower = String(property?.title || property?.name || '').toLowerCase()
  const matchTitle = PROPERTY_TYPE_TITLE_FALLBACK[label]
  return matchTitle ? matchTitle(titleLower) : false
}

export const CATALOG_PURCHASE_TYPE_OPTIONS = [
  { value: 'auction', labelKey: 'modalPurchaseTypeAuction' },
  { value: 'buy_now', labelKey: 'modalPurchaseTypeBuyNow' },
  { value: 'shares', labelKey: 'modalPurchaseTypeShares' },
  { value: 'debt', labelKey: 'modalPurchaseTypeDebt' },
  { value: 'direct', labelKey: 'modalPurchaseTypeDirect' },
]

export const CATALOG_ROOM_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5+' },
]

/** Какие блоки показывать при выбранном типе (пусто = все типы, только глобальные критерии). */
const PROPERTY_TYPE_FILTER_PROFILES = {
  '': { rooms: true },
  Квартира: { rooms: true },
  Апартаменты: { rooms: true },
  Вилла: { rooms: false },
  Дом: { rooms: true },
  Таунхаус: { rooms: true },
  Земля: { rooms: false },
  'Коммерческая недвижимость': { rooms: false },
}

export const EMPTY_CATALOG_FILTERS = {
  country: '',
  region: '',
  propertyType: '',
  purchaseTypes: [],
  purchaseType: '',
  currency: '',
  minPrice: '',
  maxPrice: '',
  rooms: '',
  minArea: '',
  maxArea: '',
}

function hasFilterValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

/**
 * Не считаем фильтром полный диапазон ползунка (min–max сайта).
 * Локальная реализация, чтобы `catalogFilters` не тянул `propertySearchFilters`.
 */
function normalizeSearchPriceFiltersLocal(filters = {}, priceBounds = null) {
  const out = { ...filters }
  if (!priceBounds) return out

  const min = hasFilterValue(out.minPrice) ? parseFloat(out.minPrice) : null
  const max = hasFilterValue(out.maxPrice) ? parseFloat(out.maxPrice) : null
  const boundMin = Number(priceBounds.min)
  const boundMax = Number(priceBounds.max)

  if (
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    Number.isFinite(boundMin) &&
    Number.isFinite(boundMax) &&
    min <= boundMin &&
    max >= boundMax
  ) {
    out.minPrice = ''
    out.maxPrice = ''
  }

  return out
}

export function getCatalogFilterProfile(propertyType = '') {
  return PROPERTY_TYPE_FILTER_PROFILES[propertyType] || PROPERTY_TYPE_FILTER_PROFILES['']
}

export function mergeCatalogFilters(source, prev = EMPTY_CATALOG_FILTERS) {
  if (!source || typeof source !== 'object') return { ...prev }
  return {
    ...prev,
    country: source.country || '',
    region: source.region || '',
    propertyType: source.propertyType || '',
    purchaseTypes: Array.isArray(source.purchaseTypes)
      ? source.purchaseTypes.filter(Boolean).slice(0, 5)
      : source.purchaseType
        ? [source.purchaseType]
        : [],
    purchaseType: '',
    currency: (() => {
      const code = source.currency ? normalizeCurrencyCode(source.currency) : ''
      return CATALOG_FILTER_CURRENCY_CODES.includes(code) ? code : ''
    })(),
    minPrice: source.minPrice != null ? String(source.minPrice) : '',
    maxPrice: source.maxPrice != null ? String(source.maxPrice) : '',
    rooms: source.rooms != null ? String(source.rooms) : '',
    minArea: source.minArea != null ? String(source.minArea) : '',
    maxArea: source.maxArea != null ? String(source.maxArea) : '',
  }
}

/** Убирает «фантомные» критерии из sessionStorage (валюта без цены, нули в полях). */
export function sanitizeCatalogFilters(filters = {}, bounds = null) {
  const next = mergeCatalogFilters(filters, EMPTY_CATALOG_FILTERS)

  if (!hasCatalogPriceFilter(next)) {
    next.currency = ''
    next.minPrice = ''
    next.maxPrice = ''
  } else {
    if (parseCatalogPriceValue(next.minPrice) === 0) next.minPrice = ''
    if (parseCatalogPriceValue(next.maxPrice) === 0) next.maxPrice = ''
    if (!hasCatalogPriceFilter(next)) {
      next.currency = ''
    }
  }

  next.minArea = ''
  next.maxArea = ''

  if (bounds) {
    return normalizeSearchPriceFiltersLocal(next, {
      min: bounds.priceMin,
      max: bounds.priceMax,
    })
  }

  return next
}

export function loadCatalogFiltersFromSession(bounds = null) {
  try {
    const raw = sessionStorage.getItem(CATALOG_FILTERS_STORAGE_KEY)
    if (!raw) return { ...EMPTY_CATALOG_FILTERS }
    return sanitizeCatalogFilters(JSON.parse(raw), bounds)
  } catch {
    return { ...EMPTY_CATALOG_FILTERS }
  }
}

export function persistCatalogFilters(filters) {
  const payload = {
    ...filters,
    purchaseType:
      filters.purchaseTypes?.length === 1 ? filters.purchaseTypes[0] : '',
  }
  sessionStorage.setItem(CATALOG_FILTERS_STORAGE_KEY, JSON.stringify(payload))
  return payload
}

export function getCatalogFilterBounds(properties = []) {
  const areas = properties
    .map((p) => Number(p.area ?? p.sqft ?? p.living_area))
    .filter((v) => Number.isFinite(v) && v > 0)
  const prices = properties
    .map((p) => Number(p.price ?? p.current_bid ?? p.starting_price))
    .filter((v) => Number.isFinite(v) && v > 0)

  return {
    areaMin: areas.length ? Math.floor(Math.min(...areas)) : 0,
    areaMax: areas.length ? Math.ceil(Math.max(...areas)) : 500,
    priceMin: prices.length ? Math.floor(Math.min(...prices)) : 0,
    priceMax: prices.length ? Math.ceil(Math.max(...prices)) : 1_000_000,
  }
}

export function filterPropertiesBySearchQuery(properties = [], query = '') {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return properties
  return properties.filter((property) => {
    const haystack = [
      property.title,
      property.name,
      property.location,
      property.address,
      property.city,
      property.country,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}
