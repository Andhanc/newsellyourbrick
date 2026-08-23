/** Проценты только по пунктам с победителем: 7 и 3 → 70 / 30. Сумма всегда 100, если есть хотя бы один победитель. */
export function comparisonWinPercents(leftWins = 0, rightWins = 0) {
  const left = Math.max(0, Number(leftWins) || 0)
  const right = Math.max(0, Number(rightWins) || 0)
  const decided = left + right
  if (decided <= 0) return { leftPct: 0, rightPct: 0, decided: 0 }
  if (left === right) return { leftPct: 50, rightPct: 50, decided }
  const leftPct = Math.round((left / decided) * 100)
  return { leftPct, rightPct: 100 - leftPct, decided }
}

export function summarizeComparisonRows(rows = []) {
  const score = { left: 0, right: 0, tie: 0 }
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.displayOnly) continue
    if (row?.winner === 'left' || row?.winner === 'right' || row?.winner === 'tie') {
      score[row.winner] += 1
    }
  }

  const { leftPct, rightPct, decided } = comparisonWinPercents(score.left, score.right)
  const compared = decided + score.tie
  const leader = decided === 0
    ? (score.tie > 0 ? 'tie' : 'unknown')
    : score.left === score.right
      ? 'tie'
      : score.left > score.right ? 'left' : 'right'

  return { ...score, compared, decided, leader, leftPct, rightPct }
}

export function formatComparisonDecision(summary, t) {
  if (typeof t !== 'function' || !summary || summary.leader === 'unknown') {
    return typeof t === 'function' ? t('comparePage_decisionUnknown') : ''
  }

  const params = {
    object1: t('comparePage_object1'),
    object2: t('comparePage_object2'),
    leftPct: summary.leftPct || 0,
    rightPct: summary.rightPct || 0,
    pct: summary.leftPct || 50,
    score: summary[summary.leader] || 0,
    count: summary.decided || 0,
    leader: summary.leader === 'right' ? t('comparePage_object2') : t('comparePage_object1'),
  }

  if (summary.leader === 'tie') {
    return summary.decided > 0 ? t('comparePage_decisionTie', params) : t('comparePage_decisionTieAll')
  }

  return t('comparePage_decisionLead', params)
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
