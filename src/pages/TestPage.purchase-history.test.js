import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./TestPage.jsx', import.meta.url), 'utf8')
const endpoint = await readFile(new URL('../../server/stripeBilling.js', import.meta.url), 'utf8')

test('integrates the purchased-property card and sequential drawers in the new profile', () => {
  assert.match(page, /PurchasedPropertyHistoryCard/)
  assert.match(page, /PurchasedPropertyDrawer/)
  assert.match(page, /selectedPurchasedProperty/)
  assert.match(page, /setPurchaseDrawerView\('sell'\)/)
  assert.match(page, /setPurchaseDrawerView\('details'\)/)
  assert.match(page, /openManagerChatModal/)
  assert.match(page, /handleSellObjectFromHistory/)
})

test('reservation history endpoint exposes real property location fields', () => {
  assert.match(endpoint, /property_location/)
  assert.match(endpoint, /property_city/)
  assert.match(endpoint, /property_country/)
  assert.match(endpoint, /property_address/)
})
