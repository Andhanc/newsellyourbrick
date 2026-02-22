/**
 * Утилита для работы с переменными окружения
 * Поддерживает как REACT_APP_ (Create React App), так и VITE_ (Vite)
 */

/**
 * Получает переменную окружения с поддержкой обоих форматов
 * @param {string} key - Имя переменной без префикса (например, 'CLERK_PUBLISHABLE_KEY')
 * @param {string} defaultValue - Значение по умолчанию
 * @returns {string} Значение переменной окружения
 */
export const getEnv = (key, defaultValue = '') => {
  // В Vite переменные доступны через import.meta.env
  const viteKey = `VITE_${key}`
  const viteValue = import.meta.env[viteKey]
  
  // В Create React App переменные доступны через process.env
  // process.env будет определен через define в vite.config.js
  const reactKey = `REACT_APP_${key}`
  // Проверяем process.env (определен через define в vite.config.js)
  let reactValue = undefined
  try {
    // process.env определен через define в vite.config.js
    if (typeof process !== 'undefined' && process.env && process.env[reactKey]) {
      reactValue = process.env[reactKey]
    }
  } catch (e) {
    // Игнорируем ошибки, если process не определен
  }
  
  // Возвращаем первое доступное значение (приоритет REACT_APP_)
  return reactValue || viteValue || defaultValue
}

/**
 * Получает Clerk Publishable Key
 */
export const getClerkPublishableKey = () => {
  return getEnv('CLERK_PUBLISHABLE_KEY')
}

/**
 * Получает Google Client ID
 */
export const getGoogleClientId = () => {
  return getEnv('GOOGLE_CLIENT_ID')
}

/**
 * Получает API Base URL
 */
export const getApiBaseUrl = () => {
  return getEnv('API_BASE_URL', '/api')
}

/**
 * Кэш для конфигурации, загруженной через API
 */
let runtimeConfigCache = null
let configLoadPromise = null

/**
 * Загружает конфигурацию через API endpoint
 * @returns {Promise<object>} Конфигурация с EmailJS переменными
 */
export const loadRuntimeConfig = async () => {
  // Если уже загружается, возвращаем существующий промис
  if (configLoadPromise) {
    return configLoadPromise
  }
  
  // Если уже загружено, возвращаем из кэша
  if (runtimeConfigCache) {
    return runtimeConfigCache
  }
  
  // Загружаем конфигурацию
  configLoadPromise = (async () => {
    try {
      const apiBaseUrl = getApiBaseUrl()
      const response = await fetch(`${apiBaseUrl}/config`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          runtimeConfigCache = data.data
          return runtimeConfigCache
        }
      }
    } catch (error) {
      console.warn('⚠️ Не удалось загрузить конфигурацию через API:', error.message)
    }
    return null
  })()
  
  return configLoadPromise
}

/**
 * Получает EmailJS переменные
 * Сначала пытается получить из переменных окружения, затем из runtime конфигурации
 * ВАЖНО: Эта функция всегда проверяет runtime конфигурацию, если она загружена
 */
export const getEmailJsConfig = () => {
  // Сначала пытаемся получить из переменных окружения
  const envConfig = {
    serviceId: getEnv('EMAILJS_SERVICE_ID'),
    templateId: getEnv('EMAILJS_TEMPLATE_ID'),
    publicKey: getEnv('EMAILJS_PUBLIC_KEY'),
  }
  
  // Если все переменные есть, возвращаем их
  if (envConfig.serviceId && envConfig.templateId && envConfig.publicKey) {
    return envConfig
  }
  
  // Если переменных нет, пытаемся использовать runtime конфигурацию (если уже загружена)
  if (runtimeConfigCache) {
    const runtimeConfig = {
      serviceId: runtimeConfigCache.emailjsServiceId || envConfig.serviceId,
      templateId: runtimeConfigCache.emailjsTemplateId || envConfig.templateId,
      publicKey: runtimeConfigCache.emailjsPublicKey || envConfig.publicKey,
    }
    // Если runtime конфигурация полная, возвращаем её
    if (runtimeConfig.serviceId && runtimeConfig.templateId && runtimeConfig.publicKey) {
      return runtimeConfig
    }
    // Иначе возвращаем смешанную конфигурацию
    return runtimeConfig
  }
  
  // Возвращаем то, что есть (может быть пустым)
  return envConfig
}

/**
 * Проверяет, является ли режим разработки
 */
export const isDevelopment = () => {
  // В Vite используется import.meta.env.DEV
  if (import.meta.env.DEV) {
    return true
  }
  // В Create React App используется process.env.NODE_ENV
  try {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      return true
    }
  } catch (e) {
    // Игнорируем ошибки
  }
  return false
}
