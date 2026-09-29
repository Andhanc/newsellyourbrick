const DEFAULT_RADIUS_METERS = 1500
const MAX_PLACES = 25
const CACHE_TTL_MS = 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 8000
const EMPTY_CACHE_TTL_MS = 60 * 1000
const MAX_CACHE_ENTRIES = 1000

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

const CATEGORY_QUERIES = {
  schools: (radius, lat, lng) => `
[out:json][timeout:5];
nwr["amenity"~"^(school|kindergarten|college|university)$"](around:${radius},${lat},${lng});
out body center;
`.trim(),
  transport: (radius, lat, lng) => `
[out:json][timeout:5];
(
  nwr["railway"~"^(station|halt|subway_entrance|tram_stop)$"](around:${radius},${lat},${lng});
  nwr["highway"="bus_stop"](around:${radius},${lat},${lng});
  nwr["public_transport"~"^(stop_position|platform|station)$"](around:${radius},${lat},${lng});
  nwr["amenity"="bus_station"](around:${radius},${lat},${lng});
);
out body center;
`.trim(),
  medical: (radius, lat, lng) => `
[out:json][timeout:5];
nwr["amenity"~"^(hospital|clinic|doctors|pharmacy|dentist)$"](around:${radius},${lat},${lng});
out body center;
`.trim(),
  recreation: (radius, lat, lng) => `
[out:json][timeout:5];
(
  nwr["leisure"~"^(park|playground|garden|sports_centre|fitness_centre|pitch)$"](around:${radius},${lat},${lng});
  nwr["tourism"="attraction"](around:${radius},${lat},${lng});
);
out body center;
`.trim(),
  shops: (radius, lat, lng) => `
[out:json][timeout:5];
(
  nwr["amenity"~"^(supermarket|marketplace|mall|department_store|convenience)$"](around:${radius},${lat},${lng});
  nwr["shop"~"^(supermarket|convenience|mall|department_store|general|bakery|butcher|clothes|hairdresser|beauty|chemist|electronics|hardware|furniture|kiosk|yes)$"](around:${radius},${lat},${lng});
);
out body center;
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

function buildCacheKey(lat, lng, categoryId, radius) {
  return `${categoryId}:${lat.toFixed(5)}:${lng.toFixed(5)}:${radius}`
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

function parseOverpassElements(elements, categoryId, origin) {
  const seen = new Set()
  const places = []

  for (const element of elements || []) {
    const lat = element.lat ?? element.center?.lat
    const lng = element.lon ?? element.center?.lon
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue

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

  // Select the closest results after parsing all geometry types, not the first OSM IDs.
  const distance = (place) => {
    const rad = Math.PI / 180
    return Math.sin((place.lat - origin.lat) * rad / 2) ** 2
      + Math.cos(origin.lat * rad) * Math.cos(place.lat * rad)
      * Math.sin((place.lng - origin.lng) * rad / 2) ** 2
  }
  return places.sort((a, b) => distance(a) - distance(b)).slice(0, MAX_PLACES)
}

// Share one bounded lookup across simultaneous requests for the same area.
export function createNearbyPlacesService({
  fetchImpl = (...args) => fetch(...args),
  now = Date.now,
  timeoutMs = REQUEST_TIMEOUT_MS,
  hedgeDelayMs = 1200,
} = {}) {
  const responseCache = new Map()
  const pending = new Map()

  async function requestOverpass(query) {
    const controller = new AbortController()
    let startFallback
    const fallbackReady = new Promise((resolve) => { startFallback = resolve })
    const hedgeTimer = setTimeout(startFallback, hedgeDelayMs)
    let deadlineTimer
    const deadline = new Promise((_, reject) => {
      deadlineTimer = setTimeout(() => {
        controller.abort()
        reject(new Error('Nearby places lookup timed out'))
      }, timeoutMs)
    })
    const request = async (endpoint) => {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'SellYourBrick/1.0 (property-map-poi)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Overpass request failed (${response.status})`)
      const payload = await response.json()
      // Overpass can return HTTP 200 with a timeout remark and incomplete elements.
      if (!Array.isArray(payload?.elements) || payload.remark) {
        throw new Error('Incomplete Overpass response')
      }
      return payload
    }

    try {
      return await Promise.race([
        deadline,
        Promise.any([
          request(OVERPASS_ENDPOINTS[0]).catch((error) => {
            startFallback()
            throw error
          }),
          fallbackReady.then(() => {
            if (controller.signal.aborted) throw new Error('Lookup finished')
            return request(OVERPASS_ENDPOINTS[1])
          }),
        ]),
      ])
    } finally {
      clearTimeout(deadlineTimer)
      clearTimeout(hedgeTimer)
      controller.abort()
      startFallback()
    }
  }

  return async function fetchCategory(lat, lng, categoryId, radius = DEFAULT_RADIUS_METERS) {
    if (!VALID_CATEGORIES.has(categoryId)) return []
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180
      || !Number.isFinite(radius) || radius < 100 || radius > 5000) {
      throw new Error('Invalid nearby places coordinates or radius')
    }
    const cacheKey = buildCacheKey(lat, lng, categoryId, radius)
    const cached = responseCache.get(cacheKey)
    if (cached && cached.expiresAt > now()) return cached.places
    responseCache.delete(cacheKey)
    if (pending.has(cacheKey)) return pending.get(cacheKey)

    const lookup = requestOverpass(CATEGORY_QUERIES[categoryId](radius, lat, lng))
      .then((payload) => {
        const places = parseOverpassElements(payload.elements, categoryId, { lat, lng })
        if (responseCache.size >= MAX_CACHE_ENTRIES) responseCache.delete(responseCache.keys().next().value)
        responseCache.set(cacheKey, {
          expiresAt: now() + (places.length ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS),
          places,
        })
        return places
      })
      .finally(() => pending.delete(cacheKey))
    pending.set(cacheKey, lookup)
    return lookup
  }
}

export const fetchNearbyPlacesForCategory = createNearbyPlacesService()
