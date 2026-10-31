export const toCents = (value) => Math.round(Number(value) * 100)
export function parseInvestmentAmount(value) {
  const normalized = String(value ?? '')
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const cents = toCents(normalized)
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 1e12
    ? cents / 100
    : null
}
export function investmentShare(amount, capital) {
  return Number(capital) > 0 ? (toCents(amount) / toCents(capital)) * 100 : 0
}
// A wallet is denominated in EUR; keep the existing checkout's 3,000 EUR offset limit.
export function investmentPayment(
  amount,
  walletBalance,
  useDeposit,
  eurRate = 1,
) {
  const total = toCents(amount)
  if (!(total > 0) || !(eurRate > 0)) return { walletEur: 0, cardAmount: 0 }
  let walletCents = useDeposit
    ? Math.min(toCents(walletBalance || 0), 300000, Math.floor(total / eurRate))
    : 0
  walletCents = Math.max(0, walletCents)
  let cardCents = total - Math.round(walletCents * eurRate)
  // Avoid a card remainder smaller than Stripe's supported minimum (EUR/USD/GBP).
  if (cardCents > 0 && cardCents < 50) {
    walletCents = Math.max(0, Math.floor((total - 50) / eurRate))
    cardCents = total - Math.round(walletCents * eurRate)
  }
  return { walletEur: walletCents / 100, cardAmount: cardCents / 100 }
}
