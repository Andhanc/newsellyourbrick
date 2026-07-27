import test from 'node:test'
import assert from 'node:assert/strict'
let resolveBuyerListingState = () => ({})
try {
  ;({ resolveBuyerListingState } = await import('./resolveBuyerListingState.js'))
} catch {
  // The first RED run intentionally covers the missing implementation.
}

const NOW = new Date('2026-07-14T12:00:00.000Z')

test('sold is the final state even when auction timestamps also ended', () => {
  const result = resolveBuyerListingState({
    status: 'sold',
    is_auction: true,
    auction_end_date: '2026-07-01T00:00:00.000Z',
  }, NOW)

  assert.deepEqual(result, {
    state: 'sold',
    label: 'Объект продан',
    tone: 'sold',
    blocksPurchase: true,
    blocksBid: true,
  })
})

test('a completed buy-now purchase is treated as sold', () => {
  assert.equal(resolveBuyerListingState({ buy_now_purchase_completed: true }, NOW).state, 'sold')
  assert.equal(resolveBuyerListingState({ sold_at: '2026-07-10T10:00:00Z' }, NOW).state, 'sold')
})

test('a buy-now winner without confirmed completion is not marked sold', () => {
  const result = resolveBuyerListingState({
    buy_now_winner_user_id: 42,
    is_auction: true,
    auction_end_date: '2026-07-15T12:00:00.000Z',
  }, NOW)

  assert.equal(result.state, 'auction-live')
})

test('an ended auction is distinct from a sold object', () => {
  const result = resolveBuyerListingState({
    isAuction: true,
    auction_end_date: '2026-07-14T11:59:59.000Z',
  }, NOW)

  assert.equal(result.state, 'auction-ended')
  assert.equal(result.label, 'Аукцион завершён')
  assert.equal(result.tone, 'auction-ended')
})

test('active reservation expires deterministically against injected now', () => {
  assert.equal(resolveBuyerListingState({
    is_reserved: 1,
    reserved_until: '2026-07-14T12:30:00.000Z',
  }, NOW).state, 'reserved')

  assert.equal(resolveBuyerListingState({
    is_reserved: true,
    reserved_until: '2026-07-14T11:30:00.000Z',
  }, NOW).state, 'available')
})

test('live auctions and normal listings remain actionable', () => {
  const live = resolveBuyerListingState({
    is_auction: 1,
    auction_end_date: '2026-07-15T12:00:00.000Z',
  }, NOW)
  const available = resolveBuyerListingState({ status: 'active' }, NOW)

  assert.equal(live.state, 'auction-live')
  assert.equal(live.blocksBid, false)
  assert.equal(available.state, 'available')
  assert.equal(available.blocksPurchase, false)
})

test('unavailable is used only without a final commercial state', () => {
  assert.equal(resolveBuyerListingState({ status: 'archived' }, NOW).state, 'unavailable')
  assert.equal(resolveBuyerListingState({ status: 'sold', is_active: false }, NOW).state, 'sold')
  assert.equal(resolveBuyerListingState(null, NOW).state, 'unavailable')
})
