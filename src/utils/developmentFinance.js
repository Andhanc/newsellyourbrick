/** Monetary calculations use integer cents. The preferred return is simple annual interest. */
export const DEVELOPMENT_STAGES = ['land', 'fundraising', 'construction', 'sale', 'returned']
export const DEAL_MODELS = [
  'distressed',
  'auction',
  'fixed',
  'private',
  'shares',
  'development',
  'fund',
  'bank',
]
export const SELLER_GOALS = [
  'maximum',
  'fast',
  'guaranteed',
  'foreign',
  'partner',
  'auction',
  'confidential',
]
export const GOAL_MODELS = {
  maximum: 'auction',
  fast: 'fixed',
  guaranteed: 'bank',
  foreign: 'shares',
  partner: 'development',
  auction: 'auction',
  confidential: 'private',
}
export const DEVELOPMENT_FIELDS = [
  'landArea',
  'builtArea',
  'landCost',
  'constructionCost',
  'otherCosts',
  'expectedSale',
  'requiredCapital',
  'termMonths',
  'preferredReturn',
  'platformShare',
]
export function validateDevelopment(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { requiredCapital: 'invalidNumber' }
  const errors = {}
  for (const key of DEVELOPMENT_FIELDS) {
    const value = Number(input[key])
    if (
      input[key] === '' ||
      input[key] == null ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1e10
    )
      errors[key] = 'invalidNumber'
  }
  for (const key of ['landArea', 'builtArea', 'requiredCapital', 'termMonths'])
    if (!(Number(input[key]) > 0)) errors[key] = 'positiveNumber'
  for (const key of ['preferredReturn', 'platformShare'])
    if (Number(input[key]) > 100) errors[key] = 'percentageError'
  const budget = Number(input.landCost) + Number(input.constructionCost) + Number(input.otherCosts)
  if (!(budget > 0) || Number(input.requiredCapital) > budget)
    errors.requiredCapital = 'capitalError'
  if (Number(input.termMonths) > 600) errors.termMonths = 'invalidNumber'
  return errors
}
export function calculateWaterfall(input) {
  if (Object.keys(validateDevelopment(input)).length) return null
  const cents = (v) => Math.round(Number(v) * 100)
  const capital = cents(input.requiredCapital)
  const budget = cents(input.landCost) + cents(input.constructionCost) + cents(input.otherCosts)
  const sale = cents(input.expectedSale)
  // Non-investor project capital has the same capital priority, pro rata in a downside scenario.
  const returnedTotal = Math.min(sale, budget)
  const capitalReturned = Math.round((returnedTotal * capital) / budget)
  const sponsorCapitalReturned = returnedTotal - capitalReturned
  const profit = Math.max(0, sale - budget)
  const preferredDue = Math.round(
    (((capital * Number(input.preferredReturn)) / 100) * Number(input.termMonths)) / 12,
  )
  const preferredPaid = Math.min(profit, preferredDue)
  const residual = profit - preferredPaid
  const platformProfit = Math.round((residual * Number(input.platformShare)) / 100)
  const developerProfit = residual - platformProfit
  const payout = capitalReturned + preferredPaid
  return {
    budget: budget / 100,
    grossProfit: (sale - budget) / 100,
    grossRoi: ((sale - budget) / budget) * 100,
    capitalReturned: capitalReturned / 100,
    sponsorCapitalReturned: sponsorCapitalReturned / 100,
    capitalLoss: (capital - capitalReturned) / 100,
    preferredDue: preferredDue / 100,
    preferredPaid: preferredPaid / 100,
    preferredShortfall: (preferredDue - preferredPaid) / 100,
    residual: residual / 100,
    platformProfit: platformProfit / 100,
    developerProfit: developerProfit / 100,
    investorPayout: payout / 100,
    investorRoi: (payout / capital - 1) * 100,
    investorIrr: (Math.pow(payout / capital, 12 / Number(input.termMonths)) - 1) * 100,
  }
}
export function fundingPercent(funded, required) {
  return Number(required) > 0
    ? Math.min(100, Math.max(0, (Number(funded) / Number(required)) * 100))
    : 0
}
export function calculateInvestment(d = {}) {
  const keys = [
    'marketPrice',
    'dealPrice',
    'renovation',
    'taxes',
    'annualRent',
    'annualCosts',
    'resale',
    'saleCosts',
    'termMonths',
  ]
  const valid = (key) =>
    d[key] !== '' && d[key] != null && Number.isFinite(Number(d[key])) && Number(d[key]) >= 0
  const cost = ['dealPrice', 'renovation', 'taxes'].every(valid)
    ? Number(d.dealPrice) + Number(d.renovation) + Number(d.taxes)
    : null
  const netRent = ['annualRent', 'annualCosts'].every(valid)
    ? Number(d.annualRent) - Number(d.annualCosts)
    : null
  const discount =
    valid('marketPrice') && valid('dealPrice') && Number(d.marketPrice) > 0
      ? (1 - d.dealPrice / d.marketPrice) * 100
      : null
  const complete = keys.every(valid) && cost > 0 && Number(d.termMonths) > 0
  const proceeds = complete
    ? Number(d.resale) - Number(d.saleCosts) + (netRent * Number(d.termMonths)) / 12
    : null
  // IRR assumes net rent paid monthly and sale proceeds at the end; supports fractional final month.
  let irr = null
  if (complete && proceeds > 0 && netRent >= 0 && Number(d.resale) >= Number(d.saleCosts)) {
    const months = Number(d.termMonths)
    const npv = (rate) => {
      let value = -cost
      for (let m = 1; m <= Math.floor(months); m++)
        value += netRent / 12 / Math.pow(1 + rate, m / 12)
      value +=
        (Number(d.resale) - Number(d.saleCosts) + (netRent / 12) * (months % 1)) /
        Math.pow(1 + rate, months / 12)
      return value
    }
    let lo = -0.9999,
      hi = 100
    if (npv(lo) >= 0 && npv(hi) <= 0) {
      for (let n = 0; n < 100; n++) {
        const mid = (lo + hi) / 2
        if (npv(mid) > 0) lo = mid
        else hi = mid
      }
      irr = ((lo + hi) / 2) * 100
    }
  }
  const target = valid('targetRoi') ? Number(d.targetRoi) : null
  return {
    cost,
    discount,
    netRent,
    netYield: cost > 0 && netRent != null ? (netRent / cost) * 100 : null,
    roi: complete ? (proceeds / cost - 1) * 100 : null,
    irr,
    maxBid:
      complete && target != null
        ? Math.max(0, proceeds / (1 + target / 100) - Number(d.renovation) - Number(d.taxes))
        : null,
  }
}
