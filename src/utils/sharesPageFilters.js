import {
  AUCTION_DESKTOP_PROPERTY_TYPE_ITEMS,
  matchesAuctionPropertyTypeFilter,
} from './auctionDesktopFilterMatch'
import { parsePropertyLocation } from './propertySearchLocation'

export const EMPTY_SHARES_FILTERS = {
  propertyType: 'все',
  country: 'all',
  city: 'all',
  collectedRange: 'all',
  offerCategory: 'all',
}

export const SHARES_PROPERTY_TYPE_OPTIONS = AUCTION_DESKTOP_PROPERTY_TYPE_ITEMS

export const SHARES_COLLECTED_OPTIONS = [
  { value: 'all', labelKey: 'sharesFilterCollectedAny' },
  { value: 'early', labelKey: 'sharesFilterCollectedEarly' },
  { value: 'active', labelKey: 'sharesFilterCollectedActive' },
  { value: 'high', labelKey: 'sharesFilterCollectedHigh' },
  { value: 'sold_out', labelKey: 'sharesFilterSoldOutOnly' },
]

export const SHARES_OFFER_CATEGORY_OPTIONS = [
  { value: 'all', labelKey: 'sharesFilterOfferAll' },
  { value: 'stable', labelKey: 'sharesBadgeStable' },
  { value: 'new', labelKey: 'sharesBadgeNew' },
  { value: 'commercial', labelKey: 'sharesBadgeCommercial' },
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
  ...SHARES_OFFER_CATEGORY_OPTIONS.filter((item) => item.value !== 'all').map(
    (item) => ({ kind: 'category', value: item.value, labelKey: item.labelKey }),
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
  return matchesAuctionPropertyTypeFilter(share, propertyType || 'все')
}

function matchesCountry(share, country) {
  if (!country || country === 'all') return true
  const parsed = parsePropertyLocation(share)
  if (!parsed) return false
  return parsed.countryKey === country
}

function matchesCity(share, city) {
  if (!city || city === 'all') return true
  const parsed = parsePropertyLocation(share)
  if (!parsed) return false
  return parsed.regionKey === city
}

function getShareCollectedPercent(share) {
  const total = Math.max(1, Number(share.totalShares) || 1)
  const sold = Math.min(Number(share.sharesSold) || 0, total)
  return Math.round((sold / total) * 100)
}

function getShareOfferCategory(share) {
  if (share.badge) return share.badge
  if (share.property_type === 'commercial') return 'commercial'
  if (share.is_new) return 'new'
  return 'stable'
}

function matchesCollectedRange(share, collectedRange) {
  if (!collectedRange || collectedRange === 'all') return true
  if (collectedRange === 'sold_out') return isShareSoldOut(share)

  const percent = getShareCollectedPercent(share)
  if (isShareSoldOut(share)) return false

  if (collectedRange === 'early') return percent < 35
  if (collectedRange === 'active') return percent >= 35 && percent < 70
  if (collectedRange === 'high') return percent >= 70
  return true
}

function matchesOfferCategory(share, offerCategory) {
  if (!offerCategory || offerCategory === 'all') return true
  return getShareOfferCategory(share) === offerCategory
}

export function applySharesPageFilters(shares = [], filters = EMPTY_SHARES_FILTERS) {
  return shares.filter(
    (share) =>
      matchesPropertyType(share, filters.propertyType) &&
      matchesCountry(share, filters.country) &&
      matchesCity(share, filters.city) &&
      matchesCollectedRange(share, filters.collectedRange) &&
      matchesOfferCategory(share, filters.offerCategory),
  )
}
