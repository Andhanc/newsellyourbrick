import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveShareDistributionChart } from './shareDetailChartSegments.js'

test('preview chart centers on the shares being bought, not total sold after purchase', () => {
  const chart = resolveShareDistributionChart({
    totalShares: 20,
    sharesSold: 1,
    myShares: 0,
    availableToBuy: 19,
    buyCount: 1,
  })

  assert.equal(chart.isPreview, true)
  assert.equal(chart.pendingPurchase, 1)
  assert.equal(chart.displayAvailable, 18)
  assert.equal(chart.myShares, 0)
  assert.equal(chart.othersSold, 1)
  assert.match(chart.gradient, /#14b8a6/)
})

test('preview chart keeps owned shares separate from the pending purchase slice', () => {
  const chart = resolveShareDistributionChart({
    totalShares: 20,
    sharesSold: 2,
    myShares: 1,
    availableToBuy: 18,
    buyCount: 1,
  })

  assert.equal(chart.pendingPurchase, 1)
  assert.equal(chart.myShares, 1)
  assert.equal(chart.displayAvailable, 17)
  assert.equal(chart.othersSold, 1)
  assert.match(chart.gradient, /#0099A9/)
  assert.match(chart.gradient, /#14b8a6/)
})

test('static chart keeps the current availability without a pending slice', () => {
  const chart = resolveShareDistributionChart({
    totalShares: 20,
    sharesSold: 2,
    myShares: 1,
    availableToBuy: 18,
    buyCount: 0,
  })

  assert.equal(chart.isPreview, false)
  assert.equal(chart.pendingPurchase, 0)
  assert.equal(chart.displayAvailable, 18)
  assert.doesNotMatch(chart.gradient, /#14b8a6/)
})
