import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./PurchaseSuccessModal.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./PurchaseSuccessModal.css', import.meta.url), 'utf8')
const bridge = await readFile(new URL('./PurchaseCheckoutSuccessBridge.jsx', import.meta.url), 'utf8')
const context = await readFile(new URL('../context/PurchaseSuccessContext.jsx', import.meta.url), 'utf8')

test('confirmed reservation uses the accessible buyer sheet and explains the next steps', () => {
  assert.match(source, /BuyerSheetShell/)
  assert.match(source, /purchase-success-modal-title/)
  assert.match(source, /purchase-success-modal-description/)
  assert.match(source, /purchase-success-modal__steps/)
  assert.match(css, /min-height:\s*52px/)
})

test('purchase confirmation distinguishes shares from a reservation', () => {
  assert.match(source, /purchaseKind === 'share'/)
  assert.match(source, /Доли куплены/)
  assert.match(source, /Объект закреплён за вами/)
  assert.match(bridge, /purchaseKind:\s*kind/)
  assert.match(context, /property\?\.purchaseKind === 'share'/)
  assert.match(context, /navigate\('\/profile'\)/)
  assert.match(context, /import\.meta\.env\.DEV/)
  assert.match(context, /buyer_success_preview/)
})
