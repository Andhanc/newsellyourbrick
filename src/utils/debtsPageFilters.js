import { getMapPriceBounds } from './mapPageFilters'

export const EMPTY_DEBTS_FILTERS = {
  propertyType: 'все',
  risk: 'all',
  minPrice: '',
  maxPrice: '',
}

export const DEBTS_PROPERTY_TYPE_OPTIONS = [
  { value: 'все', labelKey: 'propertyTypeAll' },
  { value: 'квартира', labelKey: 'propertyTypeFlat' },
  { value: 'апартаменты', labelKey: 'propertyTypeApartment' },
  { value: 'вилла', labelKey: 'propertyTypeVilla' },
  { value: 'дом', labelKey: 'propertyTypeHouse' },
]

export const DEBTS_RISK_OPTIONS = [
  { value: 'red', labelKey: 'debtsHighRisk' },
  { value: 'yellow', labelKey: 'debtsMediumRisk' },
  { value: 'green', labelKey: 'debtsLowRisk' },
]

export const DEBTS_MOBILE_FILTER_ITEMS = [
  ...DEBTS_PROPERTY_TYPE_OPTIONS.map((item) => ({ kind: 'type', ...item })),
  ...DEBTS_RISK_OPTIONS.map((item) => ({ kind: 'risk', ...item })),
]

export function getDebtsPriceBounds(properties = []) {
  return getMapPriceBounds(properties)
}

export function countActiveDebtsFilters(filters = EMPTY_DEBTS_FILTERS) {
  let count = 0
  if (filters.propertyType && filters.propertyType !== 'все') count += 1
  if (filters.risk && filters.risk !== 'all') count += 1
  if (filters.minPrice !== '' || filters.maxPrice !== '') count += 1
  return count
}

function matchesPropertyType(property, propertyType) {
  if (!propertyType || propertyType === 'все') return true

  if (property.property_type) {
    const typeMap = {
      квартира: ['apartment', 'flat'],
      апартаменты: ['commercial', 'apartment'],
      вилла: ['villa'],
      дом: ['house', 'townhouse'],
    }
    const allowed = typeMap[propertyType]
    if (allowed && !allowed.includes(property.property_type)) return false
    return true
  }

  const titleLower = (property.title || property.name || '').toLowerCase()
  const typeMatch = {
    квартира: titleLower.includes('квартир') || titleLower.includes('студи'),
    апартаменты: titleLower.includes('апартамент'),
    вилла: titleLower.includes('вилл'),
    дом: titleLower.includes('дом') || titleLower.includes('таунхаус'),
  }
  return Boolean(typeMatch[propertyType])
}

function matchesRisk(property, risk) {
  if (!risk || risk === 'all') return true
  return property.debt_severity === risk
}

function getDebtsListingPrice(property) {
  const raw = property.currentBid ?? property.price ?? 0
  const price = Number(raw)
  return Number.isFinite(price) ? price : 0
}

function matchesPrice(property, filters) {
  const { minPrice, maxPrice } = filters
  if (minPrice === '' && maxPrice === '') return true

  const price = getDebtsListingPrice(property)
  if (minPrice !== '') {
    const min = Number(minPrice)
    if (Number.isFinite(min) && price < min) return false
  }
  if (maxPrice !== '') {
    const max = Number(maxPrice)
    if (Number.isFinite(max) && price > max) return false
  }
  return true
}

function matchesSearch(property, searchQuery) {
  if (!searchQuery) return true
  const query = searchQuery.toLowerCase()
  return (
    (property.title || property.name || '').toLowerCase().includes(query) ||
    (property.location || '').toLowerCase().includes(query)
  )
}

export function applyDebtsPageFilters(properties = [], filters = EMPTY_DEBTS_FILTERS, searchQuery = '') {
  return properties.filter(
    (property) =>
      matchesSearch(property, searchQuery) &&
      matchesPropertyType(property, filters.propertyType) &&
      matchesRisk(property, filters.risk) &&
      matchesPrice(property, filters),
  )
}
