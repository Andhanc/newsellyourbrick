/**
 * Локации только из реальных полей объектов каталога (location / city / country).
 * Никаких заранее прописанных Мадрида и Дубая, если их нет в данных.
 */

const STREET_RE =
  /^(ул\.?|улица|просп\.?|проспект|пер\.?|переулок|наб\.?|набережн|шоссе|бульвар|бул\.?|дом\b|кв\.?|calle|carrer|street|str\.?|ave\.?|avenue|road|rd\.?|lane|via|rua| rambla)/i

const EXTRA_ALIASES = {
  испания: ['spain', 'espana', 'españa', 'испан'],
  беларусь: ['belarus', 'белоруссия', 'беларус'],
  россия: ['russia', 'рф', 'россия'],
  дубай: ['dubai', 'дубае', 'дубая', 'дубаю', 'uae', 'оаэ', 'эмират', 'emirates'],
  минск: ['minsk'],
  барселона: ['barcelona', 'барселон'],
  мадрид: ['madrid', 'мадриде', 'мадрида'],
  'санкт-петербург': ['saint petersburg', 'petersburg', 'spb', 'петербург'],
}

export function normalizeLocationText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function propertyLocationBlob(item) {
  return normalizeLocationText(
    [item?.location, item?.country, item?.city, item?.title, item?.name].filter(Boolean).join(' '),
  )
}

function looksLikeStreet(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return true
  if (raw.length > 48) return true
  if (/^\d/.test(raw)) return true
  return STREET_RE.test(raw)
}

function aliasesFor(label) {
  const key = normalizeLocationText(label)
  for (const [canon, aliases] of Object.entries(EXTRA_ALIASES)) {
    const group = [canon, ...aliases].map(normalizeLocationText)
    if (group.includes(key)) {
      return [...new Set(group)]
    }
  }
  return [key].filter(Boolean)
}

export function parseLocationParts(item) {
  const countryField = String(item?.country || '').trim()
  const cityField = String(item?.city || '').trim()
  const location = String(item?.location || '').trim()
  const parts = location.split(',').map((part) => part.trim()).filter(Boolean)

  let country = countryField
  let city = cityField

  if (!country && parts[0] && !looksLikeStreet(parts[0])) country = parts[0]
  if (!city && parts[1] && !looksLikeStreet(parts[1])) city = parts[1]
  if (!city && parts[0] && !countryField && looksLikeStreet(parts[1] || '') && !looksLikeStreet(parts[0])) {
    city = parts[0]
  }

  return {
    country,
    city,
    raw: location,
  }
}

function addPlace(map, label, kind, extra = {}) {
  const trimmed = String(label || '').trim()
  if (!trimmed || looksLikeStreet(trimmed)) return
  const key = normalizeLocationText(trimmed)
  if (key.length < 2) return
  const mapKey = extra.mapKey || key
  const prev = map.get(mapKey)
  map.set(mapKey, {
    key,
    label: prev?.label || trimmed,
    kind,
    aliases: aliasesFor(trimmed),
    count: (prev?.count || 0) + 1,
    ...extra,
  })
}

