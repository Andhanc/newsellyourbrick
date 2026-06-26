/**
 * Каталог по гео: /api/catalog/:country/:city
 */
import {
  matchCountryKey,
  getCanonicalRegionKey,
  getCanonicalRegionLabel,
} from '../src/utils/propertySearchLocation.js';
import { apartmentQueries, houseQueries } from './database/database.js';
import { passesApprovedFilters } from './database/module2PropertyPrisma.js';

const CATALOG_BATCH_SIZE = 2000;
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

/** @type {{ rows: object[] | null, loadedAt: number }} */
const catalogCache = { rows: null, loadedAt: 0 };

export const CATALOG_TYPE_PLURALS = {
  apartments: ['apartment', 'commercial'],
  villas: ['villa'],
  houses: ['house'],
  commercial: ['commercial'],
};

export const CATALOG_SALE_TABS = ['all', 'auction', 'co-investment', 'debts'];

const RESERVED_COUNTRY_SLUGS = new Set([
  'property',
  'shares',
  'co-investment',
  'debts',
  'auction',
  'about',
  'news',
  'map',
  'chat',
  'admin',
  'profile',
  'owner',
  'sections',
  'calculator',
  'favorites',
  'compare',
  'wallet',
  'deposit',
  'main',
  'test',
  'jeton',
  'oauth-bridge',
  'auth',
  'test-drive',
  'marketer',
  'bonuses',
  'subscriptions',
  'history',
  'private-club',
  'search-results',
  'data',
]);

export function isValidCatalogCountrySlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!s || RESERVED_COUNTRY_SLUGS.has(s)) return false;
  return Boolean(matchCountryKey(s));
}

export function propertyMatchesCountrySlug(property, countrySlug) {
  const key = matchCountryKey(property?.country || '');
  if (key && key === countrySlug) return true;

  const location = String(property?.location || '');
  const firstSegment = location.split(',')[0]?.trim() || '';
  if (matchCountryKey(firstSegment) === countrySlug) return true;

  const fromCity = matchCountryKey(property?.city || '');
  if (fromCity === countrySlug) return true;

  if (location && matchCountryKey(location) === countrySlug) return true;

  return false;
}

export function propertyMatchesCitySlug(property, citySlug) {
  const key = getCanonicalRegionKey(property?.city || property?.location || '');
  return key === citySlug;
}

export function propertyMatchesTypePlural(property, typePlural) {
  if (!typePlural) return true;
  const types = CATALOG_TYPE_PLURALS[String(typePlural).toLowerCase()];
  if (!types) return false;
  const pt = String(property?.property_type || '').toLowerCase();
  return types.includes(pt);
}

export function propertyMatchesSaleTab(property, sale) {
  let tab = String(sale || 'all').toLowerCase();
  if (tab === 'shares') tab = 'co-investment';
  if (tab === 'all') return true;
  if (tab === 'auction') {
    return property?.is_auction === 1 || property?.is_auction === true;
  }
  if (tab === 'co-investment') {
    return property?.is_shared_ownership === 1 || property?.is_shared_ownership === true;
  }
  if (tab === 'debts') {
    return (
      property?.sale_type === 'debt' ||
      property?.is_debt === 1 ||
      property?.is_debt === true ||
      property?.has_debt === 1 ||
      property?.has_debt === true
    );
  }
  return true;
}

export async function loadAllApprovedCatalogProperties({ force = false } = {}) {
  const now = Date.now();
  if (!force && catalogCache.rows && now - catalogCache.loadedAt < CATALOG_CACHE_TTL_MS) {
    return catalogCache.rows;
  }

  /** @type {object[]} */
  const all = [];
  let offset = 0;
  for (;;) {
    const [apartments, houses] = await Promise.all([
      apartmentQueries.getAll({ moderation_status: 'approved' }, CATALOG_BATCH_SIZE, offset),
      houseQueries.getAll({ moderation_status: 'approved' }, CATALOG_BATCH_SIZE, offset),
    ]);
    const batch = [...apartments, ...houses].filter((p) => passesApprovedFilters(p));
    all.push(...batch);
    if (apartments.length < CATALOG_BATCH_SIZE && houses.length < CATALOG_BATCH_SIZE) break;
    offset += CATALOG_BATCH_SIZE;
  }

  catalogCache.rows = all;
  catalogCache.loadedAt = now;
  return all;
}

export function filterCatalogProperties(
  rows,
  { countrySlug, citySlug, typePlural = null, sale = 'all' } = {},
) {
  return rows.filter(
    (p) =>
      propertyMatchesCountrySlug(p, countrySlug) &&
      propertyMatchesCitySlug(p, citySlug) &&
      propertyMatchesTypePlural(p, typePlural) &&
      propertyMatchesSaleTab(p, sale),
  );
}

export async function catalogPublicPageExists(countrySlug, citySlug, typePlural = null) {
  if (!isValidCatalogCountrySlug(countrySlug) || !citySlug) return false;
  if (typePlural && !CATALOG_TYPE_PLURALS[typePlural]) return false;

  const rows = await loadAllApprovedCatalogProperties();
  const inCity = filterCatalogProperties(rows, {
    countrySlug,
    citySlug,
    typePlural: null,
    sale: 'all',
  });
  if (inCity.length === 0) return false;
  if (!typePlural) return true;

  return (
    filterCatalogProperties(rows, {
      countrySlug,
      citySlug,
      typePlural,
      sale: 'all',
    }).length > 0
  );
}

export function registerCatalogRoutes(app) {
  app.get('/api/catalog/:country/:city/:typePlural?', async (req, res) => {
    try {
      const countrySlug = String(req.params.country || '').trim().toLowerCase();
      const citySlug = String(req.params.city || '').trim().toLowerCase();
      const typePlural = req.params.typePlural
        ? String(req.params.typePlural).trim().toLowerCase()
        : null;
      const sale = String(req.query.sale || 'all').trim().toLowerCase();

      if (!isValidCatalogCountrySlug(countrySlug)) {
        return res.status(404).json({ success: false, error: 'Неизвестная страна' });
      }
      if (!citySlug) {
        return res.status(400).json({ success: false, error: 'Город не указан' });
      }
      if (typePlural && !CATALOG_TYPE_PLURALS[typePlural]) {
        return res.status(404).json({ success: false, error: 'Неизвестный тип недвижимости' });
      }
      if (!CATALOG_SALE_TABS.includes(sale)) {
        return res.status(400).json({ success: false, error: 'Некорректный фильтр sale' });
      }

      const all = await loadAllApprovedCatalogProperties();
      const inCity = filterCatalogProperties(all, {
        countrySlug,
        citySlug,
        typePlural: null,
        sale: 'all',
      });
      if (inCity.length === 0) {
        return res.status(404).json({ success: false, error: 'Город не найден' });
      }
      if (typePlural) {
        const inType = filterCatalogProperties(all, {
          countrySlug,
          citySlug,
          typePlural,
          sale: 'all',
        });
        if (inType.length === 0) {
          return res.status(404).json({ success: false, error: 'Тип не найден' });
        }
      }

      const filtered = filterCatalogProperties(all, {
        countrySlug,
        citySlug,
        typePlural,
        sale,
      });

      const cityLabel = getCanonicalRegionLabel(citySlug, citySlug);

      return res.json({
        success: true,
        data: {
          country: countrySlug,
          city: citySlug,
          cityLabel,
          typePlural,
          sale,
          total: filtered.length,
          properties: filtered,
        },
      });
    } catch (err) {
      console.error('GET /api/catalog', err);
      return res.status(500).json({ success: false, error: err.message || 'Ошибка каталога' });
    }
  });
}
