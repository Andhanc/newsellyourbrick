import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import {
  SPAIN_CITIES,
  CITY_KEYWORDS,
  getCityConfig,
  getDistrictRecord
} from '../data/propertyCalculatorLocations.js';

puppeteer.use(StealthPlugin());

const CALCULATOR_CACHE_TTL_MS = 20 * 60 * 1000;
const CALCULATOR_CACHE_MAX_ITEMS = 200;
const propertyPriceCache = new Map();
const SCRAPE_NAV_TIMEOUT_MS = 12000;
const SCRAPE_SETTLE_MS = 1200;
const SCRAPE_SITE_TIMEOUT_MS = 15000;

const CITY_BENCHMARK_EUR_PER_M2 = {
  madrid: 4300,
  barcelona: 4900,
  valencia: 2700,
  sevilla: 2200,
  malaga: 3000,
  alicante: 2400,
  bilbao: 3400
};

/**
 * Функция парсинга Spain Real Estate (резерв: общий каталог без точного города)
 */
async function parseSpainRealEstate(page, url) {
  console.log(`🌐 Парсим Spain Real Estate: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_NAV_TIMEOUT_MS });
  await new Promise(resolve => setTimeout(resolve, SCRAPE_SETTLE_MS));

  const properties = await page.evaluate(() => {
    const results = [];
    const items = document.querySelectorAll('li[data-object]');

    items.forEach((item, index) => {
      if (index >= 30) return;

      try {
        let linkEl = item.querySelector('a[href*="/property/o"]');
        if (!linkEl) linkEl = item.querySelector('.title a');
        if (!linkEl) linkEl = item.querySelector('.image a');
        if (!linkEl) return;

        const href = linkEl.getAttribute('href') || linkEl.href;
        const link = href.startsWith('http') ? href : `https://spain-real.estate${href.startsWith('/') ? '' : '/'}${href}`;

        const priceEl = item.querySelector('.price span');
        let priceText = priceEl?.textContent || '';
        if (!priceText) {
          const allText = item.textContent || '';
          const priceMatch = allText.match(/[€€]\s*(\d{1,3}(?:[\s\u00A0]\d{3})*)/);
          priceText = priceMatch ? priceMatch[0] : '';
        }
        const priceMatch = priceText.match(/(\d{1,3}(?:[\s\u00A0]\d{3})*)/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/[\s\u00A0]/g, ''), 10) : null;

        const areaEl = item.querySelector('.params .area b');
        let areaText = areaEl?.textContent || '';
        if (!areaText) {
          const areaSpan = item.querySelector('.params .area');
          areaText = areaSpan?.textContent || '';
        }
        const areaMatch = areaText.match(/(\d+)\s*м/);
        const area = areaMatch ? parseInt(areaMatch[1], 10) : null;

        const roomsEl = item.querySelector('.params .rooms b');
        let roomsText = roomsEl?.textContent || '';
        if (!roomsText) {
          const roomsSpan = item.querySelector('.params .rooms');
          roomsText = roomsSpan?.textContent || '';
        }

        const titleEl = item.querySelector('.title a');
        const titleText = titleEl?.textContent || '';

        const isStudio = titleText.toLowerCase().includes('студия') ||
          titleText.toLowerCase().includes('studio') ||
          roomsText.toLowerCase().includes('студия') ||
          roomsText.toLowerCase().includes('studio') ||
          (roomsText && parseInt(roomsText, 10) === 0);

        let rooms = null;
        if (isStudio) {
          rooms = 0;
        } else {
          const roomsMatch = roomsText.match(/(\d+)/);
          rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null;
        }

        let address = '';
        const cityMatch = titleText.match(/в\s+([^,]+)/);
        if (cityMatch) {
          address = cityMatch[1].trim();
        } else {
          address = titleText.trim();
        }

        const imgEl = item.querySelector('img.thumb');
        const image = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : null;

        if (link && price) {
          results.push({ price, area, rooms, isStudio, address, link, image });
        }
      } catch (e) {
        console.error('Ошибка парсинга карточки:', e);
      }
    });

    return results;
  });

  return properties;
}

async function parseFotocasa(page, url) {
  console.log(`🌐 Парсим Fotocasa: ${url}`);
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_NAV_TIMEOUT_MS }).catch((e) => {
    console.error('DEBUG: Fotocasa goto error:', e.message);
    throw e;
  });
  console.log('DEBUG: Fotocasa status=', resp?.status());
  console.log('DEBUG: Fotocasa title=', await page.title());
  await new Promise(resolve => setTimeout(resolve, SCRAPE_SETTLE_MS));

  const properties = await page.evaluate(() => {
    const results = [];
    const cards = document.querySelectorAll('[data-testid="property-card"], .re-CardPack, article[class*="Card"]');
    const linkAnchors = document.querySelectorAll('a[href*="/vivienda/"], a[href*="/inmueble/"]');
    console.log('DEBUG: Fotocasa candidate cards=', cards.length, 'links=', linkAnchors.length);

    cards.forEach((card, index) => {
      if (index >= 20) return;

      try {
        const linkEl = card.querySelector('a[href*="/vivienda/"], a[href*="/inmueble/"]');
        if (!linkEl) return;
        const link = linkEl.href.startsWith('http') ? linkEl.href : `https://www.fotocasa.es${linkEl.getAttribute('href')}`;

        const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
        const priceText = priceEl?.textContent || '';
        const price = parseInt(priceText.replace(/[^\d]/g, ''), 10) || null;

        const areaEl = card.querySelector('[class*="surface"], [class*="area"], [class*="metros"]');
        const areaText = areaEl?.textContent || '';
        const area = parseInt(areaText.match(/(\d+)\s*m/)?.[1] || '', 10) || null;

        const roomsEl = card.querySelector('[class*="room"], [class*="habitacion"]');
        const roomsText = roomsEl?.textContent || '';
        const rooms = parseInt(roomsText.match(/(\d+)/)?.[1] || '', 10) || null;

        const addressEl = card.querySelector('[class*="address"], [class*="location"], [class*="location"]');
        const address = addressEl?.textContent?.trim() || '';

        const imgEl = card.querySelector('img[src], img[data-src]');
        const image = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;

        if (link) {
          results.push({ price, area, rooms, address, link, image });
        }
      } catch (e) {
        console.error('Ошибка парсинга карточки:', e);
      }
    });

    return results;
  });

  return properties;
}

