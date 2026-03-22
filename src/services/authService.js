/**
 * Сервис для управления авторизацией пользователей
 */

import emailjs from '@emailjs/browser'

import { getEmailJsConfig, isDevelopment, loadRuntimeConfig } from '../utils/env'
import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'

// Используем dev tunnel для API
const API_BASE_URL = getApiBaseUrlSync()

// EmailJS настройки (будут обновлены после загрузки конфигурации)
let emailJsConfig = getEmailJsConfig()
let EMAILJS_SERVICE_ID = emailJsConfig.serviceId || ''
let EMAILJS_TEMPLATE_ID = emailJsConfig.templateId || ''
let EMAILJS_PUBLIC_KEY = emailJsConfig.publicKey || ''

// Функция для обновления EmailJS конфигурации
const updateEmailJsConfig = async () => {
  // Если переменные уже есть, не загружаем через API
  if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
    return true
  }
  
  // Пытаемся загрузить конфигурацию через API
  try {
    const runtimeConfig = await loadRuntimeConfig()
    if (runtimeConfig) {
      // Обновляем конфигурацию из runtime
      const newServiceId = runtimeConfig.emailjsServiceId || EMAILJS_SERVICE_ID
      const newTemplateId = runtimeConfig.emailjsTemplateId || EMAILJS_TEMPLATE_ID
      const newPublicKey = runtimeConfig.emailjsPublicKey || EMAILJS_PUBLIC_KEY
      
      // Обновляем переменные только если они изменились
      if (newServiceId !== EMAILJS_SERVICE_ID || 
          newTemplateId !== EMAILJS_TEMPLATE_ID || 
          newPublicKey !== EMAILJS_PUBLIC_KEY) {
        EMAILJS_SERVICE_ID = newServiceId
        EMAILJS_TEMPLATE_ID = newTemplateId
        EMAILJS_PUBLIC_KEY = newPublicKey
        
        // Обновляем конфигурацию в env.js
        emailJsConfig = getEmailJsConfig()
        
        // Инициализируем EmailJS, если есть ключ
        if (EMAILJS_PUBLIC_KEY) {
          emailjs.init(EMAILJS_PUBLIC_KEY)
        }
        
        if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
          console.log('✅ EmailJS конфигурация загружена через API:', {
            serviceId: EMAILJS_SERVICE_ID.substring(0, 15) + '...',
            templateId: EMAILJS_TEMPLATE_ID,
            hasPublicKey: !!EMAILJS_PUBLIC_KEY
          })
        }
      }
      
      return EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY
    }
  } catch (error) {
    console.warn('⚠️ Не удалось загрузить EmailJS конфигурацию через API:', error.message)
  }
  
  return false
}

// Инициализация EmailJS
if (EMAILJS_PUBLIC_KEY) {
  emailjs.init(EMAILJS_PUBLIC_KEY)
} else {
  // Пытаемся загрузить конфигурацию через API при старте
  updateEmailJsConfig().catch(() => {
    // Игнорируем ошибки при загрузке
  })
  
  if (isDevelopment()) {
    console.warn('⚠️ REACT_APP_EMAILJS_PUBLIC_KEY или VITE_EMAILJS_PUBLIC_KEY не установлен в .env.local')
    console.warn('   Пытаемся загрузить через API...')
  }
}

// Диагностика в режиме разработки
if (isDevelopment()) {
  if (!EMAILJS_SERVICE_ID) {
    console.warn('⚠️ VITE_EMAILJS_SERVICE_ID не установлен в .env.local')
  }
  if (!EMAILJS_TEMPLATE_ID) {
    console.warn('⚠️ VITE_EMAILJS_TEMPLATE_ID не установлен в .env.local')
  }
  if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
    console.log('✅ EmailJS переменные загружены:', {
      serviceId: EMAILJS_SERVICE_ID.substring(0, 15) + '...',
      templateId: EMAILJS_TEMPLATE_ID,
      hasPublicKey: !!EMAILJS_PUBLIC_KEY
    })
  }
}

/**
 * Валидация пароля на клиенте
 * Проверяет наличие заглавной буквы, спецсимволов и цифр
 * @param {string} password - Пароль для проверки
 * @returns {object} - { valid: boolean, errors: string[], missing: string[], present: string[] }
 */
export function validatePassword(password) {
  const errors = []
  const missing = []
  const present = []

  // Проверка наличия заглавной буквы
  if (!/[A-ZА-Я]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну заглавную букву')
    missing.push('заглавную букву')
  } else {
    present.push('заглавную букву')
  }

  // Проверка наличия спецсимволов
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы один спецсимвол (!@#$%^&*()_+-=[]{}|;:,.<>?)')
    missing.push('спецсимвол')
  } else {
    present.push('спецсимвол')
  }

  // Проверка наличия цифры
  if (!/[0-9]/.test(password)) {
    errors.push('Пароль должен содержать хотя бы одну цифру')
    missing.push('цифру')
  } else {
    present.push('цифру')
  }

  return {
    valid: errors.length === 0,
    errors,
    missing,
    present,
    message: errors.length > 0 
      ? `Пароль не соответствует требованиям. Добавьте: ${missing.join(', ')}. ${present.length > 0 ? `Уже есть: ${present.join(', ')}.` : ''}`
      : 'Пароль соответствует всем требованиям'
  }
}

/**
 * Сохраняет информацию о пользователе в localStorage
 */
export const saveUserData = (userData, loginMethod = 'email') => {
  localStorage.setItem('isLoggedIn', 'true')
  localStorage.setItem('loginMethod', loginMethod)
  
  // Сохраняем весь объект userData для удобства доступа
  localStorage.setItem('userData', JSON.stringify(userData))
  
  // Также сохраняем отдельные поля для обратной совместимости
  if (userData.email) {
    localStorage.setItem('userEmail', userData.email)
  }
  
  if (userData.name) {
    localStorage.setItem('userName', userData.name)
  }
  
  if (userData.id) {
    localStorage.setItem('userId', String(userData.id)) // Преобразуем в строку для совместимости
  }
  
  if (userData.picture) {
    localStorage.setItem('userPicture', userData.picture)
  }
  
  if (userData.role) {
    localStorage.setItem('userRole', userData.role)
    // Если роль продавца, устанавливаем флаг isOwnerLoggedIn
    if (userData.role === 'seller' || userData.role === 'owner') {
      localStorage.setItem('isOwnerLoggedIn', 'true')
    }
  }

  if (userData.phone) {
    localStorage.setItem('userPhone', userData.phone)
  }
  
  if (userData.phoneFormatted) {
    localStorage.setItem('userPhoneFormatted', userData.phoneFormatted)
  }
  
  if (userData.country) {
    localStorage.setItem('userCountry', userData.country)
  }
  
  if (userData.countryCode) {
    localStorage.setItem('userCountryCode', userData.countryCode)
  }
  
  if (userData.countryFlag) {
    localStorage.setItem('userCountryFlag', userData.countryFlag)
  }
}

/** После OAuth ClerkAuthHandler диспатчит это событие с числовым userId из БД (кабинет продавца подгружает данные без перезагрузки). */
export const CLERK_DB_USER_SYNCED = 'app:clerk-db-user-synced'

/**
 * Ранняя подготовка localStorage до ответа API: сразу открыть кабинет по роли, без числового userId.
 * Числовой id пишется в saveUserData после sync; затем событие CLERK_DB_USER_SYNCED.
 */
export const primeClerkOAuthCabinetNavigation = (userData) => {
  if (typeof window === 'undefined' || !userData) return
  const role = userData.role === 'seller' || userData.role === 'owner' ? 'seller' : 'buyer'
  localStorage.setItem('isLoggedIn', 'true')
  localStorage.setItem('loginMethod', 'clerk')
  localStorage.setItem('userRole', role)
  if (role === 'seller') {
    localStorage.setItem('isOwnerLoggedIn', 'true')
  } else {
    localStorage.removeItem('isOwnerLoggedIn')
  }
  localStorage.removeItem('userId')
  const payload = {
    name: userData.name || '',
    email: userData.email || '',
    picture: userData.picture || '',
    id: '',
    role,
    phone: userData.phone || '',
    phoneFormatted: userData.phoneFormatted || userData.phone || ''
  }
  localStorage.setItem('userData', JSON.stringify(payload))
}

