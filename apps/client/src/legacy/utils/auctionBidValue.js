import { compositeBidAmountKey, resolvePropertySourceTable } from './propertySourceTable'

const BID_OVERRIDES_STORAGE_KEY = 'syb_auction_bid_overrides_v1'

function asFiniteNumberOrNull(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const bidOverrides = new Map()
let bidOverridesLoaded = false

function ensureBidOverridesLoaded() {
  if (bidOverridesLoaded) return
  bidOverridesLoaded = true
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    const raw = window.sessionStorage.getItem(BID_OVERRIDES_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return
    Object.entries(parsed).forEach(([k, v]) => {
      const id = Number(k)
      const bid = asFiniteNumberOrNull(v)
      if (Number.isFinite(id) && bid != null) {
        bidOverrides.set(id, bid)
      }
    })
  } catch {
    /* ignore */
  }
}

function persistBidOverrides() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    const payload = {}
    bidOverrides.forEach((v, k) => {
      payload[String(k)] = v
    })
    window.sessionStorage.setItem(BID_OVERRIDES_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

function getBidOverrideForProperty(prop) {
  ensureBidOverridesLoaded()
  const key = compositeBidAmountKey(prop?.id, resolvePropertySourceTable(prop))
  const value = bidOverrides.get(key)
  return value != null ? value : null
}

/** Лёгкий резолв текущей ставки для карточек — без импорта всего auctionListCache. */
export function resolveAuctionCurrentBidValue(prop) {
  if (!prop) return 0
  const candidates = [
    asFiniteNumberOrNull(prop.currentBid),
    asFiniteNumberOrNull(prop.current_bid),
    asFiniteNumberOrNull(prop.max_bid),
    asFiniteNumberOrNull(prop.highest_bid),
    asFiniteNumberOrNull(prop.auction_current_bid),
    asFiniteNumberOrNull(prop.auction_starting_price),
    getBidOverrideForProperty(prop),
  ].filter((v) => v != null)
  if (candidates.length === 0) return 0
  return Math.max(...candidates)
}

export function setAuctionBidOverride(propertyOrId, bidAmount, sourceTable) {
  ensureBidOverridesLoaded()
  const id = typeof propertyOrId === 'object' ? Number(propertyOrId?.id) : Number(propertyOrId)
  const table =
    typeof propertyOrId === 'object'
      ? resolvePropertySourceTable(propertyOrId)
      : resolvePropertySourceTable({ source_table: sourceTable })
  const key = compositeBidAmountKey(id, table)
  const bid = asFiniteNumberOrNull(bidAmount)
  if (!Number.isFinite(id) || bid == null) return false
  const prev = bidOverrides.get(key)
  const next = prev == null ? bid : Math.max(prev, bid)
  bidOverrides.set(key, next)
  persistBidOverrides()
  return true
}
