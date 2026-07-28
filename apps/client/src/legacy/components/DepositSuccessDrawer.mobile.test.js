import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const jsx = await readFile(new URL('./DepositSuccessDrawer.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./DepositSuccessDrawer.css', import.meta.url), 'utf8')

test('uses the branded 3D success artwork in the deposit success drawer', () => {
  assert.match(jsx, /\/images\/property-detail\/deposit-success-check-3d\.png/)
  assert.match(jsx, /className="deposit-success-drawer__illustration"/)
  assert.match(jsx, /alt=""/)
  assert.match(jsx, /aria-hidden="true"/)
})

test('keeps the success message focused without rendering the wallet balance', () => {
  assert.doesNotMatch(jsx, /balanceFormatted/)
  assert.doesNotMatch(jsx, /deposit-success-drawer__balance/)
  assert.doesNotMatch(jsx, /depositSuccessDrawer_balance/)
})

test('turns the deposit success state into a left-aligned mobile bottom sheet', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 480px)'))

  assert.match(mobile, /\.deposit-success-drawer\s*\{[\s\S]*?padding:\s*0/)
  assert.match(mobile, /\.deposit-success-drawer__panel\s*\{[\s\S]*?max-width:\s*none/)
  assert.match(mobile, /border-radius:\s*28px 28px 0 0/)
  assert.match(mobile, /text-align:\s*left/)
  assert.match(mobile, /env\(safe-area-inset-bottom, 0px\)/)
  assert.match(mobile, /\.deposit-success-drawer__illustration\s*\{[\s\S]*?object-fit:\s*contain/)
})
