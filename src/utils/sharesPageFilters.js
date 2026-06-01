export const EMPTY_SHARES_FILTERS = {
  propertyType: 'все',
  availability: 'all',
  minPrice: '',
  maxPrice: '',
}

export const SHARES_PROPERTY_TYPE_OPTIONS = [
  { value: 'все', labelKey: 'propertyTypeAll' },
  { value: 'квартира', labelKey: 'propertyTypeFlat' },
  { value: 'апартаменты', labelKey: 'propertyTypeApartment' },
  { value: 'вилла', labelKey: 'propertyTypeVilla' },
  { value: 'дом', labelKey: 'propertyTypeHouse' },
]

export const SHARES_AVAILABILITY_OPTIONS = [
  { value: 'available', labelKey: 'sharesFilterAvailable' },
  { value: 'sold_out', labelKey: 'sharesFilterSoldOutOnly' },
]

export const SHARES_MOBILE_FILTER_ITEMS = [
  ...SHARES_PROPERTY_TYPE_OPTIONS.map((item) => ({ kind: 'type', ...item })),
  ...SHARES_AVAILABILITY_OPTIONS.map((item) => ({ kind: 'availability', ...item })),
]

export function isShareSoldOut(share = {}) {
  const total = Math.max(1, Number(share.totalShares) || 1)
  const sold = Math.min(Number(share.sharesSold) || 0, total)
  return sold >= total
}

export function getSharePricePerShare(share = {}) {
  const raw = share.pricePerShare ?? share.price_per_share ?? share.share_price ?? 0
  const price = Number(raw)
  return Number.isFinite(price) ? price : 0
}

export function getSharesPriceBounds(shares = []) {
  let min = Infinity
  let max = 0
  for (const share of shares) {
    const price = getSharePricePerShare(share)
    if (!Number.isFinite(price) || price <= 0) continue
    min = Math.min(min, price)
    max = Math.max(max, price)
  }
  if (!Number.isFinite(min) || min === Infinity) {
    return { min: 0, max: 100_000 }
  }
  return { min, max: Math.max(max, min) }
}

function matchesPropertyType(share, propertyType) {
  if (!propertyType || propertyType === 'все') return true

  if (share.property_type) {
    const typeMap = {
      квартира: ['apartment', 'flat'],
      апартаменты: ['commercial', 'apartment'],
      вилла: ['villa'],
      дом: ['house', 'townhouse'],
    }
    const allowed = typeMap[propertyType]
    if (allowed && !allowed.includes(share.property_type)) return false
    return true
  }

  const titleLower = (share.title || share.name || '').toLowerCase()
  const typeMatch = {
    квартира: titleLower.includes('квартир') || titleLower.includes('студи'),
    апартаменты: titleLower.includes('апартамент'),
    вилла: titleLower.includes('вилл'),
    дом: titleLower.includes('дом') || titleLower.includes('таунхаус'),
  }
  return Boolean(typeMatch[propertyType])
}

function matchesAvailability(share, availability) {
  if (!availability || availability === 'all') return true
  const soldOut = isShareSoldOut(share)
  if (availability === 'available') return !soldOut
  if (availability === 'sold_out') return soldOut
  return true
}

function matchesPrice(share, filters) {
  const { minPrice, maxPrice } = filters
  if (minPrice === '' && maxPrice === '') return true

  const price = getSharePricePerShare(share)
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

function matchesSearch(share, searchQuery) {
  if (!searchQuery) return true
  const query = searchQuery.toLowerCase()
  return (
    (share.title || share.name || '').toLowerCase().includes(query) ||
    (share.location || '').toLowerCase().includes(query)
  )
}

export function applySharesPageFilters(shares = [], filters = EMPTY_SHARES_FILTERS, searchQuery = '') {
  return shares.filter(
    (share) =>
      matchesSearch(share, searchQuery) &&
      matchesPropertyType(share, filters.propertyType) &&
      matchesAvailability(share, filters.availability) &&
      matchesPrice(share, filters),
  )
}
