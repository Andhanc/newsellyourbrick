/**
 * Пакетная загрузка данных для списков недвижимости (убирает N+1 к БД).
 */
import { getPrisma } from './database/prismaClient.js';

const LIST_LANGS = new Set(['ru', 'en', 'de', 'es', 'fr', 'sv']);

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function isSupportedListLang(lang) {
  return Boolean(lang && LIST_LANGS.has(String(lang).trim().toLowerCase()));
}

export function normalizeListLang(lang) {
  return String(lang).trim().toLowerCase();
}

/**
 * property_table для property_translations (как в старых findUnique).
 * Если source_table нет (сырой ряд из Prisma), ориентируемся на property_type.
 */
export function translationPropertyTable(sourceTable, propertyType) {
  if (sourceTable != null && sourceTable !== '') {
    return String(sourceTable);
  }
  const pt = String(propertyType || '');
  if (pt === 'house' || pt === 'villa') return 'properties_houses';
  return 'properties_apartments';
}

function trMapKey(propertyId, propertyTable) {
  return `${Number(propertyId)}::${propertyTable}`;
}

/**
 * Подставляет переводы title/description/... для элементов списка одним-двумя запросами.
 * @param {Array<{ id: unknown, source_table?: string|null, title?: unknown, name?: unknown }>} props
 */
export async function mergePropertyTranslations(props, lang) {
  if (!props?.length || !isSupportedListLang(lang)) return;
  const prisma = getPrisma();
  const lc = normalizeListLang(lang);

  for (const part of chunk(props, 120)) {
    const or = part.map((p) => ({
      property_id: Number(p.id),
      property_table: translationPropertyTable(p.source_table, p.property_type),
      lang_code: lc,
    }));
    const rows = await prisma.property_translations.findMany({
      where: { OR: or },
      select: {
        property_id: true,
        property_table: true,
        title: true,
        description: true,
        additional_amenities: true,
        location: true,
      },
    });
    const byKey = new Map(rows.map((r) => [trMapKey(r.property_id, r.property_table), r]));
    for (const prop of part) {
      const table = translationPropertyTable(prop.source_table, prop.property_type);
      const tr = byKey.get(trMapKey(prop.id, table));
      if (!tr) continue;
      if (tr.title) {
        prop.title = tr.title;
        prop.name = tr.title;
      }
      if (tr.description) prop.description = tr.description;
      if (tr.additional_amenities != null) prop.additional_amenities = tr.additional_amenities;
      if (tr.location != null) prop.location = tr.location;
    }
  }
}

function listKindFromSourceTable(sourceTable, propertyType) {
  const st = String(sourceTable || '');
  if (st === 'houses' || st === 'properties_houses') return 'house';
  if (st === 'apartments' || st === 'properties_apartments') return 'apartment';
  const pt = String(propertyType || '');
  if (pt === 'house' || pt === 'villa') return 'house';
  return 'apartment';
}

/**
 * Заполняет is_reserved, reserved_until, reserved_by (как propertyQueries.isReserved, без N+1).
 * Просроченные резервы снимаются пакетом updateMany.
 * @param {Array<{ id: unknown, source_table?: string|null }>} props
 */
export async function mergeReservationFields(props) {
  if (!props?.length) return;
  const prisma = getPrisma();
  const aptIds = [];
  const houseIds = [];
  for (const p of props) {
    const id = Number(p.id);
    if (!Number.isFinite(id)) continue;
    if (listKindFromSourceTable(p.source_table, p.property_type) === 'house') houseIds.push(id);
    else aptIds.push(id);
  }
  const uniq = (arr) => [...new Set(arr)];
  const aptU = uniq(aptIds);
  const houseU = uniq(houseIds);
  const now = new Date();

  const [aptRows, houseRows] = await Promise.all([
    aptU.length
      ? prisma.properties_apartments.findMany({
          where: { id: { in: aptU } },
          select: { id: true, reserved_until: true, reserved_by: true, purchase_request_id: true },
        })
      : Promise.resolve([]),
    houseU.length
      ? prisma.properties_houses.findMany({
          where: { id: { in: houseU } },
          select: { id: true, reserved_until: true, reserved_by: true, purchase_request_id: true },
        })
      : Promise.resolve([]),
  ]);

  const expiredApt = [];
  const expiredHouse = [];
  /** @type {Map<string, { isReserved: boolean, reservedUntil: string|null, reservedBy: number|null }>} */
  const slotMap = new Map();

  const consume = (row, kind) => {
    const slot = `${kind}:${row.id}`;
    if (!row.reserved_until) {
      slotMap.set(slot, { isReserved: false, reservedUntil: null, reservedBy: null });
      return;
    }
    const reservedUntil = new Date(row.reserved_until);
    if (reservedUntil < now) {
      if (kind === 'a') expiredApt.push(row.id);
      else expiredHouse.push(row.id);
      slotMap.set(slot, { isReserved: false, reservedUntil: null, reservedBy: null });
      return;
    }
    slotMap.set(slot, {
      isReserved: true,
      reservedUntil: row.reserved_until,
      reservedBy: row.reserved_by,
    });
  };

  for (const r of aptRows) consume(r, 'a');
  for (const r of houseRows) consume(r, 'h');

  if (expiredApt.length) {
    await prisma.properties_apartments.updateMany({
      where: { id: { in: expiredApt } },
      data: { reserved_until: null, reserved_by: null, purchase_request_id: null },
    });
  }
  if (expiredHouse.length) {
    await prisma.properties_houses.updateMany({
      where: { id: { in: expiredHouse } },
      data: { reserved_until: null, reserved_by: null, purchase_request_id: null },
    });
  }

  for (const prop of props) {
    const id = Number(prop.id);
    if (!Number.isFinite(id)) continue;
    const kind = listKindFromSourceTable(prop.source_table, prop.property_type) === 'house' ? 'h' : 'a';
    const info = slotMap.get(`${kind}:${id}`) || {
      isReserved: false,
      reservedUntil: null,
      reservedBy: null,
    };
    prop.is_reserved = info.isReserved || false;
    prop.reserved_until = info.reservedUntil || null;
    prop.reserved_by = info.reservedBy ?? null;
  }
}
