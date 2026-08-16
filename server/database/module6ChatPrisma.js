/**
 * Модуль 6: WhatsApp-пользователи, лиды умного помощника, live-chat — PostgreSQL через Prisma.
 */
import { randomUUID } from 'crypto';
import prismaPkg from '@prisma/client';
import { getPrisma } from './prismaClient.js';

const { Prisma } = prismaPkg;
import {
  computeLeadType,
  buildSummary,
  mergeLeadTypes,
  normalizeAssistantLeadRow,
} from './assistantLeadHelpers.js';

function waToPlain(u) {
  if (!u) return null;
  const o = { ...u };
  if (o.last_message_at instanceof Date) o.last_message_at = o.last_message_at.toISOString();
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
  if (o.updated_at instanceof Date) o.updated_at = o.updated_at.toISOString();
  return o;
}

function leadListRowToPlain(r) {
  if (!r) return null;
  const o = { ...r };
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
  if (o.updated_at instanceof Date) o.updated_at = o.updated_at.toISOString();
  return o;
}

function liveMsgToPlain(m) {
  if (!m) return null;
  const o = { ...m };
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
  return o;
}

function liveSessionToPlain(s) {
  if (!s) return null;
  const o = { ...s };
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
  if (o.updated_at instanceof Date) o.updated_at = o.updated_at.toISOString();
  return o;
}

/** Нормализация строк из $queryRaw (BigInt → number, Date → ISO). */
function normalizeAdminListRow(row) {
  if (!row || typeof row !== 'object') return row;
  const o = { ...row };
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === 'bigint') o[k] = Number(v);
    else if (v instanceof Date) o[k] = v.toISOString();
    else if (k === 'client_vip_club_active') o[k] = v === true || v === 1 || v === 't';
    else if (k === 'unread_count' || k === 'admin_last_read_message_id') o[k] = Number(v) || 0;
  }
  return o;
}

function adminLiveChatSessionListQuery(extraSql = Prisma.empty) {
  return Prisma.sql`
    SELECT s.id, s.public_token, s.user_id, s.assistant_session_id, s.display_label, s.created_at, s.updated_at,
      s.admin_last_read_message_id,
      (SELECT m.body FROM live_chat_messages m WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1) AS last_message_preview,
      (
        SELECT COUNT(*)::int
        FROM live_chat_messages m
        WHERE m.session_id = s.id
          AND LOWER(m.sender_role) IN ('user', 'client', 'visitor')
          AND m.id > COALESCE(s.admin_last_read_message_id, 0)
      ) AS unread_count,
      u.first_name AS client_first_name,
      u.last_name AS client_last_name,
      u.email AS client_email,
      u.phone_number AS client_phone,
      u.user_photo AS client_user_photo,
      u.telegram_photo_url AS client_telegram_photo_url,
      al.email AS lead_email,
      al.phone AS lead_phone,
      al.summary AS lead_summary,
      CASE
        WHEN u.vip_until IS NOT NULL AND u.vip_until > NOW() THEN true
        WHEN LOWER(COALESCE(ss.plan_key, '')) = 'vip'
          AND LOWER(COALESCE(ss.status, '')) NOT IN ('canceled', 'unpaid', 'incomplete_expired', 'incomplete')
          AND COALESCE(ss.status, '') <> ''
        THEN true
        ELSE false
      END AS client_vip_club_active
    FROM live_chat_sessions s
    LEFT JOIN users u ON s.user_id = u.id
    LEFT JOIN stripe_subscription_state ss ON ss.user_id = u.id
    LEFT JOIN assistant_leads al ON al.session_id = s.assistant_session_id
    ${extraSql}
  `;
}

