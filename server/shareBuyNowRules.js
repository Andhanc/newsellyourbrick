import { getShareBuyNowAvailability, isShareListing } from '../src/utils/shareBuyNow.js'

export function getShareBuyNowCheckoutBlock(property, purchaseVariant = 'buyNow') {
  if (purchaseVariant !== 'buyNow' || !isShareListing(property)) return null

  const availability = getShareBuyNowAvailability(property)
  if (availability.available) return null

  if (!availability.enabled) {
    return {
      status: 403,
      code: 'SHARE_BUY_NOW_DISABLED',
      error: 'Для этого долевого объекта покупка 100% не подключена',
    }
  }
  if (availability.reason === 'shares_already_sold') {
    return {
      status: 409,
      code: 'SHARE_BUY_NOW_PARTIAL_OWNERSHIP',
      error: 'Покупка 100% объекта недоступна: хотя бы одна доля уже продана',
    }
  }
  if (availability.reason === 'completed') {
    return {
      status: 409,
      code: 'SHARE_BUY_NOW_COMPLETED',
      error: 'Объект уже продан',
    }
  }

  return {
    status: 409,
    code: 'SHARE_BUY_NOW_UNAVAILABLE',
    error: 'Покупка 100% объекта сейчас недоступна',
  }
}
