import test from 'node:test'
import assert from 'node:assert/strict'

let api = {}
try {
  api = await import('./groupBuyerNotifications.js')
} catch {
  // The first RED run intentionally covers the missing implementation.
}

const groupBuyerNotifications = api.groupBuyerNotifications || (() => [])
const safeNotificationRoute = api.safeNotificationRoute || (() => null)

test('groups buyer events in product-priority order', () => {
  const groups = groupBuyerNotifications([
    { id: 1, type: 'system_update', created_at: '2026-07-14T09:00:00Z' },
    { id: 2, type: 'test_drive_result', created_at: '2026-07-14T10:00:00Z' },
    { id: 3, type: 'bid_outbid', created_at: '2026-07-14T11:00:00Z' },
    { id: 4, type: 'payment_deadline', created_at: '2026-07-14T12:00:00Z', view_count: 0 },
  ])

  assert.deepEqual(groups.map((group) => group.key), ['action', 'auction', 'booking', 'system'])
  assert.equal(groups[0].items[0].id, 4)
})

test('keeps unread actionable items first and preserves newest-first stability', () => {
  const groups = groupBuyerNotifications([
    { id: 'old', type: 'bid_outbid', created_at: '2026-07-14T08:00:00Z', view_count: 0 },
    { id: 'read', type: 'bid_outbid', created_at: '2026-07-14T12:00:00Z', view_count: 2 },
    { id: 'new', type: 'auction_won', created_at: '2026-07-14T11:00:00Z', view_count: 0 },
  ])

  const actionItems = groups.find((group) => group.key === 'action').items
  assert.deepEqual(actionItems.map((item) => item.id), ['new'])
  const auctionItems = groups.find((group) => group.key === 'auction').items
  assert.deepEqual(auctionItems.map((item) => item.id), ['old', 'read'])
})

test('allows only known internal routes', () => {
  assert.equal(safeNotificationRoute('/property/42?tab=bids'), '/property/42?tab=bids')
  assert.equal(safeNotificationRoute('/profile/bookings?booking=7'), '/profile/bookings?booking=7')
  assert.equal(safeNotificationRoute('/calculator'), '/calculator')
  assert.equal(safeNotificationRoute('https://evil.example/property/42'), null)
  assert.equal(safeNotificationRoute('//evil.example'), null)
  assert.equal(safeNotificationRoute('javascript:alert(1)'), null)
  assert.equal(safeNotificationRoute('/admin'), null)
})