/**
 * Получает данные пользователя из localStorage
 */
export const getUserData = () => {
  // ВАЖНО: Проверяем isLoggedIn ПЕРВЫМ делом
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  
  // Если пользователь не авторизован, возвращаем пустые данные
  if (!isLoggedIn) {
    return {
      isLoggedIn: false,
      loginMethod: '',
      email: '',
      name: '',
      id: '',
      picture: '',
      role: 'client',
      phone: '',
      phoneFormatted: '',
      country: '',
      countryCode: '',
      countryFlag: ''
    }
  }
  
  // Пользователь авторизован - загружаем данные
  // Сначала пытаемся получить полный объект userData
  const savedUserData = localStorage.getItem('userData')
  if (savedUserData) {
    try {
      const parsed = JSON.parse(savedUserData)
      return {
        isLoggedIn: true,
        loginMethod: localStorage.getItem('loginMethod') || parsed.loginMethod || 'email',
        ...parsed, // Все поля из сохраненного объекта
        // Переопределяем для совместимости, если они есть в localStorage отдельно
        email: parsed.email || localStorage.getItem('userEmail') || '',
        name: parsed.name || localStorage.getItem('userName') || '',
        id: parsed.id || localStorage.getItem('userId') || '',
        picture: parsed.picture || localStorage.getItem('userPicture') || '',
        role: parsed.role || localStorage.getItem('userRole') || 'client',
        phone: parsed.phone || localStorage.getItem('userPhone') || '',
        phoneFormatted: parsed.phoneFormatted || localStorage.getItem('userPhoneFormatted') || '',
        country: parsed.country || localStorage.getItem('userCountry') || '',
        countryCode: parsed.countryCode || localStorage.getItem('userCountryCode') || '',
        countryFlag: parsed.countryFlag || localStorage.getItem('userCountryFlag') || ''
      }
    } catch (e) {
      console.warn('Ошибка при парсинге userData из localStorage:', e)
      // Продолжаем с fallback
    }
  }
  
  // Fallback: возвращаем данные из отдельных полей (обратная совместимость)
  return {
    isLoggedIn: true,
    loginMethod: localStorage.getItem('loginMethod') || 'email',
    email: localStorage.getItem('userEmail') || '',
    name: localStorage.getItem('userName') || '',
    id: localStorage.getItem('userId') || '',
    picture: localStorage.getItem('userPicture') || '',
    role: localStorage.getItem('userRole') || 'client',
    phone: localStorage.getItem('userPhone') || '',
    phoneFormatted: localStorage.getItem('userPhoneFormatted') || '',
    country: localStorage.getItem('userCountry') || '',
    countryCode: localStorage.getItem('userCountryCode') || '',
    countryFlag: localStorage.getItem('userCountryFlag') || ''
  }
}

/** Реферальная программа: ID пригласителя сохраняется при переходе по ссылке ?ref=userId */
export const getReferrerId = () => {
  try {
    const id = localStorage.getItem('referral_id')
    if (!id || !String(id).trim()) return null
    return String(id).trim()
  } catch {
    return null
  }
}

export const clearReferrerId = () => {
  try {
    localStorage.removeItem('referral_id')
  } catch {}
}

/**
 * Очищает данные пользователя из localStorage, но сохраняет админские данные
 */
export const clearUserDataWithoutAdmin = () => {
  // Сохраняем админские данные перед очисткой
  const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn')
  const adminPermissions = localStorage.getItem('adminPermissions')
  const userRole = localStorage.getItem('userRole')
  const isAdmin = isAdminLoggedIn === 'true' && userRole === 'admin'
  
  // Удаляем основной объект userData (если был сохранен)
  localStorage.removeItem('userData')
  
  // Удаляем все отдельные поля (список всех возможных ключей), кроме админских
  const keysToRemove = [
    'isLoggedIn',
    'loginMethod',
    'userEmail',
    'userName',
    'userId',
    'userPicture',
    'userRole',
    'isOwnerLoggedIn',
    'isBlocked', // Флаг блокировки пользователя
    'blockedUserId', // ID заблокированного пользователя
    'hasSeenWelcome', // Флаг просмотра приветственного модального окна
    'userPhone',
    'userPhoneFormatted',
    'userCountry',
    'userCountryCode',
    'userCountryFlag',
    'userPassword', // Для email регистрации
    // Коды верификации (для безопасности)
    'whatsappCodes',
    'emailCodes'
  ]
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })
  
  // Дополнительная проверка: удаляем все ключи, начинающиеся с 'user' и другие связанные флаги, кроме админских
  Object.keys(localStorage).forEach(key => {
    if (
      key.startsWith('user') || 
      key === 'isLoggedIn' || 
      key === 'loginMethod' || 
      key === 'isOwnerLoggedIn' ||
      key === 'isBlocked' ||
      key === 'blockedUserId' ||
      key === 'hasSeenWelcome' ||
      key.includes('Code')
    ) {
      localStorage.removeItem(key)
    }
  })
  
  // Восстанавливаем админские данные
  if (isAdmin) {
    if (isAdminLoggedIn) {
      localStorage.setItem('isAdminLoggedIn', isAdminLoggedIn)
    }
    if (adminPermissions) {
      localStorage.setItem('adminPermissions', adminPermissions)
    }
    if (userRole === 'admin') {
      localStorage.setItem('userRole', 'admin')
    }
    console.log('✅ Данные пользователя очищены из localStorage (админские данные сохранены)')
  } else {
    console.log('✅ Данные пользователя очищены из localStorage')
  }
}

/**
 * Очищает данные пользователя из localStorage
 */
export const clearUserData = () => {
  // Удаляем основной объект userData (если был сохранен)
  localStorage.removeItem('userData')
  
  // Удаляем все отдельные поля (список всех возможных ключей)
  const keysToRemove = [
    'isLoggedIn',
    'loginMethod',
    'userEmail',
    'userName',
    'userId',
    'userPicture',
    'userRole',
    'isOwnerLoggedIn',
    'isAdminLoggedIn', // Флаг входа администратора
    'adminPermissions', // Права администратора
    'isBlocked', // Флаг блокировки пользователя
    'blockedUserId', // ID заблокированного пользователя
    'hasSeenWelcome', // Флаг просмотра приветственного модального окна
    'userPhone',
    'userPhoneFormatted',
    'userCountry',
    'userCountryCode',
    'userCountryFlag',
    'userPassword', // Для email регистрации
    // Коды верификации (для безопасности)
    'whatsappCodes',
    'emailCodes'
  ]
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })
  
  // Дополнительная проверка: удаляем все ключи, начинающиеся с 'user' и другие связанные флаги
  Object.keys(localStorage).forEach(key => {
    if (
      key.startsWith('user') || 
      key === 'isLoggedIn' || 
      key === 'loginMethod' || 
      key === 'isOwnerLoggedIn' ||
      key === 'isAdminLoggedIn' ||
      key === 'adminPermissions' ||
      key === 'isBlocked' ||
      key === 'blockedUserId' ||
      key === 'hasSeenWelcome' ||
      key.includes('Code')
    ) {
      localStorage.removeItem(key)
    }
  })
  
  // Проверяем, что все важные флаги действительно удалены
  const stillLoggedIn = localStorage.getItem('isLoggedIn')
  const stillOwner = localStorage.getItem('isOwnerLoggedIn')
  const stillAdmin = localStorage.getItem('isAdminLoggedIn')
  const stillBlocked = localStorage.getItem('isBlocked')
  
  if (stillLoggedIn === 'true') {
    console.warn('⚠️ isLoggedIn все еще установлен! Принудительно удаляем...')
    localStorage.removeItem('isLoggedIn')
  }
  if (stillOwner === 'true') {
    console.warn('⚠️ isOwnerLoggedIn все еще установлен! Принудительно удаляем...')
    localStorage.removeItem('isOwnerLoggedIn')
  }
  if (stillAdmin === 'true') {
    console.warn('⚠️ isAdminLoggedIn все еще установлен! Принудительно удаляем...')
    localStorage.removeItem('isAdminLoggedIn')
    localStorage.removeItem('adminPermissions')
  }
  if (stillBlocked === 'true') {
    console.warn('⚠️ isBlocked все еще установлен! Принудительно удаляем...')
    localStorage.removeItem('isBlocked')
    localStorage.removeItem('blockedUserId')
  }
  
  console.log('✅ Все данные пользователя очищены из localStorage')
  
  // Дополнительная проверка для отладки
  if (isDevelopment()) {
    const remainingData = Object.keys(localStorage).filter(key => 
      key.startsWith('user') || 
      key === 'isLoggedIn' || 
      key === 'loginMethod' ||
      key === 'isOwnerLoggedIn' ||
      key === 'isAdminLoggedIn' ||
      key === 'adminPermissions' ||
      key === 'isBlocked' ||
      key === 'blockedUserId'
    )
    if (remainingData.length > 0) {
      console.warn('⚠️ Обнаружены оставшиеся данные после очистки:', remainingData)
    } else {
      console.log('✅ Проверка: все данные пользователя действительно удалены')
    }
  }
}

