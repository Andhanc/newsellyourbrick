import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const SUPPORTED = ['ru', 'en', 'de', 'es', 'fr', 'sv']

const LOCALE_LOADERS = {
  ru: () => import('./locales/mainPage/ru.json'),
  en: () => import('./locales/mainPage/en.json'),
  de: () => import('./locales/mainPage/de.json'),
  es: () => import('./locales/mainPage/es.json'),
  fr: () => import('./locales/mainPage/fr.json'),
  sv: () => import('./locales/mainPage/sv.json'),
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
    // Load the active locale before init so first paint never flashes raw keys
    // (e.g. SoftLaunch «Пока недоступно» mounts immediately).
    const initialMod = await (LOCALE_LOADERS[initialLng] || LOCALE_LOADERS.en)()
    const initialData = initialMod.default ?? initialMod

    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources: {
          [initialLng]: { translation: initialData },
        },
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

    // Mark as loaded for loadLanguageBundle() short-circuit
    if (!i18n.hasResourceBundle(initialLng, 'translation')) {
      i18n.addResourceBundle(initialLng, 'translation', initialData, true, true)
    }

    // Preload next language as soon as it changes (avoid raw-key flash)
    i18n.on('languageChanged', (lng) => {
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
