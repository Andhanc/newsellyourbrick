/**
 * Модуль 3: запросы на покупку и бронирования тест-драйва — PostgreSQL через Prisma.
 */
import crypto from 'crypto';
import { getPrisma } from './prismaClient.js';
import prismaPkg from '@prisma/client';

const { Prisma } = prismaPkg;

/** +3 календарных дня от заезда, 09:00 UTC — как в Stripe после оплаты. */
function computeSurveyScheduledAtIso(startYmd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(startYmd || '').trim());
  if (!m) return new Date().toISOString();
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d, 9, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + 3);
  return dt.toISOString();
}

/** Утро после выезда: end_date + 1 календарный день, 09:00 UTC — рассылка «как прошло». */
function computeExitFeedbackScheduledAtIso(endYmd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(endYmd || '').trim());
  if (!m) return new Date().toISOString();
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d, 9, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString();
}

function bookingToPlain(row) {
  if (!row) return null;
  const o = { ...row };
  for (const k of Object.keys(o)) {
    if (o[k] instanceof Date) o[k] = o[k].toISOString();
  }
  return o;
}

function toIntOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function buildPurchaseCreateData(requestData) {
  const pb = requestData.propertyBedrooms;
  const bedrooms =
    pb !== undefined && pb !== null && pb !== '' ? Number(pb) : null;
  const br = Number.isFinite(bedrooms) ? Math.trunc(bedrooms) : null;
  return {
    buyer_id: requestData.buyerId != null ? String(requestData.buyerId) : null,
    buyer_name: requestData.buyerName,
    buyer_email: requestData.buyerEmail ?? null,
    buyer_phone: requestData.buyerPhone ?? null,
    seller_id: requestData.sellerId != null ? String(requestData.sellerId) : null,
    seller_name: requestData.sellerName ?? null,
    seller_email: requestData.sellerEmail ?? null,
    seller_phone: requestData.sellerPhone ?? null,
    property_id: requestData.propertyId ?? null,
    property_title: requestData.propertyTitle,
    property_description: requestData.propertyDescription ?? null,
    property_price: requestData.propertyPrice ?? null,
    property_currency: (requestData.propertyCurrency || 'USD').toString().toUpperCase(),
    property_location: requestData.propertyLocation ?? null,
    property_type: requestData.propertyType ?? null,
    property_area: requestData.propertyArea ?? null,
    property_rooms: toIntOrNull(requestData.propertyRooms),
    property_bedrooms: br,
    property_bathrooms: toIntOrNull(requestData.propertyBathrooms),
    property_floor: toIntOrNull(requestData.propertyFloor),
    property_total_floors: toIntOrNull(requestData.propertyTotalFloors),
    property_year_built: toIntOrNull(requestData.propertyYearBuilt),
    property_living_area: requestData.propertyLivingArea ?? null,
    property_land_area: requestData.propertyLandArea ?? null,
    property_building_type: requestData.propertyBuildingType ?? null,
    property_renovation: requestData.propertyRenovation ?? null,
    property_condition: requestData.propertyCondition ?? null,
    property_heating: requestData.propertyHeating ?? null,
    property_water_supply: requestData.propertyWaterSupply ?? null,
    property_sewerage: requestData.propertySewerage ?? null,
    property_balcony: requestData.propertyBalcony === 1 || requestData.propertyBalcony === true ? 1 : 0,
    property_parking: requestData.propertyParking === 1 || requestData.propertyParking === true ? 1 : 0,
    property_elevator: requestData.propertyElevator === 1 || requestData.propertyElevator === true ? 1 : 0,
    property_garage: requestData.propertyGarage === 1 || requestData.propertyGarage === true ? 1 : 0,
    property_pool: requestData.propertyPool === 1 || requestData.propertyPool === true ? 1 : 0,
    property_garden: requestData.propertyGarden === 1 || requestData.propertyGarden === true ? 1 : 0,
    property_electricity: requestData.propertyElectricity === 1 || requestData.propertyElectricity === true ? 1 : 0,
    property_internet: requestData.propertyInternet === 1 || requestData.propertyInternet === true ? 1 : 0,
    property_security: requestData.propertySecurity === 1 || requestData.propertySecurity === true ? 1 : 0,
    property_furniture: requestData.propertyFurniture === 1 || requestData.propertyFurniture === true ? 1 : 0,
    property_commercial_type: requestData.propertyCommercialType ?? null,
    property_business_hours: requestData.propertyBusinessHours ?? null,
    request_date: requestData.requestDate,
    status: requestData.status || 'pending',
    property_table: requestData.propertyTable ?? null,
  };
}

