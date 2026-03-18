/**
 * Серверный сервис перевода объявления на все языки сайта.
 * Использует бесплатный MyMemory Translation API (без ключа, как в translationService на клиенте).
 */

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const SOURCE_LANG = 'ru';
const REQUEST_DELAY_MS = 200;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_CHARS_PER_REQUEST = 400; // MyMemory free: 500 bytes per request

const SITE_LANGUAGES = [
  { code: 'ru', name: 'Russian' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'sv', name: 'Swedish' },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Перевести один фрагмент текста через MyMemory API.
 */
async function translateChunk(chunk, targetLang) {
  if (!chunk || !String(chunk).trim()) return '';
  const url = `${MYMEMORY_URL}?q=${encodeURIComponent(chunk)}&langpair=${SOURCE_LANG}|${targetLang}`;
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
    if (timeoutId) clearTimeout(timeoutId);
    console.warn('[translate] MyMemory request failed:', e.message);
  }
  return chunk;
}

/**
 * Разбить длинный текст на части по MAX_CHARS_PER_REQUEST (MyMemory лимит ~500 байт на запрос).
 */
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

/**
 * Перевести один текст на целевой язык (с разбиением длинных текстов).
 */
async function translateWithMyMemory(text, targetLang) {
  if (!text || !String(text).trim()) return '';
  if (targetLang === SOURCE_LANG) return text;

  const chunks = chunkText(text);
  const results = [];
  for (const chunk of chunks) {
    results.push(await translateChunk(chunk, targetLang));
    await delay(REQUEST_DELAY_MS);
  }
  return results.join(' ');
}

/**
 * Перевести объявление на все языки сайта.
 * @param {Object} property - { title, description, additional_amenities }
 * @returns {Promise<Object>} - { ru: { title, description, additional_amenities }, en: {...}, ... }
 */
async function translatePropertyToAllLanguages(property) {
  const title = String(property.title || '').trim();
  const description = String(property.description || '').trim();
  const additional_amenities = String(property.additional_amenities || '').trim();

  const result = {};

  for (const { code } of SITE_LANGUAGES) {
    const [tTitle, tDesc, tAmen] = await Promise.all([
      title ? translateWithMyMemory(title, code) : Promise.resolve(title),
      description ? translateWithMyMemory(description, code) : Promise.resolve(description),
      additional_amenities ? translateWithMyMemory(additional_amenities, code) : Promise.resolve(additional_amenities),
    ]);
    result[code] = {
      title: tTitle || title,
      description: tDesc || description,
      additional_amenities: tAmen || additional_amenities,
    };
    await delay(REQUEST_DELAY_MS);
  }

  return result;
}

export {
  translatePropertyToAllLanguages,
  SITE_LANGUAGES,
};
