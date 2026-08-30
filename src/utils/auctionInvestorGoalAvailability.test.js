import test from 'node:test'
import assert from 'node:assert/strict'
import { isTimedAuctionProperty } from './auctionReminderBounds.js'

test('fractional goal is unavailable only for auction properties with a timer', () => {
  assert.equal(
    isTimedAuctionProperty({ is_auction: 1, auction_end_date: '2027-01-15T12:00:00.000Z' }),
    true,
  )
  assert.equal(
    isTimedAuctionProperty({ isAuction: true, test_timer_end_date: '2027-01-15T12:00:00.000Z' }),
    true,
  )
  assert.equal(isTimedAuctionProperty({ isAuction: true, price: 250000 }), false)
  assert.equal(
    isTimedAuctionProperty({ isAuction: false, auction_end_date: '2027-01-15T12:00:00.000Z' }),
    false,
  )
})
