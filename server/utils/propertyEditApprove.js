import {
  collectAmenityKeys,
  amenitiesKeysToJsonString,
  parseTzAmenitiesJson,
  applyFormattedPropertyAmenities,
} from './propertyAmenitiesFormat.js';

const BOOLEAN_FIELDS = new Set([
  'is_auction',
  'balcony',
  'parking',
  'elevator',
  'garage',
  'pool',
  'garden',
  'electricity',
  'internet',
  'security',
  'furniture',
  'test_drive',
]);

const NUMERIC_FIELDS = new Set([
  'price',
  'area',
  'living_area',
  'land_area',
  'auction_starting_price',
  'minimum_sale_price',
  'rooms',
  'bedrooms',
  'bathrooms',
  'floor',
  'total_floors',
  'year_built',
]);

const JSON_ARRAY_FIELDS = new Set(['photos', 'videos', 'additional_documents']);

function toBoolInt(value) {
  return value === 1 || value === true || value === '1' ? 1 : 0;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeForCompare(value, field) {
  if (value === undefined || value === null || value === '') return null;

  if (BOOLEAN_FIELDS.has(field)) {
    return toBoolInt(value);
  }

  if (NUMERIC_FIELDS.has(field)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  if (JSON_ARRAY_FIELDS.has(field)) {
    return JSON.stringify(parseJsonArray(value));
  }

  if (field === 'tz_amenities_json') {
    const keys = [...collectAmenityKeys({ tz_amenities_json: value })].sort();
    return JSON.stringify(keys);
  }

  if (field === 'tz_parameters_json') {
    try {
      const raw = typeof value === 'string' ? JSON.parse(value) : value;
      return JSON.stringify(raw ?? {});
    } catch {
      return JSON.stringify({});
    }
  }

  return String(value).trim();
}

export function fieldChanged(original, pending, field) {
  return (
    normalizeForCompare(original?.[field], field) !==
    normalizeForCompare(pending?.[field], field)
  );
}

export function pickMergedField(original, pending, field) {
  return fieldChanged(original, pending, field) ? pending[field] : original[field];
}

/** Нормализует строку БД перед слиянием (JSON-поля, tz). */
export function normalizePendingEditRow(row) {
  if (!row) return row;
  const p = { ...row };

  for (const key of JSON_ARRAY_FIELDS) {
    if (typeof p[key] === 'string') {
      try {
        p[key] = JSON.parse(p[key]);
      } catch {
        p[key] = [];
      }
    }
  }

  if (typeof p.tz_amenities_json === 'string') {
    p.tz_amenities_json = parseTzAmenitiesJson(p.tz_amenities_json);
  } else if (!Array.isArray(p.tz_amenities_json)) {
    p.tz_amenities_json = parseTzAmenitiesJson(p.tz_amenities_json);
  }

  if (typeof p.tz_parameters_json === 'string') {
    try {
      p.tz_parameters_json = JSON.parse(p.tz_parameters_json);
    } catch {
      p.tz_parameters_json = {};
    }
  }

  if (typeof p.amenities === 'string') {
    try {
      p.amenities = JSON.parse(p.amenities);
    } catch {
      p.amenities = [];
    }
  }

  return p;
}

function pickPendingFirst(pending, original, field) {
  if (Object.prototype.hasOwnProperty.call(pending, field)) {
    const v = pending[field];
    if (v !== undefined) return v;
  }
  return original?.[field];
}

function stringifyTzParameters(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/**
 * Даты аукциона при одобрении редактирования: старт не сдвигаем, конец — только если пользователь менял.
 */
export function resolveAuctionDatesOnEditApprove(pending, original) {
  const isAuction =
    pending?.is_auction === 1 ||
    pending?.is_auction === '1' ||
    pending?.is_auction === true ||
    original?.is_auction === 1 ||
    original?.is_auction === '1' ||
    original?.is_auction === true;

  if (!isAuction) {
    return {
      isAuction: false,
      finalAuctionStartDate: original?.auction_start_date ?? null,
      finalAuctionEndDate: original?.auction_end_date ?? null,
    };
  }

  const normalizeDate = (date) => {
    if (!date) return null;
    return String(date).trim() || null;
  };

  const newStartDate = normalizeDate(pending?.auction_start_date);
  const newEndDate = normalizeDate(pending?.auction_end_date);
  const oldStartDate = normalizeDate(original?.auction_start_date);
  const oldEndDate = normalizeDate(original?.auction_end_date);

  const startDateChanged = newStartDate && newStartDate !== oldStartDate;
  const endDateChanged = newEndDate && newEndDate !== oldEndDate;
  const datesChanged = startDateChanged || endDateChanged;

  let finalAuctionEndDate = pending?.auction_end_date;
  const finalAuctionStartDate = original?.auction_start_date ?? null;

  if (!datesChanged || !newStartDate || !newEndDate) {
    finalAuctionEndDate = original?.auction_end_date ?? null;
  }

  return {
    isAuction: true,
    finalAuctionStartDate,
    finalAuctionEndDate,
  };
}

function resolvePrivateClubOnly(original, privateClubOnly) {
  if (privateClubOnly) return 1;
  return toBoolInt(original?.private_club_only);
}

/** Prisma ожидает JSON-строки; убираем undefined. */
export function sanitizePropertyPatchForPrisma(patch) {
  const out = { ...patch };
  for (const key of ['photos', 'videos', 'additional_documents', 'amenities']) {
    if (Array.isArray(out[key])) {
      out[key] = JSON.stringify(out[key]);
    }
  }
  if (out.coordinates != null && typeof out.coordinates !== 'string') {
    out.coordinates = JSON.stringify(out.coordinates);
  }
  Object.keys(out).forEach((k) => {
    if (out[k] === undefined) delete out[k];
  });
  return out;
}

/**
 * PATCH для оригинала: полный снимок из черновика (pending), кроме таймеров, резервов и ставок.
 */
export function buildEditApprovalUpdateData({ original, pending, privateClubOnly = false }) {
  const pendingNorm = normalizePendingEditRow(pending);
  const originalNorm = normalizePendingEditRow(original);

  const { isAuction, finalAuctionStartDate, finalAuctionEndDate } =
    resolveAuctionDatesOnEditApprove(pendingNorm, originalNorm);

  const pick = (field) => pickPendingFirst(pendingNorm, originalNorm, field);

  const editAmenityKeys = collectAmenityKeys(pendingNorm);
  const fromPendingTz = parseTzAmenitiesJson(pendingNorm.tz_amenities_json);
  const editTzAmenities = fromPendingTz.length > 0 ? fromPendingTz : editAmenityKeys;
  const amenityFlags = applyFormattedPropertyAmenities({
    property_type: pick('property_type') ?? originalNorm.property_type,
    amenities: editAmenityKeys,
    tz_amenities_json: editTzAmenities,
  });

  const commonUpdateData = {
    property_type: pick('property_type') ?? originalNorm.property_type,
    title: pick('title'),
    description: pick('description'),
    price: pick('price'),
    currency: pick('currency'),
    is_auction: fieldChanged(originalNorm, pendingNorm, 'is_auction')
      ? toBoolInt(pendingNorm.is_auction)
      : toBoolInt(originalNorm.is_auction),
    auction_start_date: isAuction ? finalAuctionStartDate : null,
    auction_end_date: isAuction ? finalAuctionEndDate : null,
    auction_starting_price: pick('auction_starting_price'),
    minimum_sale_price: pick('minimum_sale_price'),
    area: pick('area'),
    living_area: pick('living_area') ?? null,
    building_type: pick('building_type') ?? null,
    bathrooms: pick('bathrooms'),
    year_built: pick('year_built'),
    location: pick('location'),
    address: pick('address') ?? null,
    apartment: pick('apartment') ?? null,
    country: pick('country') ?? null,
    city: pick('city') ?? null,
    coordinates: pick('coordinates') ?? null,
    parking: amenityFlags.parking ?? 0,
    renovation: pick('renovation'),
    condition: pick('condition'),
    heating: pick('heating'),
    water_supply: pick('water_supply'),
    sewerage: pick('sewerage'),
    electricity: amenityFlags.electricity ?? 0,
    internet: amenityFlags.internet ?? 0,
    security: amenityFlags.security ?? 0,
    furniture: amenityFlags.furniture ?? 0,
    photos: pick('photos'),
    videos: pick('videos'),
    additional_documents: pick('additional_documents'),
    additional_amenities: pick('additional_amenities') ?? null,
    tz_amenities_json: JSON.stringify(editTzAmenities),
    tz_parameters_json: stringifyTzParameters(pick('tz_parameters_json')),
    ownership_document: pick('ownership_document'),
    no_debts_document: pick('no_debts_document'),
    test_drive: fieldChanged(originalNorm, pendingNorm, 'test_drive')
      ? toBoolInt(pendingNorm.test_drive)
      : toBoolInt(originalNorm.test_drive),
    test_drive_data: pick('test_drive_data'),
    private_club_only: resolvePrivateClubOnly(originalNorm, privateClubOnly),
    moderation_status: 'approved',
    rejection_reason: null,
    updated_at: new Date().toISOString(),
    test_timer_end_date: originalNorm.test_timer_end_date ?? null,
    test_timer_duration: originalNorm.test_timer_duration ?? null,
    user_id: originalNorm.user_id,
    reserved_until: originalNorm.reserved_until ?? null,
    reserved_by: originalNorm.reserved_by ?? null,
    purchase_request_id: originalNorm.purchase_request_id ?? null,
    buy_now_winner_user_id: originalNorm.buy_now_winner_user_id ?? null,
    buy_now_completed_at: originalNorm.buy_now_completed_at ?? null,
    is_shared_ownership: originalNorm.is_shared_ownership ?? 0,
    total_shares: originalNorm.total_shares ?? null,
    shares_sold: originalNorm.shares_sold ?? 0,
  };

  const apartmentOnlyUpdateData = {
    rooms: pick('rooms'),
    floor: pick('floor'),
    total_floors: pick('total_floors') ?? null,
    balcony: amenityFlags.balcony ?? 0,
    elevator: amenityFlags.elevator ?? 0,
    commercial_type: pick('commercial_type'),
    business_hours: pick('business_hours'),
    amenities: amenitiesKeysToJsonString(editAmenityKeys),
  };

  const houseOnlyUpdateData = {
    land_area: pick('land_area'),
    bedrooms: pick('bedrooms'),
    floors:
      pick('total_floors') ??
      pick('floors') ??
      originalNorm.floors ??
      originalNorm.total_floors ??
      null,
    garage: amenityFlags.garage ?? 0,
    pool: amenityFlags.pool ?? 0,
    garden: amenityFlags.garden ?? 0,
    amenities: amenitiesKeysToJsonString(editAmenityKeys),
  };

  return {
    commonUpdateData: sanitizePropertyPatchForPrisma(commonUpdateData),
    apartmentOnlyUpdateData: sanitizePropertyPatchForPrisma(apartmentOnlyUpdateData),
    houseOnlyUpdateData: sanitizePropertyPatchForPrisma(houseOnlyUpdateData),
  };
}

export async function resolveOriginalPropertyForEdit(propertyQueries, originalPropertyId, hintType = null) {
  if (hintType) {
    const found = await propertyQueries.getById(originalPropertyId, hintType);
    if (found) return found;
  }
  for (const t of ['apartment', 'commercial', 'house', 'villa']) {
    const found = await propertyQueries.getById(originalPropertyId, t);
    if (found) return found;
  }
  return propertyQueries.getById(originalPropertyId);
}

/**
 * Куда писать одобрённые правки: apartment | house | legacy | conflict.
 * При совпадении numeric id в двух таблицах — ориентируемся на property_type / source_table.
 */
export function resolveEditTargetFromProperty(originalProperty, propertyTypeHint = null) {
  const pt = String(propertyTypeHint || originalProperty?.property_type || '').toLowerCase();
  if (pt === 'house' || pt === 'villa') return 'house';
  if (pt === 'apartment' || pt === 'commercial') return 'apartment';

  const sourceTable = String(originalProperty?.source_table || '').toLowerCase();
  if (sourceTable === 'properties_houses' || sourceTable === 'houses') return 'house';
  if (sourceTable === 'properties_apartments' || sourceTable === 'apartments') return 'apartment';
  if (sourceTable === 'properties') return 'legacy';

  return null;
}

export async function resolveEditApprovalTargetTable(
  prisma,
  originalPropertyId,
  propertyTypeHint = null,
  originalProperty = null
) {
  const fromOriginal = resolveEditTargetFromProperty(originalProperty, propertyTypeHint);
  if (fromOriginal) return fromOriginal;

  const nid = Number(originalPropertyId);
  if (!Number.isFinite(nid)) return 'legacy';

  const pt = String(propertyTypeHint || '').toLowerCase();

  const [aptRow, houseRow] = await Promise.all([
    prisma.properties_apartments.findUnique({ where: { id: nid }, select: { id: true, property_type: true } }),
    prisma.properties_houses.findUnique({ where: { id: nid }, select: { id: true, property_type: true } }),
  ]);

  if (aptRow && houseRow) {
    if (pt === 'apartment' || pt === 'commercial') return 'apartment';
    if (pt === 'house' || pt === 'villa') return 'house';
    const aptPt = String(aptRow.property_type || '').toLowerCase();
    const housePt = String(houseRow.property_type || '').toLowerCase();
    if (
      (aptPt === 'apartment' || aptPt === 'commercial') &&
      housePt !== 'house' &&
      housePt !== 'villa'
    ) {
      return 'apartment';
    }
    if (
      (housePt === 'house' || housePt === 'villa') &&
      aptPt !== 'apartment' &&
      aptPt !== 'commercial'
    ) {
      return 'house';
    }
    return 'conflict';
  }
  if (aptRow) return 'apartment';
  if (houseRow) return 'house';
  return 'legacy';
}