/**
 * Генерирует уникальный код верификации
 */
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Сохраняет код верификации в localStorage (временное решение)
 * В production это должно быть на backend
 */
const saveVerificationCode = (phone, code) => {
  const codes = JSON.parse(localStorage.getItem('whatsappCodes') || '{}')
  codes[phone] = {
    code,
    timestamp: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 минут
  }
  localStorage.setItem('whatsappCodes', JSON.stringify(codes))
}

/**
 * Проверяет код верификации (без удаления из localStorage)
 */
const verifyCode = (phone, code, removeOnSuccess = false) => {
  const codes = JSON.parse(localStorage.getItem('whatsappCodes') || '{}')
  const codeData = codes[phone]
  
  // Отладка в режиме разработки
  if (isDevelopment()) {
    console.log('🔍 Проверка кода WhatsApp:', {
      phone,
      code,
      savedCodes: Object.keys(codes),
      codeData: codeData ? { code: codeData.code, expiresAt: new Date(codeData.expiresAt).toLocaleString() } : null
    })
  }
  
  if (!codeData) {
    console.warn('⚠️ Код не найден для номера:', phone, 'Доступные номера:', Object.keys(codes))
    return { valid: false, error: 'Код не найден. Возможно, вы ввели код для другого номера.' }
  }
  
  if (Date.now() > codeData.expiresAt) {
    delete codes[phone]
    localStorage.setItem('whatsappCodes', JSON.stringify(codes))
    return { valid: false, error: 'Код истек. Запросите новый код.' }
  }
  
  if (codeData.code !== code) {
    console.warn('⚠️ Неверный код:', { введен: code, ожидается: codeData.code })
    return { valid: false, error: 'Неверный код' }
  }
  
  // Код верный, удаляем его только если требуется
  if (removeOnSuccess) {
    delete codes[phone]
    localStorage.setItem('whatsappCodes', JSON.stringify(codes))
  }
  
  return { valid: true }
}

/**
 * Форматирует номер телефона для WhatsApp (международный формат)
 * Поддерживает все страны мира
 * Принимает номер в формате: код_страны + номер (например: 375291234567)
 */
const formatPhoneNumber = (phone) => {
  // Удаляем все нецифровые символы
  let cleaned = phone.replace(/\D/g, '')
  
  // Если номер пустой, возвращаем как есть
  if (!cleaned) {
    return cleaned
  }
  
  // Номер уже должен быть в международном формате (с кодом страны)
  // Просто возвращаем его как есть
  // Валидация длины будет в validatePhoneNumber
  
  return cleaned
}

/**
 * Определяет страну по коду номера телефона
 */
const getCountryByPhoneCode = (phone) => {
  const digits = phone.replace(/\D/g, '')
  
  // Маппинг кодов стран (от самых длинных к коротким)
  const countryMap = {
    '375': { name: 'Беларусь', code: 'BY', flag: '🇧🇾' },
    '380': { name: 'Украина', code: 'UA', flag: '🇺🇦' },
    '971': { name: 'ОАЭ', code: 'AE', flag: '🇦🇪' },
    '7': { name: 'Россия/Казахстан', code: 'RU', flag: '🇷🇺' },
    '1': { name: 'США/Канада', code: 'US', flag: '🇺🇸' },
    '44': { name: 'Великобритания', code: 'GB', flag: '🇬🇧' },
    '49': { name: 'Германия', code: 'DE', flag: '🇩🇪' },
    '33': { name: 'Франция', code: 'FR', flag: '🇫🇷' },
    '39': { name: 'Италия', code: 'IT', flag: '🇮🇹' },
    '34': { name: 'Испания', code: 'ES', flag: '🇪🇸' },
    '90': { name: 'Турция', code: 'TR', flag: '🇹🇷' },
    '86': { name: 'Китай', code: 'CN', flag: '🇨🇳' },
    '81': { name: 'Япония', code: 'JP', flag: '🇯🇵' },
    '82': { name: 'Южная Корея', code: 'KR', flag: '🇰🇷' },
    '91': { name: 'Индия', code: 'IN', flag: '🇮🇳' },
    '55': { name: 'Бразилия', code: 'BR', flag: '🇧🇷' },
    '52': { name: 'Мексика', code: 'MX', flag: '🇲🇽' },
    '61': { name: 'Австралия', code: 'AU', flag: '🇦🇺' },
    '27': { name: 'ЮАР', code: 'ZA', flag: '🇿🇦' },
    '20': { name: 'Египет', code: 'EG', flag: '🇪🇬' },
  }
  
  // Проверяем коды от самых длинных к коротким
  const sortedCodes = Object.keys(countryMap).sort((a, b) => b.length - a.length)
  
  for (const code of sortedCodes) {
    if (digits.startsWith(code)) {
      return countryMap[code]
    }
  }
  
  return { name: 'Неизвестно', code: 'UN', flag: '🌍' }
}

/**
 * Получает информацию о пользователе из WhatsApp через backend (whatsapp-web.js)
 */
