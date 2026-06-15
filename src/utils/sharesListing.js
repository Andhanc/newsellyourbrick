import {
  getSharePricePerShare,
  isShareSoldOut,
} from './sharesPageFilters'
import { getPropertyCardImage } from './propertyImage'

export const SHARES_PAGE_SIZE = 8

export const SHARES_SORT_OPTIONS = [
  { value: 'popularity', labelKey: 'sharesSortPopularity' },
  { value: 'yield', labelKey: 'sharesSortYield' },
  { value: 'min_investment', labelKey: 'sharesSortMinInvestment' },
  { value: 'collected', labelKey: 'sharesSortCollected' },
]

export function getShareLocationParts(share = {}) {
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

/** Полный адрес для карточки — не обрезаем промежуточные части location. */
export function getShareLocationLabel(share = {}) {
  const direct = (share.location || '').trim()
  if (direct) return direct

  const city = (share.city || '').trim()
  const country = (share.country || '').trim()
  if (city && country) return `${city}, ${country}`
  if (city || country) return city || country

  const { city: parsedCity, country: parsedCountry } = getShareLocationParts(share)
  return [parsedCity, parsedCountry].filter(Boolean).join(', ')
}

export function getShareAnnualYield(share = {}) {
  const raw = share.annualYield ?? share.annual_yield ?? share.yield_percent
  const value = Number(raw)
  return Number.isFinite(value) ? value : 12.7
}

export function getShareBadgeType(share = {}) {
  if (share.badge) return share.badge
  if (share.property_type === 'commercial') return 'commercial'
  if (share.is_new) return 'new'
  return 'stable'
}

export function getCollectedPercent(share = {}) {
  const total = Math.max(1, Number(share.totalShares) || 1)
  const sold = Math.min(Number(share.sharesSold) || 0, total)
  return Math.round((sold / total) * 100)
}

export function getCollectedAmount(share = {}) {
  const total = Math.max(0, Number(share.totalPrice) || 0)
  const percent = getCollectedPercent(share) / 100
  return Math.round(total * percent)
}

export function getSharesFilterOptions(shares = []) {
  const countries = new Set()
  const cities = new Set()

  for (const share of shares) {
    const { city, country } = getShareLocationParts(share)
    if (country) countries.add(country)
    if (city) cities.add(city)
  }

  return {
    countries: [...countries].sort((a, b) => a.localeCompare(b, 'ru')),
    cities: [...cities].sort((a, b) => a.localeCompare(b, 'ru')),
  }
}

export function sortShares(shares = [], sortKey = 'popularity') {
  const list = [...shares]
  switch (sortKey) {
    case 'yield':
      return list.sort((a, b) => getShareAnnualYield(b) - getShareAnnualYield(a))
    case 'min_investment':
      return list.sort((a, b) => getSharePricePerShare(a) - getSharePricePerShare(b))
    case 'collected':
      return list.sort((a, b) => getCollectedPercent(b) - getCollectedPercent(a))
    default:
      return list.sort((a, b) => {
        const soldOutDiff = Number(isShareSoldOut(a)) - Number(isShareSoldOut(b))
        if (soldOutDiff !== 0) return soldOutDiff
        return getCollectedPercent(b) - getCollectedPercent(a)
      })
  }
}

export function paginateShares(shares = [], page = 1, pageSize = SHARES_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(shares.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    items: shares.slice(start, start + pageSize),
    totalPages,
    currentPage: safePage,
    totalItems: shares.length,
  }
}

export function getVisiblePaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({ type: 'page', value: index + 1 }))
  }

  const items = [{ type: 'page', value: 1 }]
  if (currentPage > 3) items.push({ type: 'ellipsis' })

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  for (let page = start; page <= end; page += 1) {
    items.push({ type: 'page', value: page })
  }

  if (currentPage < totalPages - 2) items.push({ type: 'ellipsis' })
  if (totalPages > 1) items.push({ type: 'page', value: totalPages })
  return items
}

export function mapShareFromApiResponse(property, imageFallback = '') {
  if (!property || typeof property !== 'object') return null

  const shareId =
    property.shareId ||
    (property.property_type && property.id != null
      ? `${property.property_type}-${property.id}`
      : String(property.id ?? ''))

  if (!shareId) return null

  const totalShares =
    property.totalShares != null
      ? Number(property.totalShares)
      : property.total_shares != null
        ? Number(property.total_shares)
        : 0

  const sharesSold =
    property.sharesSold != null
      ? Number(property.sharesSold)
      : property.shares_sold != null
        ? Number(property.shares_sold)
        : 0

  const totalPrice =
    property.totalPrice != null
      ? Number(property.totalPrice)
      : property.price != null
        ? Number(property.price)
        : 0

  const pricePerShare =
    property.pricePerShare != null
      ? Number(property.pricePerShare)
      : property.price_per_share != null
        ? Number(property.price_per_share)
        : totalShares > 0
          ? totalPrice / totalShares
          : 0

  const { city, country } = getShareLocationParts(property)

  return {
    ...property,
    shareId,
    routeId: shareId,
    property_type: property.property_type,
    title: property.title || property.name || '',
    location: property.location || '',
    city: property.city || city,
    country: property.country || country,
    description: property.description || '',
    image: getPropertyCardImage(property, imageFallback),
    images: property.images || property.photos || [],
    totalPrice,
    pricePerShare,
    totalShares,
    sharesSold,
    myShares: property.myShares ?? 0,
    area: property.area,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    currency: property.currency || 'EUR',
    annualYield: property.annualYield ?? property.annual_yield ?? property.yield_percent,
    badge: property.badge,
    is_new: property.is_new,
    sale_type: 'share',
    is_shared_ownership: true,
  }
}

export function mapSharesFromApiResponse(list = [], imageFallback = '') {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => mapShareFromApiResponse(item, imageFallback))
    .filter(Boolean)
}
