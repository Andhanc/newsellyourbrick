import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Переводы вынесены в отдельные файлы по языкам (только главная страница + общие ключи для футера и т.д.)
import mainPageRu from './locales/mainPage/ru.json'
import mainPageEn from './locales/mainPage/en.json'
import mainPageDe from './locales/mainPage/de.json'
import mainPageEs from './locales/mainPage/es.json'
import mainPageFr from './locales/mainPage/fr.json'
import mainPageSv from './locales/mainPage/sv.json'

const resources = {
  ru: { translation: mainPageRu },
  en: { translation: mainPageEn },
  de: { translation: mainPageDe },
  es: { translation: mainPageEs },
  fr: { translation: mainPageFr },
  sv: { translation: mainPageSv },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'en', 'de', 'es', 'fr', 'sv'],
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    react: {
      useSuspense: false
    }
  })

export default i18n
