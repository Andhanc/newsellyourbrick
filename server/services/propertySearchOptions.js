import {
  buildLocationOptionsFromProperties,
  buildPriceRangeFromProperties,
} from '../../src/utils/propertySearchLocation.js'
import { getPropertyListingCurrency } from '../../src/utils/catalogPriceFilter.js'
import { getPrisma } from '../database/prismaClient.js'

function isAuctionRow(p) {
  return (
    p?.is_auction === 1 ||
    p?.is_auction === true ||
    p?.is_auction === '1' ||
    p?.is_auction === 'true'
  )
}

function engagementTableFromPropertyRow(p) {
  if (!p) return 'properties_apartments'
  const st = p.source_table
  if (st != null && String(st).trim() !== '') {
    const t = String(st).trim()
    if (t === 'apartments') return 'properties_apartments'
    if (t === 'houses') return 'properties_houses'
    return t
  }
  const pt = String(p.property_type || '').toLowerCase()
  if (pt === 'house' || pt === 'villa') return 'properties_houses'
  if (pt === 'apartment' || pt === 'commercial') return 'properties_apartments'
  return 'properties_apartments'
}

function buildBidWhereForProperty(propertyId, propertyTable) {
  const pid = Number(propertyId)
  const tbl = String(propertyTable || 'properties_apartments')
  if (tbl === 'properties_apartments') {
    return { property_id: pid, OR: [{ property_table: tbl }, { property_table: null }] }
  }
  return { property_id: pid, property_table: tbl }
}

/** Подставляет current_bid по максимальной ставке из БД (с property_table). */
export async function enrichAuctionsWithMaxBids(properties = []) {
  if (!Array.isArray(properties) || properties.length === 0) return properties

  const orWhere = []
  const seen = new Set()
  for (const p of properties) {
    if (!isAuctionRow(p)) continue
    const id = Number(p.id)
    if (!Number.isFinite(id)) continue
    const table = engagementTableFromPropertyRow(p)
    const sk = `${id}\0${table}`
    if (seen.has(sk)) continue
    seen.add(sk)
    orWhere.push(buildBidWhereForProperty(id, table))
  }
  if (orWhere.length === 0) return properties

  try {
    const prisma = getPrisma()
    const bids = await prisma.bids.findMany({
      where: { OR: orWhere },
      select: { property_id: true, property_table: true, bid_amount: true },
    })
    const maxByPair = new Map()
    for (const b of bids) {
      const amount = Number(b.bid_amount)
      if (!Number.isFinite(amount)) continue
      let tbl = b.property_table
      if (tbl == null || tbl === '') tbl = 'properties_apartments'
      const key = `${b.property_id}\0${tbl}`
      const prev = maxByPair.get(key)
      if (prev == null || amount > prev) maxByPair.set(key, amount)
    }

    return properties.map((p) => {
      if (!isAuctionRow(p)) return p
      const id = Number(p.id)
      const table = engagementTableFromPropertyRow(p)
      const maxBid = maxByPair.get(`${id}\0${table}`)
      if (maxBid == null || !Number.isFinite(maxBid) || maxBid <= 0) return p
      const existing = Number(p.current_bid ?? p.currentBid)
      const nextBid =
        Number.isFinite(existing) && existing > 0 ? Math.max(existing, maxBid) : maxBid
      return { ...p, current_bid: nextBid, currentBid: nextBid }
    })
  } catch {
    return properties
  }
}

function dedupePropertiesById(list = []) {
  const seen = new Set()
  const out = []
  for (const p of list) {
    if (p?.id == null) continue
    const uid = `${String(p.property_type || p.type || 'property')}:${p.id}`
    if (seen.has(uid)) continue
    seen.add(uid)
    out.push(p)
  }
  return out
}

function buildCurrenciesFromProperties(properties = []) {
  const counts = new Map()
  for (const property of properties) {
    const code = getPropertyListingCurrency(property)
    counts.set(code, (counts.get(code) || 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const currencies = sorted.map(([code]) => code)
  return {
    currencies,
    defaultCurrency: currencies[0] || 'EUR',
  }
}

export function buildPropertySearchOptions(properties = []) {
  const unique = dedupePropertiesById(properties)
  const { currencies, defaultCurrency } = buildCurrenciesFromProperties(unique)
  return {
    locations: buildLocationOptionsFromProperties(unique),
    priceRange: buildPriceRangeFromProperties(unique),
    currencies,
    defaultCurrency,
  }
}

export async function buildPropertySearchOptionsWithBids(properties = []) {
  const withBids = await enrichAuctionsWithMaxBids(properties)
  return buildPropertySearchOptions(withBids)
}
