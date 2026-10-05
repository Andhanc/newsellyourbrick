import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateWaterfall,
  validateDevelopment,
  calculateInvestment,
  fundingPercent,
} from './developmentFinance.js'
const base = {
  landArea: 620,
  builtArea: 250,
  landCost: 580000,
  constructionCost: 550000,
  otherCosts: 0,
  expectedSale: 2200000,
  requiredCapital: 1130000,
  termMonths: 18,
  preferredReturn: 12,
  platformShare: 20,
}
test('Callao economics distinguish gross ROI from investor return and residual platform share', () => {
  const r = calculateWaterfall(base)
  assert.equal(r.grossProfit, 1070000)
  assert.equal(r.preferredPaid, 203400)
  assert.equal(r.residual, 866600)
  assert.equal(r.platformProfit, 173320)
  assert.equal(r.developerProfit, 693280)
  assert.ok(Math.abs(r.investorRoi - 18) < 1e-8)
  assert.ok(Math.abs(r.grossRoi - 94.69026548672566) < 1e-8)
  assert.equal(
    r.capitalReturned +
      r.sponsorCapitalReturned +
      r.preferredPaid +
      r.platformProfit +
      r.developerProfit,
    base.expectedSale,
  )
})
test('downside never pays profit before capital or invents returns', () => {
  const r = calculateWaterfall({ ...base, expectedSale: 500000 })
  assert.equal(r.capitalReturned, 500000)
  assert.equal(r.capitalLoss, 630000)
  assert.equal(r.preferredPaid, 0)
  assert.equal(r.platformProfit, 0)
  assert.equal(r.developerProfit, 0)
  assert.ok(r.investorIrr < 0)
  assert.equal(calculateWaterfall({ ...base, expectedSale: 0 }).investorIrr, -100)
})
test('partial preferred return and co-funded capital conserve proceeds', () => {
  const r = calculateWaterfall({ ...base, requiredCapital: 500000, expectedSale: 600000 })
  assert.equal(r.capitalReturned + r.sponsorCapitalReturned, 600000)
  const limited = calculateWaterfall({ ...base, expectedSale: 1200000 })
  assert.equal(limited.preferredPaid, 70000)
  assert.equal(limited.preferredShortfall, 133400)
  assert.equal(limited.platformProfit, 0)
})
test('reject malformed, missing, negative and excessive terms', () => {
  for (const update of [
    { requiredCapital: 0 },
    { platformShare: 101 },
    { landCost: -1 },
    { termMonths: '' },
    { expectedSale: 'oops' },
    { requiredCapital: 2200000 },
  ]) {
    assert.ok(Object.keys(validateDevelopment({ ...base, ...update })).length)
    assert.equal(calculateWaterfall({ ...base, ...update }), null)
  }
  assert.equal(fundingPercent(5, 0), 0)
  assert.equal(fundingPercent(150, 100), 100)
})
test('investment decision keeps unknowns distinct from zero and computes monthly cash flow IRR', () => {
  assert.equal(calculateInvestment({ dealPrice: 100000 }).roi, null)
  assert.equal(calculateInvestment({ dealPrice: 100000 }).maxBid, null)
  const r = calculateInvestment({
    marketPrice: 120000,
    dealPrice: 100000,
    renovation: 0,
    taxes: 0,
    annualRent: 0,
    annualCosts: 0,
    resale: 110000,
    saleCosts: 0,
    termMonths: 12,
    targetRoi: 10,
  })
  assert.ok(Math.abs(r.irr - 10) < 1e-7)
  assert.equal(r.maxBid, 99999.99999999999)
  const rental = calculateInvestment({
    marketPrice: 120000,
    dealPrice: 100000,
    renovation: 0,
    taxes: 0,
    annualRent: 12000,
    annualCosts: 0,
    resale: 100000,
    saleCosts: 0,
    termMonths: 12,
    targetRoi: 10,
  })
  assert.equal(rental.netYield, 12)
  assert.ok(rental.irr > 12)
})
