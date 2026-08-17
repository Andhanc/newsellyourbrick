import { CLERK_DB_USER_SYNCED, getStoredNumericUserId } from '../services/authService'
import { getCurrencySymbol } from './currency'
import { getPropertyCardImage } from './propertyImage'
import { getPropertyListingKind } from './propertyListingKind'
import {
  buildOwnerPropertyAnalytics,
  setOwnerPropertiesLiveCache,
} from '../pages/ownerPropertiesTestData'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

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
    return {
      status: 'Продан',
      statusKey: 'sold',
      filterKey: 'sold',
      moderationKey: 'approved',
    }
  }

  const reservedUntil = property.reserved_until
  if (reservedUntil) {
    const until = new Date(reservedUntil).getTime()
    if (Number.isFinite(until) && until > Date.now()) {
      return {
        status: 'Забронирован',
        statusKey: 'booked',
        filterKey: 'booked',
        moderationKey: 'approved',
      }
    }
  }
  if (property.is_reserved === true || property.is_reserved === 1) {
    return {
      status: 'Забронирован',
      statusKey: 'booked',
      filterKey: 'booked',
      moderationKey: 'approved',
    }
  }

  const moderation = String(property.moderation_status || '').toLowerCase()
  if (moderation === 'approved' && property.has_pending_edit) {
    return {
      status: 'На модерации',
      statusKey: 'active',
      filterKey: 'active',
      moderationKey: 'pending',
    }
  }
  if (moderation === 'approved') {
    return {
      status: 'Одобрен',
      statusKey: 'active',
      filterKey: 'active',
      moderationKey: 'approved',
    }
  }
  if (moderation === 'rejected') {
    return {
      status: 'Отклонён',
      statusKey: 'draft',
      filterKey: 'draft',
      moderationKey: 'rejected',
    }
  }
  if (moderation === 'pending') {
    return {
      status: 'На модерации',
      statusKey: 'draft',
      filterKey: 'draft',
      moderationKey: 'pending',
    }
  }
  return {
    status: 'Черновик',
    statusKey: 'draft',
    filterKey: 'draft',
    moderationKey: 'draft',
  }
}

function resolveAuctionEndTime(property) {
  return (
    property.test_timer_end_date ||
    property.auction_end_date ||
    property.auction_end_at ||
    property.auctionEndAt ||
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

/** SQLite-style Prisma default leaked into Postgres as a literal string. */
function isBogusSqlNowLiteral(value) {
  if (value == null) return true
  const s = String(value).trim().toLowerCase()
  return !s || s === "datetime('now')" || s === 'datetime("now")' || s === 'current_timestamp'
}

function toEpochMs(value) {
  if (value == null || value === '') return 0
  if (isBogusSqlNowLiteral(value)) return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value > 0 ? value : 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) && ts > 0 ? ts : 0
}

export function getOwnerPropertyRecencyTs(row) {
  if (!row) return 0
  if (Number.isFinite(row.createdAtTs) && row.createdAtTs > 0) return row.createdAtTs
  const raw = row.raw || row
  // Только дата создания: updated_at меняется при правках и ломает «новизну добавления».
  return (
    toEpochMs(raw.created_at) ||
    toEpochMs(raw.createdAt) ||
    toEpochMs(row.createdAt) ||
    0
  )
}

export function sortOwnerPropertiesByNewest(rows) {
  return [...(rows || [])].sort((a, b) => {
    // В БД у многих объектов created_at = литерал datetime('now'), поэтому
    // надёжный порядок «только что добавил» — больший id (autoincrement).
    const idA = Number(a?.id) || 0
    const idB = Number(b?.id) || 0
    if (idB !== idA) return idB - idA
    const byDate = getOwnerPropertyRecencyTs(b) - getOwnerPropertyRecencyTs(a)
    if (byDate) return byDate
    return String(b?.rowKey || '').localeCompare(String(a?.rowKey || ''))
  })
}

export function mapApiPropertyToOwnerListRow(prop) {
  const listingType = mapListingType(prop)
  const { status, statusKey, filterKey, moderationKey } = resolveStatus(prop)
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
  const sourceTable =
    prop.source_table ||
    (prop.property_type === 'house' || prop.property_type === 'villa'
      ? 'properties_houses'
      : 'properties_apartments')
  const createdAtTs = toEpochMs(prop.created_at ?? prop.createdAt)
  const updatedAtTs = toEpochMs(prop.updated_at ?? prop.updatedAt)

  const row = {
    id: prop.id,
    rowKey: `${sourceTable}:${prop.id}`,
    displayId,
    title: prop.title || prop.name || 'Без названия',
    location: prop.location || prop.address || 'Не указано',
    image: getPropertyCardImage(prop, FALLBACK_IMAGE),
    status,
    statusKey,
    filterKey,
    moderationKey,
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
    createdAtTs,
    updatedAtTs,
    date: createdAtTs
      ? new Date(createdAtTs).toLocaleDateString('ru-RU', {
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

  const rows = sortOwnerPropertiesByNewest(result.data.map(mapApiPropertyToOwnerListRow))
  setOwnerPropertiesLiveCache(rows)
  return rows
}

const LISTING_TYPE_TAB_IDS = new Set(['auction', 'buy_now', 'shares', 'debts'])

export function filterOwnerProperties(
  rows,
  { tab = 'all', query = '', listingTypes = [], sortBy = 'date_desc' } = {}
) {
  const q = String(query || '')
    .trim()
    .toLowerCase()

  const typeSet = Array.isArray(listingTypes) && listingTypes.length > 0 ? new Set(listingTypes) : null

  let result = rows.filter((row) => {
    if (tab !== 'all') {
      if (LISTING_TYPE_TAB_IDS.has(tab)) {
        if (row.listingType !== tab) return false
      } else if (row.filterKey !== tab) {
        return false
      }
    }
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
    const num = Number(row.raw?.price ?? row.priceAmount)
    return Number.isFinite(num) ? num : 0
  }

  result = [...result].sort((a, b) => {
    switch (sortBy) {
      case 'views_desc': {
        const byV = byViews(b) - byViews(a)
        return byV || getOwnerPropertyRecencyTs(b) - getOwnerPropertyRecencyTs(a)
      }
      case 'price_desc': {
        const byP = byPrice(b) - byPrice(a)
        return byP || getOwnerPropertyRecencyTs(b) - getOwnerPropertyRecencyTs(a)
      }
      case 'price_asc': {
        const byP = byPrice(a) - byPrice(b)
        return byP || getOwnerPropertyRecencyTs(b) - getOwnerPropertyRecencyTs(a)
      }
      case 'date_desc':
      default:
        return (
          (Number(b?.id) || 0) - (Number(a?.id) || 0) ||
          getOwnerPropertyRecencyTs(b) - getOwnerPropertyRecencyTs(a) ||
          String(b?.rowKey || '').localeCompare(String(a?.rowKey || ''))
        )
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

export function countOwnerPropertiesByListingType(rows) {
  const counts = {
    all: rows.length,
    auction: 0,
    buy_now: 0,
    shares: 0,
    debts: 0,
  }
  for (const row of rows) {
    if (counts[row.listingType] != null) counts[row.listingType] += 1
  }
  return counts
}

export function getOwnerPropertiesUserId() {
  return getStoredNumericUserId()
}

export { CLERK_DB_USER_SYNCED }
