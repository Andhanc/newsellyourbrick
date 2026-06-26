import { seoAdminQueries } from './database/seoAdminPrisma.js';
import { invalidateSeoTemplateCache } from './seoTemplateEngine.js';
import { enumeratePublicSeoPages } from './seoPageCatalog.js';
import { resolveSeoForPath } from './seoHtmlRender.js';
import { mergeSeoOverride } from '../shared/seoOverrides.js';
import {
  resolveSeoRole,
  canAccessSeoPanel,
  seoCanEditPages,
  seoCanEditSocial,
  seoCanEditTemplates,
  seoCanManageRedirects,
  seoCanManageSitemap,
  seoCanRollbackHistory,
  seoCanBulkEdit,
} from '../shared/seoAdminRoles.js';

const IMPORTANT_STATIC_PATHS = new Set(['/', '/auction', '/debts', '/co-investment', '/news']);

function parseAdminFromRequest(req) {
  const raw = req.headers['x-admin-context'];
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function requireSeoAccess(req, res, minRole = null) {
  const admin = parseAdminFromRequest(req);
  if (!canAccessSeoPanel(admin)) {
    res.status(403).json({ success: false, error: 'Нет доступа к SEO-кабинету' });
    return null;
  }
  const role = resolveSeoRole(admin);
  if (minRole === 'editor' && !seoCanEditPages(role)) {
    res.status(403).json({ success: false, error: 'Недостаточно прав' });
    return null;
  }
  if (minRole === 'marketer' && !seoCanEditSocial(role)) {
    res.status(403).json({ success: false, error: 'Недостаточно прав маркетолога' });
    return null;
  }
  if (minRole === 'admin' && role !== 'admin') {
    res.status(403).json({ success: false, error: 'Только админ SEO' });
    return null;
  }
  return { admin, role };
}

function mergePageRow(page, override, defaultSeo) {
  const title = override?.title || defaultSeo?.title || '';
  const description = override?.meta_description || defaultSeo?.description || '';
  const robotsIndex = override?.robots_index === 0 ? 'noindex' : 'index';
  const sitemapInclude = override?.sitemap_include === 0 ? false : true;

  return {
    path: page.path,
    pageType: page.pageType,
    label: page.label,
    title,
    description,
    h1: override?.h1 || defaultSeo?.h1 || '',
    canonical: override?.canonical_path || defaultSeo?.canonicalPath || page.path,
    robotsIndex,
    targetKeywords: override?.target_keywords || '',
    seoNotes: override?.seo_notes || '',
    ogTitle: override?.og_title || title,
    ogDescription: override?.og_description || description,
    ogImage: override?.og_image || defaultSeo?.ogImage || '',
    twitterCard: override?.twitter_card || 'summary_large_image',
    sitemapInclude,
    sitemapPriority: override?.sitemap_priority ?? null,
    sitemapChangefreq: override?.sitemap_changefreq ?? null,
    sitemapLastmod: override?.sitemap_lastmod || page.lastmod || null,
    updatedAt: override?.updated_at || page.lastmod || null,
    hasOverride: Boolean(override),
    overrideId: override?.id ?? null,
  };
}

async function resolveDefaultSeo(path, origin) {
  try {
    return await resolveSeoForPath(path, { origin, lang: 'ru_RU' });
  } catch {
    return { title: '', description: '', canonicalPath: path };
  }
}

function runSeoChecks(pages, origin) {
  const issues = [];
  const titleMap = new Map();

  for (const page of pages) {
    const titleLen = String(page.title || '').length;
    const descLen = String(page.description || '').length;

    if (!page.title?.trim()) {
      issues.push({ path: page.path, severity: 'error', code: 'empty_title', message: 'Пустой title' });
    }
    if (!page.description?.trim()) {
      issues.push({ path: page.path, severity: 'warning', code: 'empty_description', message: 'Пустое meta description' });
    }
    if (titleLen > 0 && (titleLen < 30 || titleLen > 65)) {
      issues.push({
        path: page.path,
        severity: 'warning',
        code: 'title_length',
        message: `Длина title: ${titleLen} (рекомендуется 30–60)`,
      });
    }
    if (descLen > 0 && (descLen < 70 || descLen > 165)) {
      issues.push({
        path: page.path,
        severity: 'warning',
        code: 'description_length',
        message: `Длина description: ${descLen} (рекомендуется 120–160)`,
      });
    }

    const canonical = String(page.canonical || '');
    if (canonical.startsWith('http') && origin && !canonical.startsWith(origin)) {
      issues.push({ path: page.path, severity: 'error', code: 'canonical_origin', message: 'Canonical на другой домен' });
    }
    if (canonical && !canonical.startsWith('/') && !canonical.startsWith('http')) {
      issues.push({ path: page.path, severity: 'error', code: 'canonical_invalid', message: 'Некорректный canonical' });
    }

    if (page.robotsIndex === 'noindex' && IMPORTANT_STATIC_PATHS.has(page.path)) {
      issues.push({
        path: page.path,
        severity: 'error',
        code: 'noindex_important',
        message: 'noindex на важной странице',
      });
    }

    const titleKey = String(page.title || '').trim().toLowerCase();
    if (titleKey) {
      const prev = titleMap.get(titleKey) || [];
      prev.push(page.path);
      titleMap.set(titleKey, prev);
    }
  }

  for (const [title, paths] of titleMap) {
    if (paths.length > 1) {
      issues.push({
        path: paths.join(', '),
        severity: 'warning',
        code: 'duplicate_title',
        message: `Дублирующийся title: «${title}» (${paths.length} стр.)`,
      });
    }
  }

  return issues;
}

function pagesToCsv(rows) {
  const header = [
    'path',
    'pageType',
    'title',
    'meta_description',
    'h1',
    'canonical_path',
    'robots_index',
    'target_keywords',
    'og_title',
    'og_description',
    'og_image',
    'sitemap_include',
    'sitemap_priority',
  ];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      header
        .map((key) => {
          const val = row[key] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(','),
    );
  }
  return lines.join('\n');
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * @param {import('express').Express} app
 */
export function registerSeoAdminRoutes(app) {
  app.get('/api/admin/seo/meta', (req, res) => {
    const admin = parseAdminFromRequest(req);
    const role = resolveSeoRole(admin);
    res.json({
      success: true,
      data: {
        role,
        canEditPages: seoCanEditPages(role),
        canEditSocial: seoCanEditSocial(role),
        canEditTemplates: seoCanEditTemplates(role),
        canManageRedirects: seoCanManageRedirects(role),
        canManageSitemap: seoCanManageSitemap(role),
        canRollbackHistory: seoCanRollbackHistory(role),
        canBulkEdit: seoCanBulkEdit(role),
      },
    });
  });

  app.get('/api/admin/seo/pages', async (req, res) => {
    if (!requireSeoAccess(req, res)) return;
    try {
      const q = String(req.query.q || '').trim().toLowerCase();
      const pageType = String(req.query.pageType || '').trim();
      const origin = String(req.query.origin || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

      const [catalog, overrides] = await Promise.all([
        enumeratePublicSeoPages(),
        seoAdminQueries.getOverridesMap(),
      ]);

      let rows = catalog;
      if (pageType) rows = rows.filter((p) => p.pageType === pageType);
      if (q) {
        rows = rows.filter(
          (p) =>
            p.path.toLowerCase().includes(q) ||
            String(p.label || '').toLowerCase().includes(q) ||
            String(overrides.get(p.path)?.title || '').toLowerCase().includes(q),
        );
      }

      const limit = Math.min(Number(req.query.limit) || 200, 1000);
      const offset = Number(req.query.offset) || 0;
      const slice = rows.slice(offset, offset + limit);

      const merged = await Promise.all(
        slice.map(async (page) => {
          const override = overrides.get(page.path);
          const defaultSeo = await resolveDefaultSeo(page.path, origin);
          return mergePageRow(page, override, defaultSeo);
        }),
      );

      res.json({
        success: true,
        data: merged,
        meta: { total: rows.length, offset, limit },
      });
    } catch (error) {
      console.error('[seo-admin] pages', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/seo/pages/*', async (req, res) => {
    if (!requireSeoAccess(req, res)) return;
    try {
      const path = '/' + (req.params[0] || '');
      const origin = String(req.query.origin || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const override = await seoAdminQueries.getOverrideByPath(path);
      const defaultSeo = await resolveDefaultSeo(path, origin);
      const merged = mergePageRow(
        { path, pageType: override?.page_type || 'unknown', label: path, lastmod: null },
        override,
        defaultSeo,
      );
      res.json({ success: true, data: { ...merged, defaultSeo } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/admin/seo/pages/*', async (req, res) => {
    const ctx = requireSeoAccess(req, res, 'editor');
    if (!ctx) return;
    try {
      const path = '/' + (req.params[0] || '');
      const body = req.body || {};
      const changedBy = ctx.admin?.username || ctx.admin?.full_name || 'admin';

      if (body.og_title != null || body.og_description != null || body.og_image != null) {
        if (!seoCanEditSocial(ctx.role)) {
          return res.status(403).json({ success: false, error: 'Соцсети доступны маркетологу и админу' });
        }
      }

      if (
        body.sitemap_include != null ||
        body.sitemap_priority != null ||
        body.sitemap_changefreq != null ||
        body.sitemap_lastmod != null
      ) {
        if (!seoCanManageSitemap(ctx.role)) {
          return res.status(403).json({ success: false, error: 'Sitemap доступен только админу SEO' });
        }
      }

      const saved = await seoAdminQueries.upsertOverride(
        path,
        {
          page_type: body.pageType || body.page_type,
          title: body.title,
          meta_description: body.meta_description ?? body.description,
          h1: body.h1,
          canonical_path: body.canonical_path ?? body.canonical,
          robots_index: body.robots_index ?? (body.robotsIndex === 'noindex' ? 0 : body.robotsIndex === 'index' ? 1 : undefined),
          target_keywords: body.target_keywords ?? body.targetKeywords,
          seo_notes: body.seo_notes ?? body.seoNotes,
          og_title: body.og_title ?? body.ogTitle,
          og_description: body.og_description ?? body.ogDescription,
          og_image: body.og_image ?? body.ogImage,
          twitter_card: body.twitter_card ?? body.twitterCard,
          sitemap_include: body.sitemap_include ?? body.sitemapInclude,
          sitemap_priority: body.sitemap_priority ?? body.sitemapPriority,
          sitemap_changefreq: body.sitemap_changefreq ?? body.sitemapChangefreq,
          sitemap_lastmod: body.sitemap_lastmod ?? body.sitemapLastmod,
        },
        changedBy,
      );

      res.json({ success: true, data: saved });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/seo/checks', async (req, res) => {
    if (!requireSeoAccess(req, res)) return;
    try {
      const origin = String(req.query.origin || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const [catalog, overrides] = await Promise.all([
        enumeratePublicSeoPages(),
        seoAdminQueries.getOverridesMap(),
      ]);

      const merged = await Promise.all(
        catalog.slice(0, 500).map(async (page) => {
          const override = overrides.get(page.path);
          const defaultSeo = await resolveDefaultSeo(page.path, origin);
          return mergePageRow(page, override, defaultSeo);
        }),
      );

      const issues = runSeoChecks(merged, origin);
      res.json({
        success: true,
        data: {
          issues,
          summary: {
            errors: issues.filter((i) => i.severity === 'error').length,
            warnings: issues.filter((i) => i.severity === 'warning').length,
            checked: merged.length,
          },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/seo/templates', async (req, res) => {
    if (!requireSeoAccess(req, res)) return;
    try {
      const templates = await seoAdminQueries.getAllTemplates();
      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/admin/seo/templates/:pageType', async (req, res) => {
    const ctx = requireSeoAccess(req, res, 'marketer');
    if (!ctx) return;
    try {
      const changedBy = ctx.admin?.username || 'admin';
      const saved = await seoAdminQueries.upsertTemplate(req.params.pageType, req.body || {}, changedBy);
      invalidateSeoTemplateCache();
      res.json({ success: true, data: saved });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/seo/redirects', async (req, res) => {
    if (!requireSeoAccess(req, res)) return;
    try {
      const rows = await seoAdminQueries.getAllRedirects();
      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/seo/redirects', async (req, res) => {
    const ctx = requireSeoAccess(req, res, 'admin');
    if (!ctx) return;
    try {
      const body = req.body || {};
      if (!body.from_path || !body.to_path) {
        return res.status(400).json({ success: false, error: 'Укажите from_path и to_path' });
      }
      const row = await seoAdminQueries.createRedirect({
        ...body,
        created_by: ctx.admin?.username || 'admin',
      });
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put('/api/admin/seo/redirects/:id', async (req, res) => {
    const ctx = requireSeoAccess(req, res, 'admin');
    if (!ctx) return;
    try {
      const row = await seoAdminQueries.updateRedirect(req.params.id, req.body || {});
      res.json({ success: true, data: row });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/admin/seo/redirects/:id', async (req, res) => {
    const ctx = requireSeoAccess(req, res, 'admin');
    if (!ctx) return;
    try {
      await seoAdminQueries.deleteRedirect(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/seo/history/*', async (req, res) => {
    if (!requireSeoAccess(req, res)) return;
    try {
      const path = '/' + (req.params[0] || '');
      const rows = await seoAdminQueries.getHistory(path);
      res.json({ success: true, data: rows });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/seo/history/:id/rollback', async (req, res) => {
    const ctx = requireSeoAccess(req, res, 'admin');
    if (!ctx) return;
    try {
      const entry = await seoAdminQueries.getHistoryById(req.params.id);
      if (!entry) return res.status(404).json({ success: false, error: 'Запись не найдена' });
      const snapshot = JSON.parse(entry.snapshot);
      const changedBy = ctx.admin?.username || 'admin';
      const saved = await seoAdminQueries.upsertOverride(entry.path, snapshot, changedBy);
      await seoAdminQueries.addHistory(entry.path, saved, changedBy, 'rollback');
      res.json({ success: true, data: saved });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/admin/seo/export', async (req, res) => {
    if (!requireSeoAccess(req, res)) return;
    try {
      const overrides = await seoAdminQueries.getAllOverrides();
      const csv = pagesToCsv(overrides);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="seo-overrides.csv"');
      res.send('\uFEFF' + csv);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/seo/import', async (req, res) => {
    const ctx = requireSeoAccess(req, res, 'editor');
    if (!ctx) return;
    if (!seoCanBulkEdit(ctx.role)) {
      return res.status(403).json({ success: false, error: 'Нет прав на массовый импорт' });
    }
    try {
      const csv = String(req.body?.csv || '');
      const lines = csv.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        return res.status(400).json({ success: false, error: 'CSV пустой' });
      }
      const header = parseCsvLine(lines[0]);
      const changedBy = ctx.admin?.username || 'admin';
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        /** @type {Record<string, string>} */
        const row = {};
        header.forEach((key, idx) => {
          row[key.trim()] = cols[idx]?.trim() ?? '';
        });
        if (!row.path) continue;
        await seoAdminQueries.upsertOverride(
          row.path,
          {
            page_type: row.pageType || row.page_type,
            title: row.title || null,
            meta_description: row.meta_description || null,
            h1: row.h1 || null,
            canonical_path: row.canonical_path || null,
            robots_index: row.robots_index === '0' ? 0 : row.robots_index === 'noindex' ? 0 : 1,
            target_keywords: row.target_keywords || null,
            og_title: row.og_title || null,
            og_description: row.og_description || null,
            og_image: row.og_image || null,
            sitemap_include: row.sitemap_include === '0' ? 0 : 1,
            sitemap_priority: row.sitemap_priority ? Number(row.sitemap_priority) : null,
          },
          changedBy,
        );
        imported++;
      }
      res.json({ success: true, data: { imported } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/admin/seo/sitemap/refresh', async (req, res) => {
    const ctx = requireSeoAccess(req, res, 'admin');
    if (!ctx) return;
    res.json({
      success: true,
      message: 'Sitemap обновится при следующем запросе /sitemap.xml (кэш ~30 мин)',
    });
  });
}
