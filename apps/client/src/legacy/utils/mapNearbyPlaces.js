const DEFAULT_RADIUS_METERS = 1500
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 900

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]

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

const clientCache = new Map()

const QUERY_BUILDERS = {
  schools: (r, la, ln) => `[out:json][timeout:12];node["amenity"~"^(school|kindergarten|college|university)$"](around:${r},${la},${ln});out body 25;`,
  transport: (r, la, ln) => `[out:json][timeout:12];(node["railway"~"^(station|halt|subway_entrance)$"](around:${r},${la},${ln});node["highway"="bus_stop"](around:${r},${la},${ln});node["public_transport"="stop_position"](around:${r},${la},${ln});node["amenity"="bus_station"](around:${r},${la},${ln}););out body 25;`,
  medical: (r, la, ln) => `[out:json][timeout:12];node["amenity"~"^(hospital|clinic|doctors|pharmacy|dentist)$"](around:${r},${la},${ln});out body 25;`,
  recreation: (r, la, ln) => `[out:json][timeout:12];(node["leisure"~"^(park|playground|garden|sports_centre|fitness_centre|pitch)$"](around:${r},${la},${ln});node["tourism"="attraction"](around:${r},${la},${ln}););out body 25;`,
  shops: (r, la, ln) => `[out:json][timeout:12];(node["amenity"~"^(supermarket|marketplace|mall|department_store|convenience)$"](around:${r},${la},${ln});node["shop"~"^(supermarket|convenience|mall|department_store|general|bakery|butcher|clothes|hairdresser|beauty|chemist|electronics|hardware|furniture|kiosk|yes)$"](around:${r},${la},${ln}););out body 25;`,
}

const DEFAULT_NAMES = {
  schools: 'Учебное заведение',
  transport: 'Остановка',
  medical: 'Медицинское учреждение',
  recreation: 'Зона отдыха',
  shops: 'Магазин',
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function buildCacheKey(lat, lng, categoryId) {
  return `${categoryId}:${lat.toFixed(4)}:${lng.toFixed(4)}`
}

function getApiBase() {
  const envBase = import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL || ''
  if (envBase) return envBase.replace(/\/$/, '')
  if (typeof window !== 'undefined') return ''
  return ''
}

function getPlaceName(tags = {}, categoryId) {
  return (
    tags.name ||
    tags['name:ru'] ||
    tags['name:en'] ||
    tags['name:be'] ||
    tags.operator ||
    DEFAULT_NAMES[categoryId] ||
    'Объект'
  )
}

function parseOverpassElements(elements, categoryId) {
  const seen = new Set()
  const places = []

  for (const element of elements || []) {
    const la = element.lat ?? element.center?.lat
    const ln = element.lon ?? element.center?.lon
    if (la == null || ln == null) continue

    const key = `${element.type}/${element.id}`
    if (seen.has(key)) continue
    seen.add(key)

    places.push({
      id: key,
      lat: la,
      lng: ln,
      name: getPlaceName(element.tags, categoryId),
      category: categoryId,
    })
  }

  return places.slice(0, 25)
}

async function fetchFromServer(lat, lng, categoryId) {
  const base = getApiBase()
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    category: categoryId,
  })
  const url = `${base}/api/map/nearby-places?${params.toString()}`
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Nearby places API failed (${response.status})`)
  }

  const payload = await response.json()
  if (!payload?.success || !Array.isArray(payload?.data?.places)) {
    throw new Error('Invalid nearby places response')
  }

  return payload.data.places
}

async function fetchFromOverpassBrowser(lat, lng, categoryId, radius = DEFAULT_RADIUS_METERS) {
  const buildQuery = QUERY_BUILDERS[categoryId]
  if (!buildQuery) return []

  const query = buildQuery(radius, lat, lng)
  let lastError = null

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: `data=${encodeURIComponent(query)}`,
        })

        if (!response.ok) {
          throw new Error(`Overpass request failed (${response.status})`)
        }

        const payload = await response.json()
        return parseOverpassElements(payload.elements, categoryId)
      } catch (error) {
        lastError = error
        await sleep(700 * (attempt + 1))
      }
    }
  }

  throw lastError || new Error('Overpass request failed')
}

async function fetchNearbyPlacesOnce(lat, lng, categoryId, radius = DEFAULT_RADIUS_METERS) {
  try {
    return await fetchFromServer(lat, lng, categoryId)
  } catch {
    return fetchFromOverpassBrowser(lat, lng, categoryId, radius)
  }
}

export function getMapPoiCategory(categoryId) {
  return MAP_POI_CATEGORIES.find((category) => category.id === categoryId) || null
}

export async function fetchNearbyPlaces(lat, lng, categoryId, radius = DEFAULT_RADIUS_METERS) {
  const cacheKey = buildCacheKey(lat, lng, categoryId)
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)
  }

  let lastError = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const places = await fetchNearbyPlacesOnce(lat, lng, categoryId, radius)
      clientCache.set(cacheKey, places)
      return places
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
      }
    }
  }

  throw lastError || new Error('Failed to load nearby places')
}
