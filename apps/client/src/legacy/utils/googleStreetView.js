export function normalizeStreetViewCoordinates(center) {
  if (!Array.isArray(center) || center.length !== 2) return null

  const lat = Number.parseFloat(center[0])
  const lng = Number.parseFloat(center[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
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

  const normalizedLanguage = String(language || '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0]

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
