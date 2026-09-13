function isTruthyFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

export function isShareListing(property) {
  if (!property) return false
  const saleType = String(property.sale_type || '').trim().toLowerCase()
  return (
    saleType === 'share' ||
    saleType === 'shares' ||
    isTruthyFlag(property.is_shared_ownership) ||
    isTruthyFlag(property.isShare)
  )
}

export function isShareBuyNowEnabled(property) {
  return isShareListing(property) && isTruthyFlag(property?.buy_now_enabled)
}

export function getShareBuyNowAvailability(property) {
  const enabled = isShareBuyNowEnabled(property)
  const totalShares = Number(property?.total_shares ?? property?.totalShares)
  const sharesSold = Number(property?.shares_sold ?? property?.sharesSold ?? 0)
  const completed =
    property?.buy_now_winner_user_id != null &&
    property?.buy_now_completed_at != null &&
    String(property.buy_now_completed_at).trim() !== ''

  if (!enabled) {
    return { enabled: false, available: false, reason: 'not_enabled', totalShares, sharesSold }
  }
  if (completed) {
    return { enabled: true, available: false, reason: 'completed', totalShares, sharesSold }
  }
  if (!Number.isFinite(totalShares) || totalShares <= 0) {
    return { enabled: true, available: false, reason: 'invalid_inventory', totalShares, sharesSold }
  }
  if (!Number.isFinite(sharesSold) || sharesSold > 0) {
    return { enabled: true, available: false, reason: 'shares_already_sold', totalShares, sharesSold }
  }

  return { enabled: true, available: true, reason: null, totalShares, sharesSold: 0 }
}
