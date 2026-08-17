import test from 'node:test'
import assert from 'node:assert/strict'
import {
  compareListingsByAuctionTimer,
  getListingAuctionTimerSortMeta,
  sortListingsByAuctionTimer,
} from './sortListingsByAuctionTimer.js'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

test('active timers sort soonest-first; no-timer and ended after', () => {
  const now = Date.UTC(2026, 7, 14, 12, 0, 0)
  const soon = {
    id: 1,
    isAuction: true,
    auction_end_date: new Date(now + 2 * HOUR).toISOString(),
  }
  const later = {
    id: 2,
    isAuction: true,
    auction_end_date: new Date(now + 5 * DAY).toISOString(),
  }
  const noTimer = { id: 3, isAuction: false, price: 100 }
  const ended = {
    id: 4,
    isAuction: true,
    auction_end_date: new Date(now - HOUR).toISOString(),
  }

  assert.equal(getListingAuctionTimerSortMeta(soon, now).bucket, 0)
  assert.equal(getListingAuctionTimerSortMeta(noTimer, now).bucket, 1)
  assert.equal(getListingAuctionTimerSortMeta(ended, now).bucket, 2)

  const sorted = sortListingsByAuctionTimer([ended, noTimer, later, soon], {
    now,
    privateClubFirst: false,
  })
  assert.deepEqual(
    sorted.map((p) => p.id),
    [1, 2, 3, 4],
  )
})

test('private club lots stay ahead of regular lots', () => {
  const now = Date.UTC(2026, 7, 14, 12, 0, 0)
  const regularSoon = {
    id: 1,
    isAuction: true,
    auction_end_date: new Date(now + HOUR).toISOString(),
  }
  const clubLater = {
    id: 2,
    isAuction: true,
    private_club_only: 1,
    auction_end_date: new Date(now + 3 * DAY).toISOString(),
  }

  assert.ok(compareListingsByAuctionTimer(regularSoon, clubLater, { now }) > 0)
  const sorted = sortListingsByAuctionTimer([regularSoon, clubLater], { now })
  assert.equal(sorted[0].id, 2)
})
