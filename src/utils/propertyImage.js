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
    const maybeUrl =
      value.url ||
      value.path ||
      value.image ||
      value.src ||
      value.photo_url ||
      value.image_url ||
      value.secure_url ||
      value.file_url ||
      value.filename ||
      value.name ||
      ''
    return typeof maybeUrl === 'string' ? maybeUrl : ''
  }
  return typeof value === 'string' ? value : ''
}

function extractUploadsPath(pathname) {
  if (typeof pathname !== 'string' || !pathname) return ''
  if (pathname.startsWith('/uploads/')) return pathname
  if (pathname.startsWith('/api/uploads/')) return pathname.replace(/^\/api/, '')
  return ''
}

function parseImageList(raw) {
  if (Array.isArray(raw)) return raw
  if (raw == null) return []
  if (typeof raw !== 'string') return []
  const t = raw.trim()
  if (!t) return []
  try {
    const parsed = JSON.parse(t)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.photos)) return parsed.photos
      if (Array.isArray(parsed.images)) return parsed.images
      const one = normalizeRawImageValue(parsed)
      return one ? [one] : []
    }
    return typeof parsed === 'string' && parsed.trim() ? [parsed] : []
  } catch {
    // legacy format: "a.jpg,b.jpg" or "a.jpg; b.jpg"
  }
  if (t.includes(',') || t.includes(';')) {
    return t
      .split(/[;,]/)
      .map((part) => part.trim())
      .filter(Boolean)
  }
  return [t]
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
  const value = normalizeRawImageValue(raw)
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\\/g, '/')
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
  const imagesList = parseImageList(prop?.images)
  const photosList = parseImageList(prop?.photos)

  // Если images пустой, используем photos как источник карточек
  const list = imagesList.length > 0 ? imagesList : photosList

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
