import { getPropertyListingKind } from './propertyListingKind'
import { hasBuyNowOption } from './hasBuyNowOption'

export const CATALOG_SEARCH_SECTIONS = [
  { key: 'auction', labelKey: 'modalPurchaseTypeAuction' },
  { key: 'buy_now', labelKey: 'modalPurchaseTypeBuyNow' },
  { key: 'shares', labelKey: 'modalPurchaseTypeShares' },
  { key: 'debt', labelKey: 'modalPurchaseTypeDebt' },
  { key: 'direct', labelKey: 'modalPurchaseTypeDirect' },
]

function normalizePurchaseTypes(filters = {}) {
  if (Array.isArray(filters.purchaseTypes)) {
    return filters.purchaseTypes.filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
  }
  if (filters.purchaseType !== undefined && filters.purchaseType !== null && String(filters.purchaseType).trim() !== '') {
    return [filters.purchaseType]
  }
  return []
}

export function propertyMatchesCatalogSection(property, sectionKey) {
  const kind = getPropertyListingKind(property).key
  switch (sectionKey) {
    case 'auction':
      return kind === 'auction' || kind === 'auction_buy_now'
    case 'buy_now':
      return hasBuyNowOption(property)
    case 'shares':
      return kind === 'shares'
    case 'debt':
      return kind === 'debt'
    case 'direct':
      return kind === 'direct'
    default:
      return false
  }
}

export function getCatalogSectionsToRender(filters = {}) {
  const selected = normalizePurchaseTypes(filters)
  if (selected.length > 0) {
    return CATALOG_SEARCH_SECTIONS.filter((section) => selected.includes(section.key))
  }
  return CATALOG_SEARCH_SECTIONS
}

export function groupPropertiesByCatalogSection(properties = [], filters = {}) {
  const sections = getCatalogSectionsToRender(filters)
    .map((section) => ({
      ...section,
      properties: properties.filter((property) => propertyMatchesCatalogSection(property, section.key)),
    }))
    .filter((section) => section.properties.length > 0)

  if (sections.length > 0 || properties.length === 0) {
    return sections
  }

  return [
    {
      key: 'all',
      labelKey: 'catalogSearchAllResults',
      properties,
    },
  ]
}
