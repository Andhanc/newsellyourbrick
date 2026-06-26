import { getPrisma } from './prismaClient.js';

function normalizePath(path) {
  const raw = String(path || '').trim();
  if (!raw) return '/';
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withSlash.split('?')[0].replace(/\/+$/, '') || '/';
}

function rowToOverride(row) {
  if (!row) return null;
  return {
    ...row,
    robots_index: row.robots_index == null ? 1 : Number(row.robots_index),
    sitemap_include: row.sitemap_include == null ? 1 : Number(row.sitemap_include),
  };
}

export const seoAdminQueries = {
  normalizePath,

  async getOverrideByPath(path) {
    const prisma = getPrisma();
    const row = await prisma.seo_page_overrides.findUnique({
      where: { path: normalizePath(path) },
    });
    return rowToOverride(row);
  },

  async getAllOverrides() {
    const prisma = getPrisma();
    const rows = await prisma.seo_page_overrides.findMany({
      orderBy: { updated_at: 'desc' },
    });
    return rows.map(rowToOverride);
  },

  async getOverridesMap() {
    const rows = await this.getAllOverrides();
    /** @type {Map<string, object>} */
    const map = new Map();
    for (const row of rows) map.set(row.path, row);
    return map;
  },

  async upsertOverride(path, data, changedBy = null) {
    const prisma = getPrisma();
    const normalized = normalizePath(path);
    const existing = await prisma.seo_page_overrides.findUnique({ where: { path: normalized } });

    const payload = {
      page_type: data.page_type ?? existing?.page_type ?? null,
      title: data.title ?? null,
      meta_description: data.meta_description ?? null,
      h1: data.h1 ?? null,
      canonical_path: data.canonical_path ?? null,
      robots_index: data.robots_index != null ? (data.robots_index ? 1 : 0) : existing?.robots_index ?? 1,
      target_keywords: data.target_keywords ?? null,
      seo_notes: data.seo_notes ?? null,
      og_title: data.og_title ?? null,
      og_description: data.og_description ?? null,
      og_image: data.og_image ?? null,
      twitter_card: data.twitter_card ?? existing?.twitter_card ?? 'summary_large_image',
      sitemap_include:
        data.sitemap_include != null ? (data.sitemap_include ? 1 : 0) : existing?.sitemap_include ?? 1,
      sitemap_priority: data.sitemap_priority != null ? Number(data.sitemap_priority) : existing?.sitemap_priority ?? null,
      sitemap_changefreq: data.sitemap_changefreq ?? existing?.sitemap_changefreq ?? null,
      sitemap_lastmod: data.sitemap_lastmod ? new Date(data.sitemap_lastmod) : existing?.sitemap_lastmod ?? null,
      updated_at: new Date(),
      updated_by: changedBy,
    };

    if (existing) {
      if (data.title === undefined) payload.title = existing.title;
      if (data.meta_description === undefined) payload.meta_description = existing.meta_description;
      if (data.h1 === undefined) payload.h1 = existing.h1;
      if (data.canonical_path === undefined) payload.canonical_path = existing.canonical_path;
      if (data.target_keywords === undefined) payload.target_keywords = existing.target_keywords;
      if (data.seo_notes === undefined) payload.seo_notes = existing.seo_notes;
      if (data.og_title === undefined) payload.og_title = existing.og_title;
      if (data.og_description === undefined) payload.og_description = existing.og_description;
      if (data.og_image === undefined) payload.og_image = existing.og_image;
    }

    const row = await prisma.seo_page_overrides.upsert({
      where: { path: normalized },
      create: { path: normalized, ...payload },
      update: payload,
    });

    await this.addHistory(normalized, row, changedBy, existing ? 'update' : 'create');
    return rowToOverride(row);
  },

  async deleteOverride(path) {
    const prisma = getPrisma();
    const normalized = normalizePath(path);
    await prisma.seo_page_overrides.deleteMany({ where: { path: normalized } });
  },

  async addHistory(path, snapshotRow, changedBy, action = 'update') {
    const prisma = getPrisma();
    await prisma.seo_page_history.create({
      data: {
        path: normalizePath(path),
        snapshot: JSON.stringify(snapshotRow),
        changed_by: changedBy,
        action,
      },
    });
  },

  async getHistory(path, limit = 50) {
    const prisma = getPrisma();
    return prisma.seo_page_history.findMany({
      where: { path: normalizePath(path) },
      orderBy: { changed_at: 'desc' },
      take: limit,
    });
  },

  async getHistoryById(id) {
    const prisma = getPrisma();
    return prisma.seo_page_history.findUnique({ where: { id: Number(id) } });
  },

  async getAllRedirects() {
    const prisma = getPrisma();
    return prisma.seo_redirects.findMany({ orderBy: { created_at: 'desc' } });
  },

  async getActiveRedirect(fromPath) {
    const prisma = getPrisma();
    const row = await prisma.seo_redirects.findFirst({
      where: { from_path: normalizePath(fromPath), is_active: 1 },
    });
    return row;
  },

  async createRedirect(data) {
    const prisma = getPrisma();
    return prisma.seo_redirects.create({
      data: {
        from_path: normalizePath(data.from_path),
        to_path: String(data.to_path || '').trim(),
        status_code: Number(data.status_code) === 302 ? 302 : 301,
        is_active: data.is_active === false || data.is_active === 0 ? 0 : 1,
        created_by: data.created_by || null,
      },
    });
  },

  async updateRedirect(id, data) {
    const prisma = getPrisma();
    return prisma.seo_redirects.update({
      where: { id: Number(id) },
      data: {
        from_path: data.from_path != null ? normalizePath(data.from_path) : undefined,
        to_path: data.to_path != null ? String(data.to_path).trim() : undefined,
        status_code: data.status_code != null ? (Number(data.status_code) === 302 ? 302 : 301) : undefined,
        is_active: data.is_active != null ? (data.is_active ? 1 : 0) : undefined,
      },
    });
  },

  async deleteRedirect(id) {
    const prisma = getPrisma();
    await prisma.seo_redirects.delete({ where: { id: Number(id) } });
  },

  async getAllTemplates() {
    const prisma = getPrisma();
    return prisma.seo_templates.findMany({ orderBy: { page_type: 'asc' } });
  },

  async getTemplate(pageType) {
    const prisma = getPrisma();
    return prisma.seo_templates.findUnique({ where: { page_type: String(pageType) } });
  },

  async upsertTemplate(pageType, data, changedBy = null) {
    const prisma = getPrisma();
    return prisma.seo_templates.upsert({
      where: { page_type: String(pageType) },
      create: {
        page_type: String(pageType),
        title_template: data.title_template ?? null,
        description_template: data.description_template ?? null,
        h1_template: data.h1_template ?? null,
        updated_by: changedBy,
      },
      update: {
        title_template: data.title_template ?? null,
        description_template: data.description_template ?? null,
        h1_template: data.h1_template ?? null,
        updated_at: new Date(),
        updated_by: changedBy,
      },
    });
  },
};
