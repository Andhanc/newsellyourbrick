import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isNumericPropertyRouteParam } from '../shared/propertySlug.js';
import { isSeoNoindexPath } from '../shared/seoRobots.js';
import { createSeoTranslator, detectSeoLang } from '../shared/seoI18n.js';
import {
  injectSeoIntoHtml,
  buildPropertyPrerenderHtml,
  buildCatalogPrerenderHtml,
  buildNewsPrerenderHtml,
} from '../shared/seoHtmlInject.js';
import { resolvePropertyImageUrl } from '../shared/seoPropertyMedia.js';
import { resolvePageSeo } from '../shared/seoResolveRoutes.js';
import {
  buildWebSiteJsonLd,
  buildRealEstateListingJsonLd,
  buildNewsArticleJsonLd,
  buildCollectionPageJsonLd,
} from '../shared/seoJsonLd.js';
import { resolveRequestSiteOrigin, resolveApiMediaOrigin } from '../shared/seoSiteOrigin.js';
import { buildPropertySeoBundle, buildNewsArticlePageSeo, buildCatalogPageSeo } from '../shared/pageSeoBuilders.js';
import { getCanonicalRegionLabel } from '../src/utils/propertySearchLocation.js';
import { propertySlugQueries } from './database/propertySlugPrisma.js';
import { getArticleBySlug } from './services/newsStore.js';
import {
  CATALOG_TYPE_PLURALS,
  catalogPublicPageExists,
  isValidCatalogCountrySlug,
} from './catalogRoutes.js';
import { seoAdminQueries } from './database/seoAdminPrisma.js';
import { mergeSeoOverride } from '../shared/seoOverrides.js';
import { applyDbSeoTemplate } from './seoTemplateEngine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CATALOG_TYPE_I18N = {
  apartments: 'oap_propertyTypeApartments',
  villas: 'propertyTypeVilla',
  houses: 'propertyTypeHouse',
  commercial: 'propertyTypeCommercial',
};

/** @type {{ html: string | null, mtimeMs: number, path: string }} */
const indexCache = { html: null, mtimeMs: 0, path: '' };

function isApprovedPropertyRow(row) {
  return String(row?.moderation_status || '').toLowerCase() === 'approved';
}

function normalizePath(pathname) {
  const raw = String(pathname || '/').split('?')[0] || '/';
  if (raw === '/main') return '/auction';
  return raw;
}

async function applyDbSeoOverride(path, payload, origin) {
  if (!payload) return payload;
  try {
    const override = await seoAdminQueries.getOverrideByPath(path);
    if (!override) return payload;
    return mergeSeoOverride(payload, override, origin);
  } catch (err) {
    console.warn('[seo-override]', err?.message || err);
    return payload;
  }
}

function readIndexTemplate(indexPath) {
  const stat = fs.statSync(indexPath);
  if (indexCache.path === indexPath && indexCache.mtimeMs === stat.mtimeMs && indexCache.html) {
    return indexCache.html;
  }
  const html = fs.readFileSync(indexPath, 'utf8');
  indexCache.html = html;
  indexCache.mtimeMs = stat.mtimeMs;
  indexCache.path = indexPath;
  return html;
}

function toSeoPayload(base, { origin, lang, noindex = false, ogImage, ogType, jsonLd, prerenderHtml }) {
  const canonicalPath = base.canonicalPath || '/';
  const canonicalUrl = `${origin}${canonicalPath}`;
  return {
    title: base.title,
    description: base.description,
    canonicalUrl,
    canonicalPath,
    ogImage: ogImage || undefined,
    ogType: ogType || 'website',
    noindex,
    jsonLd,
    lang: lang === 'ru' ? 'ru_RU' : `${lang}_${lang.toUpperCase()}`,
    prerenderHtml,
  };
}

