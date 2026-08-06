import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const jsx = await readFile(new URL('./DepositTopUpPicker.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./DepositTopUpPicker.css', import.meta.url), 'utf8')

test('top-up choice uses the shared accessible buyer sheet', () => {
  assert.match(jsx, /BuyerSheetShell/)
  assert.match(jsx, /tone="choice"/)
  assert.match(jsx, /titleId="deposit-picker-title"/)
  assert.doesNotMatch(jsx, /deposit-picker-overlay/)
})

test('payment methods explain the next step and keep recommended stripe option', () => {
  assert.match(jsx, /Банковская карта/)
  assert.match(jsx, /Криптокошелёк/)
  assert.match(jsx, /Перед оплатой вы увидите сумму и итоговые условия/)
  assert.match(jsx, /deposit-picker__method--recommended/)
})

test('mobile controls are touch-safe and the sheet respects reduced motion', () => {
  assert.match(css, /min-height:\s*56px/)
  assert.match(css, /min-width:\s*44px/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
})