async function parsePisos(page, url) {
  console.log(`🌐 Парсим Pisos.com: ${url}`);
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_NAV_TIMEOUT_MS }).catch((e) => {
    console.error('DEBUG: Pisos goto error:', e.message);
    throw e;
  });
  console.log('DEBUG: Pisos status=', resp?.status());
  console.log('DEBUG: Pisos title=', await page.title());
  await new Promise(resolve => setTimeout(resolve, SCRAPE_SETTLE_MS));

  // Пытаемся закрыть cookie-consent (может перекрывать контент и список объявлений).
  try {
    await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button, a'))
      const btn = candidates.find((el) => {
        const t = (el.textContent || '').trim().toLowerCase()
        return /(aceptar|acepto|aceptar todo|aceptar todo|allow all|accept all|confirmar|verstanden)/i.test(t)
      })
      if (btn) btn.click()
    })
    await new Promise((r) => setTimeout(r, 2000))
  } catch (e) {
    // ignore
  }

  // Pisos.com часто рендерит карточки иначе, поэтому лучше начинать со ссылок.
  const { results: properties, diag } = await page.evaluate(() => {
    const results = [];
    const anchorsAll = Array.from(document.querySelectorAll('a[href]'));
    const anchors = anchorsAll.filter((a) => {
      const href = (a.getAttribute('href') || '').toString();
      if (!href) return false;
      const u = new URL(href, location.href);
      const path = (u.pathname || '').toLowerCase();
      // Фильтруем по пути, чтобы не ловить "pisos" домена.
      if (path.includes('/cookie') || path.includes('/hipotecas') || path.includes('/aldia')) return false;
      if (path.includes('/venta/piso-') && !path.includes('/comprar/')) return false;
      return (
        path.includes('/comprar/') ||
        path.includes('/inmueble/') ||
        path.includes('/vivienda/') ||
        path.includes('/propiedad/') ||
        path.includes('/piso/') ||
        path.includes('/piso-') ||
        path.includes('/local/') ||
        path.includes('/oficina/') ||
        path.includes('/nave/') ||
        path.includes('/terreno/')
      );
    });

    const uniq = [];
    const seen = new Set();
    for (const a of anchors) {
      const href = a.getAttribute('href') || a.href || '';
      const link = href.startsWith('http') ? href : `https://www.pisos.com${href.startsWith('/') ? '' : '/'}${href}`;
      if (!link || seen.has(link)) continue;
      seen.add(link);
      uniq.push({ a, link });
      if (uniq.length >= 18) break;
    }

    const diag = {
      anchorsCount: anchors.length,
      uniqCount: uniq.length,
      sample: null,
      sampleHrefs: uniq.slice(0, 5).map((x) => x.link)
    };

    for (let i = 0; i < uniq.length; i++) {
      const item = uniq[i];
      const a = item.a;
      const link = item.link;
      const card = a ? (a.closest('article') || a.closest('div') || a.parentElement) : null;
      const text = (card?.innerText || a?.innerText || '').replace(/\s+/g, ' ').trim();

      // Цена: встречается как "123.456 €" или "€ 123.456" или "123.456"
      const priceMatch =
        text.match(/€\s?(\d{1,3}(?:[.\s]\d{3})+|\d+)/) ||
        text.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*€/i) ||
        text.match(/Precio[^0-9]{0,10}(\d{1,3}(?:[.\s]\d{3})+|\d+)/i);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10) : null;

      // Площадь
      const areaMatch = text.match(/(\d{2,4})\s*(?:m²|m2|m)\b/i);
      const area = areaMatch ? parseInt(areaMatch[1], 10) : null;

      // Комнаты
      const roomsMatch =
        text.match(/(\d+)\s*(?:hab|habitaciones|dormitorios|rooms|bedrooms)\b/i) ||
        text.match(/(?:hab\.?\s*)(\d+)/i);
      const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null;

      // Изображение (не критично)
      const imgEl = card ? card.querySelector('img[src], img[data-src]') : null;
      const image = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : null;

      // Адрес часто не достаётся надёжно — оставим пустым, если не нашли
      const addressMatch = text.match(/(?:Dirección|Calle|calle|Distrito|barrio)\s*[:\-]?\s*([^|•,]+?)(?:,|•|\|)/i);
      const address = addressMatch ? addressMatch[1].trim() : '';

      if (!diag.sample && text) {
        diag.sample = {
          i,
          link,
          textPreview: text.slice(0, 220),
          priceFound: priceMatch ? priceMatch[1] : null,
          parsedPrice: price,
          areaFound: areaMatch ? areaMatch[1] : null,
          roomsFound: roomsMatch ? roomsMatch[1] : null
        };
      }

      if (link) {
        results.push({ price, area, rooms, address, link, image, source: 'Pisos.com' });
      }
    }

    return { results, diag };
  });

  console.log('DEBUG: Pisos evaluate diag:', JSON.stringify(diag).slice(0, 1000));

  return properties;
}

async function parseIdealista(page, url) {
  console.log(`🌐 Парсим Idealista: ${url}`);
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_NAV_TIMEOUT_MS }).catch((e) => {
    console.error('DEBUG: Idealista goto error:', e.message);
    throw e;
  });
  console.log('DEBUG: Idealista status=', resp?.status());
  console.log('DEBUG: Idealista title=', await page.title());
  await new Promise(resolve => setTimeout(resolve, SCRAPE_SETTLE_MS));

  const properties = await page.evaluate(() => {
    const results = [];
    let cards = document.querySelectorAll('article.item, article[data-adid], [data-adid]');
    const linkAnchors = document.querySelectorAll('a[href*="/inmueble/"]');
    console.log('DEBUG: Idealista candidate cards=', cards.length, 'links=', linkAnchors.length);
    if (cards.length === 0) {
      const links = document.querySelectorAll('a[href*="/inmueble/"]');
      cards = Array.from(links).map(link => link.closest('article') || link.parentElement).filter(el => el);
    }

    cards.forEach((card, index) => {
      if (index >= 20) return;

      try {
        const linkEl = card.querySelector('a[href*="/inmueble/"]') || (card.tagName === 'A' && card.href.includes('/inmueble/') ? card : null);
        if (!linkEl) return;
        const link = linkEl.href || `https://www.idealista.com${linkEl.getAttribute('href')}`;

        const allText = card.textContent || '';
        const priceMatch = allText.match(/(\d{1,3}(?:[.\s]\d{3})*)\s*€/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10) : null;

        const areaMatch = allText.match(/(\d+)\s*m²/);
        const area = areaMatch ? parseInt(areaMatch[1], 10) : null;

        const roomsMatch = allText.match(/(\d+)\s*(?:hab|room|bedroom)/i);
        const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null;

        const addressEl = card.querySelector('[class*="address"], [class*="location"]');
        const address = addressEl?.textContent?.trim() || '';

        const imgEl = card.querySelector('img[src], img[data-src]');
        const image = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;

        if (link) {
          results.push({ price, area, rooms, address, link, image });
        }
      } catch (e) {
        console.error('Ошибка парсинга карточки:', e);
      }
    });

    return results;
  });

  return properties;
}

