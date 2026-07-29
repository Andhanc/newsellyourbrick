const GROUPS = Object.freeze([
  { key: 'action', label: 'Требует внимания' },
  { key: 'money', label: 'Деньги и сделки' },
  { key: 'auction', label: 'Аукционы' },
  { key: 'booking', label: 'Бронирования и просмотры' },
  { key: 'system', label: 'Сервис' },
])

const ACTION_TYPES = new Set([
  'payment_deadline',
  'auction_won',
  'buy_now_approved',
  'verification_rejected',
  'test_drive_request',
])

const ROUTE_PREFIXES = [
  '/property/',
  '/auction',
  '/profile',
  '/history',
  '/deposit',
  '/wallet',
  '/compare',
  '/calculator',
  '/favorites',
  '/subscriptions',
]

export function safeNotificationRoute(route) {
  if (typeof route !== 'string') return null
  const value = route.trim()
  if (!value.startsWith('/') || value.startsWith('//') || /[\u0000-\u001f]/.test(value)) return null
  return ROUTE_PREFIXES.some((prefix) => value === prefix || value.startsWith(prefix)) ? value : null
}

function notificationGroup(typeValue) {
  const type = String(typeValue || '').toLowerCase()
  if (ACTION_TYPES.has(type)) return 'action'
  if (/payment|deposit|refund|withdraw|transaction|buy_now/.test(type)) return 'money'
  if (/bid|auction/.test(type)) return 'auction'
  if (/test_drive|booking|reservation|visit/.test(type)) return 'booking'
  return 'system'
}

function createdTime(notification) {
  const value = notification?.created_at ?? notification?.createdAt ?? notification?.date
  const parsed = value ? new Date(value).getTime() : 0
  return Number.isFinite(parsed) ? parsed : 0
}

export function groupBuyerNotifications(notifications) {
  const indexed = (Array.isArray(notifications) ? notifications : []).map((item, index) => ({ item, index }))
  const buckets = new Map(GROUPS.map((group) => [group.key, []]))

  indexed.forEach((entry) => buckets.get(notificationGroup(entry.item?.type)).push(entry))

  return GROUPS.map((group) => {
    const entries = buckets.get(group.key)
    entries.sort((left, right) => {
      const leftUnread = left.item?.view_count === 0 ? 1 : 0
      const rightUnread = right.item?.view_count === 0 ? 1 : 0
      if (leftUnread !== rightUnread) return rightUnread - leftUnread
      const timeDelta = createdTime(right.item) - createdTime(left.item)
      return timeDelta || left.index - right.index
    })
    return { ...group, items: entries.map((entry) => entry.item) }
  }).filter((group) => group.items.length > 0)
}

export { ACTION_TYPES as BUYER_NOTIFICATION_ACTION_TYPES }
