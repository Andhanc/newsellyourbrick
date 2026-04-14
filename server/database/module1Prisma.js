/**
 * Модуль 1: пользователи, документы, уведомления, избранное — PostgreSQL через Prisma.
 */
import { getPrisma } from './prismaClient.js';

function normalizeFavoriteTable(raw) {
  if (raw == null || raw === '') return 'properties_apartments';
  const s = String(raw).toLowerCase();
  if (s === 'apartments' || s === 'properties_apartments') return 'properties_apartments';
  if (s === 'houses' || s === 'properties_houses') return 'properties_houses';
  if (s === 'properties') return 'properties';
  return 'properties_apartments';
}

function userToPlain(u) {
  if (!u) return null;
  const o = { ...u };
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
  if (o.updated_at instanceof Date) o.updated_at = o.updated_at.toISOString();
  return o;
}

function docToPlain(d) {
  if (!d) return null;
  const o = { ...d };
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
  if (o.reviewed_at instanceof Date) o.reviewed_at = o.reviewed_at.toISOString();
  return o;
}

function notifToPlain(n) {
  if (!n) return null;
  const o = { ...n };
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
  return o;
}

async function generateUniqueUserIdNumberAsync(prisma) {
  let attempts = 0;
  while (attempts < 100) {
    const number = Math.floor(Math.random() * 90000) + 10000;
    const idNumber = number.toString();
    const existing = await prisma.users.findFirst({ where: { user_id_number: idNumber }, select: { id: true } });
    if (!existing) return idNumber;
    attempts++;
  }
  return Date.now().toString().slice(-5).padStart(5, '0');
}

