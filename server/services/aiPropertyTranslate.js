/**
 * Перевод объявления на все языки сайта.
 * Сначала один запрос к AI (OpenRouter / активный провайдер),
 * при сбое — MyMemory, как запасной канал.
 */

import { getActiveAiProvider } from '../aiChatConfig.js';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const REQUEST_DELAY_MS = 200;
const REQUEST_TIMEOUT_MS = 15000;
const AI_TIMEOUT_MS = 45000;
const MAX_CHARS_PER_REQUEST = 400;

export const SITE_LANGUAGES = [
  { code: 'ru', name: 'Russian' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'sv', name: 'Swedish' },
];

export const SITE_LANG_CODES = SITE_LANGUAGES.map((l) => l.code);
export const TARGET_LANG_CODES = SITE_LANG_CODES.filter((code) => code !== 'ru');

export const CORE_TRANSLATION_FIELDS = [
  'title',
  'description',
  'additional_amenities',
  'location',
];

export const EXTRA_TRANSLATION_FIELDS = [
  'address',
  'city',
  'country',
  'renovation',
  'condition',
  'heating',
  'water_supply',
  'sewerage',
  'commercial_type',
  'business_hours',
  'debt_other',
];

export const ALL_TRANSLATION_FIELDS = [
  ...CORE_TRANSLATION_FIELDS,
  ...EXTRA_TRANSLATION_FIELDS,
];

