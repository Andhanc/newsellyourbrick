import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCompareInvestorPayload,
  compareInvestorScores,
  listingCanRunInvestorScenario,
} from './compareInvestorPayload.js'

test('investor payload uses the listing price and shared rent-strategy defaults', () => {
  const payload = buildCompareInvestorPayload({
    id: 12,
    title: 'Adeje apartment',
    price: 240000,
    city: 'Adeje',
    country: 'Spain',
    area: 78,
    year_built: 2018,
  })

  assert.equal(payload.property.price, 240000)
  assert.equal(payload.property.areaSqm, 78)
  assert.equal(payload.goal.strategy, 'rent')
  assert.equal(payload.goal.periodYears, 10)
  assert.equal(payload.finance.annualRent, Math.round(240000 * 0.045))
  assert.equal(payload.finance.expectedPriceGrowthPct, 4)
  assert.equal(payload.finance.operatingExpensesPct, 25)
  assert.equal(payload.finance.useMortgage, false)
})

test('auction listings prefer the current bid for the investor scenario price', () => {
  const payload = buildCompareInvestorPayload({
    isAuction: true,
    currentBid: 190000,
    auction_starting_price: 150000,
    price: 280000,
  })
  assert.equal(payload.property.price, 190000)
  assert.equal(listingCanRunInvestorScenario({ isAuction: true, currentBid: 190000 }), true)
  assert.equal(listingCanRunInvestorScenario({ price: 0 }), false)
})

test('score comparison reports a lead without inventing a winner from empty analyses', () => {
  assert.equal(compareInvestorScores(null, null).leader, 'unknown')
  assert.equal(compareInvestorScores({ verdict: { score: 71 } }, { verdict: { score: 64 } }).leader, 'left')
  assert.equal(compareInvestorScores({ verdict: { score: 60 } }, { verdict: { score: 60 } }).leader, 'tie')
})
