import 'dotenv/config';
import * as cheerio from 'cheerio';
import { getPrisma, closePrisma } from '../server/database/prismaClient.js';
import { apartmentQueries, houseQueries } from '../server/database/module2PropertyPrisma.js';

const BASE = 'https://housetenerife.eu';
const START_URL = `${BASE}/ru/property/`;

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return null;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith('--')) return null;
  return next;
}

const PER_TYPE_DEFAULT = 25;
const PER_TYPE = Math.max(1, parseInt(getArgValue('--per-type') || String(PER_TYPE_DEFAULT), 10) || PER_TYPE_DEFAULT);
const REFRESH = process.argv.includes('--refresh');
const PAGE_LIMIT = Math.max(1, parseInt(getArgValue('--page-limit') || '10', 10) || 10);
const VERBOSE = process.argv.includes('--verbose');
const REFRESH_EXISTING = process.argv.includes('--refresh-existing');
const REFRESH_LIMIT = Math.max(1, parseInt(getArgValue('--refresh-limit') || '50', 10) || 50);
const GEOCODE = process.argv.includes('--geocode');
const REBALANCE_FORMS = process.argv.includes('--rebalance-forms');
const REBALANCE_DRY_RUN = process.argv.includes('--dry-run');
const REBALANCE_DIST = (getArgValue('--dist') || 'buy_now=50,auction=20,share=20,debt=10').trim();

const TARGET_COUNTS = {
  apartment: PER_TYPE,
  house: PER_TYPE,
  villa: PER_TYPE,
  commercial: PER_TYPE,
};

const SALE_FORMS = /** @type {const} */ (['buy_now', 'auction', 'share', 'debt', 'buy_now']);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function absUrl(u) {
  if (!u) return null;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/')) return `${BASE}${u}`;
  return `${BASE}/${u}`;
}