const getWhatsAppUserInfo = async (phone) => {
  try {
    const formattedPhone = formatPhoneNumber(phone)
    if (!formattedPhone) {
      return null
    }

    const params = new URLSearchParams({ phone: formattedPhone })
    const response = await fetch(`${API_BASE_URL}/auth/whatsapp/user-info?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (import.meta.env.DEV) {
        console.warn('Не удалось получить информацию о пользователе WhatsApp:', response.status)
      }
      return null
    }

    const data = await response.json()
    if (!data.success || !data.data) {
      return null
    }

    return {
      name: data.data.name || null,
      photo: data.data.picture || null
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Ошибка получения информации о пользователе WhatsApp:', error)
    }
    return null
  }
}

/**
 * Валидирует номер телефона (базовая проверка)
 */
export const validatePhoneNumber = (phone) => {
  // Удаляем все нецифровые символы, кроме +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Минимальная длина международного номера (с кодом страны) - 10 цифр
  // Максимальная - 15 цифр (стандарт E.164)
  const digitsOnly = cleaned.replace(/\+/g, '')
  
  if (digitsOnly.length < 10) {
    return { valid: false, error: 'Номер слишком короткий' }
  }
  
  if (digitsOnly.length > 15) {
    return { valid: false, error: 'Номер слишком длинный' }
  }
  
  return { valid: true }
}

/**
 * Проверяет, существует ли пользователь с таким номером в БД
 */
const checkUserExists = async (phone) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/phone/${encodeURIComponent(phone)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.success && data.data ? data.data : null
    }
    // 404 - это нормально, пользователь просто не существует
    // Не логируем ошибку для 404
    if (response.status !== 404) {
      console.warn('⚠️ Ошибка при проверке пользователя:', response.status, response.statusText)
    }
    return null
  } catch (error) {
    // Игнорируем ошибки сети, не логируем их как ошибки
    if (import.meta.env.DEV) {
      console.warn('⚠️ Не удалось проверить пользователя (возможно, сервер не запущен):', error.message)
    }
    return null
  }
}

// checkContactExists и tryAddContactAutomatically больше не используются,
// так как отправка происходит через whatsapp-web.js на backend без ограничения "контакт должен быть в списках".

/**
 * Отправляет код верификации через WhatsApp
 */
export const sendWhatsAppVerificationCode = async (phone) => {
  try {
    const formattedPhone = formatPhoneNumber(phone)
    
    // Сначала проверяем, существует ли пользователь в БД
    const existingUser = await checkUserExists(formattedPhone)
    
    if (existingUser && import.meta.env.DEV) {
      console.log('✅ Пользователь найден в БД. Можно использовать быстрый вход.')
    }
    
    const code = generateVerificationCode()
    
    // Отладка в режиме разработки
    if (import.meta.env.DEV) {
      console.log('📱 Отправка кода WhatsApp:', {
        исходныйНомер: phone,
        отформатированныйНомер: formattedPhone,
        сгенерированныйКод: code,
        пользовательСуществует: !!existingUser
      })
    }
    
    // Сохраняем код локально (пока без backend-хранилища)
    saveVerificationCode(formattedPhone, code)

    // Отправляем код через backend, который использует whatsapp-web.js
    try {
      const response = await fetch(`${API_BASE_URL}/auth/whatsapp/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: formattedPhone,
          code
        })
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message || 'Код отправлен в WhatsApp'
        }
      }

      // Обработка ошибки 503 - WhatsApp клиент не готов
      if (response.status === 503) {
        const errorMessage = data.error || 'WhatsApp сервис временно недоступен. Пожалуйста, подождите несколько секунд и попробуйте снова.'
        console.warn('⚠️ WhatsApp клиент не готов:', errorMessage)
        
        // В dev-режиме показываем код для отладки
        if (import.meta.env.DEV) {
          console.log(`🔐 В режиме разработки используйте код: ${code}`)
          return {
            success: true,
            message: 'WhatsApp сервис недоступен. В режиме разработки используйте код из консоли.',
            code,
            devMode: true,
            warning: errorMessage
          }
        }
        
        return {
          success: false,
          error: errorMessage
        }
      }

      // Если backend ответил другой ошибкой, но мы в dev-режиме — покажем код для отладки
      if (import.meta.env.DEV) {
        console.warn('⚠️ Не удалось отправить код через backend WhatsApp:', data.error || response.statusText)
        console.log(`🔐 В режиме разработки используйте код: ${code}`)
        return {
          success: true,
          message: 'Не удалось отправить код автоматически, используйте код из консоли (режим разработки)',
          code,
          devMode: true
        }
      }

      return {
        success: false,
        error: data.error || 'Не удалось отправить код через WhatsApp'
      }
    } catch (error) {
      console.error('Ошибка запроса к backend для WhatsApp:', error)

      if (import.meta.env.DEV) {
        console.warn('⚠️ Backend WhatsApp недоступен. Код выведен в консоль для разработки.')
        console.log(`🔐 Код для ${formattedPhone}: ${code}`)
        return {
          success: true,
          message: 'Backend недоступен. В режиме разработки используйте код из консоли.',
          code,
          devMode: true
        }
      }

      return {
        success: false,
        error: 'Не удалось отправить код. Попробуйте позже.'
      }
    }
  } catch (error) {
    console.error('Ошибка отправки кода:', error)
    return {
      success: false,
      error: 'Не удалось отправить код. Попробуйте позже.'
    }
  }
}

/**
 * Проверяет код верификации и авторизует пользователя
 * mode: 'login' | 'register' — в режиме login новый пользователь НЕ создается
 */
