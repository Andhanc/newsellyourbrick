import { resolveBuyerListingState } from './resolveBuyerListingState.js'

export const SHARES_MARKETPLACE_PAGE_SIZE = 16

function finiteNumber(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function positiveNumber(value) {
  const number = finiteNumber(value)
  return number != null && number > 0 ? number : null
}

function nonNegativeNumber(value) {
  const number = finiteNumber(value)
  return number != null && number >= 0 ? number : null
}

function splitLocation(location) {
  const parts = String(location || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 2) {
    return { city: parts[0], country: parts.at(-1) }
  }
  return { city: parts[0] || '', country: '' }
}

/** Stable type → i18n key (English fallback below). */
const PROPERTY_TYPE_KEYS = {
  apartment: 'propertyTypeApartment',
  apartments: 'propertyTypeApartments',
  properties_apartments: 'propertyTypeApartments',
  flat: 'propertyTypeFlat',
  flats: 'propertyTypeFlats',
  house: 'propertyTypeHouse',
  houses: 'propertyTypeHouses',
  properties_houses: 'propertyTypeHouses',
  villa: 'propertyTypeVilla',
  villas: 'propertyTypeVillas',
  commercial: 'propertyTypeCommercial',
  townhouse: 'propertyTypeTownhouse',
  penthouse: 'propertyTypePenthouse',
}

const PROPERTY_TYPE_EN = {
  apartment: 'Apartment',
  apartments: 'Apartments',
  properties_apartments: 'Apartments',
  flat: 'Flat',
  flats: 'Flats',
  house: 'House',
  houses: 'Houses',
  properties_houses: 'Houses',
  villa: 'Villa',
  villas: 'Villas',
  commercial: 'Commercial property',
  townhouse: 'Townhouse',
  penthouse: 'Penthouse',
}

function humanizePropertyType(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return PROPERTY_TYPE_EN[normalized] || String(value || '').trim()
}

export function resolveShareMarketplaceState(share = {}, now = new Date()) {
  const totalShares = positiveNumber(share.totalShares ?? share.total_shares)
  const sharesSold = nonNegativeNumber(share.sharesSold ?? share.shares_sold)
  const soldOut = totalShares != null && sharesSold != null && sharesSold >= totalShares
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime()
  const reservedUntilTime = new Date(share.reserved_until ?? share.reservedUntil ?? '').getTime()
  const hasReservationOwner =
    share.reserved_by != null && String(share.reserved_by).trim() !== ''
  const hasActiveReservation =
    hasReservationOwner &&
    Number.isFinite(reservedUntilTime) &&
    Number.isFinite(nowTime) &&
    reservedUntilTime > nowTime
  const listingState = resolveBuyerListingState(
    soldOut
      ? { ...share, status: 'sold' }
      : hasActiveReservation
        ? { ...share, is_reserved: true }
        : { ...share, is_reserved: false },
    now,
  )
  const blocksInvestment = Boolean(listingState.blocksPurchase || soldOut)
  const shareListingState =
    listingState.state === 'sold'
      ? {
          ...listingState,
          labelKey: 'sharesPage_statusCompleted',
          label: 'Funding closed',
        }
      : listingState

  return {
    ...shareListingState,
    blocksInvestment,
    ctaLabelKey:
      shareListingState.state === 'sold'
        ? 'sharesPage_statusCompleted'
        : blocksInvestment
          ? shareListingState.labelKey
          : 'sharesPage_learnMore',
    ctaLabel:
      shareListingState.state === 'sold'
        ? 'Funding closed'
        : blocksInvestment
          ? shareListingState.label
          : 'Learn more',
  }
}

export function normalizeMarketplaceShare(raw = {}) {
  const location = String(raw.location || '').trim()
  const parsedLocation = splitLocation(location)
  const totalPrice = positiveNumber(raw.totalPrice ?? raw.price)
  const totalShares = positiveNumber(raw.totalShares ?? raw.total_shares)
  const soldRaw = nonNegativeNumber(raw.sharesSold ?? raw.shares_sold)
  const sharesSold =
    soldRaw == null ? null : totalShares == null ? soldRaw : Math.min(soldRaw, totalShares)
  const explicitPricePerShare = positiveNumber(
    raw.pricePerShare ?? raw.price_per_share ?? raw.share_price,
  )
  const pricePerShare =
    explicitPricePerShare ??
    (totalPrice != null && totalShares != null ? totalPrice / totalShares : null)
  const availableShares =
    totalShares != null && sharesSold != null ? Math.max(0, totalShares - sharesSold) : null
  const collectedPercent =
    totalShares != null && sharesSold != null
      ? Math.min(100, Math.round((sharesSold / totalShares) * 100))
      : null
  const annualYield = finiteNumber(
    raw.annualYield ?? raw.annual_yield ?? raw.yield_percent,
  )
  const state = resolveShareMarketplaceState({ ...raw, totalShares, sharesSold })
  const statusKey = resolveShareStatusKey(state, collectedPercent)
  const typeRaw = raw.type || raw.property_category || raw.property_type
  const typeKey = PROPERTY_TYPE_KEYS[String(typeRaw || '').trim().toLowerCase()] || null

  let statusLabelKey = state.ctaLabelKey
  let statusLabel = state.ctaLabel
  if (!state.blocksInvestment) {
    if (collectedPercent == null) {
      statusLabelKey = 'sharesPage_statusPending'
      statusLabel = 'Terms TBD'
    } else if (collectedPercent >= 80) {
      statusLabelKey = 'sharesPage_statusAlmostFull'
      statusLabel = 'Almost funded'
    } else {
      statusLabelKey = 'sharesPage_statusOpen'
      statusLabel = 'Funding open'
    }
  }

  return {
    ...raw,
    id: raw.id,
    shareId: raw.shareId || raw.share_id || (raw.id != null ? String(raw.id) : ''),
    routeId: raw.routeId || raw.shareId || raw.share_id || raw.id,
    title: String(raw.title || raw.name || '').trim(),
    location,
    city: String(raw.city || parsedLocation.city || '').trim(),
    country: String(raw.country || parsedLocation.country || '').trim(),
    typeKey,
    type: humanizePropertyType(typeRaw),
    image: typeof raw.image === 'string' ? raw.image.trim() : '',
    totalPrice,
    totalShares,
    sharesSold,
    pricePerShare,
    availableShares,
    collectedPercent,
    annualYield,
    currency: String(raw.currency || 'EUR').trim().toUpperCase(),
    sale_type: 'share',
    is_shared_ownership: true,
    statusKey,
    statusLabelKey,
    statusLabel,
  }
}

/** Stable English IDs for marketplace status filters / badges. */
export function resolveShareStatusKey(state = {}, collectedPercent = null) {
  if (state.blocksInvestment) {
    if (state.state === 'sold') return 'completed'
    if (state.state === 'reserved') return 'reserved'
    if (state.state === 'unavailable') return 'unavailable'
    return String(state.state || 'unavailable')
  }
  if (collectedPercent == null) return 'pending'
  if (collectedPercent >= 80) return 'almost_full'
  return 'open'
}

export function formatForecastYield(value, locale = 'en-US') {
  const yieldValue = finiteNumber(value)
  if (yieldValue == null) {
    return {
      labelKey: 'sharesPage_yieldForecast',
      noteKey: 'sharesPage_yieldUnpublished',
      label: 'Yield forecast',
      value: '—',
      note: 'Forecast not published',
    }
  }

  return {
    labelKey: 'sharesPage_yieldForecast',
    noteKey: 'sharesPage_yieldNote',
    label: 'Yield forecast',
    value: `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(yieldValue)}%`,
    note: 'Forecast, not a guarantee',
  }
}

export function paginateSharesMarketplace(
  list = [],
  page = 1,
  pageSize = SHARES_MARKETPLACE_PAGE_SIZE,
) {
  const source = Array.isArray(list) ? list : []
  const totalPages = Math.max(1, Math.ceil(source.length / pageSize))
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const start = (currentPage - 1) * pageSize

  return {
    items: source.slice(start, start + pageSize),
    totalPages,
    currentPage,
    totalItems: source.length,
  }
}
