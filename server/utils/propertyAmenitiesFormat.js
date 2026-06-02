import { TZ_AMENITY_LABELS_RU, getAmenityLabelRu } from '../../src/utils/tzAmenityLabels.js'

export { TZ_AMENITY_LABELS_RU, getAmenityLabelRu }

const LEGACY_BOOLEAN_KEYS = [
  'balcony',
  'parking',
  'elevator',
  'garage',
  'pool',
  'garden',
  'electricity',
  'internet',
  'security',
  'furniture',
]

function parseJsonArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value == null || value === '') return []
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

export function parseTzAmenitiesJson(value) {
  return parseJsonArray(value)
}

export function collectAmenityKeys(property) {
  if (!property) return []
  const keys = new Set()

  parseJsonArray(property.amenities).forEach((k) => keys.add(k))
  parseTzAmenitiesJson(property.tz_amenities_json).forEach((k) => keys.add(k))

  LEGACY_BOOLEAN_KEYS.forEach((key) => {
    const v = property[key]
    if (v === 1 || v === true || v === '1') keys.add(key)
  })

  for (let i = 1; i <= 26; i++) {
    const featureKey = `feature${i}`
    const v = property[featureKey]
    if (v === 1 || v === true || v === '1') keys.add(featureKey)
  }

  return Array.from(keys)
}

export function amenitiesKeysToJsonString(keys) {
  return JSON.stringify(keys || [])
}

/** Нормализует объект для API: amenities[], tz_amenities_json, legacy-флаги */
export function applyFormattedPropertyAmenities(formatted) {
  if (!formatted || typeof formatted !== 'object') return formatted

  const tzParsed = parseTzAmenitiesJson(formatted.tz_amenities_json)
  formatted.tz_amenities_json = tzParsed

  const keys = collectAmenityKeys(formatted)
  formatted.amenities = keys

  formatted.balcony = keys.includes('balcony') ? 1 : 0
  formatted.parking =
    keys.includes('parking') ||
    keys.includes('covered_parking') ||
    keys.includes('open_parking') ||
    keys.includes('underground_parking') ||
    keys.includes('private_garage') ||
    keys.includes('surface_parking')
      ? 1
      : 0
  formatted.elevator = keys.includes('elevator') ? 1 : 0
  formatted.electricity =
    keys.includes('electricity') || keys.includes('air_conditioning') ? 1 : 0
  formatted.internet =
    keys.includes('internet') || keys.includes('fibre_internet') ? 1 : 0
  formatted.security =
    keys.includes('security') || keys.includes('security_24_7') ? 1 : 0
  formatted.furniture = keys.includes('furniture') ? 1 : 0

  for (let i = 1; i <= 26; i++) {
    const featureKey = `feature${i}`
    formatted[featureKey] = keys.includes(featureKey) ? 1 : 0
  }

  if (formatted.property_type === 'house' || formatted.property_type === 'villa') {
    formatted.pool = keys.includes('pool') || keys.includes('pool_private') || keys.includes('pool_communal') ? 1 : 0
    formatted.garden = keys.includes('garden') ? 1 : 0
    formatted.garage = keys.includes('garage') || keys.includes('private_garage') ? 1 : 0
  }

  return formatted
}

export function formatAmenitiesListForCompare(keys) {
  if (!keys?.length) return 'Не указано'
  return keys.map((k) => getAmenityLabelRu(k)).join(', ')
}
