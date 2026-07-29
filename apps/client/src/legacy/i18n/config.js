import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ru from './locales/mainPage/ru.json'
import en from './locales/mainPage/en.json'
import de from './locales/mainPage/de.json'
import es from './locales/mainPage/es.json'
import fr from './locales/mainPage/fr.json'
import sv from './locales/mainPage/sv.json'

const SUPPORTED = ['ru', 'en', 'de', 'es', 'fr', 'sv']

const LOCALE_LOADERS = {
  ru: async () => ({ default: ru }),
  en: async () => ({ default: en }),
  de: async () => ({ default: de }),
  es: async () => ({ default: es }),
  fr: async () => ({ default: fr }),
  sv: async () => ({ default: sv }),
}

const bundleInflight = new Map()

export function normalizeAppLanguage(lng) {
  const code = String(lng || 'ru').split('-')[0].toLowerCase()
  return SUPPORTED.includes(code) ? code : 'ru'
}

function readStoredLanguage() {
  try {
    return normalizeAppLanguage(localStorage.getItem('i18nextLng'))
  } catch {
    return 'ru'
  }
}

/** Подгружает один JSON-чанк языка; повторные вызовы — no-op. */
export async function loadLanguageBundle(lng) {
  const code = normalizeAppLanguage(lng)
  if (i18n.hasResourceBundle(code, 'translation')) return code

  const existing = bundleInflight.get(code)
  if (existing) return existing

  const loader = LOCALE_LOADERS[code] || LOCALE_LOADERS.en
  const promise = loader()
    .then((mod) => {
      const data = mod.default ?? mod
      i18n.addResourceBundle(code, 'translation', data, true, true)
      bundleInflight.delete(code)
      return code
    })
    .catch((err) => {
      bundleInflight.delete(code)
      throw err
    })

  bundleInflight.set(code, promise)
  return promise
}

const initialLng = readStoredLanguage()

let initPromise = null

function initI18nOnce() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources: {},
        lng: initialLng,
        fallbackLng: {
          default: ['en'],
          ru: ['en'],
        },
        supportedLngs: SUPPORTED,
        debug: false,
        interpolation: {
          escapeValue: false,
        },
        detection: {
          order: ['localStorage', 'navigator'],
          caches: ['localStorage'],
        },
        react: {
          useSuspense: false,
        },
        partialBundledLanguages: true,
      })

    await loadLanguageBundle(initialLng)

    i18n.on('languageChanged', (lng) => {
      void loadLanguageBundle(lng)
    })

    return i18n
  })()

  return initPromise
}

/** Резолвится после загрузки только активного языка (без остальных JSON). */
export const i18nReady = initI18nOnce()

if (typeof window !== 'undefined') {
  void i18nReady
}

export default i18n
