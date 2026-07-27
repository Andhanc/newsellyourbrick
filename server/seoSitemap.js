import { getPrisma } from './database/prismaClient.js';
import { countryLabelToUrlSlug, cityLabelToUrlSlug } from '../src/utils/catalogGeoUrl.js';
import {
  CATALOG_TYPE_PLURALS,
  loadAllApprovedCatalogProperties,
  propertyMatchesSaleTab,
} from './catalogRoutes.js';
import { AUCTION_CATEGORY_SLUGS } from '../src/utils/auctionFilterUrl.js';
import { listPublishedArticles } from './services/newsStore.js';
import { seoRobotsDisallowLines } from '../shared/seoRobots.js';
import { getSitemapOverrides } from './seoPageCatalog.js';

const SITEMAP_CATALOG_SALE_TABS = ['auction', 'co-investment', 'debts'];
const PROPERTY_BATCH_SIZE = 2000;
/** Google: до 50k URL на файл; оставляем запас под co-investment/test-drive. */
const SITEMAP_URL_LIMIT = 45000;

function siteOrigin() {
  return (
    process.env.FRONTEND_URL ||
    process.env.SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    'http://localhost:5173'
  ).replace(/\/$/, '');
}

const STATIC_PATHS = [
  '/',
  '/auction',
  '/auction/pre-auction',
  '/auction/buy-now',
  '/auction/bidding',
  '/auction/ended',
  '/debts',
  '/co-investment',
  '/test-drive',
  '/about',
  '/news',
  '/map',
  '/sections',
  '/calculator',
  '/private-club',
];

const SITEMAP_XML_CACHE = 'public, max-age=1800, stale-while-revalidate=3600';

