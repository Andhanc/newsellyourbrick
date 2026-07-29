import {
  CATALOG_PROPERTY_TYPE_API_MAP,
  EMPTY_CATALOG_FILTERS,
  mergeCatalogFilters,
  persistCatalogFilters,
} from './catalogFilters'
import { resolvePropertyGeoFields } from './catalogGeoUrl'
import { getPropertyListingKind } from './propertyListingKind'
import { getCanonicalRegionKey, matchCountryKey } from './propertySearchLocation'
import { getSearchResultsGeoPath } from './searchResultsGeoUrl'

const PROPERTY_TYPE_LABEL_ORDER = [
  'Таунхаус',
  'Вилла',
  'Дом',
  'Апартаменты',
  'Квартира',
  'Земля',
  'Коммерческая недвижимость',
]

function catalogPropertyTypeFromProperty(property) {
  const apiType = String(property?.property_type || '')
    .toLowerCase()
    .trim()
  if (!apiType) return ''

  if (apiType === 'townhouse') return 'Таунхаус'
  if (apiType === 'apartment' || apiType === 'flat') {
    const titleLower = String(property?.title || property?.name || '').toLowerCase()
    return titleLower.includes('апартамент') ? 'Апартаменты' : 'Квартира'
  }

  for (const label of PROPERTY_TYPE_LABEL_ORDER) {
    const allowed = CATALOG_PROPERTY_TYPE_API_MAP[label]
    if (allowed?.includes(apiType)) return label
  }

  return ''
}

function catalogPurchaseTypeFromProperty(property) {
  const kind = getPropertyListingKind(property).key

  switch (kind) {
    case 'auction':
    case 'auction_buy_now':
      return 'auction'
    case 'shares':
      return 'shares'
    case 'debt':
      return 'debt'
    case 'direct':
      return 'direct'
    default:
      return ''
  }
}

function catalogRoomsFromProperty(property) {
  const raw = property?.rooms ?? property?.bedrooms ?? property?.beds
  const rooms = Number(raw)
  if (!Number.isFinite(rooms) || rooms <= 0) return ''
  if (rooms >= 5) return '5'
  return String(Math.round(rooms))
}

export function buildCatalogFiltersFromProperty(property) {
  if (!property) return { ...EMPTY_CATALOG_FILTERS }

  const { country: countryRaw, city: cityRaw } = resolvePropertyGeoFields(property)
  const country = matchCountryKey(countryRaw) || String(countryRaw || '').trim().toLowerCase()
  const region = getCanonicalRegionKey(cityRaw)
  const propertyType = catalogPropertyTypeFromProperty(property)
  const purchaseType = catalogPurchaseTypeFromProperty(property)

  return mergeCatalogFilters(
    {
      country: country || '',
      region: region || '',
      propertyType,
      purchaseTypes: purchaseType ? [purchaseType] : [],
      rooms: catalogRoomsFromProperty(property),
    },
    EMPTY_CATALOG_FILTERS,
  )
}

export const SEARCH_CATALOG_PATH = '/search-results'

export function prepareSearchCatalogNavigation({ property = null, searchQuery = '' } = {}) {
  const filters = buildCatalogFiltersFromProperty(property)
  persistCatalogFilters(filters)

  const trimmedQuery = String(searchQuery || '').trim()
  const pathname = getSearchResultsGeoPath({
    country: filters.country,
    region: filters.region,
  })

  return {
    pathname,
    state: {
      fromPropertySearchBlock: true,
      ...(trimmedQuery ? { searchQuery: trimmedQuery } : {}),
    },
  }
}

export function navigateToSearchCatalog(navigate, options) {
  const target = prepareSearchCatalogNavigation(options)
  navigate(target.pathname, { state: target.state })
}
