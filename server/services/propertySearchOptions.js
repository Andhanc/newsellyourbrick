import {
  buildLocationOptionsFromProperties,
  buildPriceRangeFromProperties,
} from '../../src/utils/propertySearchLocation.js'
import { getPrisma } from '../database/prismaClient.js'

function isAuctionRow(p) {
  return (
    p?.is_auction === 1 ||
    p?.is_auction === true ||
    p?.is_auction === '1' ||
    p?.is_auction === 'true'
  )
}

/** Подставляет current_bid по максимальной ставке из БД */
export async function enrichAuctionsWithMaxBids(properties = []) {
  const auctionIds = properties
    .filter(isAuctionRow)
    .map((p) => Number(p.id))
    .filter((id) => Number.isFinite(id))

  if (!auctionIds.length) return properties

  try {
    const prisma = getPrisma()
    const bidGroups = await prisma.bids.groupBy({
      by: ['property_id'],
      where: { property_id: { in: auctionIds } },
      _max: { bid_amount: true },
    })
    const maxBidByPropertyId = new Map(
      bidGroups.map((g) => [
        g.property_id,
        g._max.bid_amount != null ? Number(g._max.bid_amount) : null,
      ])
    )

    return properties.map((p) => {
      if (!isAuctionRow(p)) return p
      const maxBid = maxBidByPropertyId.get(Number(p.id))
      if (maxBid == null || !Number.isFinite(maxBid) || maxBid <= 0) return p
      const existing = Number(p.current_bid ?? p.currentBid)
      const nextBid = Number.isFinite(existing) && existing > 0 ? Math.max(existing, maxBid) : maxBid
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

export function buildPropertySearchOptions(properties = []) {
  const unique = dedupePropertiesById(properties)
  return {
    locations: buildLocationOptionsFromProperties(unique),
    priceRange: buildPriceRangeFromProperties(unique),
  }
}

export async function buildPropertySearchOptionsWithBids(properties = []) {
  const withBids = await enrichAuctionsWithMaxBids(properties)
  return buildPropertySearchOptions(withBids)
}
