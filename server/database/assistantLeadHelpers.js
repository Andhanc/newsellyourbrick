/**
 * Логика оценки лидов умного помощника (общая для серверных Prisma-модулей).
 */

export const LEAD_RANK = { hot: 3, warm: 2, cold: 1 };

/**
 * Вычисление типа лида по сообщениям и предпочтениям
 * hot — горячий (обсуждал цену/бюджет, много сообщений, готов к контакту)
 * warm — тёплый (уточнял параметры, есть предпочтения)
 * cold — холодный (мало сообщений, общие вопросы)
 */
export function computeLeadType(messages, preferences) {
  const msgList = Array.isArray(messages) ? messages : (messages ? JSON.parse(messages || '[]') : []);
  const prefs = typeof preferences === 'object' ? preferences : (preferences ? JSON.parse(preferences || '{}') : {});
  if (prefs.managerContactRequested || prefs.preferredContact) return 'hot';
  const userMessages = msgList.filter(m => m.sender === 'user').map(m => (m.text || '').toLowerCase()).join(' ');
  const hasBudget = !!(prefs.budget || /бюджет|цена|евро|€|euro|стоимость|сколько стоит/i.test(userMessages));
  const hasContactIntent = /контакт|телефон|позвонить|почта|email|связь|связаться/i.test(userMessages);
  const hasLocation = !!(prefs.location || prefs.region || /испани|дубай|барселон|мадрид|оаэ|страна|регион|город/i.test(userMessages));
  const hasPropertyType = !!(prefs.propertyType || /квартир|дом|апартамент|вилл|недвижимость/i.test(userMessages));
  const count = msgList.length;

  if (count >= 8 || (hasBudget && (hasContactIntent || count >= 6))) return 'hot';
  if (count >= 4 || hasBudget || hasLocation || hasPropertyType) return 'warm';
  return 'cold';
}

/** Берём более «тёплый» тип, чтобы синхронизация с сайта не затирала оценку из WhatsApp-бота */
export function mergeLeadTypes(a, b) {
  const ra = LEAD_RANK[a] || 0;
  const rb = LEAD_RANK[b] || 0;
  const best = ra >= rb ? a : b;
  return LEAD_RANK[best] ? best : (b || a || 'cold');
}

/**
 * Формирование краткой выжимки по диалогу и предпочтениям
 */
export function buildSummary(messages, preferences) {
  const prefs = typeof preferences === 'object' ? preferences : (preferences ? JSON.parse(preferences || '{}') : {});
  const msgList = Array.isArray(messages) ? messages : (messages ? JSON.parse(messages || '[]') : []);
  const parts = [];

  if (prefs.purpose) parts.push(`Purpose: ${prefs.purpose}`);
  if (prefs.budget) parts.push(`Budget: ${prefs.budget}`);
  if (prefs.location) parts.push(`Region/location: ${prefs.location}`);
  if (prefs.propertyType) parts.push(`Property type: ${prefs.propertyType}`);
  if (prefs.rooms) parts.push(`Rooms: ${prefs.rooms}`);
  if (prefs.area) parts.push(`Area: ${prefs.area}`);
  if (prefs.other) parts.push(`Other: ${prefs.other}`);
  if (prefs.managerContactRequested || prefs.preferredContact) {
    const method = { phone: 'phone', email: 'email', whatsapp: 'WhatsApp' }[prefs.preferredContact];
    parts.push(method
      ? `Manager contact request; preferred channel: ${method}.`
      : 'Manager contact request (channel to be confirmed).');
  }

  const userTexts = msgList.filter(m => m.sender === 'user').map(m => m.text || '');
  if (userTexts.some(t => /цена|бюджет|евро|стоимость/i.test(t))) parts.push('Reached price discussion.');
  if (userTexts.some(t => /квартир|дом|апартамент|объект/i.test(t))) parts.push('Clarified property type.');
  if (userTexts.some(t => /испани|дубай|барселон|оаэ|страна|регион/i.test(t))) parts.push('Clarified region/country.');

  return parts.length ? parts.join(' ') : 'Chat with the bot without highlighted preferences.';
}

export function parseAssistantLeadJsonColumn(val, fallback) {
  if (val == null || val === '') return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

/** Строка из БД → безопасные messages/preferences для API (массив / объект). */
export function normalizeAssistantLeadRow(row) {
  if (!row) return null;
  const rawMessages = parseAssistantLeadJsonColumn(row.messages, []);
  const rawPrefs = parseAssistantLeadJsonColumn(row.preferences, {});
  return {
    ...row,
    messages: Array.isArray(rawMessages) ? rawMessages : [],
    preferences: rawPrefs && typeof rawPrefs === 'object' ? rawPrefs : {}
  };
}
