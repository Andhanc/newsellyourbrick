import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

/**
 * Функция парсинга Spain Real Estate
 */
async function parseSpainRealEstate(page, url) {
  console.log(`🌐 Парсим Spain Real Estate: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 4000));

  const properties = await page.evaluate(() => {
    const results = [];
    // Ищем все элементы <li data-object="...">
    const items = document.querySelectorAll('li[data-object]');
    
    console.log(`Найдено элементов: ${items.length}`);
    
    items.forEach((item, index) => {
      if (index >= 30) return;
      
      try {
        // Ссылка на объект - ищем в разных местах
        let linkEl = item.querySelector('a[href*="/property/o"]');
        if (!linkEl) {
          linkEl = item.querySelector('.title a');
        }
        if (!linkEl) {
          linkEl = item.querySelector('.image a');
        }
        if (!linkEl) return;
        
        const href = linkEl.getAttribute('href') || linkEl.href;
        const link = href.startsWith('http') ? href : `https://spain-real.estate${href.startsWith('/') ? '' : '/'}${href}`;
        
        // Цена из <div class="price"><span>€ 575 000</span>
        const priceEl = item.querySelector('.price span');
        let priceText = priceEl?.textContent || '';
        // Если не нашли, пробуем найти цену в тексте
        if (!priceText) {
          const allText = item.textContent || '';
          const priceMatch = allText.match(/[€€]\s*(\d{1,3}(?:[\s\u00A0]\d{3})*)/);
          priceText = priceMatch ? priceMatch[0] : '';
        }
        // Извлекаем число из текста типа "€ 575 000" или "575 000"
        const priceMatch = priceText.match(/(\d{1,3}(?:[\s\u00A0]\d{3})*)/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/[\s\u00A0]/g, '')) : null;
        
        // Площадь из <span class="area">Площадь: <b>78 м²</b></span>
        const areaEl = item.querySelector('.params .area b');
        let areaText = areaEl?.textContent || '';
        // Если не нашли через b, пробуем через весь span
        if (!areaText) {
          const areaSpan = item.querySelector('.params .area');
          areaText = areaSpan?.textContent || '';
        }
        const areaMatch = areaText.match(/(\d+)\s*м/);
        const area = areaMatch ? parseInt(areaMatch[1]) : null;
        
        // Комнаты из <span class="rooms">Комнат: <b>3</b></span>
        const roomsEl = item.querySelector('.params .rooms b');
        let roomsText = roomsEl?.textContent || '';
        // Если не нашли через b, пробуем через весь span
        if (!roomsText) {
          const roomsSpan = item.querySelector('.params .rooms');
          roomsText = roomsSpan?.textContent || '';
        }
        // Адрес из заголовка <div class="title"><a>Квартира в Барселона, Испания...</a></div>
        const titleEl = item.querySelector('.title a');
        const titleText = titleEl?.textContent || '';
        
        // Проверяем, является ли это студией
        const isStudio = titleText.toLowerCase().includes('студия') || 
                        titleText.toLowerCase().includes('studio') ||
                        roomsText.toLowerCase().includes('студия') ||
                        roomsText.toLowerCase().includes('studio') ||
                        (roomsText && parseInt(roomsText) === 0);
        
        let rooms = null;
        if (isStudio) {
          rooms = 0; // Студия = 0 комнат
        } else {
          const roomsMatch = roomsText.match(/(\d+)/);
          rooms = roomsMatch ? parseInt(roomsMatch[1]) : null;
        }
        // Извлекаем адрес из заголовка (например, "Квартира в Барселона, Испания")
        let address = '';
        // Пробуем извлечь город из заголовка
        const cityMatch = titleText.match(/в\s+([^,]+)/);
        if (cityMatch) {
          address = cityMatch[1].trim();
        } else {
          // Пробуем найти город в тексте напрямую
          const cities = ['Барселона', 'Мадрид', 'Валенсия', 'Севилья', 'Малага', 'Бильбао', 'Аликанте', 'Гранада', 'Бадалона'];
          for (const city of cities) {
            if (titleText.includes(city)) {
              address = city;
              break;
            }
          }
          if (!address) {
            address = titleText.trim();
          }
        }
        
        // Изображение
        const imgEl = item.querySelector('img.thumb');
        const image = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('src')) : null;
        
        // Принимаем объект если есть ссылка и цена
        if (link && price) {
          results.push({ price, area, rooms, isStudio, address, link, image });
        }
      } catch (e) {
        console.error('Ошибка парсинга карточки:', e);
      }
    });
    
    console.log(`Извлечено объектов: ${results.length}`);
    return results;
  });
  
  console.log(`✅ Spain Real Estate: найдено ${properties.length} объектов`);
  return properties;
}

