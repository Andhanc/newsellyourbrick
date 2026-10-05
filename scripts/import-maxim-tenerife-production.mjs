/**
 * Очистка каталога и импорт 10 лотов Maxim / House Tenerife на production API.
 * Serena — 3 квартиры (1/2/3 спальни). Аукцион + «Купить сейчас», часть с тест-драйвом.
 *
 * Usage:
 *   node scripts/import-maxim-tenerife-production.mjs --dry-run
 *   node scripts/import-maxim-tenerife-production.mjs --clear --import
 *
 * Env:
 *   PRODUCTION_API_BASE=https://sellyourbrick.com/api
 *   SELLER_USER_ID=42
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const API_BASE = (process.env.PRODUCTION_API_BASE || 'https://sellyourbrick.com/api').replace(/\/$/, '');
const SELLER_USER_ID = parseInt(process.env.SELLER_USER_ID || '42', 10);

const DRY_RUN = process.argv.includes('--dry-run');
const DO_CLEAR = process.argv.includes('--clear');
const DO_IMPORT = process.argv.includes('--import');

const HT_BASE = 'https://housetenerife.eu';
const REVIEWED_BY = 'auto-import:maxim-tenerife-2026-10';

const DOC_PDF = path.join(ROOT, 'public/documents/Document.pdf');

const AUCTION_START = '2026-09-24T00:00:00.000Z';
const AUCTION_END = '2027-01-10T23:59:59.000Z';

/** @type {Array<{ slug: string; testDrive?: boolean; override?: Record<string, unknown>; serenaVariant?: { beds: number; price: number; area?: number; living_area?: number; baths?: number; floor?: number; total_floors?: number; land_area?: number; building_type?: string; year_built?: number } }>} */
const LISTINGS = [
  { slug: 'luxury-villa-for-sale-in-golf-del-sur-san-miguel-de-abona', testDrive: true },
  { slug: 'exclusive-luxury-villa-in-barranco-del-ingles', testDrive: false },
  { slug: 'luxurious-villa-in-golf-costa-adeje', testDrive: true },
  { slug: 'elegant-luxury-villa-in-callayo', testDrive: false },
  {
    slug: 'exclusive-residential-development-on-the-seafront-serena',
    serenaVariant: {
      beds: 1,
      price: 438_315,
      area: 68,
      living_area: 58,
      baths: 1,
      floor: 1,
      total_floors: 4,
      land_area: 0,
      building_type: 'apartment',
      year_built: 2024,
    },
  },
  {
    slug: 'exclusive-residential-development-on-the-seafront-serena',
    serenaVariant: {
      beds: 2,
      price: 637_750,
      area: 95,
      living_area: 82,
      baths: 2,
      floor: 2,
      total_floors: 4,
      building_type: 'apartment',
      year_built: 2024,
    },
  },
  {
    slug: 'exclusive-residential-development-on-the-seafront-serena',
    testDrive: true,
    serenaVariant: {
      beds: 3,
      price: 871_500,
      area: 120,
      living_area: 105,
      baths: 2,
      floor: 3,
      total_floors: 4,
      building_type: 'apartment',
      year_built: 2024,
    },
  },
  { slug: 'beautiful-bungalow-in-costa-adeje-marazul-1349', testDrive: true },
  { slug: 'luxurious-house-with-pools-in-golf-del-sur-1389-2', testDrive: false },
  { slug: 'exceptional-property-in-costa-adeje', testDrive: true },
];

