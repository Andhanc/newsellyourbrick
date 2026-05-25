export const AUCTION_DEPOSIT_MIN_EUR = 3000

export function isAuctionDepositSufficient(depositAmount) {
  const n = parseFloat(depositAmount)
  return Number.isFinite(n) && n >= AUCTION_DEPOSIT_MIN_EUR
}

function parsePropertyDateMs(v) {
  if (v == null || v === '') return null
  const t = new Date(v).getTime()
  return Number.isNaN(t) ? null : t
}

export function isPropertyAuctionOpen(property) {
  if (!property || property.is_auction !== 1) return false
  if (
    property.buy_now_winner_user_id != null &&
    property.buy_now_completed_at != null &&
    String(property.buy_now_completed_at).trim() !== ''
  ) {
    return false
  }
  const now = Date.now()
  const endMs = parsePropertyDateMs(property.auction_end_date)
  if (endMs != null && endMs > now) return true
  const testEndMs = parsePropertyDateMs(property.test_timer_end_date)
  if (testEndMs != null && testEndMs > now) return true
  if (endMs == null && (property.auction_end_date == null || property.auction_end_date === '')) {
    return true
  }
  return false
}

async function findPropertyForBid(prisma, bid, schemaCache) {
  const pid = bid.property_id
  const table = bid.property_table || null

  const tryTable = async (model, enabled) => {
    if (!enabled || !model) return null
    try {
      return await model.findUnique({ where: { id: pid } })
    } catch (_) {
      return null
    }
  }

  if (table === 'properties_apartments') {
    return tryTable(prisma.properties_apartments, schemaCache.properties_apartments)
  }
  if (table === 'properties_houses') {
    return tryTable(prisma.properties_houses, schemaCache.properties_houses)
  }
  if (table === 'properties') {
    return tryTable(prisma.properties, schemaCache.properties)
  }

  const fromApartments = await tryTable(prisma.properties_apartments, schemaCache.properties_apartments)
  if (fromApartments) return fromApartments
  const fromHouses = await tryTable(prisma.properties_houses, schemaCache.properties_houses)
  if (fromHouses) return fromHouses
  return tryTable(prisma.properties, schemaCache.properties)
}

/** Есть ли у пользователя ставки на аукционах, которые ещё не завершены */
export async function userHasOpenAuctionParticipation(prisma, userId, schemaCache) {
  const bids = await prisma.bids.findMany({
    where: { user_id: Number(userId) },
    select: { property_id: true, property_table: true },
  })
  if (!bids.length) return false

  const seen = new Set()
  for (const bid of bids) {
    const key = `${bid.property_table || ''}:${bid.property_id}`
    if (seen.has(key)) continue
    seen.add(key)
    const property = await findPropertyForBid(prisma, bid, schemaCache)
    if (isPropertyAuctionOpen(property)) return true
  }
  return false
}
