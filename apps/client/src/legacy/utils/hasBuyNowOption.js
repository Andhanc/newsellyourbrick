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

/**
 * Объект размещён в формате «аукцион + продать сейчас»: есть торги и цена мгновенной покупки
 * строго выше стартовой (или старт не задан, а buy now указан). Для скрытия тест-драйва на чистом аукционе.
 */
export function hasAuctionBuyNowListingForm(property) {
  if (!property) return false
  const st = String(property.sale_type || '').toLowerCase()
  if (st === 'debt' || st === 'share') return false
  if (
    property.is_debt === 1 ||
    property.is_debt === true ||
    property.has_debt === 1 ||
    property.has_debt === true
  ) {
    return false
  }
  if (property.is_shared_ownership === 1 || property.is_shared_ownership === true) return false

  const isAuction =
    property.isAuction === true ||
    property.is_auction === 1 ||
    property.is_auction === true ||
    property.is_auction === '1'
  if (!isAuction) return false

  const buyNowPrice = property.price != null && property.price !== '' ? Number(property.price) : 0
  if (!(buyNowPrice > 0) || Number.isNaN(buyNowPrice)) return false

  const startingPriceRaw =
    property.auction_starting_price ?? property.auctionStartingPrice ?? 0
  const startingPrice =
    startingPriceRaw != null && startingPriceRaw !== '' && !Number.isNaN(Number(startingPriceRaw))
      ? Number(startingPriceRaw)
      : 0

  if (startingPrice > 0 && buyNowPrice > startingPrice) return true
  if (!(startingPrice > 0) && buyNowPrice > 0) return true
  return false
}
