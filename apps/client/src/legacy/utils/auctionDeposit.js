/** Минимальный депозит для участия в аукционе (EUR). Согласовано с server/utils/auctionDeposit.js */
export const AUCTION_DEPOSIT_MIN_EUR = 3000

export function isAuctionDepositSufficient(depositAmount) {
  const n = Number(depositAmount)
  return Number.isFinite(n) && n >= AUCTION_DEPOSIT_MIN_EUR
}
