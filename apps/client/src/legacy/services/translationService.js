/**
 * Сервис для автоматического перевода пользовательского контента
 * Использует бесплатный MyMemory Translation API
 */

// Кэш для хранения переводов
const translationCache = new Map()

// Очередь запросов для предотвращения 429 ошибок
const requestQueue = []
let isProcessingQueue = false
const REQUEST_DELAY = 100 // Задержка между запросами в мс

// Функция для получения ключа кэша
const getCacheKey = (text, targetLang, sourceLang = 'ru') => {
  return `${sourceLang}-${targetLang}-${text}`
}

// Функция для задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Переводит текст с одного языка на другой
 * @param {string} text - Текст для перевода
 * @param {string} targetLang - Целевой язык (ru, en, de, es, fr, sv)
 * @param {string} sourceLang - Исходный язык (по умолчанию 'ru')
 * @returns {Promise<string>} - Переведенный текст
 */
export const translateText = async (text, targetLang, sourceLang = 'ru') => {
  // Если язык совпадает, возвращаем исходный текст
  if (targetLang === sourceLang || !text || text.trim() === '') {
    return text
  }

  // Проверяем кэш
  const cacheKey = getCacheKey(text, targetLang, sourceLang)
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)
  }

  try {
    // Маппинг языков для API
    const langMap = {
      ru: 'ru',
      en: 'en',
      de: 'de',
      es: 'es',
      fr: 'fr',
      sv: 'sv'
    }

    const sourceLangCode = langMap[sourceLang] || 'ru'
    const targetLangCode = langMap[targetLang] || 'en'

    // Добавляем задержку перед запросом для предотвращения 429
    await delay(REQUEST_DELAY)

    // Используем MyMemory Translation API (бесплатный, до 10000 символов в день)
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLangCode}|${targetLangCode}`
    )

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Translation API rate limit exceeded. Returning original text.')
        // Возвращаем исходный текст при превышении лимита
        return text
      }
      throw new Error(`Translation API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.responseStatus === 200 && data.responseData) {
      const translatedText = data.responseData.translatedText
      
      // Сохраняем в кэш
      translationCache.set(cacheKey, translatedText)
      
      return translatedText
    } else {
      // Если API не сработал, возвращаем исходный текст
      console.warn('Translation failed, returning original text')
      return text
    }
  } catch (error) {
    console.error('Translation error:', error)
    // В случае ошибки возвращаем исходный текст
    return text
  }
}

/**
 * Переводит объект с несколькими полями
 * @param {Object} obj - Объект для перевода
 * @param {Array<string>} fields - Массив полей для перевода
 * @param {string} targetLang - Целевой язык
 * @param {string} sourceLang - Исходный язык
 * @returns {Promise<Object>} - Объект с переведенными полями
 */
export const translateObject = async (obj, fields, targetLang, sourceLang = 'ru') => {
  if (targetLang === sourceLang) {
    return obj
  }

  const translatedObj = { ...obj }

  const translationPromises = fields.map(async (field) => {
    if (obj[field] && typeof obj[field] === 'string') {
      translatedObj[field] = await translateText(obj[field], targetLang, sourceLang)
    }
  })

  await Promise.all(translationPromises)

  return translatedObj
}

/**
 * Переводит массив объектов с задержкой между элементами
 * @param {Array<Object>} array - Массив объектов
 * @param {Array<string>} fields - Поля для перевода
 * @param {string} targetLang - Целевой язык
 * @param {string} sourceLang - Исходный язык
 * @returns {Promise<Array<Object>>} - Массив с переведенными объектами
 */
export const translateArray = async (array, fields, targetLang, sourceLang = 'ru') => {
  if (targetLang === sourceLang || !Array.isArray(array)) {
    return array
  }

  // Переводим последовательно с задержкой, чтобы избежать 429 ошибок
  const translatedArray = []
  for (let i = 0; i < array.length; i++) {
    const translated = await translateObject(array[i], fields, targetLang, sourceLang)
    translatedArray.push(translated)
    // Задержка между элементами массива
    if (i < array.length - 1) {
      await delay(REQUEST_DELAY * 2) // Увеличиваем задержку для массива
    }
  }

  return translatedArray
}

/**
 * Очищает кэш переводов
 */
export const clearTranslationCache = () => {
  translationCache.clear()
}


