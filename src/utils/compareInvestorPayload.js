import { resolvePositivePropertyPrice } from './compareDecision.js'

const DEFAULT_PERIOD_YEARS = 10
const DEFAULT_RENT_YIELD = 0.045
const DEFAULT_GROWTH_PCT = 4
const DEFAULT_RENT_GROWTH_PCT = 3
const DEFAULT_OPEX_PCT = 25
const DEFAULT_BUYER_COSTS_PCT = 8
const DEFAULT_SELLER_COSTS_PCT = 4
const DEFAULT_CGT_PCT = 19

function positiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

function renovationCostFor(property, price) {
  if (!(price > 0)) return 0
  const yearBuilt = Number(property?.year_built ?? property?.yearBuilt)
  const age = Number.isFinite(yearBuilt) && yearBuilt > 1800
    ? new Date().getFullYear() - yearBuilt
    : 30
  const rate = age > 25 ? 0.04 : 0.02
  return Math.round(price * rate)
}

function areaSqm(property = {}) {
  return positiveNumber(
    property.sqft ?? property.area ?? property.square_meters ?? property.total_area ?? property.living_area,
  )
}

export function listingCanRunInvestorScenario(property) {
  return resolvePositivePropertyPrice(property) != null
}

export function buildCompareInvestorPayload(property = {}, { locale = 'ru', currency = 'EUR' } = {}) {
  const price = resolvePositivePropertyPrice(property) || 0
  const annualRent = price > 0 ? Math.round(price * DEFAULT_RENT_YIELD) : 0

  return {
    locale: String(locale || 'ru').slice(0, 12),
    currency: String(currency || 'EUR').slice(0, 6),
    property: {
      id: property.id == null ? null : String(property.id).slice(0, 80),
      title: String(property.title || property.name || '').slice(0, 180),
      country: String(property.country || property.country_name || property.address_country || 'Spain').slice(0, 80),
      city: String(property.city || property.location || property.municipality || 'Spain').slice(0, 100),
      type: String(property.property_type || property.type || 'residential').slice(0, 80),
      areaSqm: areaSqm(property),
      price,
      renovationCost: renovationCostFor(property, price),
    },
    goal: {
      strategy: 'rent',
      periodYears: DEFAULT_PERIOD_YEARS,
      ownershipSharePct: 100,
    },
    finance: {
      annualRent,
      expectedPriceGrowthPct: DEFAULT_GROWTH_PCT,
      expectedRentGrowthPct: DEFAULT_RENT_GROWTH_PCT,
      operatingExpensesPct: DEFAULT_OPEX_PCT,
      buyerCostsPct: DEFAULT_BUYER_COSTS_PCT,
      sellerCostsPct: DEFAULT_SELLER_COSTS_PCT,
      capitalGainsTaxPct: DEFAULT_CGT_PCT,
      useMortgage: false,
      mortgageRatePct: 0,
      mortgageTermYears: 25,
      downPaymentPct: 30,
    },
    borrower: {
      residenceCountry: '',
      age: 0,
      monthlyNetIncome: 0,
      monthlyDebtPayments: 0,
    },
  }
}

export function compareInvestorScores(leftAnalysis, rightAnalysis) {
  const left = Math.round(Number(leftAnalysis?.verdict?.score) || 0)
  const right = Math.round(Number(rightAnalysis?.verdict?.score) || 0)
  if (!left && !right) return { left, right, leader: 'unknown' }
  if (left === right) return { left, right, leader: 'tie' }
  return { left, right, leader: left > right ? 'left' : 'right' }
}
