export function summarizeComparisonRows(rows = []) {
  const score = { left: 0, right: 0, tie: 0 }
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.displayOnly || row?.decisionSignal !== true) continue
    if (row?.winner === 'left' || row?.winner === 'right' || row?.winner === 'tie') {
      score[row.winner] += 1
    }
  }

  const compared = score.left + score.right + score.tie
  const leader = compared === 0
    ? 'unknown'
    : score.left === score.right
      ? 'tie'
      : score.left > score.right ? 'left' : 'right'

  return { ...score, compared, leader }
}

export function selectComparisonItem(pair, side) {
  if (side !== 'left' && side !== 'right') return null
  return pair?.[side] ?? null
}

function positiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function firstPositive(values) {
  for (const value of values) {
    const number = positiveNumber(value)
    if (number != null) return number
  }
  return null
}

function isTrueAuctionFlag(value) {
  if (value === true || value === 1) return true
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true'
}

export function isAuctionListing(property = {}) {
  return isTrueAuctionFlag(property.isAuction) || isTrueAuctionFlag(property.is_auction)
}

export function resolvePositivePropertyPrice(property = {}) {
  const currentBid = firstPositive([
    property.currentBid,
    property.current_bid,
    property.auction_current_bid,
  ])
  const auctionStart = firstPositive([
    property.auction_starting_price,
    property.auctionStartingPrice,
    property.starting_price,
  ])
  const salePrice = firstPositive([
    property.price,
    property.buy_now_price,
    property.buyNowPrice,
  ])
  const isAuction = isAuctionListing(property)

  if (isAuction) return currentBid ?? auctionStart ?? salePrice
  return salePrice ?? auctionStart ?? currentBid
}
