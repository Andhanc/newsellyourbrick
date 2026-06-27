import {
  isLandListingProperty,
  matchesAuctionPropertyTypeFilter,
} from './auctionDesktopFilterMatch'
import { getSharePricePerShare, isShareSoldOut } from './shareCardMetrics'
import {
  getCollectedPercent,
  getShareLocationParts,
} from './shareCardDisplay'
import { formatPropertyPrice, normalizeCurrencyCode } from './currency'
import { buildLocationOptionsFromProperties } from './propertySearchLocation'

export {
  formatShareOwnershipPercent,
  getCollectedAmount,
  getCollectedPercent,
  getShareBadgeType,
  getShareLocationLabel,
  getShareLocationParts,
  getShareOwnershipPercent,
  mapShareFromApiResponse,
  mapSharesFromApiResponse,
} from './shareCardDisplay'

export const SHARES_CATEGORY_TAB_IDS = ['all', 'residential', 'commercial', 'land']

/** Категория объекта для вкладок каталога (как на аукционе по типу недвижимости). */
export function getShareListingCategory(share = {}) {
  if (isLandListingProperty(share)) return 'land'
  if (matchesAuctionPropertyTypeFilter(share, 'коммерческая')) return 'commercial'
  return 'residential'
}

export function getSharesCategoryTabCounts(shares = []) {
  const counts = { residential: 0, commercial: 0, land: 0 }
  for (const share of shares) {
    const category = getShareListingCategory(share)
    if (category in counts) counts[category] += 1
  }
  return { all: shares.length, ...counts }
}

export function matchesShareCategoryTab(share, categoryId = 'all') {
  if (!categoryId || categoryId === 'all') return true
  return getShareListingCategory(share) === categoryId
}

export function getMinimumShareInvestment(shares = []) {
  let minShare = null
  let minPrice = Infinity

  for (const share of shares) {
    const price = getSharePricePerShare(share)
    if (!Number.isFinite(price) || price <= 0) continue
    if (price < minPrice) {
      minPrice = price
      minShare = share
    }
  }

  if (!minShare) return null

  return {
    amount: minPrice,
    currency: normalizeCurrencyCode(minShare.currency || 'EUR'),
  }
}

export function formatMinimumShareInvestment(minInvestment, locale = 'en') {
  if (!minInvestment) return null
  const { amount, currency } = minInvestment
  const numberLocale = String(locale || 'en').startsWith('ru')
    ? 'ru-RU'
    : String(locale || 'en').startsWith('de')
      ? 'de-DE'
      : 'en-US'

  return formatPropertyPrice(amount, currency, {
    compact: false,
    locale: numberLocale,
  })
}

export const SHARES_PAGE_SIZE = 8

export const SHARES_SORT_OPTIONS = [
  { value: 'popularity', labelKey: 'sharesSortPopularity' },
  { value: 'yield', labelKey: 'sharesSortYield' },
  { value: 'min_investment', labelKey: 'sharesSortMinInvestment' },
  { value: 'collected', labelKey: 'sharesSortCollected' },
]

export function getShareAnnualYield(share = {}) {
  const raw = share.annualYield ?? share.annual_yield ?? share.yield_percent
  const value = Number(raw)
  return Number.isFinite(value) ? value : 12.7
}

