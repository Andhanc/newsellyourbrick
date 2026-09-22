const eligibilityCache = new Map()

function guestResult() {
  return { has_deposit: false, can_request: false }
}

export async function fetchTestDriveEligibility(
  apiBaseUrl,
  { propertyKey, userId, propertyTable, force = false, ttlMs = 15000 } = {},
) {
  const uid = String(userId || '').trim()
  const keyPart = String(propertyKey || '').trim()
  if (!keyPart || !/^\d+$/.test(uid)) return guestResult()

  const table = propertyTable || 'properties_apartments'
  const origin = String(apiBaseUrl || '/api').replace(/\/$/, '')
  const cacheKey = `${origin}::${keyPart}::${uid}::${table}`
  const now = Date.now()
  const cached = eligibilityCache.get(cacheKey)

  if (!force && cached?.data && now - cached.ts < ttlMs) return cached.data
  if (!force && cached?.promise) return cached.promise

  const requestPromise = (async () => {
    const q = new URLSearchParams({
      user_id: uid,
      property_table: table,
    })
    const response = await fetch(
      `${origin}/properties/${encodeURIComponent(keyPart)}/test-drive/eligibility?${q.toString()}`,
    )
    if (!response.ok) return guestResult()
    const json = await response.json().catch(() => null)
    if (!json?.success || !json.data) return guestResult()
    return {
      has_deposit: Boolean(json.data.has_deposit),
      can_request: Boolean(json.data.can_request),
    }
  })()

  eligibilityCache.set(cacheKey, { ts: now, promise: requestPromise, data: cached?.data || null })

  try {
    const data = await requestPromise
    eligibilityCache.set(cacheKey, { ts: Date.now(), promise: null, data })
    return data
  } catch {
    const fallback = cached?.data || guestResult()
    eligibilityCache.set(cacheKey, { ts: Date.now(), promise: null, data: fallback })
    return fallback
  }
}

export function invalidateTestDriveEligibilityCache() {
  eligibilityCache.clear()
}
