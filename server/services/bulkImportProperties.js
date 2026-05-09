/**
 * Парсинг Excel/CSV для массового добавления объектов недвижимости.
 * Поддерживаются типы: apartment, house, villa, commercial.
 */

import XLSX from 'xlsx';

// Маппинг заголовков (русские и английские) на внутренние имена полей
const HEADER_MAP = {
  'тип_объекта': 'property_type',
  'property_type': 'property_type',
  'тип': 'property_type',

  'название': 'title',
  'title': 'title',

  'описание': 'description',
  'description': 'description',

  'цена': 'price',
  'price': 'price',

  'валюта': 'currency',
  'currency': 'currency',

  'страна': 'country',
  'country': 'country',

  'город': 'city',
  'city': 'city',

  'адрес': 'address',
  'address': 'address',

  'локация': 'location',
  'location': 'location',

  'площадь': 'area',
  'area': 'area',

  'жилая_площадь': 'living_area',
  'living_area': 'living_area',

  'комнаты': 'rooms',
  'rooms': 'rooms',

  'ванные': 'bathrooms',
  'bathrooms': 'bathrooms',

  'этаж': 'floor',
  'floor': 'floor',

  'всего_этажей': 'total_floors',
  'total_floors': 'total_floors',

  'год_постройки': 'year_built',
  'year_built': 'year_built',

  'тип_здания': 'building_type',
  'building_type': 'building_type',

  'квартира': 'apartment',
  'apartment': 'apartment',
  'номер_квартиры': 'apartment',

  'спален': 'bedrooms',
  'bedrooms': 'bedrooms',

  'этажей_здания': 'floors',
  'floors': 'floors',

  'участок_м2': 'land_area',
  'land_area': 'land_area',
  'площадь_участка': 'land_area',

  'бассейн': 'pool',
  'pool': 'pool',

  'сад': 'garden',
  'garden': 'garden',

  'гараж': 'garage',
  'garage': 'garage',

  'балкон': 'balcony',
  'balcony': 'balcony',

  'парковка': 'parking',
  'parking': 'parking',

  'лифт': 'elevator',
  'elevator': 'elevator',

  'электричество': 'electricity',
  'electricity': 'electricity',

  'интернет': 'internet',
  'internet': 'internet',

  'охрана': 'security',
  'security': 'security',

  'мебель': 'furniture',
  'furniture': 'furniture',

  'ремонт': 'renovation',
  'renovation': 'renovation',

  'состояние': 'condition',
  'condition': 'condition',

  'отопление': 'heating',
  'heating': 'heating',

  'водоснабжение': 'water_supply',
  'water_supply': 'water_supply',

  'канализация': 'sewerage',
  'sewerage': 'sewerage',

  'commercial_type': 'commercial_type',
  'тип_коммерции': 'commercial_type',

  'business_hours': 'business_hours',
  'часы_работы': 'business_hours',

  'дополнительные_удобства': 'additional_amenities',
  'additional_amenities': 'additional_amenities',

  'фото': 'photos',
  'photos': 'photos',
  'photo': 'photos',
  'фотографии': 'photos',

  'видео': 'videos',
  'videos': 'videos',
  'video': 'videos',

  'аукцион': 'is_auction',
  'is_auction': 'is_auction',

  'auction_start_date': 'auction_start_date',
  'начало_аукциона': 'auction_start_date',
  'auction_end_date': 'auction_end_date',
  'конец_аукциона': 'auction_end_date',

  'auction_starting_price': 'auction_starting_price',
  'стартовая_цена_аукциона': 'auction_starting_price',

  'minimum_sale_price': 'minimum_sale_price',
  'минимальная_цена_продажи': 'minimum_sale_price',

  'sale_type': 'sale_type',
  'тип_продажи': 'sale_type',

  'is_shared_ownership': 'is_shared_ownership',
  'долевая_собственность': 'is_shared_ownership',

  'total_shares': 'total_shares',
  'всего_долей': 'total_shares',

  'is_debt': 'is_debt',
  'есть_долг': 'is_debt',

  'has_debt': 'has_debt',
  'отмечен_долг': 'has_debt',

  'debt_utilities': 'debt_utilities',
  'долг_коммунальные': 'debt_utilities',

  'debt_mortgage_pledge': 'debt_mortgage_pledge',
  'долг_ипотека': 'debt_mortgage_pledge',

  'debt_property_taxes': 'debt_property_taxes',
  'долг_налоги': 'debt_property_taxes',

  'debt_arrest': 'debt_arrest',
  'долг_арест': 'debt_arrest',

  'debt_inherited': 'debt_inherited',
  'долг_наследство': 'debt_inherited',

  'debt_third_party': 'debt_third_party',
  'долг_третьи': 'debt_third_party',

  'debt_other': 'debt_other',
  'прочее_по_долгам': 'debt_other',

  'debt_amount': 'debt_amount',
  'сумма_долга': 'debt_amount',

  'debt_severity': 'debt_severity',
  'критичность_долга': 'debt_severity',

  'coordinates': 'coordinates',
  'координаты': 'coordinates',

  'test_drive': 'test_drive',
  'тест_драйв': 'test_drive',

  'test_drive_data': 'test_drive_data',
  'данные_тест_драйва': 'test_drive_data',

  'test_drive_price_per_day': 'test_drive_price_per_day',
  'тест_драйв_цена_день': 'test_drive_price_per_day',

  'test_drive_insurance_deposit': 'test_drive_insurance_deposit',
  'тест_драйв_залог': 'test_drive_insurance_deposit',

  'moderation_status': 'moderation_status',
  'статус_модерации': 'moderation_status'
};