export const userQueries = {
  create: async (userData) => {
    const prisma = getPrisma();
    let uidNum = userData.user_id_number;
    if (!uidNum) {
      uidNum = await generateUniqueUserIdNumberAsync(prisma);
    }
    const data = {
      first_name: userData.first_name,
      last_name: userData.last_name ?? null,
      email: userData.email ?? null,
      password: userData.password ?? null,
      phone_number: userData.phone_number,
      passport_series: userData.passport_series ?? null,
      passport_number: userData.passport_number ?? null,
      identification_number: userData.identification_number ?? null,
      address: userData.address ?? null,
      country: userData.country ?? null,
      passport_photo: userData.passport_photo ?? null,
      user_photo: userData.user_photo ?? null,
      is_verified: userData.is_verified ? 1 : 0,
      role: userData.role || 'buyer',
      is_online: userData.is_online ? 1 : 0,
      is_blocked: userData.is_blocked ? 1 : 0,
      user_id_number: uidNum,
    };
    const u = await prisma.users.create({ data });
    return { lastInsertRowid: u.id, changes: 1 };
  },

  getById: async (id) => {
    const prisma = getPrisma();
    const u = await prisma.users.findUnique({ where: { id: Number(id) } });
    return userToPlain(u);
  },

  getByEmail: async (email) => {
    const prisma = getPrisma();
    const u = await prisma.users.findFirst({ where: { email: email ?? undefined } });
    return userToPlain(u);
  },

  /** Все записи с данным email (несколько аккаунтов: покупатель + продавец). */
  getAllByEmail: async (email) => {
    const prisma = getPrisma();
    if (!email) return [];
    const rows = await prisma.users.findMany({
      where: { email },
      orderBy: { id: 'asc' },
    });
    return rows.map(userToPlain);
  },

  /**
   * Переносит активы покупателя на нового пользователя-продавца (доли, платежи, избранное и т.д.).
   */
  migrateBuyerAssetsToSellerUser: async (buyerId, sellerId) => {
    const prisma = getPrisma();
    const b = Number(buyerId);
    const s = Number(sellerId);
    if (!b || !s || b === s) return;

    await prisma.$transaction(async (tx) => {
      await tx.property_shares.updateMany({ where: { buyer_id: b }, data: { buyer_id: s } });
      await tx.share_purchase_signature_intents.updateMany({ where: { buyer_id: b }, data: { buyer_id: s } });
      await tx.property_reservation_signature_intents.updateMany({ where: { buyer_id: b }, data: { buyer_id: s } });
      await tx.purchase_requests.updateMany({
        where: { buyer_id: String(b) },
        data: { buyer_id: String(s) },
      });
      await tx.bids.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.auction_winners.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.stripe_payments.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.transactions.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.property_favorites.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.documents.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.notifications.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.bonus_task_submissions.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.test_drive_bookings.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.crm_leads.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.assistant_leads.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.live_chat_sessions.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.properties.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.properties_apartments.updateMany({ where: { user_id: b }, data: { user_id: s } });
      await tx.properties_houses.updateMany({ where: { user_id: b }, data: { user_id: s } });

      const subState = await tx.stripe_subscription_state.findUnique({ where: { user_id: b } });
      if (subState) {
        await tx.stripe_subscription_state.delete({ where: { user_id: b } });
        const existingSellerSub = await tx.stripe_subscription_state.findUnique({ where: { user_id: s } });
        if (!existingSellerSub) {
          await tx.stripe_subscription_state.create({
            data: {
              user_id: s,
              stripe_customer_id: subState.stripe_customer_id,
              stripe_subscription_id: subState.stripe_subscription_id,
              plan_key: subState.plan_key,
              status: subState.status,
              current_period_start: subState.current_period_start,
              current_period_end: subState.current_period_end,
              cancel_at_period_end: subState.cancel_at_period_end ?? 0,
              updated_at: subState.updated_at,
            },
          });
        }
      }
    });
  },

  getByPhone: async (phone) => {
    const prisma = getPrisma();
    const u = await prisma.users.findFirst({ where: { phone_number: phone ?? undefined } });
    return userToPlain(u);
  },

  getByTelegramId: async (telegramId) => {
    const prisma = getPrisma();
    const u = await prisma.users.findFirst({ where: { telegram_id: String(telegramId) } });
    return userToPlain(u);
  },

  update: async (id, userData) => {
    const prisma = getPrisma();
    const numId = Number(id);
    const data = {};
    const allowed = [
      'first_name',
      'last_name',
      'email',
      'password',
      'phone_number',
      'passport_series',
      'passport_number',
      'identification_number',
      'address',
      'country',
      'passport_photo',
      'user_photo',
      'is_verified',
      'role',
      'is_online',
      'is_blocked',
      'telegram_id',
      'telegram_username',
      'telegram_photo_url',
      'user_id_number',
      'deposit_amount',
      'has_card',
    ];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(userData, key)) {
        if (key === 'is_verified' || key === 'is_online' || key === 'is_blocked') {
          data[key] = userData[key] ? 1 : 0;
        } else if (key === 'password') {
          data[key] = userData[key] || null;
        } else if (key === 'deposit_amount') {
          data[key] = userData[key] != null ? Number(userData[key]) : null;
        } else if (key === 'has_card') {
          data[key] = userData[key] ? 1 : 0;
        } else {
          data[key] = userData[key] ?? null;
        }
      }
    }
    if (Object.keys(data).length === 0) {
      return { changes: 0 };
    }
    data.updated_at = new Date();
    const r = await prisma.users.updateMany({ where: { id: numId }, data });
    return { changes: r.count };
  },

  getAll: async (limit = 100, offset = 0) => {
    const prisma = getPrisma();
    const rows = await prisma.users.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map(userToPlain);
  },

  getCount: async () => {
    const prisma = getPrisma();
    return prisma.users.count();
  },

  getByRole: async (role) => {
    const prisma = getPrisma();
    const rows = await prisma.users.findMany({
      where: { role },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(userToPlain);
  },

  delete: async (id) => {
    const prisma = getPrisma();
    const r = await prisma.users.deleteMany({ where: { id: Number(id) } });
    return { changes: r.count };
  },

  getCountryStats: async () => {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw`
      SELECT COALESCE(country, 'Не указано') as country, COUNT(*)::int as count
      FROM users
      GROUP BY country
      ORDER BY count DESC
    `;
    return rows;
  },

  getRoleStats: async () => {
    const prisma = getPrisma();
    return prisma.$queryRaw`
      SELECT COALESCE(role, 'buyer') as role, COUNT(*)::int as count
      FROM users
      GROUP BY role
    `;
  },

  getRegistrationsByDay: async (startDate, endDate) => {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw`
      SELECT (created_at AT TIME ZONE 'UTC')::date::text as date, COUNT(*)::int as count
      FROM users
      WHERE (created_at AT TIME ZONE 'UTC')::date >= ${startDate}::date
        AND (created_at AT TIME ZONE 'UTC')::date <= ${endDate}::date
      GROUP BY (created_at AT TIME ZONE 'UTC')::date
      ORDER BY date
    `;
    const countByDate = Object.fromEntries(rows.map((r) => [r.date, Number(r.count)]));
    const result = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      result.push({ date: dateStr, count: countByDate[dateStr] || 0 });
    }
    return result;
  },
};

