export function normalizeAppLangCode(appLang = 'en') {
  return String(appLang || 'en').split(/[-_]/)[0].toLowerCase() || 'en'
}

/** JS API 2.1 script lang= */
export function toYandexMapsLang(appLang = 'en') {
  const code = normalizeAppLangCode(appLang)
  const map = {
    ru: 'ru_RU',
    en: 'en_US',
    de: 'de_DE',
    es: 'es_ES',
    fr: 'fr_FR',
    pl: 'pl_PL',
    sv: 'sv_SE',
    uk: 'uk_UA',
  }
  return map[code] || 'en_US'
}

/** Geosuggest: ISO 639-1 (es, en, ru, …) */
export function toYandexSuggestLang(appLang = 'en') {
  return normalizeAppLangCode(appLang)
}

/**
 * HTTP Geocoder официально: ru_RU, uk_UA, be_BY, en_RU, en_US, tr_TR.
 * Остальные европейские локали → en_US (иначе Яндекс часто откатывает в ru).
 */
export function toYandexGeocoderLang(appLang = 'en') {
  const code = normalizeAppLangCode(appLang)
  const map = {
    ru: 'ru_RU',
    uk: 'uk_UA',
    be: 'be_BY',
    en: 'en_US',
    tr: 'tr_TR',
    es: 'en_US',
    de: 'en_US',
    fr: 'en_US',
    pl: 'en_US',
    sv: 'en_US',
  }
  return map[code] || 'en_US'
}

export function isCyrillicLocale(appLang = 'en') {
  return ['ru', 'uk', 'be'].includes(normalizeAppLangCode(appLang))
}

export function textLooksCyrillic(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(String(value || ''))
}
