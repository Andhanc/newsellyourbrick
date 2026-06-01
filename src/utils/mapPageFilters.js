import { filterPropertiesStrict } from './propertySearchFilters'

export const EMPTY_MAP_FILTERS = {
  propertyType: '',
  purchaseTypes: [],
  minPrice: '',
  maxPrice: '',
  likedOnly: false,
}

export const MAP_PROPERTY_TYPE_OPTIONS = [
  { value: '', labelKey: 'propertyTypeAll' },
  { value: 'Квартира', labelKey: 'propertyTypeFlat' },
  { value: 'Апартаменты', labelKey: 'propertyTypeApartment' },
  { value: 'Вилла', labelKey: 'propertyTypeVilla' },
  { value: 'Дом', labelKey: 'propertyTypeHouse' },
  { value: 'Таунхаус', labelKey: 'propertyTypeTownhouse' },
]

export const MAP_PURCHASE_TYPE_OPTIONS = [
  { value: 'auction', labelKey: 'modalPurchaseTypeAuction' },
  { value: 'buy_now', labelKey: 'modalPurchaseTypeBuyNow' },
  { value: 'shares', labelKey: 'modalPurchaseTypeShares' },
  { value: 'debt', labelKey: 'modalPurchaseTypeDebt' },
  { value: 'direct', labelKey: 'modalPurchaseTypeDirect' },
]

export function getMapPriceBounds(properties = []) {
  let min = Infinity
  let max = 0
  for (const property of properties) {
    const price = Number(property.price ?? property.currentBid ?? 0)
    if (!Number.isFinite(price) || price <= 0) continue
    min = Math.min(min, price)
    max = Math.max(max, price)
  }
  if (!Number.isFinite(min) || min === Infinity) {
    return { min: 0, max: 1_000_000 }
  }
  return { min, max: Math.max(max, min) }
}

export function countActiveMapFilters(filters = EMPTY_MAP_FILTERS) {
  let count = 0
  if (filters.propertyType) count += 1
  if (Array.isArray(filters.purchaseTypes) && filters.purchaseTypes.length > 0) count += 1
  if (filters.minPrice !== '' || filters.maxPrice !== '') count += 1
  if (filters.likedOnly) count += 1
  return count
}

export function applyMapPageFilters(properties = [], filters = EMPTY_MAP_FILTERS, { isFavorite } = {}) {
  let result = filterPropertiesStrict(properties, {
    propertyType: filters.propertyType || '',
    purchaseTypes: filters.purchaseTypes || [],
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  })

  if (filters.likedOnly && typeof isFavorite === 'function') {
    result = result.filter((property) => isFavorite(property, null))
  }

  return result
}
