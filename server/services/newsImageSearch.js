const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1520106212296-df2701f1c794?w=1400&h=700&fit=crop&q=80',
  'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1400&h=700&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&h=700&fit=crop&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&h=700&fit=crop&q=80',
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1400&h=700&fit=crop&q=80',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1400&h=700&fit=crop&q=80',
]

function hashQuery(q) {
  let h = 0
  const s = String(q || 'travel')
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function fallbackImage(query) {
  return FALLBACK_PHOTOS[hashQuery(query) % FALLBACK_PHOTOS.length]
}

function formatPhotoUrl(raw) {
  if (!raw) return ''
  return `${raw}${raw.includes('?') ? '&' : '?'}w=1400&h=700&fit=crop&q=80`
}

async function fetchUnsplashResults(query, perPage) {
  const q = String(query || 'travel destination').trim().slice(0, 120)
  const accessKey = String(process.env.UNSPLASH_ACCESS_KEY || '').trim()
  if (!accessKey) return []

  try {
    const url = new URL('https://api.unsplash.com/search/photos')
    url.searchParams.set('query', q)
    url.searchParams.set('per_page', String(Math.min(Math.max(perPage, 1), 10)))
    url.searchParams.set('orientation', 'landscape')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return []

    const data = await res.json()
    const results = Array.isArray(data?.results) ? data.results : []
    return results
      .map((photo) => formatPhotoUrl(photo?.urls?.regular || photo?.urls?.full || photo?.urls?.small))
      .filter(Boolean)
  } catch (err) {
    console.warn('[newsImageSearch] Unsplash API:', err?.message || err)
    return []
  }
}

/**
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<string[]>}
 */
export async function searchNewsCoverImages(query, { limit = 6 } = {}) {
  const q = String(query || 'travel destination').trim().slice(0, 120)
  const fromApi = await fetchUnsplashResults(q, limit)
  if (fromApi.length) return [...new Set(fromApi)].slice(0, limit)

  const start = hashQuery(q) % FALLBACK_PHOTOS.length
  const out = []
  for (let i = 0; i < Math.min(limit, FALLBACK_PHOTOS.length); i += 1) {
    out.push(FALLBACK_PHOTOS[(start + i) % FALLBACK_PHOTOS.length])
  }
  return out
}

/**
 * @param {string} query — ключевые слова на английском для поиска
 * @returns {Promise<string>} URL обложки
 */
export async function findNewsCoverImage(query) {
  const images = await searchNewsCoverImages(query, { limit: 1 })
  return images[0] || fallbackImage(query)
}