export const verifyWhatsAppCode = async (phone, code, role = 'buyer', mode = 'register') => {
  try {
    const formattedPhone = formatPhoneNumber(phone)
    
    // Проверяем код (пока не удаляем)
    const verification = verifyCode(formattedPhone, code, false)
    
    if (!verification.valid) {
      return {
        success: false,
        error: verification.error || 'Неверный код'
      }
    }
    
    // Отправляем данные на backend для сохранения в БД
    try {
      const countryInfo = getCountryByPhoneCode(formattedPhone)
      const formatPhoneForDisplay = (phone) => {
        const digits = phone.replace(/\D/g, '')
        if (digits.startsWith('375') && digits.length === 12) {
          return `+${digits.substring(0, 3)} (${digits.substring(3, 5)}) ${digits.substring(5, 8)}-${digits.substring(8, 10)}-${digits.substring(10)}`
        } else if (digits.startsWith('7') && digits.length === 11) {
          return `+${digits.substring(0, 1)} (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7, 9)}-${digits.substring(9)}`
        } else if (digits.startsWith('1') && digits.length === 11) {
          return `+${digits.substring(0, 1)} (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`
        }
        return `+${digits}`
      }

      // Получаем информацию о пользователе из WhatsApp
      let whatsappInfo = null
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        whatsappInfo = await getWhatsAppUserInfo(formattedPhone)
        if (whatsappInfo && whatsappInfo.name) {
          console.log(`✅ Имя получено с попытки ${attempt + 1}:`, whatsappInfo.name)
          break
        }
      }

      const referrerId = getReferrerId()
      const response = await fetch(`${API_BASE_URL}/auth/whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          code,
          name: whatsappInfo?.name || `Пользователь ${formattedPhone.substring(formattedPhone.length - 4)}`,
          phoneFormatted: formatPhoneForDisplay(formattedPhone),
          countryFlag: countryInfo.flag,
          role: role,
          mode,
          ...(referrerId && mode === 'register' && { referrer_id: referrerId })
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          if (referrerId && mode === 'register') clearReferrerId()
          // Проверяем, заблокирован ли пользователь
          if (data.user.is_blocked === true || data.user.is_blocked === 1) {
            return {
              success: false,
              error: 'Пользователь заблокирован',
              is_blocked: true
            }
          }
          
          // Объединяем данные от backend с данными WhatsApp
          const userData = {
            ...data.user,
            phoneFormatted: formatPhoneForDisplay(formattedPhone),
            country: countryInfo.name,
            countryCode: countryInfo.code,
            countryFlag: countryInfo.flag,
            picture: whatsappInfo?.photo || null
          }
          // Удаляем код из localStorage только после успешной авторизации
          verifyCode(formattedPhone, code, true)
          saveUserData(userData, 'whatsapp')
          return {
            success: true,
            user: userData,
            is_blocked: false
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Ошибка при сохранении в БД:', errorData.error || 'Неизвестная ошибка')
        
        if (response.status === 403 && errorData.is_blocked) {
          return {
            success: false,
            error: errorData.error || 'Пользователь заблокирован',
            is_blocked: true
          }
        }
        // Уже зарегистрирован — пытался регистрироваться с существующим номером
        if (response.status === 409) {
          return {
            success: false,
            error: errorData.error || 'Вы уже зарегистрированы с этим номером. Войдите в аккаунт.',
            code: 'ALREADY_REGISTERED',
            is_blocked: false
          }
        }
        // Режим вход, но пользователь не найден — нужно зарегистрироваться
        if (response.status === 404) {
          return {
            success: false,
            error: errorData.error || 'Пользователь с таким номером не найден. Сначала зарегистрируйтесь через WhatsApp.',
            code: 'NEED_REGISTER',
            is_blocked: false
          }
        }
        
        return {
          success: false,
          error: errorData.error || 'Ошибка при сохранении данных',
          is_blocked: false
        }
      }
    } catch (backendError) {
      console.error('❌ Backend недоступен, данные НЕ сохранены в БД:', backendError.message)
      console.warn('⚠️ Данные сохранены только в localStorage. Запустите backend сервер для полной функциональности.')
      
      // Fallback: создаем пользователя локально (только если backend недоступен)
      const countryInfo = getCountryByPhoneCode(formattedPhone)
      const formatPhoneForDisplay = (phone) => {
        const digits = phone.replace(/\D/g, '')
        if (digits.startsWith('375') && digits.length === 12) {
          return `+${digits.substring(0, 3)} (${digits.substring(3, 5)}) ${digits.substring(5, 8)}-${digits.substring(8, 10)}-${digits.substring(10)}`
        } else if (digits.startsWith('7') && digits.length === 11) {
          return `+${digits.substring(0, 1)} (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7, 9)}-${digits.substring(9)}`
        } else if (digits.startsWith('1') && digits.length === 11) {
          return `+${digits.substring(0, 1)} (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`
        }
        return `+${digits}`
      }
      
      let whatsappInfo = null
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        whatsappInfo = await getWhatsAppUserInfo(formattedPhone)
        if (whatsappInfo && whatsappInfo.name) {
          break
        }
      }
      
      const userData = {
        phone: formattedPhone,
        phoneFormatted: formatPhoneForDisplay(formattedPhone),
        name: whatsappInfo?.name || `Пользователь ${formattedPhone.substring(formattedPhone.length - 4)}`,
        id: `whatsapp_${formattedPhone}`,
        role: role || 'buyer', // Используем переданную роль
        country: countryInfo.name,
        countryCode: countryInfo.code,
        countryFlag: countryInfo.flag,
        picture: whatsappInfo?.photo || null,
        loginMethod: 'whatsapp'
      }
      
      // Удаляем код из localStorage после успешной авторизации
      verifyCode(formattedPhone, code, true)
      saveUserData(userData, 'whatsapp')
      
      return {
        success: true,
        user: userData
      }
    }
  } catch (error) {
    console.error('Ошибка верификации кода:', error)
    return {
      success: false,
      error: 'Не удалось проверить код. Попробуйте позже.'
    }
  }
}

/**
 * Обрабатывает авторизацию через Google
 * Может принимать как credential (JWT токен), так и access_token
 * @param {Object} googleResponse - ответ от Google (credential или access_token + userInfo)
 * @param {Object} options - { mode: 'login' | 'register' } для проверок на бэкенде
 */
export const handleGoogleAuth = async (googleResponse, options = {}) => {
  const mode = options.mode || 'register'
  try {
    // Если это credential (JWT токен из GoogleOneTap)
    if (googleResponse.credential) {
      return await handleGoogleCredential(googleResponse.credential, mode)
    }
    
    // Если это access_token из useGoogleLogin
    if (googleResponse.access_token) {
      return await handleGoogleAccessToken(googleResponse.access_token, googleResponse, mode)
    }
    
    throw new Error('Неизвестный формат ответа от Google')
  } catch (error) {
    console.error('Ошибка Google авторизации:', error)
    return {
      success: false,
      error: error.message || 'Не удалось обработать данные авторизации'
    }
  }
}

/**
 * Обрабатывает JWT credential токен от Google
 * @param {string} credential - JWT от Google
 * @param {string} mode - 'login' | 'register'
 */
const handleGoogleCredential = async (credential, mode = 'register') => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential, mode })
    })

    if (response.ok) {
      const data = await response.json()
      saveUserData(data.user, 'google')
      return {
        success: true,
        user: data.user
      }
    }

    const errorData = await response.json().catch(() => ({}))
    if (response.status === 409) {
      return {
        success: false,
        error: errorData.error || 'Вы уже зарегистрированы. Войдите в аккаунт.',
        code: 'ALREADY_REGISTERED'
      }
    }
    if (response.status === 404) {
      return {
        success: false,
        error: errorData.error || 'Аккаунт не найден. Сначала зарегистрируйтесь через Google.',
        code: 'NEED_REGISTER'
      }
    }
    return {
      success: false,
      error: errorData.error || 'Ошибка авторизации через Google'
    }
  } catch (error) {
    console.log('Бэкенд недоступен, используем локальную обработку:', error.message)
  }
  
  // Fallback: локальное декодирование токена (только для разработки!)
  // ВНИМАНИЕ: В production токен должен проверяться на сервере
  try {
    const payload = JSON.parse(atob(credential.split('.')[1]))
    
    const userData = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      id: payload.sub || payload.email,
      role: 'client'
    }
    
    saveUserData(userData, 'google')
    
    return {
      success: true,
      user: userData
    }
  } catch (fallbackError) {
    console.error('Ошибка обработки токена:', fallbackError)
    return {
      success: false,
      error: 'Не удалось обработать данные авторизации'
    }
  }
}

/**
 * Обрабатывает access_token от Google OAuth
 * @param {string} accessToken
 * @param {Object} fullResponse - полный ответ (если есть userInfo)
 * @param {string} mode - 'login' | 'register'
 */
const handleGoogleAccessToken = async (accessToken, fullResponse = {}, mode = 'register') => {
  try {
    // Получаем информацию о пользователе через Google API
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!userInfoResponse.ok) {
      throw new Error('Не удалось получить данные пользователя')
    }

    const userInfo = await userInfoResponse.json()
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          userInfo,
          mode
        })
      })

      if (response.ok) {
        const data = await response.json()
        saveUserData(data.user, 'google')
        return {
          success: true,
          user: data.user
        }
      }

      const errorData = await response.json().catch(() => ({}))
      if (response.status === 409) {
        return {
          success: false,
          error: errorData.error || 'Вы уже зарегистрированы. Войдите в аккаунт.',
          code: 'ALREADY_REGISTERED'
        }
      }
      if (response.status === 404) {
        return {
          success: false,
          error: errorData.error || 'Аккаунт не найден. Сначала зарегистрируйтесь через Google.',
          code: 'NEED_REGISTER'
        }
      }
      return {
        success: false,
        error: errorData.error || 'Ошибка авторизации через Google'
      }
    } catch (backendError) {
      console.log('Бэкенд недоступен, используем локальные данные:', backendError.message)
    }
    
    // Fallback: сохраняем данные локально
    const userData = {
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      id: userInfo.id || userInfo.email,
      role: 'client'
    }
    
    saveUserData(userData, 'google')
    
    return {
      success: true,
      user: userData
    }
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error)
    return {
      success: false,
      error: 'Не удалось получить данные пользователя от Google'
    }
  }
}

/**
 * Вход/регистрация через Telegram Login Widget.
 * @param {Object} telegramData - Данные от виджета: id, first_name, last_name, username, photo_url, auth_date, hash
 * @param {string} mode - 'login' | 'register'
 * @param {string} role - 'buyer' | 'seller'
 */
export const verifyTelegramAuth = async (telegramData, mode = 'register', role = 'buyer') => {
  try {
    const referrerId = getReferrerId()
    const response = await fetch(`${API_BASE_URL}/auth/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: telegramData.id,
        first_name: telegramData.first_name,
        last_name: telegramData.last_name,
        username: telegramData.username,
        photo_url: telegramData.photo_url,
        auth_date: telegramData.auth_date,
        hash: telegramData.hash,
        mode,
        role,
        ...(referrerId && mode === 'register' && { referrer_id: referrerId })
      })
    })
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Ошибка авторизации через Telegram',
        code: response.status === 409 ? 'ALREADY_REGISTERED' : response.status === 404 ? 'NEED_REGISTER' : undefined
      }
    }

    const user = data.user
    if (referrerId && mode === 'register') clearReferrerId()
    const userDataToSave = {
      id: user.id,
      name: user.name,
      email: user.email || '',
      picture: user.picture || null,
      role: user.role || role,
      telegram_id: user.telegram_id,
      telegram_username: user.telegram_username
    }
    saveUserData(userDataToSave, 'telegram')

    return { success: true, user: userDataToSave }
  } catch (error) {
    console.error('Ошибка verifyTelegramAuth:', error)
    return {
      success: false,
      error: error.message || 'Не удалось войти через Telegram'
    }
  }
}

/**
 * Проверяет, авторизован ли пользователь
 */
export const isAuthenticated = () => {
  return localStorage.getItem('isLoggedIn') === 'true'
}

/**
 * Валидирует активную сессию пользователя, проверяя его существование в БД
 * Если пользователь не найден в БД, автоматически очищает локальную сессию
 * Эта функция должна вызываться при запуске приложения
 */