const VALID_TYPES = ['apartment', 'house', 'villa', 'commercial'];

/** Поля вида да/нет/1/0 для массового импорта */
const BOOLEAN_FIELD_KEYS = new Set([
  'is_auction',
  'test_drive',
  'is_shared_ownership',
  'is_debt',
  'has_debt',
  'debt_utilities',
  'debt_mortgage_pledge',
  'debt_property_taxes',
  'debt_arrest',
  'debt_inherited',
  'debt_third_party'
]);

function parseBooleanLike(val, key = '') {
  if (val === undefined || val === null || val === '') return null;
  const lower = String(val).trim().toLowerCase();
  if (
    lower === '1' ||
    lower === 'да' ||
    lower === 'yes' ||
    lower === 'true' ||
    lower === '✓' ||
    lower === '+' ||
    lower === 'y'
  )
    return 1;
  if (lower === '0' || lower === 'нет' || lower === 'no' || lower === 'false' || lower === 'n') return 0;
  return null;
}

function parseCoordinatesSafe(val) {
  if (val === undefined || val === null || val === '') return null;
  const s = String(val).trim();
  if (!s) return null;
  try {
    if (s.startsWith('[')) {
      const arr = JSON.parse(s);
      if (Array.isArray(arr) && arr.length >= 2) {
        const lat = parseFloat(arr[0]);
        const lng = parseFloat(arr[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
      }
      return null;
    }
    const parts = s.split(/[,;\s]+/).filter((p) => p.length > 0);
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }
  } catch (_) {
    return null;
  }
  return null;
}

function normalizeHeader(header) {
  if (typeof header !== 'string') return '';
  return header
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function parseValue(val, key) {
  if (val === undefined || val === null || val === '') return null;
  const s = String(val).trim();
  if (s === '') return null;

  if (
    ['price', 'area', 'living_area', 'land_area', 'auction_starting_price', 'minimum_sale_price', 'debt_amount', 'test_drive_price_per_day', 'test_drive_insurance_deposit'].includes(
      key
    )
  ) {
    const n = parseFloat(s.replace(/,/g, '.').replace(/\s/g, '').replace(/^([\d.-]+).*$/i, '$1'));
    return isNaN(n) ? null : n;
  }
  if (['rooms', 'bathrooms', 'floor', 'total_floors', 'year_built', 'bedrooms', 'floors', 'total_shares'].includes(key)) {
    const n = parseInt(s.replace(/\s/g, ''), 10);
    return isNaN(n) ? null : n;
  }
  if (BOOLEAN_FIELD_KEYS.has(key)) {
    if (val === undefined || val === null || String(val).trim() === '') return undefined;
    const b = parseBooleanLike(val, key);
    return b === null ? 0 : b;
  }
  if (['pool', 'garden', 'garage', 'balcony', 'parking', 'elevator', 'electricity', 'internet', 'security', 'furniture'].includes(key)) {
    const lower = s.toLowerCase();
    if (lower === '1' || lower === 'да' || lower === 'yes' || lower === 'true' || lower === '✓' || lower === '+' || lower === 'общий') return 1;
    return 0;
  }
  if (key === 'coordinates') {
    return s;
  }

  return s;
}

/** Разделители для списка ссылок (фото/видео) */
const LINK_SEPARATORS = /[,;\s\n]+/;

/**
 * Парсит строку с ссылками на фото в массив URL (для хранения в БД как JSON).
 * Поддерживаются разделители: запятая, точка с запятой, пробел, перенос строки.
 */
function parsePhotosFromString(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s) return null;
  const urls = s.split(LINK_SEPARATORS).map(u => u.trim()).filter(Boolean);
  return urls.length > 0 ? urls : null;
}

/**
 * Парсит строку со ссылками на видео в массив объектов { url } (формат БД).
 */
function parseVideosFromString(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s) return null;
  const urls = s.split(LINK_SEPARATORS).map(u => u.trim()).filter(Boolean);
  if (urls.length === 0) return null;
  return urls.map(url => (typeof url === 'object' && url && url.url ? url : { url: String(url) }));
}

