/** Нативные названия языков интерфейса (как в футере) */
export const INTERFACE_LANGUAGES = [
  { code: 'ru', nativeName: 'Русский' },
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'es', nativeName: 'Español' },
  { code: 'fr', nativeName: 'Français' },
  { code: 'sv', nativeName: 'Svenska' },
]

export function getInterfaceLanguageNativeName(i18nLanguage) {
  const code = (i18nLanguage || 'ru').split('-')[0]
  return INTERFACE_LANGUAGES.find((l) => l.code === code)?.nativeName || INTERFACE_LANGUAGES[0].nativeName
}