export const validateSession = async () => {
  const userData = getUserData()
  
  // Если пользователь не авторизован локально, ничего не делаем
  if (!userData.isLoggedIn || !userData.id) {
    return { valid: true, user: null }
  }
  
  try {
    // Используем dev tunnel для API
    // Используем числовой ID из БД (из localStorage), а не Clerk ID
    const API_BASE_URL = await getApiBaseUrl()
    let dbUserId = localStorage.getItem('userId')
    
    // Если нет числового ID, пытаемся найти пользователя по email/телефону
    if (!dbUserId || !/^\d+$/.test(dbUserId)) {
      const userEmail = userData.email
      const userPhone = userData.phone || userData.phoneFormatted
      
      if (userEmail) {
        const emailResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail.toLowerCase())}`)
        if (emailResponse.ok) {
          const emailData = await emailResponse.json()
          if (emailData.success && emailData.data && emailData.data.id) {
            dbUserId = String(emailData.data.id)
            localStorage.setItem('userId', dbUserId)
          }
        }
      }
      
      // Если не нашли по email, пробуем по телефону
      if ((!dbUserId || !/^\d+$/.test(dbUserId)) && userPhone) {
        const phoneDigits = userPhone.replace(/\D/g, '')
        if (phoneDigits) {
          const phoneResponse = await fetch(`${API_BASE_URL}/users/phone/${phoneDigits}`)
          if (phoneResponse.ok) {
            const phoneData = await phoneResponse.json()
            if (phoneData.success && phoneData.data && phoneData.data.id) {
              dbUserId = String(phoneData.data.id)
              localStorage.setItem('userId', dbUserId)
            }
          }
        }
      }
    }
    
    // Если все еще нет числового ID, возвращаем ошибку
    if (!dbUserId || !/^\d+$/.test(dbUserId)) {
      console.warn('⚠️ Не удалось найти числовой ID пользователя в БД')
      return { valid: true, user: userData, error: 'No numeric user ID found' }
    }
    
    const response = await fetch(`${API_BASE_URL}/users/${dbUserId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    // Если пользователь не найден в БД (404) — сессия устарела, очищаем её
    if (response.status === 404) {
      console.warn('⚠️ Локальная сессия устарела: пользователь с ID', dbUserId, 'не найден в БД. Очищаем данные.')
      clearUserData()
      return { valid: false, user: null, cleared: true }
    }
    
    // Если другая ошибка — не очищаем сессию (может быть проблема с сетью)
    if (!response.ok) {
      console.warn('⚠️ Не удалось проверить сессию (статус', response.status, '). Оставляем локальную сессию.')
      return { valid: true, user: userData, error: `HTTP ${response.status}` }
    }
    
    // Пользователь найден — проверяем блокировку
    const result = await response.json()
    if (result.success && result.data) {
      // Проверяем, заблокирован ли пользователь
      if (result.data.is_blocked === 1) {
        console.warn('🚫 Пользователь заблокирован')
        return { valid: true, user: result.data, is_blocked: true }
      }
      return { valid: true, user: result.data, is_blocked: false }
    }
    
    // Неожиданный формат ответа
    console.warn('⚠️ Неожиданный формат ответа при проверке сессии')
    return { valid: true, user: userData, error: 'Unexpected response format' }
    
  } catch (error) {
    // Ошибка сети — не очищаем сессию (может быть временная проблема)
    console.warn('⚠️ Ошибка при проверке сессии (возможно, сервер недоступен):', error.message)
    return { valid: true, user: userData, error: error.message }
  }
}

/**
 * Выход пользователя
 */
export const logout = async () => {
  // Получаем ID пользователя перед очисткой
  const userData = getUserData()
  const userId = userData.id
  
  // Обновляем статус в БД (is_online = 0) перед выходом
  if (userId) {
    try {
      // Используем proxy из vite.config.js или полный URL
      const API_BASE_URL = await getApiBaseUrl()
      await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_online: 0 })
      }).catch(error => {
        console.warn('⚠️ Не удалось обновить статус в БД при выходе:', error.message)
        // Продолжаем выход даже если не удалось обновить БД
      })
    } catch (error) {
      console.warn('⚠️ Ошибка при обновлении статуса в БД:', error.message)
      // Продолжаем выход даже если произошла ошибка
    }
  }
  
  // Очищаем все данные из localStorage
  clearUserData()
  
  console.log('✅ Выход выполнен успешно')
}

/**
 * Валидирует email адрес (формат и проверка MX записей)
 */
export const validateEmail = async (email) => {
  // Базовая проверка формата email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Неверный формат email адреса' }
  }

  // Извлекаем домен из email
  const domain = email.split('@')[1]
  
  // Проверка MX записей через публичный API
  try {
    // Используем API для проверки MX записей
    // Можно использовать различные сервисы, например:
    // 1. https://dns.google/resolve?name=domain&type=MX
    // 2. Или собственный backend endpoint
    
    // Попытка через Google DNS API
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      
      // Проверяем, есть ли MX записи
      if (data.Answer && data.Answer.length > 0) {
        // Есть MX записи - домен валиден
        return { valid: true }
      } else {
        // Нет MX записей, но это не всегда означает, что email не существует
        // Многие домены используют A записи для почты
        // Поэтому мы просто предупреждаем, но не блокируем
        console.warn(`Не найдены MX записи для домена ${domain}, но продолжаем`)
        return { valid: true }
      }
    } else {
      // Если API недоступен, просто проверяем формат
      console.warn('DNS API недоступен, проверяем только формат email')
      return { valid: true }
    }
  } catch (error) {
    // Если проверка MX не удалась, все равно разрешаем (формат уже проверен)
    console.warn('Ошибка проверки MX записей:', error.message)
    return { valid: true }
  }
}

/**
 * Сохраняет код верификации email в localStorage
 */
const saveEmailVerificationCode = (email, code) => {
  const codes = JSON.parse(localStorage.getItem('emailCodes') || '{}')
  codes[email.toLowerCase()] = {
    code,
    timestamp: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 минут
    password: null, // Будет сохранен при верификации
    name: null
  }
  localStorage.setItem('emailCodes', JSON.stringify(codes))
}

/**
 * Сохраняет дополнительные данные для регистрации
 */
const saveEmailRegistrationData = (email, password, name) => {
  const codes = JSON.parse(localStorage.getItem('emailCodes') || '{}')
  const emailLower = email.toLowerCase()
  if (codes[emailLower]) {
    codes[emailLower].password = password
    codes[emailLower].name = name
    localStorage.setItem('emailCodes', JSON.stringify(codes))
  }
}

/**
 * Проверяет код верификации email
 */
const verifyEmailCodeLocal = (email, code) => {
  const codes = JSON.parse(localStorage.getItem('emailCodes') || '{}')
  const emailLower = email.toLowerCase()
  const codeData = codes[emailLower]
  
  if (!codeData) {
    return { valid: false, error: 'Код не найден. Запросите новый код.' }
  }
  
  if (Date.now() > codeData.expiresAt) {
    delete codes[emailLower]
    localStorage.setItem('emailCodes', JSON.stringify(codes))
    return { valid: false, error: 'Код истек. Запросите новый код.' }
  }
  
  if (codeData.code !== code) {
    return { valid: false, error: 'Неверный код' }
  }
  
  // Код верный, возвращаем данные регистрации
  const registrationData = {
    password: codeData.password,
    name: codeData.name
  }
  
  // Удаляем код после использования
  delete codes[emailLower]
  localStorage.setItem('emailCodes', JSON.stringify(codes))
  
  return { valid: true, registrationData }
}

/**
 * Отправляет код верификации на email
 */
