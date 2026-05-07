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
const CALCULATOR_PIPELINE_VERSION = 'v7-es-5src-pagination-strict-loc';
const TARGET_MIN_SOURCE_COVERAGE = 2;
const TARGET_MIN_SIMILAR_COUNT = 4;
const ENABLE_REGIONAL_FALLBACK = false;
const propertyPriceCache = new Map();
const SCRAPE_NAV_TIMEOUT_MS = 22000;
const SCRAPE_SETTLE_MS = 1200;
const SCRAPE_SITE_TIMEOUT_MS = 95000;
/** Сколько страниц листинга обходим на каждой площадке (защита от бесконечного цикла и таймаутов). */
const LISTING_MAX_PAGES_PER_SITE = 16;
const LISTING_INTER_PAGE_DELAY_MS = 550;
const LISTING_MAX_CARDS_PER_EVAL = 120;

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

async function parseFotocasaOnce(page, url) {
  console.log(`🌐 Парсим Fotocasa: ${url}`);
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_NAV_TIMEOUT_MS }).catch((e) => {
    console.error('DEBUG: Fotocasa goto error:', e.message);
    throw e;
  });
  console.log('DEBUG: Fotocasa status=', resp?.status());
  console.log('DEBUG: Fotocasa title=', await page.title());
  await new Promise(resolve => setTimeout(resolve, SCRAPE_SETTLE_MS));

  const maxCards = LISTING_MAX_CARDS_PER_EVAL;
  const properties = await page.evaluate((maxCard) => {
    const parseMoneyFromText = (text = '') => {
      const normalized = String(text || '').replace(/\u00A0/g, ' ');
      if (!normalized) return null;

      const candidates = [];
      const pushCandidate = (raw) => {
        const value = parseInt(String(raw || '').replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(value) && value >= 10000 && value <= 8000000) {
          candidates.push(value);
        }
      };

      // Предпочитаем суммы в EUR. Тысячи — только через точку (испанский формат),
      // чтобы не склеивать "1/26 520.000 €" в "26.520.000 €".
      for (const m of normalized.matchAll(/(\d{1,3}(?:\.\d{3}){1,3}|\d{4,8})\s*€/gi)) pushCandidate(m?.[1]);
      for (const m of normalized.matchAll(/€\s*(\d{1,3}(?:\.\d{3}){1,3}|\d{4,8})/gi)) pushCandidate(m?.[1]);
      if (candidates.length > 0) return Math.max(...candidates);

      return null;
    };

    const parseAreaFromText = (text = '') => {
      const m = String(text || '').match(/(\d{2,4})\s*(?:m²|m2|metros|metres|m)\b/i);
      if (!m) return null;
      const value = parseInt(m[1], 10);
      return Number.isFinite(value) ? value : null;
    };

    const parseRoomsFromText = (text = '') => {
      const m =
        String(text || '').match(/(\d+)\s*(?:hab|habitaciones|dormitorios|rooms|bedrooms)\b/i) ||
        String(text || '').match(/(?:hab\.?\s*)(\d+)/i);
      if (!m) return null;
      const value = parseInt(m[1], 10);
      return Number.isFinite(value) ? value : null;
    };

    const results = [];
    const cards = document.querySelectorAll('[data-testid="property-card"], .re-CardPack, article[class*="Card"]');
    const linkAnchors = document.querySelectorAll('a[href*="/vivienda/"], a[href*="/inmueble/"]');
    console.log('DEBUG: Fotocasa candidate cards=', cards.length, 'links=', linkAnchors.length);

    cards.forEach((card, index) => {
      if (index >= maxCard) return;

      try {
        const linkEl = card.querySelector('a[href*="/vivienda/"], a[href*="/inmueble/"]');
        if (!linkEl) return;
        const link = linkEl.href.startsWith('http') ? linkEl.href : `https://www.fotocasa.es${linkEl.getAttribute('href')}`;
        const cardText = (card.innerText || card.textContent || '').replace(/\s+/g, ' ').trim();

        const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
        const priceText = priceEl?.textContent || '';
        const price = parseMoneyFromText(priceText) || parseMoneyFromText(cardText);

        const areaEl = card.querySelector('[class*="surface"], [class*="area"], [class*="metros"]');
        const areaText = areaEl?.textContent || '';
        const area = parseAreaFromText(areaText) || parseAreaFromText(cardText);

        const roomsEl = card.querySelector('[class*="room"], [class*="habitacion"]');
        const roomsText = roomsEl?.textContent || '';
        const rooms = parseRoomsFromText(roomsText) || parseRoomsFromText(cardText);

        const addressEl = card.querySelector('[class*="address"], [class*="location"], [data-testid*="location"]');
        let address = addressEl?.textContent?.replace(/\s+/g, ' ').trim() || '';
        if (!address || address.length < 4) {
          const fromLink = link.match(/\/(barcelona|madrid|valencia|sevilla|malaga|alicante|bilbao)\b/i);
          address = fromLink ? fromLink[1] : '';
        }

        const imgEl = card.querySelector('img[src], img[data-src]');
        const image = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;

        if (link) {
          results.push({ price, area, rooms, address, link, image });
        }
      } catch (e) {
        console.error('Ошибка парсинга карточки:', e);
      }
    });

    // Добор ссылок: даже если часть карточек распарсилась, добавляем дополнительные
    // объявления как кандидатов для detail-enrich, чтобы не терять объем выдачи.
    if (linkAnchors.length > 0 && results.length < maxCard) {
      const seen = new Set();
      results.forEach((x) => x?.link && seen.add(x.link));
      Array.from(linkAnchors).slice(0, maxCard + 20).forEach((a) => {
        const href = a.getAttribute('href') || a.href || '';
        const link = href.startsWith('http') ? href : `https://www.fotocasa.es${href.startsWith('/') ? '' : '/'}${href}`;
        if (!link || seen.has(link)) return;
        seen.add(link);
        const text = (a.closest('article')?.innerText || a.innerText || '').replace(/\s+/g, ' ').trim();
        const price = parseMoneyFromText(text);
        results.push({
          price: Number.isFinite(price) ? price : null,
          area: null,
          rooms: null,
          address: text.slice(0, 120),
          link,
          image: null
        });
      });
    }

    return results;
  }, maxCards);

  return properties;
}

async function parseFotocasa(page, firstUrl) {
  return mergePagedScrape(page, firstUrl, buildFotocasaPagedUrl, parseFotocasaOnce, 'Fotocasa');
}