const LANG_NAMES = Object.fromEntries(SITE_LANGUAGES.map((l) => [l.code, l.name]));

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimText(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function extractListingTexts(property = {}) {
  const out = {};
  for (const key of ALL_TRANSLATION_FIELDS) {
    const val = trimText(property[key]);
    if (val) out[key] = val;
  }
  return out;
}

export function splitTranslationForStore(translated = {}) {
  const core = {};
  const extra = {};
  for (const key of CORE_TRANSLATION_FIELDS) {
    core[key] = trimText(translated[key]);
  }
  for (const key of EXTRA_TRANSLATION_FIELDS) {
    const val = trimText(translated[key]);
    if (val) extra[key] = val;
  }
  return { ...core, extra };
}

export function parseExtraJson(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function detectSourceLang(texts) {
  const sample = [texts.title, texts.description, texts.location, texts.additional_amenities]
    .filter(Boolean)
    .join(' ');
  if (/[а-яё]/i.test(sample)) return 'ru';
  if (/[äöüß]/i.test(sample)) return 'de';
  if (/[àâçéèêëîïôùû]/i.test(sample)) return 'fr';
  if (/[áéíóúñ¿¡]/i.test(sample)) return 'es';
  if (/[åäö]/i.test(sample)) return 'sv';
  return 'ru';
}

async function translateChunk(chunk, sourceLang, targetLang) {
  if (!chunk || !String(chunk).trim()) return '';
  const url = `${MYMEMORY_URL}?q=${encodeURIComponent(chunk)}&langpair=${sourceLang}|${targetLang}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return chunk;
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('[translate] MyMemory request failed:', e.message);
  }
  return chunk;
}

function chunkText(text) {
  const s = String(text || '');
  if (s.length <= MAX_CHARS_PER_REQUEST) return [s];
  const chunks = [];
  let start = 0;
  while (start < s.length) {
    let end = Math.min(start + MAX_CHARS_PER_REQUEST, s.length);
    if (end < s.length) {
      const lastSpace = s.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace + 1;
    }
    chunks.push(s.slice(start, end).trim());
    start = end;
  }
  return chunks.filter((c) => c.length > 0);
}

async function translateWithMyMemory(text, sourceLang, targetLang) {
  if (!text || !String(text).trim()) return '';
  if (targetLang === sourceLang) return text;

  const chunks = chunkText(text);
  const results = [];
  for (const chunk of chunks) {
    results.push(await translateChunk(chunk, sourceLang, targetLang));
    await delay(REQUEST_DELAY_MS);
  }
  return results.join(' ');
}

function emptyResultFromSource(texts) {
  const result = {};
  for (const { code } of SITE_LANGUAGES) {
    result[code] = { ...texts };
  }
  return result;
}

function parseJsonFromModel(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeAiTranslations(parsed, texts, sourceLang) {
  if (!parsed || typeof parsed !== 'object') return null;
  const result = emptyResultFromSource(texts);
  result[sourceLang] = { ...texts };

  for (const code of TARGET_LANG_CODES) {
    const row = parsed[code];
    if (!row || typeof row !== 'object') continue;
    const merged = { ...texts };
    for (const key of ALL_TRANSLATION_FIELDS) {
      const val = trimText(row[key]);
      if (val) merged[key] = val;
    }
    result[code] = merged;
  }
  return result;
}

async function translateWithAi(texts, sourceLang) {
  const provider = getActiveAiProvider();
  if (provider.needsKey && !provider.apiKey) return null;

  const fieldSchema = {
    type: 'object',
    additionalProperties: false,
    required: ALL_TRANSLATION_FIELDS,
    properties: Object.fromEntries(ALL_TRANSLATION_FIELDS.map((key) => [key, { type: 'string' }])),
  };
  const schema = {
    name: 'property_translations',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: TARGET_LANG_CODES,
      properties: Object.fromEntries(TARGET_LANG_CODES.map((code) => [code, fieldSchema])),
    },
  };

  const system = `You translate real-estate listing copy for SellYourBrick.
Return JSON only. Translate every provided field into each target language.
Keep numbers, currency, measurements, emails, URLs, and machine codes unchanged.
Preserve meaning, tone, and paragraph breaks. Do not add marketing text.`;

  const user = JSON.stringify({
    source_language: sourceLang,
    target_languages: TARGET_LANG_CODES.map((code) => ({ code, name: LANG_NAMES[code] })),
    fields: texts,
  });

  const model =
    process.env.PROPERTY_TRANSLATE_MODEL ||
    process.env.PROPERTY_AI_MODEL ||
    provider.defaultModel;

  const headers = {
    'Content-Type': 'application/json',
    ...(provider.extraHeaders || {}),
  };
  if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;

  const body = {
    model,
    temperature: 0.1,
    max_tokens: 6000,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  if (provider.id === 'openrouter') {
    body.response_format = { type: 'json_schema', json_schema: schema };
  }

  const response = await fetch(provider.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || `AI translate ${response.status}`);
  }
  const content = data?.choices?.[0]?.message?.content;
  const parsed = parseJsonFromModel(content);
  const normalized = normalizeAiTranslations(parsed, texts, sourceLang);
  if (!normalized) throw new Error('AI translate returned unreadable JSON');
  return normalized;
}

async function translateWithMyMemoryAll(texts, sourceLang) {
  const result = emptyResultFromSource(texts);
  const keys = Object.keys(texts);
  for (const code of SITE_LANG_CODES) {
    if (code === sourceLang) {
      result[code] = { ...texts };
      continue;
    }
    const translated = {};
    for (const key of keys) {
      translated[key] = texts[key]
        ? await translateWithMyMemory(texts[key], sourceLang, code)
        : '';
    }
    result[code] = translated;
    await delay(REQUEST_DELAY_MS);
  }
  return result;
}

/**
 * Перевести все текстовые поля объявления на языки сайта.
 * @returns {Promise<Object>} { ru: { title, description, ... }, en: {...}, ... }
 */
export async function translatePropertyToAllLanguages(property) {
  const texts = extractListingTexts(property);
  if (!Object.keys(texts).length) {
    return emptyResultFromSource({});
  }

  const sourceLang = detectSourceLang(texts);
  try {
    const aiResult = await translateWithAi(texts, sourceLang);
    if (aiResult) {
      console.log(`[translate] AI translations ready for property_id=${property?.id || '?'}`);
      return aiResult;
    }
  } catch (err) {
    console.warn('[translate] AI failed, falling back to MyMemory:', err.message);
  }

  return translateWithMyMemoryAll(texts, sourceLang);
}

export async function persistPropertyTranslations(prisma, { propertyId, propertyTable, translations }) {
  const pid = Number(propertyId);
  const table = String(propertyTable);
  await prisma.property_translations.deleteMany({
    where: { property_id: pid, property_table: table },
  });

  for (const [langCode, data] of Object.entries(translations || {})) {
    const split = splitTranslationForStore(data);
    const data = {
      property_id: pid,
      property_table: table,
      lang_code: String(langCode),
      title: split.title || '',
      description: split.description || '',
      additional_amenities: split.additional_amenities || '',
      location: split.location || '',
      extra_json: Object.keys(split.extra).length ? JSON.stringify(split.extra) : null,
      created_at: new Date().toISOString(),
    };
    try {
      await prisma.property_translations.create({ data });
    } catch (err) {
      if (!/extra_json/i.test(String(err?.message || ''))) throw err;
      const { extra_json: _ignored, ...withoutExtra } = data;
      await prisma.property_translations.create({ data: withoutExtra });
    }
  }
}

export function resolveTranslationTable(property) {
  if (property?.source_table) return String(property.source_table);
  const pt = String(property?.property_type || '');
  if (pt === 'house' || pt === 'villa') return 'properties_houses';
  return 'properties_apartments';
}

export async function translateAndPersistProperty(prisma, property) {
  const table = resolveTranslationTable(property);
  const translations = await translatePropertyToAllLanguages(property);
  await persistPropertyTranslations(prisma, {
    propertyId: Number(property.id),
    propertyTable: table,
    translations,
  });
  console.log(
    `✅ Переводы сохранены для property_id=${property.id}, table=${table}, языков: ${Object.keys(translations).length}`
  );
  return { table, translations };
}
