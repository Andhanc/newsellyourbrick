/** Метрики доли для карточек — без sharesPageFilters / auctionDesktopFilterMatch. */

export function isShareSoldOut(share = {}) {
  const total = Math.max(1, Number(share.totalShares) || 1)
  const sold = Math.min(Number(share.sharesSold) || 0, total)
  return sold >= total
}

export function getSharePricePerShare(share = {}) {
  const raw = share.pricePerShare ?? share.price_per_share ?? share.share_price ?? 0
  const price = Number(raw)
  return Number.isFinite(price) ? price : 0
}