async function parsePisosOnce(page, url) {
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

  // Сначала пробуем JSON-LD: это наиболее стабильный источник цены/площади.
  const jsonLdItems = await page.evaluate(() => {
    const toAbs = (href) => {
      if (!href) return '';
      try {
        return new URL(href, location.href).href;
      } catch {
        return href;
      }
    };

    const parsePrice = (value) => {
      const n = parseInt(String(value || '').replace(/[^\d]/g, ''), 10);
      return Number.isFinite(n) ? n : null;
    };

    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const results = [];
    for (const s of scripts) {
      try {
        const raw = (s.textContent || '').trim();
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of arr) {
          const elements = item?.itemListElement || item?.mainEntity?.itemListElement;
          if (!Array.isArray(elements)) continue;
          for (const el of elements) {
            const node = el?.item || el;
            const link = toAbs(node?.url || node?.offers?.url || '');
            const price = parsePrice(node?.offers?.price || node?.price || '');
            const title = String(node?.name || node?.description || '');
            const areaMatch = title.match(/(\d{2,4})\s*(?:m²|m2)/i);
            const roomsMatch = title.match(/(\d+)\s*(?:hab|habitaciones|dormitorios)/i);
            const area = areaMatch ? parseInt(areaMatch[1], 10) : null;
            const rooms = roomsMatch ? parseInt(roomsMatch[1], 10) : null;
            const address = node?.address?.streetAddress || node?.address?.addressLocality || '';
            if (link && price && price > 10000) {
              results.push({ price, area, rooms, address, link, image: null, source: 'Pisos.com' });
            }
          }
        }
      } catch {
        // ignore malformed blocks
      }
    }
    return results.slice(0, 400);
  });

  if (jsonLdItems.length >= 5) {
    console.log(`DEBUG: Pisos JSON-LD parsed items=${jsonLdItems.length}`);
    return jsonLdItems;
  }

  // Pisos.com часто рендерит карточки иначе, поэтому fallback начинаем со ссылок.
  const { results: properties, diag } = await page.evaluate(() => {
    const parseMoneyFromText = (text = '') => {
      const normalized = String(text || '').replace(/\u00A0/g, ' ');
      if (!normalized) return null;

      const candidates = [];
      const pushCandidate = (raw) => {
        const value = parseInt(String(raw || '').replace(/[^\d]/g, ''), 10);
        if (Number.isFinite(value) && value >= 10000 && value <= 8000000) {
          candidates.push(value);
        }
      };

      for (const m of normalized.matchAll(/(\d{1,3}(?:\.\d{3}){1,3}|\d{4,8})\s*€/gi)) pushCandidate(m?.[1]);
      for (const m of normalized.matchAll(/€\s*(\d{1,3}(?:\.\d{3}){1,3}|\d{4,8})/gi)) pushCandidate(m?.[1]);
      if (candidates.length > 0) return Math.max(...candidates);

      for (const m of normalized.matchAll(/\b(\d{5,8})\b/g)) pushCandidate(m?.[1]);
      if (candidates.length > 0) return Math.max(...candidates);

      return null;
    };

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
      if (uniq.length >= 100) break;
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

      // Цена часто лежит в отдельных узлах карточки; текстом берем как fallback.
      const priceNodeText =
        card?.querySelector('[class*="price"], [data-price], [class*="precio"], .h1')?.textContent ||
        '';
      const price = parseMoneyFromText(priceNodeText) || parseMoneyFromText(text);

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
      let address = addressMatch ? addressMatch[1].trim() : '';
      if (!address) {
        const cityHintMatch = text.match(/\b(barcelona(?:\s+capital)?|madrid|valencia|sevilla|malaga|alicante|bilbao)\b/i);
        address = cityHintMatch ? cityHintMatch[1] : '';
      }
      const title = text ? text.slice(0, 180) : '';

      if (!diag.sample && text) {
        diag.sample = {
          i,
          link,
          textPreview: text.slice(0, 220),
          priceFound: priceNodeText || null,
          parsedPrice: price,
          areaFound: areaMatch ? areaMatch[1] : null,
          roomsFound: roomsMatch ? roomsMatch[1] : null
        };
      }

      if (link) {
        // Даже если цена на листинге не распарсилась, оставляем ссылку.
        // Далее detail-enrich подтянет цену/метры/комнаты со страницы объявления.
        results.push({ price, area, rooms, address, title, link, image, source: 'Pisos.com' });
      }
    }

    return { results, diag };
  });

  console.log('DEBUG: Pisos evaluate diag:', JSON.stringify(diag).slice(0, 1000));

  const merged = [...jsonLdItems, ...properties];
  const seen = new Set();
  const deduped = [];
  for (const p of merged) {
    if (!p?.link || seen.has(p.link)) continue;
    seen.add(p.link);
    deduped.push(p);
    if (deduped.length >= 600) break;
  }
  return deduped;
}

async function parsePisos(page, firstUrl) {
  return mergePagedScrape(page, firstUrl, buildPisosPagedUrl, parsePisosOnce, 'Pisos.com');
}

