import i18n from '../i18n/config'
import {
  ensureGeocodedHit,
  extractCountryIso,
  fetchAddressSuggestions,
  fetchGeocodeHits,
  fetchNominatimFirst,
  fetchReverseGeocodeFields,
  resolveGeoLang,
} from './yandexGeocodeClient'
import { isCyrillicLocale, textLooksCyrillic } from './yandexMapsLang'

export { ensureGeocodedHit, extractCountryIso, fetchNominatimFirst, fetchReverseGeocodeFields }

const STREET_PREFIXES = [
  'улица', 'ул.', 'ул ',
  'street', 'st.', 'st ',
  'calle', 'c/', 'c. ',
  'strasse', 'straße', 'str.',
  'rue ', 'avenue', 'av.', 'ave.',
  'ulica', 'ul.',
  'väg', 'gatan',
]

function hasStreetPrefix(road) {
  const roadLower = String(road || '').toLowerCase().trim()
  return STREET_PREFIXES.some((prefix) => roadLower.startsWith(prefix))
}

function localizeStreetLabel(road, lang) {
  const value = String(road || '').trim()
  if (!value || hasStreetPrefix(value)) return value
  const code = resolveGeoLang(lang)
  if (code === 'ru') return `улица ${value}`
  if (code === 'es') return `Calle ${value}`
  if (code === 'de') return value
  if (code === 'fr') return `Rue ${value}`
  if (code === 'pl') return `ul. ${value}`
  return value
}

export function formatShortAddress(suggestion, lang) {
  const address = suggestion.address || {}
  const road = address.road || address.street || ''
  const suburb = address.suburb || ''
  const cityDistrict = address.city_district || ''
  const district = address.district || ''
  const neighbourhood = address.neighbourhood || ''
  const districtName = suburb || cityDistrict || district || neighbourhood || ''

  if (road) {
    let shortAddress = localizeStreetLabel(road, lang)
    if (districtName) shortAddress += `, ${districtName}`
    return shortAddress
  }

  const displayName = suggestion.display_name || suggestion.title || ''
  const parts = displayName.split(',').map((p) => p.trim())
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].toLowerCase()
    if (
      part.includes('улица') ||
      part.includes('ул.') ||
      part.includes('street') ||
      part.includes('calle') ||
      part.includes('strasse') ||
      part.includes('straße') ||
      part.includes('проспект') ||
      part.includes('avenue') ||
      part.includes('rue')
    ) {
      return parts[i]
    }
  }
  return suggestion.title || parts[0] || ''
}

export function formatShortAddressWithHouse(suggestion, lang) {
  const address = suggestion.address || {}
  const country = address.country || ''
  const city = address.city || address.town || address.village || ''
  const houseNumber = address.house_number || ''
  const road = address.road || address.street || ''
  const parts = []
  if (country) parts.push(country)
  if (city) parts.push(city)
  if (road) parts.push(localizeStreetLabel(road, lang))
  if (houseNumber) parts.push(houseNumber)
  if (parts.length > 0) return parts.join(', ')
  return suggestion.display_name || suggestion.title || ''
}

export function getUniqueAddressSuggestions(suggestions, lang) {
  const seenLabels = new Set()
  const unique = []
  suggestions.forEach((suggestion) => {
    const label = formatShortAddress(suggestion, lang)
    if (!label || seenLabels.has(label)) return
    seenLabels.add(label)
    unique.push({ suggestion, label })
  })
  return unique
}

function hitsMatchUiLang(hits, lang) {
  if (!Array.isArray(hits) || !hits.length) return false
  if (isCyrillicLocale(lang)) return true
  const sample = hits
    .slice(0, 3)
    .map((hit) => hit.display_name || hit.title || '')
    .join(' ')
  return !textLooksCyrillic(sample)
}

export async function searchCities(query, country = '', { lang } = {}) {
  if (!query || query.length < 2) return []
  const resolvedLang = resolveGeoLang(lang)
  const countryIso = extractCountryIso(country)
  const searchQuery = country ? `${query.trim()}, ${country}` : query.trim()
  try {
    const suggested = await fetchAddressSuggestions(searchQuery, {
      types: 'locality,province',
      lang: resolvedLang,
      countries: countryIso,
    })
    if (suggested.length && hitsMatchUiLang(suggested, resolvedLang)) {
      return suggested.slice(0, 10)
    }
    const geocoded = await fetchGeocodeHits(searchQuery, { limit: 7, lang: resolvedLang })
    if (geocoded.length && hitsMatchUiLang(geocoded, resolvedLang)) {
      return geocoded.slice(0, 10)
    }
    // Если Яндекс всё равно отдал русский при ES/EN UI — оставляем geocode/suggest как есть,
    // сервер уже должен был сделать Nominatim fallback.
    return (suggested.length ? suggested : geocoded).slice(0, 10)
  } catch {
    return []
  }
}

