import { toYandexMapsLang } from './yandexMapsLang'
import i18n from '../i18n/config'

const SCRIPT_ATTR = 'data-syb-yandex-maps'

let loadPromise = null
let loadedLang = null

export function getYandexMapsApiKey() {
  return String(import.meta.env?.VITE_YANDEX_MAPS_API_KEY || '').trim()
}

function unloadYandexMapsScript() {
  loadPromise = null
  loadedLang = null
  if (typeof document !== 'undefined') {
    document.querySelectorAll(`script[${SCRIPT_ATTR}]`).forEach((node) => {
      try { node.remove() } catch { /* ignore */ }
    })
  }
  if (typeof window !== 'undefined') {
    try {
      delete window.ymaps
    } catch {
      window.ymaps = undefined
    }
  }
}

export function loadYandexMaps(lang) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Yandex Maps needs a browser'))
  }

  const resolvedLang = toYandexMapsLang(lang || i18n.language || 'ru')

  if (window.ymaps?.Map && loadedLang === resolvedLang) {
    return new Promise((resolve) => {
      window.ymaps.ready(() => resolve(window.ymaps))
    })
  }

  // Язык API задаётся при загрузке скрипта — при смене локали перезагружаем.
  if (window.ymaps && loadedLang && loadedLang !== resolvedLang) {
    unloadYandexMapsScript()
  }

  if (loadPromise) return loadPromise

  const apikey = getYandexMapsApiKey()
  if (!apikey) {
    return Promise.reject(new Error('VITE_YANDEX_MAPS_API_KEY is missing'))
  }

  loadedLang = resolvedLang
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.setAttribute(SCRIPT_ATTR, '1')
    // package.standard достаточно для Map + Placemark
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apikey)}&lang=${encodeURIComponent(resolvedLang)}&load=package.standard`
    script.async = true
    script.onload = () => {
      if (!window.ymaps?.ready) {
        loadPromise = null
        loadedLang = null
        reject(new Error('Yandex Maps script loaded without ymaps'))
        return
      }
      window.ymaps.ready(() => resolve(window.ymaps))
    }
    script.onerror = () => {
      loadPromise = null
      loadedLang = null
      reject(new Error('Failed to load Yandex Maps JS API 2.1'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}

export function getLoadedYandexMapsLang() {
  return loadedLang
}
