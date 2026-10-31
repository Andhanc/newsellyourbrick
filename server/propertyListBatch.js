/**
 * Пакетная загрузка данных для списков недвижимости (убирает N+1 к БД).
 */
import { getPrisma } from './database/prismaClient.js';
import {
  EXTRA_TRANSLATION_FIELDS,
  applyEnMarketingPhrasebook,
  applyPhrasebook,
  detectSourceLang,
  normalizeTranslationPropertyTable,
  parseExtraJson,
  SITE_LANG_CODES,
  translationPropertyTableAliases,
} from './services/aiPropertyTranslate.js';

const LIST_LANGS = new Set(SITE_LANG_CODES);

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
 * property_table для property_translations.
 * Списки часто отдают source_table=apartments/houses — нормализуем к properties_*.
 */
export function translationPropertyTable(sourceTable, propertyType) {
  return normalizeTranslationPropertyTable(sourceTable, propertyType);
}

function trMapKey(propertyId, propertyTable) {
  return `${Number(propertyId)}::${propertyTable}`;
}

/**
 * Подставляет перевод. Если строка в БД — копия исходника (EN→fr и т.п.),
 * поднимаем phrasebook-fallback, чтобы карточки на деплое не оставались на EN.
 * @param {string} [lang]
 */
export function applyPropertyTranslationRow(prop, tr, lang) {
  if (!prop || !tr) return prop;
  const lc = lang ? String(lang).trim().toLowerCase() : '';
  const sourceTexts = {
    title: prop.title || prop.name || '',
    description: prop.description || '',
    location: prop.location || '',
    additional_amenities: prop.additional_amenities || '',
  };
  const sourceLang = detectSourceLang(sourceTexts);

  const heal = (value) => {
    if (value == null || value === '') return value;
    let next = applyPhrasebook(String(value), lc);
    if (sourceLang === 'en' || !/[а-яё]/i.test(String(value))) {
      next = applyEnMarketingPhrasebook(next, lc);
    }
    return next;
  };

  const fieldStale = (src, dst) =>
    Boolean(
      lc &&
        src &&
        dst &&
        String(src).trim() === String(dst).trim() &&
        lc !== sourceLang,
    );

  if (tr.title) {
    const title = fieldStale(sourceTexts.title, tr.title)
      ? heal(sourceTexts.title || tr.title)
      : tr.title;
    prop.title = title;
    prop.name = title;
  }
  if (tr.description) {
    prop.description = fieldStale(sourceTexts.description, tr.description)
      ? heal(sourceTexts.description || tr.description)
      : tr.description;
  }
  if (tr.additional_amenities != null) {
    prop.additional_amenities = fieldStale(
      sourceTexts.additional_amenities,
      tr.additional_amenities,
    )
      ? heal(sourceTexts.additional_amenities || tr.additional_amenities)
      : tr.additional_amenities;
  }
  if (tr.location != null) {
    // Локации часто совпадают между языками (Calle…); не считаем это stale-copy.
    prop.location = tr.location;
  }
  const extra = parseExtraJson(tr.extra_json);
  for (const key of EXTRA_TRANSLATION_FIELDS) {
    if (extra[key] != null && extra[key] !== '') prop[key] = extra[key];
  }
  return prop;
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
    const or = [];
    for (const p of part) {
      const canonical = translationPropertyTable(p.source_table, p.property_type);
      for (const property_table of translationPropertyTableAliases(canonical)) {
        or.push({
          property_id: Number(p.id),
          property_table,
          lang_code: lc,
        });
      }
    }
    const rows = await prisma.property_translations.findMany({
      where: { OR: or },
      select: {
        property_id: true,
        property_table: true,
        title: true,
        description: true,
        additional_amenities: true,
        location: true,
        extra_json: true,
      },
    });
    const byId = new Map();
    for (const r of rows) {
      const id = Number(r.property_id);
      const prev = byId.get(id);
      if (!prev) {
        byId.set(id, r);
        continue;
      }
      // Предпочитаем канонические properties_* над legacy apartments/houses
      const prevCanon = String(prev.property_table).startsWith('properties_');
      const nextCanon = String(r.property_table).startsWith('properties_');
      if (nextCanon && !prevCanon) byId.set(id, r);
    }
    for (const prop of part) {
      const tr = byId.get(Number(prop.id));
      if (!tr) {
        // Нет строки перевода — для EN-исходников всё равно локализуем title через phrasebook.
        if (lc && lc !== 'en') {
          const sourceTexts = {
            title: prop.title || prop.name || '',
            description: prop.description || '',
          };
          const sourceLang = detectSourceLang(sourceTexts);
          if (sourceLang === 'en' && sourceTexts.title) {
            const healed = applyEnMarketingPhrasebook(
              applyPhrasebook(sourceTexts.title, lc),
              lc,
            );
            if (healed && healed !== sourceTexts.title) {
              prop.title = healed;
              prop.name = healed;
            }
          }
        }
        continue;
      }
      applyPropertyTranslationRow(prop, tr, lc);
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
