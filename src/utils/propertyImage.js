function getBaseOrigin() {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').trim()
  if (/^https?:\/\//i.test(apiBase)) {
    try {
      return new URL(apiBase).origin
    } catch {
      // ignore malformed env value, fallback below
    }
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

function normalizeRawImageValue(value) {
  if (!value) return ''
  if (typeof value === 'object') {
    const maybeUrl = value.url || value.path || value.image || value.src || ''
    return typeof maybeUrl === 'string' ? maybeUrl : ''
  }
  return typeof value === 'string' ? value : ''
}

function normalizeImageUrl(raw, baseOrigin) {
  const value = normalizeRawImageValue(raw).trim().replace(/\\/g, '/')
  if (!value) return ''

  if (
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return value
  }

  if (value.startsWith('/uploads/')) {
    return `${baseOrigin}${value}`
  }

  if (value.startsWith('uploads/')) {
    return `${baseOrigin}/${value}`
  }

  return `${baseOrigin}/uploads/${value.replace(/^\/+/, '')}`
}

export function getPropertyCardImage(property, fallbackUrl) {
  const baseOrigin = getBaseOrigin()

  let images = property?.images
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images)
    } catch {
      images = [images]
    }
  }

  const candidates = [
    Array.isArray(images) ? images[0] : images,
    property?.image,
    property?.image_url,
    property?.imageUrl,
    property?.photo_url,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate, baseOrigin)
    if (normalized) return normalized
  }

  return fallbackUrl
}
