import { getPrisma } from './database/prismaClient.js';
import { countryLabelToUrlSlug, cityLabelToUrlSlug } from '../src/utils/catalogGeoUrl.js';
import { AUCTION_CATEGORY_SLUGS } from '../src/utils/auctionFilterUrl.js';
import { listPublishedArticles } from './services/newsStore.js';

const PROPERTY_BATCH_SIZE = 2000;

const STATIC_PAGES = [
  { path: '/', pageType: 'static', label: 'Главная' },
  { path: '/auction', pageType: 'static', label: 'Аукцион' },
  { path: '/auction/pre-auction', pageType: 'static', label: 'Аукцион — предстоящие' },
  { path: '/auction/buy-now', pageType: 'static', label: 'Аукцион — купить сейчас' },
  { path: '/auction/bidding', pageType: 'static', label: 'Аукцион — торги' },
  { path: '/auction/ended', pageType: 'static', label: 'Аукцион — завершённые' },
  { path: '/debts', pageType: 'static', label: 'Недвижимость с долгами' },
  { path: '/co-investment', pageType: 'static', label: 'Долевая недвижимость' },
  { path: '/test-drive', pageType: 'static', label: 'Тест-драйв' },
  { path: '/about', pageType: 'static', label: 'О нас' },
  { path: '/news', pageType: 'static', label: 'Новости' },
  { path: '/map', pageType: 'static', label: 'Карта' },
  { path: '/sections', pageType: 'static', label: 'Разделы' },
  { path: '/calculator', pageType: 'static', label: 'Калькулятор' },
  { path: '/private-club', pageType: 'static', label: 'Закрытый клуб' },
];

const PROPERTY_SELECT = {
  slug: true,
  title: true,
  property_type: true,
  is_shared_ownership: true,
  sale_type: true,
  test_drive: true,
  updated_at: true,
  country: true,
  city: true,
  location: true,
};

function formatLastmod(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function propertyTypeToCatalogPlural(propertyType) {
  const pt = String(propertyType || '').toLowerCase();
  if (pt === 'villa') return 'villas';
  if (pt === 'house') return 'houses';
  if (pt === 'commercial') return 'commercial';
  return 'apartments';
}

async function loadApprovedPropertyRows() {
  const prisma = getPrisma();
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

function collectPropertyPages(rows) {
  /** @type {{ path: string, pageType: string, label: string, lastmod: string|null }[]} */
  const pages = [];
  for (const row of rows) {
    const slug = String(row.slug || '').trim();
    if (!slug) continue;
    const lastmod = formatLastmod(row.updated_at);
    const label = row.title || slug;
    pages.push({ path: `/property/${slug}`, pageType: 'property', label, lastmod });

    const isShare =
      row.is_shared_ownership === 1 ||
      row.is_shared_ownership === true ||
      String(row.sale_type || '').toLowerCase() === 'share';
    if (isShare) {
      pages.push({ path: `/co-investment/${slug}`, pageType: 'co-investment', label, lastmod });
    }

    const hasTestDrive = row.test_drive === 1 || row.test_drive === true || row.test_drive === '1';
    if (hasTestDrive && !isShare) {
      pages.push({
        path: `/property/${slug}/test-drive`,
        pageType: 'property-test-drive',
        label: `${label} — тест-драйв`,
        lastmod,
      });
    }
  }
  return pages;
}

function collectAuctionCategoryPages() {
  const pages = [];
  for (const categorySlug of Object.keys(AUCTION_CATEGORY_SLUGS)) {
    pages.push({ path: `/auction/${categorySlug}`, pageType: 'catalog', label: `Аукцион — ${categorySlug}`, lastmod: null });
    pages.push({ path: `/auction/bidding/${categorySlug}`, pageType: 'catalog', label: `Торги — ${categorySlug}`, lastmod: null });
    pages.push({ path: `/auction/pre-auction/${categorySlug}`, pageType: 'catalog', label: `Предстоящие — ${categorySlug}`, lastmod: null });
    pages.push({ path: `/auction/buy-now/${categorySlug}`, pageType: 'catalog', label: `Купить сейчас — ${categorySlug}`, lastmod: null });
  }
  return pages;
}

function collectCatalogPages(rows) {
  /** @type {Map<string, { lastmod: string|null, types: Set<string> }>} */
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
    const bucket = cities.get(key) || { lastmod: null, types: new Set() };
    if (lastmod && (!bucket.lastmod || lastmod > bucket.lastmod)) bucket.lastmod = lastmod;
    bucket.types.add(propertyTypeToCatalogPlural(row.property_type));
    cities.set(key, bucket);
  }

  const pages = [];
  for (const [key, bucket] of cities) {
    const [countrySlug, citySlug] = key.split('/');
    pages.push({
      path: `/${countrySlug}/${citySlug}`,
      pageType: 'catalog',
      label: `Каталог — ${citySlug}`,
      lastmod: bucket.lastmod,
    });
    for (const typePlural of bucket.types) {
      pages.push({
        path: `/${countrySlug}/${citySlug}/${typePlural}`,
        pageType: 'catalog',
        label: `Каталог — ${citySlug} / ${typePlural}`,
        lastmod: bucket.lastmod,
      });
      for (const sale of ['auction', 'co-investment', 'debts']) {
        pages.push({
          path: `/${countrySlug}/${citySlug}/${typePlural}/${sale}`,
          pageType: 'catalog',
          label: `Каталог — ${citySlug} / ${typePlural} / ${sale}`,
          lastmod: bucket.lastmod,
        });
      }
    }
    for (const sale of ['auction', 'co-investment', 'debts']) {
      pages.push({
        path: `/${countrySlug}/${citySlug}/${sale}`,
        pageType: 'catalog',
        label: `Каталог — ${citySlug} / ${sale}`,
        lastmod: bucket.lastmod,
      });
    }
  }
  return pages;
}

function collectNewsPages(articles) {
  return (articles || []).map((article) => ({
    path: `/news/${article.slug || article.id}`,
    pageType: 'news',
    label: article.title || article.slug || String(article.id),
    lastmod: formatLastmod(article.updatedAt || article.publishedAt || article.createdAt),
  }));
}

/**
 * Все публичные URL для SEO-кабинета.
 */
export async function enumeratePublicSeoPages() {
  const propertyRows = await loadApprovedPropertyRows();
  const articles = listPublishedArticles();

  const pages = [
    ...STATIC_PAGES.map((p) => ({ ...p, lastmod: null })),
    ...collectAuctionCategoryPages(),
    ...collectPropertyPages(propertyRows),
    ...collectCatalogPages(propertyRows),
    ...collectNewsPages(articles),
  ];

  const seen = new Set();
  return pages.filter((p) => {
    if (seen.has(p.path)) return false;
    seen.add(p.path);
    return true;
  });
}

export async function getSitemapExclusions() {
  const prisma = getPrisma();
  const rows = await prisma.seo_page_overrides.findMany({
    where: { sitemap_include: 0 },
    select: { path: true, sitemap_priority: true, sitemap_changefreq: true, sitemap_lastmod: true },
  });
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const row of rows) map.set(row.path, row);
  return map;
}

export async function getSitemapOverrides() {
  const prisma = getPrisma();
  const rows = await prisma.seo_page_overrides.findMany({
    where: {
      OR: [
        { sitemap_priority: { not: null } },
        { sitemap_changefreq: { not: null } },
        { sitemap_lastmod: { not: null } },
        { sitemap_include: 0 },
      ],
    },
  });
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const row of rows) map.set(row.path, row);
  return map;
}
