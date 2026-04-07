import { getPrisma } from './prismaClient.js';

function normalizeFavoritePropertyTable(raw) {
  if (raw == null || raw === '') return 'properties_apartments';
  const s = String(raw).toLowerCase();
  if (s === 'apartments' || s === 'properties_apartments') return 'properties_apartments';
  if (s === 'houses' || s === 'properties_houses') return 'properties_houses';
  if (s === 'properties') return 'properties';
  return 'properties_apartments';
}

function normalizeReminderPropertyTable(raw) {
  return normalizeFavoritePropertyTable(raw);
}

function toPlain(row) {
  if (!row) return null;
  return { ...row };
}

export const auctionReminderQueries = {
  normalizePropertyTable: normalizeReminderPropertyTable,

  upsert: async ({
    userId,
    propertyId,
    propertyTable,
    notifyEmail,
    notifyWhatsapp,
    scheduledAtIso,
    auctionStartAtIso,
    propertyTitle,
  }) => {
        const prisma = getPrisma();
    const uid = parseInt(userId, 10);
    const pid = parseInt(propertyId, 10);
    const tbl = normalizeReminderPropertyTable(propertyTable);
    if (!uid || !pid || !scheduledAtIso) return { changes: 0 };
    const ne = notifyEmail ? 1 : 0;
    const nw = notifyWhatsapp ? 1 : 0;
    const title = propertyTitle != null ? String(propertyTitle).slice(0, 500) : '';
    const now = new Date().toISOString();
    await prisma.auction_reminders.upsert({
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
        notify_email: ne,
        notify_whatsapp: nw,
        scheduled_at: String(scheduledAtIso),
        auction_start_at: auctionStartAtIso || null,
        reminder_sent_at: null,
        auction_started_sent_at: null,
        circular_started_notified_at: null,
        property_title: title,
        updated_at: now,
      },
      update: {
        notify_email: ne,
        notify_whatsapp: nw,
        scheduled_at: String(scheduledAtIso),
        auction_start_at: auctionStartAtIso || null,
        property_title: title,
        reminder_sent_at: null,
        auction_started_sent_at: null,
        circular_started_notified_at: null,
        updated_at: now,
      },
    });
    return { changes: 1 };
  },

  getForUserProperty: async (userId, propertyId, propertyTable) => {
        const prisma = getPrisma();
    const uid = parseInt(userId, 10);
    const pid = parseInt(propertyId, 10);
    const tbl = normalizeReminderPropertyTable(propertyTable);
    if (!uid || !pid) return null;
    const row = await prisma.auction_reminders.findUnique({
      where: {
        user_id_property_id_property_table: {
          user_id: uid,
          property_id: pid,
          property_table: tbl,
        },
      },
    });
    return toPlain(row);
  },

  listDueReminders: async (beforeIso) => {
        const prisma = getPrisma();
    const beforeMs = new Date(String(beforeIso)).getTime();
    if (Number.isNaN(beforeMs)) return [];
    const rows = await prisma.auction_reminders.findMany({
      where: {
        reminder_sent_at: null,
        OR: [{ notify_email: 1 }, { notify_whatsapp: 1 }],
      },
    });
    return rows
      .filter((r) => {
        const t = new Date(String(r.scheduled_at)).getTime();
        return !Number.isNaN(t) && t <= beforeMs;
      })
      .map(toPlain);
  },

  listDueAuctionStarted: async (beforeIso) => {
        const prisma = getPrisma();
    const beforeMs = new Date(String(beforeIso)).getTime();
    if (Number.isNaN(beforeMs)) return [];
    const rows = await prisma.auction_reminders.findMany({
      where: {
        auction_started_sent_at: null,
        notify_email: 1,
        NOT: [{ auction_start_at: null }],
      },
    });
    return rows
      .filter((r) => {
        const t = new Date(String(r.auction_start_at)).getTime();
        return !Number.isNaN(t) && t <= beforeMs;
      })
      .map(toPlain);
  },

  listPendingCircularStartedNotify: async () => {
        const prisma = getPrisma();
    const rows = await prisma.auction_reminders.findMany({
      where: {
        circular_started_notified_at: null,
        notify_email: 1,
      },
    });
    return rows.map(toPlain);
  },

  markReminderSent: async (id) => {
        const prisma = getPrisma();
    const now = new Date().toISOString();
    await prisma.auction_reminders.update({
      where: { id: Number(id) },
      data: { reminder_sent_at: now, updated_at: now },
    });
    return { changes: 1 };
  },

  markStartedSent: async (id) => {
        const prisma = getPrisma();
    const now = new Date().toISOString();
    await prisma.auction_reminders.update({
      where: { id: Number(id) },
      data: { auction_started_sent_at: now, updated_at: now },
    });
    return { changes: 1 };
  },

  markCircularStartedNotified: async (id) => {
        const prisma = getPrisma();
    const now = new Date().toISOString();
    await prisma.auction_reminders.update({
      where: { id: Number(id) },
      data: { circular_started_notified_at: now, updated_at: now },
    });
    return { changes: 1 };
  },
};

