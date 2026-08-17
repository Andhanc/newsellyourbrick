import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./SellerPurchasedPropertyArrivalDrawer.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./SellerPurchasedPropertyArrivalDrawer.css', import.meta.url), 'utf8')
const ownerPage = await readFile(new URL('../pages/OwnerTestPage.jsx', import.meta.url), 'utf8')
const prefill = await readFile(new URL('../utils/purchasedPropertyListingPrefill.js', import.meta.url), 'utf8')
const roleFlow = await readFile(new URL('../hooks/useRoleSwitchFlow.js', import.meta.url), 'utf8')

test('welcomes seller with the purchased property before preparing a listing draft', () => {
  assert.match(component, /У вас есть объект!/) 
  assert.match(component, /Уже перенесли/)
  assert.match(component, /Нужно проверить/)
  assert.match(component, /Нужно добавить/)
  assert.match(component, /Дозаполнить объект/)
  assert.match(component, /applyPurchasedPropertyListingPrefill\(item\.id\)/)
  assert.match(component, /goTo\(OWNER_VIEWS\.ADD_PROPERTY\)/)
  assert.doesNotMatch(component, /clearPurchasedPropertySellerArrival\(\{ clearPending: true \}\)/)
})

test('is integrated into the seller cabinet and keeps a durable arrival handoff', () => {
  assert.match(ownerPage, /SellerPurchasedPropertyArrivalDrawer/)
  assert.match(prefill, /PURCHASED_PROPERTY_SELLER_ARRIVAL_KEY/)
  assert.match(prefill, /promotePendingPurchasedPropertyToSellerArrival/)
  assert.match(roleFlow, /promotePendingPurchasedPropertyToSellerArrival/)
  assert.doesNotMatch(roleFlow, /applyPurchasedPropertyListingPrefill/)
})

test('uses right drawer on desktop and a mobile bottom sheet with safe-area support', () => {
  assert.match(css, /justify-content:\s*flex-end/)
  assert.match(css, /width:\s*min\(100%, 520px\)/)
  assert.match(css, /@media \(max-width: 680px\)/)
  assert.match(css, /align-items:\s*flex-end/)
  assert.match(css, /env\(safe-area-inset-bottom\)/)
  assert.match(css, /prefers-reduced-motion/)
})
