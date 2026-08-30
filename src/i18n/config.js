import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import ru from './locales/mainPage/ru.json'
import en from './locales/mainPage/en.json'
import de from './locales/mainPage/de.json'
import es from './locales/mainPage/es.json'
import fr from './locales/mainPage/fr.json'
import pl from './locales/mainPage/pl.json'
import sv from './locales/mainPage/sv.json'

export const DEFAULT_APP_LANGUAGE = 'en'

const SUPPORTED = ['en', 'ru', 'de', 'es', 'fr', 'pl', 'sv']

const LOCALE_LOADERS = {
  ru: async () => ({ default: ru }),
  en: async () => ({ default: en }),
  de: async () => ({ default: de }),
  es: async () => ({ default: es }),
  fr: async () => ({ default: fr }),
  pl: async () => ({ default: pl }),
  sv: async () => ({ default: sv }),
}

const bundleInflight = new Map()

export function normalizeAppLanguage(lng) {
  const code = String(lng || DEFAULT_APP_LANGUAGE).split('-')[0].toLowerCase()
  return SUPPORTED.includes(code) ? code : DEFAULT_APP_LANGUAGE
}

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem('i18nextLng')
    if (!stored) return DEFAULT_APP_LANGUAGE
    return normalizeAppLanguage(stored)
  } catch {
    return DEFAULT_APP_LANGUAGE
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
    // Load the active locale before init so first paint never flashes raw keys
    // (e.g. SoftLaunch «Пока недоступно» mounts immediately).
    // Always preload English too — fallbackLng only works if the fallback bundle is present.
    const initialMod = await (LOCALE_LOADERS[initialLng] || LOCALE_LOADERS.en)()
    const initialData = initialMod.default ?? initialMod
    const resources = {
      [initialLng]: { translation: initialData },
    }
    if (initialLng !== 'en') {
      const enMod = await LOCALE_LOADERS.en()
      resources.en = { translation: enMod.default ?? enMod }
    }

    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
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
          // Only honor an explicit user choice; first visit stays on DEFAULT_APP_LANGUAGE.
          order: ['localStorage'],
          caches: ['localStorage'],
        },
        react: {
          useSuspense: false,
        },
        partialBundledLanguages: true,
      })

    // Mark as loaded for loadLanguageBundle() short-circuit
    if (!i18n.hasResourceBundle(initialLng, 'translation')) {
      i18n.addResourceBundle(initialLng, 'translation', initialData, true, true)
    }
    if (resources.en && !i18n.hasResourceBundle('en', 'translation')) {
      i18n.addResourceBundle('en', 'translation', resources.en.translation, true, true)
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = initialLng
    }

    // Preload next language as soon as it changes (avoid raw-key flash)
    i18n.on('languageChanged', (lng) => {
      if (typeof document !== 'undefined') {
        document.documentElement.lang = normalizeAppLanguage(lng)
      }
      void loadLanguageBundle(lng)
    })

    // Prefer loading the target bundle before language flips when callers use changeLanguage
    const originalChangeLanguage = i18n.changeLanguage.bind(i18n)
    i18n.changeLanguage = async (lng, ...rest) => {
      const code = normalizeAppLanguage(lng)
      await loadLanguageBundle(code)
      return originalChangeLanguage(code, ...rest)
    }

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