async function resolvePropertySeo(path, slug, canonicalPath, { t, lang, origin, apiOrigin }) {
  const hit = await propertySlugQueries.getBySlug(slug);
  if (!hit?.row || !isApprovedPropertyRow(hit.row)) return null;

  const bundle = buildPropertySeoBundle(hit.row, t, lang, { canonicalPath, origin, apiOrigin });
  if (!bundle) return null;

  const templated = await applyDbSeoTemplate('property', bundle, {
    type: bundle.type,
    city: bundle.city,
    area: hit.row.area ?? hit.row.sqft ?? '—',
    price: bundle.price,
    name: bundle.h1,
  });

  const imageUrl = resolvePropertyImageUrl(hit.row, apiOrigin);
  const country = String(hit.row.country || '').trim();

  const jsonLd = buildRealEstateListingJsonLd({
    title: templated.title,
    description: templated.description,
    canonicalUrl: bundle.canonicalUrl,
    imageUrl: imageUrl || undefined,
    h1: templated.h1 || bundle.h1,
    city: bundle.city || undefined,
    country: country || undefined,
    priceAmount: bundle.priceAmount,
    currency: bundle.currency,
    propertyType: bundle.type,
  });

  const prerenderHtml = buildPropertyPrerenderHtml({
    h1: templated.h1 || bundle.h1,
    type: bundle.type,
    city: bundle.city,
    price: bundle.price,
    imageUrl,
    imageAlt: templated.h1 || bundle.h1,
  });

  return toSeoPayload(templated, {
    origin,
    lang,
    ogImage: imageUrl || undefined,
    ogType: 'product',
    jsonLd,
    prerenderHtml,
  });
}

function resolveNewsSeo(path, slug, { t, lang, origin, apiOrigin }) {
  const article = getArticleBySlug(slug);
  if (!article) return null;

  const seo = buildNewsArticlePageSeo(article, t);
  if (!seo) return null;

  const canonicalPath = path.split('?')[0];
  const canonicalUrl = `${origin}${canonicalPath}`;
  let imageUrl = String(article.image || '').trim();
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    imageUrl = resolvePropertyImageUrl({ image: imageUrl }, apiOrigin);
  }

  const jsonLd = buildNewsArticleJsonLd({
    title: article.title,
    description: seo.description,
    canonicalUrl,
    imageUrl: imageUrl || undefined,
    publishedAt: article.publishedAt,
  });

  const excerpt = String(article.excerpt || article.lead || '').trim();
  const prerenderHtml = buildNewsPrerenderHtml({
    h1: article.title,
    lead: excerpt || seo.description,
    imageUrl: imageUrl || undefined,
    imageAlt: article.title,
  });

  return toSeoPayload(
    { ...seo, canonicalPath },
    {
      origin,
      lang,
      ogImage: imageUrl || undefined,
      ogType: 'article',
      jsonLd,
      prerenderHtml,
    },
  );
}

async function resolveCatalogSeo(path, search, { t, lang, origin }) {
  const catalogMatch = path.match(/^\/([^/]+)\/([^/]+)(?:\/([^/]+))?\/?$/);
  if (!catalogMatch) return null;

  const [, country, city, typePlural] = catalogMatch;
  if (!isValidCatalogCountrySlug(country)) return null;
  if (typePlural && !CATALOG_TYPE_PLURALS[typePlural]) return null;

  const exists = await catalogPublicPageExists(country, city, typePlural || null);
  if (!exists) return null;

  const sale = String(new URLSearchParams(search || '').get('sale') || 'all').toLowerCase();
  const cityLabel = getCanonicalRegionLabel(city, city);

  const seo = buildCatalogPageSeo(
    {
      country,
      city,
      typePlural: typePlural || null,
      sale,
      cityLabel,
    },
    t,
  );

  const canonicalPath = path.split('?')[0];
  const canonicalUrl = `${origin}${canonicalPath}`;
  const jsonLd = buildCollectionPageJsonLd({
    title: seo.title,
    description: seo.description,
    canonicalUrl,
  });

  const typeLabel =
    typePlural && CATALOG_TYPE_I18N[typePlural] ? t(CATALOG_TYPE_I18N[typePlural]) : '';
  const h1 = typeLabel ? `${cityLabel} — ${typeLabel}` : cityLabel;
  const prerenderHtml = buildCatalogPrerenderHtml({
    h1,
    description: seo.description,
  });

  return toSeoPayload(
    { ...seo, canonicalPath },
    {
      origin,
      lang,
      ogType: 'website',
      jsonLd,
      prerenderHtml,
    },
  );
}

/**
 * @param {string} pathname
 * @param {{
 *   origin?: string,
 *   apiOrigin?: string,
 *   lang?: string,
 *   noindex?: boolean,
 * }} [options]
 */
