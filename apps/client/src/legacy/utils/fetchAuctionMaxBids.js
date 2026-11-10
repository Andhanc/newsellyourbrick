import { compositeBidAmountKey, resolvePropertySourceTable, propertyBidsApiQuery } from './propertySourceTable.js'

function asFiniteNumberOrNull(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const maxBidsInflight = new Map()

/**
 * Макс. ставки для списка лотов (карточки / главная / кэш аукциона).
 * @param {string} apiBaseUrl
 * @param {Array<{ id: number|string, source_table?: string, property_type?: string }>} properties
 * @returns {Promise<Map<string, number>>} ключ compositeBidAmountKey → max bid
 */
export async function fetchAuctionMaxBidsBatch(apiBaseUrl, properties) {
  return (await fetchAuctionMaxBidsBatchResult(apiBaseUrl, properties)).bids
}

/** An empty successful batch is different from an unavailable endpoint. */
export async function fetchAuctionMaxBidsBatchResult(apiBaseUrl, properties) {
  const items = []
  const seen = new Set()
  for (const p of properties || []) {
    const id = Number(p?.id)
    if (!Number.isFinite(id)) continue
    const table = resolvePropertySourceTable(p)
    const key = compositeBidAmountKey(id, table)
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ id, property_table: table })
  }
  if (items.length === 0) return { ok: true, bids: new Map() }

  const base = String(apiBaseUrl || '').replace(/\/$/, '')
  const inflightKey = base + JSON.stringify(items)
  const existing = maxBidsInflight.get(inflightKey)
  if (existing) return existing

  const promise = (async () => {
  try {
    const response = await fetch(`${base}/bids/max-amounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!response.ok) return { ok: false, bids: new Map() }
    const payload = await response.json().catch(() => null)
    if (!payload?.success || payload.data == null || typeof payload.data !== 'object') {
      return { ok: false, bids: new Map() }
    }
    const m = new Map()
    for (const [k, v] of Object.entries(payload.data)) {
      const max = asFiniteNumberOrNull(v)
      if (max != null) m.set(String(k), max)
    }
    return { ok: true, bids: m }
  } catch {
    return { ok: false, bids: new Map() }
  }
  })()

  maxBidsInflight.set(inflightKey, promise)
  try {
    return await promise
  } finally {
    queueMicrotask(() => {
      if (maxBidsInflight.get(inflightKey) === promise) maxBidsInflight.delete(inflightKey)
    })
  }
}

export function getMaxBidForProperty(bidByKey, property) {
  if (!bidByKey || !property) return null
  const key = compositeBidAmountKey(property.id, resolvePropertySourceTable(property))
  return bidByKey.get(key) ?? null
}

/** /auctions already supplies the current bid. Keep fallback requests for older responses. */
export function hasResolvedListingBid(property) {
  const value = property?.current_bid
  return value != null && value !== '' && Number.isFinite(Number(value))
}

/** Preserve the legacy endpoint fallback, with at most four parallel requests. */
export async function fetchAuctionMaxBidsWithFallback(apiBaseUrl, properties) {
  const batch = await fetchAuctionMaxBidsBatchResult(apiBaseUrl, properties)
  if (batch.ok) return batch.bids
  const bids = new Map()
  const base = String(apiBaseUrl || '').replace(/\/$/, '')
  for (let offset = 0; offset < properties.length; offset += 4) {
    await Promise.all(properties.slice(offset, offset + 4).map(async property => {
      const id = Number(property.id)
      if (!Number.isFinite(id)) return
      const table = resolvePropertySourceTable(property)
      try {
        const response = await fetch(`${base}/bids/property/${id}?${propertyBidsApiQuery(id, table)}`)
        if (!response.ok) return
        const payload = await response.json()
        if (!payload?.success || !Array.isArray(payload.data)) return
        const values = payload.data.map(row => asFiniteNumberOrNull(row.bid_amount)).filter(value => value != null)
        if (values.length) bids.set(compositeBidAmountKey(id, table), Math.max(...values))
      } catch { /* A failed fallback must not block the catalogue. */ }
    }))
  }
  return bids
}
