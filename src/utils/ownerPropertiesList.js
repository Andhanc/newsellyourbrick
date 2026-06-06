import { CLERK_DB_USER_SYNCED, getStoredNumericUserId } from '../services/authService'
import { getCurrencySymbol } from './currency'
import { getPropertyCardImage } from './propertyImage'
import { getPropertyListingKind } from './propertyListingKind'
import {
  buildOwnerPropertyAnalytics,
  setOwnerPropertiesLiveCache,
} from '../pages/ownerPropertiesTestData'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const FALLBACK_IMAGE =
  '/images/external/photo-1568605114967-8130f3a36994-bc29e86e2f.jpg'

function formatMoney(amount, currency = 'USD') {
  const num = Number(amount)
  if (!num || Number.isNaN(num)) return '—'
  const sym = getCurrencySymbol(currency)
  return `${sym}${num.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}`
}

function formatViewsCount(value) {
  const num = Number(value)
  if (!num || Number.isNaN(num)) return '0'
  return num.toLocaleString('ru-RU')
}

function finiteNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function mapListingType(property) {
  const kind = getPropertyListingKind(property).key
  if (kind === 'shares') return 'shares'
  if (kind === 'debt') return 'debts'
  if (kind === 'auction' || kind === 'auction_buy_now') return 'auction'
  return 'buy_now'
}

function resolveStatus(property) {
  const totalShares = Number(property.total_shares) || 0
  const sharesSold = Number(property.shares_sold) || 0
  if (totalShares > 0 && sharesSold >= totalShares) {
    return { status: 'Продан', statusKey: 'sold', filterKey: 'sold' }
  }

  const reservedUntil = property.reserved_until
  if (reservedUntil) {
    const until = new Date(reservedUntil).getTime()
    if (Number.isFinite(until) && until > Date.now()) {
      return { status: 'Забронирован', statusKey: 'booked', filterKey: 'booked' }
    }
  }
  if (property.is_reserved === true || property.is_reserved === 1) {
    return { status: 'Забронирован', statusKey: 'booked', filterKey: 'booked' }
  }

  const moderation = property.moderation_status
  if (moderation === 'approved' && property.has_pending_edit) {
    return { status: 'На модерации', statusKey: 'active', filterKey: 'active' }
  }
  if (moderation === 'approved') {
    return { status: 'Активный', statusKey: 'active', filterKey: 'active' }
  }
  if (moderation === 'rejected') {
    return { status: 'Отклонён', statusKey: 'draft', filterKey: 'draft' }
  }
  return { status: 'Черновик', statusKey: 'draft', filterKey: 'draft' }
}

function resolveAuctionEndTime(property) {
  return (
    property.test_timer_end_date ||
    property.auction_end_date ||
    property.end_time ||
    property.endTime ||
    null
  )
}

function resolveCurrentBid(property, listingType) {
  if (listingType !== 'auction') return null
  const raw =
    property.current_bid ??
    property.currentBid ??
    property.auction_starting_price ??
    property.starting_price ??
    null
  const num = Number(raw)
  return Number.isFinite(num) && num > 0 ? num : null
}

function resolveBookingCount(property) {
  const raw =
    property.booking_count ??
    property.bookings_count ??
    property.bookingCount ??
    property.bookingsCount ??
    property.reservation_count ??
    property.reservations_count ??
    property.purchase_requests_count ??
    null
  const count = finiteNumber(raw, NaN)
  if (Number.isFinite(count)) return count

  if (property.is_reserved === true || property.is_reserved === 1 || property.is_reserved === 'true') {
    return 1
  }

  const reservedUntil = property.reserved_until
  if (reservedUntil) {
    const until = new Date(reservedUntil).getTime()
    if (Number.isFinite(until) && until > Date.now()) return 1
  }

  return 0
}

