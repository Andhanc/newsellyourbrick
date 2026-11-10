export const LISTING_LANGS = ['en', 'ru', 'de', 'es', 'fr', 'pl', 'sv']

/** UI language code used for property_translations. Unknown values fall back to English. */
export function normalizeListingLanguage(language) {
  const code = String(language || 'en')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0]
  return LISTING_LANGS.includes(code) ? code : 'en'
}
