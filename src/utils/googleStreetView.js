export function normalizeStreetViewCoordinates(center) {
  if (!Array.isArray(center) || center.length !== 2) return null

  const lat = Number.parseFloat(center[0])
  const lng = Number.parseFloat(center[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}

function normalizeEmbedLanguage(language) {
  return String(language || '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0]
}

function encodeGoogleMapsPinLabel(lat, lng) {
  const label = `${lat} ${lng}`
  const encoded = typeof btoa === 'function'
    ? btoa(label)
    : Buffer.from(label, 'utf8').toString('base64')
  return encoded.replace(/=+$/g, '')
}

export function buildGoogleStreetViewEmbedUrl({
  center,
  apiKey,
  language,
  radius = 120,
} = {}) {
  const coords = normalizeStreetViewCoordinates(center)
  const normalizedKey = String(apiKey || '').trim()
  if (!coords) return ''

  const normalizedLanguage = normalizeEmbedLanguage(language)

  if (!normalizedKey) {
    const panoramaPayload = `!6m6!1m5!2m2!1d${coords.lat}!2d${coords.lng}!4f-0!5f1`
    const languageParam = /^[a-z]{2,3}$/.test(normalizedLanguage)
      ? `&hl=${normalizedLanguage}`
      : ''
    return `https://www.google.com/maps/embed?origin=mfe&pb=${panoramaPayload}${languageParam}`
  }

  const params = new URLSearchParams({
    key: normalizedKey,
    location: `${coords.lat},${coords.lng}`,
    radius: String(Math.max(0, Math.round(Number(radius) || 0))),
    source: 'outdoor',
    fov: '80',
    pitch: '0',
  })

  if (/^[a-z]{2,3}$/.test(normalizedLanguage)) {
    params.set('language', normalizedLanguage)
  }

  return `https://www.google.com/maps/embed/v1/streetview?${params.toString()}`
}

export function buildGoogleSatelliteEmbedUrl({
  center,
  apiKey,
  language,
  zoom = 18,
} = {}) {
  const coords = normalizeStreetViewCoordinates(center)
  const normalizedKey = String(apiKey || '').trim()
  if (!coords) return ''

  const normalizedLanguage = normalizeEmbedLanguage(language)
  const normalizedZoom = Math.min(21, Math.max(1, Math.round(Number(zoom) || 18)))

  if (!normalizedKey) {
    const pinLabel = encodeGoogleMapsPinLabel(coords.lat, coords.lng)
    const payload = `!1m18!1m12!1m3!1d1500!2d${coords.lng}!3d${coords.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0:0x0!2z${pinLabel}!5e1`
    const languageParam = /^[a-z]{2,3}$/.test(normalizedLanguage)
      ? `&hl=${normalizedLanguage}`
      : ''
    return `https://www.google.com/maps/embed?origin=mfe&pb=${payload}${languageParam}`
  }

  const params = new URLSearchParams({
    key: normalizedKey,
    q: `${coords.lat},${coords.lng}`,
    zoom: String(normalizedZoom),
    maptype: 'satellite',
  })

  if (/^[a-z]{2,3}$/.test(normalizedLanguage)) {
    params.set('language', normalizedLanguage)
  }

  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`
}
