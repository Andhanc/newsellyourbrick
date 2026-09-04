const COLORS = {
  others: '#5b6ee1',
  mine: '#0099A9',
  pending: '#14b8a6',
  available: '#dff7ff',
}

export function resolveShareDistributionChart({
  totalShares = 0,
  sharesSold = 0,
  myShares = 0,
  availableToBuy = 0,
  buyCount = 0,
}) {
  const othersSold = Math.max(0, sharesSold - myShares)
  const pendingPurchase =
    buyCount > 0 && availableToBuy > 0 ? Math.min(buyCount, availableToBuy) : 0
  const isPreview = pendingPurchase > 0
  const displayAvailable = isPreview
    ? Math.max(0, availableToBuy - pendingPurchase)
    : availableToBuy

  return {
    isPreview,
    othersSold,
    myShares,
    pendingPurchase,
    displayAvailable,
    gradient: buildShareDistributionGradient({
      totalShares,
      othersSold,
      myShares,
      pendingPurchase,
      availableToBuy: displayAvailable,
    }),
  }
}

export function buildShareDistributionGradient({
  totalShares = 0,
  othersSold = 0,
  myShares = 0,
  pendingPurchase = 0,
  availableToBuy = 0,
}) {
  if (totalShares <= 0) return COLORS.available

  let cursor = 0
  const parts = []
  const add = (color, count) => {
    if (count <= 0) return
    const end = cursor + (count / totalShares) * 100
    parts.push(`${color} ${cursor}% ${end}%`)
    cursor = end
  }

  add(COLORS.others, othersSold)
  add(COLORS.mine, myShares)
  add(COLORS.pending, pendingPurchase)
  add(COLORS.available, availableToBuy)

  return parts.length ? `conic-gradient(${parts.join(', ')})` : COLORS.available
}
