/**
 * Slug persistence and lookup for property tables.
 */
import { buildPropertySlug } from '../../shared/propertySlug.js';
import { getPrisma } from './prismaClient.js';

function sourceTableForApartment() {
  return 'properties_apartments';
}

function sourceTableForHouse() {
  return 'properties_houses';
}

async function persistSlug(table, id, slug) {
  const prisma = getPrisma();
  if (table === 'properties_apartments') {
    await prisma.properties_apartments.update({ where: { id: Number(id) }, data: { slug } });
    return;
  }
  if (table === 'properties_houses') {
    await prisma.properties_houses.update({ where: { id: Number(id) }, data: { slug } });
    return;
  }
  if (table === 'properties') {
    await prisma.properties.update({ where: { id: Number(id) }, data: { slug } });
  }
}

export const propertySlugQueries = {
  /**
   * Назначить slug, если ещё нет. Не перезаписывает существующий.
   * @returns {Promise<string|null>}
   */
  ensureSlug: async ({ id, property_type, title, slug, source_table }) => {
    const existing = String(slug || '').trim();
    if (existing) return existing;

    const table = source_table || 'properties_apartments';
    const next = buildPropertySlug({ property_type, title, id });
    if (!next) return null;

    try {
      await persistSlug(table, id, next);
      return next;
    } catch (err) {
      if (String(err?.code) === 'P2002') {
        const fallback = `${next}-${Date.now().toString(36).slice(-4)}`;
        await persistSlug(table, id, fallback);
        return fallback;
      }
      throw err;
    }
  },

  getBySlug: async (slug) => {
    const s = String(slug || '').trim();
    if (!s) return null;
    if (!(process.env.DATABASE_URL || '').trim()) return null;

    try {
      const prisma = getPrisma();

      const apt = await prisma.properties_apartments.findFirst({ where: { slug: s } });
      if (apt) {
        return { row: apt, source_table: sourceTableForApartment() };
      }

      const house = await prisma.properties_houses.findFirst({ where: { slug: s } });
      if (house) {
        return { row: house, source_table: sourceTableForHouse() };
      }

      const legacy = await prisma.properties.findFirst({ where: { slug: s } });
      if (legacy) {
        return { row: legacy, source_table: 'properties' };
      }

      return null;
    } catch (err) {
      console.warn('[propertySlugQueries.getBySlug]', err?.message || err);
      return null;
    }
  },

  /** Backfill approved rows without slug. */
  backfillApproved: async () => {
    const prisma = getPrisma();
    let count = 0;

    const aptRows = await prisma.properties_apartments.findMany({
      where: { moderation_status: 'approved', slug: null },
      select: { id: true, property_type: true, title: true, slug: true },
    });
    for (const row of aptRows) {
      await propertySlugQueries.ensureSlug({
        ...row,
        source_table: sourceTableForApartment(),
      });
      count += 1;
    }

    const houseRows = await prisma.properties_houses.findMany({
      where: { moderation_status: 'approved', slug: null },
      select: { id: true, property_type: true, title: true, slug: true },
    });
    for (const row of houseRows) {
      await propertySlugQueries.ensureSlug({
        ...row,
        source_table: sourceTableForHouse(),
      });
      count += 1;
    }

    return count;
  },
};
