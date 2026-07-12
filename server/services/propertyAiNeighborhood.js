import { fetchNearbyPlacesForCategory } from './mapNearbyPlacesService.js'

const CATEGORY_LABELS = Object.freeze({
  schools: 'Образование',
  transport: 'Транспорт',
  medical: 'Медицина',
  recreation: 'Отдых и спорт',
  shops: 'Магазины и сервисы',
})

function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export function parsePropertyCoordinates(value) {
  let source = value
  if (typeof source === 'string') {
    const text = source.trim()
    if (!text) return null
    try {
      source = JSON.parse(text)
    } catch {
      source = text.split(',').map((item) => Number.parseFloat(item.trim()))
    }
  }

  const lat = Array.isArray(source) ? Number(source[0]) : Number(source?.lat ?? source?.latitude)
  const lng = Array.isArray(source) ? Number(source[1]) : Number(source?.lng ?? source?.lon ?? source?.longitude)
  return validCoordinates(lat, lng) ? { lat, lng } : null
}

function distanceMeters(origin, place) {
  const toRadians = (degrees) => degrees * Math.PI / 180
  const earthRadius = 6_371_000
  const dLat = toRadians(Number(place.lat) - origin.lat)
  const dLng = toRadians(Number(place.lng) - origin.lng)
  const lat1 = toRadians(origin.lat)
  const lat2 = toRadians(Number(place.lat))
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs)),
  ])
}

export async function enrichPropertyAiNeighborhood(property = {}, overrides = {}) {
  const coordinates = parsePropertyCoordinates(property.coordinates)
  if (!coordinates) return { ...property, nearbyInfrastructure: [] }

  const fetchCategory = overrides.fetchCategory || fetchNearbyPlacesForCategory
  const timeoutMs = Number(overrides.timeoutMs) || 7_000
  const groups = await Promise.all(Object.entries(CATEGORY_LABELS).map(async ([category, label]) => {
    try {
      const places = await withTimeout(fetchCategory(coordinates.lat, coordinates.lng, category, 1500), timeoutMs)
      return {
        category,
        label,
        places: (Array.isArray(places) ? places : []).slice(0, 5).map((place) => ({
          name: String(place.name || label).slice(0, 140),
          distanceMeters: distanceMeters(coordinates, place),
          source: 'OpenStreetMap',
        })),
      }
    } catch {
      return { category, label, places: [] }
    }
  }))

  return {
    ...property,
    coordinates: [coordinates.lat, coordinates.lng],
    nearbyInfrastructure: groups.filter((group) => group.places.length),
  }
}