async function parseIdealistaOnce(page, url) {
  console.log(`🌐 Парсим Idealista: ${url}`);
  let resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_NAV_TIMEOUT_MS }).catch((e) => {
    console.error('DEBUG: Idealista goto error:', e.message);
    throw e;
  });
  let status = resp?.status();
  if (status === 403) {
    const fallbackUrl = url.replace('://www.idealista.com/', '://www.idealista.com/en/');
    if (fallbackUrl !== url) {
      console.log('DEBUG: Idealista retry with fallback url=', fallbackUrl);
      resp = await page.goto(fallbackUrl, { waitUntil: 'domcontentloaded', timeout: SCRAPE_NAV_TIMEOUT_MS }).catch(() => null);
      status = resp?.status();
    }
  }
  console.log('DEBUG: Idealista status=', status);
  console.log('DEBUG: Idealista title=', await page.title());
  await new Promise(resolve => setTimeout(resolve, SCRAPE_SETTLE_MS));

  const maxCards = LISTING_MAX_CARDS_PER_EVAL;
  const properties = await page.evaluate((maxCard) => {
    const results = [];
    let cards = document.querySelectorAll('article.item, article[data-adid], [data-adid]');
    const linkAnchors = document.querySelectorAll('a[href*="/inmueble/"]');
    console.log('DEBUG: Idealista candidate cards=', cards.length, 'links=', linkAnchors.length);
    if (cards.length === 0) {
      const links = document.querySelectorAll('a[href*="/inmueble/"]');
      cards = Array.from(links).map(link => link.closest('article') || link.parentElement).filter(el => el);
    }

    cards.forEach((card, index) => {
      if (index >= maxCard) return;

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
  }, maxCards);

  return properties;
}

async function parseIdealista(page, firstUrl) {
  return mergePagedScrape(page, firstUrl, buildIdealistaPagedUrl, parseIdealistaOnce, 'Idealista');
}

async function parseThinkSpainOnce(page, url, cityToken = '') {
  console.log(`🌐 Парсим ThinkSpain: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_NAV_TIMEOUT_MS });
  await new Promise((resolve) => setTimeout(resolve, SCRAPE_SETTLE_MS));

  const maxCards = LISTING_MAX_CARDS_PER_EVAL;
  const properties = await page.evaluate(({ expectedCity, maxCard }) => {
    const results = [];
    const toAbs = (href) => {
      if (!href) return '';
      try {
        return new URL(href, location.href).href;
      } catch {
        return href;
      }
    };
    const toNumber = (value) => {
      const n = parseInt(String(value || '').replace(/[^\d]/g, ''), 10);
      return Number.isFinite(n) ? n : null;
    };

    const cityNeedle = String(expectedCity || '').toLowerCase().trim();
    const cards = document.querySelectorAll(
      'article, li[class*="property"], div[class*="property"], [class*="search-result"], [class*="listing"]'
    );

    cards.forEach((card, index) => {
      if (index >= maxCard * 2) return;
      const text = (card.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 20) return;

      const linkEl =
        card.querySelector('a[href*="/property-for-sale/"], a[href*="/property-in-"], a[href*="/properties-in-"]') ||
        card.querySelector('a[href]');
      if (!linkEl) return;
      const link = toAbs(linkEl.getAttribute('href') || linkEl.href || '');
      if (!link) return;
      if (!/(property-for-sale|property-in|properties-in)/i.test(link)) return;

      const priceMatch =
        text.match(/€\s?(\d{1,3}(?:[.\s]\d{3})+|\d+)/i) ||
        text.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)\s*€/i);
      const areaMatch = text.match(/(\d{2,4})\s*(?:m²|m2|sqm)\b/i);
      const roomsMatch =
        text.match(/(\d+)\s*(?:bed|beds|bedroom|bedrooms|hab|habitaciones|dormitorios)\b/i) ||
        text.match(/(?:bed|beds|hab\.?)\s*(\d+)/i);

      const imageEl = card.querySelector('img[src], img[data-src]');
      const image = toAbs(
        imageEl?.getAttribute('src') ||
        imageEl?.getAttribute('data-src') ||
        imageEl?.src ||
        ''
      ) || null;

      const addressEl = card.querySelector('[class*="location"], [class*="address"], [class*="town"]');
      const address = (addressEl?.textContent || '').trim();

      const price = priceMatch ? toNumber(priceMatch[1]) : null;
      const area = areaMatch ? toNumber(areaMatch[1]) : null;
      const rooms = roomsMatch ? toNumber(roomsMatch[1]) : null;
      if (!price || price < 10000) return;

      if (cityNeedle) {
        const hay = `${text} ${address} ${link}`.toLowerCase();
        if (!hay.includes(cityNeedle)) return;
      }

      results.push({ price, area, rooms, address, link, image });
    });

    return results.slice(0, maxCard * 2);
  }, { expectedCity: cityToken, maxCard: maxCards });

  return properties;
}

async function parseThinkSpain(page, firstUrl, cityToken = '') {
  const parseOnce = (pgPage, url) => parseThinkSpainOnce(pgPage, url, cityToken);
  return mergePagedScrape(
    page,
    firstUrl,
    (u, n) => buildQueryPagedUrl(u, n, 'page'),
    parseOnce,
    'ThinkSpain'
  );
}

async function parseGenericInternational(page, url, siteName, expectedCity = '', opts = {}) {
  const maxReturn = opts.maxReturn ?? 40;
  const maxCardScan = opts.maxCardScan ?? 220;
  const jsonLdCap = opts.jsonLdCap ?? 60;
  console.log(`🌍 Парсим ${siteName}: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: SCRAPE_NAV_TIMEOUT_MS });
  await new Promise((resolve) => setTimeout(resolve, SCRAPE_SETTLE_MS));

  const properties = await page.evaluate(({ cityNeedleRaw, maxReturn: cap, maxCardScan: scanCap, jsonLdCap: jlCap }) => {
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
        text.match(/([€$£]\s?\d{4,})/) ||
        text.match(/(\d{4,}\s?[€$£])/) ||
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

    const cityNeedle = String(cityNeedleRaw || '').toLowerCase().trim();
    const maxReturn = cap;
    const maxCardScan = scanCap;
    const jsonLdCap = jlCap;
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
              if (cityNeedle) {
                const hay = `${address || ''} ${title || ''} ${link}`.toLowerCase();
                if (!hay.includes(cityNeedle)) continue;
              }
              results.push({ price, area: area || null, rooms: rooms || null, address, link, title, image: null });
            }
          }
        }
      } catch {
        // ignore malformed script blocks
      }
    }

    if (results.length >= 5) return results.slice(0, jsonLdCap);

    const cards = document.querySelectorAll('article, li, [class*="listing"], [class*="property"], [class*="card"]');
    cards.forEach((card, index) => {
      if (index >= maxCardScan) return;
      const txt = (card.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length < 20) return;
      const price = parsePrice(txt);
      if (!price) return;

      const linkEl = card.querySelector('a[href]');
      if (!linkEl) return;
      const link = toAbs(linkEl.getAttribute('href') || linkEl.href || '');
      if (!link) return;

      if (cityNeedle) {
        const hay = `${txt} ${link}`.toLowerCase();
        if (!hay.includes(cityNeedle)) return;
      }

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

    return results.slice(0, maxReturn);
  }, {
    cityNeedleRaw: expectedCity,
    maxReturn,
    maxCardScan,
    jsonLdCap
  });

  return properties;
}

async function parseKyeroPaginated(page, baseUrl, cityLabel) {
  const parseOnce = (pg, url) =>
    parseGenericInternational(pg, url, 'Kyero', cityLabel, {
      maxReturn: 120,
      maxCardScan: 320,
      jsonLdCap: 120
    });
  return mergePagedScrape(
    page,
    baseUrl,
    (u, n) => buildQueryPagedUrl(u, n, 'page'),
    parseOnce,
    'Kyero'
  );
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

function sanitizeComparableAddress(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const blockedPatterns = [
    /cerca de mi ubicaci[oó]n actual/i,
    /mi ubicaci[oó]n actual/i,
    /near my current location/i
  ];
  if (blockedPatterns.some((re) => re.test(text))) return '';

  return text;
}

function normalizeParsedProperty(property = {}) {
  return {
    ...property,
    address: sanitizeComparableAddress(property.address || '')
  };
}

function normalizeSlug(value = '') {
  return normalizeComparable(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildIdealistaPagedUrl(firstUrl, pageNum) {
  if (pageNum <= 1) return firstUrl;
  try {
    const u = new URL(firstUrl);
    let p = u.pathname.replace(/\/pagina-\d+\.htm\/?$/i, '');
    if (!p.endsWith('/')) p += '/';
    u.pathname = `${p.replace(/\/$/, '')}/pagina-${pageNum}.htm`;
    return u.toString();
  } catch {
    return firstUrl;
  }
}

function buildPisosPagedUrl(firstUrl, pageNum) {
  if (pageNum <= 1) return firstUrl;
  try {
    const u = new URL(firstUrl);
    let p = u.pathname.replace(/\/pagina-\d+\/?$/i, '');
    if (p.endsWith('/')) p = p.slice(0, -1);
    u.pathname = `${p}/pagina-${pageNum}`;
    return u.toString();
  } catch {
    return firstUrl;
  }
}

function buildFotocasaPagedUrl(firstUrl, pageNum) {
  try {
    const u = new URL(firstUrl);
    if (pageNum <= 1) u.searchParams.delete('pagina');
    else u.searchParams.set('pagina', String(pageNum));
    return u.toString();
  } catch {
    return firstUrl;
  }
}

function buildQueryPagedUrl(firstUrl, pageNum, paramName = 'page') {
  try {
    const u = new URL(firstUrl);
    if (pageNum <= 1) u.searchParams.delete(paramName);
    else u.searchParams.set(paramName, String(pageNum));
    return u.toString();
  } catch {
    return firstUrl;
  }
}

async function mergePagedScrape(page, firstUrl, buildPageUrl, parseOnce, label) {
  const merged = [];
  const seen = new Set();
  for (let pg = 1; pg <= LISTING_MAX_PAGES_PER_SITE; pg++) {
    const url = buildPageUrl(firstUrl, pg);
    let batch = [];
    try {
      batch = await parseOnce(page, url);
    } catch (e) {
      console.error(`DEBUG: ${label} page ${pg} error:`, e.message);
      break;
    }
    if (!Array.isArray(batch)) batch = [];
    let added = 0;
    for (const item of batch) {
      const k = normalizePropertyLink(item?.link);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      merged.push(item);
      added++;
    }
    if (!batch.length || added === 0) break;
    if (pg < LISTING_MAX_PAGES_PER_SITE) {
      await new Promise((r) => setTimeout(r, LISTING_INTER_PAGE_DELAY_MS));
    }
  }
  return merged;
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
    CALCULATOR_PIPELINE_VERSION,
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
      parseFunction: (page, url) => parseGenericInternational(page, url, 'Properstar', cityToken)
    });
  }

  if (profile?.greenAcresHost && citySlug) {
    sites.push({
      name: 'Green-Acres',
      buildUrl: () => `https://${profile.greenAcresHost}/en/property-for-sale/${citySlug}`,
      parseFunction: (page, url) => parseGenericInternational(page, url, 'Green-Acres', cityToken)
    });
  }

  sites.push({
    name: 'JamesEdition',
    buildUrl: () => `https://www.jamesedition.com/real_estate?q=${encodedCity}`,
    parseFunction: (page, url) => parseGenericInternational(page, url, 'JamesEdition', cityToken)
  });

  return sites;
}

