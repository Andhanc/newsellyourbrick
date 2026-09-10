import axios from 'axios'

const GEOCODER_URL = 'https://geocode-maps.yandex.ru/v1/'
const GEOCODER_URL_LEGACY = 'https://geocode-maps.yandex.ru/1.x/'
const SUGGEST_URL = 'https://suggest-maps.yandex.ru/v1/suggest'
const REQUEST_TIMEOUT_MS = 12000
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const MAX_CACHE_ENTRIES = 400

const KIND_TO_TYPE = {
  house: 'house',
  street: 'street',
  metro: 'metro',
  district: 'suburb',
  locality: 'city',
  area: 'city',
  province: 'state',
  country: 'country',
  vegetation: 'park',
  hydro: 'water',
  airport: 'airport',
  other: 'yes',
}

const responseCache = new Map()

function getGeocoderKey() {
  return String(process.env.YANDEX_GEOCODER_API_KEY || '').trim()
}

function getSuggestKey() {
  return String(process.env.YANDEX_SUGGEST_API_KEY || process.env.YANDEX_GEOCODER_API_KEY || '').trim()
}

function cacheGet(key) {
  const hit = responseCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    responseCache.delete(key)
    return null
  }
  return hit.value
}

function cacheSet(key, value) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = responseCache.keys().next().value
    if (firstKey) responseCache.delete(firstKey)
  }
  responseCache.set(key, { at: Date.now(), value })
}

function componentName(components, kind) {
  if (!Array.isArray(components)) return ''
  const match = components.find((item) => {
    const kinds = item?.kind
    if (Array.isArray(kinds)) return kinds.includes(kind)
    return kinds === kind || item?.kind === kind
  })
  return String(match?.name || '').trim()
}

export function addressFromYandexComponents(components = []) {
  const country = componentName(components, 'country')
  const city =
    componentName(components, 'locality') ||
    componentName(components, 'area') ||
    componentName(components, 'province')
  const road = componentName(components, 'street')
  const houseNumber = componentName(components, 'house')
  const suburb =
    componentName(components, 'district') ||
    componentName(components, 'area')
  return {
    country,
    city,
    town: city,
    village: '',
    road,
    street: road,
    house_number: houseNumber,
    suburb,
    city_district: suburb,
    district: suburb,
    neighbourhood: suburb,
    state: componentName(components, 'province'),
  }
}

