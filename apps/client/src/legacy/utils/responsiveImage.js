function isTransformableUrl(src) {
  if (!src || typeof src !== 'string') return false
  const trimmed = src.trim()
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return false

  try {
    const url = new URL(trimmed, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    return url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/api/uploads/')
  } catch {
    return false
  }
}

function asPositiveInt(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

export function buildOptimizedImageUrl(src, options = {}) {
  if (!isTransformableUrl(src)) return src

  const width = asPositiveInt(options.width)
  const height = asPositiveInt(options.height)
  const quality = asPositiveInt(options.quality) || 72
  const fit = options.fit || 'cover'
  const format = options.format || 'webp'

  try {
    const parsed = new URL(src, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    const uploadsPath = parsed.pathname.startsWith('/api/uploads/')
      ? parsed.pathname.replace(/^\/api/, '')
      : parsed.pathname
    const resizeUrl = new URL('/api/images/resize', parsed.origin)
    resizeUrl.searchParams.set('src', uploadsPath)
    if (width) resizeUrl.searchParams.set('w', String(width))
    if (height) resizeUrl.searchParams.set('h', String(height))
    resizeUrl.searchParams.set('fit', fit)
    resizeUrl.searchParams.set('q', String(quality))
    resizeUrl.searchParams.set('fmt', format)
    return resizeUrl.pathname + resizeUrl.search
  } catch {
    return src
  }
}

export function buildResponsiveImageProps(src, options = {}) {
  const quality = asPositiveInt(options.quality) || 72
  const fit = options.fit || 'crop'
  const format = options.format || 'webp'
  const sizes = options.sizes || '100vw'
  const widths = Array.isArray(options.widths)
    ? [...new Set(options.widths.map(asPositiveInt).filter(Boolean))].sort((a, b) => a - b)
    : []

  if (!isTransformableUrl(src) || widths.length === 0) {
    return { src, loading: 'lazy', decoding: 'async' }
  }

  const largest = widths[widths.length - 1]
  const srcSet = widths
    .map((w) => `${buildOptimizedImageUrl(src, { width: w, quality, fit, format })} ${w}w`)
    .join(', ')

  return {
    src: buildOptimizedImageUrl(src, { width: largest, quality, fit, format }),
    srcSet,
    sizes,
    loading: 'lazy',
    decoding: 'async',
  }
}
