import test from 'node:test'
import assert from 'node:assert/strict'
import { getShareBuyNowAvailability, isShareBuyNowEnabled } from './shareBuyNow.js'

test('share buy now is available only for a configured untouched share inventory', () => {
  const listing = {
    sale_type: 'share',
    buy_now_enabled: 1,
    total_shares: 20,
    shares_sold: 0,
  }

  assert.equal(isShareBuyNowEnabled(listing), true)
  assert.deepEqual(getShareBuyNowAvailability(listing), {
    enabled: true,
    available: true,
    reason: null,
    totalShares: 20,
    sharesSold: 0,
  })
})

test('the first sold share permanently locks the 100 percent buy now option', () => {
  const state = getShareBuyNowAvailability({
    is_shared_ownership: true,
    buy_now_enabled: true,
    totalShares: 20,
    sharesSold: 1,
  })

  assert.equal(state.enabled, true)
  assert.equal(state.available, false)
  assert.equal(state.reason, 'shares_already_sold')
})
