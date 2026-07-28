const favoritesCache = new Map()

export async function fetchUserFavorites(apiBaseUrl, userId, options = {}) {
  const { force = false, ttlMs = 20000 } = options
  const uid = String(userId || '').trim()
  if (!/^\d+$/.test(uid)) return []

  const key = `${apiBaseUrl || '/api'}::${uid}`
  const now = Date.now()
  const cached = favoritesCache.get(key)

  if (!force && cached?.data && now - cached.ts < ttlMs) return cached.data
  if (!force && cached?.promise) return cached.promise

  const requestPromise = (async () => {
    const res = await fetch(`${apiBaseUrl}/users/${uid}/favorites`)
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.success || !Array.isArray(json.data)) return []
    return json.data
  })()

  favoritesCache.set(key, { ts: now, promise: requestPromise, data: cached?.data || [] })

  try {
    const data = await requestPromise
    favoritesCache.set(key, { ts: Date.now(), promise: null, data })
    return data
  } catch {
    const fallback = cached?.data || []
    favoritesCache.set(key, { ts: Date.now(), promise: null, data: fallback })
    return fallback
  }
}

export function invalidateUserFavoritesCache(apiBaseUrl, userId) {
  const uid = String(userId || '').trim()
  if (!/^\d+$/.test(uid)) return
  const key = `${apiBaseUrl || '/api'}::${uid}`
  favoritesCache.delete(key)
}