export function parseYandexPoint(pos) {
  const parts = String(pos || '')
    .trim()
    .split(/\s+/)
    .map((value) => Number.parseFloat(value))
  if (parts.length < 2 || parts.some((value) => !Number.isFinite(value))) return null
  const [lng, lat] = parts
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

export function geoObjectToNominatimHit(geoObject) {
  if (!geoObject || typeof geoObject !== 'object') return null
  const meta = geoObject.metaDataProperty?.GeocoderMetaData || {}
  const addressBlock = meta.Address || {}
  const components = addressBlock.Components || []
  const point = parseYandexPoint(geoObject.Point?.pos)
  if (!point) return null

  const kind = String(meta.kind || '').toLowerCase()
  const displayName =
    addressBlock.formatted ||
    meta.text ||
    [geoObject.name, geoObject.description].filter(Boolean).join(', ')

  return {
    lat: String(point.lat),
    lon: String(point.lng),
    display_name: displayName,
    class: kind === 'house' || kind === 'street' ? 'highway' : 'place',
    type: KIND_TO_TYPE[kind] || kind || 'yes',
    importance: kind === 'house' ? 0.9 : kind === 'street' ? 0.7 : 0.5,
    address: addressFromYandexComponents(components),
    uri: geoObject.uri || '',
  }
}

export function parseGeocoderResponse(payload) {
  const members = payload?.response?.GeoObjectCollection?.featureMember
  if (!Array.isArray(members)) return []
  return members
    .map((member) => geoObjectToNominatimHit(member?.GeoObject))
    .filter(Boolean)
}

export function suggestResultToHit(result) {
  if (!result || typeof result !== 'object') return null
  const title = String(result.title?.text || result.title || '').trim()
  const subtitle = String(result.subtitle?.text || result.subtitle || '').trim()
  const formatted = String(result.address?.formatted_address || '').trim()
  const displayName = formatted || [title, subtitle].filter(Boolean).join(', ')
  if (!displayName) return null

  const components = Array.isArray(result.address?.component)
    ? result.address.component.map((item) => ({
        kind: Array.isArray(item.kind) ? item.kind[0] : item.kind,
        name: item.name,
      }))
    : []

  const tags = Array.isArray(result.tags) ? result.tags : []
  const kind = String(tags[0] || '').toLowerCase()

  return {
    lat: '',
    lon: '',
    display_name: displayName,
    class: 'place',
    type: KIND_TO_TYPE[kind] || kind || 'yes',
    importance: 0.6,
    address: addressFromYandexComponents(components),
    uri: String(result.uri || ''),
    title,
    subtitle,
  }
}

export function parseSuggestResponse(payload) {
  const results = payload?.results
  if (!Array.isArray(results)) return []
  return results.map(suggestResultToHit).filter(Boolean)
}

export function fieldsFromHit(hit) {
  const a = hit?.address || {}
  const country = a.country || ''
  const city = a.city || a.town || a.village || a.municipality || a.county || a.state || ''
  const road = a.road || a.street || ''
  const hn = a.house_number || ''
  const streetLine = [road, hn].filter(Boolean).join(', ')
  const display = typeof hit?.display_name === 'string' ? hit.display_name : ''
  const shortAddr =
    streetLine ||
    display
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(', ')
  const location =
    country && city && shortAddr ? `${country}, ${city}, ${shortAddr}` : display || shortAddr
  return {
    country,
    city,
    address: shortAddr,
    apartment: hn,
    location,
    citySearch: city,
    addressSearch: shortAddr,
    lat: hit?.lat || '',
    lon: hit?.lon || '',
  }
}

function toYandexLang(lang) {
  const code = String(lang || 'en').split(/[-_]/)[0].toLowerCase()
  // Официальные локали Геокодера. es/de/fr/pl/sv → en_US, иначе Яндекс часто откатывает в ru.
  const map = {
    ru: 'ru_RU',
    uk: 'uk_UA',
    be: 'be_BY',
    en: 'en_US',
    tr: 'tr_TR',
    es: 'en_US',
    de: 'en_US',
    fr: 'en_US',
    pl: 'en_US',
    sv: 'en_US',
  }
  return map[code] || 'en_US'
}

function toSuggestLang(lang) {
  return String(lang || 'en').split(/[-_]/)[0].toLowerCase() || 'en'
}

function isCyrillicUiLang(lang) {
  return ['ru', 'uk', 'be'].includes(toSuggestLang(lang))
}

function textLooksCyrillic(value) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(String(value || ''))
}

function hitsLookCyrillic(hits) {
  return (hits || []).some((hit) =>
    textLooksCyrillic(hit?.display_name || hit?.title || ''),
  )
}

function nominatimItemToHit(item) {
  if (!item || typeof item !== 'object') return null
  const lat = String(item.lat || '')
  const lon = String(item.lon || '')
  if (!lat || !lon) return null
  const address = item.address || {}
  return {
    lat,
    lon,
    display_name: item.display_name || '',
    class: item.class || 'place',
    type: item.type || 'yes',
    importance: Number(item.importance) || 0.5,
    address: {
      country: address.country || '',
      city: address.city || address.town || address.village || address.municipality || '',
      town: address.town || '',
      village: address.village || '',
      road: address.road || address.pedestrian || address.street || '',
      street: address.road || address.pedestrian || address.street || '',
      house_number: address.house_number || '',
      suburb: address.suburb || address.neighbourhood || address.city_district || '',
      city_district: address.city_district || '',
      district: address.suburb || address.city_district || '',
      neighbourhood: address.neighbourhood || '',
      state: address.state || '',
    },
    uri: '',
    title: address.city || address.town || address.road || item.display_name || '',
    subtitle: [address.state, address.country].filter(Boolean).join(', '),
  }
}

