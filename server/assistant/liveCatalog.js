/**
 * Живой каталог сайта: все одобренные лоты, аукционы, доли и долги из БД.
 */

import { isDebtListing, isShareListing, slimProperty } from './propertyMatcher.js'

const CACHE_MS = 20_000
let cache = { at: 0, items: [] }

function truthy(value) {
  return value === true || value === 1 || value === '1'
}

export function isAssistantCatalogListing(item) {
  if (!item || item.id == null) return false
  const status = String(item.status || item.status_key || item.sale_status || '').toLowerCase()
  const sold =
    ['sold', 'completed', 'purchased', 'closed'].includes(status) ||
    truthy(item.is_sold) ||
    Boolean(item.sold_at) ||
    truthy(item.buy_now_purchase_completed) ||
    (item.buy_now_winner_user_id != null && Boolean(String(item.buy_now_completed_at || '').trim()))
  if (sold) return false

  const totalShares = Number(item.total_shares ?? item.totalShares)
  const sharesSold = Number(item.shares_sold ?? item.sharesSold)
  if (totalShares > 0 && sharesSold >= totalShares) return false

  if (truthy(item.private_club_only)) return false
  if (['archived', 'inactive', 'disabled', 'hidden', 'rejected', 'unavailable'].includes(status)) return false
  if (item.is_active === false || item.is_active === 0 || item.is_active === '0') return false
  return true
}

function listingKey(item) {
  if (!item || item.id == null) return ''
  const kind = isShareListing(item) ? 'share' : isDebtListing(item) ? 'debt' : item.isAuction ? 'auction' : 'lot'
  return `${item.id}:${kind}:${item.location || ''}`
}

function mergeLists(...lists) {
  const seen = new Set()
  const out = []
  for (const list of lists) {
    for (const raw of list || []) {
      if (!isAssistantCatalogListing(raw)) continue
      const item = slimProperty(raw)
      if (!item) continue
      const key = listingKey(item)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

export async function loadLiveCatalog() {
  if (cache.items.length && Date.now() - cache.at < CACHE_MS) {
    return cache.items
  }

  const { propertyQueries } = await import('../database/database.js')
  const loadList = async (label, fn) => {
    try {
      return await fn()
    } catch (error) {
      console.warn(`[assistant] live catalog ${label}:`, error?.message || error)
      return []
    }
  }
  const [approved, auctions, shares, debts] = await Promise.all([
    loadList('approved', () => propertyQueries.getApproved()),
    loadList('auctions', () => propertyQueries.getAuctions()),
    loadList('shares', () => propertyQueries.getShares(200, 0)),
    loadList('debts', () => propertyQueries.getDebts()),
  ])

  const items = mergeLists(approved, auctions, shares, debts)
  if (items.length) {
    cache = { at: Date.now(), items }
  }
  return items
}

export function mergeClientCatalog(liveItems, clientItems) {
  return mergeLists(liveItems, clientItems)
}

/** Живой каталог сайта — источник правды. Клиентский список только если БД пустая. */
export function resolveAssistantCatalog(liveItems, clientItems) {
  const live = mergeLists(liveItems)
  if (live.length) return live
  return mergeLists(clientItems)
}
