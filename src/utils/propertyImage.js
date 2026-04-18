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

function extractUploadsPath(pathname) {
  if (typeof pathname !== 'string' || !pathname) return ''
  if (pathname.startsWith('/uploads/')) return pathname
  if (pathname.startsWith('/api/uploads/')) return pathname
  return ''
}

/**
 * Абсолютные URL вида http://localhost:3000/uploads/... или https://старый-домен/uploads/...
 * в браузере пользователя не открываются. Переносим путь /uploads/... на origin бэкенда
 * (из VITE_API_BASE_URL при полном URL или с текущего сайта при относительном /api).
 */
function maybeRebaseAbsoluteUploadsUrl(value, baseOrigin) {
  if (!baseOrigin || !value) return null
  if (!/^https?:\/\//i.test(value)) return null
  let targetOrigin = baseOrigin.replace(/\/$/, '')
  try {
    if (/^https?:\/\//i.test(baseOrigin)) {
      targetOrigin = new URL(baseOrigin).origin
    }
  } catch {
    return null
  }
  try {
    const u = new URL(value)
    const uploadsPath = extractUploadsPath(u.pathname)
    if (!uploadsPath) return null
    const localhostish = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(u.hostname)
    if (localhostish || u.origin !== targetOrigin) {
      return `${targetOrigin}${uploadsPath}${u.search || ''}`
    }
  } catch {
    return null
  }
  return null
}

function normalizeImageUrl(raw, baseOrigin) {
  const value = normalizeRawImageValue(raw).trim().replace(/\\/g, '/')
  if (!value) return ''
  const normalizedBase = (baseOrigin || '').replace(/\/$/, '')

  if (
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    if ((value.startsWith('http://') || value.startsWith('https://')) && baseOrigin) {
      const rebased = maybeRebaseAbsoluteUploadsUrl(value, baseOrigin)
      if (rebased) return rebased
    }
    return value
  }

  const uploadsPath = extractUploadsPath(value)
  if (uploadsPath) {
    return `${normalizedBase}${uploadsPath}`
  }

  if (value.startsWith('uploads/')) {
    return `${normalizedBase}/${value}`
  }

  if (value.startsWith('api/uploads/')) {
    return `${normalizedBase}/${value}`
  }

  return `${normalizedBase}/uploads/${value.replace(/^\/+/, '')}`
}

/**
 * Нормализует поля image / images (и photos) для карточек с сервера.
 */
export function normalizePropertyMediaFields(prop) {
  const baseOrigin = getBaseOrigin()
  let list = prop?.images ?? prop?.photos
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list)
    } catch {
      list = list.trim() ? [list] : []
    }
  }
  if (!Array.isArray(list)) list = []

  const normalizedList = list.map((entry) => normalizeImageUrl(entry, baseOrigin)).filter(Boolean)

  let primary = prop?.image
  if (primary && typeof primary === 'object') {
    primary = primary.url || primary.path || primary.src || ''
  }
  const primaryNorm = primary ? normalizeImageUrl(primary, baseOrigin) : ''
  const image = primaryNorm || normalizedList[0] || ''
  const images = normalizedList.length > 0 ? normalizedList : image ? [image] : []
  return { image, images }
}

export function getPropertyCardImage(property, fallbackUrl) {
  if (!property) return fallbackUrl
  const { image } = normalizePropertyMediaFields(property)
  if (image) return image
  const baseOrigin = getBaseOrigin()
  const extras = [property.image_url, property.imageUrl, property.photo_url]
  for (const candidate of extras) {
    const normalized = normalizeImageUrl(candidate, baseOrigin)
    if (normalized) return normalized
  }
  return fallbackUrl
}
