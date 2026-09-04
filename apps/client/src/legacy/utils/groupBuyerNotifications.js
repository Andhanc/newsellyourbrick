const ACTION_TYPES = new Set([
  'payment_deadline',
  'auction_won',
  'buy_now_approved',
  'verification_rejected',
  'test_drive_request',
  'test_drive_survey',
])

const ROUTE_PREFIXES = [
  '/property/',
  '/auction',
  '/profile',
  '/deposit',
  '/wallet',
  '/compare',
  '/calculator',
  '/favorites',
  '/subscriptions',
  '/test-drive',
]

export function safeNotificationRoute(route) {
  if (typeof route !== 'string') return null
  const value = route.trim()
  if (!value.startsWith('/') || value.startsWith('//') || /[\u0000-\u001f]/.test(value)) return null
  return ROUTE_PREFIXES.some((prefix) => value === prefix || value.startsWith(prefix)) ? value : null
}

function createdTime(notification) {
  const value = notification?.created_at ?? notification?.createdAt ?? notification?.date
  const parsed = value ? new Date(value).getTime() : 0
  return Number.isFinite(parsed) ? parsed : 0
}

/** Classic inbox order: newest first, stable by original index. */
export function sortBuyerNotifications(notifications) {
  const indexed = (Array.isArray(notifications) ? notifications : []).map((item, index) => ({ item, index }))
  indexed.sort((left, right) => {
    const timeDelta = createdTime(right.item) - createdTime(left.item)
    return timeDelta || left.index - right.index
  })
  return indexed.map((entry) => entry.item)
}

/** @deprecated Prefer sortBuyerNotifications — kept for older call sites. */
export function groupBuyerNotifications(notifications) {
  return [
    {
      key: 'all',
      labelKey: 'notifications',
      label: 'Уведомления',
      items: sortBuyerNotifications(notifications),
    },
  ]
}

export { ACTION_TYPES as BUYER_NOTIFICATION_ACTION_TYPES }
