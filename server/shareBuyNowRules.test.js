import test from 'node:test'
import assert from 'node:assert/strict'
import { getShareBuyNowCheckoutBlock } from './shareBuyNowRules.js'

test('allows buy now for all shares before the first fractional purchase', () => {
  assert.equal(
    getShareBuyNowCheckoutBlock({
      sale_type: 'share',
      buy_now_enabled: 1,
      total_shares: 20,
      shares_sold: 0,
    }),
    null,
  )
})

test('blocks buy now as soon as one share has been sold', () => {
  const result = getShareBuyNowCheckoutBlock({
    sale_type: 'share',
    buy_now_enabled: 1,
    total_shares: 20,
    shares_sold: 1,
  })

  assert.equal(result.status, 409)
  assert.equal(result.code, 'SHARE_BUY_NOW_PARTIAL_OWNERSHIP')
})

test('does not expose full purchase for share listings without seller opt-in', () => {
  const result = getShareBuyNowCheckoutBlock({
    is_shared_ownership: 1,
    buy_now_enabled: 0,
    total_shares: 20,
    shares_sold: 0,
  })

  assert.equal(result.status, 403)
  assert.equal(result.code, 'SHARE_BUY_NOW_DISABLED')
})