function buildSpainSupplementalSites({ cityCfg }) {
  const city = cityCfg?.value || '';
  if (!city) return [];
  const cityEnc = encodeURIComponent(city);
  const citySlug = normalizeSlug(city);

  return [
    {
      name: 'SpainHouses ES',
      buildUrl: () => `https://www.spainhouses.net/en/sale_homes-${city}.html`,
      parseFunction: (page, url) => parseGenericInternational(page, url, 'SpainHouses ES', city)
    },
    {
      name: 'Indomio ES',
      buildUrl: () => `https://www.indomio.es/en/venta-casas/${citySlug}/`,
      parseFunction: (page, url) => parseGenericInternational(page, url, 'Indomio ES', city)
    },
    {
      name: 'Trovimap ES',
      buildUrl: () => `https://www.trovimap.com/en/sale/flats-and-apartments/${cityEnc}`,
      parseFunction: (page, url) => parseGenericInternational(page, url, 'Trovimap ES', city)
    },
    {
      name: 'Habitaclia ES',
      buildUrl: () => `https://www.habitaclia.com/viviendas-${citySlug}.htm`,
      parseFunction: (page, url) => parseGenericInternational(page, url, 'Habitaclia ES', city)
    }
  ];
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
  const kyeroSlug = normalizeSlug(cityCfg.value);
  return [
    { name: 'Fotocasa', buildUrl: () => buildFotocasaUrl(urlParams), parseFunction: parseFotocasa },
    { name: 'Idealista', buildUrl: () => buildIdealistaUrl(urlParams), parseFunction: parseIdealista },
    { name: 'Pisos.com', buildUrl: () => buildPisosUrl(urlParams), parseFunction: parsePisos },
    {
      name: 'ThinkSpain',
      buildUrl: () => `https://www.thinkspain.com/property-for-sale?location=${encodeURIComponent(cityCfg.value)}`,
      parseFunction: (page, url) => parseThinkSpain(page, url, cityCfg.value)
    },
    {
      name: 'Kyero',
      buildUrl: () => `https://www.kyero.com/en/property-for-sale/spain/${kyeroSlug}`,
      parseFunction: (page, url) => parseKyeroPaginated(page, url, cityCfg.value)
    }
  ];
}

function countEffectiveSources(items = []) {
  const set = new Set();
  for (const item of items || []) {
    if (!item?.link) continue;
    set.add(normalizeSourceKey(item.source));
  }
  return set.size;
}

function stabilizeRecommendedPrice({
  recommendedPrice,
  validCount,
  areaValue,
  cityCfg,
  cityToken,
  countryProfile,
  pType
}) {
  if (!recommendedPrice || !Number.isFinite(recommendedPrice)) return recommendedPrice;
  if (validCount >= 8) return recommendedPrice;

  const benchmarkPerSqm = getBenchmarkPerSqm({
    cityCfg,
    cityToken,
    countryProfile,
    propertyType: pType
  });
  const benchmarkPrice = Math.round(benchmarkPerSqm * Math.max(areaValue, 1));
  const dataWeight = validCount <= 2 ? 0.55 : 0.7;
  return Math.round(recommendedPrice * dataWeight + benchmarkPrice * (1 - dataWeight));
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
    let best = null;
    let bestScore = -1;
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
        const candidate = {
          price: Number.isFinite(priceRaw) && priceRaw > 0 ? Math.round(priceRaw) : null,
          area: Number.isFinite(areaRaw) && areaRaw > 0 ? Math.round(areaRaw) : null,
          rooms: Number.isFinite(roomsRaw) && roomsRaw >= 0 ? Math.round(roomsRaw) : null,
          address,
          image: image || null
        };
        const score =
          (candidate.price ? 100 : 0) +
          (candidate.area ? 10 : 0) +
          (candidate.rooms != null ? 8 : 0) +
          (candidate.address ? 3 : 0) +
          (candidate.image ? 1 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
    }
    if (best) return best;
  } catch {
    // ignore
  }
  return null;
}

