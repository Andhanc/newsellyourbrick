import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, '..', 'src', 'i18n', 'locales', 'mainPage');

const SUPPORTED_LANGS = ['ru', 'en', 'de', 'fr', 'es', 'sv'];

/** @type {Map<string, Record<string, string>>} */
const cache = new Map();

function loadLocale(lang) {
  const key = SUPPORTED_LANGS.includes(lang) ? lang : 'ru';
  if (cache.has(key)) return cache.get(key);
  try {
    const raw = readFileSync(join(LOCALES_DIR, `${key}.json`), 'utf8');
    const dict = JSON.parse(raw);
    cache.set(key, dict);
    return dict;
  } catch {
    if (key !== 'ru') return loadLocale('ru');
    cache.set('ru', {});
    return {};
  }
}

function interpolate(template, vars = {}) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const v = vars[name];
    return v == null ? '' : String(v);
  });
}

/**
 * @param {string} [acceptLanguage]
 * @returns {string}
 */
export function detectSeoLang(acceptLanguage) {
  const header = String(acceptLanguage || '').toLowerCase();
  for (const lang of SUPPORTED_LANGS) {
    if (header.includes(lang)) return lang;
  }
  return 'ru';
}

/**
 * @param {string} lang
 * @returns {(key: string, opts?: { [k: string]: string | number }) => string}
 */
export function createSeoTranslator(lang) {
  const dict = loadLocale(detectSeoLang(lang));
  return (key, opts) => {
    const template = dict[key] ?? key;
    return interpolate(template, opts);
  };
}