export const sendEmailVerificationCode = async (email) => {
  try {
    const emailLower = email.toLowerCase()
    const code = generateVerificationCode()
    
    // Сохраняем код
    saveEmailVerificationCode(emailLower, code)
    
    // Попытка отправить через backend API
    try {
      const apiUrl = `${API_BASE_URL}/auth/email/send-code`
      console.log('📧 Попытка отправить код через backend:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailLower,
          code
        })
      })
      
      if (response.ok) {
        const data = await response.json().catch(() => ({}))
        console.log('✅ Backend подтвердил отправку кода:', data.message || 'Код отправлен')
        if (data.warning) {
          console.warn('⚠️ Backend предупреждение:', data.warning)
        }
        // Если backend успешно отправил, возвращаем успех
        if (!data.warning) {
          return {
            success: true,
            message: data.message || 'Код отправлен на email'
          }
        }
        // Если есть warning, продолжаем с EmailJS на клиенте
      } else {
        // Если backend вернул ошибку, логируем и продолжаем с EmailJS
        const errorData = await response.json().catch(() => ({}))
        console.warn('⚠️ Backend вернул ошибку:', response.status, errorData.error || 'Unknown error')
        console.warn('   Пробуем отправить через EmailJS на клиенте...')
      }
    } catch (backendError) {
      console.log('ℹ️ Backend недоступен или ошибка:', backendError.message)
      console.log('   Пробуем отправить через EmailJS на клиенте...')
    }
    
    // Отправка через EmailJS на клиенте (если backend не смог отправить)
    // Сначала пытаемся загрузить конфигурацию через API, если переменные не установлены
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      await updateEmailJsConfig()
    }
    
    console.log('📧 Проверка EmailJS на клиенте:');
    console.log('   EMAILJS_SERVICE_ID:', EMAILJS_SERVICE_ID ? EMAILJS_SERVICE_ID.substring(0, 15) + '...' : '❌ не установлен');
    console.log('   EMAILJS_TEMPLATE_ID:', EMAILJS_TEMPLATE_ID || '❌ не установлен');
    console.log('   EMAILJS_PUBLIC_KEY:', EMAILJS_PUBLIC_KEY ? EMAILJS_PUBLIC_KEY.substring(0, 15) + '...' : '❌ не установлен');
    
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      try {
        // Вычисляем время истечения (10 минут от текущего времени)
        const expirationTime = new Date(Date.now() + 10 * 60 * 1000)
        const expirationTimeString = expirationTime.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        
        const templateParams = {
          // Стандартные переменные для шаблона "One-Time Password"
          email: emailLower,           // для поля "To Email"
          passcode: code,              // для кода в контенте
          time: expirationTimeString,   // для времени истечения
          // Дополнительные переменные (на случай кастомного шаблона)
          to_email: emailLower,
          verification_code: code,
          from_name: 'Sellyourbrick',
          message: `Ваш код подтверждения: ${code}. Код действителен в течение 10 минут.`
        }
        
        console.log('📧 Отправка email через EmailJS...', {
          serviceId: EMAILJS_SERVICE_ID,
          templateId: EMAILJS_TEMPLATE_ID,
          email: emailLower
        })
        
        const result = await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_PUBLIC_KEY
        )
        
        if (result.status === 200) {
          console.log('✅ Email успешно отправлен через EmailJS')
          return {
            success: true,
            message: 'Код отправлен на email'
          }
        } else {
          console.error('❌ EmailJS вернул статус:', result.status)
          // В режиме разработки показываем код для тестирования, даже если EmailJS вернул ошибку
          if (import.meta.env.DEV) {
            console.log('🔐 В режиме разработки используйте код:', code)
            return {
              success: true,
              message: `EmailJS вернул статус ${result.status}. В режиме разработки используйте код:`,
              code: code,
              devMode: true,
              warning: `EmailJS вернул статус ${result.status}. Проверьте настройки EmailJS.`
            }
          }
          return {
            success: false,
            error: 'Не удалось отправить код. Попробуйте позже.'
          }
        }
      } catch (emailjsError) {
        console.error('❌ Ошибка отправки через EmailJS:', emailjsError)
        
        // Проверяем тип ошибки и выводим понятное сообщение
        let errorMessage = 'Не удалось отправить код на email'
        
        if (emailjsError.status === 400) {
          const errorText = emailjsError.text || emailjsError.message || ''
          console.error('❌ EmailJS вернул ошибку 400:', errorText)
          
          if (errorText.includes('template') || errorText.includes('Template')) {
            console.error('❌ Template ID не найден. Проверьте VITE_EMAILJS_TEMPLATE_ID в .env.local')
            console.error('   Убедитесь, что шаблон существует в EmailJS Dashboard')
            errorMessage = 'Неверный Template ID. Проверьте VITE_EMAILJS_TEMPLATE_ID в .env.local'
          } else if (errorText.includes('service') || errorText.includes('Service')) {
            console.error('❌ Service ID не найден. Проверьте VITE_EMAILJS_SERVICE_ID в .env.local')
            errorMessage = 'Неверный Service ID. Проверьте VITE_EMAILJS_SERVICE_ID в .env.local'
          } else if (errorText.includes('Public Key') || errorText.includes('public key')) {
            console.error('❌ Public Key неверный. Проверьте VITE_EMAILJS_PUBLIC_KEY в .env.local')
            errorMessage = 'Неверный Public Key. Проверьте VITE_EMAILJS_PUBLIC_KEY в .env.local'
          } else {
            console.error('❌ Ошибка EmailJS:', errorText)
            errorMessage = `Ошибка EmailJS: ${errorText.substring(0, 100)}`
          }
        } else if (emailjsError.status === 401 || emailjsError.status === 403) {
          console.error('❌ Ошибка авторизации EmailJS (401/403). Проверьте Public Key')
          errorMessage = 'Ошибка авторизации EmailJS. Проверьте VITE_EMAILJS_PUBLIC_KEY в .env.local'
        } else {
          console.error('❌ Неизвестная ошибка EmailJS:', emailjsError)
          errorMessage = `Ошибка отправки: ${emailjsError.message || 'Неизвестная ошибка'}`
        }
        
        // В режиме разработки показываем код в консоли и возвращаем его для UI
        if (import.meta.env.DEV) {
          console.warn('⚠️ В режиме разработки код доступен в консоли:')
          console.log(`🔐 Код верификации для ${emailLower}: ${code}`)
          return {
            success: true,
            message: `Код не отправлен через EmailJS (ошибка выше). В режиме разработки используйте код: ${code}`,
            code: code,
            devMode: true,
            error: errorMessage
          }
        }
        
        // В production возвращаем ошибку
        return {
          success: false,
          error: errorMessage
        }
      }
    }
    
    // Если EmailJS не настроен (нет переменных окружения)
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      console.warn('⚠️ EmailJS не настроен. Добавьте переменные в .env.local:')
      console.warn('   VITE_EMAILJS_SERVICE_ID=service_xxxxxxx')
      console.warn('   VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx')
      console.warn('   VITE_EMAILJS_PUBLIC_KEY=your_public_key')
      console.log(`🔐 Код верификации для ${emailLower}: ${code}`)
      console.log('📧 В режиме разработки код отображается в консоли и будет показан в UI')
      
      // В режиме разработки возвращаем успех с кодом, чтобы можно было протестировать
      return {
        success: true,
        message: `EmailJS не настроен. В режиме разработки используйте код ниже:`,
        code: isDevelopment() ? code : undefined,
        devMode: true,
        warning: 'Для отправки реальных email настройте EmailJS в .env.local'
      }
    }
    
    // Если дошли сюда, значит что-то пошло не так
    return {
      success: false,
      error: 'Не удалось отправить код. Попробуйте позже.'
    }
  } catch (error) {
    console.error('Ошибка отправки кода:', error)
    return {
      success: false,
      error: 'Не удалось отправить код. Попробуйте позже.'
    }
  }
}

/**
 * Проверяет код верификации email и регистрирует пользователя
 */
