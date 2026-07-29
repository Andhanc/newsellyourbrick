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

function humanizePropertyType(value) {
  const normalized = String(value || '').trim().toLowerCase()
  const labels = {
    apartment: 'Апартаменты',
    apartments: 'Апартаменты',
    properties_apartments: 'Апартаменты',
    flat: 'Квартира',
    flats: 'Квартиры',
    house: 'Дом',
    houses: 'Дома',
    properties_houses: 'Дома',
    villa: 'Вилла',
    villas: 'Виллы',
    commercial: 'Коммерческая',
    townhouse: 'Таунхаус',
    penthouse: 'Пентхаус',
  }
  return labels[normalized] || String(value || '').trim()
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
  const shareListingState = listingState.state === 'sold'
    ? { ...listingState, label: 'Сбор завершён' }
    : listingState

  return {
    ...shareListingState,
    blocksInvestment,
    ctaLabel: shareListingState.state === 'sold'
      ? 'Сбор завершён'
      : blocksInvestment
        ? shareListingState.label
        : 'Подробнее',
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

  return {
    ...raw,
    id: raw.id,
    shareId: raw.shareId || raw.share_id || (raw.id != null ? String(raw.id) : ''),
    routeId: raw.routeId || raw.shareId || raw.share_id || raw.id,
    title: String(raw.title || raw.name || '').trim(),
    location,
    city: String(raw.city || parsedLocation.city || '').trim(),
    country: String(raw.country || parsedLocation.country || '').trim(),
    type: humanizePropertyType(raw.type || raw.property_category || raw.property_type),
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
    statusLabel:
      state.blocksInvestment
        ? state.ctaLabel
        : collectedPercent == null
          ? 'Условия уточняются'
          : collectedPercent >= 80
            ? 'Почти собрано'
            : 'Сбор открыт',
  }
}

export function formatForecastYield(value, locale = 'ru-RU') {
  const yieldValue = finiteNumber(value)
  if (yieldValue == null) {
    return {
      label: 'Прогноз доходности',
      value: '—',
      note: 'Прогноз не опубликован',
    }
  }

  return {
    label: 'Прогноз доходности',
    value: `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(yieldValue)}%`,
    note: 'Прогноз, не гарантия',
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
