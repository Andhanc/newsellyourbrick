import test from 'node:test'
import assert from 'node:assert/strict'
import { localizeWalletTransactionDescription } from './walletTransactionDescription.js'

const t = (key) => `translated:${key}`

test('localizeWalletTransactionDescription maps known server strings', () => {
  assert.equal(
    localizeWalletTransactionDescription('Пополнение депозита (Stripe)', t),
    'translated:walletPage_txDepositTopUpStripe',
  )
  assert.equal(
    localizeWalletTransactionDescription('Вывод средств', t),
    'translated:walletPage_txWithdrawFunds',
  )
})

test('localizeWalletTransactionDescription falls back to raw text', () => {
  assert.equal(localizeWalletTransactionDescription('Custom note', t), 'Custom note')
  assert.equal(localizeWalletTransactionDescription('', t), '')
})
