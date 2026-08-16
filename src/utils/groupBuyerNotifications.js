const PERIOD_GROUPS = Object.freeze([
  { key: 'today', labelKey: 'notificationsTabToday', label: 'Сегодня' },
  { key: 'week', labelKey: 'notificationsTabThisWeek', label: 'Неделя' },
  { key: 'earlier', labelKey: 'notificationsTabEarlier', label: 'Ранее' },
])

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

function startOfLocalDay(timestamp) {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function notificationPeriod(notification, now = Date.now()) {
  const time = createdTime(notification)
  if (!time) return 'earlier'
  const todayStart = startOfLocalDay(now)
  if (time >= todayStart) return 'today'
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000
  if (time >= weekStart) return 'week'
  return 'earlier'
}

function sortNotificationEntries(entries) {
  entries.sort((left, right) => {
    const leftUnread = left.item?.view_count === 0 ? 1 : 0
    const rightUnread = right.item?.view_count === 0 ? 1 : 0
    if (leftUnread !== rightUnread) return rightUnread - leftUnread
    const timeDelta = createdTime(right.item) - createdTime(left.item)
    return timeDelta || left.index - right.index
  })
}

export function groupBuyerNotifications(notifications, now = Date.now()) {
  const indexed = (Array.isArray(notifications) ? notifications : []).map((item, index) => ({ item, index }))
  const buckets = new Map(PERIOD_GROUPS.map((group) => [group.key, []]))

  indexed.forEach((entry) => {
    buckets.get(notificationPeriod(entry.item, now)).push(entry)
  })

  return PERIOD_GROUPS.map((group) => {
    const entries = buckets.get(group.key)
    sortNotificationEntries(entries)
    return { ...group, items: entries.map((entry) => entry.item) }
  })
}

export { ACTION_TYPES as BUYER_NOTIFICATION_ACTION_TYPES, PERIOD_GROUPS as BUYER_NOTIFICATION_PERIOD_GROUPS }
