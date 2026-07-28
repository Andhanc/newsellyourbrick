/**
 * Минимальный шаг над текущей максимальной ставкой (первая кнопка быстрой ставки).
 * Должен совпадать с логикой на сервере POST /api/bids.
 */
export function getAuctionMinBidStep(effectiveCurrentBid) {
  const n = Number(effectiveCurrentBid) || 0
  if (n < 300000) return 1000
  if (n < 500000) return 5000
  if (n < 1000000) return 15000
  return 25000
}
