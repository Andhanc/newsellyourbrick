export const EMPTY_SHARES_FILTERS = {
  propertyType: 'all',
  country: 'all',
  city: 'all',
  yieldRange: 'all',
  minInvestment: 'all',
  status: 'all',
}

export const SHARES_PROPERTY_TYPE_OPTIONS = [
  { value: 'all', labelKey: 'sharesFilterAllTypes' },
  { value: 'flat', labelKey: 'propertyTypeFlat' },
  { value: 'apartment', labelKey: 'propertyTypeApartment' },
  { value: 'villa', labelKey: 'propertyTypeVilla' },
  { value: 'house', labelKey: 'propertyTypeHouse' },
  { value: 'commercial', labelKey: 'sharesFilterCommercialType' },
]

export const SHARES_YIELD_OPTIONS = [
  { value: 'all', labelKey: 'sharesFilterAnyYield' },
  { value: '10', labelKey: 'sharesFilterYield10' },
  { value: '12', labelKey: 'sharesFilterYield12' },
  { value: '15', labelKey: 'sharesFilterYield15' },
]

export const SHARES_MIN_INVESTMENT_OPTIONS = [
  { value: 'all', labelKey: 'sharesFilterAnyInvestment' },
  { value: '100', labelKey: 'sharesFilterInvestment100' },
  { value: '500', labelKey: 'sharesFilterInvestment500' },
  { value: '1000', labelKey: 'sharesFilterInvestment1000' },
]

export const SHARES_STATUS_OPTIONS = [
  { value: 'all', labelKey: 'sharesFilterAllStatuses' },
  { value: 'available', labelKey: 'sharesFilterStatusAvailable' },
  { value: 'funding', labelKey: 'sharesFilterStatusFunding' },
  { value: 'sold_out', labelKey: 'sharesFilterSoldOutOnly' },
]

/** @deprecated kept for mobile legacy chips */
export const SHARES_AVAILABILITY_OPTIONS = [
  { value: 'available', labelKey: 'sharesFilterAvailable' },
  { value: 'sold_out', labelKey: 'sharesFilterSoldOutOnly' },
]

/** @deprecated kept for mobile legacy chips */
export const SHARES_MOBILE_FILTER_ITEMS = [
  ...SHARES_PROPERTY_TYPE_OPTIONS.filter((item) => item.value !== 'all').map((item) => ({
    kind: 'type',
    value: item.value,
    labelKey: item.labelKey,
  })),
  ...SHARES_STATUS_OPTIONS.filter((item) => item.value !== 'all' && item.value !== 'funding').map(
    (item) => ({ kind: 'status', value: item.value, labelKey: item.labelKey }),
  ),
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

function getShareLocationParts(share) {
  if (share.city && share.country) {
    return { city: share.city, country: share.country }
  }
  const loc = (share.location || '').trim()
  const parts = loc.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { city: parts[0], country: parts[parts.length - 1] }
  }
  return { city: parts[0] || '', country: '' }
}

function matchesPropertyType(share, propertyType) {
  if (!propertyType || propertyType === 'all') return true

  const typeMap = {
    flat: ['apartment', 'flat'],
    apartment: ['commercial', 'apartment'],
    villa: ['villa'],
    house: ['house', 'townhouse'],
    commercial: ['commercial'],
  }

  if (share.property_type) {
    const allowed = typeMap[propertyType]
    if (allowed && !allowed.includes(share.property_type)) return false
    if (propertyType === 'commercial' && share.badge === 'commercial') return true
    return true
  }

  const titleLower = (share.title || share.name || '').toLowerCase()
  const typeMatch = {
    flat: titleLower.includes('квартир') || titleLower.includes('студи'),
    apartment: titleLower.includes('апартамент'),
    villa: titleLower.includes('вилл'),
    house: titleLower.includes('дом') || titleLower.includes('таунхаус'),
    commercial: titleLower.includes('коммер') || titleLower.includes('офис'),
  }
  if (share.badge === 'commercial' && propertyType === 'commercial') return true
  return Boolean(typeMatch[propertyType])
}

function matchesCountry(share, country) {
  if (!country || country === 'all') return true
  return getShareLocationParts(share).country === country
}

function matchesCity(share, city) {
  if (!city || city === 'all') return true
  return getShareLocationParts(share).city === city
}

function matchesYield(share, yieldRange) {
  if (!yieldRange || yieldRange === 'all') return true
  const minYield = Number(yieldRange)
  if (!Number.isFinite(minYield)) return true
  const raw = share.annualYield ?? share.annual_yield ?? share.yield_percent ?? 12.7
  const value = Number(raw)
  return Number.isFinite(value) && value >= minYield
}

function matchesMinInvestment(share, minInvestment) {
  if (!minInvestment || minInvestment === 'all') return true
  const threshold = Number(minInvestment)
  if (!Number.isFinite(threshold)) return true
  return getSharePricePerShare(share) <= threshold
}

function matchesStatus(share, status) {
  if (!status || status === 'all') return true
  const soldOut = isShareSoldOut(share)
  const total = Math.max(1, Number(share.totalShares) || 1)
  const sold = Math.min(Number(share.sharesSold) || 0, total)
  const collected = sold / total

  if (status === 'sold_out') return soldOut
  if (status === 'available') return !soldOut && collected < 0.35
  if (status === 'funding') return !soldOut && collected >= 0.35
  return true
}

export function applySharesPageFilters(shares = [], filters = EMPTY_SHARES_FILTERS) {
  return shares.filter(
    (share) =>
      matchesPropertyType(share, filters.propertyType) &&
      matchesCountry(share, filters.country) &&
      matchesCity(share, filters.city) &&
      matchesYield(share, filters.yieldRange) &&
      matchesMinInvestment(share, filters.minInvestment) &&
      matchesStatus(share, filters.status),
  )
}