async function parseGenericInternational(page, url, siteName) {
  console.log(`🌍 Парсим ${siteName}: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_NAV_TIMEOUT_MS });
  await new Promise((resolve) => setTimeout(resolve, SCRAPE_SETTLE_MS));

  const properties = await page.evaluate(() => {
    const toAbs = (href) => {
      if (!href) return '';
      try {
        return new URL(href, location.href).href;
      } catch {
        return href;
      }
    };

    const parsePrice = (text) => {
      if (!text) return null;
      const match =
        text.match(/([€$£]\s?\d{1,3}(?:[.,\s]\d{3})+|\d{1,3}(?:[.,\s]\d{3})+\s?[€$£])/) ||
        text.match(/(\d{1,3}(?:[.,\s]\d{3}){1,})/);
      if (!match) return null;
      const n = parseInt(match[1].replace(/[^\d]/g, ''), 10);
      return Number.isFinite(n) ? n : null;
    };

    const parseArea = (text) => {
      if (!text) return null;
      const match = text.match(/(\d{2,4})\s*(?:m²|m2|sqm|sq m|кв\.?\s?м)/i);
      if (!match) return null;
      const n = parseInt(match[1], 10);
      return Number.isFinite(n) ? n : null;
    };

    const parseRooms = (text) => {
      if (!text) return null;
      const match = text.match(/(\d+)\s*(?:hab|room|rooms|bed|beds|bedroom|bedrooms|комн)/i);
      if (!match) return null;
      const n = parseInt(match[1], 10);
      return Number.isFinite(n) ? n : null;
    };

    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const results = [];

    for (const s of scripts) {
      try {
        const raw = (s.textContent || '').trim();
        if (!raw) continue;
        const json = JSON.parse(raw);
        const arr = Array.isArray(json) ? json : [json];
        for (const item of arr) {
          const elements = item?.itemListElement || item?.mainEntity?.itemListElement;
          if (!Array.isArray(elements)) continue;
          for (const el of elements) {
            const node = el?.item || el;
            const link = toAbs(node?.url || node?.offers?.url || '');
            const title = node?.name || '';
            const address = node?.address?.addressLocality || node?.address?.streetAddress || '';
            const price = Number(node?.offers?.price) || parsePrice(String(node?.offers?.price || ''));
            const area = Number(node?.floorSize?.value) || parseArea(String(node?.description || ''));
            const rooms = Number(node?.numberOfRooms) || parseRooms(String(node?.description || ''));
            if (link && price) {
              results.push({ price, area: area || null, rooms: rooms || null, address, link, title, image: null });
            }
          }
        }
      } catch {
        // ignore malformed script blocks
      }
    }

    if (results.length >= 5) return results.slice(0, 30);

    const cards = document.querySelectorAll('article, li, [class*="listing"], [class*="property"], [class*="card"]');
    cards.forEach((card, index) => {
      if (index >= 200) return;
      const txt = (card.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length < 20) return;
      const price = parsePrice(txt);
      if (!price) return;

      const linkEl = card.querySelector('a[href]');
      if (!linkEl) return;
      const link = toAbs(linkEl.getAttribute('href') || linkEl.href || '');
      if (!link) return;

      const area = parseArea(txt);
      const rooms = parseRooms(txt);
      const imageEl = card.querySelector('img[src], img[data-src]');
      const image =
        imageEl?.getAttribute('src') ||
        imageEl?.getAttribute('data-src') ||
        imageEl?.src ||
        null;
      const title = (linkEl.textContent || '').trim();

      results.push({ price, area, rooms, address: '', link, title, image });
    });

    return results.slice(0, 30);
  });

  return properties;
}

/** Совместимость со старыми ключами cityMap */
const cityMapLegacy = {
  madrid: ['мадрид', 'madrid'],
  barcelona: ['барселона', 'barcelona', 'бадалона', 'badalona'],
  valencia: ['валенсия', 'valencia'],
  sevilla: ['севилья', 'sevilla', 'sevilla'],
  malaga: ['малага', 'malaga', 'málaga'],
  marbella: ['марбелья', 'marbella'],
  bilbao: ['бильбао', 'bilbao'],
  alicante: ['аликанте', 'alicante'],
  granada: ['гранада', 'granada'],
  murcia: ['мурсия', 'murcia'],
  castellon: ['кастельон', 'castellón', 'castellon'],
  torrevieja: ['торревьеха', 'torrevieja'],
  benidorm: ['бенидорм', 'benidorm'],
  denia: ['дения', 'denia', 'dénia'],
  javea: ['хавеа', 'javea', 'xàbia'],
  calpe: ['калпе', 'calpe', 'calp'],
  altea: ['альтеа', 'altea'],
  'santa-pola': ['санта-пола', 'santa pola', 'santapola'],
  villajoyosa: ['виллахойоса', 'villajoyosa', 'la villajoyosa'],
  gandia: ['гандия', 'gandia', 'gandía'],
  oliva: ['олива', 'oliva'],
  piles: ['пилес', 'piles']
};

function getCityVariants(cityName) {
  const key = cityName.toLowerCase();
  const fromFile = CITY_KEYWORDS[key];
  if (fromFile && fromFile.length) return fromFile;
  return cityMapLegacy[key] || [key];
}

function normalizeLocationToken(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getPrimaryCityToken(rawCity = '') {
  return String(rawCity)
    .split(',')[0]
    .trim();
}

function normalizeComparable(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSlug(value = '') {
  return normalizeComparable(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildCalculatorCacheKey({
  area,
  rooms,
  city,
  country,
  street,
  propertyType,
  district,
  minPrice,
  maxPrice
}) {
  return [
    normalizeComparable(country || ''),
    normalizeComparable(city || ''),
    normalizeComparable(street || ''),
    normalizeComparable(propertyType || ''),
    normalizeComparable(district || ''),
    String(parseInt(area, 10) || 0),
    String(rooms === 'studio' ? 'studio' : parseInt(rooms, 10) || 0),
    String(parseInt(minPrice, 10) || 0),
    String(parseInt(maxPrice, 10) || 0)
  ].join('|');
}

function getFromCalculatorCache(key) {
  const entry = propertyPriceCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    propertyPriceCache.delete(key);
    return null;
  }
  return JSON.parse(JSON.stringify(entry.value));
}

function setToCalculatorCache(key, value) {
  propertyPriceCache.set(key, {
    value: JSON.parse(JSON.stringify(value)),
    expiresAt: Date.now() + CALCULATOR_CACHE_TTL_MS
  });

  if (propertyPriceCache.size > CALCULATOR_CACHE_MAX_ITEMS) {
    const oldestKey = propertyPriceCache.keys().next().value;
    if (oldestKey) propertyPriceCache.delete(oldestKey);
  }
}

function resolveCountryProfile(rawCountry = '') {
  const c = normalizeComparable(rawCountry);
  if (!c) return { code: 'ES', properstarSlug: 'spain', greenAcresHost: 'www.green-acres.es' };
  if (/(spain|espa[ñn]a|испан)/.test(c)) return { code: 'ES', properstarSlug: 'spain', greenAcresHost: 'www.green-acres.es' };
  if (/(portugal|portugues|португал)/.test(c)) return { code: 'PT', properstarSlug: 'portugal', greenAcresHost: 'www.green-acres.pt' };
  if (/(france|franc|франц)/.test(c)) return { code: 'FR', properstarSlug: 'france', greenAcresHost: 'www.green-acres.fr' };
  if (/(italy|italia|итал)/.test(c)) return { code: 'IT', properstarSlug: 'italy', greenAcresHost: 'www.green-acres.it' };
  if (/(germany|deutschland|герман|немец)/.test(c)) return { code: 'DE', properstarSlug: 'germany', greenAcresHost: 'www.green-acres.de' };
  if (/(united states|usa|u\.s\.a|america|америк|сша)/.test(c)) return { code: 'US', properstarSlug: 'united-states', greenAcresHost: 'us.green-acres.com' };
  if (/(united kingdom|uk|britain|england|великобрит|англи)/.test(c)) return { code: 'GB', properstarSlug: 'united-kingdom', greenAcresHost: 'www.green-acres.co.uk' };
  return { code: 'INTL', properstarSlug: null, greenAcresHost: null };
}

function buildInternationalSites({ cityToken, profile }) {
  const citySlug = normalizeSlug(cityToken);
  const encodedCity = encodeURIComponent(cityToken);
  const sites = [];

  if (profile?.properstarSlug && citySlug) {
    sites.push({
      name: 'Properstar',
      buildUrl: () => `https://www.properstar.com/${profile.properstarSlug}/buy/${citySlug}`,
      parseFunction: (page, url) => parseGenericInternational(page, url, 'Properstar')
    });
  }

  if (profile?.greenAcresHost && citySlug) {
    sites.push({
      name: 'Green-Acres',
      buildUrl: () => `https://${profile.greenAcresHost}/en/property-for-sale/${citySlug}`,
      parseFunction: (page, url) => parseGenericInternational(page, url, 'Green-Acres')
    });
  }

  sites.push({
    name: 'JamesEdition',
    buildUrl: () => `https://www.jamesedition.com/real_estate?q=${encodedCity}`,
    parseFunction: (page, url) => parseGenericInternational(page, url, 'JamesEdition')
  });

  return sites;
}