async function enrichPropertiesFromDetails(browser, items = []) {
  const candidates = items.filter((p) => {
    if (!p?.link) return false;
    // Не тратим время на image-only enrich: для расчета важнее price/area/rooms.
    return !p.price || (!p.area && p.rooms == null);
  });
  if (!candidates.length) return items;

  const maxToEnrich = Math.min(candidates.length, 32);
  const targetLinks = new Set(candidates.slice(0, maxToEnrich).map((p) => p.link));
  if (!targetLinks.size) return items;

  const updates = new Map();
  for (const link of targetLinks) {
    let page = null;
    try {
      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 9000 });
      await new Promise((resolve) => setTimeout(resolve, 700));

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
        const parseEuroPrice = (txt = '') => {
          const candidates = [];
          const pushCandidate = (raw) => {
            const value = parseInt(String(raw || '').replace(/[^\d]/g, ''), 10);
            if (Number.isFinite(value) && value >= 10000 && value <= 8000000) {
              candidates.push(value);
            }
          };

          for (const m of txt.matchAll(/(\d{1,3}(?:\.\d{3}){1,3}|\d{4,8})\s*€/gi)) pushCandidate(m?.[1]);
          for (const m of txt.matchAll(/€\s*(\d{1,3}(?:\.\d{3}){1,3}|\d{4,8})/gi)) pushCandidate(m?.[1]);
          for (const m of txt.matchAll(/(?:price|precio)[^0-9]{0,12}(\d{1,3}(?:\.\d{3}){1,3}|\d{4,8})/gi)) pushCandidate(m?.[1]);
          if (!candidates.length) return null;
          return Math.max(...candidates);
        };

        const parsedPrice = parseEuroPrice(allText);
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
          textPrice: parsedPrice,
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

function propertyMatchesDistrict(property = {}, districtRecord) {
  if (!districtRecord?.keywords?.length) return true;
  const haystack = `${property.address || ''} ${property.title || ''} ${property.link || ''}`.toLowerCase();
  return districtRecord.keywords.some((k) => haystack.includes(String(k || '').toLowerCase()));
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

function filterOutlierPrices(items = [], { areaValue, benchmarkPerSqm }) {
  const clean = (items || []).filter((p) => p?.price && p.price > 0);
  if (clean.length < 3 || !benchmarkPerSqm) return clean;

  const withPpsqm = clean.map((p) => {
    const fallbackArea = areaValue > 0 ? areaValue : null;
    const areaForCalc = p.area && p.area > 10 ? p.area : fallbackArea;
    const ppsqm = areaForCalc ? p.price / areaForCalc : null;
    return { ...p, _ppsqm: ppsqm };
  });

  const filtered = withPpsqm.filter((p) => {
    if (!p._ppsqm || !Number.isFinite(p._ppsqm)) return true;
    return p._ppsqm >= benchmarkPerSqm * 0.35 && p._ppsqm <= benchmarkPerSqm * 2.6;
  });

  return filtered.length >= 3 ? filtered.map(({ _ppsqm, ...rest }) => rest) : clean;
}

function pickDiverseSimilar(items = [], max = 15) {
  const bySource = new Map();
  for (const item of items) {
    const src = item?.source || 'unknown';
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src).push(item);
  }

  const buckets = Array.from(bySource.values());
  const picked = [];
  let cursor = 0;
  while (picked.length < max && buckets.some((b) => b.length > 0)) {
    const bucket = buckets[cursor % buckets.length];
    if (bucket.length > 0) picked.push(bucket.shift());
    cursor += 1;
  }
  return picked;
}

function normalizeSourceKey(source = '') {
  return String(source || 'unknown')
    .replace(/\s+\(fallback:[^)]+\)\s*$/i, '')
    .trim() || 'unknown';
}

function buildSourceBalancedRecommendation(items = []) {
  const bySource = new Map();
  for (const item of items || []) {
    if (!item?.price || !Number.isFinite(item.price) || item.price <= 0) continue;
    const sourceKey = normalizeSourceKey(item.source);
    if (!bySource.has(sourceKey)) bySource.set(sourceKey, []);
    bySource.get(sourceKey).push(item.price);
  }

  const medians = [];
  const sourceMedians = {};
  for (const [sourceKey, prices] of bySource.entries()) {
    const median = robustMedian(prices);
    if (!median || !Number.isFinite(median)) continue;
    medians.push(median);
    sourceMedians[sourceKey] = {
      count: prices.length,
      median
    };
  }

  if (medians.length === 0) {
    return { recommendedPrice: null, sourceCount: 0, sourceKeys: [], sourceMedians: {} };
  }

  return {
    // Каждый источник вносит равный вклад через свою медиану.
    recommendedPrice: robustMedian(medians),
    sourceCount: medians.length,
    sourceKeys: Object.keys(sourceMedians),
    sourceMedians
  };
}

function limitItemsPerSource(items = [], { maxPerSource = 6, maxTotal = 36 } = {}) {
  const out = [];
  const counters = {};
  const seen = new Set();

  for (const item of items || []) {
    const key = normalizePropertyLink(item?.link);
    if (!key || seen.has(key)) continue;
    const sourceKey = normalizeSourceKey(item?.source);
    const current = counters[sourceKey] || 0;
    if (current >= maxPerSource) continue;
    seen.add(key);
    counters[sourceKey] = current + 1;
    out.push(item);
    if (out.length >= maxTotal) break;
  }

  return out;
}

function collectSourceSeeds(items = [], perSource = 2) {
  const bySource = new Map();
  for (const item of items || []) {
    const sourceKey = normalizeSourceKey(item?.source);
    if (!bySource.has(sourceKey)) bySource.set(sourceKey, []);
    bySource.get(sourceKey).push(item);
  }

  const out = [];
  for (const list of bySource.values()) {
    out.push(...list.slice(0, Math.max(1, perSource)));
  }
  return out;
}

function buildSimilarMultiSource(primaryItems = [], fallbackItems = [], max = 15, minTarget = TARGET_MIN_SIMILAR_COUNT) {
  const pool = mergeUniqueByLink(primaryItems, fallbackItems, 200);
  if (!pool.length) return [];

  const bySource = new Map();
  for (const item of pool) {
    const key = normalizeSourceKey(item?.source);
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(item);
  }

  const buckets = Array.from(bySource.entries()).map(([sourceKey, items]) => ({ sourceKey, items }));
  const picked = [];
  const used = new Set();
  const perSourceCount = {};
  const maxPerSource = buckets.length <= 1 ? max : Math.max(2, Math.floor(max * 0.35));

  // Сначала берем минимум по одной карточке из каждого источника.
  for (const bucket of buckets) {
    const first = bucket.items.shift();
    const key = normalizePropertyLink(first?.link);
    if (!first || !key || used.has(key)) continue;
    const src = normalizeSourceKey(first?.source);
    if ((perSourceCount[src] || 0) >= maxPerSource) continue;
    used.add(key);
    perSourceCount[src] = (perSourceCount[src] || 0) + 1;
    picked.push(first);
    if (picked.length >= max) return picked;
  }

  // Затем добираем round-robin, чтобы сохранить баланс источников.
  let cursor = 0;
  while (picked.length < max && buckets.some((b) => b.items.length > 0)) {
    const bucket = buckets[cursor % buckets.length];
    const next = bucket.items.shift();
    cursor += 1;
    if (!next) continue;
    const src = normalizeSourceKey(next?.source);
    if ((perSourceCount[src] || 0) >= maxPerSource) continue;
    const key = normalizePropertyLink(next.link);
    if (!key || used.has(key)) continue;
    used.add(key);
    perSourceCount[src] = (perSourceCount[src] || 0) + 1;
    picked.push(next);
  }

  if (picked.length >= minTarget) return picked.slice(0, max);

  // Если после round-robin не добрали минимум, добираем из общего пула.
  for (const item of pool) {
    if (picked.length >= Math.min(max, minTarget)) break;
    const src = normalizeSourceKey(item?.source);
    if ((perSourceCount[src] || 0) >= maxPerSource) continue;
    const key = normalizePropertyLink(item?.link);
    if (!key || used.has(key)) continue;
    used.add(key);
    perSourceCount[src] = (perSourceCount[src] || 0) + 1;
    picked.push(item);
  }

  return picked.slice(0, max);
}

