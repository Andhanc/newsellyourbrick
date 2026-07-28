const BLOCKED = Object.freeze({ blocksPurchase: true, blocksBid: true })
const ACTIONABLE = Object.freeze({ blocksPurchase: false, blocksBid: false })

const STATES = Object.freeze({
  available: Object.freeze({
    state: 'available',
    label: 'Доступен',
    tone: 'available',
    ...ACTIONABLE,
  }),
  'auction-live': Object.freeze({
    state: 'auction-live',
    label: 'Аукцион идёт',
    tone: 'auction-live',
    ...ACTIONABLE,
  }),
  reserved: Object.freeze({
    state: 'reserved',
    label: 'Объект забронирован',
    tone: 'reserved',
    ...BLOCKED,
  }),
  sold: Object.freeze({
    state: 'sold',
    label: 'Объект продан',
    tone: 'sold',
    ...BLOCKED,
  }),
  'auction-ended': Object.freeze({
    state: 'auction-ended',
    label: 'Аукцион завершён',
    tone: 'auction-ended',
    ...BLOCKED,
  }),
  unavailable: Object.freeze({
    state: 'unavailable',
    label: 'Объект недоступен',
    tone: 'unavailable',
    ...BLOCKED,
  }),
})

function truthy(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function parseTime(value) {
  if (value == null || value === '') return null
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function isAuction(property) {
  return Boolean(
    truthy(property.isAuction) ||
      truthy(property.is_auction) ||
      String(property.sale_type || '').toLowerCase() === 'auction' ||
      property.auction_end_date ||
      property.auction_end_time ||
      property.endTime ||
      property.test_timer_end_date,
  )
}

function isSold(property) {
  const status = String(property.status || property.status_key || '').toLowerCase()
  return Boolean(
    status === 'sold' ||
      truthy(property.is_sold) ||
      property.sold_at ||
      truthy(property.buy_now_purchase_completed) ||
      (property.buy_now_winner_user_id != null &&
        property.buy_now_completed_at != null &&
        String(property.buy_now_completed_at).trim() !== ''),
  )
}

function isAuctionEnded(property, nowMs) {
  if (!isAuction(property)) return false
  const status = String(property.auction_status || property.status || '').toLowerCase()
  if (['ended', 'closed', 'completed', 'auction_ended'].includes(status)) return true
  const endTime =
    parseTime(property.test_timer_end_date) ??
    parseTime(property.auction_end_time) ??
    parseTime(property.auction_end_date) ??
    parseTime(property.endTime) ??
    parseTime(property.end_date)
  return endTime != null && endTime <= nowMs
}

function isReserved(property, nowMs) {
  if (!truthy(property.is_reserved) && !truthy(property.isReserved)) return false
  const until = parseTime(property.reserved_until ?? property.reservedUntil)
  return until == null || until > nowMs
}

function isUnavailable(property) {
  const status = String(property.status || property.status_key || '').toLowerCase()
  return (
    ['archived', 'inactive', 'disabled', 'hidden', 'rejected', 'unavailable'].includes(status) ||
    property.is_active === false ||
    property.is_active === 0 ||
    property.is_active === '0'
  )
}

export function resolveBuyerListingState(property, now = new Date()) {
  if (!property || typeof property !== 'object') return { ...STATES.unavailable }
  const nowMs = parseTime(now) ?? Date.now()

  if (isSold(property)) return { ...STATES.sold }
  if (isAuctionEnded(property, nowMs)) return { ...STATES['auction-ended'] }
  if (isReserved(property, nowMs)) return { ...STATES.reserved }
  if (isUnavailable(property)) return { ...STATES.unavailable }
  if (isAuction(property)) return { ...STATES['auction-live'] }
  return { ...STATES.available }
}

export { STATES as BUYER_LISTING_STATES }
