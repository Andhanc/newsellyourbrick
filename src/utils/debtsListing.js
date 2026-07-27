import { formatListingAuctionTimeLeft } from './formatListingAuctionTimeLeft'

const RISK_LEVELS = [
  { id: 'red', filterValue: 'red' },
  { id: 'yellow', filterValue: 'yellow' },
  { id: 'green', filterValue: 'green' },
]

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

export function getDebtsRiskStats(properties = []) {
  const byRisk = {
    red: { count: 0, yields: [] },
    yellow: { count: 0, yields: [] },
    green: { count: 0, yields: [] },
  }

  for (const property of properties) {
    const severity = property.debt_severity
    if (!byRisk[severity]) continue
    byRisk[severity].count += 1
    const yieldValue = getDebtAnnualYieldRaw(property)
    if (yieldValue != null) byRisk[severity].yields.push(yieldValue)
  }

  return RISK_LEVELS.map(({ id, filterValue }) => {
    const bucket = byRisk[id]
    const avgYield =
      bucket.yields.length > 0
        ? bucket.yields.reduce((sum, value) => sum + value, 0) / bucket.yields.length
        : null
    return {
      id,
      filterValue,
      count: bucket.count,
      avgYield,
    }
  })
}

export function formatDebtYieldPercent(value, locale = 'ru') {
  if (value == null || !Number.isFinite(value)) return '—'
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  })
  return `${formatter.format(value)}%`
}

export const DEBTS_SORT_OPTIONS = [
  { value: 'newest', labelKey: 'debtsSortNewest' },
  { value: 'price_asc', labelKey: 'debtsSortPriceAsc' },
  { value: 'price_desc', labelKey: 'debtsSortPriceDesc' },
  { value: 'yield_desc', labelKey: 'debtsSortYieldDesc' },
]

function getListingPrice(property) {
  const raw = property.currentBid ?? property.price ?? 0
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}

function getCreatedTs(property) {
  const raw =
    property.created_at ??
    property.createdAt ??
    property.published_at ??
    property.publishedAt ??
    property.id
  if (typeof raw === 'number') return raw
  const ts = new Date(raw).getTime()
  return Number.isNaN(ts) ? 0 : ts
}

export function sortDebts(properties = [], sortKey = 'newest') {
  const items = [...properties]
  switch (sortKey) {
    case 'price_asc':
      return items.sort((a, b) => getListingPrice(a) - getListingPrice(b))
    case 'price_desc':
      return items.sort((a, b) => getListingPrice(b) - getListingPrice(a))
    case 'yield_desc': {
      return items.sort((a, b) => {
        const ay = getDebtAnnualYieldRaw(a) ?? -1
        const by = getDebtAnnualYieldRaw(b) ?? -1
        return by - ay
      })
    }
    case 'newest':
    default:
      return items.sort((a, b) => getCreatedTs(b) - getCreatedTs(a))
  }
}

export function formatDebtAuctionTimeLeft(endTime, t) {
  return formatListingAuctionTimeLeft(endTime, t)
}
