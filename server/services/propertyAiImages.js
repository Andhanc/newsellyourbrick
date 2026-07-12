function unwrapImageEntry(entry) {
  if (entry == null) return []
  if (Array.isArray(entry)) return entry.flatMap(unwrapImageEntry)
  if (typeof entry === 'object') {
    return unwrapImageEntry(entry.url ?? entry.path ?? entry.src ?? entry.photo_url ?? entry.image_url ?? entry.image ?? '')
  }
  if (typeof entry !== 'string') return []

  const value = entry.trim().replace(/\\/g, '/')
  if (!value) return []
  if (/^[\[{]/.test(value)) {
    try {
      return unwrapImageEntry(JSON.parse(value))
    } catch {
      return []
    }
  }
  if (value.includes(',') && !/^data:/i.test(value)) {
    return value.split(',').flatMap(unwrapImageEntry)
  }
  return [value]
}

function safeImage(value) {
  if (/^https:\/\//i.test(value)) return value
  if (/^\/(?:uploads|images)\//i.test(value)) return value
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(value)) return value
  return ''
}

export function normalizePropertyAiImages(values) {
  const seen = new Set()
  const images = []
  for (const value of unwrapImageEntry(values)) {
    const image = safeImage(value)
    if (image && !seen.has(image)) {
      seen.add(image)
      images.push(image)
    }
  }
  return images
}

export function propertyAiMediaBaseUrl(env = process.env) {
  const configured = String(env.FRONTEND_URL || env.PUBLIC_SITE_URL || env.SITE_URL || '').trim()
  const fallbackPort = String(env.PORT || env.SERVER_PORT || '3000').trim()
  const base = configured || `http://127.0.0.1:${fallbackPort}`
  return `${base.replace(/\/+$/, '')}/`
}

export function resolvePropertyAiImageUrl(value, baseUrl = propertyAiMediaBaseUrl()) {
  const image = safeImage(String(value || '').trim())
  if (!image) return ''
  if (/^(?:https:|data:)/i.test(image)) return image
  try {
    return new URL(image, baseUrl).toString()
  } catch {
    return ''
  }
}
