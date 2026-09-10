import { getApiBaseUrlSync } from './apiConfig'
import { normalizeAppLangCode, toYandexSuggestLang } from './yandexMapsLang'
import i18n from '../i18n/config'

function getGeoApiBase() {
  const envBase = String(import.meta.env?.VITE_API_BASE_URL || '').trim()
  if (envBase) return envBase.replace(/\/$/, '')
  return getApiBaseUrlSync()
}

export function resolveGeoLang(explicitLang) {
  if (explicitLang) return toYandexSuggestLang(explicitLang)
  const live = i18n.resolvedLanguage || i18n.language || 'en'
  return toYandexSuggestLang(live)
}

async function readJson(response) {
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.error || `Geo API HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  return payload.data
}

export async function fetchGeocodeHits(query, { limit = 7, uri = '', lang } = {}) {
  const q = String(query || '').trim()
  const objectUri = String(uri || '').trim()
  if (!q && !objectUri) return []
  const params = new URLSearchParams({
    lang: resolveGeoLang(lang),
    limit: String(limit),
  })
  if (q) params.set('q', q)
  if (objectUri) params.set('uri', objectUri)
  const response = await fetch(`${getGeoApiBase()}/geo/geocode?${params}`)
  const data = await readJson(response)
  return Array.isArray(data) ? data : []
}

export async function fetchNominatimFirst(query, { lang } = {}) {
  if (!query || !String(query).trim()) return null
  try {
    const hits = await fetchGeocodeHits(query, { limit: 1, lang })
    return hits[0] || null
  } catch {
    return null
  }
}

export async function fetchReverseGeocodeFields(lat, lng, { lang } = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    lang: resolveGeoLang(lang),
  })
  const response = await fetch(`${getGeoApiBase()}/geo/reverse?${params}`)
  const data = await readJson(response)
  return data?.fields || null
}

export async function fetchAddressSuggestions(text, {
  types = '',
  ll = '',
  lang,
  countries = '',
} = {}) {
  const query = String(text || '').trim()
  if (query.length < 2) return []
  const params = new URLSearchParams({
    text: query,
    lang: resolveGeoLang(lang),
  })
  if (types) params.set('types', types)
  if (ll) params.set('ll', ll)
  if (countries) params.set('countries', countries)
  const response = await fetch(`${getGeoApiBase()}/geo/suggest?${params}`)
  const data = await readJson(response)
  return Array.isArray(data) ? data : []
}

export async function ensureGeocodedHit(hit, { lang } = {}) {
  if (!hit) return null
  const lat = parseFloat(hit.lat)
  const lon = parseFloat(hit.lon)
  if (Number.isFinite(lat) && Number.isFinite(lon)) return hit
  const uri = String(hit.uri || '').trim()
  const query = hit.display_name || hit.title || ''
  const resolved = await fetchGeocodeHits(query, { limit: 1, uri, lang })
  if (!resolved[0]) return hit
  return {
    ...hit,
    ...resolved[0],
    address: {
      ...(hit.address || {}),
      ...(resolved[0].address || {}),
    },
  }
}

export function extractCountryIso(country) {
  const raw = String(country || '').trim()
  if (!raw) return ''
  const isoPrefix = raw.match(/^([A-Za-z]{2})(?:\s+|$)/)
  if (isoPrefix) return isoPrefix[1].toUpperCase()

  const lower = raw.toLowerCase()
  const byName = {
    spain: 'ES',
    españa: 'ES',
    espana: 'ES',
    belarus: 'BY',
    беларусь: 'BY',
    germany: 'DE',
    deutschland: 'DE',
    германия: 'DE',
    france: 'FR',
    франция: 'FR',
    poland: 'PL',
    польша: 'PL',
    sweden: 'SE',
    sverige: 'SE',
    швеция: 'SE',
    'united kingdom': 'GB',
    uk: 'GB',
    england: 'GB',
    'united states': 'US',
    usa: 'US',
    russia: 'RU',
    россия: 'RU',
  }
  return byName[lower] || ''
}

export { normalizeAppLangCode }
