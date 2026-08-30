import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const jsx = await readFile(new URL('./DepositSuccessDrawer.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./DepositSuccessDrawer.css', import.meta.url), 'utf8')

test('uses a tiffany check in the centered deposit success modal', () => {
  assert.match(jsx, /className="deposit-success-modal__check"/)
  assert.match(jsx, /FiCheck/)
  assert.match(css, /background:\s*#4ecdd6/i)
  assert.doesNotMatch(jsx, /deposit-success-check-3d/)
})

test('keeps the success message focused without rendering the wallet balance', () => {
  assert.doesNotMatch(jsx, /balanceFormatted/)
  assert.doesNotMatch(jsx, /deposit-success-modal__balance/)
  assert.doesNotMatch(jsx, /depositSuccessDrawer_balance/)
})

test('keeps the success state as a centered mobile modal with the branded CTA', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 480px)'))

  assert.match(css, /\.deposit-success-modal\s*\{[\s\S]*place-items:\s*center/)
  assert.match(css, /\.deposit-success-modal__cta\s*\{[\s\S]*linear-gradient\(135deg, #6ad6dd/)
  assert.match(mobile, /\.deposit-success-modal__card\s*\{[\s\S]*border-radius:\s*28px/)
})
