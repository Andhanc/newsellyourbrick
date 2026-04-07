import { getPrisma } from '../database/prismaClient.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'card_number',
  'card_cvv',
  'card_type',
  'google_access_token',
  'google_refresh_token',
  'refresh_token',
  'access_token',
  'session_token',
  'api_key',
  'secret',
]);

function sanitizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const k of SENSITIVE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(out, k) && out[k] != null) {
      out[k] = '[скрыто]';
    }
  }
  return out;
}

function isSafeTableName(name) {
  return typeof name === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Полный снимок PostgreSQL (через Prisma) для зеркалирования во внешнее хранилище.
 * Пароли и платёжные поля маскируются.
 */
export async function buildDatabaseSnapshot() {
  const prisma = getPrisma();
  const models = Object.entries(prisma).filter(
    ([name, value]) =>
      isSafeTableName(name) &&
      value &&
      typeof value.findMany === 'function' &&
      typeof value.count === 'function'
  );
  const blocks = [];
  for (const [name, model] of models) {
    try {
      const rows = await model.findMany();
      blocks.push({
        table: name,
        count: rows.length,
        rows: rows.map(sanitizeRow),
      });
    } catch (e) {
      blocks.push({ table: name, count: 0, rows: [], error: e.message });
    }
  }
  blocks.sort((a, b) => a.table.localeCompare(b.table));
  return {
    version: 2,
    source: 'sellyourbrick',
    exportedAt: new Date().toISOString(),
    blocks,
  };
}