function cleanText(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(s) {
  return cleanText(s)
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9а-яё]+/giu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function parseMoneyToNumber(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[^\d,.\s]/g, '').trim();
  if (!s) return null;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  let normalized = s;
  if (hasComma && !hasDot) {
    normalized = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  } else if (hasComma && hasDot) {
    normalized = s.replace(/,/g, '');
  }
  normalized = normalized.replace(/\s/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseIntSafe(raw) {
  const n = parseInt(String(raw || '').replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function parseAreaToNumber(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[^\d,.\s]/g, '').trim();
  if (!s) return null;
  const normalized = s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s.replace(/,/g, '');
  const n = parseFloat(normalized.replace(/\s/g, ''));
  return Number.isFinite(n) ? n : null;
}

function extractLabeledValue(html, label) {
  // Works for blocks like: <li>Country:</li><li><strong>Spain</strong></li> etc
  const re = new RegExp(`${label}\\s*<\\/[^>]+>\\s*<[^>]+>\\s*(?:<strong>)?([^<]+)`, 'i');
  const m = html.match(re);
  return m ? cleanText(m[1]) : null;
}

function extractLatLngFromHtml(html) {
  // Prefer explicit property lat/lng if present
  const lat =
    (html.match(/\bproperty_lat(?:itude)?\b[^0-9-]{0,50}(-?\d{1,2}\.\d+)/i) || [])[1] ||
    (html.match(/\bprop_lat\b[^0-9-]{0,50}(-?\d{1,2}\.\d+)/i) || [])[1] ||
    (html.match(/data-lat=\"(-?\d{1,2}\.\d+)\"/i) || [])[1];

  const lng =
    (html.match(/\bproperty_lng\b[^0-9-]{0,50}(-?\d{1,3}\.\d+)/i) || [])[1] ||
    (html.match(/\bproperty_lon(?:gitude)?\b[^0-9-]{0,50}(-?\d{1,3}\.\d+)/i) || [])[1] ||
    (html.match(/data-lng=\"(-?\d{1,3}\.\d+)\"/i) || [])[1] ||
    (html.match(/data-lon=\"(-?\d{1,3}\.\d+)\"/i) || [])[1];

  const latN = lat ? parseFloat(lat) : null;
  const lngN = lng ? parseFloat(lng) : null;
  // Guard against unrelated pixels coords (e.g., Miami)
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;
  if (Math.abs(latN) < 5 || Math.abs(lngN) < 5) return null;
  // Tenerife roughly: lat 27-29, lng -18 to -15. Dubai: ~25,55. Marbella: ~36,-5.
  // Allow broad but reject obvious US (-80 etc) if title/locale is Spain? We'll keep broad and rely on label fields too.
  return { lat: latN, lng: lngN };
}

function extractFeatures($) {
  // Try multiple common containers
  const candidates = [
    '.property-features-wrap li',
    '.property-features li',
    '.detail-wrap li',
    '.features-list li',
    '.property-amenities li',
  ];
  const out = [];
  for (const sel of candidates) {
    const items = $(sel)
      .toArray()
      .map((el) => cleanText($(el).text()))
      .filter((t) => t && t.length >= 2 && t.length <= 80);
    if (items.length >= 3) {
      out.push(...items);
    }
  }
  return uniq(out);
}

function mapAmenitiesFromFeatures(features, title, propertyTypeLabel) {
  const all = uniq([...(features || [])]).map((x) => x.toLowerCase());
  const t = cleanText(title || '').toLowerCase();
  const pt = cleanText(propertyTypeLabel || '').toLowerCase();

  const has = (re) => all.some((x) => re.test(x)) || re.test(t) || re.test(pt);

  return {
    balcony: has(/балкон|террас|balcon|terrac/),
    parking: has(/парковк|parking/),
    elevator: has(/лифт|elevator|lift/),
    pool: has(/бассейн|pool|swim/),
    garden: has(/сад|garden|lawn/),
    garage: has(/гараж|garage/),
    security: has(/охрана|security|guard/),
    furniture: has(/мебел|furnish/),
    internet: has(/wifi|интернет|internet/),
    electricity: true,
  };
}

function pickUpdateDataForTable(table, data) {
  const common = {
    property_type: data.property_type,
    title: data.title,
    description: data.description ?? null,
    price: data.price ?? null,
    currency: data.currency ?? null,
    minimum_sale_price: data.minimum_sale_price ?? null,
    area: data.area ?? null,
    bathrooms: data.bathrooms ?? null,
    location: data.location ?? null,
    address: data.address ?? null,
    country: data.country ?? null,
    city: data.city ?? null,
    coordinates: data.coordinates ? JSON.stringify(data.coordinates) : null,
    additional_amenities: data.additional_amenities ?? null,
    photos: data.photos ? JSON.stringify(data.photos) : null,
    moderation_status: data.moderation_status ?? 'approved',
    reviewed_by: data.reviewed_by ?? null,
    reviewed_at: data.reviewed_at ?? null,
    is_auction: data.is_auction ? 1 : 0,
    auction_start_date: data.auction_start_date ?? null,
    auction_end_date: data.auction_end_date ?? null,
    auction_starting_price: data.auction_starting_price ?? null,
    sale_type: data.sale_type ?? null,
    is_shared_ownership: data.is_shared_ownership ? 1 : 0,
    total_shares: data.total_shares ?? null,
    shares_sold: data.shares_sold ?? undefined,
    is_debt: data.is_debt ? 1 : 0,
    has_debt: data.has_debt ? 1 : 0,
    debt_amount: data.debt_amount ?? null,
    debt_severity: data.debt_severity ?? null,
    parking: data.parking ? 1 : 0,
    electricity: data.electricity ? 1 : 0,
    internet: data.internet ? 1 : 0,
    security: data.security ? 1 : 0,
    furniture: data.furniture ? 1 : 0,
  };

  if (table === 'properties_apartments') {
    return {
      ...common,
      // apartments table doesn't have bedrooms; keep rooms best-effort
      rooms: data.rooms ?? (data.bedrooms ?? null),
      floor: data.floor ?? null,
      total_floors: data.total_floors ?? null,
      year_built: data.year_built ?? null,
      renovation: data.renovation ?? null,
      condition: data.condition ?? null,
      heating: data.heating ?? null,
      water_supply: data.water_supply ?? null,
      sewerage: data.sewerage ?? null,
      commercial_type: data.commercial_type ?? null,
      business_hours: data.business_hours ?? null,
      elevator: data.elevator ? 1 : 0,
      balcony: data.balcony ? 1 : 0,
      amenities: JSON.stringify(buildAmenitiesArray('properties_apartments', data)),
    };
  }

  return {
    ...common,
    bedrooms: data.bedrooms ?? null,
    land_area: data.land_area ?? null,
    floors: data.floors ?? null,
    year_built: data.year_built ?? null,
    renovation: data.renovation ?? null,
    condition: data.condition ?? null,
    heating: data.heating ?? null,
    water_supply: data.water_supply ?? null,
    sewerage: data.sewerage ?? null,
    pool: data.pool ? 1 : 0,
    garden: data.garden ? 1 : 0,
    garage: data.garage ? 1 : 0,
    amenities: JSON.stringify(buildAmenitiesArray('properties_houses', data)),
  };
}

function buildAmenitiesArray(table, data) {
  const a = [];
  if (table === 'properties_apartments') {
    if (data.balcony) a.push('balcony');
    if (data.parking) a.push('parking');
    if (data.elevator) a.push('elevator');
    if (data.electricity) a.push('electricity');
    if (data.internet) a.push('internet');
    if (data.security) a.push('security');
    if (data.furniture) a.push('furniture');
    return a;
  }
  if (data.pool) a.push('pool');
  if (data.garden) a.push('garden');
  if (data.garage) a.push('garage');
  if (data.parking) a.push('parking');
  if (data.electricity) a.push('electricity');
  if (data.internet) a.push('internet');
  if (data.security) a.push('security');
  if (data.furniture) a.push('furniture');
  return a;
}

function extractSourceUrlFromDescription(desc) {
  const m = String(desc || '').match(/Источник:\s*(https?:\/\/\S+)/i);
  return m ? m[1].trim().replace(/[)\]]+$/, '') : null;
}

function parseDist(raw) {
  const out = { buy_now: 50, auction: 20, share: 20, debt: 10 };
  const parts = String(raw || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  for (const p of parts) {
    const [k, v] = p.split('=').map((x) => x.trim());
    const n = parseInt(v, 10);
    if (!k || !Number.isFinite(n)) continue;
    if (!['buy_now', 'auction', 'share', 'debt'].includes(k)) continue;
    out[k] = n;
  }
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  if (sum <= 0) return out;
  for (const k of Object.keys(out)) out[k] = Math.round((out[k] * 100) / sum);
  return out;
}

function pickFormByIndex(i, dist) {
  const order = /** @type {const} */ (['buy_now', 'auction', 'share', 'debt']);
  const buckets = [];
  for (const k of order) {
    const count = Math.max(0, dist[k] || 0);
    for (let n = 0; n < count; n++) buckets.push(k);
  }
  if (buckets.length === 0) return 'buy_now';
  return buckets[i % buckets.length];
}

function applySaleFormOnRow(form, price) {
  const now = new Date();
  const base = {
    is_auction: 0,
    sale_type: null,
    is_shared_ownership: 0,
    total_shares: null,
    shares_sold: 0,
    is_debt: 0,
    has_debt: 0,
    debt_amount: null,
    debt_severity: null,
    auction_start_date: null,
    auction_end_date: null,
    auction_starting_price: null,
    minimum_sale_price: price ?? null,
  };
  if (form === 'buy_now') return base;
  if (form === 'auction') {
    return {
      ...base,
      is_auction: 1,
      sale_type: 'auction',
      auction_start_date: now.toISOString(),
      auction_end_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      auction_starting_price: price != null ? Math.max(1, price * 0.8) : null,
      minimum_sale_price: null,
    };
  }
  if (form === 'share') {
    return {
      ...base,
      is_shared_ownership: 1,
      sale_type: 'share',
      total_shares: 100,
      shares_sold: 0,
    };
  }
  if (form === 'debt') {
    return {
      ...base,
      is_debt: 1,
      has_debt: 1,
      sale_type: 'debt',
      debt_amount: price != null ? Math.max(100, price * 0.12) : 10000,
      debt_severity: 'yellow',
    };
  }
  return base;
}

async function fetchHtml(url, attempt = 1) {
  const res = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      'accept-language': 'ru,en;q=0.8',
    },
  });
  if (!res.ok) {
    if (attempt < 3 && (res.status >= 500 || res.status === 429)) {
      await sleep(400 * attempt);
      return fetchHtml(url, attempt + 1);
    }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

function extractListingLinksFromArchive(html) {
  const links = [
    ...html.matchAll(/href=\"(https?:\/\/housetenerife\.eu\/ru\/property\/(?!page\/)[^\"?#]+)\"/g),
  ].map((m) => m[1]);
  return uniq(links).filter((u) => !/\/ru\/property\/feed\/?$/.test(u));
}

function inferInternalTypeFromText(propertyTypeLabel, titleText) {
  const s = cleanText(propertyTypeLabel || '').toLowerCase();
  const t = cleanText(titleText || '').toLowerCase();
  if (
    s.includes('villas') ||
    s.includes('villa') ||
    s.includes('вилла') ||
    s.includes('виллы') ||
    t.includes('вилла') ||
    t.includes('виллы')
  ) {
    return 'villa';
  }
  if (
    s.includes('house') ||
    s.includes('дом') ||
    s.includes('дома') ||
    t.includes('дом') ||
    t.includes('таунхаус')
  ) {
    return 'house';
  }
  if (
    s.includes('apart') ||
    s.includes('апартамент') ||
    s.includes('апартаменты') ||
    s.includes('квартира') ||
    t.includes('кварт') ||
    t.includes('студ')
  ) {
    return 'apartment';
  }
  if (
    s.includes('commercial') ||
    s.includes('коммер') ||
    s.includes('business') ||
    s.includes('бизнес') ||
    s.includes('restaurant') ||
    s.includes('ресторан') ||
    s.includes('каф') ||
    s.includes('land') ||
    s.includes('земл') ||
    s.includes('участ') ||
    s.includes('investment') ||
    s.includes('инвест')
  ) {
    return 'commercial';
  }
  return null;
}

function parseDetail(html, url) {
  const $ = cheerio.load(html);
  // Avoid accidental capture of CSS/JS in text extraction
  $('script, style, noscript').remove();

  const title =
    cleanText($('h1').first().text()) ||
    cleanText($('meta[property="og:title"]').attr('content')) ||
    cleanText($('title').text()) ||
    url;

  const ogDesc = cleanText($('meta[property="og:description"]').attr('content'));

  // Prefer explicit "Description" tab/section
  const descTextCandidates = [
    cleanText($('#property-description, #description, #desc').text()),
    cleanText($('.property-description, .property-description-wrap, .property-description-block').text()),
    cleanText($('.tab-content .tab-pane:contains("Description")').text()),
    cleanText($('.entry-content').first().text()),
  ].filter((x) => x && x.length > 80);
  const description = (descTextCandidates[0] || ogDesc || '').trim();

  const priceText =
    cleanText($('.page-title-wrap .item-price .price').first().text()) ||
    cleanText($('.item-price .price').first().text()) ||
    null;
  const price = parseMoneyToNumber(priceText);
  const currency = priceText && priceText.includes('€') ? 'EUR' : 'USD';

  // Key facts usually appear as "Bedroom/Bathroom/Area Size"
  const detailsText = cleanText(
    $('.property-overview, .property-overview-data, .property-details, .detail-wrap').text()
  );

  // Prefer overview blocks: value in <strong> within the same <ul> as the label li (.h-beds/.h-baths)
  const bedsRawOverview = cleanText($('.h-beds').first().closest('ul').find('strong').first().text());
  const bathsRawOverview = cleanText($('.h-baths').first().closest('ul').find('strong').first().text());

  const beds =
    parseIntSafe(bedsRawOverview) ||
    parseIntSafe($('*:contains("Bedroom")').first().next().text()) ||
    parseIntSafe($('*:contains("Beds")').first().text()) ||
    parseIntSafe((detailsText.match(/(\d+)\s*(?:Bedroom|Bed|Комнаты|Комната)/i) || [])[1]);

  const baths =
    parseIntSafe(bathsRawOverview) ||
    parseIntSafe((detailsText.match(/(\d+)\s*(?:Bathroom|Bath|Ванн)/i) || [])[1]) ||
    parseIntSafe($('*:contains("Bath")').first().text());

  const safeBeds = beds != null && Number.isFinite(beds) && beds > 0 && beds < 50 ? beds : null;
  const safeBaths = baths != null && Number.isFinite(baths) && baths > 0 && baths < 50 ? baths : null;

  const area =
    parseAreaToNumber((detailsText.match(/(\d[\d\s.,]*)\s*(?:Area Size|m²|m2|кв\.?\s*м)/i) || [])[1]) ||
    parseAreaToNumber($('.property-size, .property-area').first().text());

  const typeValFromOverview = cleanText(
    $('.property-overview-type')
      .filter((_, el) => cleanText($(el).text()).toLowerCase() === 'property type')
      .first()
      .next('li')
      .text()
  );
  const propertyTypeLabel =
    typeValFromOverview ||
    cleanText($('*:contains("Property type")').parent().text()) ||
    cleanText($('*:contains("Property type")').text()) ||
    null;
  const inferredType = inferInternalTypeFromText(propertyTypeLabel, title);

  let country = extractLabeledValue(html, 'Country') || extractLabeledValue(html, 'Страна') || null;
  let city = extractLabeledValue(html, 'City') || extractLabeledValue(html, 'Город') || null;
  const state =
    extractLabeledValue(html, 'State/county') ||
    extractLabeledValue(html, 'State') ||
    extractLabeledValue(html, 'Регион') ||
    extractLabeledValue(html, 'Район') ||
    null;
  const address = cleanText($('.page-title-wrap .property-address, .property-address').first().text()) || null;
  const locationParts = uniq([address, city, state, country].filter(Boolean));
  const location = locationParts.length ? locationParts.join(', ') : null;

  const coords = extractLatLngFromHtml(html);
  const coordinates = coords ? { lat: coords.lat, lng: coords.lng } : null;

  const ogImage = absUrl($('meta[property="og:image"]').attr('content'));
  const imgUrls = $('img')
    .toArray()
    .map((el) => absUrl($(el).attr('data-src') || $(el).attr('src')))
    .filter((u) => u && /wp-content\/uploads\/.+\.(jpg|jpeg|png|webp)$/i.test(u));
  const photos = uniq([ogImage, ...imgUrls]).slice(0, 20);

  const agentName = cleanText($('li.agent-name').first().clone().children().remove().end().text()) || null;
  const agentImg = absUrl($('.agent-image img').first().attr('src')) || null;

  const features = extractFeatures($);
  const amenityFlags = mapAmenitiesFromFeatures(features, title, propertyTypeLabel);

  // Heuristics for country/city when the page doesn't expose them clearly
  const hintText = `${title} ${description}`.toLowerCase();
  if (!country) {
    if (/(дубай|dubai)/i.test(hintText)) country = 'UAE';
    else if (/(марбель|marbella|ибица|ibiza|тенериф|tenerife|испан)/i.test(hintText)) country = 'Spain';
  }
  if (!city) {
    if (/(дубай|dubai)/i.test(hintText)) city = 'Dubai';
  }

  return {
    url,
    title,
    description,
    price,
    currency,
    beds: safeBeds,
    baths: safeBaths,
    area: area ?? null,
    inferredType,
    location,
    address,
    country,
    city,
    coordinates,
    photos,
    agentName,
    agentImg,
    propertyTypeLabel,
    features,
    amenityFlags,
  };
}

async function geocodeNominatim(query) {
  const q = cleanText(query);
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      'user-agent': 'newsellyourbrick/1.0 (import script; contact: dev@local)',
      'accept-language': 'ru,en;q=0.8',
    },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const first = Array.isArray(json) ? json[0] : null;
  if (!first) return null;
  const lat = parseFloat(first.lat);
  const lng = parseFloat(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function ensureSellerUser({ agentName, agentImg }) {
  const prisma = getPrisma();
  const safeName = agentName && agentName.length > 1 ? agentName : 'House Tenerife';
  const slug = slugify(safeName) || 'house-tenerife';
  const phone_number = `ht:${slug}`; // users.phone_number is UNIQUE; use stable pseudo

  const existing = await prisma.users.findUnique({ where: { phone_number } }).catch(() => null);
  if (existing) return existing;

  const parts = safeName.split(' ').filter(Boolean);
  const first_name = parts[0] || 'House';
  const last_name = parts.slice(1).join(' ') || 'Tenerife';

  return await prisma.users.create({
    data: {
      first_name,
      last_name,
      phone_number,
      country: 'Spain',
      role: 'seller',
      user_photo: agentImg || null,
      is_verified: 1,
    },
  });
}

function saleFormForIndex(i) {
  return SALE_FORMS[i % SALE_FORMS.length];
}

function applySaleFormFields(form, base, price) {
  const now = new Date();
  const out = { ...base };

  if (form === 'buy_now') {
    out.is_auction = 0;
    out.sale_type = null;
    out.is_shared_ownership = 0;
    out.total_shares = null;
    out.is_debt = 0;
    out.has_debt = 0;
    return out;
  }

  if (form === 'auction') {
    out.is_auction = 1;
    out.sale_type = 'auction';
    out.auction_start_date = now.toISOString();
    out.auction_end_date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    out.auction_starting_price = price != null ? Math.max(1, price * 0.8) : null;
    out.minimum_sale_price = null;
    out.is_shared_ownership = 0;
    out.total_shares = null;
    out.is_debt = 0;
    out.has_debt = 0;
    return out;
  }

  if (form === 'share') {
    out.is_auction = 0;
    out.sale_type = 'share';
    out.is_shared_ownership = 1;
    out.total_shares = 100;
    out.shares_sold = 0;
    out.is_debt = 0;
    out.has_debt = 0;
    return out;
  }

  if (form === 'debt') {
    out.is_auction = 0;
    out.sale_type = 'debt';
    out.is_debt = 1;
    out.has_debt = 1;
    out.debt_amount = price != null ? Math.max(100, price * 0.12) : 10000;
    out.debt_severity = 'yellow';
    out.is_shared_ownership = 0;
    out.total_shares = null;
    return out;
  }

  return out;
}

async function insertProperty(parsed, userId, form) {
  const prisma = getPrisma();
  const internalType = parsed.inferredType;
  if (!internalType) return null;

  // Cheap idempotency: skip if this source URL is already present in description
  const urlNeedle = `Источник: ${parsed.url}`;
  const existing =
    internalType === 'house' || internalType === 'villa'
      ? await prisma.properties_houses.findFirst({ where: { description: { contains: urlNeedle } }, select: { id: true } })
      : await prisma.properties_apartments.findFirst({ where: { description: { contains: urlNeedle } }, select: { id: true } });
  if (existing?.id && !REFRESH) return null;

  const base = {
    user_id: userId,
    property_type: internalType === 'commercial' ? 'commercial' : internalType,
    title: parsed.title,
    description: `${parsed.description || ''}${parsed.description ? '\n\n' : ''}Источник: ${parsed.url}`.trim(),
    price: parsed.price,
    currency: parsed.currency || 'EUR',
    minimum_sale_price: parsed.price,
    area: parsed.area,
    living_area: null,
    rooms: null,
    bedrooms: parsed.beds,
    bathrooms: parsed.baths,
    location: parsed.location,
    address: parsed.address || null,
    country: parsed.country || 'Spain',
    city: parsed.city || null,
    coordinates: parsed.coordinates || null,
    renovation: null,
    condition: null,
    heating: null,
    water_supply: null,
    sewerage: null,
    balcony: parsed.amenityFlags?.balcony ? 1 : 0,
    parking: parsed.amenityFlags?.parking ? 1 : 0,
    elevator: parsed.amenityFlags?.elevator ? 1 : 0,
    electricity: parsed.amenityFlags?.electricity ? 1 : 0,
    internet: parsed.amenityFlags?.internet ? 1 : 0,
    security: parsed.amenityFlags?.security ? 1 : 0,
    furniture: parsed.amenityFlags?.furniture ? 1 : 0,
    commercial_type: internalType === 'commercial' ? 'imported' : null,
    business_hours: null,
    additional_amenities: uniq(
      [
        parsed.propertyTypeLabel ? `Тип на источнике: ${parsed.propertyTypeLabel}` : null,
        parsed.features && parsed.features.length ? `Удобства: ${parsed.features.slice(0, 20).join(', ')}` : null,
      ].filter(Boolean)
    ).join('\n'),
    photos: parsed.photos && parsed.photos.length ? parsed.photos : null,
    videos: null,
    moderation_status: 'approved',
    reviewed_by: 'auto-import:housetenerife',
    reviewed_at: new Date().toISOString(),
  };

  const data = applySaleFormFields(form, base, parsed.price);

  // Refresh mode: update existing row (by url needle) instead of inserting duplicates
  if (existing?.id && REFRESH) {
    if (internalType === 'house' || internalType === 'villa') {
      await prisma.properties_houses.update({
        where: { id: existing.id },
        data: pickUpdateDataForTable('properties_houses', data),
      });
      return { table: 'properties_houses', id: existing.id };
    }
    await prisma.properties_apartments.update({
      where: { id: existing.id },
      data: pickUpdateDataForTable('properties_apartments', data),
    });
    return { table: 'properties_apartments', id: existing.id };
  }

  if (internalType === 'house' || internalType === 'villa') {
    const r = await houseQueries.create(data);
    const id = Number(r?.lastInsertRowid);
    if (Number.isFinite(id)) {
      await prisma.properties_houses.update({
        where: { id },
        data: { reviewed_by: base.reviewed_by, reviewed_at: base.reviewed_at },
      });
    }
    return { table: 'properties_houses', id };
  }

  // apartment or commercial
  const r = await apartmentQueries.create(data);
  const id = Number(r?.lastInsertRowid);
  if (Number.isFinite(id)) {
    await prisma.properties_apartments.update({
      where: { id },
      data: { reviewed_by: base.reviewed_by, reviewed_at: base.reviewed_at },
    });
  }
  return { table: 'properties_apartments', id };
}

async function main() {
  const prisma = getPrisma();
  // Continue from existing auto-imported rows
  const [aptA, aptC, houseH, houseV] = await Promise.all([
    prisma.properties_apartments.count({
      where: { reviewed_by: 'auto-import:housetenerife', property_type: 'apartment' },
    }),
    prisma.properties_apartments.count({
      where: { reviewed_by: 'auto-import:housetenerife', property_type: 'commercial' },
    }),
    prisma.properties_houses.count({ where: { reviewed_by: 'auto-import:housetenerife', property_type: 'house' } }),
    prisma.properties_houses.count({ where: { reviewed_by: 'auto-import:housetenerife', property_type: 'villa' } }),
  ]);
  const counts = { apartment: aptA, house: houseH, villa: houseV, commercial: aptC };
  const inserted = [];

  // Refresh already-imported rows directly (more reliable than scanning archive pages)
  if (REFRESH_EXISTING) {
    const touched = [];
    const [aptRows, houseRows] = await Promise.all([
      prisma.properties_apartments.findMany({
        where: { reviewed_by: 'auto-import:housetenerife' },
        orderBy: { created_at: 'desc' },
        take: REFRESH_LIMIT,
        select: { id: true, description: true, user_id: true },
      }),
      prisma.properties_houses.findMany({
        where: { reviewed_by: 'auto-import:housetenerife' },
        orderBy: { created_at: 'desc' },
        take: REFRESH_LIMIT,
        select: { id: true, description: true, user_id: true },
      }),
    ]);

    for (const row of [...aptRows.map((r) => ({ ...r, table: 'properties_apartments' })), ...houseRows.map((r) => ({ ...r, table: 'properties_houses' }))]) {
      const src = extractSourceUrlFromDescription(row.description);
      if (!src) continue;
      let html;
      try {
        html = await fetchHtml(src);
      } catch {
        continue;
      }
      const parsed = parseDetail(html, src);
      if (!parsed.inferredType) continue;
      const seller = await ensureSellerUser({ agentName: parsed.agentName, agentImg: parsed.agentImg });

      let coords = parsed.coordinates;
      if (GEOCODE && !coords) {
        const qParts = [parsed.address, parsed.city, parsed.country].filter(Boolean);
        // Avoid useless geocode (country-only) that returns country center
        if (qParts.length >= 2 || (parsed.city && parsed.country) || parsed.address) {
          const q = qParts.join(', ');
          coords = await geocodeNominatim(q);
          // be nice to OSM
          await sleep(1100);
        }
      }

      // keep current sale form fields as-is; we only refresh content fields
      const baseForm = 'buy_now';
      const baseData = applySaleFormFields(baseForm, {
        user_id: seller.id,
        property_type: parsed.inferredType === 'commercial' ? 'commercial' : parsed.inferredType,
        title: parsed.title,
        description: `${parsed.description || ''}${parsed.description ? '\n\n' : ''}Источник: ${src}`.trim(),
        price: parsed.price,
        currency: parsed.currency || 'EUR',
        minimum_sale_price: parsed.price,
        area: parsed.area,
        rooms: null,
        bedrooms: parsed.beds,
        bathrooms: parsed.baths,
        location: parsed.location,
        address: parsed.address,
        country: parsed.country || 'Spain',
        city: parsed.city,
        coordinates: coords,
        balcony: parsed.amenityFlags?.balcony ? 1 : 0,
        parking: parsed.amenityFlags?.parking ? 1 : 0,
        elevator: parsed.amenityFlags?.elevator ? 1 : 0,
        electricity: parsed.amenityFlags?.electricity ? 1 : 0,
        internet: parsed.amenityFlags?.internet ? 1 : 0,
        security: parsed.amenityFlags?.security ? 1 : 0,
        furniture: parsed.amenityFlags?.furniture ? 1 : 0,
        pool: parsed.amenityFlags?.pool ? 1 : 0,
        garden: parsed.amenityFlags?.garden ? 1 : 0,
        garage: parsed.amenityFlags?.garage ? 1 : 0,
        additional_amenities: uniq(
          [
            parsed.propertyTypeLabel ? `Тип на источнике: ${parsed.propertyTypeLabel}` : null,
            parsed.features && parsed.features.length ? `Удобства: ${parsed.features.slice(0, 30).join(', ')}` : null,
          ].filter(Boolean)
        ).join('\n'),
        photos: parsed.photos && parsed.photos.length ? parsed.photos : null,
        moderation_status: 'approved',
        reviewed_by: 'auto-import:housetenerife',
        reviewed_at: new Date().toISOString(),
      }, parsed.price);

      const updateData = pickUpdateDataForTable(row.table, baseData);
      if (row.table === 'properties_apartments') {
        await prisma.properties_apartments.update({ where: { id: row.id }, data: updateData });
      } else {
        await prisma.properties_houses.update({ where: { id: row.id }, data: updateData });
      }
      touched.push({ table: row.table, id: row.id, src });
      if (VERBOSE) console.log('✔ refreshed-existing', row.table, row.id);
      await sleep(120);
    }

    console.log('✅ Refresh-existing finished');
    console.log('Mode: refresh-existing');
    console.log('Touched:', touched.length);
    await closePrisma();
    return;
  }

  if (REBALANCE_FORMS) {
    const dist = parseDist(REBALANCE_DIST);
    console.log('Rebalance dist:', dist, REBALANCE_DRY_RUN ? '(dry-run)' : '');

    const [aptAll, houseAll] = await Promise.all([
      prisma.properties_apartments.findMany({
        where: { reviewed_by: 'auto-import:housetenerife' },
        orderBy: [{ property_type: 'asc' }, { id: 'asc' }],
        select: { id: true, property_type: true, price: true },
      }),
      prisma.properties_houses.findMany({
        where: { reviewed_by: 'auto-import:housetenerife' },
        orderBy: [{ property_type: 'asc' }, { id: 'asc' }],
        select: { id: true, property_type: true, price: true },
      }),
    ]);

    /** @type {Record<string, Array<{id:number, price:number|null}>>} */
    const byTypeA = {};
    for (const r of aptAll) {
      const t = String(r.property_type || '').toLowerCase();
      (byTypeA[t] ||= []).push({ id: r.id, price: r.price ?? null });
    }
    /** @type {Record<string, Array<{id:number, price:number|null}>>} */
    const byTypeH = {};
    for (const r of houseAll) {
      const t = String(r.property_type || '').toLowerCase();
      (byTypeH[t] ||= []).push({ id: r.id, price: r.price ?? null });
    }

    const updates = [];

    for (const rows of Object.values(byTypeA)) {
      rows.forEach((row, idx) => {
        const form = pickFormByIndex(idx, dist);
        const patch = applySaleFormOnRow(form, row.price);
        updates.push({ table: 'properties_apartments', id: row.id, patch });
      });
    }
    for (const rows of Object.values(byTypeH)) {
      rows.forEach((row, idx) => {
        const form = pickFormByIndex(idx, dist);
        const patch = applySaleFormOnRow(form, row.price);
        updates.push({ table: 'properties_houses', id: row.id, patch });
      });
    }

    if (!REBALANCE_DRY_RUN) {
      for (let i = 0; i < updates.length; i++) {
        const u = updates[i];
        if (u.table === 'properties_apartments') {
          await prisma.properties_apartments.update({ where: { id: u.id }, data: u.patch });
        } else {
          await prisma.properties_houses.update({ where: { id: u.id }, data: u.patch });
        }
        if (VERBOSE && i % 100 === 0) console.log('..rebalance', i, '/', updates.length);
      }
    }

    const [aStats, hStats] = await Promise.all([
      prisma.properties_apartments.groupBy({
        by: ['sale_type', 'is_auction', 'is_shared_ownership', 'is_debt', 'has_debt'],
        where: { reviewed_by: 'auto-import:housetenerife' },
        _count: { _all: true },
      }),
      prisma.properties_houses.groupBy({
        by: ['sale_type', 'is_auction', 'is_shared_ownership', 'is_debt', 'has_debt'],
        where: { reviewed_by: 'auto-import:housetenerife' },
        _count: { _all: true },
      }),
    ]);

    console.log('✅ Rebalance finished');
    console.log(JSON.stringify({ apartments: aStats, houses: hStats }, null, 2));
    await closePrisma();
    return;
  }

  let page = 1;
  const seen = new Set();

  // In refresh mode we don't need to hit quotas; we'll just update already-imported rows (bounded by pages safety)
  while (true) {
    const done = Object.entries(TARGET_COUNTS).every(([k, v]) => counts[k] >= v);
    if (done && !REFRESH) break;

    const archiveUrl = page === 1 ? START_URL : `${START_URL}page/${page}/`;
    const archiveHtml = await fetchHtml(archiveUrl);
    const links = extractListingLinksFromArchive(archiveHtml).filter((l) => !seen.has(l));
    links.forEach((l) => seen.add(l));

    if (links.length === 0) break;

    for (const link of links) {
      const doneInner = Object.entries(TARGET_COUNTS).every(([k, v]) => counts[k] >= v);
      if (doneInner) break;

      let html;
      try {
        html = await fetchHtml(link);
      } catch {
        continue;
      }

      const parsed = parseDetail(html, link);
      const t = parsed.inferredType;
      if (!t) continue;
      if (!REFRESH && counts[t] >= TARGET_COUNTS[t]) continue;

      const seller = await ensureSellerUser({ agentName: parsed.agentName, agentImg: parsed.agentImg });
      // For this run: choose sale form based on how many already imported for this type
      const form = saleFormForIndex(counts[t]);

      const res = await insertProperty(parsed, seller.id, form);
      if (res?.id) {
        if (!REFRESH) counts[t] += 1;
        inserted.push({ type: t, sale_form: form, ...res, seller_id: seller.id, source: link });
        if (VERBOSE) console.log('✔', REFRESH ? 'refreshed' : 'inserted', t, res.table, res.id);
      }

      await sleep(150);
    }

    page += 1;
    if (page > PAGE_LIMIT) break; // safety stop
  }

  console.log('✅ Import finished');
  console.log('Mode:', REFRESH ? 'refresh' : `import(per-type=${PER_TYPE})`);
  console.log('Counts:', counts);
  console.log('Touched:', inserted.length);
  // quick check: last few rows by seller
  const lastUsers = await prisma.users.findMany({ orderBy: { created_at: 'desc' }, take: 5 });
  console.log('Recent users:', lastUsers.map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, phone: u.phone_number })));

  await closePrisma();
}

main().catch(async (e) => {
  console.error('❌ import-housetenerife failed:', e?.message || e);
  try {
    await closePrisma();
  } catch {}
  process.exit(1);
});

