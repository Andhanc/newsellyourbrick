const verificationStatusCache = new Map()

export async function fetchVerificationStatus(apiBaseUrl, userId, options = {}) {
  const { force = false, ttlMs = 20000 } = options
  const normalizedUserId = String(userId || '').trim()
  if (!/^\d+$/.test(normalizedUserId)) return null

  const key = `${apiBaseUrl || '/api'}::${normalizedUserId}`
  const now = Date.now()
  const cached = verificationStatusCache.get(key)

  if (!force && cached?.data && now - cached.ts < ttlMs) {
    return cached.data
  }

  if (!force && cached?.promise) {
    return cached.promise
  }

  const requestPromise = (async () => {
    const response = await fetch(`${apiBaseUrl}/users/${normalizedUserId}/verification-status`)
    if (!response.ok) return null
    const result = await response.json().catch(() => null)
    if (!result?.success || !result?.data) return null
    return result.data
  })()

  verificationStatusCache.set(key, { ts: now, promise: requestPromise, data: cached?.data || null })

  try {
    const data = await requestPromise
    verificationStatusCache.set(key, { ts: Date.now(), promise: null, data })
    return data
  } catch {
    verificationStatusCache.set(key, { ts: Date.now(), promise: null, data: cached?.data || null })
    return cached?.data || null
  }
}

export function invalidateVerificationStatusCache(apiBaseUrl, userId) {
  const normalizedUserId = String(userId || '').trim()
  if (!/^\d+$/.test(normalizedUserId)) return
  const key = `${apiBaseUrl || '/api'}::${normalizedUserId}`
  verificationStatusCache.delete(key)
}
