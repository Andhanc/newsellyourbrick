import i18n from '../i18n/config'

const LOCALE_MAP = {
  ru: 'ru-RU',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  pl: 'pl-PL',
  sv: 'sv-SE',
}

/** BCP-47 tag for Intl number/date formatters from the active UI language. */
export function getUiIntlLocale(lang = i18n.language) {
  const code = String(lang || 'en')
    .split(/[-_]/)[0]
    .toLowerCase()
  return LOCALE_MAP[code] || LOCALE_MAP.en
}
