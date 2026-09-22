import { getPrisma } from './database/prismaClient.js'
import {
  assistantLeadQueries,
  liveChatQueries,
  propertyQueries,
  testDriveBookingQueries,
  whatsappUserQueries,
} from './database/database.js'

function toNumber(value, fallback = 0) {
  if (typeof value === 'bigint') return Number(value)
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function isoOrNull(value) {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

function isTimerActive(endRaw) {
  if (endRaw == null || endRaw === '') return false
  const t = Date.parse(endRaw)
  return Number.isFinite(t) && t > Date.now()
}

function isAuctionLive(prop) {
  if (!prop) return false
  const end = prop.test_timer_end_date || prop.auction_end_date || prop.endTime
  return isTimerActive(end)
}

function pendingVerificationUsersCount(docs) {
  const ids = new Set()
  for (const doc of docs || []) {
    if (doc?.user_id != null) ids.add(doc.user_id)
  }
  return ids.size
}

/**
 * Один ответ для бейджей сайдбара админки вместо 12 тяжёлых list-эндпоинтов.
 */
export async function loadAdminSidebarBadgePayload() {
  const prisma = getPrisma()
  await testDriveBookingQueries.ensureTable()

  const [
    testDriveRows,
    testDriveCountRows,
    pendingDocs,
    pendingApt,
    pendingHouse,
    chatCount,
    purchaseRows,
    bonusesCount,
    assistantLeads,
    auctions,
    timerApt,
    timerHouse,
    newStage,
    whatsappUsers,
  ] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT property_id, property_table, cancelled_at, created_at
      FROM test_drive_bookings
      WHERE LOWER(TRIM(COALESCE(status, ''))) = 'cancelled'
      ORDER BY id DESC
      LIMIT 5000
    `),
    prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS c
      FROM test_drive_bookings
      WHERE LOWER(TRIM(COALESCE(status, ''))) = 'cancelled'
    `),
    prisma.documents.findMany({
      where: { verification_status: 'pending' },
      select: { user_id: true },
    }),
    prisma.properties_apartments.count({
      where: { OR: [{ moderation_status: 'pending' }, { moderation_status: null }] },
    }),
    prisma.properties_houses.count({
      where: { OR: [{ moderation_status: 'pending' }, { moderation_status: null }] },
    }),
    liveChatQueries.countUnreadUserMessages(),
    prisma.purchase_requests.findMany({
      where: { status: { in: ['pending', 'processing'] } },
      select: { status: true, created_at: true, updated_at: true },
      orderBy: { id: 'desc' },
      take: 1000,
    }),
    prisma.bonus_task_submissions.count({ where: { status: 'pending' } }),
    assistantLeadQueries.getAll(),
    propertyQueries.getAuctions(),
    prisma.properties_apartments.findMany({
      where: { AND: [{ test_timer_end_date: { not: null } }, { NOT: { test_timer_end_date: '' } }] },
      select: { test_timer_end_date: true },
    }),
    prisma.properties_houses.findMany({
      where: { AND: [{ test_timer_end_date: { not: null } }, { NOT: { test_timer_end_date: '' } }] },
      select: { test_timer_end_date: true },
    }),
    prisma.crm_stages.findFirst({ where: { slug: 'new' }, select: { id: true } }),
    whatsappUserQueries.getAll(500, 0),
  ])

  const testDriveCancellations = (Array.isArray(testDriveRows) ? testDriveRows : []).map((row) => ({
    property_id: row.property_id,
    property_table: row.property_table,
    cancelled_at: isoOrNull(row.cancelled_at),
    created_at: isoOrNull(row.created_at),
  }))
  const rawCancelled = Array.isArray(testDriveCountRows) && testDriveCountRows[0] != null
    ? testDriveCountRows[0].c
    : testDriveCancellations.length
  const testDriveTotalCancelled = toNumber(rawCancelled, testDriveCancellations.length)

  const pendingUsersN = pendingVerificationUsersCount(pendingDocs)
  const pendingPropsN = toNumber(pendingApt) + toNumber(pendingHouse)
  const usersN = Array.isArray(pendingDocs) ? pendingDocs.length : 0

  const purchaseRequests = (Array.isArray(purchaseRows) ? purchaseRows : []).map((row) => ({
    status: row.status,
    created_at: isoOrNull(row.created_at),
    updated_at: isoOrNull(row.updated_at),
  }))

  const smartAssistant = (Array.isArray(assistantLeads) ? assistantLeads : []).filter(
    (lead) =>
      lead.manager_contact_requested === 1 ||
      lead.manager_contact_requested === true ||
      String(lead.lead_type || '').toLowerCase() === 'hot',
  ).length

  const auctionsLive = (Array.isArray(auctions) ? auctions : []).filter(isAuctionLive).length
  const testingLive = [...(timerApt || []), ...(timerHouse || [])].filter((p) =>
    isTimerActive(p.test_timer_end_date),
  ).length

  let clients = 0
  if (newStage?.id != null) {
    clients = await prisma.crm_leads.count({ where: { stage_id: newStage.id } })
  }

  const whatsappHot = (Array.isArray(whatsappUsers) ? whatsappUsers : []).filter(
    (user) => String(user.leadType || user.lead_type || '').toLowerCase() === 'hot',
  ).length

  const moderation = pendingUsersN + pendingPropsN
  const chat = toNumber(chatCount)
  const bonuses = toNumber(bonusesCount)

  return {
    badges: {
      statistics: moderation + chat + bonuses,
      users: usersN,
      private_club: 0,
      moderation,
      chat,
      smart_assistant: smartAssistant,
      addition: pendingPropsN,
      objects: pendingPropsN,
      auctions: auctionsLive,
      test_drive: 0,
      debt_reasons: 0,
      debt_documents: 0,
      whatsapp: whatsappHot,
      clients,
      purchase_requests: 0,
      bonuses,
      seo: 0,
      testing: testingLive,
      access_management: 0,
      storage: 0,
    },
    testDriveCancellations,
    purchaseRequests,
    meta: { testDriveTotalCancelled },
  }
}
