import {
  isNumericPropertyRouteParam,
  propertyTypeHintFromSlug,
} from '../shared/propertySlug.js';
import { propertyQueries } from './database/database.js';
import { propertySlugQueries } from './database/propertySlugPrisma.js';
import { seoAdminQueries } from './database/seoAdminPrisma.js';
import { buildAuctionPathFromLegacySearch } from '../src/utils/auctionFilterUrl.js';

const CO_INVESTMENT_PATH = '/co-investment';
const CO_INVESTMENT_LEGACY_PATH = '/shares';

function appendQuery(path, query) {
  const q = query || {};
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v != null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

async function resolvePropertyCanonicalPath(numericId, query = {}) {
  const typeHint = propertyTypeHintFromSlug(query.property_type) || query.property_type || null;
  const property = await propertyQueries.getById(Number(numericId), typeHint);
  if (!property) return null;

  let slug = property.slug;
  if (!slug && String(property.moderation_status || '').toLowerCase() === 'approved') {
    slug = await propertySlugQueries.ensureSlug({
      id: property.id,
      property_type: property.property_type,
      title: property.title,
      slug: property.slug,
      source_table: property.source_table || 'properties_apartments',
    });
  }
  if (!slug) return null;

  const nextQuery = { ...query };
  delete nextQuery.property_type;
  return appendQuery(`/property/${slug}`, nextQuery);
}

async function resolveCoInvestmentCanonicalPath(param, query = {}) {
  const raw = String(param || '').trim();
  if (!raw) return null;

  let property = null;
  if (isNumericPropertyRouteParam(raw)) {
    property = await propertyQueries.getById(Number(raw), null);
  } else {
    const shortMatch = raw.match(/^(apartment|commercial|house|villa)-(\d+)$/i);
    if (shortMatch) {
      property = await propertyQueries.getById(Number(shortMatch[2]), shortMatch[1].toLowerCase());
    } else {
      const hit = await propertySlugQueries.getBySlug(raw);
      if (hit) {
        property = await propertyQueries.getById(hit.row.id, hit.row.property_type);
      }
    }
  }

  if (!property) return null;

  let slug = property.slug;
  if (!slug && String(property.moderation_status || '').toLowerCase() === 'approved') {
    slug = await propertySlugQueries.ensureSlug({
      id: property.id,
      property_type: property.property_type,
      title: property.title,
      slug: property.slug,
      source_table: property.source_table || 'properties_apartments',
    });
  }
  if (!slug) return null;

  return appendQuery(`${CO_INVESTMENT_PATH}/${slug}`, query);
}

/**
 * HTTP 301 для устаревших URL (до SPA fallback).
 * @param {import('express').Express} app
 */
export function registerSeoRedirects(app) {
  app.use(async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    try {
      const hit = await seoAdminQueries.getActiveRedirect(req.path);
      if (hit?.to_path) {
        return res.redirect(Number(hit.status_code) === 302 ? 302 : 301, hit.to_path);
      }
    } catch (err) {
      console.warn('[seo-redirect-db]', err?.message || err);
    }
    return next();
  });

  app.get('/main', (_req, res) => res.redirect(301, '/auction'));
  app.get('/home-redesign', (_req, res) => res.redirect(301, '/'));

  app.get('/auction', (req, res, next) => {
    const q = new URLSearchParams();
    if (req.query.filter) q.set('filter', String(req.query.filter));
    if (req.query.category) q.set('category', String(req.query.category));
    const qs = q.toString();
    const target = buildAuctionPathFromLegacySearch(qs ? `?${qs}` : '');
    if (target && target !== '/auction') return res.redirect(301, target);
    return next();
  });

  // /deposit — редирект по роли только на клиенте (DepositRedirect)

  app.get(CO_INVESTMENT_LEGACY_PATH, (_req, res) =>
    res.redirect(301, CO_INVESTMENT_PATH),
  );

  const propertySubpaths = ['', '/test-drive', '/edit'];

  for (const sub of propertySubpaths) {
    app.get(`/property/:idOrSlug${sub}`, async (req, res, next) => {
      if (!isNumericPropertyRouteParam(req.params.idOrSlug)) return next();
      try {
        const target = await resolvePropertyCanonicalPath(req.params.idOrSlug, req.query);
        if (target) {
          const suffix = sub || '';
          const base = target.split('?')[0];
          const qs = target.includes('?') ? target.slice(target.indexOf('?')) : '';
          return res.redirect(301, `${base}${suffix}${qs}`);
        }
      } catch (err) {
        console.warn('[seo-redirect] property', err?.message || err);
      }
      return next();
    });
  }

  app.get(`${CO_INVESTMENT_LEGACY_PATH}/:idOrSlug`, async (req, res, next) => {
    const raw = String(req.params.idOrSlug || '').trim();
    if (!raw) return next();

    try {
      const target = await resolveCoInvestmentCanonicalPath(raw, req.query);
      if (target) return res.redirect(301, target);

      if (isNumericPropertyRouteParam(raw) || /^(apartment|commercial|house|villa)-/i.test(raw)) {
        return res.redirect(301, `${CO_INVESTMENT_PATH}/${raw}`);
      }
    } catch (err) {
      console.warn('[seo-redirect] co-investment legacy', err?.message || err);
    }
    return next();
  });

  app.get(`${CO_INVESTMENT_PATH}/:idOrSlug`, async (req, res, next) => {
    const raw = String(req.params.idOrSlug || '').trim();
    if (!raw) return next();
    const isLegacy =
      isNumericPropertyRouteParam(raw) || /^(apartment|commercial|house|villa)-\d+$/i.test(raw);
    if (!isLegacy) return next();

    try {
      const target = await resolveCoInvestmentCanonicalPath(raw, req.query);
      if (target) return res.redirect(301, target);
    } catch (err) {
      console.warn('[seo-redirect] co-investment', err?.message || err);
    }
    return next();
  });
}
