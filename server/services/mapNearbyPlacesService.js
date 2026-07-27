import axios from 'axios'

const DEFAULT_RADIUS_METERS = 1500
const MAX_PLACES = 25
const CACHE_TTL_MS = 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 18000

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]

const responseCache = new Map()

const CATEGORY_QUERIES = {
  schools: (radius, lat, lng) => `
[out:json][timeout:12];
node["amenity"~"^(school|kindergarten|college|university)$"](around:${radius},${lat},${lng});
out body ${MAX_PLACES};
`.trim(),
  transport: (radius, lat, lng) => `
[out:json][timeout:12];
(
  node["railway"~"^(station|halt|subway_entrance)$"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
  node["public_transport"="stop_position"](around:${radius},${lat},${lng});
  node["amenity"="bus_station"](around:${radius},${lat},${lng});
);
out body ${MAX_PLACES};
`.trim(),
  medical: (radius, lat, lng) => `
[out:json][timeout:12];
node["amenity"~"^(hospital|clinic|doctors|pharmacy|dentist)$"](around:${radius},${lat},${lng});
out body ${MAX_PLACES};
`.trim(),
  recreation: (radius, lat, lng) => `
[out:json][timeout:12];
(
  node["leisure"~"^(park|playground|garden|sports_centre|fitness_centre|pitch)$"](around:${radius},${lat},${lng});
  node["tourism"="attraction"](around:${radius},${lat},${lng});
);
out body ${MAX_PLACES};
`.trim(),
  shops: (radius, lat, lng) => `
[out:json][timeout:12];
(
  node["amenity"~"^(supermarket|marketplace|mall|department_store|convenience)$"](around:${radius},${lat},${lng});
  node["shop"~"^(supermarket|convenience|mall|department_store|general|bakery|butcher|clothes|hairdresser|beauty|chemist|electronics|hardware|furniture|kiosk|yes)$"](around:${radius},${lat},${lng});
);
out body ${MAX_PLACES};
`.trim(),
}

const DEFAULT_NAMES = {
  schools: 'Учебное заведение',
  transport: 'Остановка',
  medical: 'Медицинское учреждение',
  recreation: 'Зона отдыха',
  shops: 'Магазин',
}

const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_QUERIES))

function buildCacheKey(lat, lng, categoryId) {
  return `${categoryId}:${lat.toFixed(3)}:${lng.toFixed(3)}`
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
    const lat = element.lat ?? element.center?.lat
    const lng = element.lon ?? element.center?.lon
    if (lat == null || lng == null) continue

    const key = `${element.type}/${element.id}`
    if (seen.has(key)) continue
    seen.add(key)

    places.push({
      id: key,
      lat,
      lng,
      name: getPlaceName(element.tags, categoryId),
      category: categoryId,
    })
  }

  return places.slice(0, MAX_PLACES)
}

function readCache(cacheKey) {
  const entry = responseCache.get(cacheKey)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    responseCache.delete(cacheKey)
    return null
  }
  return entry.places
}

function writeCache(cacheKey, places) {
  responseCache.set(cacheKey, { ts: Date.now(), places })
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function requestOverpass(query) {
  let lastError = null

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await axios.post(endpoint, `data=${encodeURIComponent(query)}`, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': 'SellYourBrick/1.0 (property-map-poi)',
          },
          timeout: REQUEST_TIMEOUT_MS,
          validateStatus: (status) => status >= 200 && status < 300,
        })

        if (response.data?.elements) {
          return response.data
        }

        lastError = new Error('Invalid Overpass payload')
      } catch (error) {
        lastError = error
        const status = error.response?.status
        if (status === 429 || status === 504 || status === 502 || status === 503) {
          await sleep(700 * (attempt + 1))
          continue
        }
      }
    }
  }

  throw lastError || new Error('Overpass request failed')
}

export async function fetchNearbyPlacesForCategory(lat, lng, categoryId, radius = DEFAULT_RADIUS_METERS) {
  if (!VALID_CATEGORIES.has(categoryId)) {
    return []
  }

  const cacheKey = buildCacheKey(lat, lng, categoryId)
  const cached = readCache(cacheKey)
  if (cached) return cached

  const buildQuery = CATEGORY_QUERIES[categoryId]
  const query = buildQuery(radius, lat, lng)
  const payload = await requestOverpass(query)
  const places = parseOverpassElements(payload.elements, categoryId)

  writeCache(cacheKey, places)
  return places
}
