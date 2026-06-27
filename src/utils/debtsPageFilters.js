import { getMapPriceBounds } from './mapPageFilters'
import { hasBuyNowOption } from './hasBuyNowOption'
import { getEffectiveAuctionEndTime } from './auctionReminderBounds'
import { buildLocationOptionsFromProperties, parsePropertyLocation } from './propertySearchLocation'

export {
  getDebtRiskTone,
  getDebtRiskLabelKey,
  getDebtMinimumBid,
  getDebtsCardPresentation,
} from './debtsCardPresentation'

export const EMPTY_DEBTS_FILTERS = {
  propertyType: 'все',
  risk: 'all',
  risks: [],
  minPrice: '',
  maxPrice: '',
  minDebt: '',
  maxDebt: '',
  country: 'all',
  city: 'all',
  showAuction: true,
  showBuyNow: true,
  timeRemaining: 'all',
  yieldRange: 'all',
}

export const DEBTS_PROPERTY_TYPE_OPTIONS = [
  { value: 'все', labelKey: 'propertyTypeAll' },
  { value: 'квартира', labelKey: 'propertyTypeFlat' },
  { value: 'апартаменты', labelKey: 'propertyTypeApartment' },
  { value: 'вилла', labelKey: 'propertyTypeVilla' },
  { value: 'дом', labelKey: 'propertyTypeHouse' },
]

export const DEBTS_RISK_OPTIONS = [
  { value: 'red', labelKey: 'debtsHighRisk', tone: 'high' },
  { value: 'yellow', labelKey: 'debtsMediumRisk', tone: 'medium' },
  { value: 'green', labelKey: 'debtsLowRisk', tone: 'low' },
]

export const DEBTS_TIME_REMAINING_OPTIONS = [
  { value: 'all', labelKey: 'debtsFilterAnyTime' },
  { value: '24h', labelKey: 'debtsFilterTime24h' },
  { value: '7d', labelKey: 'debtsFilterTime7d' },
  { value: '30d', labelKey: 'debtsFilterTime30d' },
]

export const DEBTS_YIELD_OPTIONS = [
  { value: 'all', labelKey: 'debtsFilterYieldAny' },
  { value: '9+', labelKey: 'debtsFilterYield9' },
  { value: '15+', labelKey: 'debtsFilterYield15' },
  { value: '20+', labelKey: 'debtsFilterYield20' },
]

export const DEBTS_MOBILE_FILTER_ITEMS = [
  ...DEBTS_PROPERTY_TYPE_OPTIONS.map((item) => ({ kind: 'type', ...item })),
  ...DEBTS_RISK_OPTIONS.map((item) => ({ kind: 'risk', ...item })),
]

export function getDebtsPriceBounds(properties = []) {
  return getMapPriceBounds(properties)
}

export function getDebtsDebtBounds(properties = []) {
  let min = Infinity
  let max = 0
  for (const property of properties) {
    const debt = Number(property.debt_amount)
    if (!Number.isFinite(debt) || debt <= 0) continue
    min = Math.min(min, debt)
    max = Math.max(max, debt)
  }
  if (!Number.isFinite(min) || min === Infinity) {
    return { min: 0, max: 500_000 }
  }
  return { min, max: Math.max(max, min) }
}

export function getDebtsFilterOptions(properties = []) {
  const locations = buildLocationOptionsFromProperties(properties)
  return {
    locations,
  }
}

export function getDebtsPurchaseCounts(properties = []) {
  let auction = 0
  let buyNow = 0
  for (const property of properties) {
    if (property.isAuction === true) auction += 1
    if (hasBuyNowOption(property)) buyNow += 1
  }
  return { auction, buyNow }
}

export function countActiveDebtsFilters(filters = EMPTY_DEBTS_FILTERS) {
  let count = 0
  if (filters.propertyType && filters.propertyType !== 'все') count += 1
  if (filters.risks?.length) count += 1
  else if (filters.risk && filters.risk !== 'all') count += 1
  if (filters.minPrice !== '' || filters.maxPrice !== '') count += 1
  if (filters.minDebt !== '' || filters.maxDebt !== '') count += 1
  if (filters.country && filters.country !== 'all') count += 1
  if (filters.city && filters.city !== 'all') count += 1
  if (!filters.showAuction || !filters.showBuyNow) count += 1
  return count
}

