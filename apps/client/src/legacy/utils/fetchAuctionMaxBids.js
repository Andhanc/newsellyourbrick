import { compositeBidAmountKey, resolvePropertySourceTable } from './propertySourceTable'

function asFiniteNumberOrNull(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Макс. ставки для списка лотов (карточки / главная / кэш аукциона).
 * @param {string} apiBaseUrl
 * @param {Array<{ id: number|string, source_table?: string, property_type?: string }>} properties
 * @returns {Promise<Map<string, number>>} ключ compositeBidAmountKey → max bid
 */
export async function fetchAuctionMaxBidsBatch(apiBaseUrl, properties) {
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
  if (items.length === 0) return new Map()

  const base = String(apiBaseUrl || '').replace(/\/$/, '')
  try {
    const response = await fetch(`${base}/bids/max-amounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!response.ok) return new Map()
    const payload = await response.json().catch(() => null)
    if (!payload?.success || payload.data == null || typeof payload.data !== 'object') {
      return new Map()
    }
    const m = new Map()
    for (const [k, v] of Object.entries(payload.data)) {
      const max = asFiniteNumberOrNull(v)
      if (max != null) m.set(String(k), max)
    }
    return m
  } catch {
    return new Map()
  }
}

export function getMaxBidForProperty(bidByKey, property) {
  if (!bidByKey || !property) return null
  const key = compositeBidAmountKey(property.id, resolvePropertySourceTable(property))
  return bidByKey.get(key) ?? null
}