export const purchaseRequestQueries = {
  create: async (requestData) => {
        const prisma = getPrisma();
    const data = buildPurchaseCreateData(requestData);
    const row = await prisma.purchase_requests.create({ data });
    return { lastInsertRowid: row.id, changes: 1 };
  },

  getAll: async (limit = 100, offset = 0) => {
        const prisma = getPrisma();
    return prisma.purchase_requests.findMany({
      orderBy: { id: 'desc' },
      take: limit,
      skip: offset,
    });
  },

  getById: async (id) => {
    const prisma = getPrisma();
    return prisma.purchase_requests.findUnique({ where: { id: Number(id) } });
  },

  getByBuyerId: async (buyerId, limit = 50, offset = 0) => {
        const prisma = getPrisma();
    return prisma.purchase_requests.findMany({
      where: { buyer_id: String(buyerId) },
      orderBy: { id: 'desc' },
      take: limit,
      skip: offset,
    });
  },

  getByStatus: async (status, limit = 100, offset = 0) => {
        const prisma = getPrisma();
    return prisma.purchase_requests.findMany({
      where: { status },
      orderBy: { id: 'desc' },
      take: limit,
      skip: offset,
    });
  },

  updateStatus: async (id, status, adminNotes = null) => {
        const prisma = getPrisma();
    const now = new Date().toISOString();
    const updated = await prisma.purchase_requests.update({
      where: { id: Number(id) },
      data: {
        status,
        admin_notes: adminNotes ?? null,
        updated_at: now,
      },
    });
    return { changes: 1 };
  },

  getCount: async () => {
        const prisma = getPrisma();
    return prisma.purchase_requests.count();
  },

  getCountByStatus: async (status) => {
        const prisma = getPrisma();
    return prisma.purchase_requests.count({ where: { status } });
  },

  delete: async (id) => {
        const prisma = getPrisma();
    await prisma.purchase_requests.delete({ where: { id: Number(id) } });
    return { changes: 1 };
  },
};