export const verifyEmailCode = async (email, code, password, name, role = 'buyer') => {
  try {
    const emailLower = email.toLowerCase()
    
    // Сохраняем данные регистрации перед проверкой кода
    if (password && name) {
      saveEmailRegistrationData(emailLower, password, name)
    }
    
    // Проверяем код
    const verification = verifyEmailCodeLocal(emailLower, code)
    
    if (!verification.valid) {
      return {
        success: false,
        error: verification.error || 'Неверный код'
      }
    }
    
    // Используем сохраненные данные регистрации или переданные
    const registrationPassword = verification.registrationData?.password || password
    const registrationName = verification.registrationData?.name || name
    
    // Отправляем данные на backend для сохранения в БД
    try {
      const referrerId = getReferrerId()
      const response = await fetch(`${API_BASE_URL}/auth/email/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailLower,
          password: registrationPassword,
          name: registrationName,
          code,
          role: role,
          ...(referrerId && { referrer_id: referrerId })
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          if (referrerId) clearReferrerId()
          // Пользователь успешно сохранен в БД
          console.log('✅ Пользователь успешно зарегистрирован в БД:', data.user)
          saveUserData(data.user, 'email')
          return {
            success: true,
            user: data.user
          }
        } else {
          // Backend вернул ошибку
          return {
            success: false,
            error: data.error || 'Не удалось зарегистрировать пользователя'
          }
        }
      } else {
        // Обрабатываем ошибки валидации пароля и другие ошибки
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 400 && errorData.passwordValidation) {
          let errorMessage = errorData.error || errorData.message || 'Пароль не соответствует требованиям'
          if (errorData.passwordValidation.missing && errorData.passwordValidation.missing.length > 0) {
            errorMessage += `\n\nДобавьте: ${errorData.passwordValidation.missing.join(', ')}`
          }
          if (errorData.passwordValidation.present && errorData.passwordValidation.present.length > 0) {
            errorMessage += `\nУже есть: ${errorData.passwordValidation.present.join(', ')}`
          }
          return {
            success: false,
            error: errorMessage,
            passwordValidation: errorData.passwordValidation
          }
        }
        // Общая обработка других ошибок (409 - пользователь уже существует, и т.д.)
        console.error('❌ Ошибка при сохранении в БД:', errorData.error || 'Неизвестная ошибка')
        return {
          success: false,
          error: errorData.error || 'Не удалось зарегистрировать пользователя'
        }
      }
    } catch (backendError) {
      // Backend недоступен - используем fallback только в этом случае
      console.error('❌ Backend недоступен, данные НЕ сохранены в БД:', backendError.message)
      console.warn('⚠️ Данные сохранены только в localStorage. Запустите backend сервер для полной функциональности.')
      
      // Fallback: создаем пользователя локально (только если backend недоступен)
      const userData = {
        email: emailLower,
        name: registrationName || emailLower.split('@')[0],
        id: `email_${emailLower}`,
        role: role || 'buyer', // Используем переданную роль
        loginMethod: 'email'
      }
    
      // Сохраняем пароль в зашифрованном виде (в production должно быть на backend)
      // Здесь просто сохраняем в localStorage для демо
      if (registrationPassword) {
        // ВНИМАНИЕ: В production пароли НЕ должны храниться на клиенте!
        // Это только для демонстрации
        const hashedPassword = btoa(registrationPassword) // Простое кодирование (не безопасно!)
        localStorage.setItem(`userPassword_${emailLower}`, hashedPassword)
      }
    
      saveUserData(userData, 'email')
    
      return {
        success: true,
        user: userData,
        warning: 'Пользователь сохранен локально. Backend недоступен.'
      }
    }
  } catch (error) {
    console.error('Ошибка верификации кода:', error)
    return {
      success: false,
      error: 'Не удалось проверить код. Попробуйте позже.'
    }
  }
}

/**
 * Регистрация пользователя с email и паролем
 */
export const registerWithEmail = async (email, password, name) => {
  try {
    // Валидация email
    const emailValidation = await validateEmail(email)
    if (!emailValidation.valid) {
      return {
        success: false,
        error: emailValidation.error || 'Неверный email адрес'
      }
    }
    
    // Валидация пароля
    if (!password || password.length < 6) {
      return {
        success: false,
        error: 'Пароль должен содержать минимум 6 символов'
      }
    }
    
    // Валидация имени
    if (!name || name.trim().length < 2) {
      return {
        success: false,
        error: 'Имя должно содержать минимум 2 символа'
      }
    }
    
    // Отправляем код на email
    const codeResult = await sendEmailVerificationCode(email)
    
    if (!codeResult.success) {
      return {
        success: false,
        error: codeResult.error || 'Не удалось отправить код'
      }
    }
    
    return {
      success: true,
      message: 'Код отправлен на email',
      code: codeResult.code // Только для разработки
    }
  } catch (error) {
    console.error('Ошибка регистрации:', error)
    return {
      success: false,
      error: 'Произошла ошибка при регистрации'
    }
  }
}

/**
 * Проверяет код подтверждения email при обновлении профиля
 */
export const verifyEmailForProfileUpdate = async (userId, email, code) => {
  try {
    const emailLower = email.toLowerCase()
    
    // Проверяем код локально
    const verification = verifyEmailCodeLocal(emailLower, code)
    
    if (!verification.valid) {
      return {
        success: false,
        error: verification.error || 'Неверный код'
      }
    }
    
    // Отправляем данные на backend для обновления профиля
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailLower,
          code
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Обновляем данные в localStorage
          const userData = getUserData()
          const updatedUserData = {
            ...userData,
            ...data.data,
            email: data.data.email || emailLower
          }
          saveUserData(updatedUserData, userData.loginMethod || 'whatsapp')
          
          return {
            success: true,
            message: 'Email успешно подтвержден',
            user: data.data
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Ошибка при обновлении email:', errorData.error || 'Неизвестная ошибка')
        return {
          success: false,
          error: errorData.error || 'Не удалось подтвердить email'
        }
      }
    } catch (backendError) {
      console.error('❌ Backend недоступен:', backendError.message)
      return {
        success: false,
        error: 'Не удалось подключиться к серверу. Попробуйте позже.'
      }
    }
    
    return {
      success: false,
      error: 'Не удалось подтвердить email'
    }
  } catch (error) {
    console.error('Ошибка верификации email:', error)
    return {
      success: false,
      error: 'Не удалось проверить код. Попробуйте позже.'
    }
  }
}

/**
 * Вход пользователя с email и паролем
 */
export const loginWithEmail = async (email, password) => {
  try {
    const emailLower = email.toLowerCase().trim()
    
    if (!emailLower || !password) {
      return {
        success: false,
        error: 'Необходимо указать email и пароль'
      }
    }
    
    console.log('🔐 Попытка входа:', { email: emailLower, apiUrl: `${API_BASE_URL}/auth/email/login` })
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/email/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailLower,
          password
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Ошибка входа:', response.status, errorData)
        
        // Проверяем, заблокирован ли пользователь (403)
        if (response.status === 403 && errorData.is_blocked) {
          return {
            success: false,
            error: errorData.error || 'Пользователь заблокирован',
            is_blocked: true
          }
        }
        
        return {
          success: false,
          error: errorData.error || 'Неверный email или пароль',
          is_blocked: false
        }
      }
      
      const data = await response.json()
      console.log('✅ Вход успешен:', data)
      console.log('🔍 Роль пользователя из ответа сервера:', data.user?.role)
      
      if (data.success && data.user) {
        // Проверяем, заблокирован ли пользователь
        if (data.user.is_blocked === true || data.user.is_blocked === 1) {
          // Сохраняем данные пользователя с флагом блокировки для показа модального окна
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('loginMethod', 'email');
          localStorage.setItem('isBlocked', 'true');
          localStorage.setItem('blockedUserId', data.user.id?.toString() || '');
          
          // Сохраняем минимальные данные пользователя
          const userData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name || data.user.email || 'Пользователь',
            role: data.user.role || 'buyer'
          };
          localStorage.setItem('userData', JSON.stringify(userData));
          
          return {
            success: false,
            error: 'Пользователь заблокирован',
            is_blocked: true,
            user: data.user
          }
        }
        
        // Убеждаемся, что роль присутствует в данных пользователя
        const userDataWithRole = {
          ...data.user,
          role: data.user.role || 'buyer' // Если роль не пришла, используем 'buyer' по умолчанию
        }
        
        console.log('💾 Сохраняем данные пользователя с ролью:', userDataWithRole.role)
        saveUserData(userDataWithRole, 'email')
        
        return {
          success: true,
          user: userDataWithRole,
          is_blocked: false
        }
      } else {
        return {
          success: false,
          error: data.error || 'Неверный email или пароль',
          is_blocked: false
        }
      }
    } catch (backendError) {
      console.error('❌ Ошибка подключения к серверу:', backendError)
      if (backendError.message === 'Failed to fetch') {
        return {
          success: false,
          error: 'Не удалось подключиться к серверу. Убедитесь, что сервер запущен на порту 3000.'
        }
      }
      return {
        success: false,
        error: 'Произошла ошибка при входе. Попробуйте позже.'
      }
    }
  } catch (error) {
    console.error('❌ Ошибка входа:', error)
    return {
      success: false,
      error: 'Произошла ошибка при входе'
    }
  }
}

/**
 * Вход пользователя с email/username и паролем (улучшенная версия)
 */
export const loginWithEmailOrUsername = async (emailOrUsername, password) => {
  try {
    const identifier = emailOrUsername.toLowerCase().trim()
    
    // Сначала пробуем как email
    let result = await loginWithEmail(identifier, password)
    
    if (result.success) {
      return result
    }
    
    // Если не получилось, пробуем найти пользователя по username (если будет реализовано)
    // Пока просто возвращаем ошибку
    return {
      success: false,
      error: 'Неверный email или пароль'
    }
  } catch (error) {
    console.error('Ошибка входа:', error)
    return {
      success: false,
      error: 'Произошла ошибка при входе'
    }
  }
}

