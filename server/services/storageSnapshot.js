import { getDatabase } from '../database/database.js';

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
 * Полный снимок SQLite для зеркалирования во внешнее хранилище.
 * Пароли и платёжные поля маскируются.
 */
export function buildDatabaseSnapshot() {
  const db = getDatabase();
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    .all();

  const blocks = [];
  for (const { name } of tables) {
    if (!isSafeTableName(name)) continue;
    try {
      const rows = db.prepare(`SELECT * FROM "${name}"`).all();
      blocks.push({
        table: name,
        count: rows.length,
        rows: rows.map(sanitizeRow),
      });
    } catch (e) {
      blocks.push({ table: name, count: 0, rows: [], error: e.message });
    }
  }

  return {
    version: 1,
    source: 'sellyourbrick',
    exportedAt: new Date().toISOString(),
    blocks,
  };
}
