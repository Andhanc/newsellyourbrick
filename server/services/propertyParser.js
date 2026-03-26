import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import {
  CITY_KEYWORDS,
  getCityConfig,
  getDistrictRecord
} from '../data/propertyCalculatorLocations.js';

puppeteer.use(StealthPlugin());

/**
 * Функция парсинга Spain Real Estate (резерв: общий каталог без точного города)
 */
async function parseSpainRealEstate(page, url) {
  console.log(`🌐 Парсим Spain Real Estate: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 4000));

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
  const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch((e) => {
    console.error('DEBUG: Fotocasa goto error:', e.message);
    throw e;
  });
  console.log('DEBUG: Fotocasa status=', resp?.status());
  console.log('DEBUG: Fotocasa title=', await page.title());
  await new Promise(resolve => setTimeout(resolve, 3000));

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
  const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch((e) => {
    console.error('DEBUG: Pisos goto error:', e.message);
    throw e;
  });
  console.log('DEBUG: Pisos status=', resp?.status());
  console.log('DEBUG: Pisos title=', await page.title());
  await new Promise(resolve => setTimeout(resolve, 3000));

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
      return (
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

      if (link && price) {
        results.push({ price, area, rooms, address, link, image });
      }
    }

    return { results, diag };
  });

  console.log('DEBUG: Pisos evaluate diag:', JSON.stringify(diag).slice(0, 1000));

  return properties;
}

async function parseIdealista(page, url) {
  console.log(`🌐 Парсим Idealista: ${url}`);
  const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch((e) => {
    console.error('DEBUG: Idealista goto error:', e.message);
    throw e;
  });
  console.log('DEBUG: Idealista status=', resp?.status());
  console.log('DEBUG: Idealista title=', await page.title());
  await new Promise(resolve => setTimeout(resolve, 5000));

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
  areaValue,
  roomsValue,
  propertyType,
  minPrice,
  maxPrice
}) {
  const base = fotocasaListingPath(propertyType);
  const city = cityCfg.fotocasa;
  const zone = zoneSlug || 'todas-las-zonas';
  const mp = minPrice != null ? minPrice : '';
  const xp = maxPrice != null ? maxPrice : '';

  if (propertyType === 'land') {
    return `https://www.fotocasa.es/es/comprar/${base}/${city}/${zone}/l/${areaValue}-m2?minPrice=${mp}&maxPrice=${xp}`;
  }

  const roomsForUrl = roomsValue === 'studio' ? 1 : (parseInt(roomsValue, 10) || 2);
  return `https://www.fotocasa.es/es/comprar/${base}/${city}/${zone}/l/${areaValue}-m2-${roomsForUrl}-hab?minPrice=${mp}&maxPrice=${xp}`;
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
  areaValue,
  roomsValue,
  propertyType
}) {
  const seg = pisosListingSegment(propertyType);
  const city = cityCfg.pisos;

  if (propertyType === 'land' || propertyType === 'commercial') {
    return `https://www.pisos.com/venta/${seg}-${city}/con-${areaValue}-metros/`;
  }

  const roomsForUrl = roomsValue === 'studio' ? 1 : (parseInt(roomsValue, 10) || 2);
  return `https://www.pisos.com/venta/${seg}-${city}/con-${areaValue}-metros_${roomsForUrl}-habitaciones/`;
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

/**
 * Основная функция: несколько источников (Fotocasa, Idealista, Pisos), агрегация и устойчивая медиана
 */
export async function calculatePropertyPrice({
  area,
  rooms,
  city,
  propertyType = 'apartment',
  district = 'all',
  maxPrice,
  minPrice
}) {
  const cityName = (city || '').toLowerCase().trim();
  const areaValue = parseInt(area, 10) || 60;
  const roomsValue = rooms === 'studio' ? 'studio' : (parseInt(rooms, 10) || 2);
  const pType = propertyType || 'apartment';
  const noRoomsType = pType === 'land' || pType === 'commercial';

  const cityCfg = getCityConfig(cityName);
  if (!cityCfg) {
    return {
      recommendedPrice: null,
      recommendedPricePerSqm: null,
      similarProperties: [],
      searchParams: {
        area: areaValue,
        rooms: noRoomsType ? null : roomsValue,
        city: cityName,
        district: district || 'all',
        propertyType: pType,
        searchLevel: 'no_city',
        sources: [],
        method: 'none'
      },
      note: 'Город не найден в справочнике. Выберите город из списка.'
    };
  }

  const districtRecord = getDistrictRecord(cityName, district || 'all');
  const zoneSlug = districtRecord.fotocasaZone || 'todas-las-zonas';

  const urlParams = {
    cityCfg,
    zoneSlug,
    areaValue,
    roomsValue,
    propertyType: pType,
    minPrice,
    maxPrice
  };

    // Проверяем несколько источников: нам нужен хотя бы один, который реально отдаёт карточки.
    const primarySites = [
      { name: 'Idealista', buildUrl: () => buildIdealistaUrl(urlParams), parseFunction: parseIdealista },
      { name: 'Fotocasa', buildUrl: () => buildFotocasaUrl(urlParams), parseFunction: parseFotocasa },
      { name: 'Pisos.com', buildUrl: () => buildPisosUrl(urlParams), parseFunction: parsePisos }
    ];

  let browser = null;
  const sourcesUsed = [];
  let merged = [];

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

    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    await page.setViewport({ width: 1920, height: 1080 });

    for (const site of primarySites) {
      try {
        const searchUrl = site.buildUrl();
        const batch = await site.parseFunction(page, searchUrl);
        if (!batch || batch.length === 0) {
          console.log(`DEBUG: ${site.name} returned 0 items. url=${searchUrl}`);
        } else {
          console.log(`DEBUG: ${site.name} parsed items=${batch.length}. first=${JSON.stringify(batch[0]).slice(0, 500)}`);
        }
        const tagged = (batch || []).map((p) => ({ ...p, source: site.name }));
        if (tagged.length) {
          sourcesUsed.push(site.name);
          merged.push(...tagged);
        }
      } catch (error) {
        console.error(`❌ Ошибка при парсинге ${site.name}:`, error.message);
      }
    }

    // Резерв отключён: он часто смешивает города и типы.

    await browser.close();
    browser = null;

    merged = dedupeByLink(merged);

    let valid = merged.filter((p) => p.price && p.price > 0 && p.link);
    console.log(`DEBUG: merged(after dedupe)=${merged.length}, valid(price/link)=${valid.length}`);

    // Город: если адрес не распарсился, опираемся на ссылку (там присутствует slug города из URL поиска).
    valid = valid.filter((p) => {
      if (p.address) return addressMatchesCity(p.address, cityName);
      return linkMatchesCity(p.link, cityName, cityCfg);
    });
    console.log(`DEBUG: after city filter=${valid.length}`);

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

    if (districtRecord?.keywords?.length) {
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

    const prices = valid.map((p) => p.price);
    const recommendedPrice = robustMedian(prices);
    let recommendedPricePerSqm = null;
    if (recommendedPrice && areaValue > 0) {
      recommendedPricePerSqm = Math.round(recommendedPrice / areaValue);
    }

    const uniqueSources = [...new Set(sourcesUsed)];

    return {
      recommendedPrice: recommendedPrice || null,
      recommendedPricePerSqm,
      similarProperties: valid.slice(0, 15),
      searchParams: {
        area: areaValue,
        rooms: noRoomsType ? null : roomsValue,
        city: cityName,
        district: district || 'all',
        propertyType: pType,
        searchLevel: valid.length > 0 ? 'parsed' : 'no_results',
        sources: uniqueSources,
        method: valid.length >= 8 ? 'trimmed_median' : 'median'
      },
      note: valid.length > 0
        ? `Оценка по ${valid.length} объявлениям с ${uniqueSources.join(', ')}. Район: ${districtRecord.label}.`
        : `Мало подходящих объявлений после фильтров. Попробуйте «Весь город», другой тип жилья или площадь ±15–20 %.`
    };
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
        district: district || 'all',
        propertyType: pType,
        searchLevel: 'error',
        sources: [],
        method: 'none'
      },
      note: 'Произошла ошибка при поиске объектов. Попробуйте позже или измените параметры.'
    };
  }
}
