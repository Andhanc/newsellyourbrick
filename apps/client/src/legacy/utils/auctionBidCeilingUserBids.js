/**
 * История ставок пользователя для экрана потолка.
 */
export function getUserBidCeilingHistory(bids, userId, currentMaxBid, isUserLeader) {
  const uid = Number(userId)
  const maxBid = Number(currentMaxBid) || 0
  if (!Number.isFinite(uid) || !Array.isArray(bids) || bids.length === 0) {
    return []
  }

  const all = [...bids].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )

  const userBids = all
    .filter((bid) => Number(bid.user_id) === uid)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const userMax = userBids.reduce(
    (acc, bid) => Math.max(acc, Number(bid.bid_amount) || 0),
    0,
  )

  return userBids.slice(0, 6).map((bid) => {
    const amount = Number(bid.bid_amount) || 0
    const bidTime = new Date(bid.created_at).getTime()

    const outbidAfter = all.some(
      (other) =>
        new Date(other.created_at).getTime() > bidTime &&
        Number(other.bid_amount) > amount,
    )

    const isTopUserBid = amount >= userMax
    const isLeading = isUserLeader && isTopUserBid && amount >= maxBid

    let status = 'active'
    if (isLeading) status = 'leading'
    else if (outbidAfter) status = 'outbid'

    return {
      id: bid.id ?? `${bid.created_at}-${amount}`,
      amount,
      createdAt: bid.created_at,
      status,
      fromCeiling: Boolean(bid.from_ceiling),
    }
  })
}
