import { getPropertyCardImage } from './propertyImage'

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

export function getShareBadgeType(share = {}) {
  if (share.badge) return share.badge
  if (share.property_type === 'commercial') return 'commercial'
  if (share.is_new) return 'new'
  return 'stable'
}

export function getShareOwnershipPercent(share = {}) {
  const total = Number(share.totalShares) || 0
  if (total <= 0) return null
  return 100 / total
}

export function formatShareOwnershipPercent(share = {}, locale = 'en') {
  const percent = getShareOwnershipPercent(share)
  if (percent == null) return null
  const numberLocale = String(locale || 'en').startsWith('ru')
    ? 'ru-RU'
    : String(locale || 'en').startsWith('de')
      ? 'de-DE'
      : 'en-US'

  const fractionDigits = percent < 1 ? 2 : percent < 10 ? 1 : 0

  return new Intl.NumberFormat(numberLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(percent)
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
