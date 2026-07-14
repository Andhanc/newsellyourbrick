import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const success = await readFile(new URL('./DepositSuccessDrawer.jsx', import.meta.url), 'utf8')
const info = await readFile(new URL('./DepositInfoDrawer.jsx', import.meta.url), 'utf8')
const wallet = await readFile(new URL('../pages/Wallet.jsx', import.meta.url), 'utf8')

test('deposit drawers share the accessible buyer sheet shell', () => {
  assert.match(success, /BuyerSheetShell/)
  assert.match(success, /tone="success"/)
  assert.match(info, /BuyerSheetShell/)
  assert.match(info, /tone="detail"/)
})

test('confirmed success communicates amount and context-aware next action', () => {
  assert.match(success, /confirmedAmount/)
  assert.match(success, /Вернуться к объекту/)
  assert.match(success, /Вернуться к сравнению/)
  assert.match(success, /Продолжить выбор/)
  assert.match(wallet, /setConfirmedDepositAmount/)
  assert.match(wallet, /confirmedDepositAmount/)
})

test('wallet closes deposit information before opening the top-up choice', () => {
  assert.match(info, /onTopUp/)
  assert.match(wallet, /handleInfoTopUp/)
  assert.match(wallet, /setIsDepositInfoOpen\(false\)/)
  assert.match(wallet, /setShowTopUpPicker\(true\)/)
})

