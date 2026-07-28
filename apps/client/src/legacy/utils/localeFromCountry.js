import i18n from '../i18n/config'

/** Коды языков i18n (см. src/i18n/config.js supportedLngs). */
export const SITE_LOCALE_CODES = ['ru', 'en', 'de', 'es', 'fr', 'sv']

const SUPPORTED = new Set(SITE_LOCALE_CODES)

/** СНГ → русский (UA — английский по продуктовому решению). */
const CIS_RUSSIAN_COUNTRY_CODES = new Set([
  'RU',
  'BY',
  'KZ',
  'KG',
  'TJ',
  'UZ',
  'AM',
  'AZ',
  'MD',
])

const COUNTRY_TO_LANG = {
  DE: 'de',
  ES: 'es',
  FR: 'fr',
  SE: 'sv',
}

/**
 * ISO 3166-1 alpha-2 → код языка сайта.
 * @param {string | null | undefined} countryCode
 * @returns {'ru' | 'en' | 'de' | 'es' | 'fr' | 'sv'}
 */
export function resolveLanguageFromCountryCode(countryCode) {
  if (!countryCode) return 'en'
  const code = String(countryCode).trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return 'en'
  if (CIS_RUSSIAN_COUNTRY_CODES.has(code)) return 'ru'
  if (COUNTRY_TO_LANG[code]) return COUNTRY_TO_LANG[code]
  return 'en'
}

/**
 * @param {string} langCode
 * @returns {Promise<string>} применённый код
 */
export async function applySiteLanguage(langCode) {
  const normalized = String(langCode || 'en').split('-')[0].toLowerCase()
  const code = SUPPORTED.has(normalized) ? normalized : 'en'
  await i18n.changeLanguage(code)
  return code
}