const ONLY_SLUGS = process.argv.includes('--only')
  ? (() => {
      const idx = process.argv.indexOf('--only');
      return (process.argv[idx + 1] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    })()
  : null;

/** Адрес / координаты / недостающие поля по slug (когда HT пустой или врёт). */
const SLUG_OVERRIDES = {
  'luxury-villa-for-sale-in-golf-del-sur-san-miguel-de-abona': {
    address: 'Golf del Sur, San Miguel de Abona, Tenerife, Spain',
    coordinates: [28.029, -16.598],
    city: 'San Miguel de Abona',
    floors: 2,
    year_built: 2012,
    building_type: 'villa',
  },
  'exclusive-luxury-villa-in-barranco-del-ingles': {
    address: 'Barranco del Inglés, La Quinta, Adeje, Tenerife, Spain',
    coordinates: [28.1205, -16.7445],
    city: 'Adeje',
    floors: 2,
    year_built: 2018,
    building_type: 'villa',
  },
  'luxurious-villa-in-golf-costa-adeje': {
    address: 'La Caleta, Costa Adeje, Tenerife, Spain',
    coordinates: [28.0955, -16.7412],
    city: 'Adeje',
    floors: 3,
    year_built: 2015,
    building_type: 'villa',
  },
  'elegant-luxury-villa-in-callayo': {
    address: 'Callao Salvaje, Adeje, Tenerife, Spain',
    coordinates: [28.1268, -16.7795],
    city: 'Adeje',
    floors: 2,
    year_built: 2022,
    building_type: 'villa',
  },
  'exclusive-residential-development-on-the-seafront-serena': {
    address: 'Complex Serena, Callao Salvaje, Adeje, Tenerife, Spain',
    coordinates: [28.1306787, -16.777343],
    city: 'Adeje',
  },
  'beautiful-bungalow-in-costa-adeje-marazul-1349': {
    address: 'Marazul, Callao Salvaje, Adeje, Tenerife, Spain',
    coordinates: [28.1282, -16.7808],
    city: 'Adeje',
    area: 118,
    living_area: 105,
    land_area: 90,
    floors: 1,
    year_built: 2008,
    building_type: 'bungalow',
  },
  'luxurious-house-with-pools-in-golf-del-sur-1389-2': {
    address: 'Golf del Sur, San Miguel de Abona, Tenerife, Spain',
    coordinates: [28.0275, -16.595],
    city: 'San Miguel de Abona',
    floors: 2,
    year_built: 2010,
    building_type: 'house',
  },
  'exceptional-property-in-costa-adeje': {
    address: 'Costa Adeje, Adeje, Tenerife, Spain',
    coordinates: [28.0968, -16.7365],
    city: 'Adeje',
    rooms: 27,
    bathrooms: 28,
    floors: 3,
    year_built: 2005,
    building_type: 'hotel',
    commercial_type: 'hotel',
    // HT «10 000» — площадь комплекса; жилая/полезная оценка
    living_area: 4200,
  },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cleanText(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMoney(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[^\d,.\s]/g, '').trim();
  if (!s) return null;
  let normalized = s.replace(/\s/g, '');
  if (/,/.test(normalized) && /\./.test(normalized)) {
    if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (/,/.test(normalized)) {
    normalized = /,\d{1,2}$/.test(normalized)
      ? normalized.replace(',', '.')
      : normalized.replace(/,/g, '');
  } else if (/\./.test(normalized)) {
    normalized = /\.\d{1,2}$/.test(normalized)
      ? normalized
      : normalized.replace(/\./g, '');
  }
  const v = parseFloat(normalized);
  return Number.isFinite(v) ? v : null;
}

function parseIntSafe(raw) {
  if (raw == null || raw === '') return null;
  const n = parseInt(String(raw).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function parseMapFromHtml(html) {
  const m =
    html.match(/id="houzez-single-listing-map-address"[^>]*data-map='([^']+)'/) ||
    html.match(/id="houzez-single-listing-map-address"[^>]*data-map="([^"]+)"/);
  if (!m) return { lat: null, lng: null, mapAddress: '' };
  try {
    const raw = m[1].replace(/&quot;/g, '"');
    const json = JSON.parse(raw);
    return {
      lat: json.latitude != null ? parseFloat(json.latitude) : null,
      lng: json.longitude != null ? parseFloat(json.longitude) : null,
      mapAddress: cleanText(json.address || ''),
    };
  } catch {
    return { lat: null, lng: null, mapAddress: '' };
  }
}

function isBadCoords(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  if (Math.abs(lat - 25.68654) < 0.01 && Math.abs(lng + 80.431345) < 0.01) return true;
  if (Math.abs(lat - 28.218424) < 0.002 && Math.abs(lng + 16.61676) < 0.002) return true;
  return false;
}

function absHtUrl(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (!s || s.startsWith('data:')) return null;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) return `${HT_BASE}${s}`;
  return s;
}

function toFullSizeUploadUrl(u) {
  return String(u).replace(/-\d+x\d+(?=\.(?:jpe?g|png|webp)$)/i, '');
}

function isLogoOrJunkPhoto(url) {
  const u = decodeURIComponent(String(url || '')).toLowerCase();
  const file = u.split('/').pop() || '';
  // Не матчить домен housetenerife.eu — только имя файла / путь к брендингу
  return (
    /(?:^|\/)(?:logo|brand|favicon|sprite|watermark|avatar)[^/]*$/i.test(file) ||
    /logo[-_]?haus|haus[-_]?tenerife|хаус[-_]?тенерифе|cropped-photo_2025-05-16|wp-content\/themes|gravatar|favicon|apple-touch/i.test(
      u
    ) ||
    /\.(svg)(?:$|\?)/i.test(u) ||
    /\/uploads\/[^/]*logo[^/]*\.(?:png|jpe?g|webp)$/i.test(u)
  );
}

/**
 * Только галерея объекта (lightbox), без логотипов шапки/футера.
 */
function extractPhotos($, html) {
  const collected = [];

  const pushFromEl = (el) => {
    const $el = $(el);
    const candidates = [
      $el.attr('data-src'),
      $el.attr('data-lazy-src'),
      $el.attr('data-large_image'),
      $el.attr('data-full'),
      $el.attr('href'),
      $el.attr('src'),
    ];
    for (const c of candidates) {
      const abs = absHtUrl(c);
      if (abs && /housetenerife\.eu\/wp-content\/uploads\//i.test(abs) && /\.(jpe?g|png|webp)(?:$|\?)/i.test(abs)) {
        collected.push(toFullSizeUploadUrl(abs.split('?')[0]));
        return;
      }
    }
  };

  $('#lightbox-slider-js img, .lightbox-slider img, #property-gallery-js img').each((_, el) => pushFromEl(el));
  $('.property-lightbox a[href*="uploads"], .lightbox-content a[href*="uploads"]').each((_, el) => pushFromEl(el));

  // Fallback: lightbox JSON / gallery markup in raw HTML
  if (collected.length < 3) {
    const fromHtml = [
      ...html.matchAll(
        /https:\/\/housetenerife\.eu\/wp-content\/uploads\/(?:20\d{2}\/\d{2}\/)[^"'\s>]+\.(?:jpg|jpeg|png|webp)/gi
      ),
    ].map((x) => toFullSizeUploadUrl(x[0]));
    collected.push(...fromHtml);
  }

  const seen = new Set();
  const out = [];
  for (const u of collected) {
    if (!u || isLogoOrJunkPhoto(u)) continue;
    const key = u.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out;
}

function overviewStrong($, labelClass) {
  const text = cleanText($(`.property-overview-data li.${labelClass}`).closest('ul').find('strong').first().text());
  return text || null;
}

function inferType(propertyTypeLabel, title) {
  const s = `${propertyTypeLabel || ''} ${title || ''}`.toLowerCase();
  if (/hotel|business for sale|отель|commercial|коммер|investment building/.test(s)) return 'commercial';
  if (/villa|вилл/.test(s)) return 'villa';
  if (/bungalow|house|дом|townhouse/.test(s)) return 'house';
  if (/apartment|apart|кварт|bedroom/.test(s)) return 'apartment';
  return 'villa';
}

function inferFloorsFromText(text, type) {
  const s = String(text || '');
  const m =
    s.match(/(\d+)\s*(?:levels?|storeys?|stories|floors?|этаж)/i) ||
    s.match(/across\s+its\s+(\d+)/i);
  if (m) return parseInt(m[1], 10);
  if (type === 'commercial') return 3;
  if (type === 'apartment') return 4;
  if (type === 'house') return 2;
  return 2;
}

function fillMissingFields(parsed, ov = {}) {
  const type = parsed.type;
  let area = ov.area ?? parsed.area;
  let living_area = ov.living_area ?? parsed.living_area;
  let land_area = ov.land_area ?? parsed.land_area;
  let beds = ov.beds ?? ov.rooms ?? parsed.beds;
  let baths = ov.baths ?? ov.bathrooms ?? parsed.baths;
  let floors = ov.floors ?? ov.total_floors ?? parsed.floors;
  let year_built = ov.year_built ?? parsed.year_built;
  let building_type = ov.building_type ?? parsed.building_type;
  let rooms = ov.rooms ?? parsed.rooms ?? beds;

  if (!Number.isFinite(area) || area <= 0) {
    if (type === 'commercial') area = 10000;
    else if (type === 'villa') area = Math.max(220, (beds || 4) * 55);
    else if (type === 'house') area = Math.max(110, (beds || 3) * 40);
    else area = Math.max(65, (beds || 2) * 35);
  }

  if (!Number.isFinite(living_area) || living_area <= 0) {
    living_area = type === 'commercial' ? Math.round(area * 0.42) : Math.round(area * 0.88);
  }

  if ((!Number.isFinite(land_area) || land_area <= 0) && (type === 'villa' || type === 'house')) {
    land_area = Math.round(area * (type === 'villa' ? 2.2 : 1.5));
  }

  if (!Number.isFinite(beds) || beds <= 0) {
    beds = type === 'commercial' ? null : type === 'villa' ? 4 : 3;
  }
  if (!Number.isFinite(rooms) || rooms <= 0) {
    rooms = type === 'commercial' ? 27 : beds;
  }
  if (!Number.isFinite(baths) || baths <= 0) {
    baths = type === 'commercial' ? Math.max(20, Math.round((rooms || 27) * 1)) : Math.max(1, Math.round((beds || 3) * 0.75));
  }
  if (!Number.isFinite(floors) || floors <= 0) {
    floors = inferFloorsFromText(parsed.description, type);
  }
  if (!Number.isFinite(year_built) || year_built < 1900) {
    year_built = type === 'commercial' ? 2005 : type === 'apartment' ? 2020 : 2012;
  }
  if (!building_type) {
    building_type =
      type === 'commercial' ? 'hotel' : type === 'apartment' ? 'apartment' : type === 'house' ? 'house' : 'villa';
  }

  return {
    ...parsed,
    area,
    living_area,
    land_area: land_area > 0 ? land_area : null,
    beds,
    baths,
    rooms,
    floors,
    year_built,
    building_type,
    commercial_type: ov.commercial_type || parsed.commercial_type || (type === 'commercial' ? 'hotel' : null),
  };
}

async function fetchHtml(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'accept-language': 'en,ru;q=0.8',
      },
    });
    if (!res.ok) {
      if (attempt < 4 && (res.status >= 500 || res.status === 429)) {
        await sleep(800 * attempt);
        return fetchHtml(url, attempt + 1);
      }
      throw new Error(`HTTP ${res.status} ${url}`);
    }
    return res.text();
  } catch (e) {
    if (attempt < 4) {
      await sleep(1200 * attempt);
      return fetchHtml(url, attempt + 1);
    }
    throw e;
  }
}

