import { getPrisma } from './prismaClient.js';


function parseCrmInterests(raw) {
  if (!raw) return [];
  try {
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

function normalizeCrmLeadRow(row) {
  if (!row) return null;
  return { ...row, interests: parseCrmInterests(row.interests) };
}

function normalizeRawRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const k of Object.keys(out)) {
    const v = out[k];
    if (typeof v === 'bigint') out[k] = Number(v);
    else if (v instanceof Date) out[k] = v.toISOString();
  }
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

async function ensureStagesPg() {
  const prisma = getPrisma();
  const count = await prisma.crm_stages.count();
  if (count > 0) return;
  const defaults = [
    { slug: 'new', label: 'Новый', sort_order: 0 },
    { slug: 'qualified', label: 'Квалифицирован', sort_order: 1 },
    { slug: 'negotiation', label: 'Переговоры', sort_order: 2 },
    { slug: 'proposal', label: 'Предложение', sort_order: 3 },
    { slug: 'closed_won', label: 'Сделка', sort_order: 4 },
    { slug: 'closed_lost', label: 'Отказ', sort_order: 5 },
  ];
  for (const row of defaults) {
    await prisma.crm_stages.create({ data: row });
  }
}

async function getStageIdBySlugPg(slug) {
  await ensureStagesPg();
  const row = await getPrisma().crm_stages.findUnique({
    where: { slug: String(slug) },
    select: { id: true },
  });
  return row ? row.id : null;
}

export const crmQueries = {
  ensureStages: async () => {
        return ensureStagesPg();
  },

  getStages: async () => {
        await ensureStagesPg();
    return getPrisma().crm_stages.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] });
  },

  getBoard: async () => {
        await ensureStagesPg();
    const stages = await getPrisma().crm_stages.findMany({ orderBy: [{ sort_order: 'asc' }, { id: 'asc' }] });
    const leads = (
      await getPrisma().crm_leads.findMany({
        select: {
          id: true,
          user_id: true,
          display_name: true,
          email: true,
          phone: true,
          stage_id: true,
          sort_order: true,
          temperature: true,
          interests: true,
          deal_value: true,
          currency: true,
          next_action: true,
          next_action_at: true,
          internal_notes: true,
          source: true,
          assistant_lead_id: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [{ stage_id: 'asc' }, { sort_order: 'asc' }, { id: 'asc' }],
      })
    ).map(normalizeCrmLeadRow);
    const byStage = {};
    for (const s of stages) byStage[s.id] = [];
    for (const L of leads) {
      if (!byStage[L.stage_id]) byStage[L.stage_id] = [];
      byStage[L.stage_id].push(L);
    }
    return { stages, leadsByStage: byStage };
  },

  getLeadById: async (id) => {
        const row = await getPrisma().crm_leads.findUnique({ where: { id: Number(id) } });
    return normalizeCrmLeadRow(row);
  },

  countActivities: async (leadId) => {
        return getPrisma().crm_activities.count({ where: { lead_id: Number(leadId) } });
  },

  countTouchActivities: async (leadId) => {
        return getPrisma().crm_activities.count({
      where: {
        lead_id: Number(leadId),
        kind: { in: ['email_sent', 'call', 'meeting', 'whatsapp'] },
      },
    });
  },

  getFavoriteCountForUser: async (userId) => {
        const uid = parseInt(userId, 10);
    if (!uid) return 0;
    return getPrisma().property_favorites.count({ where: { user_id: uid } });
  },

  searchUsers: async (q, limit = 25) => {
        const term = String(q || '').trim();
    if (!term) return [];
    const rows = await getPrisma().users.findMany({
      where: {
        OR: [
          { email: { contains: term, mode: 'insensitive' } },
          { first_name: { contains: term, mode: 'insensitive' } },
          { last_name: { contains: term, mode: 'insensitive' } },
          { phone_number: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone_number: true,
        role: true,
        country: true,
      },
      orderBy: { created_at: 'desc' },
      take: Math.min(limit, 100),
    });
    return rows;
  },

  getStageIdBySlug: async (slug) => {
        return getStageIdBySlugPg(slug);
  },

  createLead: async (data) => {
        await ensureStagesPg();
    const prisma = getPrisma();
    let stageId = data.stage_id || (await getStageIdBySlugPg('new'));
    if (!stageId) {
      const first = await prisma.crm_stages.findFirst({ orderBy: { sort_order: 'asc' }, select: { id: true } });
      stageId = first?.id;
    }
    const maxRow = await prisma.crm_leads.aggregate({
      _max: { sort_order: true },
      where: { stage_id: stageId },
    });
    const sortOrder = (maxRow?._max?.sort_order ?? -1) + 1;
    const interestsStr =
      typeof data.interests === 'string'
        ? data.interests
        : JSON.stringify(Array.isArray(data.interests) ? data.interests : []);
    const row = await prisma.crm_leads.create({
      data: {
        user_id: data.user_id || null,
        display_name: data.display_name || 'Без имени',
        email: data.email || null,
        phone: data.phone || null,
        stage_id: stageId,
        sort_order: sortOrder,
        temperature: data.temperature || 'warm',
        interests: interestsStr,
        deal_value: data.deal_value != null ? Number(data.deal_value) : null,
        currency: data.currency || 'EUR',
        next_action: data.next_action || null,
        next_action_at: data.next_action_at || null,
        internal_notes: data.internal_notes || null,
        source: data.source || 'manual',
        assistant_lead_id: data.assistant_lead_id || null,
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    });
    return row.id;
  },

  updateLead: async (id, data) => {
        const existing = await getPrisma().crm_leads.findUnique({ where: { id: Number(id) } });
    if (!existing) return { changes: 0 };
    const patch = {};
    const map = {
      display_name: (v) => v,
      email: (v) => v,
      phone: (v) => v,
      temperature: (v) => v,
      deal_value: (v) => (v != null ? Number(v) : null),
      currency: (v) => v,
      next_action: (v) => v,
      next_action_at: (v) => v,
      internal_notes: (v) => v,
      interests: (v) => (typeof v === 'string' ? v : JSON.stringify(Array.isArray(v) ? v : [])),
    };
    for (const key of Object.keys(map)) {
      if (Object.prototype.hasOwnProperty.call(data, key)) patch[key] = map[key](data[key]);
    }
    if (Object.keys(patch).length === 0) return { changes: 0 };
    patch.updated_at = nowIso();
    await getPrisma().crm_leads.update({ where: { id: Number(id) }, data: patch });
    return { changes: 1 };
  },

  deleteLead: async (id) => {
        await getPrisma().crm_leads.delete({ where: { id: Number(id) } });
    return { changes: 1 };
  },

  moveLead: async (leadId, toStageId, toIndex) => {
        const prisma = getPrisma();
    const id = Number(leadId);
    const destStage = Number(toStageId);
    const lead = await prisma.crm_leads.findUnique({ where: { id } });
    if (!lead) throw new Error('Лид не найден');
    const fromStage = lead.stage_id;

    await prisma.$transaction(async (tx) => {
      if (fromStage === destStage) {
        const ids = (
          await tx.crm_leads.findMany({
            where: { stage_id: fromStage },
            select: { id: true },
            orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
          })
        ).map((r) => r.id);
        const filtered = ids.filter((x) => x !== id);
        const idx = Math.max(0, Math.min(Number(toIndex), filtered.length));
        filtered.splice(idx, 0, id);
        for (let i = 0; i < filtered.length; i++) {
          await tx.crm_leads.update({
            where: { id: filtered[i] },
            data: { sort_order: i, updated_at: nowIso() },
          });
        }
        return;
      }

      const oldIds = (
        await tx.crm_leads.findMany({
          where: { stage_id: fromStage },
          select: { id: true },
          orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
        })
      )
        .map((r) => r.id)
        .filter((x) => x !== id);
      for (let i = 0; i < oldIds.length; i++) {
        await tx.crm_leads.update({
          where: { id: oldIds[i] },
          data: { sort_order: i, updated_at: nowIso() },
        });
      }

      const newIds = (
        await tx.crm_leads.findMany({
          where: { stage_id: destStage },
          select: { id: true },
          orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
        })
      ).map((r) => r.id);
      const idx = Math.max(0, Math.min(Number(toIndex), newIds.length));
      newIds.splice(idx, 0, id);
      for (let i = 0; i < newIds.length; i++) {
        await tx.crm_leads.update({
          where: { id: newIds[i] },
          data: { stage_id: destStage, sort_order: i, updated_at: nowIso() },
        });
      }
    });
  },

  addActivity: async (leadId, { kind, title, body, meta, createdBy }) => {
        const metaStr = meta && typeof meta === 'object' ? JSON.stringify(meta) : meta || null;
    const row = await getPrisma().crm_activities.create({
      data: {
        lead_id: Number(leadId),
        kind,
        title: title || null,
        body: body || null,
        meta: metaStr,
        created_by: createdBy || null,
        created_at: nowIso(),
      },
    });
    await getPrisma().crm_leads.update({
      where: { id: Number(leadId) },
      data: { updated_at: nowIso() },
    });
    return row.id;
  },

  listActivities: async (leadId, limit = 200) => {
        const rows = await getPrisma().crm_activities.findMany({
      where: { lead_id: Number(leadId) },
      orderBy: { created_at: 'desc' },
      take: Math.min(limit, 500),
    });
    return rows.map(normalizeRawRow);
  },

  findLeadByUserId: async (userId) => {
        const uid = parseInt(userId, 10);
    if (!uid) return null;
    const row = await getPrisma().crm_leads.findFirst({ where: { user_id: uid } });
    return normalizeCrmLeadRow(row);
  },

  findLeadByAssistantId: async (assistantLeadId) => {
        const aid = parseInt(assistantLeadId, 10);
    if (!aid) return null;
    const row = await getPrisma().crm_leads.findFirst({ where: { assistant_lead_id: aid } });
    return normalizeCrmLeadRow(row);
  },
};