export async function resolveSeoForPath(pathname, options = {}) {
  const path = normalizePath(pathname);
  const origin = options.origin || resolveRequestSiteOrigin();
  const apiOrigin = options.apiOrigin || origin;
  const lang = options.lang || 'ru';
  const t = createSeoTranslator(lang);

  if (options.http404) {
    const base = {
      title: t('pageSeoDefaultTitle'),
      description: t('pageSeoDefaultDescription'),
      canonicalPath: path.split('?')[0],
    };
    return applyDbSeoOverride(path, toSeoPayload(base, {
      origin,
      lang,
      noindex: true,
      ogType: 'website',
    }), origin);
  }

  const explicitNoindex = options.noindex === true || isSeoNoindexPath(path);

  const propertyMatch = path.match(/^\/property\/([^/]+)(?:\/(test-drive))?\/?$/);
  if (propertyMatch) {
    const slug = propertyMatch[1];
    const sub = propertyMatch[2] || '';
    if (sub === 'test-drive' && slug !== 'new' && !isNumericPropertyRouteParam(slug)) {
      const base = resolvePageSeo(path, t);
      const payload = toSeoPayload(base, {
        origin,
        lang,
        noindex: explicitNoindex,
        ogType: 'website',
      });
      return applyDbSeoOverride(path, payload, origin);
    }
    if (slug !== 'new' && !isNumericPropertyRouteParam(slug)) {
      const seo = await resolvePropertySeo(path, slug, path.split('?')[0], {
        t,
        lang,
        origin,
        apiOrigin,
      });
      if (seo) {
        if (explicitNoindex) seo.noindex = true;
        return applyDbSeoOverride(path, seo, origin);
      }
    }
  }

  const shareMatch = path.match(/^\/co-investment\/([^/]+)\/?$/);
  if (shareMatch) {
    const slug = shareMatch[1];
    if (!isNumericPropertyRouteParam(slug)) {
      const seo = await resolvePropertySeo(path, slug, path.split('?')[0], {
        t,
        lang,
        origin,
        apiOrigin,
      });
      if (seo) {
        if (explicitNoindex) seo.noindex = true;
        return applyDbSeoOverride(path, seo, origin);
      }
    }
  }

  const newsMatch = path.match(/^\/news\/([^/]+)\/?$/);
  if (newsMatch) {
    const seo = resolveNewsSeo(path, newsMatch[1], { t, lang, origin, apiOrigin });
    if (seo) {
      if (explicitNoindex) seo.noindex = true;
      return applyDbSeoOverride(path, seo, origin);
    }
  }

  const catalogSeo = await resolveCatalogSeo(path, options.search || '', { t, lang, origin });
  if (catalogSeo) {
    if (explicitNoindex) catalogSeo.noindex = true;
    return applyDbSeoOverride(path, catalogSeo, origin);
  }

  const base = resolvePageSeo(path, t);
  const payload = toSeoPayload(base, {
    origin,
    lang,
    noindex: explicitNoindex,
    ogType: 'website',
    jsonLd: path === '/' ? buildWebSiteJsonLd({ origin }) : buildCollectionPageJsonLd({
      title: base.title,
      description: base.description,
      canonicalUrl: `${origin}${base.canonicalPath || path}`,
    }),
  });

  if (path === '/') {
    payload.ogImage = `${origin}/hero-bg.jpeg`;
  }

  return applyDbSeoOverride(path, payload, origin);
}

/**
 * @param {import('express').Response} res
 * @param {string} indexPath
 * @param {import('express').Request} req
 * @param {{ status?: number, html?: string }} [options]
 */
export async function sendSeoSpaHtml(res, indexPath, req, options = {}) {
  const status = options.status ?? 200;
  const origin = resolveRequestSiteOrigin(req);
  const apiOrigin = resolveApiMediaOrigin(req);
  const lang = detectSeoLang(req.headers['accept-language']);

  let html = options.html || readIndexTemplate(indexPath);
  try {
    const seo = await resolveSeoForPath(req.path || '/', {
      origin,
      apiOrigin,
      lang,
      search: req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '',
      http404: status === 404,
    });
    html = injectSeoIntoHtml(html, seo);
  } catch (err) {
    console.warn('[seo-html]', err?.message || err);
  }

  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'HEAD') {
    return res.end();
  }
  return res.send(html);
}

/**
 * @param {string} indexPath
 * @param {string} pathname
 * @param {{
 *   origin?: string,
 *   apiOrigin?: string,
 *   lang?: string,
 *   search?: string,
 *   html?: string,
 * }} [options]
 */
export async function buildSeoHtmlForPath(indexPath, pathname, options = {}) {
  const html = options.html || readIndexTemplate(indexPath);
  const origin = options.origin || resolveRequestSiteOrigin();
  const apiOrigin = options.apiOrigin || origin;
  const lang = options.lang || 'ru';
  const seo = await resolveSeoForPath(pathname, {
    origin,
    apiOrigin,
    lang,
    search: options.search || '',
  });
  return injectSeoIntoHtml(html, seo);
}