/**
 * Парсит буфер файла (CSV или Excel) и возвращает массив объектов для вставки.
 * @param {Buffer} fileBuffer
 * @param {string} originalName - имя файла для выбора парсера
 * @returns {{ rows: Array<{ rowIndex: number, property_type: string, data: object }>, errors: Array<{ row: number, message: string }> }}
 */
export function parseBulkImportFile(fileBuffer, originalName = '') {
  const errors = [];
  const rows = [];
  const ext = (originalName || '').toLowerCase();

  let sheetData;
  try {
    if (ext.endsWith('.csv')) {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', raw: true, codepage: 65001 });
      const firstSheet = workbook.SheetNames[0];
      sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1, defval: '' });
    } else {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: false });
      const firstSheet = workbook.SheetNames[0];
      sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1, defval: '' });
    }
  } catch (e) {
    errors.push({ row: 0, message: 'Не удалось прочитать файл: ' + (e.message || 'неизвестная ошибка') });
    return { rows: [], errors };
  }

  if (!sheetData || sheetData.length < 2) {
    errors.push({ row: 0, message: 'В файле нет данных (нужна строка заголовков и хотя бы одна строка данных)' });
    return { rows: [], errors };
  }

  const headers = sheetData[0].map(h => normalizeHeader(String(h)));
  const keyByIndex = headers.map(h => HEADER_MAP[h] || null);

  for (let i = 1; i < sheetData.length; i++) {
    const rowIndex = i + 1; // 1-based для отображения пользователю
    const rawRow = sheetData[i];
    const data = {};

    for (let j = 0; j < keyByIndex.length; j++) {
      const key = keyByIndex[j];
      if (!key) continue;
      const val = rawRow[j];
      const pv = parseValue(val, key);
      if (pv !== undefined) data[key] = pv;
    }

    const propertyType = (data.property_type || '').toString().toLowerCase().trim();
    if (!propertyType) {
      errors.push({ row: rowIndex, message: 'Не указан тип объекта (тип_объекта)' });
      continue;
    }
    const titleLower = (data.title || '').toString().toLowerCase().trim();
    let normalizedType = propertyType;
    if (['квартира', 'апартамент', 'apartment'].includes(propertyType)) normalizedType = 'apartment';
    else if (['дом', 'house'].includes(propertyType)) normalizedType = 'house';
    else if (['вилла', 'villa'].includes(propertyType)) normalizedType = 'villa';
    else if (['коммерческая', 'commercial'].includes(propertyType)) normalizedType = 'commercial';
    else if (propertyType === 'жилая') {
      if (/^дом\b|\bдом\b/.test(titleLower) || titleLower.startsWith('дом ')) normalizedType = 'house';
      else if (/^вилла\b|\bвилла\b/.test(titleLower) || titleLower.startsWith('вилла ')) normalizedType = 'villa';
      else normalizedType = 'apartment';
    }

    if (!VALID_TYPES.includes(normalizedType)) {
      errors.push({ row: rowIndex, message: `Недопустимый тип объекта: ${propertyType}. Допустимы: квартира/дом/вилла/коммерческая или apartment/house/villa/commercial` });
      continue;
    }

    if (!data.title || !String(data.title).trim()) {
      errors.push({ row: rowIndex, message: 'Не указано название объекта' });
      continue;
    }

    data.property_type = normalizedType;
    rows.push({ rowIndex, property_type: normalizedType, data });
  }

  return { rows, errors };
}