export const documentQueries = {
  create: async (documentData) => {
    const prisma = getPrisma();
    const userId =
      typeof documentData.user_id === 'string'
        ? parseInt(documentData.user_id, 10)
        : documentData.user_id;
    if (!userId || Number.isNaN(userId) || userId <= 0) {
      throw new Error(`Неверный user_id: ${documentData.user_id}. Ожидается положительное число.`);
    }
    const u = await prisma.users.findUnique({ where: { id: userId }, select: { id: true } });
    if (!u) throw new Error(`Пользователь с ID ${userId} не найден в базе данных.`);
    const doc = await prisma.documents.create({
      data: {
        user_id: userId,
        document_type: documentData.document_type || null,
        document_photo: documentData.document_photo,
        is_reviewed: documentData.is_reviewed ? 1 : 0,
        verification_status: documentData.verification_status || 'pending',
      },
    });
    return { lastInsertRowid: doc.id, changes: 1 };
  },

  getById: async (id) => {
    const prisma = getPrisma();
    const d = await prisma.documents.findUnique({ where: { id: Number(id) } });
    return docToPlain(d);
  },

  getByUserId: async (userId) => {
    const prisma = getPrisma();
    const rows = await prisma.documents.findMany({
      where: { user_id: Number(userId) },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(docToPlain);
  },

  getUnreviewed: async () => {
    const prisma = getPrisma();
    return prisma.$queryRaw`
      SELECT d.*, u.first_name, u.last_name, u.email, u.phone_number
      FROM documents d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.verification_status = 'pending'
      ORDER BY d.created_at ASC
    `;
  },

  getPendingVerification: async () => {
    const prisma = getPrisma();
    return prisma.$queryRaw`
      SELECT d.id, d.user_id, d.document_type, d.document_photo, d.verification_status, d.is_reviewed,
             d.reviewed_by, d.reviewed_at, d.rejection_reason, d.created_at,
             u.id as user_db_id, u.first_name, u.last_name, u.email, u.phone_number, u.role
      FROM documents d
      INNER JOIN users u ON d.user_id = u.id
      WHERE d.verification_status = 'pending'
      ORDER BY d.created_at ASC
    `;
  },

  getAll: async (limit = 100, offset = 0) => {
    const prisma = getPrisma();
    const rows = await prisma.documents.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map(docToPlain);
  },

  markAsReviewed: async (documentId, reviewedBy) => {
    const prisma = getPrisma();
    await prisma.documents.updateMany({
      where: { id: Number(documentId) },
      data: {
        is_reviewed: 1,
        verification_status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
      },
    });
    return { changes: 1 };
  },

  approveDocument: async (documentId, reviewedBy) => {
    const prisma = getPrisma();
    await prisma.documents.updateMany({
      where: { id: Number(documentId) },
      data: {
        is_reviewed: 1,
        verification_status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
        rejection_reason: null,
      },
    });
    return { changes: 1 };
  },

  updateStatus: async (documentId, status, reviewedBy = null, rejectionReason = null) => {
    const prisma = getPrisma();
    await prisma.documents.updateMany({
      where: { id: Number(documentId) },
      data: {
        is_reviewed: 1,
        verification_status: status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
        rejection_reason: rejectionReason || null,
      },
    });
    return { changes: 1 };
  },

  rejectDocument: async (documentId, reviewedBy, rejectionReason = null) => {
    return await documentQueries.updateStatus(documentId, 'rejected', reviewedBy, rejectionReason ?? null);
  },

  delete: async (id) => {
    const prisma = getPrisma();
    const r = await prisma.documents.deleteMany({ where: { id: Number(id) } });
    return { changes: r.count };
  },

  deleteAllRejectedForUser: async (userId) => {
    const { existsSync, unlinkSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    if (!uid || Number.isNaN(uid)) return { deleted: 0 };

    const prisma = getPrisma();
    const rows = await prisma.documents.findMany({
      where: { user_id: uid, verification_status: 'rejected' },
    });

    let deleted = 0;
    const serverRoot = join(__dirname, '..');
    for (const doc of rows) {
      if (doc.document_photo) {
        const rel = String(doc.document_photo).replace(/^\//, '');
        const abs = join(serverRoot, rel);
        try {
          if (existsSync(abs)) unlinkSync(abs);
        } catch (e) {
          console.warn('⚠️ deleteAllRejectedForUser: файл не удалён', abs, e.message);
        }
      }
      await prisma.documents.deleteMany({ where: { id: doc.id } });
      deleted += 1;
    }
    return { deleted };
  },
};



export const notificationQueries = {
  create: async (notificationData) => {
    const prisma = getPrisma();
    const n = await prisma.notifications.create({
      data: {
        user_id: notificationData.user_id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message || null,
        data: notificationData.data ? JSON.stringify(notificationData.data) : null,
        is_read: notificationData.is_read ? 1 : 0,
        view_count: notificationData.view_count || 0,
      },
    });
    return { lastInsertRowid: n.id, changes: 1 };
  },

  getByUserId: async (userId) => {
    const prisma = getPrisma();
    const rows = await prisma.notifications.findMany({
      where: { user_id: Number(userId) },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(notifToPlain);
  },

  getUnreadByUserId: async (userId) => {
    const prisma = getPrisma();
    const rows = await prisma.notifications.findMany({
      where: { user_id: Number(userId), is_read: 0 },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(notifToPlain);
  },

  markAsViewed: async (notificationId) => {
    const prisma = getPrisma();
    const notification = await prisma.notifications.findUnique({ where: { id: Number(notificationId) } });
    if (!notification) return { changes: 0 };
    const newViewCount = (notification.view_count || 0) + 1;
    if (notification.type === 'verification_success' && newViewCount >= 1) {
      await prisma.notifications.deleteMany({ where: { id: Number(notificationId) } });
      return { changes: 1 };
    }
    if (newViewCount >= 2) {
      await prisma.notifications.deleteMany({ where: { id: Number(notificationId) } });
      return { changes: 1 };
    }
    await prisma.notifications.updateMany({
      where: { id: Number(notificationId) },
      data: { is_read: 1, view_count: newViewCount },
    });
    return { changes: 1 };
  },

  delete: async (id) => {
    const prisma = getPrisma();
    await prisma.notifications.deleteMany({ where: { id: Number(id) } });
    return { changes: 1 };
  },

  deleteByUserId: async (userId) => {
    const prisma = getPrisma();
    await prisma.notifications.deleteMany({ where: { user_id: Number(userId) } });
    return { changes: 1 };
  },
};



export const favoriteQueries = {
  normalizePropertyTable: normalizeFavoriteTable,

  listForUser: async (userId) => {
    const prisma = getPrisma();
    const uid = parseInt(userId, 10);
    if (!uid) return [];
    const rows = await prisma.property_favorites.findMany({
      where: { user_id: uid },
      orderBy: { created_at: 'desc' },
      select: { property_id: true, property_table: true },
    });
    return rows;
  },

  add: async (userId, propertyId, propertyTable) => {
    const prisma = getPrisma();
    const uid = parseInt(userId, 10);
    const pid = parseInt(propertyId, 10);
    const tbl = normalizeFavoriteTable(propertyTable);
    if (!uid || !pid) return { changes: 0 };
    try {
      await prisma.property_favorites.create({
        data: { user_id: uid, property_id: pid, property_table: tbl },
      });
      return { changes: 1 };
    } catch (e) {
      if (e.code === 'P2002') return { changes: 0 };
      throw e;
    }
  },

  remove: async (userId, propertyId, propertyTable) => {
    const prisma = getPrisma();
    const uid = parseInt(userId, 10);
    const pid = parseInt(propertyId, 10);
    const tbl = normalizeFavoriteTable(propertyTable);
    if (!uid || !pid) return { changes: 0 };
    const r = await prisma.property_favorites.deleteMany({
      where: { user_id: uid, property_id: pid, property_table: tbl },
    });
    return { changes: r.count };
  },
};
