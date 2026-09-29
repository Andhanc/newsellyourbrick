const DEFAULT_RADIUS_METERS = 1500
const REQUEST_TIMEOUT_MS = 10000
const CACHE_TTL_MS = 60 * 60 * 1000
const EMPTY_CACHE_TTL_MS = 60 * 1000
const MAX_CACHE_ENTRIES = 300

export const MAP_POI_CATEGORIES = [
  {
    id: 'schools',
    labelKey: 'propertyDetailMapSchools',
    color: '#2563eb',
    softColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  {
    id: 'transport',
    labelKey: 'propertyDetailMapTransport',
    color: '#7c3aed',
    softColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  {
    id: 'medical',
    labelKey: 'propertyDetailMapMedical',
    color: '#e11d48',
    softColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  {
    id: 'recreation',
    labelKey: 'propertyDetailMapRecreation',
    color: '#007d8a',
    softColor: '#e6f6f8',
    borderColor: '#cce9ed',
  },
  {
    id: 'shops',
    labelKey: 'propertyDetailMapShops',
    color: '#d97706',
    softColor: '#fffbeb',
    borderColor: '#fde68a',
  },
]

function getApiBase() {
  const envBase = import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL || ''
  return envBase.replace(/\/$/, '')
}

export function getMapPoiCategory(categoryId) {
  return MAP_POI_CATEGORIES.find((category) => category.id === categoryId) || null
}

export function createNearbyPlacesClient({
  fetchImpl = (...args) => fetch(...args),
  now = Date.now,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  const cache = new Map()
  const pending = new Map()

  async function request(lat, lng, category, radius) {
    const controller = new AbortController()
    let timer
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort()
        reject(new Error('Nearby places request timed out'))
      }, timeoutMs)
    })
    const load = async () => {
      const params = new URLSearchParams({ lat, lng, category, radius })
      const response = await fetchImpl(`${getApiBase()}/api/map/nearby-places?${params}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Nearby places API failed (${response.status})`)
      const payload = await response.json()
      if (!payload?.success || !Array.isArray(payload?.data?.places)) {
        throw new Error('Invalid nearby places response')
      }
      return payload.data.places
    }
    try {
      // The server owns failover. Do not multiply its requests with browser retries.
      return await Promise.race([load(), deadline])
    } finally {
      clearTimeout(timer)
      controller.abort()
    }
  }

  return async function fetchPlaces(lat, lng, category, radius = DEFAULT_RADIUS_METERS) {
    if (!getMapPoiCategory(category)) return []
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180
      || !Number.isFinite(radius) || radius < 100 || radius > 5000) {
      throw new Error('Invalid nearby places coordinates or radius')
    }
    const key = `${category}:${lat.toFixed(5)}:${lng.toFixed(5)}:${radius}`
    const cached = cache.get(key)
    if (cached && cached.expiresAt > now()) return cached.places
    cache.delete(key)
    if (pending.has(key)) return pending.get(key)

    const lookup = request(lat, lng, category, radius).then((places) => {
      if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value)
      cache.set(key, { places, expiresAt: now() + (places.length ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS) })
      return places
    }).finally(() => pending.delete(key))
    pending.set(key, lookup)
    return lookup
  }
}

export const fetchNearbyPlaces = createNearbyPlacesClient()