export const whatsappUserQueries = {
  createOrUpdate: async (userData) => {
        const prisma = getPrisma();
    const existing = await prisma.whatsapp_users.findUnique({
      where: { phone_number: userData.phone_number },
    });
    if (existing) {
      const existingLanguage = existing.language || 'ru';
      const newLanguage = userData.language || 'ru';
      const languageToSave =
        existingLanguage !== 'ru' ? existingLanguage : newLanguage;
      const clean =
        userData.phone_number_clean != null && userData.phone_number_clean !== ''
          ? userData.phone_number_clean
          : existing.phone_number_clean;
      const fn =
        userData.first_name != null && userData.first_name !== ''
          ? userData.first_name
          : existing.first_name;
      const ln =
        userData.last_name != null && userData.last_name !== ''
          ? userData.last_name
          : existing.last_name;
      const ctry =
        userData.country != null && userData.country !== ''
          ? userData.country
          : existing.country;
      const row = await prisma.whatsapp_users.update({
        where: { phone_number: userData.phone_number },
        data: {
          phone_number_clean: clean,
          first_name: fn,
          last_name: ln,
          country: ctry,
          language: languageToSave,
          last_message_at: new Date(),
          message_count: { increment: 1 },
          updated_at: new Date(),
        },
      });
      return { lastInsertRowid: row.id, changes: 1 };
    }
    const row = await prisma.whatsapp_users.create({
      data: {
        phone_number: userData.phone_number,
        phone_number_clean: userData.phone_number_clean || null,
        first_name: userData.first_name || null,
        last_name: userData.last_name || null,
        country: userData.country || null,
        language: userData.language || 'ru',
        last_message_at: new Date(),
        message_count: 1,
        is_active: 1,
      },
    });
    return { lastInsertRowid: row.id, changes: 1 };
  },

  getByPhone: async (phoneNumber) => {
        const prisma = getPrisma();
    const row = await prisma.whatsapp_users.findUnique({
      where: { phone_number: phoneNumber },
    });
    return waToPlain(row);
  },

  getAll: async (limit = 100, offset = 0) => {
        const prisma = getPrisma();
    const rows = await prisma.whatsapp_users.findMany({
      orderBy: [{ last_message_at: 'desc' }, { created_at: 'desc' }],
      take: limit,
      skip: offset,
    });
    return rows.map(waToPlain);
  },

  getCount: async () => {
        return getPrisma().whatsapp_users.count();
  },

  getActive: async (limit = 100, offset = 0) => {
        const prisma = getPrisma();
    const rows = await prisma.whatsapp_users.findMany({
      where: { is_active: 1 },
      orderBy: { last_message_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map(waToPlain);
  },

  search: async (query, limit = 100, offset = 0) => {
        const q = String(query || '').trim();
    const prisma = getPrisma();
    if (!q) {
      const rows = await prisma.whatsapp_users.findMany({
        orderBy: { last_message_at: 'desc' },
        take: limit,
        skip: offset,
      });
      return rows.map(waToPlain);
    }
    const rows = await prisma.whatsapp_users.findMany({
      where: {
        OR: [
          { phone_number: { contains: q, mode: 'insensitive' } },
          { phone_number_clean: { contains: q, mode: 'insensitive' } },
          { first_name: { contains: q, mode: 'insensitive' } },
          { last_name: { contains: q, mode: 'insensitive' } },
          { country: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { last_message_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map(waToPlain);
  },

  updateActiveStatus: async (phoneNumber, isActive) => {
        const prisma = getPrisma();
    const row = await prisma.whatsapp_users.update({
      where: { phone_number: phoneNumber },
      data: {
        is_active: isActive ? 1 : 0,
        updated_at: new Date(),
      },
    });
    return { changes: 1 };
  },

  delete: async (phoneNumber) => {
        const prisma = getPrisma();
    const existing = await prisma.whatsapp_users.findUnique({
      where: { phone_number: phoneNumber },
    });
    if (!existing) return { changes: 0 };
    await prisma.whatsapp_users.delete({ where: { phone_number: phoneNumber } });
    return { changes: 1 };
  },

  updateLeadType: async (phoneNumber, leadType) => {
        const allowed = new Set(['hot', 'warm', 'cold']);
    if (!phoneNumber || !allowed.has(leadType)) return { changes: 0, inserted: false };
    const prisma = getPrisma();
    const existing = await prisma.whatsapp_users.findUnique({
      where: { phone_number: phoneNumber },
    });
    if (existing) {
      const row = await prisma.whatsapp_users.update({
        where: { phone_number: phoneNumber },
        data: { lead_type: leadType, updated_at: new Date() },
      });
      return { changes: 1, inserted: false };
    }
    const clean = String(phoneNumber)
      .replace(/@c\.us$/i, '')
      .replace(/@g\.us$/i, '');
    const row = await prisma.whatsapp_users.create({
      data: {
        phone_number: phoneNumber,
        phone_number_clean: clean || null,
        language: 'ru',
        lead_type: leadType,
        last_message_at: new Date(),
        message_count: 0,
        is_active: 1,
      },
    });
    return { changes: 1, inserted: true };
  },
};

function buildAssistantUpsertPayload(data) {
  const { sessionId, userId, messages, preferences, email, phone } = data;
  const messagesStr = typeof messages === 'string' ? messages : JSON.stringify(messages || []);
  const preferencesStr =
    typeof preferences === 'string' ? preferences : JSON.stringify(preferences || {});
  const computedType = computeLeadType(messages, preferences);
  const summary = buildSummary(messages, preferences);
  const prefs = typeof preferences === 'object' ? preferences : JSON.parse(preferencesStr);
  const country =
    prefs.country || (prefs.location && String(prefs.location).split(/[,;]/)[0]) || null;
  const region = prefs.location || prefs.region || null;
  const propertyType = prefs.propertyType || null;
  const managerContactRequested =
    prefs.managerContactRequested || prefs.preferredContact ? 1 : 0;
  const preferredContact =
    prefs.preferredContact &&
    ['phone', 'email', 'whatsapp', 'telegram', 'live_chat'].includes(
      String(prefs.preferredContact)
    )
      ? String(prefs.preferredContact)
      : null;
  return {
    sessionId,
    userId,
    messagesStr,
    preferencesStr,
    computedType,
    summary,
    email,
    phone,
    country,
    region,
    propertyType,
    managerContactRequested,
    preferredContact,
  };
}

export const assistantLeadQueries = {
  upsert: async (data) => {
        const prisma = getPrisma();
    const p = buildAssistantUpsertPayload(data);
    const nowIso = new Date().toISOString();
    const existing = await prisma.assistant_leads.findUnique({
      where: { session_id: p.sessionId },
    });
    const leadType = existing
      ? mergeLeadTypes(existing.lead_type, p.computedType)
      : p.computedType;
    if (existing) {
      const emailOut =
        p.email != null && String(p.email).trim() !== ''
          ? String(p.email).trim()
          : existing.email;
      const phoneOut =
        p.phone != null && String(p.phone).trim() !== ''
          ? String(p.phone).trim()
          : existing.phone;
      const prefOut =
        p.preferredContact != null && p.preferredContact !== ''
          ? p.preferredContact
          : existing.preferred_contact;
      const row = await prisma.assistant_leads.update({
        where: { session_id: p.sessionId },
        data: {
          user_id: p.userId || null,
          messages: p.messagesStr,
          preferences: p.preferencesStr,
          summary: p.summary,
          lead_type: leadType,
          email: emailOut,
          phone: phoneOut,
          country: p.country,
          region: p.region,
          property_type: p.propertyType,
          manager_contact_requested: p.managerContactRequested,
          preferred_contact: prefOut,
          updated_at: nowIso,
        },
      });
      return { id: row.id, created: false };
    }
    const row = await prisma.assistant_leads.create({
      data: {
        session_id: p.sessionId,
        user_id: p.userId || null,
        messages: p.messagesStr,
        preferences: p.preferencesStr,
        summary: p.summary,
        lead_type: leadType,
        email: p.email || null,
        phone: p.phone || null,
        country: p.country,
        region: p.region,
        property_type: p.propertyType,
        manager_contact_requested: p.managerContactRequested,
        preferred_contact: p.preferredContact,
        created_at: nowIso,
        updated_at: nowIso,
      },
    });
    return { id: row.id, created: true };
  },

  getAll: async () => {
        const prisma = getPrisma();
    const rows = await prisma.assistant_leads.findMany({
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        session_id: true,
        user_id: true,
        summary: true,
        lead_type: true,
        email: true,
        phone: true,
        country: true,
        region: true,
        property_type: true,
        manager_contact_requested: true,
        preferred_contact: true,
        created_at: true,
        updated_at: true,
      },
    });
    return rows.map(leadListRowToPlain);
  },

  getById: async (id) => {
        const prisma = getPrisma();
    const row = await prisma.assistant_leads.findUnique({
      where: { id: Number(id) },
    });
    return normalizeAssistantLeadRow(row);
  },

  updateLeadTypeByPhoneDigits: async (digitsOnly, leadType) => {
        const allowed = new Set(['hot', 'warm', 'cold']);
    if (!digitsOnly || !allowed.has(leadType)) return 0;
    const prisma = getPrisma();
    const rows = (
      await prisma.assistant_leads.findMany({
        select: { id: true, phone: true, lead_type: true },
      })
    ).filter((r) => r.phone != null && String(r.phone).trim() !== '');
    const norm = (p) => String(p || '').replace(/\D/g, '');
    const nowIso = new Date().toISOString();
    let n = 0;
    for (const row of rows) {
      if (norm(row.phone) === digitsOnly) {
        const merged = mergeLeadTypes(row.lead_type, leadType);
        const updated = await prisma.assistant_leads.update({
          where: { id: row.id },
          data: { lead_type: merged, updated_at: nowIso },
        });
        n++;
      }
    }
    return n;
  },
};

function liveChatUserAliases(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return [];
  return [`user_${uid}`, `admin_purchase_user_${uid}`, String(uid)];
}

function canonicalLiveChatAssistantId(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return null;
  return `user_${uid}`;
}

function pickCanonicalLiveSession(sessions, userId) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const preferredAsst = canonicalLiveChatAssistantId(userId);
  return (
    sessions.find((s) => s.assistant_session_id === preferredAsst) ||
    sessions.find((s) => Number(s.user_id) === Number(userId)) ||
    sessions[0]
  );
}

async function findSessionsForRegisteredUser(prisma, userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) return [];
  const aliases = liveChatUserAliases(uid);
  return prisma.live_chat_sessions.findMany({
    where: {
      OR: [{ user_id: uid }, { assistant_session_id: { in: aliases } }],
    },
    orderBy: { id: 'asc' },
  });
}

export const liveChatQueries = {
  findLatestSessionByAssistantId: async (assistantSessionId) => {
        const asst = assistantSessionId && String(assistantSessionId).trim();
    if (!asst) return null;
    const prisma = getPrisma();
    const row = await prisma.live_chat_sessions.findFirst({
      where: { assistant_session_id: asst },
      orderBy: { id: 'desc' },
    });
    return liveSessionToPlain(row);
  },

  findLatestSessionByUserId: async (userId) => {
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) return null;
    const prisma = getPrisma();
    const row = await prisma.live_chat_sessions.findFirst({
      where: { user_id: uid },
      orderBy: { updated_at: 'desc' },
    });
    return liveSessionToPlain(row);
  },

  /** Один диалог на зарегистрированного пользователя: склеивает дубли и возвращает каноническую сессию. */
  mergeSessionsForUser: async (userId) => {
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) return null;
    const prisma = getPrisma();
    const sessions = await findSessionsForRegisteredUser(prisma, uid);
    if (sessions.length === 0) return null;
    const canonical = pickCanonicalLiveSession(sessions, uid);
    const extras = sessions.filter((s) => s.id !== canonical.id);
    const preferredAsst = canonicalLiveChatAssistantId(uid);
    const needsNormalize =
      Number(canonical.user_id) !== uid ||
      canonical.assistant_session_id !== preferredAsst;

    if (extras.length === 0 && !needsNormalize) {
      return liveSessionToPlain(canonical);
    }

    await prisma.$transaction(async (tx) => {
      const readIds = [canonical.admin_last_read_message_id, ...extras.map((s) => s.admin_last_read_message_id)]
        .map((n) => Number(n) || 0);
      const maxRead = Math.max(0, ...readIds);
      for (const extra of extras) {
        await tx.live_chat_messages.updateMany({
          where: { session_id: extra.id },
          data: { session_id: canonical.id },
        });
        await tx.live_chat_sessions.delete({ where: { id: extra.id } });
      }
      await tx.live_chat_sessions.update({
        where: { id: canonical.id },
        data: {
          user_id: uid,
          assistant_session_id: preferredAsst,
          admin_last_read_message_id: maxRead,
          updated_at: new Date(),
        },
      });
    });
    const merged = await prisma.live_chat_sessions.findUnique({ where: { id: canonical.id } });
    return liveSessionToPlain(merged);
  },

  mergeDuplicateUserSessions: async () => {
    const prisma = getPrisma();
    const grouped = await prisma.$queryRaw`
      SELECT user_id
      FROM live_chat_sessions
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      HAVING COUNT(*) > 1
    `;
    const ids = new Set(
      (Array.isArray(grouped) ? grouped : [])
        .map((row) => Number(row.user_id))
        .filter((id) => Number.isFinite(id) && id > 0),
    );
    const aliasRows = await prisma.live_chat_sessions.findMany({
      where: { assistant_session_id: { startsWith: 'admin_purchase_user_' } },
      select: { assistant_session_id: true },
    });
    for (const row of aliasRows) {
      const match = String(row.assistant_session_id || '').match(/^admin_purchase_user_(\d+)$/);
      if (match) ids.add(Number(match[1]));
    }
    for (const uid of ids) {
      await liveChatQueries.mergeSessionsForUser(uid);
    }
  },

  appendSystemNoticeIfNew: async (sessionId, waitMessage) => {
    const text = waitMessage && String(waitMessage).trim();
    const sid = parseInt(sessionId, 10);
    if (!text || !Number.isFinite(sid)) return false;
    const prisma = getPrisma();
    const last = await prisma.live_chat_messages.findFirst({
      where: { session_id: sid },
      orderBy: { id: 'desc' },
      select: { sender_role: true, body: true },
    });
    if (last && last.sender_role === 'system' && String(last.body || '').trim() === text) {
      return false;
    }
    const msgId = await liveChatQueries.addMessage(sid, 'system', text);
    return Boolean(msgId);
  },

  createSession: async ({ userId, assistantSessionId, waitMessage }) => {
        const prisma = getPrisma();
    const token = randomUUID();
    const asst =
      (userId && Number.isFinite(Number(userId)) && Number(userId) > 0
        ? `user_${Number(userId)}`
        : null) ||
      (assistantSessionId ? String(assistantSessionId).trim() : null);
    const label =
      (asst && String(asst).replace(/^user_/, '').slice(0, 72)) || 'Гость';
    const body =
      (waitMessage && String(waitMessage).trim()) ||
      'Подождите, скоро ответит менеджер.';
    const session = await prisma.$transaction(async (tx) => {
      const s = await tx.live_chat_sessions.create({
        data: {
          public_token: token,
          user_id: userId || null,
          assistant_session_id: asst,
          display_label: label,
        },
      });
      await tx.live_chat_messages.create({
        data: {
          session_id: s.id,
          sender_role: 'system',
          body: String(body).slice(0, 2000),
        },
      });
      return tx.live_chat_sessions.update({
        where: { id: s.id },
        data: { updated_at: new Date() },
      });
    });
    const msgs = await prisma.live_chat_messages.findMany({
      where: { session_id: session.id },
      orderBy: { id: 'asc' },
    });
    for (const m of msgs) {
    }
    return { id: session.id, public_token: token };
  },

  getSessionByToken: async (token) => {
        if (!token) return null;
    const prisma = getPrisma();
    const row = await prisma.live_chat_sessions.findUnique({
      where: { public_token: String(token) },
    });
    return liveSessionToPlain(row);
  },

  getSessionById: async (id) => {
        const n = parseInt(id, 10);
    if (isNaN(n)) return null;
    const prisma = getPrisma();
    const row = await prisma.live_chat_sessions.findUnique({ where: { id: n } });
    return liveSessionToPlain(row);
  },

  listSessionsForAdmin: async () => {
        await liveChatQueries.mergeDuplicateUserSessions();
        const prisma = getPrisma();
    const rows = await prisma.$queryRaw(
      adminLiveChatSessionListQuery(Prisma.sql`ORDER BY s.updated_at DESC NULLS LAST`)
    );
    return Array.isArray(rows) ? rows.map(normalizeAdminListRow) : rows;
  },

  getSessionListRowById: async (id) => {
        const n = parseInt(id, 10);
    if (isNaN(n)) return null;
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw(
      adminLiveChatSessionListQuery(Prisma.sql`WHERE s.id = ${n}`)
    );
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    return row ? normalizeAdminListRow(row) : null;
  },

  getMessages: async (sessionId, sinceId = 0) => {
        const prisma = getPrisma();
    const sid = parseInt(sessionId, 10);
    const since = parseInt(sinceId, 10) || 0;
    if (isNaN(sid)) return [];
    const rows = await prisma.live_chat_messages.findMany({
      where: { session_id: sid, id: { gt: since } },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        sender_role: true,
        body: true,
        created_at: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      sender_role: r.sender_role,
      body: r.body,
      created_at:
        r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    }));
  },

  addMessage: async (sessionId, senderRole, body) => {
        const prisma = getPrisma();
    const sid = parseInt(sessionId, 10);
    const text = String(body || '').trim();
    if (isNaN(sid) || !text) return null;
    const allowed = new Set(['user', 'manager', 'system']);
    if (!allowed.has(senderRole)) return null;
    const msg = await prisma.live_chat_messages.create({
      data: {
        session_id: sid,
        sender_role: senderRole,
        body: text.slice(0, 10000),
      },
    });
    const sess = await prisma.live_chat_sessions.update({
      where: { id: sid },
      data: { updated_at: new Date() },
    });
    return msg.id;
  },

  getMessageRow: async (sessionId, messageId) => {
        const prisma = getPrisma();
    const sid = parseInt(sessionId, 10);
    const mid = parseInt(messageId, 10);
    if (isNaN(sid) || isNaN(mid)) return null;
    const row = await prisma.live_chat_messages.findFirst({
      where: { session_id: sid, id: mid },
      select: {
        id: true,
        sender_role: true,
        body: true,
        created_at: true,
      },
    });
    return liveMsgToPlain(row);
  },

  markSessionRead: async (id) => {
    const n = parseInt(id, 10);
    if (isNaN(n)) return null;
    const prisma = getPrisma();
    await prisma.$executeRaw`
      UPDATE live_chat_sessions
      SET admin_last_read_message_id = COALESCE(
        (SELECT MAX(m.id) FROM live_chat_messages m WHERE m.session_id = live_chat_sessions.id),
        0
      )
      WHERE id = ${n}
    `;
    return liveChatQueries.getSessionListRowById(n);
  },

  markAllSessionsRead: async () => {
    const prisma = getPrisma();
    await prisma.$executeRaw`
      UPDATE live_chat_sessions
      SET admin_last_read_message_id = COALESCE(
        (SELECT MAX(m.id) FROM live_chat_messages m WHERE m.session_id = live_chat_sessions.id),
        0
      )
    `;
    return { ok: true };
  },

  countUnreadUserMessages: async () => {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw`
      SELECT COALESCE(SUM(u.cnt), 0)::int AS count
      FROM (
        SELECT (
          SELECT COUNT(*)::int
          FROM live_chat_messages m
          WHERE m.session_id = s.id
            AND LOWER(m.sender_role) IN ('user', 'client', 'visitor')
            AND m.id > COALESCE(s.admin_last_read_message_id, 0)
        ) AS cnt
        FROM live_chat_sessions s
      ) u
    `;
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    return Number(row?.count || 0);
  },
};