function buildSpainSites({ cityCfg, areaValue, roomsValue, propertyType, minPrice, maxPrice, zoneSlug }) {
  const urlParams = {
    cityCfg,
    zoneSlug,
    areaValue,
    roomsValue,
    propertyType,
    minPrice,
    maxPrice
  };
  return [
    // В проде Idealista часто 403, а Fotocasa с параметризованными ссылками нестабилен.
    // Оставляем более надежные источники для быстрого ответа.
    { name: 'Pisos.com', buildUrl: () => buildPisosUrl(urlParams), parseFunction: parsePisos },
    {
      name: 'Properstar ES',
      buildUrl: () => `https://www.properstar.com/spain/buy/${cityCfg.value}`,
      parseFunction: (page, url) => parseGenericInternational(page, url, 'Properstar ES')
    },
    {
      name: 'Green-Acres ES',
      buildUrl: () => `https://www.green-acres.es/en/property-for-sale/${cityCfg.value}`,
      parseFunction: (page, url) => parseGenericInternational(page, url, 'Green-Acres ES')
    }
  ];
}

function getSpainFallbackCityConfigs(cityCfg) {
  if (!cityCfg?.region) return [];
  const sameRegion = SPAIN_CITIES.filter((c) => c.region === cityCfg.region && c.value !== cityCfg.value);
  return sameRegion.slice(0, 2);
}

function summarizeSourceCounts(items = []) {
  const counter = {};
  for (const item of items) {
    const src = item?.source || 'unknown';
    counter[src] = (counter[src] || 0) + 1;
  }
  return counter;
}