function getShareAnnualYieldRaw(share = {}) {
  const raw = share.annualYield ?? share.annual_yield ?? share.yield_percent
  if (raw == null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function getSharesNumberLocale(locale = 'en') {
  const lang = String(locale || 'en')
  if (lang.startsWith('ru')) return 'ru-RU'
  if (lang.startsWith('de')) return 'de-DE'
  if (lang.startsWith('fr')) return 'fr-FR'
  if (lang.startsWith('es')) return 'es-ES'
  if (lang.startsWith('sv')) return 'sv-SE'
  return 'en-US'
}

/** Агрегированная статистика каталога долей (из реальных объектов API). */
export function getSharesPlatformStats(shares = []) {
  const marketVolumeByCurrency = {}
  let totalSharesSold = 0

  for (const share of shares) {
    totalSharesSold += Math.max(0, Number(share.sharesSold) || 0)

    const currency = normalizeCurrencyCode(share.currency || 'EUR')
    const totalPrice = Math.max(0, Number(share.totalPrice) || 0)
    marketVolumeByCurrency[currency] = (marketVolumeByCurrency[currency] || 0) + totalPrice
  }

  const availableObjects = shares.filter((share) => !isShareSoldOut(share)).length
  const minimumInvestment = getMinimumShareInvestment(shares)

  const yields = []
  for (const share of shares) {
    const yieldValue = getShareAnnualYieldRaw(share)
    if (yieldValue != null) yields.push(yieldValue)
  }
  const averageYield =
    yields.length > 0 ? yields.reduce((sum, value) => sum + value, 0) / yields.length : null

  return {
    availableObjects,
    totalObjects: shares.length,
    totalSharesSold,
    marketVolumeByCurrency,
    minimumInvestment,
    averageYield,
  }
}

function formatAmountsByCurrency(amountsByCurrency = {}, locale = 'en') {
  const numberLocale = getSharesNumberLocale(locale)
  const entries = Object.entries(amountsByCurrency).filter(([, amount]) => amount > 0)

  if (entries.length === 1) {
    const [currency, amount] = entries[0]
    return formatPropertyPrice(amount, currency, { compact: false, locale: numberLocale })
  }

  if (entries.length > 1) {
    return entries
      .sort((a, b) => b[1] - a[1])
      .map(([currency, amount]) =>
        formatPropertyPrice(amount, currency, { compact: false, locale: numberLocale }),
      )
      .join(' · ')
  }

  const fallbackCurrency = entries[0]?.[0] || 'EUR'
  return formatPropertyPrice(0, fallbackCurrency, { compact: false, locale: numberLocale })
}

export function formatSharesPlatformStatValues(stats, locale = 'en') {
  const numberLocale = getSharesNumberLocale(locale)
  const countFormatter = new Intl.NumberFormat(numberLocale)

  const marketVolume = formatAmountsByCurrency(stats.marketVolumeByCurrency, locale)

  let minEntry = '—'
  if (stats.minimumInvestment) {
    minEntry =
      formatMinimumShareInvestment(stats.minimumInvestment, locale) ||
      formatPropertyPrice(
        stats.minimumInvestment.amount,
        stats.minimumInvestment.currency,
        { compact: false, locale: numberLocale },
      )
  }

  let averageYield = '—'
  if (stats.averageYield != null) {
    averageYield =
      formatShareAnnualYieldDisplay(stats, locale) ||
      `${new Intl.NumberFormat(numberLocale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }).format(stats.averageYield)}%`
  }

  return {
    objectsAvailable: countFormatter.format(stats.availableObjects ?? 0),
    sharesSold: countFormatter.format(stats.totalSharesSold ?? 0),
    marketVolume,
    minEntry,
    averageYield,
  }
}

export function formatShareAnnualYieldDisplay(stats, locale = 'en') {
  if (stats?.averageYield == null) return null
  const numberLocale = getSharesNumberLocale(locale)
  return `${new Intl.NumberFormat(numberLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(stats.averageYield)}%`
}

export function getSharesFilterOptions(shares = []) {
  return {
    locations: buildLocationOptionsFromProperties(shares),
  }
}

export function sortShares(shares = [], sortKey = 'popularity') {
  const list = [...shares]
  switch (sortKey) {
    case 'yield':
      return list.sort((a, b) => getShareAnnualYield(b) - getShareAnnualYield(a))
    case 'min_investment':
      return list.sort((a, b) => getSharePricePerShare(a) - getSharePricePerShare(b))
    case 'collected':
      return list.sort((a, b) => getCollectedPercent(b) - getCollectedPercent(a))
    default:
      return list.sort((a, b) => {
        const soldOutDiff = Number(isShareSoldOut(a)) - Number(isShareSoldOut(b))
        if (soldOutDiff !== 0) return soldOutDiff
        return getCollectedPercent(b) - getCollectedPercent(a)
      })
  }
}

export function paginateShares(shares = [], page = 1, pageSize = SHARES_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(shares.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    items: shares.slice(start, start + pageSize),
    totalPages,
    currentPage: safePage,
    totalItems: shares.length,
  }
}

export function getVisiblePaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({ type: 'page', value: index + 1 }))
  }

  const items = [{ type: 'page', value: 1 }]
  if (currentPage > 3) items.push({ type: 'ellipsis' })

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  for (let page = start; page <= end; page += 1) {
    items.push({ type: 'page', value: page })
  }

  if (currentPage < totalPages - 2) items.push({ type: 'ellipsis' })
  if (totalPages > 1) items.push({ type: 'page', value: totalPages })
  return items
}
