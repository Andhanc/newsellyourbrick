function normalizeCityInput(value = '') {
  return String(value)
    .split(',')[0]
    .trim()
    .toLowerCase()
}

const KNOWN_SPAIN_NEEDLES = [
  { re: [/мадрид/i, /\bmadrid\b/i], slug: 'madrid' },
  { re: [/барселон/i, /\bbarcelona\b/i], slug: 'barcelona' },
  { re: [/валенси/i, /\bvalencia\b/i], slug: 'valencia' },
  { re: [/севиль/i, /\bsevilla\b/i], slug: 'sevilla' },
  { re: [/малаг/i, /\bmalaga\b/i], slug: 'malaga' },
  { re: [/аликанте/i, /\balicante\b/i], slug: 'alicante' },
  { re: [/бильбао/i, /\bbilbao\b/i], slug: 'bilbao' }
]

const CITY_ALIAS_MAP = {
  madrid: 'madrid',
  мадрид: 'madrid',
  barcelona: 'barcelona',
  барселона: 'barcelona',
  adeje: 'adeje',
  arona: 'arona',
  'costa adeje': 'adeje',
  'costa de adeje': 'adeje',
  tenerife: 'arona',
  тенерифе: 'arona',
  'playa de las americas': 'arona',
  'los cristianos': 'arona',
  'santa cruz de tenerife': 'santa-cruz-de-tenerife',
  'santa cruz': 'santa-cruz-de-tenerife',
  'la laguna': 'la-laguna',
  laguna: 'la-laguna',
  'puerto de la cruz': 'puerto-de-la-cruz',
  'las palmas': 'las-palmas-de-gran-canaria',
  'las palmas de gran canaria': 'las-palmas-de-gran-canaria',
  'gran canaria': 'las-palmas-de-gran-canaria',
  grancanaria: 'las-palmas-de-gran-canaria',
  maspalomas: 'san-bartolome-de-tirajana',
  'playa del ingles': 'san-bartolome-de-tirajana',
  telde: 'telde',
  arrecife: 'arrecife',
  lanzarote: 'arrecife',
  corralejo: 'corralejo',
  fuerteventura: 'corralejo'
}

/**
 * Берём город для калькулятора из карточки аукциона: название часто только в заголовке,
 * а в location первым идёт район («Centro, Madrid»).
 */
export function pickCityForAuctionCalculator(property = {}) {
  const partsFrom = (s) =>
    String(s || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)

  const blob = `${property.city || ''} ${property.location || ''} ${property.address || ''} ${property.title || ''} ${property.name || ''}`

  for (const { re, slug } of KNOWN_SPAIN_NEEDLES) {
    if (re.some((r) => r.test(blob))) return slug
  }

  const segments = []
  if (property.location) segments.push(...partsFrom(property.location))
  if (property.city != null && String(property.city).trim()) segments.push(...partsFrom(String(property.city).trim()))

  const lookupAlias = (raw) => {
    const trimmed = String(raw || '').trim()
    if (!trimmed) return null
    const asKey = normalizeCityInput(trimmed)
    const fullLower = trimmed.toLowerCase()
    return CITY_ALIAS_MAP[fullLower] || CITY_ALIAS_MAP[asKey] || null
  }

  for (let i = segments.length - 1; i >= 0; i--) {
    const hit = lookupAlias(segments[i])
    if (hit) return hit
  }
  for (const seg of segments) {
    const hit = lookupAlias(seg)
    if (hit) return hit
  }

  for (let i = segments.length - 1; i >= 0; i--) {
    const key = normalizeCityInput(segments[i])
    if (key.length >= 4 && /^[a-z0-9-]+$/.test(key)) return key
  }

  if (segments.length) return normalizeCityInput(segments[0])
  const onlyCity = property.city != null ? normalizeCityInput(String(property.city)) : ''
  return onlyCity || ''
}

export function mapListingToCalculatorData(source = {}) {
  const rawPropertyType = String(source.propertyType || '').toLowerCase()
  const propertyTypeMap = {
    apartment: 'apartment',
    apartamento: 'apartamento',
    house: 'house',
    villa: 'villa',
    commercial: 'commercial',
    land: 'land'
  }

  const propertyType = propertyTypeMap[rawPropertyType] || 'apartment'
  const skipRooms = propertyType === 'land' || propertyType === 'commercial'
  const area = source.area != null && source.area !== '' ? String(source.area) : ''
  let rooms = 'studio'

  if (!skipRooms) {
    const rawRooms = source.rooms ?? source.bedrooms
    const parsedRooms = parseInt(rawRooms, 10)
    if (Number.isFinite(parsedRooms) && parsedRooms > 0) {
      rooms = String(Math.min(parsedRooms, 5))
    } else {
      rooms = 'studio'
    }
  }

  const rawCity = normalizeCityInput(source.city)
  const mappedCity = CITY_ALIAS_MAP[rawCity] || rawCity || 'barcelona'

  return {
    area,
    rooms,
    city: mappedCity,
    district: 'all',
    propertyType,
    street: source.address || source.location || ''
  }
}