export function indexCatalogLocations(properties = []) {
  const countries = new Map()
  const cities = new Map()

  for (const item of properties || []) {
    const parsed = parseLocationParts(item)
    if (parsed.country) addPlace(countries, parsed.country, 'country')
    if (parsed.city) {
      const countryKey = normalizeLocationText(parsed.country)
      addPlace(cities, parsed.city, 'city', {
        countryKey,
        countryLabel: parsed.country,
        mapKey: `${countryKey}::${normalizeLocationText(parsed.city)}`,
      })
    }
  }

  const countryList = [...countries.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'))
  const cityList = [...cities.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'))
  const ranked = [...cityList, ...countryList]
    .filter((place, index, all) => all.findIndex((row) => row.key === place.key) === index)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'))
  const labels = ranked.map((place) => place.label)
  const maxCount = ranked[0]?.count || 0
  const buttonLabels = ranked
    .filter((place) => {
      if (maxCount <= 1) return true
      if (place.kind === 'city') return place.count >= 2
      return place.count >= 3
    })
    .map((place) => place.label)
    .filter((label, index, all) => all.indexOf(label) === index)
    .slice(0, 4)

  return {
    countries: countryList,
    cities: cityList,
    labels,
    buttonLabels: buttonLabels.length ? buttonLabels : labels.slice(0, 4),
    hasCatalog: Boolean((properties || []).length),
  }
}

function placeMatchesText(place, text) {
  const n = normalizeLocationText(text)
  return (place.aliases || [place.key]).some((alias) => alias && n.includes(alias))
}

export function detectCatalogCountry(text, index, fallback = {}) {
  const n = normalizeLocationText(text)
  if (!n) return fallback.hasCountry ? fallback : { hasCountry: false, countryKey: null, countryLabel: '' }

  for (const country of index?.countries || []) {
    if (placeMatchesText(country, n)) {
      return {
        hasCountry: true,
        countryKey: country.key,
        countryLabel: country.label,
        inCatalog: true,
      }
    }
  }

  return fallback.hasCountry ? fallback : { hasCountry: false, countryKey: null, countryLabel: '' }
}

export function citiesForCountry(index, countryKey) {
  const key = normalizeLocationText(countryKey)
  if (!key) return []
  return (index?.cities || []).filter((city) => city.countryKey === key)
}

export function detectCatalogCity(text, index, countryKey, fallback = {}) {
  const n = normalizeLocationText(text)
  if (!n) return fallback.hasCity ? fallback : { hasCity: false, cityKey: null, cityLabel: '' }

  for (const city of citiesForCountry(index, countryKey)) {
    if (placeMatchesText(city, n)) {
      return {
        hasCity: true,
        cityKey: city.key,
        cityLabel: city.label,
        countryKey: city.countryKey,
        countryLabel: city.countryLabel,
        inCatalog: true,
      }
    }
  }

  return fallback.hasCity ? fallback : { hasCity: false, cityKey: null, cityLabel: '' }
}

export function formatCatalogCountries(index, lang = 'ru') {
  const labels = (index?.countries || []).map((country) => country.label)
  if (labels.length) return labels.join(', ')
  return lang === 'en' ? 'no countries yet' : lang === 'es' ? 'aún no hay países' : 'пока нет стран'
}

export function formatCatalogCities(index, countryKey, lang = 'ru') {
  const labels = citiesForCountry(index, countryKey).map((city) => city.label)
  if (labels.length) return labels.join(', ')
  return lang === 'en' ? 'no cities yet' : lang === 'es' ? 'aún no hay ciudades' : 'пока нет городов'
}

/**
 * Локация пользователя только если она есть в каталоге.
 */
export function detectCatalogLocation(text, index, fallback = {}) {
  const n = normalizeLocationText(text)
  if (!n) return fallback.hasLocation ? fallback : { hasLocation: false, location: null, label: '' }

  const cities = index?.cities || []
  const countries = index?.countries || []

  for (const city of cities) {
    if (placeMatchesText(city, n)) {
      return {
        hasLocation: true,
        location: city.key,
        cityKey: city.key,
        locationKind: 'city',
        label: city.label,
        inCatalog: true,
      }
    }
  }

  for (const country of countries) {
    if (placeMatchesText(country, n)) {
      return {
        hasLocation: true,
        location: country.key,
        cityKey: null,
        locationKind: 'country',
        label: country.label,
        inCatalog: true,
      }
    }
  }

  if (index?.hasCatalog) {
    const knownMissing = Object.entries(EXTRA_ALIASES).find(([key, aliases]) => {
      const tokens = [key, ...aliases].map(normalizeLocationText)
      return tokens.some((alias) => n.includes(alias))
    })
    if (knownMissing) {
      const [key] = knownMissing
      const already = [...cities, ...countries].some(
        (place) => place.key === key || place.aliases?.includes(key) || place.aliases?.includes(normalizeLocationText(key)),
      )
      if (!already) {
        const pretty = {
          дубай: 'Дубай',
          мадрид: 'Мадрид',
          испания: 'Испания',
          барселона: 'Барселона',
        }
        const label = pretty[key] || key.charAt(0).toUpperCase() + key.slice(1)
        return {
          hasLocation: false,
          location: null,
          cityKey: key,
          locationKind: 'unknown',
          label: '',
          unknownLabel: label,
          inCatalog: false,
          availableLabels: index.labels || [],
        }
      }
    }
  }

  if (fallback.hasLocation) return fallback
  return { hasLocation: false, location: null, label: '' }
}

export function itemMatchesCatalogLocation(item, pref) {
  if (!pref?.hasCountry && !pref?.hasCity && !pref?.hasLocation) return true
  const parsed = parseLocationParts(item)
  const itemCountry = normalizeLocationText(parsed.country)
  const itemCity = normalizeLocationText(parsed.city)
  const countryKey = normalizeLocationText(pref.countryKey || '')
  const cityKey = normalizeLocationText(pref.cityKey || pref.location || pref.label || '')
  if (countryKey && itemCountry !== countryKey) return false
  if (pref.hasCity && cityKey && itemCity !== cityKey) return false
  return true
}

export function formatAvailableLocations(index, lang = 'ru') {
  const labels = index?.buttonLabels?.length ? index.buttonLabels : index?.labels || []
  if (!labels.length) {
    return lang === 'en' ? 'our current catalog' : lang === 'es' ? 'el catálogo actual' : 'текущий каталог'
  }
  return labels.slice(0, 6).join(', ')
}
