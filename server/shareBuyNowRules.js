import { getShareBuyNowAvailability, isShareListing } from '../src/utils/shareBuyNow.js'

export function getShareBuyNowCheckoutBlock(property, purchaseVariant = 'buyNow') {
  if (purchaseVariant !== 'buyNow' || !isShareListing(property)) return null

  const availability = getShareBuyNowAvailability(property)
  if (availability.available) return null

  if (!availability.enabled) {
    return {
      status: 403,
      code: 'SHARE_BUY_NOW_DISABLED',
      error: '100% purchase is not enabled for this share listing',
    }
  }
  if (availability.reason === 'shares_already_sold') {
    return {
      status: 409,
      code: 'SHARE_BUY_NOW_PARTIAL_OWNERSHIP',
      error: '100% purchase unavailable: at least one share is already sold',
    }
  }
  if (availability.reason === 'completed') {
    return {
      status: 409,
      code: 'SHARE_BUY_NOW_COMPLETED',
      error: 'Listing already sold',
    }
  }

  return {
    status: 409,
    code: 'SHARE_BUY_NOW_UNAVAILABLE',
    error: '100% purchase is currently unavailable',
  }
}