async function nominatimSearch({ q, lang = 'en', limit = 7 } = {}) {
  const query = String(q || '').trim()
  if (query.length < 2) return []
  const cacheKey = `nom:${lang}:${limit}:${query.toLowerCase()}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      format: 'jsonv2',
      addressdetails: 1,
      limit: Math.min(Math.max(Number(limit) || 7, 1), 10),
      q: query,
      'accept-language': toSuggestLang(lang),
    },
    headers: {
      'User-Agent': 'SellYourBrick/1.0 (property-geo; local-dev)',
      Accept: 'application/json',
    },
    timeout: REQUEST_TIMEOUT_MS,
    validateStatus: (status) => status < 500,
  })
  if (response.status >= 400) return []
  const hits = (Array.isArray(response.data) ? response.data : [])
    .map(nominatimItemToHit)
    .filter(Boolean)
  cacheSet(cacheKey, hits)
  return hits
}

async function withLatinFallback(hits, { q, lang, limit }) {
  if (isCyrillicUiLang(lang)) return hits
  if (hits?.length && !hitsLookCyrillic(hits)) return hits
  try {
    const fallback = await nominatimSearch({ q, lang, limit })
    if (fallback.length) return fallback
  } catch {
    // ignore nominatim errors
  }
  return hits || []
}

async function requestGeocoder(params) {
  const apikey = getGeocoderKey()
  if (!apikey) {
    const error = new Error('Yandex geocoder key is missing')
    error.status = 503
    throw error
  }

  const searchParams = { apikey, format: 'json', results: params.results || 7, lang: toYandexLang(params.lang), ...params.extra }
  const cacheKey = `geo:${JSON.stringify({ ...searchParams, apikey: 'x' })}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const tryUrl = async (url) => {
    const response = await axios.get(url, {
      params: searchParams,
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: (status) => status < 500,
    })
    if (response.status >= 400) {
      const error = new Error(`Yandex geocoder HTTP ${response.status}`)
      error.status = response.status === 429 ? 429 : response.status === 403 ? 403 : 502
      throw error
    }
    return parseGeocoderResponse(response.data)
  }

  let hits
  try {
    hits = await tryUrl(GEOCODER_URL)
  } catch (error) {
    if (error.status === 429 || error.status === 403) throw error
    hits = await tryUrl(GEOCODER_URL_LEGACY)
  }

  cacheSet(cacheKey, hits)
  return hits
}

export async function geocodeQuery({ q, uri, limit = 7, lang = 'en' } = {}) {
  const query = String(q || '').trim()
  const objectUri = String(uri || '').trim()
  if (!query && !objectUri) return []
  const extra = objectUri ? { uri: objectUri } : { geocode: query }
  try {
    const hits = await requestGeocoder({
      extra,
      results: Math.min(Math.max(Number(limit) || 7, 1), 10),
      lang,
    })
    if (objectUri) return hits
    return withLatinFallback(hits, { q: query, lang, limit })
  } catch (error) {
    if (!objectUri && !isCyrillicUiLang(lang)) {
      return withLatinFallback([], { q: query, lang, limit })
    }
    throw error
  }
}

export async function reverseGeocode({ lat, lng, lang = 'en' } = {}) {
  const latitude = Number.parseFloat(lat)
  const longitude = Number.parseFloat(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return []
  const hits = await requestGeocoder({
    extra: { geocode: `${longitude},${latitude}` },
    results: 1,
    lang,
  })
  if (isCyrillicUiLang(lang) || !hitsLookCyrillic(hits)) return hits
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'jsonv2',
        addressdetails: 1,
        lat: latitude,
        lon: longitude,
        'accept-language': toSuggestLang(lang),
      },
      headers: {
        'User-Agent': 'SellYourBrick/1.0 (property-geo; local-dev)',
        Accept: 'application/json',
      },
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: (status) => status < 500,
    })
    if (response.status < 400) {
      const hit = nominatimItemToHit(response.data)
      if (hit) return [hit]
    }
  } catch {
    // ignore
  }
  return hits
}

export async function suggestQuery({
  text,
  lang = 'en',
  types = '',
  ll = '',
  results = 7,
  countries = '',
} = {}) {
  const apikey = getSuggestKey()
  const query = String(text || '').trim()
  if (query.length < 2) return []

  let hits = []
  if (apikey) {
    const params = {
      apikey,
      text: query,
      lang: toSuggestLang(lang),
      results: Math.min(Math.max(Number(results) || 7, 1), 10),
      print_address: 1,
      attrs: 'uri',
    }
    if (types) params.types = types
    if (ll) params.ll = ll
    if (countries) params.countries = String(countries).toUpperCase()

    const cacheKey = `sug:${JSON.stringify({ ...params, apikey: 'x' })}`
    const cached = cacheGet(cacheKey)
    if (cached) {
      hits = cached
    } else {
      try {
        const response = await axios.get(SUGGEST_URL, {
          params,
          timeout: REQUEST_TIMEOUT_MS,
          validateStatus: (status) => status < 500,
        })
        if (response.status < 400) {
          hits = parseSuggestResponse(response.data)
          cacheSet(cacheKey, hits)
        }
      } catch (error) {
        if (error.status === 429 || error.status === 403) {
          // fall through to nominatim
        } else if (!isCyrillicUiLang(lang)) {
          // fall through
        } else {
          throw error
        }
      }
    }
  }

  return withLatinFallback(hits, { q: query, lang, limit: results })
}

export function isYandexGeocoderConfigured() {
  return Boolean(getGeocoderKey())
}

export function isYandexSuggestConfigured() {
  return Boolean(getSuggestKey())
}
