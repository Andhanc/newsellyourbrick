import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { translateText, translateObject, translateArray } from '../services/translationService'

/**
 * Хук для автоматического перевода пользовательского контента
 * Использует текущий язык из i18next
 */
export const useAutoTranslate = () => {
  const { i18n } = useTranslation()
  const [isTranslating, setIsTranslating] = useState(false)

  /**
   * Переводит текст на текущий язык
   */
  const translate = useCallback(async (text, sourceLang = 'ru') => {
    if (!text || typeof text !== 'string') return text
    
    const currentLang = i18n.language || 'ru'
    
    if (currentLang === sourceLang) {
      return text
    }

    setIsTranslating(true)
    try {
      const translated = await translateText(text, currentLang, sourceLang)
      return translated
    } catch (error) {
      console.error('Translation error:', error)
      return text
    } finally {
      setIsTranslating(false)
    }
  }, [i18n.language])

  /**
   * Переводит объект на текущий язык
   */
  const translateObj = useCallback(async (obj, fields, sourceLang = 'ru') => {
    if (!obj || typeof obj !== 'object') return obj
    
    const currentLang = i18n.language || 'ru'
    
    if (currentLang === sourceLang) {
      return obj
    }

    setIsTranslating(true)
    try {
      const translated = await translateObject(obj, fields, currentLang, sourceLang)
      return translated
    } catch (error) {
      console.error('Translation error:', error)
      return obj
    } finally {
      setIsTranslating(false)
    }
  }, [i18n.language])

  /**
   * Переводит массив объектов на текущий язык
   */
  const translateArr = useCallback(async (array, fields, sourceLang = 'ru') => {
    if (!Array.isArray(array)) return array
    
    const currentLang = i18n.language || 'ru'
    
    if (currentLang === sourceLang) {
      return array
    }

    setIsTranslating(true)
    try {
      const translated = await translateArray(array, fields, currentLang, sourceLang)
      return translated
    } catch (error) {
      console.error('Translation error:', error)
      return array
    } finally {
      setIsTranslating(false)
    }
  }, [i18n.language])

  return {
    translate,
    translateObj,
    translateArr,
    isTranslating,
    currentLanguage: i18n.language || 'ru'
  }
}