/**
 * Функция парсинга Fotocasa
 */
async function parseFotocasa(page, url) {
  console.log(`🌐 Парсим Fotocasa: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));

  const properties = await page.evaluate(() => {
    const results = [];
    const cards = document.querySelectorAll('[data-testid="property-card"], .re-CardPack, article[class*="Card"]');
    
    cards.forEach((card, index) => {
      if (index >= 20) return;
      
      try {
        // Ссылка
        const linkEl = card.querySelector('a[href*="/vivienda/"], a[href*="/inmueble/"]');
        if (!linkEl) return;
        const link = linkEl.href.startsWith('http') ? linkEl.href : `https://www.fotocasa.es${linkEl.getAttribute('href')}`;
        
        // Цена
        const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
        const priceText = priceEl?.textContent || '';
        const price = parseInt(priceText.replace(/[^\d]/g, '')) || null;
        
        // Площадь
        const areaEl = card.querySelector('[class*="surface"], [class*="area"], [class*="metros"]');
        const areaText = areaEl?.textContent || '';
        const area = parseInt(areaText.match(/(\d+)\s*m/)?.[1]) || null;
        
        // Комнаты
        const roomsEl = card.querySelector('[class*="room"], [class*="habitacion"]');
        const roomsText = roomsEl?.textContent || '';
        const rooms = parseInt(roomsText.match(/(\d+)/)?.[1]) || null;
        
        // Адрес
        const addressEl = card.querySelector('[class*="address"], [class*="location"], [class*="location"]');
        const address = addressEl?.textContent?.trim() || '';
        
        // Изображение
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

/**
 * Функция парсинга Pisos.com
 */
async function parsePisos(page, url) {
  console.log(`🌐 Парсим Pisos.com: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 3000));

  const properties = await page.evaluate(() => {
    const results = [];
    const cards = document.querySelectorAll('article[data-id], .ad-preview, [class*="ad-item"]');
    
    cards.forEach((card, index) => {
      if (index >= 20) return;
      
      try {
        const linkEl = card.querySelector('a[href*="/inmueble/"], a[href*="/vivienda/"]');
        if (!linkEl) return;
        const link = linkEl.href.startsWith('http') ? linkEl.href : `https://www.pisos.com${linkEl.getAttribute('href')}`;
        
        const priceEl = card.querySelector('[class*="price"], [data-price]');
        const priceText = priceEl?.textContent || '';
        const price = parseInt(priceText.replace(/[^\d]/g, '')) || null;
        
        const areaEl = card.querySelector('[class*="surface"], [class*="area"]');
        const areaText = areaEl?.textContent || '';
        const area = parseInt(areaText.match(/(\d+)/)?.[1]) || null;
        
        const roomsEl = card.querySelector('[class*="room"], [class*="habitacion"]');
        const roomsText = roomsEl?.textContent || '';
        const rooms = parseInt(roomsText.match(/(\d+)/)?.[1]) || null;
        
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

/**
 * Функция парсинга Idealista
 */
async function parseIdealista(page, url) {
  console.log(`🌐 Парсим Idealista: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(resolve => setTimeout(resolve, 5000));

  const properties = await page.evaluate(() => {
    const results = [];
    // Пробуем разные селекторы
    let cards = document.querySelectorAll('article.item, article[data-adid], [data-adid]');
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
        const price = priceMatch ? parseInt(priceMatch[1].replace(/[^\d]/g, '')) : null;
        
        const areaMatch = allText.match(/(\d+)\s*m²/);
        const area = areaMatch ? parseInt(areaMatch[1]) : null;
        
        const roomsMatch = allText.match(/(\d+)\s*(?:hab|room|bedroom)/i);
        const rooms = roomsMatch ? parseInt(roomsMatch[1]) : null;
        
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

/**
 * Маппинг городов для фильтрации
 */
const cityMap = {
  'madrid': ['мадрид', 'madrid'],
  'barcelona': ['барселона', 'barcelona', 'бадалона', 'badalona'],
  'valencia': ['валенсия', 'valencia'],
  'sevilla': ['севилья', 'sevilla', 'sevilla'],
  'malaga': ['малага', 'malaga', 'málaga'],
  'marbella': ['марбелья', 'marbella'],
  'bilbao': ['бильбао', 'bilbao'],
  'alicante': ['аликанте', 'alicante'],
  'granada': ['гранада', 'granada'],
  'murcia': ['мурсия', 'murcia'],
  'castellon': ['кастельон', 'castellón', 'castellon'],
  'torrevieja': ['торревьеха', 'torrevieja'],
  'benidorm': ['бенидорм', 'benidorm'],
  'denia': ['дения', 'denia', 'dénia'],
  'javea': ['хавеа', 'javea', 'xàbia'],
  'calpe': ['калпе', 'calpe', 'calp'],
  'altea': ['альтеа', 'altea'],
  'santa-pola': ['санта-пола', 'santa pola', 'santapola'],
  'villajoyosa': ['виллахойоса', 'villajoyosa', 'la villajoyosa'],
  'gandia': ['гандия', 'gandia', 'gandía'],
  'oliva': ['олива', 'oliva'],
  'piles': ['пилес', 'piles']
};

/**
 * Основная функция для расчета цены и поиска похожих объектов
 */
export async function calculatePropertyPrice({ area, rooms, city, propertyType, maxPrice, minPrice }) {
  const cityName = city.toLowerCase();
  const areaValue = parseInt(area) || 60;
  const roomsValue = rooms === 'studio' ? 'studio' : (parseInt(rooms) || 2);

  // Список сайтов для парсинга (пробуем по очереди)
  const sites = [
    {
      name: 'Spain Real Estate',
      buildUrl: (city, area, rooms) => {
        // Базовый URL для квартир - используем простой URL, фильтры можно добавить позже
        return `https://spain-real.estate/ru/property/apartments/`;
      },
      parseFunction: parseSpainRealEstate
    },
    {
      name: 'Fotocasa',
      buildUrl: (city, area, rooms) => {
        const cityMap = {
          'madrid': 'madrid',
          'barcelona': 'barcelona',
          'valencia': 'valencia',
          'sevilla': 'sevilla',
          'malaga': 'malaga',
          'bilbao': 'vizcaya',
          'alicante': 'alicante',
          'granada': 'granada'
        };
        const mappedCity = cityMap[city] || city;
        return `https://www.fotocasa.es/es/comprar/viviendas/${mappedCity}/todas-las-zonas/l/${area}-m2-${rooms}-hab?minPrice=${minPrice || ''}&maxPrice=${maxPrice || ''}`;
      },
      parseFunction: parseFotocasa
    },
    {
      name: 'Pisos.com',
      buildUrl: (city, area, rooms) => {
        return `https://www.pisos.com/venta/pisos-${city}/con-${area}-metros_${rooms}-habitaciones/`;
      },
      parseFunction: parsePisos
    },
    {
      name: 'Idealista',
      buildUrl: (city, area, rooms) => {
        return `https://www.idealista.com/venta-viviendas/${city}/con-metros_${area},habitaciones_${rooms}/`;
      },
      parseFunction: parseIdealista
    }
  ];

  let browser = null;
  let properties = [];
  let usedSite = '';

  try {
    // Запускаем браузер с stealth режимом
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
    
    // Устанавливаем реалистичные заголовки
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    await page.setViewport({ width: 1920, height: 1080 });

    // Пробуем парсить с разных сайтов по очереди
    for (const site of sites) {
      try {
        const searchUrl = site.buildUrl(cityName, areaValue, roomsValue);
        properties = await site.parseFunction(page, searchUrl);
        
        if (properties.length > 0) {
          usedSite = site.name;
          console.log(`✅ Найдено ${properties.length} объектов на ${site.name}`);
          break;
        }
      } catch (error) {
        console.error(`❌ Ошибка при парсинге ${site.name}:`, error.message);
        continue;
      }
    }

    await browser.close();
    browser = null;

    // Фильтруем объекты с валидными ценами и ссылками
    let validProperties = properties.filter(p => p.price && p.price > 0 && p.link);
    
    // ВАЖНО: Фильтруем по городу в первую очередь
    const cityVariants = cityMap[cityName] || [cityName];
    
    validProperties = validProperties.filter(p => {
      if (!p.address) return false; // Если адрес не указан, исключаем
      
      const addressLower = p.address.toLowerCase();
      // Проверяем, содержит ли адрес один из вариантов названия города
      return cityVariants.some(variant => addressLower.includes(variant.toLowerCase()));
    });
    
    console.log(`📍 После фильтрации по городу "${cityName}": ${validProperties.length} объектов`);
    
    // Фильтруем по параметрам поиска (если указаны)
    if (areaValue) {
      validProperties = validProperties.filter(p => {
        if (!p.area) return true; // Если площадь не указана, оставляем объект
        // Допускаем отклонение ±30% от запрошенной площади
        return p.area >= areaValue * 0.7 && p.area <= areaValue * 1.3;
      });
    }
    
    if (roomsValue) {
      validProperties = validProperties.filter(p => {
        if (!p.rooms) return true; // Если комнаты не указаны, оставляем объект
        
        // Если пользователь выбрал студию, показываем только студии
        if (roomsValue === 'studio') {
          return p.isStudio === true;
        }
        
        // Если в объявлении студия, но пользователь выбрал другое количество комнат - исключаем
        if (p.isStudio === true) {
          return false;
        }
        
        // Допускаем отклонение ±1 комната для обычных квартир
        return Math.abs(p.rooms - roomsValue) <= 1;
      });
    }
    
    if (minPrice) {
      const minPriceValue = parseInt(minPrice);
      validProperties = validProperties.filter(p => p.price >= minPriceValue);
    }
    
    if (maxPrice) {
      const maxPriceValue = parseInt(maxPrice);
      validProperties = validProperties.filter(p => p.price <= maxPriceValue);
    }
    
    // Если после фильтрации ничего не осталось, НЕ возвращаем объекты из других городов
    // Возвращаем пустой массив, так как пользователь запросил конкретный город
    
    // Рассчитываем рекомендуемую цену только если есть реальные объекты
    let recommendedPrice = null;
    if (validProperties.length > 0) {
      const prices = validProperties.map(p => p.price);
      recommendedPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    }

    return {
      recommendedPrice: recommendedPrice || null,
      similarProperties: validProperties.slice(0, 15),
      searchParams: {
        area: areaValue,
        rooms: roomsValue,
        city: cityName,
        propertyType: propertyType || 'apartment',
        searchLevel: validProperties.length > 0 ? 'parsed' : 'no_results',
        source: usedSite || 'none'
      },
      note: validProperties.length > 0 
        ? `Найдено ${validProperties.length} объектов на ${usedSite}.`
        : `Не удалось найти объекты с указанными параметрами. Попробуйте изменить критерии поиска.`
    };

  } catch (error) {
    // Убеждаемся, что браузер закрыт при ошибке
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Ошибка при закрытии браузера:', closeError);
      }
    }
    
    console.error('❌ Ошибка при расчете:', error);
    
    // Возвращаем пустой результат при ошибке
    return {
      recommendedPrice: null,
      similarProperties: [],
      searchParams: {
        area: parseInt(area) || null,
        rooms: rooms === 'studio' ? 'studio' : (parseInt(rooms) || null),
        city: (city || '').toLowerCase(),
        propertyType: propertyType || 'apartment',
        searchLevel: 'error',
        source: 'none'
      },
      note: `Произошла ошибка при поиске объектов. Попробуйте позже или измените параметры поиска.`
    };
  }
}

