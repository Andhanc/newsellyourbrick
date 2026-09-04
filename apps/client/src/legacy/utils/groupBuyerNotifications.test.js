import test from 'node:test'
import assert from 'node:assert/strict'

let api = {}
try {
  api = await import('./groupBuyerNotifications.js')
} catch {
  // The first RED run intentionally covers the missing implementation.
}

const sortBuyerNotifications = api.sortBuyerNotifications || (() => [])
const groupBuyerNotifications = api.groupBuyerNotifications || (() => [])
const safeNotificationRoute = api.safeNotificationRoute || (() => null)

test('sorts buyer notifications newest first in a flat classic list', () => {
  const items = sortBuyerNotifications([
    { id: 1, type: 'system_update', created_at: '2026-07-01T09:00:00' },
    { id: 2, type: 'test_drive_result', created_at: '2026-07-12T10:00:00' },
    { id: 3, type: 'bid_outbid', created_at: '2026-07-14T11:00:00' },
    { id: 4, type: 'payment_deadline', created_at: '2026-07-14T12:00:00', view_count: 0 },
  ])

  assert.deepEqual(items.map((item) => item.id), [4, 3, 2, 1])
})

test('keeps newest-first stability for equal timestamps via original order', () => {
  const items = sortBuyerNotifications([
    { id: 'a', type: 'bid_outbid', created_at: '2026-07-14T12:00:00' },
    { id: 'b', type: 'auction_won', created_at: '2026-07-14T12:00:00' },
    { id: 'c', type: 'bid_outbid', created_at: '2026-07-14T11:00:00' },
  ])

  assert.deepEqual(items.map((item) => item.id), ['a', 'b', 'c'])
})

test('groupBuyerNotifications returns a single flat bucket for compatibility', () => {
  const groups = groupBuyerNotifications([
    { id: 2, created_at: '2026-07-12T10:00:00' },
    { id: 1, created_at: '2026-07-14T12:00:00' },
  ])
  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0].items.map((item) => item.id), [1, 2])
})

test('allows only known internal routes', () => {
  assert.equal(safeNotificationRoute('/property/42?tab=bids'), '/property/42?tab=bids')
  assert.equal(safeNotificationRoute('/profile?bookings=1&booking=7'), '/profile?bookings=1&booking=7')
  assert.equal(safeNotificationRoute('/calculator'), '/calculator')
  assert.equal(
    safeNotificationRoute('/test-drive/survey/abc123'),
    '/test-drive/survey/abc123',
  )
  assert.equal(safeNotificationRoute('https://evil.example/property/42'), null)
  assert.equal(safeNotificationRoute('//evil.example'), null)
  assert.equal(safeNotificationRoute('javascript:alert(1)'), null)
  assert.equal(safeNotificationRoute('/admin'), null)
})
