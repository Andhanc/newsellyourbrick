const usersCache = new Map()

export async function fetchUserById(apiBaseUrl, userId, options = {}) {
  const { force = false, ttlMs = 20000, includeMeta = false } = options
  const normalizedUserId = String(userId || '').trim()
  if (!/^\d+$/.test(normalizedUserId)) {
    return includeMeta ? { user: null, notFound: false, ok: false } : null
  }

  const key = `${apiBaseUrl || '/api'}::${normalizedUserId}`
  const now = Date.now()
  const cached = usersCache.get(key)

  if (!force && cached?.meta && now - cached.ts < ttlMs) {
    return includeMeta ? cached.meta : cached.meta.user
  }

  if (!force && cached?.promise) {
    const meta = await cached.promise
    return includeMeta ? meta : meta.user
  }

  const requestPromise = (async () => {
    const response = await fetch(`${apiBaseUrl}/users/${normalizedUserId}`)
    if (response.status === 404) {
      return { user: null, notFound: true, ok: false }
    }
    if (!response.ok) {
      return { user: null, notFound: false, ok: false }
    }
    const payload = await response.json().catch(() => null)
    if (!payload?.success || !payload?.data) {
      return { user: null, notFound: false, ok: false }
    }
    return { user: payload.data, notFound: false, ok: true }
  })()

  usersCache.set(key, { ts: now, promise: requestPromise, meta: cached?.meta || null })

  try {
    const meta = await requestPromise
    usersCache.set(key, { ts: Date.now(), promise: null, meta })
    return includeMeta ? meta : meta.user
  } catch {
    const fallback = cached?.meta || { user: null, notFound: false, ok: false }
    usersCache.set(key, { ts: Date.now(), promise: null, meta: fallback })
    return includeMeta ? fallback : fallback.user
  }
}

export function invalidateUserByIdCache(apiBaseUrl, userId) {
  const normalizedUserId = String(userId || '').trim()
  if (!/^\d+$/.test(normalizedUserId)) return
  const key = `${apiBaseUrl || '/api'}::${normalizedUserId}`
  usersCache.delete(key)
}
