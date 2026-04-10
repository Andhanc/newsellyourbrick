const depositCache = new Map()

export async function fetchUserDeposit(apiBaseUrl, userId, options = {}) {
  const { force = false, ttlMs = 15000 } = options
  const uid = String(userId || '').trim()
  if (!/^\d+$/.test(uid)) return null

  const key = `${apiBaseUrl || '/api'}::${uid}`
  const now = Date.now()
  const cached = depositCache.get(key)

  if (!force && cached?.data && now - cached.ts < ttlMs) return cached.data
  if (!force && cached?.promise) return cached.promise

  const requestPromise = (async () => {
    const response = await fetch(`${apiBaseUrl}/users/${uid}/deposit`)
    if (!response.ok) return null
    const data = await response.json().catch(() => null)
    if (!data?.success) return null
    return data.data || null
  })()

  depositCache.set(key, { ts: now, promise: requestPromise, data: cached?.data || null })

  try {
    const data = await requestPromise
    depositCache.set(key, { ts: Date.now(), promise: null, data })
    return data
  } catch {
    const fallback = cached?.data || null
    depositCache.set(key, { ts: Date.now(), promise: null, data: fallback })
    return fallback
  }
}

export function invalidateUserDepositCache(apiBaseUrl, userId) {
  const uid = String(userId || '').trim()
  if (!/^\d+$/.test(uid)) return
  const key = `${apiBaseUrl || '/api'}::${uid}`
  depositCache.delete(key)
}
