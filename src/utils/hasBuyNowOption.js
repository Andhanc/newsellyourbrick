/**
 * Проверка, что у объекта реально есть опция «Купить сейчас»
 */
export function hasBuyNowOption(property) {
  if (!property) return false

  const isAuction =
    property.isAuction === true ||
    property.is_auction === 1 ||
    property.is_auction === true

  const buyNowPrice = property.price ? Number(property.price) : 0

  const startingPriceRaw =
    property.auction_starting_price ??
    property.auctionStartingPrice ??
    property.currentBid ??
    0
  const startingPrice = startingPriceRaw ? Number(startingPriceRaw) : 0

  const endTimeRaw =
    property.test_timer_end_date ||
    property.endTime ||
    property.auction_end_date ||
    null

  let timerExpired = false
  if (endTimeRaw) {
    const endTs = new Date(endTimeRaw).getTime()
    if (!Number.isNaN(endTs)) {
      timerExpired = endTs <= Date.now()
    }
  }

  const effectiveCurrentBid = property.currentBid
    ? Number(property.currentBid)
    : startingPrice

  if (isAuction) {
    return (
      buyNowPrice > 0 &&
      buyNowPrice > startingPrice &&
      !timerExpired &&
      effectiveCurrentBid < buyNowPrice
    )
  }

  return buyNowPrice > 0
}