/**
 * Преобразует одну распарсенную строку в объект propertyData для apartmentQueries.create / houseQueries.create.
 */
export function rowToPropertyData(rowData, userId) {
  const d = rowData.data;
  const location = d.location || [d.address, d.city, d.country].filter(Boolean).join(', ') || null;

  const photosParsed = d.photos != null ? (Array.isArray(d.photos) ? d.photos : parsePhotosFromString(d.photos)) : null;
  const videosParsed = d.videos != null ? (Array.isArray(d.videos) ? d.videos.map(v => typeof v === 'string' ? { url: v } : v) : parseVideosFromString(d.videos)) : null;

  const coordsRaw = d.coordinates != null ? d.coordinates : null;
  const coordinatesParsed =
    coordsRaw != null ? parseCoordinatesSafe(typeof coordsRaw === 'string' ? coordsRaw : JSON.stringify(coordsRaw)) : null;

  const saleTypeHint = (d.sale_type && String(d.sale_type).trim().toLowerCase()) || '';

  let isDebt = false;
  if (d.has_debt === 1 || d.has_debt === true) isDebt = true;
  if (d.is_debt === 1 || d.is_debt === true) isDebt = true;
  if (saleTypeHint === 'debt') isDebt = true;

  let isShare = false;
  if (d.is_shared_ownership === 1 || d.is_shared_ownership === true) isShare = true;
  if (saleTypeHint === 'share') isShare = true;

  let isAuctionNum = 0;
  if (d.is_auction !== undefined && d.is_auction !== null) {
    isAuctionNum = d.is_auction ? 1 : 0;
  } else if (!isDebt && !isShare && (saleTypeHint === 'auction' || saleTypeHint === '')) {
    /* по умолчанию без столбца аукцион: не включаем, явно задаётся в файле или тип auction */
    isAuctionNum = saleTypeHint === 'auction' ? 1 : 0;
  }

  let saleTypeOut = saleTypeHint || null;
  if (isDebt) saleTypeOut = 'debt';
  else if (isShare) saleTypeOut = 'share';
  else if (isAuctionNum === 1) saleTypeOut = 'auction';

  if (isShare) {
    isAuctionNum = 0;
  }
  if (isDebt && isAuctionNum !== 1) {
    isAuctionNum = 0;
  }

  let testDriveFlag = (d.test_drive === 1 || d.test_drive === true) ? 1 : 0;
  if (isShare || isDebt) testDriveFlag = 0;

  let testDriveDataOut = null;
  if (testDriveFlag === 1) {
    if (typeof d.test_drive_data === 'string' && String(d.test_drive_data).trim().startsWith('{')) {
      try {
        testDriveDataOut = JSON.parse(d.test_drive_data);
      } catch (_) {
        testDriveDataOut = null;
      }
    }
    if (
      !testDriveDataOut &&
      (d.test_drive_price_per_day != null || d.test_drive_insurance_deposit != null)
    ) {
      testDriveDataOut = {
        price_per_day: Number(d.test_drive_price_per_day) || 0,
        insurance_deposit: Number(d.test_drive_insurance_deposit) || 0
      };
    }
  }

  const base = {
    user_id: userId,
    property_type: d.property_type,
    title: String(d.title).trim(),
    description: d.description || null,
    price: d.price != null ? Number(d.price) : null,
    currency: d.currency || 'USD',
    is_auction: isAuctionNum,
    auction_start_date: d.auction_start_date ? String(d.auction_start_date).trim() || null : null,
    auction_end_date: d.auction_end_date ? String(d.auction_end_date).trim() || null : null,
    auction_starting_price: d.auction_starting_price != null ? Number(d.auction_starting_price) : null,
    minimum_sale_price: d.minimum_sale_price != null ? Number(d.minimum_sale_price) : null,
    area: d.area != null ? Number(d.area) : null,
    living_area: d.living_area != null ? Number(d.living_area) : null,
    building_type: d.building_type || null,
    rooms: d.rooms != null ? parseInt(d.rooms, 10) : null,
    bathrooms: d.bathrooms != null ? parseInt(d.bathrooms, 10) : null,
    floor: d.floor != null ? parseInt(d.floor, 10) : null,
    total_floors: d.total_floors != null ? parseInt(d.total_floors, 10) : null,
    year_built: d.year_built != null ? parseInt(d.year_built, 10) : null,
    location: location || null,
    address: d.address || null,
    apartment: d.apartment || null,
    country: d.country || null,
    city: d.city || null,
    coordinates: coordinatesParsed,
    renovation: d.renovation || null,
    condition: d.condition || null,
    heating: d.heating || null,
    water_supply: d.water_supply || null,
    sewerage: d.sewerage || null,
    commercial_type: d.commercial_type || null,
    business_hours: d.business_hours || null,
    additional_amenities: d.additional_amenities || null,
    photos: photosParsed && photosParsed.length > 0 ? photosParsed : null,
    videos: videosParsed && videosParsed.length > 0 ? videosParsed : null,
    additional_documents: null,
    ownership_document: null,
    no_debts_document: null,
    test_drive: testDriveFlag,
    test_drive_data: testDriveDataOut,
    moderation_status:
      d.moderation_status && String(d.moderation_status).trim()
        ? String(d.moderation_status).trim()
        : 'pending',
    balcony: d.balcony ? 1 : 0,
    parking: d.parking ? 1 : 0,
    elevator: d.elevator ? 1 : 0,
    electricity: d.electricity ? 1 : 0,
    internet: d.internet ? 1 : 0,
    security: d.security ? 1 : 0,
    furniture: d.furniture ? 1 : 0,
    is_shared_ownership: isShare ? 1 : 0,
    total_shares:
      isShare && d.total_shares != null ? parseInt(d.total_shares, 10) : isShare ? 100 : null,
    shares_sold: isShare ? 0 : null,
    sale_type: saleTypeOut,
    is_debt: isDebt ? 1 : 0,
    has_debt: isDebt ? 1 : 0,
    debt_utilities: d.debt_utilities ? 1 : 0,
    debt_mortgage_pledge: d.debt_mortgage_pledge ? 1 : 0,
    debt_property_taxes: d.debt_property_taxes ? 1 : 0,
    debt_arrest: d.debt_arrest ? 1 : 0,
    debt_inherited: d.debt_inherited ? 1 : 0,
    debt_third_party: d.debt_third_party ? 1 : 0,
    debt_other: d.debt_other || null,
    debt_amount: d.debt_amount != null ? Number(d.debt_amount) : null,
    debt_severity: d.debt_severity ? String(d.debt_severity).trim() : null
  };

  if (d.property_type === 'house' || d.property_type === 'villa') {
    base.land_area = d.land_area != null ? Number(d.land_area) : null;
    base.bedrooms = d.bedrooms != null ? parseInt(d.bedrooms, 10) : null;
    base.floors = d.floors != null ? parseInt(d.floors, 10) : (d.total_floors != null ? parseInt(d.total_floors, 10) : null);
    base.pool = d.pool ? 1 : 0;
    base.garden = d.garden ? 1 : 0;
    base.garage = d.garage ? 1 : 0;
  }

  return base;
}