export async function searchStreets(query, { city = '', country = '', lang } = {}) {
  if (!query || query.length < 2) return []
  const resolvedLang = resolveGeoLang(lang)
  const countryIso = extractCountryIso(country)
  let searchQuery = query.trim()
  if (city) {
    const cityName = city.split(',')[0].trim()
    searchQuery = `${query.trim()}, ${cityName}`
    if (country) searchQuery = `${query.trim()}, ${cityName}, ${country}`
  } else if (country) {
    searchQuery = `${query.trim()}, ${country}`
  }

  try {
    const suggested = await fetchAddressSuggestions(searchQuery, {
      types: 'street,house,district',
      lang: resolvedLang,
      countries: countryIso,
    })
    if (suggested.length && hitsMatchUiLang(suggested, resolvedLang)) {
      return suggested.slice(0, 10)
    }
    const geocoded = await fetchGeocodeHits(searchQuery, { limit: 7, lang: resolvedLang })
    if (geocoded.length && hitsMatchUiLang(geocoded, resolvedLang)) {
      return geocoded.slice(0, 10)
    }
    return (suggested.length ? suggested : geocoded).slice(0, 10)
  } catch {
    return []
  }
}

export async function searchHouses(houseValue, { street = '', city = '', country = '', lang } = {}) {
  if (!houseValue || !street || !city) return []
  const resolvedLang = resolveGeoLang(lang)
  const streetPart = street.split(',')[0].trim()
  const searchQuery = `${streetPart} ${houseValue}, ${city}, ${country}`.trim()
  try {
    const data = await fetchGeocodeHits(searchQuery, { limit: 10, lang: resolvedLang })
    const houseRegex = new RegExp(`\\b${houseValue}\\b`, 'i')
    return data.filter((item) => {
      const address = item.address || {}
      const houseNumber = address.house_number || ''
      const displayName = item.display_name || ''
      if (houseNumber && houseNumber.toString().toLowerCase().includes(houseValue.toLowerCase())) {
        return true
      }
      if (houseRegex.test(displayName)) {
        const streetPartLower = streetPart.toLowerCase()
        const displayLower = displayName.toLowerCase()
        return (
          displayLower.startsWith(houseValue.toLowerCase()) ||
          (displayLower.includes(streetPartLower) && displayLower.includes(houseValue.toLowerCase()))
        )
      }
      return false
    })
  } catch {
    return []
  }
}

export function buildFormattedLocation({ country, city, street, apartment }) {
  const tail = [street, apartment].filter(Boolean).join(', ')
  return country && city && tail ? `${country}, ${city}, ${tail}` : tail
}

/**
 * Разбор строк вида «Беларусь, Минск, улица Киселёва, 12»
 * в поля мастера добавления объекта.
 */
export function parseLocationComposite(raw) {
  const parts = String(raw || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return { country: '', city: '', address: '', apartment: '' }
  }

  if (parts.length === 1) {
    return { country: '', city: '', address: parts[0], apartment: '' }
  }

  if (parts.length === 2) {
    return { country: parts[0], city: parts[1], address: '', apartment: '' }
  }

  const last = parts[parts.length - 1]
  const looksLikeHouse = /^(?:д\.?\s*)?\d+[а-яa-zA-ZёЁ/\-]*$/i.test(last) || /^\d+\s*к\.?\s*\d+/i.test(last)

  if (looksLikeHouse && parts.length >= 4) {
    return {
      country: parts[0],
      city: parts[1],
      address: parts.slice(2, -1).join(', '),
      apartment: last.replace(/^д\.?\s*/i, ''),
    }
  }

  return {
    country: parts[0],
    city: parts[1],
    address: parts.slice(2).join(', '),
    apartment: '',
  }
}

export function validateLocationForm(form, addressSearch) {
  const errors = {}
  if (!form.country?.trim()) errors.country = i18n.t('oap_err_country')
  if (!form.city?.trim()) errors.city = i18n.t('oap_err_city')
  const street = form.address?.trim() || addressSearch?.trim()
  if (!street) errors.address = i18n.t('oap_err_address')
  return errors
}
