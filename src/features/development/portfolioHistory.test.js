import test from 'node:test'
import assert from 'node:assert/strict'
import { developmentPortfolioHistory } from './portfolioHistory.js'
import { buildProfileHistoryDashboard } from '../../utils/profileCabinetPresentation.js'

test('confirmed Develop investments become history cards without being treated as purchased property', () => {
  const row = { projectId: 42, slug: 'villa-adeje', title: 'Villa Adeje', currency: 'EUR', amount: 2500.25, share: .25, stage: 'construction', lastPaidAt: '2026-10-24T12:00:00Z', investmentCount: 2 }
  const items = developmentPortfolioHistory([row], 'en')
  assert.equal(items[0].amountValue, 2500.25)
  assert.match(items[0].amount, /2,500.25/)
  assert.equal(items[0].href, '/development/villa-adeje')
  assert.equal(items[0].development.stage, 'construction')
  assert.equal(items[0].purchaseChannel, undefined)
  const dashboard = buildProfileHistoryDashboard([{ key: 'development', items }])
  assert.equal(dashboard.categories.at(-1).key, 'development')
  assert.equal(dashboard.categories.at(-1).count, 1)
  assert.equal(dashboard.analytics.investedByCurrency.EUR, 2500.25)
  assert.equal(dashboard.categories.find(c => c.key === 'properties').count, 0)
})
