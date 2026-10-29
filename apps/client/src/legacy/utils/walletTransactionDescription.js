/** Known transaction descriptions (legacy Russian + current English API). */
const WALLET_TX_DESCRIPTION_KEYS = {
  'Пополнение депозита': 'walletPage_txDepositTopUp',
  'Deposit top-up': 'walletPage_txDepositTopUp',
  'Пополнение депозита (Stripe)': 'walletPage_txDepositTopUpStripe',
  'Deposit top-up (Stripe)': 'walletPage_txDepositTopUpStripe',
  'Резерв по ставке': 'walletPage_txBidReserve',
  'Bid reserve hold': 'walletPage_txBidReserve',
  'Возврат резерва': 'walletPage_txReserveReturn',
  'Reserve release': 'walletPage_txReserveReturn',
  'Вывод средств': 'walletPage_txWithdrawFunds',
  Withdrawal: 'walletPage_txWithdrawFunds',
}

export function localizeWalletTransactionDescription(description, t) {
  const raw = typeof description === 'string' ? description.trim() : ''
  if (!raw) return ''
  const key = WALLET_TX_DESCRIPTION_KEYS[raw]
  return key ? t(key) : raw
}

export const WALLET_TX_DESCRIPTION_KEY_BY_RAW = WALLET_TX_DESCRIPTION_KEYS
