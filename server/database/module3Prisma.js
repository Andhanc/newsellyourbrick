/**
 * Модуль 3: запросы на покупку и бронирования тест-драйва — PostgreSQL через Prisma.
 */
import { getPrisma } from './prismaClient.js';
import prismaPkg from '@prisma/client';

const { Prisma } = prismaPkg;

function bookingToPlain(row) {
  if (!row) return null;
  const o = { ...row };
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
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
};
