import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { isNumericPropertyRouteParam } from '../shared/propertySlug.js';
import { isKnownPublicAppPath } from '../shared/seoPublicRoutes.js';
import { propertySlugQueries } from './database/propertySlugPrisma.js';
import { getArticleBySlug } from './services/newsStore.js';
import { sendSeoSpaHtml } from './seoHtmlRender.js';
import { resolveWebDist } from './middleware/resolveWebDist.js';
import {
  CATALOG_TYPE_PLURALS,
  catalogPublicPageExists,
  isValidCatalogCountrySlug,
} from './catalogRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SKIP_PREFIXES = [
  '/api',
  '/uploads',
  '/health',
  '/assets',
  '/robots.txt',
  '/sitemap',
  '/favicon',
];

function isSkippablePath(path) {
  if (!path || path === '/') return false;
  return SKIP_PREFIXES.some((p) => path === p || path.startsWith(p));
}

function isApprovedPropertyRow(row) {
  return String(row?.moderation_status || '').toLowerCase() === 'approved';
}

async function propertySlugExists(slug) {
  const hit = await propertySlugQueries.getBySlug(slug);
  if (!hit?.row) return false;
  return isApprovedPropertyRow(hit.row);
}

/**
 * @param {string} path
 * @returns {Promise<'ok' | 'not_found' | 'skip'>}
 */
export async function resolvePublicPageStatus(path) {
  const p = String(path || '').split('?')[0] || '/';

  if (isSkippablePath(p)) return 'skip';

  const propertyMatch = p.match(/^\/property\/([^/]+)(?:\/(test-drive|edit))?\/?$/);
  if (propertyMatch) {
    const slug = propertyMatch[1];
    const sub = propertyMatch[2] || '';
    if (slug === 'new' || sub === 'edit') return 'skip';
    if (isNumericPropertyRouteParam(slug)) return 'not_found';
    const ok = await propertySlugExists(slug);
    return ok ? 'ok' : 'not_found';
  }

  const shareMatch = p.match(/^\/co-investment\/([^/]+)\/?$/);
  if (shareMatch) {
    const slug = shareMatch[1];
    if (isNumericPropertyRouteParam(slug)) return 'not_found';
    const ok = await propertySlugExists(slug);
    return ok ? 'ok' : 'not_found';
  }

  const legacyShareMatch = p.match(/^\/shares\/([^/]+)\/?$/);
  if (legacyShareMatch) return 'skip';

  const newsMatch = p.match(/^\/news\/([^/]+)\/?$/);
  if (newsMatch) {
    const article = getArticleBySlug(newsMatch[1]);
    if (!article || article.status !== 'published') return 'not_found';
    return 'ok';
  }

  const catalogMatch = p.match(/^\/([^/]+)\/([^/]+)(?:\/([^/]+))?\/?$/);
  if (catalogMatch) {
    const [, country, city, typePlural] = catalogMatch;
    if (isValidCatalogCountrySlug(country)) {
      if (!city) return 'not_found';
      if (typePlural && !CATALOG_TYPE_PLURALS[typePlural]) return 'not_found';
      const exists = await catalogPublicPageExists(country, city, typePlural || null);
      return exists ? 'ok' : 'not_found';
    }
  }

  if (isKnownPublicAppPath(p)) return 'skip';

  return 'not_found';
}

function sendSpa404(res, indexPath, req) {
  return sendSeoSpaHtml(res, indexPath, req, { status: 404 });
}

/**
 * HTTP 404 для битых публичных URL (до SPA fallback).
 * @param {import('express').Express} app
 */
export function registerSeoNotFound(app) {
  const distPath = resolveWebDist(__dirname);
  const indexPath = join(distPath, 'index.html');

  app.use(async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const path = req.path || '';
    if (isSkippablePath(path)) return next();
    if (/\.[a-z0-9]+$/i.test(path)) return next();

    try {
      const status = await resolvePublicPageStatus(path);
      if (status !== 'not_found') return next();
      if (!fs.existsSync(indexPath)) {
        return res.status(404).type('text/html; charset=utf-8').send('Not found');
      }
      return sendSpa404(res, indexPath, req);
    } catch (err) {
      console.warn('[seo-not-found]', err?.message || err);
      return next();
    }
  });
}