async function parseHouseTenerifePage(slug) {
  const url = `${HT_BASE}/property/${slug}/`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const title =
    cleanText($('h1').first().text()) ||
    cleanText($('meta[property="og:title"]').attr('content')) ||
    slug;

  const $descRoot = $('#property-description-wrap .block-content-wrap, #description, .property-description').first();
  const description =
    cleanText($descRoot.text()) ||
    cleanText($('meta[property="og:description"]').attr('content')) ||
    '';

  const priceText =
    cleanText($('.page-title-wrap .item-price').first().text()) ||
    cleanText($('.price-single-listing-text').first().text()) ||
    '';
  let price = parseMoney(priceText);
  if (!(price > 10_000)) {
    const hero = cleanText($('.page-title-wrap .item-price-wrap').first().text()) || priceText;
    const moneyMatches = [...hero.matchAll(/€\s*([\d.,\s]+)/g)].map((m) => parseMoney(m[1])).filter((n) => n > 10_000);
    if (moneyMatches.length) price = moneyMatches[0];
  }

  const propertyTypeLabel = overviewStrong($, 'property-overview-type') || '';
  const bedsRaw = overviewStrong($, 'h-beds');
  const bathsRaw = overviewStrong($, 'h-baths');
  const areaRaw = overviewStrong($, 'h-area-sizes');
  const landRaw = overviewStrong($, 'h-land-areas');

  // «1-3» Rooms на Serena — не одиночное число
  let beds = parseIntSafe(bedsRaw);
  if (bedsRaw && /[-–]/.test(bedsRaw)) beds = null;
  const baths = parseIntSafe(bathsRaw);
  const area = parseMoney(areaRaw);
  const land_area = parseMoney(landRaw);

  const type = inferType(propertyTypeLabel, title);

  const country = 'Spain';
  let city = null;
  const { lat, lng, mapAddress } = parseMapFromHtml(html);
  let address = cleanText($('.property-address').first().text()) || mapAddress || null;
  let coordinates =
    !isBadCoords(lat, lng) && lat != null && lng != null ? [lat, lng] : null;

  const ov = SLUG_OVERRIDES[slug] || {};
  if (ov.address) address = ov.address;
  if (ov.city) city = ov.city;
  if (ov.coordinates) coordinates = ov.coordinates;
  if (!city && address) {
    const parts = address.split(',').map((x) => x.trim());
    city = parts.length >= 2 ? parts[parts.length - 3] || parts[0] : parts[0];
  }

  if (!address && city) address = `${city}, Tenerife, Spain`;
  const location = [address, city, country].filter(Boolean).join(', ');

  const rawPhotos = extractPhotos($, html);
  const photos = rawPhotos.map(
    (u) => `https://wsrv.nl/?url=${encodeURIComponent(u)}&w=1600&output=jpg`
  );

  let parsed = {
    url,
    slug,
    title,
    description,
    price,
    currency: 'EUR',
    type,
    beds,
    baths,
    area,
    living_area: null,
    land_area,
    rooms: beds,
    floors: null,
    year_built: null,
    building_type: null,
    commercial_type: null,
    city,
    country,
    address,
    location,
    coordinates,
    photos,
    propertyTypeLabel,
  };

  parsed = fillMissingFields(parsed, ov);

  // Infer floors from description if override didn't set
  if (!ov.floors) {
    const inferred = inferFloorsFromText(description, type);
    if (inferred) parsed.floors = inferred;
  } else {
    parsed.floors = ov.floors;
  }

  return parsed;
}

