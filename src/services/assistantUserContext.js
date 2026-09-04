import { getApiBaseUrlSync } from '../utils/apiConfig.js'

const CONTEXT_CACHE_TTL_MS = 30_000
const contextCache = new Map()

function takeData(payload) {
  if (!payload || payload.success === false) return null
  return payload.data ?? payload
}

function asArray(payload) {
  const value = takeData(payload)
  return Array.isArray(value) ? value : []
}

function text(value, maxLength = 140) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function propertySummary(property = {}, overrides = {}) {
  return {
    id: number(overrides.id ?? property.id),
    propertyId: number(overrides.propertyId ?? property.property_id ?? property.id),
    title: text(overrides.title || property.title || property.name || property.property_title) || null,
    location: text(overrides.location || property.location || property.address || property.property_location) || null,
    status: text(overrides.status || property.status || property.moderation_status) || null,
    amount: number(overrides.amount ?? property.price ?? property.bid_amount ?? property.total_paid),
    currency: text(overrides.currency || property.currency || 'EUR', 8),
    sourceTable: text(
      overrides.sourceTable || property.source_table || property.property_table,
      48,
    ) || null,
  }
}

function findCatalogProperty(catalog, row) {
  const id = number(row?.property_id ?? row?.id)
  if (id == null) return null
  const table = text(row?.property_table || row?.source_table, 48)
  return (Array.isArray(catalog) ? catalog : []).find((item) => {
    if (number(item?.id) !== id) return false
    if (!table) return true
    return text(item?.source_table || item?.property_table, 48) === table
  }) || (Array.isArray(catalog) ? catalog : []).find((item) => number(item?.id) === id) || null
}

function summarizeFavorites(rows, catalog) {
  const items = rows.slice(0, 12).map((row) => {
    const property = findCatalogProperty(catalog, row) || {}
    return propertySummary(property, {
      propertyId: row.property_id,
      title: property.title || property.name || `Объект #${row.property_id}`,
      sourceTable: row.property_table,
    })
  })
  return { count: rows.length, items }
}

function summarizeBookings(rows) {
  return {
    count: rows.length,
    items: rows.slice(0, 12).map((row) => ({
      ...propertySummary(row, {
        propertyId: row.property_id,
        title: row.property_title || row.title || row.property?.title || `Объект #${row.property_id}`,
        status: row.status || row.booking_status,
      }),
      startDate: row.start_date || row.check_in || row.date_from || null,
      endDate: row.end_date || row.check_out || row.date_to || null,
    })),
  }
}

function summarizeRows(rows, mapper = (row) => propertySummary(row)) {
  return { count: rows.length, items: rows.slice(0, 12).map(mapper) }
}

