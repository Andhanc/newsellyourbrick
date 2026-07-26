/**
 * CORS allowlist for Expo Web / Android clients.
 * Set CORS_ORIGINS=comma,separated,origins — empty = legacy permissive with warning in production.
 */
export function createCorsOriginChecker() {
  const raw = String(process.env.CORS_ORIGINS || '').trim()
  const allowAllInDev = process.env.NODE_ENV !== 'production' && !raw

  const list = raw
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const checker = function corsOrigin(origin, callback) {
    if (!origin) return callback(null, true)

    if (allowAllInDev) return callback(null, true)

    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('10.0.2.2') ||
      origin.startsWith('exp://')
    ) {
      return callback(null, true)
    }

    if (list.length === 0) {
      if (!checker._warned) {
        console.warn(
          '[CORS] CORS_ORIGINS empty in production — allowing all origins (set allowlist)',
        )
        checker._warned = true
      }
      return callback(null, true)
    }

    const ok = list.some((allowed) => {
      if (origin === allowed) return true
      try {
        const host = new URL(allowed).host
        return origin.includes(host)
      } catch {
        return origin.includes(allowed)
      }
    })

    if (ok) return callback(null, true)
    return callback(new Error(`CORS blocked for origin: ${origin}`), false)
  }

  checker._warned = false
  return checker
}