export function mapApiPropertyToOwnerListRow(prop) {
  const listingType = mapListingType(prop)
  const { status, statusKey, filterKey } = resolveStatus(prop)
  const currency = prop.currency || 'USD'
  const priceNum = Number(prop.price)
  const currentBidNum = resolveCurrentBid(prop, listingType)
  const bidsAmountTotal = finiteNumber(prop.bids_total_amount ?? prop.bidsTotalAmount)
  const viewsCount =
    Number(prop.view_count ?? prop.views_count ?? prop.viewsCount) || 0
  const likesCount = Number(prop.likes_count ?? prop.likesCount ?? prop.favorites_count ?? prop.favoritesCount) || 0
  const bidsCount = Number(prop.bids_count ?? prop.bidsCount) || 0
  const bookingsCount = resolveBookingCount(prop)
  const displayId = `OB-${prop.id}`

  const row = {
    id: prop.id,
    displayId,
    title: prop.title || prop.name || 'Без названия',
    location: prop.location || prop.address || 'Не указано',
    image: getPropertyCardImage(prop, FALLBACK_IMAGE),
    status,
    statusKey,
    filterKey,
    listingType,
    currency,
    priceAmount: finiteNumber(priceNum),
    viewsCount,
    views: formatViewsCount(viewsCount),
    likesCount,
    bidsCount,
    bidsAmountTotal,
    currentBidAmount: currentBidNum ?? 0,
    bookingsCount,
    viewsDelta: '',
    viewsUp: null,
    price: formatMoney(priceNum, currency),
    currentBid: currentBidNum != null ? formatMoney(currentBidNum, currency) : null,
    auctionEndTime: resolveAuctionEndTime(prop),
    date: prop.created_at
      ? new Date(prop.created_at).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '—',
    raw: prop,
  }

  row.analytics = buildOwnerPropertyAnalytics(row)
  return row
}

export async function fetchOwnerProperties(userId) {
  if (!userId) return []

  const response = await fetch(`${API_BASE_URL}/properties/user/${userId}`)
  if (!response.ok) {
    throw new Error('Не удалось загрузить объекты')
  }

  const result = await response.json()
  if (!result.success || !Array.isArray(result.data)) {
    return []
  }

  const rows = result.data.map(mapApiPropertyToOwnerListRow)
  setOwnerPropertiesLiveCache(rows)
  return rows
}

export function filterOwnerProperties(
  rows,
  { tab = 'all', query = '', listingTypes = [], sortBy = 'date_desc' } = {}
) {
  const q = String(query || '')
    .trim()
    .toLowerCase()

  const typeSet = Array.isArray(listingTypes) && listingTypes.length > 0 ? new Set(listingTypes) : null

  let result = rows.filter((row) => {
    if (tab !== 'all' && row.filterKey !== tab) return false
    if (typeSet && !typeSet.has(row.listingType)) return false
    if (!q) return true
    const haystack = [row.title, row.location, row.displayId, String(row.id)]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })

  const byViews = (row) => {
    const num = Number(String(row.views || '').replace(/\s/g, ''))
    return Number.isFinite(num) ? num : 0
  }
  const byPrice = (row) => {
    const num = Number(row.raw?.price)
    return Number.isFinite(num) ? num : 0
  }
  const byDate = (row) => {
    const ts = new Date(row.raw?.created_at || 0).getTime()
    return Number.isFinite(ts) ? ts : 0
  }

  result = [...result].sort((a, b) => {
    switch (sortBy) {
      case 'views_desc':
        return byViews(b) - byViews(a)
      case 'price_desc':
        return byPrice(b) - byPrice(a)
      case 'price_asc':
        return byPrice(a) - byPrice(b)
      case 'date_desc':
      default:
        return byDate(b) - byDate(a)
    }
  })

  return result
}

export function countOwnerPropertiesByTab(rows) {
  const counts = {
    all: rows.length,
    active: 0,
    booked: 0,
    sold: 0,
    draft: 0,
  }
  for (const row of rows) {
    if (counts[row.filterKey] != null) counts[row.filterKey] += 1
  }
  return counts
}

export function getOwnerPropertiesUserId() {
  return getStoredNumericUserId()
}

export { CLERK_DB_USER_SYNCED }
