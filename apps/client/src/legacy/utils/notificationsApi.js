import { getApiBaseUrl } from './apiConfig'

const notificationsCache = new Map()

function parseNotificationData(notification) {
  if (notification?.data && typeof notification.data === 'string') {
    try {
      return { ...notification, data: JSON.parse(notification.data) }
    } catch {
      return notification
    }
  }
  return notification
}

export async function fetchUserNotifications(userId, options = {}) {
  const { force = false, ttlMs = 15000 } = options
  const normalizedUserId = String(userId || '').trim()
  if (!/^\d+$/.test(normalizedUserId)) return []

  const now = Date.now()
  const cached = notificationsCache.get(normalizedUserId)

  if (!force && cached?.data && now - cached.ts < ttlMs) {
    return cached.data
  }

  if (!force && cached?.promise) {
    return cached.promise
  }

  const requestPromise = (async () => {
    const apiBaseUrl = await getApiBaseUrl()
    const response = await fetch(`${apiBaseUrl}/notifications/user/${normalizedUserId}`)
    if (!response.ok) return []
    const payload = await response.json().catch(() => null)
    if (!payload?.success || !Array.isArray(payload.data)) return []
    return payload.data.map(parseNotificationData)
  })()

  notificationsCache.set(normalizedUserId, { ts: now, promise: requestPromise, data: cached?.data || null })

  try {
    const data = await requestPromise
    notificationsCache.set(normalizedUserId, { ts: Date.now(), data, promise: null })
    return data
  } catch {
    notificationsCache.set(normalizedUserId, { ts: Date.now(), data: cached?.data || [], promise: null })
    return cached?.data || []
  }
}

export function invalidateUserNotificationsCache(userId) {
  const normalizedUserId = String(userId || '').trim()
  if (!normalizedUserId) return
  notificationsCache.delete(normalizedUserId)
}
