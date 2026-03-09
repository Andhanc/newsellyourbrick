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
  'video': 'videos'
};

const VALID_TYPES = ['apartment', 'house', 'villa', 'commercial'];

function normalizeHeader(header) {
  if (typeof header !== 'string') return '';
  return header.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseValue(val, key) {
  if (val === undefined || val === null || val === '') return null;
  const s = String(val).trim();
  if (s === '') return null;

  if (['price', 'area', 'living_area', 'land_area', 'auction_starting_price'].includes(key)) {
    const n = parseFloat(s.replace(/,/g, '.').replace(/\s/g, '').replace(/^([\d.-]+).*$/i, '$1'));
    return isNaN(n) ? null : n;
  }
  if (['rooms', 'bathrooms', 'floor', 'total_floors', 'year_built', 'bedrooms', 'floors'].includes(key)) {
    const n = parseInt(s.replace(/\s/g, ''), 10);
    return isNaN(n) ? null : n;
  }
  if (['pool', 'garden', 'garage', 'balcony', 'parking', 'elevator', 'electricity', 'internet', 'security', 'furniture'].includes(key)) {
    const lower = s.toLowerCase();
    if (lower === '1' || lower === 'да' || lower === 'yes' || lower === 'true' || lower === '✓' || lower === '+' || lower === 'общий') return 1;
    return 0;
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
      data[key] = parseValue(val, key);
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

  const base = {
    user_id: userId,
    property_type: d.property_type,
    title: String(d.title).trim(),
    description: d.description || null,
    price: d.price != null ? Number(d.price) : null,
    currency: d.currency || 'USD',
    is_auction: 0,
    auction_start_date: null,
    auction_end_date: null,
    auction_starting_price: null,
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
    coordinates: null,
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
    test_drive: 0,
    test_drive_data: null,
    moderation_status: 'pending',
    balcony: d.balcony ? 1 : 0,
    parking: d.parking ? 1 : 0,
    elevator: d.elevator ? 1 : 0,
    electricity: d.electricity ? 1 : 0,
    internet: d.internet ? 1 : 0,
    security: d.security ? 1 : 0,
    furniture: d.furniture ? 1 : 0
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
