import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./PurchasedPropertyDrawer.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./PurchasedPropertyDrawer.css', import.meta.url), 'utf8')

test('contains accessible purchase details and both primary actions', () => {
  assert.match(component, /role="dialog"/)
  assert.match(component, /aria-modal="true"/)
  assert.match(component, /purchaseDrawer_contactManager/)
  assert.match(component, /purchaseDrawer_sellProperty/)
  assert.match(component, /disabled=\{!canSell\}/)
  assert.match(component, /item\.isDealCompleted/)
  assert.match(component, /purchaseDrawer_remaining/)
  assert.match(component, /event\.key === 'Escape'/)
  assert.match(component, /event\.key !== 'Tab'/)
  assert.match(component, /element\.inert = true/)
  assert.match(component, /querySelector\('\.app-layout'\)/)
  assert.match(component, /createPortal/)
})

test('contains all six resale onboarding steps and seller CTA', () => {
  assert.match(component, /purchaseDrawer_step1Title/)
  assert.match(component, /purchaseDrawer_step2Title/)
  assert.match(component, /purchaseDrawer_step3Title/)
  assert.match(component, /purchaseDrawer_step4Title/)
  assert.match(component, /purchaseDrawer_step5Title/)
  assert.match(component, /purchaseDrawer_step6Title/)
  assert.match(component, /purchaseDrawer_becomeSeller/)
})

test('uses a desktop right drawer and mobile bottom sheet', () => {
  assert.match(css, /right:\s*0/)
  assert.match(css, /max-width:\s*520px/)
  assert.match(css, /@media \(max-width: 680px\)/)
  assert.match(css, /env\(safe-area-inset-bottom\)/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /z-index:\s*13350/)
  assert.match(css, /purchase-drawer__primary--locked/)
})
