import { getPrisma } from './prismaClient.js';

function adminToPlain(row) {
  if (!row) return null;
  const o = { ...row };
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
  if (o.updated_at instanceof Date) o.updated_at = o.updated_at.toISOString();
  return {
    ...o,
    is_super_admin: o.is_super_admin === 1,
    can_access_statistics: o.can_access_statistics === 1,
    can_access_users: o.can_access_users === 1,
    can_access_moderation: o.can_access_moderation === 1,
    can_access_chat: o.can_access_chat === 1,
    can_access_objects: o.can_access_objects === 1,
    can_access_access_management: o.can_access_access_management === 1,
    can_access_seo: o.can_access_seo === 1,
    seo_role: o.seo_role || null,
  };
}

export const administratorQueries = {
  create: async (adminData) => {
        const row = await getPrisma().administrators.create({
      data: {
        username: adminData.username,
        password: adminData.password,
        email: adminData.email || null,
        full_name: adminData.full_name || null,
        is_super_admin: adminData.is_super_admin ? 1 : 0,
        can_access_statistics: adminData.can_access_statistics ? 1 : 0,
        can_access_users: adminData.can_access_users ? 1 : 0,
        can_access_moderation: adminData.can_access_moderation ? 1 : 0,
        can_access_chat: adminData.can_access_chat ? 1 : 0,
        can_access_objects: adminData.can_access_objects ? 1 : 0,
        can_access_access_management: adminData.can_access_access_management ? 1 : 0,
        can_access_seo: adminData.can_access_seo ? 1 : 0,
        seo_role: adminData.seo_role || null,
        created_by: adminData.created_by || null,
      },
    });
    return { lastInsertRowid: row.id, changes: 1 };
  },

  getById: async (id) => {
        const row = await getPrisma().administrators.findUnique({ where: { id: Number(id) } });
    return adminToPlain(row);
  },

  getByUsername: async (username) => {
        const row = await getPrisma().administrators.findUnique({ where: { username } });
    return adminToPlain(row);
  },

  getByEmail: async (email) => {
        if (!email) return null;
    const rows = await getPrisma().administrators.findMany({
      where: { email: { equals: String(email), mode: 'insensitive' } },
      take: 1,
    });
    return adminToPlain(rows[0] || null);
  },

  getAll: async () => {
        const rows = await getPrisma().administrators.findMany({ orderBy: { created_at: 'desc' } });
    return rows.map(adminToPlain);
  },

  update: async (id, adminData) => {
        const row = await getPrisma().administrators.update({
      where: { id: Number(id) },
      data: {
        email: adminData.email || null,
        full_name: adminData.full_name || null,
        can_access_statistics: adminData.can_access_statistics ? 1 : 0,
        can_access_users: adminData.can_access_users ? 1 : 0,
        can_access_moderation: adminData.can_access_moderation ? 1 : 0,
        can_access_chat: adminData.can_access_chat ? 1 : 0,
        can_access_objects: adminData.can_access_objects ? 1 : 0,
        can_access_access_management: adminData.can_access_access_management ? 1 : 0,
        can_access_seo: adminData.can_access_seo ? 1 : 0,
        seo_role: adminData.seo_role !== undefined ? adminData.seo_role || null : undefined,
        updated_at: new Date(),
      },
    });
    return { changes: 1 };
  },

  updatePassword: async (id, hashedPassword) => {
        const row = await getPrisma().administrators.update({
      where: { id: Number(id) },
      data: { password: hashedPassword, updated_at: new Date() },
    });
    return { changes: 1 };
  },

  delete: async (id) => {
        await getPrisma().administrators.delete({ where: { id: Number(id) } });
    return { changes: 1 };
  },
};
