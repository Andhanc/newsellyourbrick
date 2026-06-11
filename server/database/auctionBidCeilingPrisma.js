import { getAuctionMinBidStep } from '../../src/utils/auctionBidStep.js'

function normalizeTable(propertyTable) {
  const t = String(propertyTable || 'properties_apartments').trim()
  if (t === 'apartments') return 'properties_apartments'
  if (t === 'houses') return 'properties_houses'
  return t || 'properties_apartments'
}

function buildWhere(propertyId, propertyTable) {
  const pid = Number(propertyId)
  const tbl = normalizeTable(propertyTable)
  if (tbl === 'properties_apartments') {
    return { property_id: pid, OR: [{ property_table: tbl }, { property_table: null }] }
  }
  return { property_id: pid, property_table: tbl }
}

async function getCurrentMaxBid(prisma, propertyId, propertyTable, basePrice = 0) {
  const bidWhere = buildWhere(propertyId, propertyTable)
  const maxBid = await prisma.bids.aggregate({
    where: bidWhere,
    _max: { bid_amount: true },
  })
  const fromDb = maxBid?._max?.bid_amount
  if (fromDb != null && Number.isFinite(Number(fromDb))) {
    return Math.max(Number(basePrice) || 0, Number(fromDb))
  }
  return Number(basePrice) || 0
}

async function getCurrentLeaderUserId(prisma, propertyId, propertyTable) {
  const bidWhere = buildWhere(propertyId, propertyTable)
  const top = await prisma.bids.findFirst({
    where: bidWhere,
    orderBy: [{ bid_amount: 'desc' }, { created_at: 'desc' }],
    select: { user_id: true },
  })
  return top?.user_id ?? null
}

async function getUserMaxBid(prisma, userId, propertyId, propertyTable) {
  const uid = Number(userId)
  if (!Number.isFinite(uid)) return 0
  const bidWhere = { ...buildWhere(propertyId, propertyTable), user_id: uid }
  const agg = await prisma.bids.aggregate({
    where: bidWhere,
    _max: { bid_amount: true },
  })
  const max = agg?._max?.bid_amount
  return max != null && Number.isFinite(Number(max)) ? Number(max) : 0
}

function shouldActivateCeiling() {
  return true
}

const AUTO_BID_DELAY_MS = 5000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getBidCeiling(prisma, { userId, propertyId, propertyTable }) {
  const uid = Number(userId)
  const pid = Number(propertyId)
  const tbl = normalizeTable(propertyTable)
  if (!Number.isFinite(uid) || !Number.isFinite(pid)) return null

  return prisma.auction_bid_ceilings.findUnique({
    where: {
      user_id_property_id_property_table: {
        user_id: uid,
        property_id: pid,
        property_table: tbl,
      },
    },
  })
}

export async function upsertBidCeiling(
  prisma,
  { userId, propertyId, propertyTable, maxAmount, currentMaxBid, basePrice },
) {
  const uid = Number(userId)
  const pid = Number(propertyId)
  const tbl = normalizeTable(propertyTable)
  const max = Number(maxAmount)

  if (!Number.isFinite(uid) || uid <= 0) throw new Error('INVALID_USER')
  if (!Number.isFinite(pid) || pid <= 0) throw new Error('INVALID_PROPERTY')
  if (!Number.isFinite(max) || max <= 0) throw new Error('INVALID_MAX_AMOUNT')

  const effectiveCurrent =
    currentMaxBid != null && Number.isFinite(Number(currentMaxBid))
      ? Number(currentMaxBid)
      : await getCurrentMaxBid(prisma, pid, tbl, basePrice)
  const step = getAuctionMinBidStep(effectiveCurrent)
  const minimumCeiling = effectiveCurrent + step

  if (max < minimumCeiling) {
    const err = new Error('MAX_BELOW_MINIMUM')
    err.minimum = minimumCeiling
    err.step = step
    throw err
  }

  const now = new Date()
  return prisma.auction_bid_ceilings.upsert({
    where: {
      user_id_property_id_property_table: {
        user_id: uid,
        property_id: pid,
        property_table: tbl,
      },
    },
    create: {
      user_id: uid,
      property_id: pid,
      property_table: tbl,
      max_amount: max,
      is_active: 1,
      updated_at: now,
    },
    update: {
      max_amount: max,
      is_active: 1,
      updated_at: now,
    },
  })
}

