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

test('groups buyer events by today / this week / earlier', () => {
  const now = new Date('2026-07-14T15:00:00').getTime()
  const groups = groupBuyerNotifications(
    [
      { id: 1, type: 'system_update', created_at: '2026-07-01T09:00:00' },
      { id: 2, type: 'test_drive_result', created_at: '2026-07-12T10:00:00' },
      { id: 3, type: 'bid_outbid', created_at: '2026-07-14T11:00:00' },
      { id: 4, type: 'payment_deadline', created_at: '2026-07-14T12:00:00', view_count: 0 },
    ],
    now,
  )

  assert.deepEqual(groups.map((group) => group.key), ['today', 'week', 'earlier'])
  assert.deepEqual(groups[0].items.map((item) => item.id), [4, 3])
  assert.deepEqual(groups[1].items.map((item) => item.id), [2])
  assert.deepEqual(groups[2].items.map((item) => item.id), [1])
})

test('keeps unread items first within a period and preserves newest-first stability', () => {
  const now = new Date('2026-07-14T15:00:00').getTime()
  const groups = groupBuyerNotifications(
    [
      { id: 'old', type: 'bid_outbid', created_at: '2026-07-14T08:00:00', view_count: 0 },
      { id: 'read', type: 'bid_outbid', created_at: '2026-07-14T12:00:00', view_count: 2 },
      { id: 'new', type: 'auction_won', created_at: '2026-07-14T11:00:00', view_count: 0 },
    ],
    now,
  )

  const todayItems = groups.find((group) => group.key === 'today').items
  assert.deepEqual(todayItems.map((item) => item.id), ['new', 'old', 'read'])
})

test('allows only known internal routes', () => {
  assert.equal(safeNotificationRoute('/property/42?tab=bids'), '/property/42?tab=bids')
  assert.equal(safeNotificationRoute('/profile/bookings?booking=7'), '/profile/bookings?booking=7')
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
