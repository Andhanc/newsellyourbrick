import i18n from '../i18n/config'

/** Коды языков i18n (см. src/i18n/config.js supportedLngs). */
export const SITE_LOCALE_CODES = ['ru', 'en', 'de', 'es', 'fr', 'sv']

const SUPPORTED = new Set(SITE_LOCALE_CODES)

/**
 * ISO 3166-1 alpha-2 → код языка сайта.
 * Default site language is English; geo is not used to force Russian on first visit.
 * @param {string | null | undefined} countryCode
 * @returns {'en'}
 */
export function resolveLanguageFromCountryCode(countryCode) {
  void countryCode
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