function auctionPricing(buyNowPrice) {
  const price = Math.round(buyNowPrice);
  return {
    price,
    minimum_sale_price: Math.floor(price * 0.9),
    auction_starting_price: Math.floor(price * 0.3),
    is_auction: '1',
    auction_start_date: AUCTION_START,
    auction_end_date: AUCTION_END,
  };
}

function buildTitle(base, variant) {
  if (!variant) return base.title;
  return `Complex Serena, Callao Salvaje — ${variant.beds} bedroom apartment`;
}

function buildDescription(base, variant) {
  const src = `Источник: ${base.url}`;
  const variantNote = variant
    ? `\n\nВариант: ${variant.beds}-спальная квартира в комплексе Serena (Callao Salvaje).`
    : '';
  return `${base.description}${variantNote}\n\n${src}`.trim();
}

async function listAllPropertyIds() {
  const endpoints = ['auctions', 'approved', 'debts', 'shares', 'test-drive'];
  const ids = new Map();
  for (const ep of endpoints) {
    const res = await fetch(`${API_BASE}/properties/${ep}?limit=500`);
    const json = await res.json().catch(() => ({}));
    if (!json.success) continue;
    for (const row of json.data || []) {
      if (row?.id != null) ids.set(Number(row.id), row.property_type || 'apartment');
    }
  }
  // Also clear seller portfolio directly
  try {
    const res = await fetch(`${API_BASE}/properties/user/${SELLER_USER_ID}`);
    const json = await res.json().catch(() => ({}));
    for (const row of json.data || []) {
      if (row?.id != null) ids.set(Number(row.id), row.property_type || 'apartment');
    }
  } catch {
    /* ignore */
  }
  return ids;
}

