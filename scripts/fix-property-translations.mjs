/**
 * Переводит объявления и dual-write в properties_* + legacy apartments/houses.
 * Usage:
 *   DATABASE_URL=... node scripts/fix-property-translations.mjs [id ...]
 * Без id — все опубликованные квартиры/дома.
 */
import 'dotenv/config';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  translateAndPersistProperty,
  persistPropertyTranslations,
  extractListingTexts,
  applyPhrasebook,
  applyEnMarketingPhrasebook,
  detectSourceLang,
  targetLangCodesFor,
  SITE_LANG_CODES,
  isUntranslatedTarget,
} from '../server/services/aiPropertyTranslate.js';

const ids = process.argv.slice(2).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function loadApartment(id) {
  const row = await prisma.properties_apartments.findUnique({ where: { id } });
  if (!row) return null;
  return { ...row, source_table: 'properties_apartments', property_type: 'apartment' };
}

async function loadHouse(id) {
  const row = await prisma.properties_houses.findUnique({ where: { id } });
  if (!row) return null;
  return { ...row, source_table: 'properties_houses', property_type: 'house' };
}

async function listTargets() {
  if (ids.length) {
    const out = [];
    for (const id of ids) {
      const a = await loadApartment(id);
      if (a) out.push(a);
      else {
        const h = await loadHouse(id);
        if (h) out.push(h);
      }
    }
    return out;
  }
  const [apts, houses] = await Promise.all([
    prisma.properties_apartments.findMany({
      where: { OR: [{ status: 'approved' }, { moderation_status: 'approved' }, { is_approved: true }] },
      take: 200,
    }).catch(() => prisma.properties_apartments.findMany({ take: 200 })),
    prisma.properties_houses.findMany({ take: 200 }).catch(() => []),
  ]);
  return [
    ...apts.map((row) => ({ ...row, source_table: 'properties_apartments', property_type: 'apartment' })),
    ...houses.map((row) => ({ ...row, source_table: 'properties_houses', property_type: 'house' })),
  ];
}

/** Если AI/MyMemory недоступны — сразу phrasebook + persist. */
async function forcePhrasebookPersist(property) {
  const texts = extractListingTexts(property);
  const sourceLang = detectSourceLang(texts);
  const translations = { [sourceLang]: { ...texts } };
  for (const code of targetLangCodesFor(sourceLang)) {
    const translated = {};
    for (const [key, value] of Object.entries(texts)) {
      let next = applyPhrasebook(value, code);
      if (sourceLang === 'en' || !/[а-яё]/i.test(String(value || ''))) {
        next = applyEnMarketingPhrasebook(next, code);
      }
      translated[key] = next;
    }
    translations[code] = translated;
  }
  for (const code of SITE_LANG_CODES) {
    if (!translations[code]) translations[code] = { ...texts };
  }
  await persistPropertyTranslations(prisma, {
    propertyId: Number(property.id),
    propertyTable: property.source_table,
    translations,
  });
  return translations;
}

/** True if stored target rows are still copies of the source title. */
async function hasStaleTranslations(property) {
  const texts = extractListingTexts(property);
  const sourceLang = detectSourceLang(texts);
  const rows = await prisma.property_translations.findMany({
    where: {
      property_id: Number(property.id),
      property_table: { in: [property.source_table, property.source_table === 'properties_apartments' ? 'apartments' : 'houses'] },
    },
    select: { lang_code: true, title: true, description: true },
  });
  if (!rows.length) return true;
  const byLang = Object.fromEntries(rows.map((r) => [r.lang_code, r]));
  for (const code of targetLangCodesFor(sourceLang)) {
    const row = byLang[code];
    if (!row) return true;
    if (isUntranslatedTarget(texts, row, code, sourceLang)) return true;
  }
  return false;
}

async function dualWriteExistingAliases() {
  const rows = await prisma.property_translations.findMany({
    where: { property_table: { in: ['properties_apartments', 'properties_houses'] } },
  });
  let created = 0;
  for (const row of rows) {
    const alias = row.property_table === 'properties_apartments' ? 'apartments' : 'houses';
    const existing = await prisma.property_translations.findFirst({
      where: {
        property_id: row.property_id,
        property_table: alias,
        lang_code: row.lang_code,
      },
    });
    if (existing) continue;
    const data = {
      property_id: row.property_id,
      property_table: alias,
      lang_code: row.lang_code,
      title: row.title,
      description: row.description,
      additional_amenities: row.additional_amenities,
      location: row.location,
      created_at: new Date().toISOString(),
    };
    if (row.extra_json != null) data.extra_json = row.extra_json;
    try {
      await prisma.property_translations.create({ data });
      created += 1;
    } catch (err) {
      if (/extra_json/i.test(String(err?.message || ''))) {
        const { extra_json: _x, ...without } = data;
        await prisma.property_translations.create({ data: without });
        created += 1;
      } else {
        throw err;
      }
    }
  }
  return created;
}

async function main() {
  const mode = process.env.TRANSLATE_MODE || 'auto'; // auto | phrasebook | aliases-only
  if (mode === 'aliases-only') {
    const created = await dualWriteExistingAliases();
    console.log(`aliases created: ${created}`);
    return;
  }

  const targets = await listTargets();
  console.log(`targets: ${targets.map((t) => `${t.source_table}:${t.id}`).join(', ') || '(none)'}`);

  const forceAll = process.env.TRANSLATE_FORCE === '1' || ids.length > 0;
  for (const property of targets) {
    try {
      if (!forceAll && !(await hasStaleTranslations(property))) {
        console.log(`skip fresh ${property.id}`);
        continue;
      }
      if (mode === 'phrasebook') {
        await forcePhrasebookPersist(property);
        console.log(`phrasebook ok ${property.id}`);
      } else {
        try {
          await translateAndPersistProperty(prisma, property);
          console.log(`auto ok ${property.id}`);
        } catch (err) {
          console.warn(`auto failed ${property.id}: ${err.message}; phrasebook`);
          await forcePhrasebookPersist(property);
          console.log(`phrasebook ok ${property.id}`);
        }
      }
    } catch (err) {
      console.error(`fail ${property.id}:`, err.message);
    }
  }

  const created = await dualWriteExistingAliases();
  console.log(`aliases ensured, new rows: ${created}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
  });
