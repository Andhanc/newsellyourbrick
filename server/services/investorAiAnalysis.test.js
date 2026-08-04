import test from 'node:test'
import assert from 'node:assert/strict'
import { getInvestorAiFallback } from './investorAiAnalysis.js'

const baseInput = {
  currency: 'EUR',
  property: {
    title: 'Villa Costa Adeje',
    country: 'Spain',
    city: 'Costa Adeje',
    price: 620000,
    renovationCost: 25000,
  },
  goal: { strategy: 'rent', periodYears: 10, ownershipSharePct: 100 },
  finance: {
    annualRent: 42000,
    expectedPriceGrowthPct: 4.2,
    expectedRentGrowthPct: 2.2,
    operatingExpensesPct: 20,
    buyerCostsPct: 8,
    useMortgage: true,
    mortgageRatePct: 3.6,
    mortgageTermYears: 25,
    downPaymentPct: 30,
  },
  borrower: {
    residenceCountry: 'Spain',
    age: 38,
    monthlyNetIncome: 9500,
    monthlyDebtPayments: 400,
  },
}

test('fallback produces three internally usable chart scenarios and a mortgage estimate', () => {
  const analysis = getInvestorAiFallback(baseInput)

  assert.equal(analysis.schemaVersion, '2.0')
  assert.deepEqual(Object.keys(analysis.scenarios), ['pessimistic', 'base', 'optimistic'])
  assert.equal(analysis.scenarios.base.yearlyPoints.length, 10)
  assert.equal(analysis.scenarios.base.yearlyPoints.at(-1).year, 10)
  assert.equal(analysis.mortgageEstimate.status, 'possible')
  assert.ok(analysis.mortgageEstimate.loanAmountRange.max > analysis.mortgageEstimate.loanAmountRange.min)
  assert.ok(analysis.mortgageEstimate.monthlyPaymentRange.min > 0)
  assert.match(analysis.mortgageEstimate.disclaimer, /решение определяет банк/i)
})

test('long forecasts are sampled to a readable maximum and mortgage balance declines', () => {
  const analysis = getInvestorAiFallback({
    ...baseInput,
    goal: { ...baseInput.goal, periodYears: 30 },
  })
  const points = analysis.scenarios.base.yearlyPoints

  assert.ok(points.length <= 10)
  assert.equal(points[0].year, 1)
  assert.equal(points.at(-1).year, 30)
  for (let index = 1; index < points.length; index += 1) {
    assert.ok(points[index].mortgageBalance <= points[index - 1].mortgageBalance)
  }
})

test('missing borrower data is clearly labelled rather than treated as approval', () => {
  const analysis = getInvestorAiFallback({ ...baseInput, borrower: {} }, 'live data unavailable')

  assert.equal(analysis.mortgageEstimate.status, 'insufficient_data')
  assert.equal(analysis.meta.mode, 'deterministic_fallback')
  assert.ok(analysis.dataGaps.some((item) => /доход/i.test(item)))
  assert.equal(analysis.sources.length, 0)
})
