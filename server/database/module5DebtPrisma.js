/**
 * Модуль 5: причины долга и документы по долгу — PostgreSQL через Prisma.
 */
import { getPrisma } from './prismaClient.js';



function debtReasonToPlain(r) {
  if (!r) return null;
  const o = { ...r };
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
  if (o.updated_at instanceof Date) o.updated_at = o.updated_at.toISOString();
  return o;
}

function debtDocToPlain(r) {
  if (!r) return null;
  const o = { ...r };
  if (o.created_at instanceof Date) o.created_at = o.created_at.toISOString();
  return o;
}

export const debtReasonQueries = {
  getAll: async () => {
        const prisma = getPrisma();
    const rows = await prisma.debt_reasons.findMany({
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });
    return rows.map(debtReasonToPlain);
  },

  getById: async (id) => {
        const prisma = getPrisma();
    const row = await prisma.debt_reasons.findUnique({ where: { id: Number(id) } });
    return debtReasonToPlain(row);
  },

  create: async (data) => {
        const prisma = getPrisma();
    const row = await prisma.debt_reasons.create({
      data: {
        title_ru: data.title_ru || '',
        code: data.code || null,
        sort_order: data.sort_order != null ? data.sort_order : 0,
      },
    });
    return { id: row.id, changes: 1 };
  },

  update: async (id, data) => {
        const prisma = getPrisma();
    const row = await prisma.debt_reasons.update({
      where: { id: Number(id) },
      data: {
        title_ru: data.title_ru || '',
        code: data.code ?? null,
        sort_order: data.sort_order != null ? data.sort_order : 0,
        updated_at: new Date(),
      },
    });
    return { changes: 1 };
  },

  delete: async (id) => {
        const prisma = getPrisma();
    await prisma.debt_reasons.delete({ where: { id: Number(id) } });
    return { changes: 1 };
  },
};

export const debtDocumentQueries = {
  getByProperty: async (propertyId, propertyType) => {
        const prisma = getPrisma();
    const rows = await prisma.property_debt_documents.findMany({
      where: {
        property_id: Number(propertyId),
        property_type: String(propertyType),
      },
      orderBy: { document_type: 'asc' },
    });
    return rows.map(debtDocToPlain);
  },

  insert: async (propertyId, propertyType, documentType, filePath, originalName) => {
        const prisma = getPrisma();
    const row = await prisma.property_debt_documents.create({
      data: {
        property_id: Number(propertyId),
        property_type: String(propertyType),
        document_type: String(documentType),
        file_path: String(filePath),
        original_name: originalName || null,
      },
    });
    return { lastInsertRowid: row.id, changes: 1 };
  },

  deleteByProperty: async (propertyId, propertyType) => {
        const prisma = getPrisma();
    const r = await prisma.property_debt_documents.deleteMany({
      where: {
        property_id: Number(propertyId),
        property_type: String(propertyType),
      },
    });
    return { changes: r.count };
  },
};
