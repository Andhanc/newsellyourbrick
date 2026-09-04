/** Known transaction descriptions stored in Russian on the server. */
const WALLET_TX_DESCRIPTION_KEYS = {
  'Пополнение депозита': 'walletPage_txDepositTopUp',
  'Пополнение депозита (Stripe)': 'walletPage_txDepositTopUpStripe',
  'Резерв по ставке': 'walletPage_txBidReserve',
  'Возврат резерва': 'walletPage_txReserveReturn',
  'Вывод средств': 'walletPage_txWithdrawFunds',
}

export function localizeWalletTransactionDescription(description, t) {
  const raw = typeof description === 'string' ? description.trim() : ''
  if (!raw) return ''
  const key = WALLET_TX_DESCRIPTION_KEYS[raw]
  return key ? t(key) : raw
}

export const WALLET_TX_DESCRIPTION_KEY_BY_RAW = WALLET_TX_DESCRIPTION_KEYS
