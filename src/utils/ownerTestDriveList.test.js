import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const src = readFileSync(new URL('./ownerTestDriveList.js', import.meta.url), 'utf8')
const hook = readFileSync(new URL('../hooks/useOwnerTestNavItems.js', import.meta.url), 'utf8')

function countIncomingOwnerTestDriveBookings(rows = []) {
  return Array.isArray(rows) ? rows.length : 0
}

function formatOwnerNavBadge(count) {
  const value = Math.max(0, Number(count) || 0)
  if (value <= 0) return undefined
  return value > 99 ? '99+' : value
}

test('incoming test-drive badge counts every booking on the owner listings', () => {
  assert.equal(countIncomingOwnerTestDriveBookings(), 0)
  assert.equal(countIncomingOwnerTestDriveBookings(null), 0)
  assert.equal(
    countIncomingOwnerTestDriveBookings([
      { status: 'pending' },
      { status: 'approved' },
      { status: 'cancelled' },
    ]),
    3,
  )
})

test('owner nav badge hides zero and caps large counts', () => {
  assert.equal(formatOwnerNavBadge(0), undefined)
  assert.equal(formatOwnerNavBadge(3), 3)
  assert.equal(formatOwnerNavBadge(99), 99)
  assert.equal(formatOwnerNavBadge(100), '99+')
})

test('owner nav hook wires the live test-drive badge', () => {
  assert.match(src, /return Array.isArray\(rows\) \? rows.length : 0/)
  assert.match(src, /return value > 99 \? '99\+' : value/)
  assert.match(src, /export async function fetchOwnerTestDriveNavBadgeCount/)
  assert.match(src, /OWNER_TEST_DRIVE_BOOKINGS_CHANGED/)
  assert.match(src, /notifyOwnerTestDriveBookingsChanged/)
  assert.match(hook, /id: 'testdrive'/)
  assert.match(hook, /badge: testDriveBadge/)
  assert.match(hook, /fetchOwnerTestDriveNavBadgeCount/)
})