function mergeUniqueByLink(primary = [], secondary = [], max = 15) {
  const out = [];
  const seen = new Set();
  for (const item of [...primary, ...secondary]) {
    const key = normalizePropertyLink(item?.link);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

function matchesRoomsWithTolerance(property, roomsValue, noRoomsType, tolerance) {
  if (noRoomsType) return true;
  if (roomsValue === 'studio') {
    return property.isStudio === true || property.rooms === 0 || property.rooms === 1;
  }
  if (property.rooms == null && property.rooms !== 0) return true;
  if (property.isStudio === true) return false;
  return Math.abs((property.rooms || 0) - roomsValue) <= tolerance;
}

function matchesAreaWithTolerance(property, areaValue, ratioMin, ratioMax) {
  if (!areaValue) return true;
  if (!property.area) return true;
  return property.area >= areaValue * ratioMin && property.area <= areaValue * ratioMax;
}

function buildStreetTokens(street = '') {
  return String(street || '')
    .toLowerCase()
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

function hasStreetMatch(property = {}, streetTokens = []) {
  if (!streetTokens.length) return true;
  const haystack = `${property.address || ''} ${property.title || ''} ${property.link || ''}`.toLowerCase();
  return streetTokens.some((token) => haystack.includes(token));
}

function isReasonableComparable(property, { areaValue, roomsValue, noRoomsType }) {
  if (!property) return false;

  if (areaValue && property.area) {
    const minArea = areaValue * 0.45;
    const maxArea = areaValue * 2.2;
    if (property.area < minArea || property.area > maxArea) return false;
  }

  if (!noRoomsType && roomsValue !== 'studio' && Number.isFinite(roomsValue) && property.rooms != null) {
    const minRooms = Math.max(0, roomsValue - 3);
    const maxRooms = roomsValue + 4;
    if (property.rooms < minRooms || property.rooms > maxRooms) return false;
  }

  if (!noRoomsType && roomsValue === 'studio' && property.rooms != null && property.rooms > 3) return false;

  return true;
}

function matchesRequestedTypeStrict(property = {}, pType = 'apartment') {
  if (pType === 'land' || pType === 'commercial') {
    return classifyPropertyByText(property) === pType;
  }
  const detected = classifyPropertyByText(property);
  if (pType === 'villa') return detected === 'villa' || detected === 'house';
  if (pType === 'house') return detected === 'house' || detected === 'villa';
  if (pType === 'apartamento') return detected === 'apartamento' || detected === 'apartment';
  if (pType === 'apartment') return detected === 'apartment' || detected === 'apartamento';
  return true;
}

function buildStrictUiCandidates({
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
  const streetTokens = buildStreetTokens(streetQuery);
  return (items || []).filter((p) => {
    if (!p?.price || !p?.link) return false;
    if (!matchesRequestedTypeStrict(p, pType)) return false;
    if (!isReasonableComparable(p, { areaValue, roomsValue, noRoomsType })) return false;
    if (isSpainCountry) {
      const cityOk =
        (p.address && addressMatchesCity(p.address, cityCfg?.value || cityToken)) ||
        linkMatchesCity(p.link, cityCfg?.value || cityToken, cityCfg) ||
        cityMatchesLoose(p, cityToken);
      if (!cityOk) return false;
      if (districtRecord?.value && districtRecord.value !== 'all') {
        if (!propertyMatchesDistrict(p, districtRecord)) return false;
      }
    } else if (!cityMatchesLoose(p, cityToken)) {
      return false;
    }
    if (streetTokens.length) {
      if (!hasStreetMatch(p, streetTokens)) return false;
    }
    if (!noRoomsType && roomsValue === 'studio') {
      if (!matchesRoomsWithTolerance(p, roomsValue, noRoomsType, 0)) return false;
    } else if (!noRoomsType && roomsValue !== 'studio') {
      if (p.rooms == null || !Number.isFinite(p.rooms)) return false;
      if (!matchesRoomsWithTolerance(p, roomsValue, noRoomsType, 0)) return false;
    }
    if (areaValue && p.area) {
      if (p.area < areaValue * 0.65 || p.area > areaValue * 1.45) return false;
    }
    return true;
  });
}

function selectComparablesByPriority({
  items,
  areaValue,
  roomsValue,
  noRoomsType,
  cityToken,
  cityName,
  isSpainCountry,
  cityCfg,
  pType,
  districtRecord,
  streetQuery
}) {
  const rank = (list) => buildRelaxedSimilarProperties({
    items: list,
    areaValue,
    roomsValue,
    noRoomsType,
    cityToken,
    isSpainCountry,
    cityCfg,
    pType,
    districtRecord,
    streetQuery
  });

  const allItems = (items || [])
    .filter((p) => p?.price && p?.link)
    .filter((p) => isReasonableComparable(p, { areaValue, roomsValue, noRoomsType }));
  const nonFallback = allItems.filter((p) => !String(p.source || '').includes('(fallback:'));
  const streetTokens = buildStreetTokens(streetQuery);
  const hasDistrict = Boolean(isSpainCountry && districtRecord?.keywords?.length && districtRecord.value !== 'all');

  const byCityFilter = (list) => list.filter((p) => {
    if (!isSpainCountry) return cityMatchesLoose(p, cityToken);
    return (
      (p.address && addressMatchesCity(p.address, cityName)) ||
      linkMatchesCity(p.link, cityName, cityCfg) ||
      cityMatchesLoose(p, cityToken)
    );
  });

  // Сначала только основной город (без fallback-источников).
  // Если пусто — пытаемся расшириться только в рамках основного пула allItems,
  // но не уходим в явно нерелевантные карточки.
  let cityFiltered = byCityFilter(nonFallback);
  let fallbackMode = false;
  if (cityFiltered.length === 0) {
    cityFiltered = byCityFilter(allItems);
    fallbackMode = cityFiltered.length > 0;
  }
  if (cityFiltered.length === 0) {
    // Совсем пустой городской матч: берем только разумно похожие из nonFallback.
    cityFiltered = nonFallback;
    fallbackMode = cityFiltered.length > 0;
  }

  const withDistrict = (list) =>
    list.filter((p) => (hasDistrict ? propertyMatchesDistrict(p, districtRecord) : true));
  const exactRoomsOnly = (list) =>
    noRoomsType ? list : list.filter((p) => matchesRoomsWithTolerance(p, roomsValue, noRoomsType, 0));
  const cityExactRooms = exactRoomsOnly(cityFiltered);

  // Сначала город + тот же тип комнатности, затем улица/район; расширение — только если мало данных.
  const locationStages = [
    withDistrict(cityExactRooms).filter((p) => hasStreetMatch(p, streetTokens)),
    cityExactRooms.filter((p) => hasStreetMatch(p, streetTokens)),
    withDistrict(cityExactRooms),
    cityExactRooms,
    withDistrict(cityFiltered).filter((p) => hasStreetMatch(p, streetTokens)),
    withDistrict(cityFiltered),
    cityFiltered
  ];

  let locationPool =
    locationStages.find((s) => s.length >= 3) || locationStages.find((s) => s.length > 0) || [];

  const roomTolerances = noRoomsType ? [0] : [0, 1, 2];
  const roomStages = roomTolerances.map((tol) => locationPool.filter((p) => matchesRoomsWithTolerance(p, roomsValue, noRoomsType, tol)));
  let roomsPool = roomStages.find((s) => s.length >= 3) || roomStages.find((s) => s.length > 0) || locationPool;

  const areaStages = [
    roomsPool.filter((p) => matchesAreaWithTolerance(p, areaValue, 0.85, 1.15)),
    roomsPool.filter((p) => matchesAreaWithTolerance(p, areaValue, 0.75, 1.25)),
    roomsPool.filter((p) => matchesAreaWithTolerance(p, areaValue, 0.65, 1.35))
  ];
  let areaPool = areaStages.find((s) => s.length >= 3) || areaStages.find((s) => s.length > 0) || roomsPool;

  let similar = pickDiverseSimilar(rank(areaPool), 15);
  if (similar.length < 5) similar = mergeUniqueByLink(similar, pickDiverseSimilar(rank(roomsPool), 15), 15);
  if (similar.length < 5) similar = mergeUniqueByLink(similar, pickDiverseSimilar(rank(locationPool), 15), 15);
  if (similar.length < 5) similar = mergeUniqueByLink(similar, pickDiverseSimilar(rank(cityFiltered), 15), 15);
  if (similar.length < 5) similar = mergeUniqueByLink(similar, pickDiverseSimilar(rank(nonFallback), 15), 15);

  return {
    cityFiltered,
    locationPool,
    roomsPool,
    areaPool,
    similar,
    fallbackMode
  };
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
  areaValue: _areaValue,
  roomsValue: _roomsValue,
  propertyType
}) {
  const path = idealistaListingPath(propertyType);
  const city = cityCfg.idealista;
  // Полный листинг по типу в городе; фильтры по комнатам, адресу и площади — после парсинга.
  return `https://www.idealista.com/${path}/${city}/`;
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

function normalizePropertyLink(link = '') {
  const raw = String(link || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const pathname = (url.pathname || '/').replace(/\/+$/, '') || '/';
    // Для дедупликации в калькуляторе query/hash почти всегда шум (utm, ref и т.п.).
    return `${url.protocol}//${hostname}${pathname}`;
  } catch {
    return raw
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '')
      .toLowerCase();
  }
}

function dedupeByLink(items) {
  const seen = new Set();
  return items.filter((p) => {
    const key = normalizePropertyLink(p?.link);
    if (!key || seen.has(key)) return false;
    seen.add(key);
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
 * Основная функция: Fotocasa, Idealista, Pisos, ThinkSpain, Kyero (Испания),
 * многостраничный сбор листингов, агрегация и устойчивая медиана.
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
    if (ENABLE_REGIONAL_FALLBACK && isSpainCountry && merged.length < 8) {
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

    // Если после primary/fallback покрытие по источникам низкое, добираем дополнительными площадками.
    const sourceCoverageAfterPrimary = countEffectiveSources(merged);
    if (isSpainCountry && sourceCoverageAfterPrimary < TARGET_MIN_SOURCE_COVERAGE) {
      const supplementalSites = buildSpainSupplementalSites({ cityCfg });
      if (supplementalSites.length > 0) {
        await scrapeSites(supplementalSites, 'supplemental');
      }
    }

    // Догружаем часть карточек по detail-страницам, чтобы вытащить цену/площадь/комнаты.
    merged = await enrichPropertiesFromDetails(browser, merged);
    merged = merged.map((item) => normalizeParsedProperty(item));

    // Резерв отключён: он часто смешивает города и типы.

    await browser.close();
    browser = null;

    merged = dedupeByLink(merged);

    const baseCandidates = merged.filter((p) => p.price && p.price > 0 && p.link);
    let valid = [...baseCandidates];
    console.log(`DEBUG: merged(after dedupe)=${merged.length}, valid(price/link)=${valid.length}`);

    const sourceRawCounts = summarizeSourceCounts(valid);
    const validBeforePriority = [...valid];

    if (minPrice) {
      const minPriceValue = parseInt(minPrice, 10);
      valid = valid.filter((p) => p.price >= minPriceValue);
    }

    if (maxPrice) {
      const maxPriceValue = parseInt(maxPrice, 10);
      valid = valid.filter((p) => p.price <= maxPriceValue);
    }
    console.log(`DEBUG: after price bounds filter=${valid.length}`);

    const benchmarkPerSqmForFilter = getBenchmarkPerSqm({
      cityCfg,
      cityToken,
      countryProfile,
      propertyType: pType
    });
    const beforeOutliers = valid.length;
    valid = filterOutlierPrices(valid, { areaValue, benchmarkPerSqm: benchmarkPerSqmForFilter });
    console.log(`DEBUG: after outlier filter=${valid.length} (before=${beforeOutliers})`);
    const validSourcesBeforeCap = new Set(valid.map((p) => normalizeSourceKey(p?.source))).size;
    valid = limitItemsPerSource(valid, { maxPerSource: 90, maxTotal: 450 });
    const validSourcesAfterCap = new Set(valid.map((p) => normalizeSourceKey(p?.source))).size;
    console.log(`DEBUG: after per-source cap=${valid.length}, sources(before=${validSourcesBeforeCap}, after=${validSourcesAfterCap})`);
    const prioritySelection = selectComparablesByPriority({
      items: valid,
      areaValue,
      roomsValue,
      noRoomsType,
      cityToken,
      cityName,
      isSpainCountry,
      cityCfg,
      pType,
      districtRecord,
      streetQuery: street
    });

    console.log(`DEBUG: after location priority=${prioritySelection.locationPool.length}`);
    console.log(`DEBUG: after rooms priority=${prioritySelection.roomsPool.length}`);
    console.log(`DEBUG: after area priority=${prioritySelection.areaPool.length}`);

    const sourceAfterCity = summarizeSourceCounts(prioritySelection.locationPool);
    valid = prioritySelection.areaPool;
    const sourceFinalCounts = summarizeSourceCounts(valid);

    for (const [src, q] of Object.entries(sourceQuality)) {
      q.afterCity = sourceAfterCity[src] || 0;
      q.final = sourceFinalCounts[src] || 0;
      q.rawValid = sourceRawCounts[src] || 0;
    }

    const prices = valid.map((p) => p.price);
    const sourceBalancedRecommendation = buildSourceBalancedRecommendation(valid.length ? valid : validBeforePriority);
    let recommendedPrice = sourceBalancedRecommendation.recommendedPrice || robustMedian(prices);
    recommendedPrice = stabilizeRecommendedPrice({
      recommendedPrice,
      validCount: valid.length,
      areaValue,
      cityCfg,
      cityToken,
      countryProfile,
      pType
    });
    let recommendedPricePerSqm = null;
    let usedBenchmarkFallback = false;
    let districtFallbackUsed = false;

    if (recommendedPrice && areaValue > 0) {
      recommendedPricePerSqm = Math.round(recommendedPrice / areaValue);
    }

    // Если выбрано конкретное distrito и строгих аналогов мало,
    // пробуем районный пул с более мягкими ограничениями.
    if ((!recommendedPrice || !Number.isFinite(recommendedPrice)) && isSpainCountry && districtRecord?.keywords?.length) {
      const districtPool = baseCandidates
        .filter((p) => {
          if (!propertyMatchesDistrict(p, districtRecord)) return false;
          if (pType !== 'land' && pType !== 'commercial') {
            const detected = classifyPropertyByText(p);
            if (pType === 'villa' && !(detected === 'villa' || detected === 'house')) return false;
            if (pType === 'house' && !(detected === 'house' || detected === 'villa')) return false;
            if (pType === 'apartamento' && !(detected === 'apartamento' || detected === 'apartment')) return false;
            if (pType === 'apartment' && !(detected === 'apartment' || detected === 'apartamento')) return false;
          }
          if (areaValue && p.area) {
            return p.area >= areaValue * 0.55 && p.area <= areaValue * 1.55;
          }
          return true;
        })
        .slice(0, 30);

      const districtMedian = robustMedian(districtPool.map((p) => p.price).filter(Boolean));
      if (districtMedian && Number.isFinite(districtMedian)) {
        recommendedPrice = districtMedian;
        recommendedPricePerSqm = areaValue > 0 ? Math.round(districtMedian / areaValue) : null;
        districtFallbackUsed = true;
      }
    }

    if (!recommendedPrice || !Number.isFinite(recommendedPrice)) {
      const benchmarkPerSqm = getBenchmarkPerSqm({
        cityCfg,
        cityToken,
        countryProfile,
        propertyType: pType
      });
      const districtAdjustedBenchmark =
        isSpainCountry && districtRecord?.keywords?.length
          ? Math.round(benchmarkPerSqm * 1.08)
          : benchmarkPerSqm;
      recommendedPricePerSqm = districtAdjustedBenchmark;
      recommendedPrice = Math.round(districtAdjustedBenchmark * Math.max(areaValue, 1));
      usedBenchmarkFallback = true;
    }

    const uniqueSources = [...new Set(sourcesUsed)];
    const achievedSourceCoverage = countEffectiveSources(validBeforePriority);

    const hasStrictComparables = valid.length > 0;
    const strictUiItemsStreetDistrict = buildStrictUiCandidates({
      items: validBeforePriority,
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
    const strictUiItemsDistrictOnly = buildStrictUiCandidates({
      items: validBeforePriority,
      areaValue,
      roomsValue,
      noRoomsType,
      cityToken,
      isSpainCountry,
      cityCfg,
      pType,
      districtRecord,
      streetQuery: ''
    });
    const strictUiItemsCityOnly = buildStrictUiCandidates({
      items: validBeforePriority,
      areaValue,
      roomsValue,
      noRoomsType,
      cityToken,
      isSpainCountry,
      cityCfg,
      pType,
      districtRecord: null,
      streetQuery: ''
    });
    const strictUiItems = mergeUniqueByLink(
      strictUiItemsStreetDistrict,
      mergeUniqueByLink(strictUiItemsDistrictOnly, strictUiItemsCityOnly, 120),
      120
    );
    const relaxedAllRanked = buildRelaxedSimilarProperties({
      items: strictUiItems,
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
    const multiSourceSeeds = collectSourceSeeds(relaxedAllRanked, 2);
    const similarFallbackPool = mergeUniqueByLink(
      strictUiItems,
      mergeUniqueByLink(prioritySelection.similar, multiSourceSeeds, 120),
      120
    );
    const similarForUi = buildSimilarMultiSource(
      prioritySelection.similar.filter((p) => strictUiItems.some((x) => normalizePropertyLink(x.link) === normalizePropertyLink(p.link))),
      similarFallbackPool,
      15,
      TARGET_MIN_SIMILAR_COUNT
    );
    const achievedSimilarSourceCoverage = countEffectiveSources(similarForUi);

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
          : (districtFallbackUsed
            ? 'district_median_fallback'
            : (sourceBalancedRecommendation.sourceCount >= 2
              ? 'source_balanced_median'
              : (valid.length >= 8 ? 'trimmed_median' : 'median'))),
        cache: 'miss',
        sourceQuality,
        sourceBalanced: sourceBalancedRecommendation.sourceCount >= 2,
        sourceBalancedSources: sourceBalancedRecommendation.sourceKeys,
        sourceMedians: sourceBalancedRecommendation.sourceMedians,
        minSourceCoverageTarget: TARGET_MIN_SOURCE_COVERAGE,
        sourceCoverageAchieved: achievedSourceCoverage,
        similarSourceCoverageAchieved: achievedSimilarSourceCoverage,
        minSimilarTarget: TARGET_MIN_SIMILAR_COUNT,
        benchmarkFallback: usedBenchmarkFallback,
        districtFallbackUsed,
        comparablesFallbackUsed: prioritySelection.fallbackMode === true,
        relaxedSimilarUsed: !hasStrictComparables && similarForUi.length > 0,
        similarCount: similarForUi.length
      },
      note: valid.length > 0
        ? (isSpainCountry
          ? `Оценка по ${valid.length} объявлениям с ${uniqueSources.join(', ')}. Район: ${districtRecord?.label || 'весь город'}.`
          : `Оценка по ${valid.length} объявлениям с ${uniqueSources.join(', ')} для ${cityToken}, ${rawCountry || 'международный режим'}.`)
        : ((!hasStrictComparables && similarForUi.length > 0)
          ? (prioritySelection.fallbackMode
            ? `Точных аналогов в выбранном районе/городе мало, поэтому показаны ближайшие похожие объявления из расширенного пула (включая резервные источники).`
            : `Точных аналогов по строгим фильтрам мало, поэтому показаны ближайшие похожие объявления (расширенный поиск по локации и параметрам) и ориентир по бенчмарку.`)
          : (usedBenchmarkFallback
          ? `Точных аналогов сейчас мало, поэтому показан ориентир по €/м² с учетом выбранной локации (${districtRecord?.label || cityToken}).`
          : (isSpainCountry
            ? `Мало подходящих объявлений после фильтров. Попробуйте «Весь город», другой тип жилья или площадь ±15–20 %.`
            : `Мало совпадений по ${cityToken}. Попробуйте ближайший крупный город, другой тип жилья или площадь ±20 %.`)))
    };

    // Жесткий контроль только при критически малом объеме данных.
    if (similarForUi.length < TARGET_MIN_SIMILAR_COUNT) {
      if (similarForUi.length >= 3 && recommendedPrice && Number.isFinite(recommendedPrice)) {
        return {
          ...response,
          searchParams: {
            ...response.searchParams,
            searchLevel: 'low_confidence',
            method: 'low_confidence_estimate',
            insufficientData: true
          },
          note: `Найдено ${similarForUi.length} похожих объявлений (ниже целевого порога ${TARGET_MIN_SIMILAR_COUNT}). Оценка рассчитана, но надежность пониженная.`
        };
      }
      return {
        recommendedPrice: null,
        recommendedPricePerSqm: null,
        similarProperties: similarForUi,
        searchParams: {
          ...response.searchParams,
          searchLevel: 'insufficient_data',
          method: 'insufficient_data',
          insufficientData: true
        },
        note: `Недостаточно надежных аналогов для правдоподобной оценки: найдено ${similarForUi.length} похожих объявлений из ${achievedSimilarSourceCoverage} источников. Нужен минимум ${TARGET_MIN_SIMILAR_COUNT} объявлений из нескольких источников.`
      };
    }

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