export async function deactivateBidCeiling(prisma, { userId, propertyId, propertyTable }) {
  const uid = Number(userId)
  const pid = Number(propertyId)
  const tbl = normalizeTable(propertyTable)
  if (!Number.isFinite(uid) || !Number.isFinite(pid)) return null

  try {
    return await prisma.auction_bid_ceilings.update({
      where: {
        user_id_property_id_property_table: {
          user_id: uid,
          property_id: pid,
          property_table: tbl,
        },
      },
      data: { is_active: 0, updated_at: new Date() },
    })
  } catch {
    return null
  }
}

/**
 * Авто-ставки по потолкам.
 * - activateUserIds: при сохранении потолка — сразу ставка currentMax + step (даже если уже лидер).
 * - иначе: перебивает соперников минимальным шагом, пока есть активные потолки.
 */
export async function evaluateBidCeilings(
  prisma,
  {
    propertyId,
    propertyTable,
    property,
    basePrice = 0,
    onAutoBidPlaced,
    activateUserIds = null,
  },
) {
  const pid = Number(propertyId)
  const tbl = normalizeTable(propertyTable)
  if (!Number.isFinite(pid)) return []

  const ceilings = await prisma.auction_bid_ceilings.findMany({
    where: {
      property_id: pid,
      property_table: tbl,
      is_active: 1,
    },
    orderBy: { max_amount: 'desc' },
  })

  if (!ceilings.length) return []

  const activateSet = activateUserIds
    ? new Set(
        (Array.isArray(activateUserIds) ? activateUserIds : [activateUserIds])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      )
    : new Set()

  const placed = []
  const userMaxBidCache = new Map()

  async function getUserMaxBidCached(uid) {
    if (!userMaxBidCache.has(uid)) {
      userMaxBidCache.set(uid, await getUserMaxBid(prisma, uid, pid, tbl))
    }
    return userMaxBidCache.get(uid)
  }

  let keepGoing = true
  while (keepGoing) {
    keepGoing = false

    let currentMax = await getCurrentMaxBid(prisma, pid, tbl, basePrice)
    let leaderId = await getCurrentLeaderUserId(prisma, pid, tbl)

    for (const ceiling of ceilings) {
      const uid = ceiling.user_id
      const ceilingMax = Number(ceiling.max_amount)
      if (!Number.isFinite(ceilingMax) || ceilingMax <= 0) continue
      if (currentMax >= ceilingMax) continue
      if (!shouldActivateCeiling()) continue

      const step = getAuctionMinBidStep(currentMax)
      const bidAmount = Math.min(currentMax + step, ceilingMax)
      if (bidAmount <= currentMax) continue

      const forceActivate = activateSet.has(uid)
      const userMaxBid = await getUserMaxBidCached(uid)

      if (forceActivate) {
        // Сразу после сохранения потолка: ставка с минимальным шагом, если ещё не на этом уровне.
        if (userMaxBid >= bidAmount) {
          activateSet.delete(uid)
          continue
        }
      } else if (uid === leaderId) {
        // Уже лидирует — не повышаем без перебития соперником.
        continue
      }

      // Пауза перед авто-ставкой: при перебивании и между цепочкой авто-ставок.
      if (placed.length > 0 || !forceActivate) {
        await sleep(AUTO_BID_DELAY_MS)
      }

      const created = await prisma.bids.create({
        data: {
          user_id: uid,
          property_id: pid,
          property_table: tbl,
          bid_amount: bidAmount,
        },
      })

      await prisma.auction_bid_ceilings.update({
        where: { id: ceiling.id },
        data: {
          activated_at: ceiling.activated_at ?? new Date(),
          updated_at: new Date(),
        },
      })

      userMaxBidCache.set(uid, bidAmount)
      activateSet.delete(uid)
      currentMax = bidAmount
      leaderId = uid
      keepGoing = true
      placed.push({ bidId: created.id, userId: uid, bidAmount })

      if (typeof onAutoBidPlaced === 'function') {
        await onAutoBidPlaced({ userId: uid, bidAmount, currentMax })
      }
    }
  }

  return placed
}
