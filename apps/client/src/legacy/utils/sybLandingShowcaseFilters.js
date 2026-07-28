import { isAuctionListingEnded } from './auctionReminderBounds'
import { hasBuyNowOption } from './hasBuyNowOption'

function isDebtProperty(property) {
  if (!property) return false
  return (
    property.sale_type === 'debt' ||
    property.is_debt === 1 ||
    property.is_debt === true ||
    property.has_debt === 1 ||
    property.has_debt === true
  )
}

function isSharedOwnership(property) {
  if (!property) return false
  return (
    property.is_share === 1 ||
    property.is_share === true ||
    property.is_shared_ownership === 1 ||
    property.is_shared_ownership === true
  )
}

export function filterSybAuctionShowcase(properties = []) {
  return properties.filter((property) => {
    if (!property?.isAuction) return false
    if (isSharedOwnership(property)) return false
    if (isDebtProperty(property)) return false
    if (hasBuyNowOption(property)) return false
    return !isAuctionListingEnded(property)
  })
}

export function filterSybBuyNowShowcase(properties = []) {
  return properties.filter((property) => {
    if (!property?.isAuction) return false
    if (isSharedOwnership(property)) return false
    if (isDebtProperty(property)) return false
    return hasBuyNowOption(property) && !isAuctionListingEnded(property)
  })
}

export function filterSybSharesShowcase(properties = []) {
  return properties.filter((property) => property && isSharedOwnership(property))
}

export function filterSybDebtsShowcase(properties = []) {
  return properties.filter((property) => property && isDebtProperty(property))
}