const PROPERTY_SELECT = {
  slug: true,
  title: true,
  property_type: true,
  is_shared_ownership: true,
  sale_type: true,
  test_drive: true,
  photos: true,
  updated_at: true,
  country: true,
  city: true,
  location: true,
};

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatLastmod(value) {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function urlEntry(origin, path, { changefreq = 'weekly', priority = '0.6', lastmod = '' } = {}, overrides = null) {
  const normalized = path.split('?')[0].replace(/\/+$/, '') || '/';
  if (overrides) {
    const row = overrides.get(normalized);
    if (row?.sitemap_include === 0) return null;
    if (row?.sitemap_priority != null) priority = String(row.sitemap_priority);
    if (row?.sitemap_changefreq) changefreq = row.sitemap_changefreq;
    if (row?.sitemap_lastmod) {
      const manual = formatLastmod(row.sitemap_lastmod);
      if (manual) lastmod = manual;
    }
  }
  const loc = `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  const lastmodLine = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : '';
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodLine}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function sitemapIndexEntry(origin, filename) {
  return `  <sitemap>\n    <loc>${escapeXml(`${origin}/${filename}`)}</loc>\n  </sitemap>`;
}

function wrapUrlset(entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n');
}

function wrapImageUrlset(entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries,
    '</urlset>',
  ].join('\n');
}

function chunkArray(items, size = SITEMAP_URL_LIMIT) {
  /** @type {typeof items[]} */
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks.length ? chunks : [[]];
}

function parseImageList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw == null) return [];
  if (typeof raw !== 'string') return [];
  const t = raw.trim();
  if (!t) return [];
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.photos)) return parsed.photos;
      if (Array.isArray(parsed.images)) return parsed.images;
    }
  } catch {
    if (t.includes(',') || t.includes(';')) {
      return t.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
    }
    return [t];
  }
  return [];
}

function rawImageUrl(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry === 'object') {
    return String(
      entry.url || entry.path || entry.src || entry.image || entry.photo_url || entry.image_url || '',
    ).trim();
  }
  return '';
}

function toAbsoluteImageUrl(raw, origin) {
  const value = rawImageUrl(raw);
  if (!value || value.startsWith('blob:') || value.startsWith('data:')) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/uploads/') || value.startsWith('/images/')) return `${origin}${value}`;
  if (value.startsWith('uploads/') || value.startsWith('images/')) return `${origin}/${value}`;
  if (value.startsWith('/')) return `${origin}${value}`;
  return `${origin}/uploads/${value.replace(/^\/+/, '')}`;
}

function collectImagesFromProperty(row, origin) {
  const list = parseImageList(row.photos);
  const urls = list.map((item) => toAbsoluteImageUrl(item, origin)).filter(Boolean);
  return [...new Set(urls)].slice(0, 10);
}

function imageUrlEntry(origin, pagePath, images, title = '') {
  const loc = `${origin}${pagePath.startsWith('/') ? pagePath : `/${pagePath}`}`;
  const imageBlocks = images
    .map((img) => {
      const titleLine = title
        ? `\n      <image:title>${escapeXml(title)}</image:title>`
        : '';
      return `    <image:image>\n      <image:loc>${escapeXml(img)}</image:loc>${titleLine}\n    </image:image>`;
    })
    .join('\n');
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${imageBlocks}\n  </url>`;
}

async function loadApprovedPropertyRows() {
  const prisma = getPrisma();
  /** @type {object[]} */
  const rows = [];

  for (const model of ['properties_apartments', 'properties_houses']) {
    let skip = 0;
    for (;;) {
      const batch = await prisma[model].findMany({
        where: { moderation_status: 'approved', slug: { not: null } },
        select: PROPERTY_SELECT,
        skip,
        take: PROPERTY_BATCH_SIZE,
      });
      rows.push(...batch);
      if (batch.length < PROPERTY_BATCH_SIZE) break;
      skip += PROPERTY_BATCH_SIZE;
    }
  }

  return rows;
}

function collectPropertyPageEntries(origin, rows, overrides = null) {
  /** @type {string[]} */
  const entries = [];
  for (const row of rows) {
    const slug = String(row.slug || '').trim();
    if (!slug) continue;
    const lastmod = formatLastmod(row.updated_at);
    const entry = urlEntry(origin, `/property/${slug}`, { changefreq: 'daily', priority: '0.8', lastmod }, overrides);
    if (entry) entries.push(entry);

    const isShare =
      row.is_shared_ownership === 1 ||
      row.is_shared_ownership === true ||
      String(row.sale_type || '').toLowerCase() === 'share';
    if (isShare) {
      const shareEntry = urlEntry(origin, `/co-investment/${slug}`, { changefreq: 'daily', priority: '0.7', lastmod }, overrides);
      if (shareEntry) entries.push(shareEntry);
    }

    const hasTestDrive =
      row.test_drive === 1 || row.test_drive === true || row.test_drive === '1';
    if (hasTestDrive && !isShare) {
      const tdEntry = urlEntry(
        origin,
        `/property/${slug}/test-drive`,
        { changefreq: 'weekly', priority: '0.65', lastmod },
        overrides,
      );
      if (tdEntry) entries.push(tdEntry);
    }
  }
  return entries;
}

function collectPropertyImageEntries(origin, rows) {
  /** @type {string[]} */
  const entries = [];
  for (const row of rows) {
    const slug = String(row.slug || '').trim();
    if (!slug) continue;
    const images = collectImagesFromProperty(row, origin);
    if (images.length === 0) continue;
    entries.push(imageUrlEntry(origin, `/property/${slug}`, images, row.title || ''));
  }
  return entries;
}

function propertyTypeToCatalogPlural(propertyType) {
  const pt = String(propertyType || '').toLowerCase();
  if (pt === 'villa') return 'villas';
  if (pt === 'house') return 'houses';
  if (pt === 'commercial') return 'commercial';
  return 'apartments';
}

function collectAuctionCategoryEntries(origin, overrides = null) {
  /** @type {string[]} */
  const entries = [];
  for (const categorySlug of Object.keys(AUCTION_CATEGORY_SLUGS)) {
    for (const entry of [
      urlEntry(origin, `/auction/${categorySlug}`, { changefreq: 'weekly', priority: '0.55' }, overrides),
      urlEntry(origin, `/auction/bidding/${categorySlug}`, { changefreq: 'weekly', priority: '0.5' }, overrides),
      urlEntry(origin, `/auction/pre-auction/${categorySlug}`, { changefreq: 'weekly', priority: '0.5' }, overrides),
      urlEntry(origin, `/auction/buy-now/${categorySlug}`, { changefreq: 'weekly', priority: '0.5' }, overrides),
    ]) {
      if (entry) entries.push(entry);
    }
  }
  return entries;
}

function collectCatalogEntries(origin, rows, overrides = null) {
  /** @type {Map<string, { lastmod: string, types: Set<string>, sales: Set<string>, typeSales: Map<string, Set<string>> }>} */
  const cities = new Map();

  for (const row of rows) {
    let country = row.country;
    let city = row.city;
    if ((!country || !city) && row.location) {
      const parts = String(row.location).split(',').map((s) => s.trim()).filter(Boolean);
      if (!country && parts[0]) country = parts[0];
      if (!city && parts[1]) city = parts[1];
    }
    const countrySlug = countryLabelToUrlSlug(country);
    const citySlug = cityLabelToUrlSlug(city);
    if (!countrySlug || !citySlug) continue;

    const key = `${countrySlug}/${citySlug}`;
    const lastmod = formatLastmod(row.updated_at);
    const bucket = cities.get(key) || {
      lastmod: '',
      types: new Set(),
      sales: new Set(),
      typeSales: new Map(),
    };
    if (lastmod && (!bucket.lastmod || lastmod > bucket.lastmod)) bucket.lastmod = lastmod;

    const typePlural = propertyTypeToCatalogPlural(row.property_type);
    if (typePlural) bucket.types.add(typePlural);

    for (const saleTab of SITEMAP_CATALOG_SALE_TABS) {
      if (!propertyMatchesSaleTab(row, saleTab)) continue;
      bucket.sales.add(saleTab);
      if (typePlural) {
        if (!bucket.typeSales.has(typePlural)) bucket.typeSales.set(typePlural, new Set());
        bucket.typeSales.get(typePlural).add(saleTab);
      }
    }

    cities.set(key, bucket);
  }

  /** @type {string[]} */
  const entries = [];
  const sorted = [...cities.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [key, meta] of sorted) {
    const base = `/${key}`;
    for (const entry of [
      urlEntry(origin, base, { changefreq: 'weekly', priority: '0.55', lastmod: meta.lastmod }, overrides),
      ...[...meta.sales].map((saleTab) =>
        urlEntry(origin, `${base}?sale=${saleTab}`, {
          changefreq: 'weekly',
          priority: '0.5',
          lastmod: meta.lastmod,
        }, overrides),
      ),
    ]) {
      if (entry) entries.push(entry);
    }
    for (const typePlural of Object.keys(CATALOG_TYPE_PLURALS)) {
      if (!meta.types.has(typePlural)) continue;
      const typeEntry = urlEntry(origin, `${base}/${typePlural}`, {
        changefreq: 'weekly',
        priority: '0.5',
        lastmod: meta.lastmod,
      }, overrides);
      if (typeEntry) entries.push(typeEntry);
      const typeSales = meta.typeSales.get(typePlural);
      if (!typeSales) continue;
      for (const saleTab of typeSales) {
        const saleEntry = urlEntry(origin, `${base}/${typePlural}?sale=${saleTab}`, {
          changefreq: 'weekly',
          priority: '0.48',
          lastmod: meta.lastmod,
        }, overrides);
        if (saleEntry) entries.push(saleEntry);
      }
    }
  }
  return entries;
}

function collectNewsEntries(origin, overrides = null) {
  return listPublishedArticles()
    .map((article) =>
      urlEntry(origin, `/news/${article.slug}`, {
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: formatLastmod(article.updatedAt || article.publishedAt),
      }, overrides),
    )
    .filter(Boolean);
}

function propertySitemapFilename(page) {
  return page <= 1 ? 'sitemap-properties.xml' : `sitemap-properties-${page}.xml`;
}

function imageSitemapFilename(page) {
  return page <= 1 ? 'sitemap-images.xml' : `sitemap-images-${page}.xml`;
}

function sendXml(res, body) {
  res.type('application/xml');
  res.setHeader('Cache-Control', SITEMAP_XML_CACHE);
  res.send(body);
}

/** @type {{ propertyChunks: string[][], imageChunks: string[][], builtAt: number } | null} */
let sitemapChunkCache = null;
const CHUNK_CACHE_MS = 5 * 60 * 1000;

async function getSitemapChunks(origin) {
  const now = Date.now();
  if (sitemapChunkCache && now - sitemapChunkCache.builtAt < CHUNK_CACHE_MS) {
    return sitemapChunkCache;
  }

  const rows = await loadApprovedPropertyRows();
  const overrides = await getSitemapOverrides();
  const propertyEntries = collectPropertyPageEntries(origin, rows, overrides);
  const imageEntries = collectPropertyImageEntries(origin, rows);

  sitemapChunkCache = {
    propertyChunks: chunkArray(propertyEntries),
    imageChunks: chunkArray(imageEntries),
    builtAt: now,
  };
  return sitemapChunkCache;
}

/**
 * @param {import('express').Express} app
 */
export function registerSeoSitemap(app) {
  app.get('/robots.txt', (_req, res) => {
    const origin = siteOrigin();
    res.type('text/plain');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(
      [
        'User-agent: *',
        'Allow: /',
        ...seoRobotsDisallowLines(),
        '',
        `Sitemap: ${origin}/sitemap.xml`,
        '',
      ].join('\n'),
    );
  });

  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const origin = siteOrigin();
      const { propertyChunks, imageChunks } = await getSitemapChunks(origin);
      const entries = [
        sitemapIndexEntry(origin, 'sitemap-pages.xml'),
        ...propertyChunks.map((_, i) =>
          sitemapIndexEntry(origin, propertySitemapFilename(i + 1)),
        ),
        ...imageChunks.map((_, i) => sitemapIndexEntry(origin, imageSitemapFilename(i + 1))),
      ];
      const body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries,
        '</sitemapindex>',
      ].join('\n');
      sendXml(res, body);
    } catch (err) {
      console.error('[sitemap]', err?.message || err);
      res.status(500).type('text/plain').send('sitemap error');
    }
  });

  app.get('/sitemap-pages.xml', async (_req, res) => {
    try {
      const origin = siteOrigin();
      const overrides = await getSitemapOverrides();
      const staticEntries = STATIC_PATHS.map((path) =>
        urlEntry(origin, path, {
          changefreq: path === '/' ? 'daily' : 'weekly',
          priority: path === '/' ? '1.0' : '0.7',
        }, overrides),
      ).filter(Boolean);
      const catalogRows = await loadAllApprovedCatalogProperties();
      const catalogEntries = collectCatalogEntries(origin, catalogRows, overrides);
      const auctionCategoryEntries = collectAuctionCategoryEntries(origin, overrides);
      const newsEntries = collectNewsEntries(origin, overrides);
      sendXml(res, wrapUrlset([...staticEntries, ...auctionCategoryEntries, ...catalogEntries, ...newsEntries]));
    } catch (err) {
      console.error('[sitemap-pages]', err?.message || err);
      res.status(500).type('text/plain').send('sitemap error');
    }
  });

  const sendPropertyChunk = async (res, page) => {
    try {
      const origin = siteOrigin();
      if (!Number.isFinite(page) || page < 1) {
        return res.status(404).type('text/plain').send('sitemap not found');
      }
      const { propertyChunks } = await getSitemapChunks(origin);
      const chunk = propertyChunks[page - 1];
      if (!chunk) return res.status(404).type('text/plain').send('sitemap not found');
      sendXml(res, wrapUrlset(chunk));
    } catch (err) {
      console.error('[sitemap-properties]', err?.message || err);
      res.status(500).type('text/plain').send('sitemap error');
    }
  };

  app.get('/sitemap-properties.xml', (_req, res) => sendPropertyChunk(res, 1));
  app.get('/sitemap-properties-:page.xml', (req, res) =>
    sendPropertyChunk(res, Number(req.params.page)),
  );

  const sendImageChunk = async (res, page) => {
    try {
      const origin = siteOrigin();
      if (!Number.isFinite(page) || page < 1) {
        return res.status(404).type('text/plain').send('sitemap not found');
      }
      const { imageChunks } = await getSitemapChunks(origin);
      const chunk = imageChunks[page - 1];
      if (!chunk) return res.status(404).type('text/plain').send('sitemap not found');
      sendXml(res, wrapImageUrlset(chunk));
    } catch (err) {
      console.error('[sitemap-images]', err?.message || err);
      res.status(500).type('text/plain').send('sitemap error');
    }
  };

  app.get('/sitemap-images.xml', (_req, res) => sendImageChunk(res, 1));
  app.get('/sitemap-images-:page.xml', (req, res) => sendImageChunk(res, Number(req.params.page)));

  app.get('/sitemap-all.xml', async (_req, res) => {
    try {
      const origin = siteOrigin();
      const staticEntries = STATIC_PATHS.map((path) =>
        urlEntry(origin, path, {
          changefreq: path === '/' ? 'daily' : 'weekly',
          priority: path === '/' ? '1.0' : '0.7',
        }),
      );
      const catalogRows = await loadAllApprovedCatalogProperties();
      const propertyRows = await loadApprovedPropertyRows();
      sendXml(
        res,
        wrapUrlset([
          ...staticEntries,
          ...collectAuctionCategoryEntries(origin),
          ...collectCatalogEntries(origin, catalogRows),
          ...collectNewsEntries(origin),
          ...collectPropertyPageEntries(origin, propertyRows),
        ]),
      );
    } catch (err) {
      console.error('[sitemap-all]', err?.message || err);
      res.status(500).type('text/plain').send('sitemap error');
    }
  });
}