function getDebtAnnualYieldRaw(property) {
  const raw =
    property.annualYield ??
    property.annual_yield ??
    property.yield_percent ??
    property.profitability ??
    property.profitability_percent
  if (raw == null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function matchesPropertyType(property, propertyType) {
  if (!propertyType || propertyType === 'все') return true

  if (property.property_type) {
    const typeMap = {
      квартира: ['apartment', 'flat'],
      апартаменты: ['commercial', 'apartment'],
      вилла: ['villa'],
      дом: ['house', 'townhouse'],
    }
    const allowed = typeMap[propertyType]
    if (allowed && !allowed.includes(property.property_type)) return false
    return true
  }

  const titleLower = (property.title || property.name || '').toLowerCase()
  const typeMatch = {
    квартира: titleLower.includes('квартир') || titleLower.includes('студи'),
    апартаменты: titleLower.includes('апартамент'),
    вилла: titleLower.includes('вилл'),
    дом: titleLower.includes('дом') || titleLower.includes('таунхаус'),
  }
  return Boolean(typeMatch[propertyType])
}

function getActiveRisks(filters) {
  if (filters.risks?.length) return filters.risks
  if (filters.risk && filters.risk !== 'all') return [filters.risk]
  return []
}

function matchesRisk(property, filters) {
  const active = getActiveRisks(filters)
  if (!active.length) return true
  return active.includes(property.debt_severity)
}

function getDebtsListingPrice(property) {
  const raw = property.currentBid ?? property.price ?? 0
  const price = Number(raw)
  return Number.isFinite(price) ? price : 0
}

function matchesPrice(property, filters) {
  const { minPrice, maxPrice } = filters
  if (minPrice === '' && maxPrice === '') return true

  const price = getDebtsListingPrice(property)
  if (minPrice !== '') {
    const min = Number(minPrice)
    if (Number.isFinite(min) && price < min) return false
  }
  if (maxPrice !== '') {
    const max = Number(maxPrice)
    if (Number.isFinite(max) && price > max) return false
  }
  return true
}

function getDebtsDebtAmount(property) {
  const debt = Number(property.debt_amount)
  return Number.isFinite(debt) && debt > 0 ? debt : null
}

function matchesDebt(property, filters) {
  const { minDebt, maxDebt } = filters
  if (minDebt === '' && maxDebt === '') return true

  const debt = getDebtsDebtAmount(property)
  if (debt == null) return false

  if (minDebt !== '') {
    const min = Number(minDebt)
    if (Number.isFinite(min) && debt < min) return false
  }
  if (maxDebt !== '') {
    const max = Number(maxDebt)
    if (Number.isFinite(max) && debt > max) return false
  }
  return true
}

function matchesLocation(property, { country, city }) {
  const hasCountry = country && country !== 'all'
  const hasCity = city && city !== 'all'
  if (!hasCountry && !hasCity) return true

  const parsed = parsePropertyLocation(property)
  if (!parsed) return false

  if (hasCountry && parsed.countryKey !== country) return false
  if (hasCity && parsed.regionKey !== city) return false
  return true
}

function matchesPurchaseMethod(property, filters) {
  const isAuction = property.isAuction === true
  const buyNow = hasBuyNowOption(property)
  const { showAuction, showBuyNow } = filters
  if (!showAuction && !showBuyNow) return false
  if (showAuction && showBuyNow) return isAuction || buyNow || (!isAuction && !buyNow)
  if (showAuction) return isAuction
  if (showBuyNow) return buyNow
  return true
}

function getPropertyEndTime(property) {
  const raw =
    property.endTime ??
    property.auction_end_time ??
    property.auctionEndTime ??
    property.test_timer_end_date ??
    null
  if (!raw) return null
  const ts = new Date(raw).getTime()
  return Number.isNaN(ts) ? null : ts
}

function matchesTimeRemaining(property, timeRemaining) {
  if (!timeRemaining || timeRemaining === 'all') return true
  const endTs = getPropertyEndTime(property)
  if (!endTs) return timeRemaining === 'all'
  const diffMs = endTs - Date.now()
  if (diffMs <= 0) return false
  const limits = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }
  const limit = limits[timeRemaining]
  return limit ? diffMs <= limit : true
}

function matchesYield(property, yieldRange) {
  if (!yieldRange || yieldRange === 'all') return true
  const yieldValue = getDebtAnnualYieldRaw(property)
  if (yieldValue == null) return false
  const minYield = Number(String(yieldRange).replace('+', ''))
  return Number.isFinite(minYield) ? yieldValue >= minYield : true
}

function matchesSearch(property, searchQuery) {
  if (!searchQuery) return true
  const query = searchQuery.toLowerCase()
  return (
    (property.title || property.name || '').toLowerCase().includes(query) ||
    (property.location || '').toLowerCase().includes(query)
  )
}

export function applyDebtsPageFilters(properties = [], filters = EMPTY_DEBTS_FILTERS, searchQuery = '') {
  return properties.filter(
    (property) =>
      matchesSearch(property, searchQuery) &&
      matchesPropertyType(property, filters.propertyType) &&
      matchesRisk(property, filters) &&
      matchesPrice(property, filters) &&
      matchesDebt(property, filters) &&
      matchesLocation(property, filters) &&
      matchesPurchaseMethod(property, filters) &&
      matchesTimeRemaining(property, filters.timeRemaining) &&
      matchesYield(property, filters.yieldRange),
  )
}

export function getDebtYield(property) {
  return getDebtAnnualYieldRaw(property)
}