export function buildAssistantUserContext({ identity = {}, payloads = {}, catalog = [] } = {}) {
  const dbProfile = takeData(payloads.profile) || {}
  const favorites = asArray(payloads.favorites)
  const ownedProperties = asArray(payloads.ownedProperties)
  const bids = asArray(payloads.bids)
  const auctionWins = asArray(payloads.auctionWins)
  const reservations = asArray(payloads.reservations)
  const sharePurchases = asArray(payloads.sharePurchases)
  const bookings = asArray(payloads.bookings)
  const billing = takeData(payloads.subscription) || {}
  const subscription = billing.subscription || {}
  const vipClub = billing.vipClub || {}
  const wallet = takeData(payloads.wallet) || {}
  const firstName = text(dbProfile.first_name || dbProfile.firstName || identity.firstName, 60)
  const lastName = text(dbProfile.last_name || dbProfile.lastName || identity.lastName, 60)

  return {
    authenticated: true,
    profile: {
      firstName: firstName || null,
      lastName: lastName || null,
      displayName: text(identity.displayName || [firstName, lastName].filter(Boolean).join(' '), 120) || null,
      country: text(dbProfile.country || identity.country, 80) || null,
      city: text(dbProfile.city || identity.city, 80) || null,
      role: text(dbProfile.role || identity.role, 20).toLowerCase() || null,
      verified: dbProfile.is_verified == null
        ? typeof identity.verified === 'boolean' ? identity.verified : null
        : Boolean(Number(dbProfile.is_verified) || dbProfile.is_verified === true),
    },
    favorites: summarizeFavorites(favorites, catalog),
    ownedProperties: summarizeRows(ownedProperties),
    bids: summarizeRows(bids, (row) => propertySummary(row, {
      propertyId: row.property_id,
      title: row.title || row.property?.title || `Объект #${row.property_id}`,
      status: row.status || (row.auction_end_date ? 'auction' : null),
      amount: row.bid_amount,
    })),
    auctionWins: summarizeRows(auctionWins, (row) => propertySummary(row.property || row, {
      id: row.id,
      propertyId: row.property_id,
      title: row.property?.title || row.title || `Объект #${row.property_id}`,
      status: row.status || 'won',
      amount: row.winning_bid_amount,
      currency: row.currency || row.property?.currency,
      sourceTable: row.property_table,
    })),
    reservations: summarizeRows(reservations, (row) => propertySummary(row.property || row, {
      id: row.id,
      propertyId: row.property_id || row.billing?.property_id,
      title: row.property_title || row.title || row.property?.title || `Объект #${row.property_id || row.billing?.property_id}`,
      status: row.status || row.payment_status || 'reserved',
      amount: row.reserve_amount ?? row.amount_paid ?? row.paid_amount,
      sourceTable: row.property_table || row.billing?.property_table,
    })),
    sharePurchases: summarizeRows(sharePurchases, (row) => propertySummary(row, {
      propertyId: row.property_id,
      title: row.property_title || `Объект #${row.property_id}`,
      status: row.status || 'purchased',
      amount: row.total_paid,
    })),
    bookings: summarizeBookings(bookings),
    subscription: {
      plan: text(subscription.plan_key || subscription.plan || (vipClub.active ? 'vip' : 'starter'), 24),
      status: text(subscription.status, 32) || null,
      vipActive: Boolean(vipClub.active || String(subscription.plan_key || '').toLowerCase() === 'vip'),
    },
    wallet: {
      depositAmount: number(wallet.depositAmount ?? wallet.deposit_amount ?? wallet.balance),
      currency: text(wallet.currency || 'EUR', 8),
    },
  }
}

async function fetchPayload(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export function invalidateAssistantUserContext(userId = null) {
  if (userId == null) contextCache.clear()
  else contextCache.delete(String(userId))
}

export async function loadAssistantUserContext({ userId, identity = {}, catalog = [], force = false } = {}) {
  const normalizedUserId = String(userId || '').trim()
  if (!/^\d+$/.test(normalizedUserId)) return { authenticated: false }
  const cached = contextCache.get(normalizedUserId)
  if (!force && cached?.data && Date.now() - cached.ts < CONTEXT_CACHE_TTL_MS) return cached.data
  if (!force && cached?.promise) return cached.promise

  const base = getApiBaseUrlSync()
  const encodedId = encodeURIComponent(normalizedUserId)
  const request = (async () => {
    const [profile, favorites, ownedProperties, bids, auctionWins, reservations, sharePurchases, bookings, subscription, wallet] = await Promise.all([
      fetchPayload(`${base}/users/${encodedId}`),
      fetchPayload(`${base}/users/${encodedId}/favorites`),
      fetchPayload(`${base}/properties/user/${encodedId}`),
      fetchPayload(`${base}/bids/user/${encodedId}`),
      fetchPayload(`${base}/auction-winners/user/${encodedId}`),
      fetchPayload(`${base}/users/${encodedId}/reservation-purchases`),
      fetchPayload(`${base}/users/${encodedId}/share-purchases`),
      fetchPayload(`${base}/test-drive-bookings/user/${encodedId}`),
      fetchPayload(`${base}/users/${encodedId}/subscription-billing`),
      fetchPayload(`${base}/users/${encodedId}/deposit`),
    ])
    return buildAssistantUserContext({
      identity,
      catalog,
      payloads: { profile, favorites, ownedProperties, bids, auctionWins, reservations, sharePurchases, bookings, subscription, wallet },
    })
  })()

  contextCache.set(normalizedUserId, { ts: Date.now(), promise: request, data: cached?.data || null })
  const data = await request
  contextCache.set(normalizedUserId, { ts: Date.now(), promise: null, data })
  return data
}
