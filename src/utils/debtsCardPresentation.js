import { getEffectiveAuctionEndTime } from './auctionReminderBounds'
import { resolveAuctionCurrentBidValue } from './auctionBidValue'

export function getDebtRiskTone(severity) {
  if (severity === 'red') return 'high'
  if (severity === 'yellow') return 'medium'
  if (severity === 'green') return 'low'
  return 'medium'
}

export function getDebtRiskLabelKey(severity) {
  if (severity === 'red') return 'debtsHighRisk'
  if (severity === 'yellow') return 'debtsMediumRisk'
  if (severity === 'green') return 'debtsLowRisk'
  return 'debtsMediumRisk'
}

function parsePositiveAmount(value) {
  if (value == null || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

function isDebtsAuctionListing(property) {
  return (
    property?.isAuction === true ||
    property?.is_auction === 1 ||
    property?.is_auction === true
  )
}

export function getDebtMinimumBid(property) {
  const raw =
    property.auction_starting_price ??
    property.auctionStartingPrice ??
    property.minimum_bid ??
    property.min_bid ??
    null
  if (raw == null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function resolveDebtsCardBidAmount(property) {
  const auctionBid = resolveAuctionCurrentBidValue(property)
  if (auctionBid > 0) return auctionBid

  const startingPrice = getDebtMinimumBid(property)
  if (startingPrice != null) return startingPrice

  if (!isDebtsAuctionListing(property)) {
    return parsePositiveAmount(property.price)
  }

  return null
}

/** Карточка долга: сумма долга и текущая ставка (без mapPageFilters). */
export function getDebtsCardPresentation(property) {
  const hasActiveAuction =
    isDebtsAuctionListing(property) && getEffectiveAuctionEndTime(property) != null

  const debtAmount = parsePositiveAmount(property.debt_amount)
  const bidAmount = resolveDebtsCardBidAmount(property)

  const metrics = [
    { id: 'debt', labelKey: 'debtsCardDebtAmount', amount: debtAmount },
    { id: 'bid', labelKey: 'debtsCardCurrentBid', amount: bidAmount },
  ]

  const actions = []
  if (hasActiveAuction) {
    actions.push({ id: 'bid', labelKey: 'placeBid', variant: 'primary' })
  } else if (debtAmount != null || bidAmount != null) {
    actions.push({ id: 'view', labelKey: 'debtsCardViewDetails', variant: 'primary' })
  }

  return {
    metrics,
    actions,
    hasActiveAuction,
  }
}