export const testDriveBookingQueries = {
  ensureTable: async () => {
    const prisma = getPrisma();
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS owner_comment TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS check_in_enabled INT DEFAULT 0'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS check_in_report TEXT'
    );
    await prisma.$executeRawUnsafe(
      "ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS check_in_status TEXT DEFAULT 'pending_checkin'"
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS cancellation_reason_code TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS buyer_contact_channel TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS survey_token TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS survey_whatsapp_status TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS survey_whatsapp_sent_at TIMESTAMP'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS survey_scheduled_at TIMESTAMP'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS exit_feedback_token TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS exit_feedback_whatsapp_status TEXT'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS exit_feedback_whatsapp_sent_at TIMESTAMP'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS exit_feedback_scheduled_at TIMESTAMP'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE test_drive_bookings ADD COLUMN IF NOT EXISTS exit_feedback_report TEXT'
    );
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_test_drive_bookings_survey_token
       ON test_drive_bookings (survey_token)
       WHERE survey_token IS NOT NULL AND survey_token <> ''`
    );
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_test_drive_bookings_exit_feedback_token
       ON test_drive_bookings (exit_feedback_token)
       WHERE exit_feedback_token IS NOT NULL AND exit_feedback_token <> ''`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE test_drive_bookings
       SET cancelled_at = COALESCE(cancelled_at, created_at)
       WHERE LOWER(TRIM(COALESCE(status, ''))) = 'cancelled'
         AND cancelled_at IS NULL`
    );
  },

  create: async (row) => {
        const prisma = getPrisma();
    const created = await prisma.test_drive_bookings.create({
      data: {
        property_id: Number(row.property_id),
        property_table: row.property_table || 'properties_apartments',
        user_id: Number(row.user_id),
        start_date: String(row.start_date),
        end_date: String(row.end_date),
        status: row.status || 'pending',
        owner_notification_id: row.owner_notification_id ?? null,
      },
    });
    return { lastInsertRowid: created.id, changes: 1 };
  },

  updateOwnerNotificationId: async (bookingId, notificationId) => {
        const prisma = getPrisma();
    const updated = await prisma.test_drive_bookings.update({
      where: { id: Number(bookingId) },
      data: { owner_notification_id: Number(notificationId) },
    });
    return { changes: 1 };
  },

  getById: async (id) => {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM test_drive_bookings WHERE id = ${Number(id)} LIMIT 1`
    );
    return bookingToPlain(Array.isArray(rows) ? rows[0] : null);
  },

  listByUserId: async (userId) => {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM test_drive_bookings WHERE user_id = ${Number(userId)} ORDER BY created_at DESC`
    );
    return rows.map((r) => bookingToPlain(r));
  },

  /** Бронирования по объектам, принадлежащим продавцу (owner user_id). */
  listByOwnerUserId: async (ownerUserId) => {
    const prisma = getPrisma();
    const uid = Number(ownerUserId);
    if (!uid || Number.isNaN(uid)) return [];
    const [apartments, houses] = await Promise.all([
      prisma.properties_apartments.findMany({
        where: { user_id: uid },
        select: { id: true },
      }),
      prisma.properties_houses.findMany({
        where: { user_id: uid },
        select: { id: true },
      }),
    ]);
    const aptIds = apartments.map((a) => Number(a.id)).filter(Number.isFinite);
    const houseIds = houses.map((h) => Number(h.id)).filter(Number.isFinite);
    const or = [];
    if (aptIds.length) {
      or.push({
        property_table: 'properties_apartments',
        property_id: { in: aptIds },
      });
    }
    if (houseIds.length) {
      or.push({
        property_table: 'properties_houses',
        property_id: { in: houseIds },
      });
    }
    if (!or.length) return [];
    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT * FROM test_drive_bookings
        WHERE (${aptIds.length > 0 ? Prisma.sql`(property_table = 'properties_apartments' AND property_id IN (${Prisma.join(aptIds)}))` : Prisma.sql`FALSE`}
           OR ${houseIds.length > 0 ? Prisma.sql`(property_table = 'properties_houses' AND property_id IN (${Prisma.join(houseIds)}))` : Prisma.sql`FALSE`})
        ORDER BY created_at DESC
      `
    );
    return rows.map((r) => bookingToPlain(r));
  },

  listActiveForProperty: async (propertyId, propertyTable) => {
        const prisma = getPrisma();
    const rows = await prisma.test_drive_bookings.findMany({
      where: {
        property_id: Number(propertyId),
        property_table: propertyTable,
        status: { in: ['pending', 'approved', 'paid'] },
      },
      orderBy: { start_date: 'asc' },
    });
    return rows.map((r) => bookingToPlain(r));
  },

  countPendingForUserProperty: async (userId, propertyId, propertyTable) => {
        const prisma = getPrisma();
    return prisma.test_drive_bookings.count({
      where: {
        user_id: Number(userId),
        property_id: Number(propertyId),
        property_table: propertyTable,
        status: 'pending',
      },
    });
  },

  updateStatus: async (id, status) => {
        const prisma = getPrisma();
    const updated = await prisma.test_drive_bookings.update({
      where: { id: Number(id) },
      data: { status },
    });
    return { changes: 1 };
  },

  approveWithOwnerComment: async (id, ownerComment) => {
    const prisma = getPrisma();
    const updated = await prisma.$executeRaw(
      Prisma.sql`
        UPDATE test_drive_bookings
        SET status = 'approved',
            owner_comment = ${String(ownerComment || '')},
            check_in_enabled = 1,
            check_in_status = 'awaiting_buyer_checkin'
        WHERE id = ${Number(id)}
      `
    );
    return { changes: Number(updated || 0) };
  },

  saveCheckInReport: async (id, reportJson, checkInStatus) => {
    const prisma = getPrisma();
    const updated = await prisma.$executeRaw(
      Prisma.sql`
        UPDATE test_drive_bookings
        SET check_in_report = ${String(reportJson || '{}')},
            check_in_status = ${String(checkInStatus || 'pending_checkin')}
        WHERE id = ${Number(id)}
      `
    );
    return { changes: Number(updated || 0) };
  },

  /** После оплаты Stripe: токен опроса и дата авторассылки WhatsApp (+3 календарных дня от заезда). */
  setSurveyBroadcastAfterPayment: async (bookingId, surveyToken, scheduledAtIso) => {
    const prisma = getPrisma();
    const sid = Number(bookingId);
    const tok = String(surveyToken || '').trim();
    if (!sid || !tok) return { changes: 0 };
    const when = scheduledAtIso ? new Date(scheduledAtIso) : new Date();
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE test_drive_bookings
        SET survey_token = ${tok},
            survey_whatsapp_status = 'pending',
            survey_scheduled_at = ${when}
        WHERE id = ${sid}
      `
    );
    return { changes: 1 };
  },

  getBySurveyToken: async (token) => {
    const prisma = getPrisma();
    const t = String(token || '').trim();
    if (!t || t.length < 16) return null;
    const rows = await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM test_drive_bookings WHERE survey_token = ${t} LIMIT 1`
    );
    return bookingToPlain(Array.isArray(rows) ? rows[0] : null);
  },

  markSurveyWhatsAppSent: async (bookingId) => {
    const prisma = getPrisma();
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE test_drive_bookings
        SET survey_whatsapp_status = 'sent',
            survey_whatsapp_sent_at = NOW()
        WHERE id = ${Number(bookingId)}
      `
    );
    return { changes: 1 };
  },

  /**
   * Если у подтверждённой/оплаченной брони ещё нет токена опроса — создаём (ссылка WA и опрос).
   */
  ensureSurveyBroadcastTokenIfMissing: async (bookingId) => {
    await testDriveBookingQueries.ensureTable();
    const row = await testDriveBookingQueries.getById(bookingId);
    if (!row) return { ok: false, reason: 'not_found' };
    const st = String(row.status || '').toLowerCase();
    if (st === 'cancelled' || st === 'rejected') return { ok: false, reason: 'bad_status' };
    if (String(row.survey_token || '').trim()) return { ok: true, existed: true };
    if (st !== 'approved' && st !== 'paid') return { ok: false, reason: 'not_ready' };
    const tok = crypto.randomBytes(24).toString('hex');
    const schedIso = computeSurveyScheduledAtIso(row.start_date);
    await testDriveBookingQueries.setSurveyBroadcastAfterPayment(bookingId, tok, schedIso);
    return { ok: true, existed: false };
  },

  /** Очередь авторассылки: pending и время наступило. */
  listDueSurveyWhatsApp: async (limit = 30) => {
    const prisma = getPrisma();
    const lim = Math.min(Math.max(parseInt(String(limit), 10) || 30, 1), 100);
    const rows = await prisma.$queryRaw`
      SELECT t.id
      FROM test_drive_bookings t
      WHERE t.survey_whatsapp_status = 'pending'
        AND t.survey_token IS NOT NULL
        AND TRIM(t.survey_token) <> ''
        AND t.survey_scheduled_at IS NOT NULL
        AND t.survey_scheduled_at <= NOW()
        AND LOWER(COALESCE(t.status, '')) NOT IN ('cancelled')
      ORDER BY t.survey_scheduled_at ASC
      LIMIT ${lim}
    `;
    return (Array.isArray(rows) ? rows : []).map((r) => Number(r.id)).filter((id) => Number.isFinite(id));
  },

  /** После оплаты: отдельный токен и план WA «после выезда». */
  setExitFeedbackBroadcastAfterPayment: async (bookingId, exitToken, scheduledAtIso) => {
    const prisma = getPrisma();
    const sid = Number(bookingId);
    const tok = String(exitToken || '').trim();
    if (!sid || !tok) return { changes: 0 };
    const when = scheduledAtIso ? new Date(scheduledAtIso) : new Date();
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE test_drive_bookings
        SET exit_feedback_token = ${tok},
            exit_feedback_whatsapp_status = 'pending',
            exit_feedback_scheduled_at = ${when}
        WHERE id = ${sid}
      `
    );
    return { changes: 1 };
  },

  initializeExitFeedbackAfterPayment: async (bookingId, endDateYmd) => {
    const sid = Number(bookingId);
    if (!sid) return { changes: 0 };
    const tok = crypto.randomBytes(24).toString('hex');
    const schedIso = computeExitFeedbackScheduledAtIso(endDateYmd);
    return testDriveBookingQueries.setExitFeedbackBroadcastAfterPayment(sid, tok, schedIso);
  },

  getByExitFeedbackToken: async (token) => {
    const prisma = getPrisma();
    const t = String(token || '').trim();
    if (!t || t.length < 16) return null;
    const rows = await prisma.$queryRaw(
      Prisma.sql`SELECT * FROM test_drive_bookings WHERE exit_feedback_token = ${t} LIMIT 1`
    );
    return bookingToPlain(Array.isArray(rows) ? rows[0] : null);
  },

  markExitFeedbackWhatsAppSent: async (bookingId) => {
    const prisma = getPrisma();
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE test_drive_bookings
        SET exit_feedback_whatsapp_status = 'sent',
            exit_feedback_whatsapp_sent_at = NOW()
        WHERE id = ${Number(bookingId)}
      `
    );
    return { changes: 1 };
  },

  saveExitFeedbackReport: async (bookingId, reportJson) => {
    const prisma = getPrisma();
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE test_drive_bookings
        SET exit_feedback_report = ${String(reportJson || '{}')}
        WHERE id = ${Number(bookingId)}
      `
    );
    return { changes: 1 };
  },

  /**
   * Если у оплаченной/подтверждённой брони нет токена пост-отзыва — создаём (ссылка WA после выезда).
   */
  ensureExitFeedbackTokenIfMissing: async (bookingId) => {
    await testDriveBookingQueries.ensureTable();
    const row = await testDriveBookingQueries.getById(bookingId);
    if (!row) return { ok: false, reason: 'not_found' };
    const st = String(row.status || '').toLowerCase();
    if (st === 'cancelled' || st === 'rejected') return { ok: false, reason: 'bad_status' };
    if (String(row.exit_feedback_token || '').trim()) return { ok: true, existed: true };
    if (st !== 'approved' && st !== 'paid') return { ok: false, reason: 'not_ready' };
    await testDriveBookingQueries.initializeExitFeedbackAfterPayment(bookingId, row.end_date);
    return { ok: true, existed: false };
  },

  /** Очередь WA «после выезда»: pending и время наступило. */
  listDueExitFeedbackWhatsApp: async (limit = 30) => {
    const prisma = getPrisma();
    const lim = Math.min(Math.max(parseInt(String(limit), 10) || 30, 1), 100);
    const rows = await prisma.$queryRaw`
      SELECT t.id
      FROM test_drive_bookings t
      WHERE LOWER(COALESCE(t.exit_feedback_whatsapp_status, '')) = 'pending'
        AND t.exit_feedback_token IS NOT NULL
        AND TRIM(t.exit_feedback_token) <> ''
        AND t.exit_feedback_scheduled_at IS NOT NULL
        AND t.exit_feedback_scheduled_at <= NOW()
        AND LOWER(COALESCE(t.status, '')) NOT IN ('cancelled', 'rejected')
        AND LOWER(COALESCE(t.status, '')) IN ('paid', 'approved')
      ORDER BY t.exit_feedback_scheduled_at ASC
      LIMIT ${lim}
    `;
    return (Array.isArray(rows) ? rows : []).map((r) => Number(r.id)).filter((id) => Number.isFinite(id));
  },

  /** Брони для админки «Объявления»: только подтверждённые владельцем (approved). Токен опроса подставляем при отсутствии. */
  listSurveyBroadcastBookings: async (limit = 200) => {
    const prisma = getPrisma();
    const lim = Math.min(Math.max(parseInt(String(limit), 10) || 200, 1), 500);
    const rows = await prisma.$queryRaw`
      SELECT t.*,
             u.first_name AS buyer_first_name,
             u.last_name AS buyer_last_name,
             u.phone_number AS buyer_phone,
             u.email AS buyer_email
      FROM test_drive_bookings t
      INNER JOIN users u ON u.id = t.user_id
      WHERE LOWER(COALESCE(t.status, '')) = 'approved'
      ORDER BY t.created_at DESC NULLS LAST
      LIMIT ${lim}
    `;
    const plains = (Array.isArray(rows) ? rows : []).map((r) => {
      const plain = bookingToPlain(r);
      if (plain) {
        plain.buyer_first_name = r.buyer_first_name ?? null;
        plain.buyer_last_name = r.buyer_last_name ?? null;
        plain.buyer_phone = r.buyer_phone ?? null;
        plain.buyer_email = r.buyer_email ?? null;
      }
      return plain;
    });
    for (const plain of plains) {
      if (!plain?.id) continue;
      if (!String(plain.survey_token || '').trim()) {
        await testDriveBookingQueries.ensureSurveyBroadcastTokenIfMissing(plain.id);
        const upd = await testDriveBookingQueries.getById(plain.id);
        if (upd) {
          plain.survey_token = upd.survey_token;
          plain.survey_whatsapp_status = upd.survey_whatsapp_status;
          plain.survey_scheduled_at = upd.survey_scheduled_at;
          plain.survey_whatsapp_sent_at = upd.survey_whatsapp_sent_at;
        }
      }
    }
    return plains;
  },
};