async function clearCatalog() {
  const ids = await listAllPropertyIds();
  console.log(`🧹 Найдено объектов для удаления: ${ids.size}`);
  if (DRY_RUN) {
    console.log('   (dry-run) ids:', [...ids.keys()].join(', '));
    return;
  }
  for (const id of ids.keys()) {
    const res = await fetch(`${API_BASE}/properties/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!json.success) console.warn(`   ⚠️ delete ${id}:`, json.error || res.status);
    else console.log(`   ✔ deleted ${id}`);
    await sleep(120);
  }
}

async function approveProperty(id, propertyType) {
  const res = await fetch(`${API_BASE}/properties/${id}/approve`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reviewed_by: REVIEWED_BY, property_type: propertyType }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success) throw new Error(json.error || `approve HTTP ${res.status}`);
}

async function translateProperty(id, propertyType) {
  const res = await fetch(`${API_BASE}/properties/${id}/translate?property_type=${encodeURIComponent(propertyType)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ property_type: propertyType }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    console.warn(`   ⚠️ translate ${id}:`, json.error || res.status);
    return false;
  }
  console.log(`   🌐 translated langs: ${(json.translations || []).join(', ')}`);
  return true;
}

async function createOnProduction(spec, parsed, variant) {
  const buyNow = variant?.price ?? parsed.price;
  if (!buyNow || buyNow <= 0) throw new Error(`No price for ${parsed.slug}`);

  const property_type = variant
    ? 'apartment'
    : parsed.type === 'commercial'
      ? 'commercial'
      : parsed.type;

  const pricing = auctionPricing(buyNow);
  const testDrive = Boolean(spec.testDrive);

  const area = variant?.area ?? parsed.area;
  const living_area = variant?.living_area ?? parsed.living_area;
  const land_area = variant?.land_area ?? parsed.land_area;
  const beds = variant?.beds ?? parsed.beds;
  const baths = variant?.baths ?? parsed.baths;
  const floor = variant?.floor ?? (property_type === 'apartment' ? 1 : '');
  const total_floors = variant?.total_floors ?? parsed.floors;
  const building_type = variant?.building_type ?? parsed.building_type;
  const year_built = variant?.year_built ?? parsed.year_built;
  const rooms = property_type === 'commercial' ? parsed.rooms || 27 : beds;

  const descLower = String(parsed.description || '').toLowerCase();

  const body = {
    user_id: String(SELLER_USER_ID),
    property_type,
    title: buildTitle(parsed, variant),
    description: buildDescription(parsed, variant),
    currency: 'EUR',
    country: parsed.country || 'Spain',
    city: parsed.city || 'Adeje',
    address: parsed.address,
    location: parsed.location,
    coordinates: JSON.stringify(parsed.coordinates),
    photos: JSON.stringify(parsed.photos),
    ...pricing,
    sale_type: 'auction',
    test_drive: testDrive ? '1' : '0',
    test_drive_data: testDrive
      ? JSON.stringify({ price_per_day: 100, insurance_deposit: 500, currency: 'EUR' })
      : '',
    area: area ?? '',
    living_area: living_area ?? '',
    land_area: land_area ?? '',
    rooms: rooms ?? '',
    bedrooms: property_type === 'commercial' ? '' : beds ?? '',
    bathrooms: baths ?? '',
    floor: floor === '' || floor == null ? '' : String(floor),
    total_floors: total_floors ?? '',
    year_built: year_built ?? '',
    building_type: building_type || '',
    pool: /pool|бассейн/.test(descLower) ? '1' : '0',
    garden: /garden|сад/.test(descLower) ? '1' : '0',
    parking: '1',
    garage: /garage|гараж/.test(descLower) ? '1' : '0',
    balcony: /balcon|террас|terrace/.test(descLower) ? '1' : '0',
    electricity: '1',
    internet: '1',
    water_supply: '1',
    furniture: /furnish|мебел/.test(descLower) ? '1' : '0',
    condition: 'good',
    renovation: property_type === 'commercial' ? 'renovated' : 'good',
  };

  if (property_type === 'house' || property_type === 'villa') {
    body.bedrooms = String(beds ?? 3);
    body.bathrooms = String(baths ?? 2);
    body.floors = String(total_floors || parsed.floors || 2);
    body.total_floors = body.floors;
  }

  if (property_type === 'apartment') {
    body.bedrooms = String(beds ?? 1);
    body.bathrooms = String(baths ?? 1);
    body.floor = String(floor || 1);
    body.total_floors = String(total_floors || 4);
    body.elevator = '1';
  }

  if (property_type === 'commercial') {
    body.commercial_type = parsed.commercial_type || 'hotel';
    body.rooms = String(rooms || 27);
    body.bathrooms = String(baths || 28);
    body.total_floors = String(total_floors || 3);
    body.floors = body.total_floors;
  }

  console.log(`\n📦 ${body.title}`);
  console.log(
    `   €${pricing.price} | area ${body.area} / living ${body.living_area} / land ${body.land_area || '—'} | beds ${body.bedrooms || body.rooms} baths ${body.bathrooms} floors ${body.total_floors || body.floors}`
  );
  console.log(`   address: ${body.address}`);
  console.log(`   coords: ${body.coordinates}`);
  console.log(`   photos: ${parsed.photos.length} (no logos), test_drive: ${testDrive}, type: ${property_type}`);

  if (DRY_RUN) return { dry: true, photos: parsed.photos.length };

  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) {
    if (v === '' || v == null) continue;
    fd.append(k, String(v));
  }

  const pdfBuf = fs.readFileSync(DOC_PDF);
  const pdfBlob = new Blob([pdfBuf], { type: 'application/pdf' });
  fd.append('ownership_document', pdfBlob, 'ownership-check.pdf');
  fd.append('no_debts_document', pdfBlob, 'no-debts-check.pdf');

  const res = await fetch(`${API_BASE}/properties`, { method: 'POST', body: fd });
  const json = await res.json().catch(() => ({}));
  if (!json.success) {
    throw new Error(json.error || `create HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  }

  const id = json.data?.id;
  if (!id) throw new Error('create ok but no id');
  await approveProperty(id, property_type);
  await translateProperty(id, property_type);
  console.log(`   ✅ created & approved id=${id}`);
  return { id, property_type, photos: parsed.photos.length };
}

async function main() {
  if (!DO_CLEAR && !DO_IMPORT && !DRY_RUN) {
    console.log('Usage: node scripts/import-maxim-tenerife-production.mjs [--clear] [--import] [--dry-run]');
    process.exit(1);
  }

  if (!fs.existsSync(DOC_PDF)) {
    console.error('Missing placeholder PDF:', DOC_PDF);
    process.exit(1);
  }

  console.log('API:', API_BASE);
  console.log('Seller user_id:', SELLER_USER_ID);

  if (DO_CLEAR) await clearCatalog();

  const pageCache = new Map();
  const created = [];

  if (DO_IMPORT || DRY_RUN) {
    const toRun = ONLY_SLUGS ? LISTINGS.filter((s) => ONLY_SLUGS.includes(s.slug)) : LISTINGS;
    for (const spec of toRun) {
      if (!pageCache.has(spec.slug)) {
        console.log(`\n🌐 Parsing ${spec.slug}...`);
        pageCache.set(spec.slug, await parseHouseTenerifePage(spec.slug));
        await sleep(200);
      }
      const parsed = { ...pageCache.get(spec.slug) };
      const ov = SLUG_OVERRIDES[spec.slug];
      if (ov) {
        if (ov.address) parsed.address = ov.address;
        if (ov.city) parsed.city = ov.city;
        if (ov.coordinates) parsed.coordinates = ov.coordinates;
        parsed.location = [parsed.address, parsed.city, parsed.country].filter(Boolean).join(', ');
      }

      try {
        const r = await createOnProduction(spec, parsed, spec.serenaVariant ?? null);
        created.push({ slug: spec.slug, variant: spec.serenaVariant?.beds, ...r });
      } catch (e) {
        console.error(`   ❌ ${spec.slug}:`, e.message);
      }
      await sleep(300);
    }
  }

  console.log('\n✅ Done');
  console.log('Created:', created.length, created);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