function extractDetailFromJsonLd(pageData = {}) {
  try {
    const scripts = Array.isArray(pageData.jsonLd) ? pageData.jsonLd : [];
    for (const raw of scripts) {
      if (!raw || typeof raw !== 'string') continue;
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        const offers = item?.offers || item?.mainEntity?.offers || {};
        const addr = item?.address || item?.mainEntity?.address || {};
        const floorSize = item?.floorSize || item?.mainEntity?.floorSize || {};
        const imageRaw =
          item?.image ||
          item?.mainEntity?.image ||
          item?.primaryImageOfPage?.contentUrl ||
          item?.thumbnailUrl ||
          null;
        const image = Array.isArray(imageRaw) ? imageRaw[0] : imageRaw;
        const priceRaw = Number(offers?.price) || Number(item?.price);
        const areaRaw = Number(floorSize?.value) || Number(item?.floorSize?.value);
        const roomsRaw = Number(item?.numberOfRooms) || Number(item?.mainEntity?.numberOfRooms);
        const address = addr?.streetAddress || addr?.addressLocality || '';
        if (priceRaw || areaRaw || roomsRaw || address || image) {
          return {
            price: Number.isFinite(priceRaw) && priceRaw > 0 ? Math.round(priceRaw) : null,
            area: Number.isFinite(areaRaw) && areaRaw > 0 ? Math.round(areaRaw) : null,
            rooms: Number.isFinite(roomsRaw) && roomsRaw >= 0 ? Math.round(roomsRaw) : null,
            address,
            image: image || null
          };
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function enrichPropertiesFromDetails(browser, items = []) {
  const candidates = items.filter((p) => p?.link && (!p.price || !p.area || (p.rooms == null)));
  if (!candidates.length) return items;

  const maxToEnrich = Math.min(candidates.length, 10);
  const targetLinks = new Set(candidates.slice(0, maxToEnrich).map((p) => p.link));
  if (!targetLinks.size) return items;

  const updates = new Map();
  for (const link of targetLinks) {
    let page = null;
    try {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 9000 });
      await new Promise((resolve) => setTimeout(resolve, 900));

      const detail = await page.evaluate(() => {
        const toAbs = (url) => {
          if (!url) return null;
          try {
            return new URL(url, location.href).href;
          } catch {
            return url;
          }
        };

        const allText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
        const priceMatch =
          allText.match(/(\d{1,3}(?:[.\s]\d{3})+)\s*€/i) ||
          allText.match(/€\s*(\d{1,3}(?:[.\s]\d{3})+)/i) ||
          allText.match(/price[^0-9]{0,10}(\d{1,3}(?:[.,\s]\d{3})+)/i);
        const areaMatch = allText.match(/(\d{2,4})\s*(?:m²|m2|sqm)/i);
        const roomsMatch = allText.match(/(\d+)\s*(?:hab|habitaciones|dormitorios|rooms|bedrooms)/i);

        const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
          .map((el) => (el.textContent || '').trim())
          .filter(Boolean);

        const addressEl =
          document.querySelector('[class*="address"], [class*="location"], [data-testid*="address"]');
        const ogImage =
          document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
          document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
          document.querySelector('meta[itemprop="image"]')?.getAttribute('content') ||
          '';
        const imgEl =
          document.querySelector('[class*="gallery"] img[src], [class*="photo"] img[src], article img[src], main img[src]') ||
          document.querySelector('img[src]');

        return {
          textPrice: priceMatch ? parseInt(priceMatch[1].replace(/[^\d]/g, ''), 10) : null,
          textArea: areaMatch ? parseInt(areaMatch[1], 10) : null,
          textRooms: roomsMatch ? parseInt(roomsMatch[1], 10) : null,
          textAddress: addressEl?.textContent?.trim() || '',
          textImage: toAbs(ogImage || imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || ''),
          jsonLd
        };
      });

      const fromLd = extractDetailFromJsonLd(detail);
      updates.set(link, {
        price: fromLd?.price || detail.textPrice || null,
        area: fromLd?.area || detail.textArea || null,
        rooms: fromLd?.rooms || detail.textRooms || null,
        address: fromLd?.address || detail.textAddress || '',
        image: fromLd?.image || detail.textImage || null
      });
    } catch (err) {
      console.log(`DEBUG: detail enrich skip for ${link}: ${err.message}`);
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  if (!updates.size) return items;
  return items.map((item) => {
    const u = updates.get(item.link);
    if (!u) return item;
    return {
      ...item,
      price: item.price || u.price || null,
      area: item.area || u.area || null,
      rooms: item.rooms ?? u.rooms ?? null,
      address: item.address || u.address || '',
      image: item.image || u.image || null
    };
  });
}

function getBenchmarkPerSqm({ cityCfg, cityToken, countryProfile, propertyType }) {
  const cityKey = (cityCfg?.value || normalizeSlug(cityToken)).toLowerCase();
  let base = CITY_BENCHMARK_EUR_PER_M2[cityKey];
  if (!base) {
    if (countryProfile.code === 'ES') base = 2500;
    else if (countryProfile.code === 'US') base = 4300;
    else if (countryProfile.code === 'GB') base = 5200;
    else if (countryProfile.code === 'DE') base = 4200;
    else if (countryProfile.code === 'FR') base = 4500;
    else base = 3200;
  }

  const typeMultiplier = {
    land: 0.65,
    commercial: 1.2,
    house: 1.12,
    villa: 1.4,
    apartamento: 1.06,
    apartment: 1
  };
  const mult = typeMultiplier[propertyType] || 1;
  return Math.round(base * mult);
}

function cityMatchesLoose(property = {}, cityToken = '') {
  const token = normalizeComparable(cityToken);
  if (!token) return true;

  const normalizedAddress = normalizeComparable(property.address || '');
  const normalizedLink = normalizeComparable(property.link || '');
  const normalizedTitle = normalizeComparable(property.title || '');

  if (normalizedAddress.includes(token) || normalizedLink.includes(token) || normalizedTitle.includes(token)) {
    return true;
  }

  const parts = token.split(' ').filter((x) => x.length > 2);
  if (parts.length === 0) return false;
  return parts.some(
    (part) =>
      normalizedAddress.includes(part) ||
      normalizedLink.includes(part) ||
      normalizedTitle.includes(part)
  );
}

function resolveCityConfigLoose(rawCity) {
  const cityToken = getPrimaryCityToken(rawCity);
  if (!cityToken) return null;

  const direct = getCityConfig(cityToken.toLowerCase());
  if (direct) return direct;

  const normalizedToken = normalizeComparable(cityToken);

  // 1) Пробуем найти город по словарю ключевых слов (включая русские названия)
  for (const [cityKey, keywords] of Object.entries(CITY_KEYWORDS)) {
    const hasMatch = (keywords || []).some((keyword) => {
      const normalizedKeyword = normalizeComparable(keyword);
      if (!normalizedKeyword || !normalizedToken) return false;
      return (
        normalizedKeyword === normalizedToken ||
        normalizedKeyword.includes(normalizedToken) ||
        normalizedToken.includes(normalizedKeyword)
      );
    });
    if (hasMatch) {
      const fromKeywords = getCityConfig(cityKey);
      if (fromKeywords) return fromKeywords;
    }
  }

  // 2) Пробуем найти город по label/value из каталога (точное/частичное совпадение)
  const byReadableLabel = SPAIN_CITIES.find((city) => {
    const valueNormalized = normalizeComparable(city.value);
    const labelNormalized = normalizeComparable(city.label);
    return (
      valueNormalized === normalizedToken ||
      labelNormalized === normalizedToken ||
      valueNormalized.includes(normalizedToken) ||
      labelNormalized.includes(normalizedToken)
    );
  });
  if (byReadableLabel) return byReadableLabel;

  const normalizedInput = normalizeLocationToken(cityToken);
  if (!normalizedInput) return null;

  return (
    SPAIN_CITIES.find((city) => {
      const valueMatch = normalizeLocationToken(city.value) === normalizedInput;
      const labelMatch = normalizeLocationToken(city.label) === normalizedInput;
      const includesInValue = normalizeLocationToken(city.value).includes(normalizedInput);
      const includesInLabel = normalizeLocationToken(city.label).includes(normalizedInput);
      return valueMatch || labelMatch || includesInValue || includesInLabel;
    }) || null
  );
}

function addressMatchesCity(address, cityName) {
  if (!address) return false;
  const variants = getCityVariants(cityName);
  const addressLower = address.toLowerCase();
  return variants.some((variant) => addressLower.includes(variant.toLowerCase()));
}

function linkMatchesCity(link, cityName, cityCfg) {
  if (!link) return false;
  const lower = link.toLowerCase();
  const slugs = [
    cityCfg?.pisos,
    cityCfg?.fotocasa,
    cityCfg?.idealista,
    cityName
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  return slugs.some((s) => lower.includes(s));
}

function addressMatchesDistrict(address, districtRecord) {
  if (!districtRecord?.keywords?.length) return true;
  const lower = (address || '').toLowerCase();
  return districtRecord.keywords.some((k) => lower.includes(k.toLowerCase()));
}

function fotocasaListingPath(propertyType) {
  switch (propertyType) {
    case 'land':
      return 'terrenos';
    case 'commercial':
      return 'locales';
    case 'house':
    case 'villa':
      return 'casas';
    case 'apartment':
    case 'apartamento':
    default:
      return 'viviendas';
  }
}

function idealistaListingPath(propertyType) {
  switch (propertyType) {
    case 'land':
      return 'venta-terrenos';
    case 'commercial':
      return 'venta-locales';
    case 'house':
      return 'venta-casas';
    case 'villa':
      return 'venta-chalets';
    case 'apartment':
    case 'apartamento':
    default:
      return 'venta-viviendas';
  }
}

function pisosListingSegment(propertyType) {
  switch (propertyType) {
    case 'land':
      return 'parcelas';
    case 'commercial':
      return 'locales';
    case 'house':
    case 'villa':
      return 'casas';
    case 'apartment':
    case 'apartamento':
    default:
      return 'pisos';
  }
}

/** Устойчивая оценка: медиана с отсечением крайних 10 % при n ≥ 8 */
function robustMedian(prices) {
  const arr = prices.filter((p) => p > 0).map(Number).sort((a, b) => a - b);
  const n = arr.length;
  if (n === 0) return null;
  if (n < 8) {
    const mid = Math.floor(n / 2);
    return n % 2 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
  }
  const cut = Math.max(1, Math.floor(n * 0.1));
  const slice = arr.slice(cut, n - cut);
  const m = slice.length;
  const mid = Math.floor(m / 2);
  return m % 2 ? slice[mid] : Math.round((slice[mid - 1] + slice[mid]) / 2);
}

function buildFotocasaUrl({
  cityCfg,
  zoneSlug,
  propertyType
}) {
  const base = fotocasaListingPath(propertyType);
  const city = cityCfg.fotocasa;
  const zone = zoneSlug || 'todas-las-zonas';
  // Тяжелые URL-фильтры на Fotocasa часто отдают 404; используем стабильный каталог города.
  return `https://www.fotocasa.es/es/comprar/${base}/${city}/${zone}/l`;
}

function buildIdealistaUrl({
  cityCfg,
  areaValue,
  roomsValue,
  propertyType
}) {
  const path = idealistaListingPath(propertyType);
  const city = cityCfg.idealista;

  if (propertyType === 'land') {
    return `https://www.idealista.com/${path}/${city}/con-metros_${areaValue}/`;
  }

  const roomsForUrl = roomsValue === 'studio' ? 1 : (parseInt(roomsValue, 10) || 2);
  if (propertyType === 'house' || propertyType === 'villa') {
    return `https://www.idealista.com/${path}/${city}/con-metros_${areaValue},habitaciones_${roomsForUrl}/`;
  }
  return `https://www.idealista.com/${path}/${city}/con-metros_${areaValue},habitaciones_${roomsForUrl}/`;
}

function buildPisosUrl({
  cityCfg,
  propertyType
}) {
  const seg = pisosListingSegment(propertyType);
  const city = cityCfg.pisos;
  // Упрощенный URL лучше индексируется и чаще отдает карточки; фильтрация по параметрам делается локально.
  return `https://www.pisos.com/venta/${seg}-${city}/`;
}

function dedupeByLink(items) {
  const seen = new Set();
  return items.filter((p) => {
    if (!p.link || seen.has(p.link)) return false;
    seen.add(p.link);
    return true;
  });
}

function classifyPropertyByText(property = {}) {
  const text = `${property.title || ''} ${property.address || ''} ${property.link || ''}`.toLowerCase();
  if (/suelo|terreno|parcela/.test(text)) return 'land';
  if (/local|oficina|nave|industrial|comercial/.test(text)) return 'commercial';
  if (/villa|chalet/.test(text)) return 'villa';
  if (/casa|adosad|unifamiliar/.test(text)) return 'house';
  if (/apartamento/.test(text)) return 'apartamento';
  return 'apartment';
}

function buildRelaxedSimilarProperties({
  items,
  areaValue,
  roomsValue,
  noRoomsType,
  cityToken,
  isSpainCountry,
  cityCfg,
  pType,
  districtRecord,
  streetQuery
}) {
  const streetTokens = String(streetQuery || '')
    .toLowerCase()
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const withScores = (items || []).map((p) => {
    let score = 0;

    const cityMatch = isSpainCountry
      ? ((p.address && addressMatchesCity(p.address, cityCfg?.value || cityToken)) ||
        linkMatchesCity(p.link, cityCfg?.value || cityToken, cityCfg))
      : cityMatchesLoose(p, cityToken);
    if (cityMatch) score += 30;

    if (p.area && areaValue) {
      const delta = Math.abs(p.area - areaValue) / Math.max(areaValue, 1);
      if (delta <= 0.15) score += 30;
      else if (delta <= 0.35) score += 18;
      else if (delta <= 0.6) score += 8;
    } else {
      score += 4;
    }

    if (!noRoomsType && (p.rooms != null || p.isStudio === true)) {
      if (roomsValue === 'studio') {
        if (p.isStudio === true || p.rooms === 0 || p.rooms === 1) score += 22;
      } else if (p.rooms != null) {
        const d = Math.abs(p.rooms - roomsValue);
        if (d === 0) score += 22;
        else if (d === 1) score += 14;
        else if (d === 2) score += 6;
      }
    } else {
      score += 4;
    }

    if (pType !== 'land' && pType !== 'commercial') {
      const detected = classifyPropertyByText(p);
      const typeMatch =
        (pType === 'villa' && (detected === 'villa' || detected === 'house')) ||
        (pType === 'house' && (detected === 'house' || detected === 'villa')) ||
        (pType === 'apartamento' && (detected === 'apartamento' || detected === 'apartment')) ||
        (pType === 'apartment' && (detected === 'apartment' || detected === 'apartamento'));
      if (typeMatch) score += 16;
    }

    if (isSpainCountry && districtRecord?.keywords?.length) {
      if (addressMatchesDistrict(p.address || '', districtRecord)) score += 16;
    }

    if (streetTokens.length) {
      const haystack = `${p.address || ''} ${p.title || ''}`.toLowerCase();
      const streetMatches = streetTokens.filter((token) => haystack.includes(token)).length;
      if (streetMatches > 0) score += Math.min(12, streetMatches * 4);
    }

    return { ...p, _score: score };
  });

  return withScores
    .sort((a, b) => b._score - a._score)
    .slice(0, 30)
    .map(({ _score, ...rest }) => rest);
}

/**
 * Основная функция: несколько источников (Fotocasa, Idealista, Pisos), агрегация и устойчивая медиана
 */
export async function calculatePropertyPrice({
  area,
  rooms,
  city,
  country,
  street,
  propertyType = 'apartment',
  district = 'all',
  maxPrice,
  minPrice
}) {
  const cacheKey = buildCalculatorCacheKey({
    area,
    rooms,
    city,
    country,
    street,
    propertyType,
    district,
    minPrice,
    maxPrice
  });
  const cached = getFromCalculatorCache(cacheKey);
  if (cached) {
    cached.searchParams = {
      ...(cached.searchParams || {}),
      cache: 'hit'
    };
    return cached;
  }

  const rawCity = String(city || '').trim();
  const cityToken = getPrimaryCityToken(rawCity);
  const rawCountry = String(country || '').trim();
  const countryProfile = resolveCountryProfile(rawCountry);
  const isSpainCountry = countryProfile.code === 'ES';

  const areaValue = parseInt(area, 10) || 60;
  const roomsValue = rooms === 'studio' ? 'studio' : (parseInt(rooms, 10) || 2);
  const pType = propertyType || 'apartment';
  const noRoomsType = pType === 'land' || pType === 'commercial';

  const cityCfg = isSpainCountry ? resolveCityConfigLoose(rawCity) : null;
  const cityName = cityCfg?.value || cityToken.toLowerCase();
  if (!cityToken) {
    return {
      recommendedPrice: null,
      recommendedPricePerSqm: null,
      similarProperties: [],
      searchParams: {
        area: areaValue,
        rooms: noRoomsType ? null : roomsValue,
        city: cityName,
        country: countryProfile.code,
        district: district || 'all',
        propertyType: pType,
        searchLevel: 'no_city',
        sources: [],
        method: 'none',
        cache: 'miss'
      },
      note: 'Укажите город, чтобы подобрать сопоставимые объекты.'
    };
  }

  if (isSpainCountry && !cityCfg) {
    const note = 'Город не найден в испанском каталоге. Укажите крупный город Испании из списка калькулятора.';

    return {
      recommendedPrice: null,
      recommendedPricePerSqm: null,
      similarProperties: [],
      searchParams: {
        area: areaValue,
        rooms: noRoomsType ? null : roomsValue,
        city: cityName,
        country: countryProfile.code,
        district: district || 'all',
        propertyType: pType,
        searchLevel: 'no_city',
        sources: [],
        method: 'none',
        cache: 'miss'
      },
      note
    };
  }

  const districtRecord = isSpainCountry ? getDistrictRecord(cityCfg.value, district || 'all') : null;
  const zoneSlug = districtRecord?.fotocasaZone || 'todas-las-zonas';

  const primarySites = (() => {
    if (isSpainCountry) {
      return buildSpainSites({
        cityCfg,
        areaValue,
        roomsValue,
        propertyType: pType,
        minPrice,
        maxPrice,
        zoneSlug
      });
    }
    return buildInternationalSites({ cityToken, profile: countryProfile });
  })();

  let browser = null;
  const sourcesUsed = [];
  let merged = [];
  const sourceQuality = {};

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const createConfiguredPage = async () => {
      const page = await browser.newPage();
      const acceptLanguage = isSpainCountry ? 'es-ES,es;q=0.9,en;q=0.8' : 'en-US,en;q=0.9';
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': acceptLanguage,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });
      await page.setViewport({ width: 1920, height: 1080 });
      return page;
    };

    const scrapeSites = async (sites, phaseLabel) => {
      const siteResults = await Promise.all(
        sites.map(async (site) => {
          let page = null;
          try {
            page = await createConfiguredPage();
            const searchUrl = site.buildUrl();
            const batch = await Promise.race([
              site.parseFunction(page, searchUrl),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`site timeout ${SCRAPE_SITE_TIMEOUT_MS}ms`)), SCRAPE_SITE_TIMEOUT_MS)
              )
            ]);
            if (!batch || batch.length === 0) {
              console.log(`DEBUG: ${site.name} returned 0 items. url=${searchUrl}`);
            } else {
              console.log(`DEBUG: ${site.name} parsed items=${batch.length}. first=${JSON.stringify(batch[0]).slice(0, 500)}`);
            }
            return {
              site: site.name,
              items: (batch || []).map((p) => ({ ...p, source: site.name })),
              searchUrl
            };
          } catch (error) {
            console.error(`❌ Ошибка при парсинге ${site.name}:`, error.message);
            return { site: site.name, items: [], searchUrl: null };
          } finally {
            if (page) {
              await page.close().catch(() => {});
            }
          }
        })
      );

      for (const result of siteResults) {
        const current = sourceQuality[result.site] || {
          parsed: 0,
          phase: phaseLabel,
          urls: []
        };
        current.parsed += result.items.length;
        if (result.searchUrl) current.urls.push(result.searchUrl);
        sourceQuality[result.site] = current;
        if (result.items.length) {
          sourcesUsed.push(result.site);
          merged.push(...result.items);
        }
      }
    };

    await scrapeSites(primarySites, 'primary');

    // Если испанская выдача слишком узкая, пробуем соседние города в том же регионе.
    if (isSpainCountry && merged.length < 8) {
      const fallbackCities = getSpainFallbackCityConfigs(cityCfg);
      if (fallbackCities.length > 0) {
        const fallbackSites = [];
        for (const fallbackCity of fallbackCities.slice(0, 1)) {
          const built = buildSpainSites({
            cityCfg: fallbackCity,
            areaValue,
            roomsValue,
            propertyType: pType,
            minPrice,
            maxPrice,
            zoneSlug: 'todas-las-zonas'
          }).map((site) => ({
            ...site,
            name: `${site.name} (fallback:${fallbackCity.value})`
          }));
          fallbackSites.push(...built);
        }
        await scrapeSites(fallbackSites, 'regional_fallback');
      }
    }

    // Догружаем часть карточек по detail-страницам, чтобы вытащить цену/площадь/комнаты.
    merged = await enrichPropertiesFromDetails(browser, merged);

    // Резерв отключён: он часто смешивает города и типы.

    await browser.close();
    browser = null;

    merged = dedupeByLink(merged);

    const baseCandidates = merged.filter((p) => p.price && p.price > 0 && p.link);
    const relaxedSimilar = buildRelaxedSimilarProperties({
      items: baseCandidates,
      areaValue,
      roomsValue,
      noRoomsType,
      cityToken,
      isSpainCountry,
      cityCfg,
      pType,
      districtRecord,
      streetQuery: street
    });

    let valid = [...baseCandidates];
    console.log(`DEBUG: merged(after dedupe)=${merged.length}, valid(price/link)=${valid.length}`);

    const sourceRawCounts = summarizeSourceCounts(valid);

    if (isSpainCountry) {
      // Город: если адрес не распарсился, опираемся на ссылку (там присутствует slug города из URL поиска).
      valid = valid.filter((p) => {
        if (p.address) return addressMatchesCity(p.address, cityName);
        return linkMatchesCity(p.link, cityName, cityCfg);
      });
    } else {
      valid = valid.filter((p) => cityMatchesLoose(p, cityToken));
    }
    console.log(`DEBUG: after city filter=${valid.length}`);
    const sourceAfterCity = summarizeSourceCounts(valid);

    // Доп. защита по типу: для land/commercial не режем по тексту (часто нечего парсить),
    // т.к. выдача уже отфильтрована URL сегментом.
    if (pType !== 'land' && pType !== 'commercial') {
      valid = valid.filter((p) => {
        const detected = classifyPropertyByText(p);
        if (pType === 'villa') return detected === 'villa' || detected === 'house';
        if (pType === 'house') return detected === 'house' || detected === 'villa';
        if (pType === 'apartamento') return detected === 'apartamento' || detected === 'apartment';
        return detected === 'apartment' || detected === 'apartamento';
      });
    }

    if (isSpainCountry && districtRecord?.keywords?.length) {
      const byDistrict = valid.filter((p) => p.address && addressMatchesDistrict(p.address, districtRecord));
      if (byDistrict.length >= 3) valid = byDistrict;
    }
    console.log(`DEBUG: after district filter=${valid.length}`);

    if (areaValue) {
      valid = valid.filter((p) => {
        if (!p.area) return true;
        return p.area >= areaValue * 0.65 && p.area <= areaValue * 1.35;
      });
    }
    console.log(`DEBUG: after area filter=${valid.length}`);

    if (!noRoomsType && roomsValue) {
      valid = valid.filter((p) => {
        if (!p.rooms && p.rooms !== 0) return true;

        if (roomsValue === 'studio') {
          return p.isStudio === true || p.rooms === 0 || p.rooms === 1;
        }
        if (p.isStudio === true) return false;
        return Math.abs(p.rooms - roomsValue) <= 1;
      });
    }
    console.log(`DEBUG: after rooms filter=${valid.length}`);

    if (minPrice) {
      const minPriceValue = parseInt(minPrice, 10);
      valid = valid.filter((p) => p.price >= minPriceValue);
    }

    if (maxPrice) {
      const maxPriceValue = parseInt(maxPrice, 10);
      valid = valid.filter((p) => p.price <= maxPriceValue);
    }
    console.log(`DEBUG: after price bounds filter=${valid.length}`);
    const sourceFinalCounts = summarizeSourceCounts(valid);

    for (const [src, q] of Object.entries(sourceQuality)) {
      q.afterCity = sourceAfterCity[src] || 0;
      q.final = sourceFinalCounts[src] || 0;
      q.rawValid = sourceRawCounts[src] || 0;
    }

    const prices = valid.map((p) => p.price);
    let recommendedPrice = robustMedian(prices);
    let recommendedPricePerSqm = null;
    let usedBenchmarkFallback = false;

    if (recommendedPrice && areaValue > 0) {
      recommendedPricePerSqm = Math.round(recommendedPrice / areaValue);
    }

    if (!recommendedPrice || !Number.isFinite(recommendedPrice)) {
      const benchmarkPerSqm = getBenchmarkPerSqm({
        cityCfg,
        cityToken,
        countryProfile,
        propertyType: pType
      });
      recommendedPricePerSqm = benchmarkPerSqm;
      recommendedPrice = Math.round(benchmarkPerSqm * Math.max(areaValue, 1));
      usedBenchmarkFallback = true;
    }

    const uniqueSources = [...new Set(sourcesUsed)];

    const hasStrictComparables = valid.length > 0;
    const similarForUi = hasStrictComparables
      ? valid.slice(0, 15)
      : relaxedSimilar.slice(0, 15);

    const response = {
      recommendedPrice: recommendedPrice || null,
      recommendedPricePerSqm,
      similarProperties: similarForUi,
      searchParams: {
        area: areaValue,
        rooms: noRoomsType ? null : roomsValue,
        city: cityName,
        country: countryProfile.code,
        district: district || 'all',
        propertyType: pType,
        searchLevel: valid.length > 0 ? 'parsed' : 'no_results',
        sources: uniqueSources,
        method: usedBenchmarkFallback
          ? 'benchmark_fallback'
          : (valid.length >= 8 ? 'trimmed_median' : 'median'),
        cache: 'miss',
        sourceQuality,
        benchmarkFallback: usedBenchmarkFallback,
        relaxedSimilarUsed: !hasStrictComparables && similarForUi.length > 0
      },
      note: valid.length > 0
        ? (isSpainCountry
          ? `Оценка по ${valid.length} объявлениям с ${uniqueSources.join(', ')}. Район: ${districtRecord?.label || 'весь город'}.`
          : `Оценка по ${valid.length} объявлениям с ${uniqueSources.join(', ')} для ${cityToken}, ${rawCountry || 'международный режим'}.`)
        : ((!hasStrictComparables && similarForUi.length > 0)
          ? `Точных аналогов по строгим фильтрам мало, поэтому показаны ближайшие похожие объявления и ориентир по бенчмарку.`
          : (usedBenchmarkFallback
          ? `Точных аналогов сейчас мало, поэтому показан ориентир по бенчмарку €/м² для ${cityToken}.`
          : (isSpainCountry
            ? `Мало подходящих объявлений после фильтров. Попробуйте «Весь город», другой тип жилья или площадь ±15–20 %.`
            : `Мало совпадений по ${cityToken}. Попробуйте ближайший крупный город, другой тип жилья или площадь ±20 %.`)))
    };
    setToCalculatorCache(cacheKey, response);
    return response;
  } catch (error) {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Ошибка при закрытии браузера:', closeError);
      }
    }

    console.error('❌ Ошибка при расчете:', error);

    return {
      recommendedPrice: null,
      recommendedPricePerSqm: null,
      similarProperties: [],
      searchParams: {
        area: parseInt(area, 10) || null,
        rooms: noRoomsType ? null : (rooms === 'studio' ? 'studio' : (parseInt(rooms, 10) || null)),
        city: cityName,
        country: countryProfile.code,
        district: district || 'all',
        propertyType: pType,
        searchLevel: 'error',
        sources: [],
        method: 'none',
        cache: 'miss'
      },
      note: 'Произошла ошибка при поиске объектов. Попробуйте позже или измените параметры.'
    };
  }
}
