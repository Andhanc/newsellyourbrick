import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./TestPage.jsx', import.meta.url), 'utf8')
const endpoint = await readFile(new URL('../../server/stripeBilling.js', import.meta.url), 'utf8')

test('opening a purchased object from history closes the history sheet so the drawer is not covered', () => {
  assert.match(page, /onOpenPurchased=\{\(item\) => \{[\s\S]*setHistorySheetOpen\(false\)[\s\S]*setSelectedPurchasedProperty\(item\)/)
  assert.match(
    page,
    /onClose=\{\(\) => \{[\s\S]*setSelectedPurchasedProperty\(null\)[\s\S]*setHistorySheetOpen\(true\)/,
  )
})

test('integrates the purchased-property card and sequential drawers in the new profile', () => {
  assert.match(page, /ProfileHistoryExperience/)
  assert.match(page, /PurchasedPropertyDrawer/)
  assert.match(page, /selectedPurchasedProperty/)
  assert.match(page, /setPurchaseDrawerView\('sell'\)/)
  assert.match(page, /setPurchaseDrawerView\('details'\)/)
  assert.match(page, /openPlatformManagerChat/)
  assert.match(page, /ManagerChatModal/)
  assert.doesNotMatch(page, /test-manager-chat-modal-root/)
  assert.match(page, /handleSellObjectFromHistory/)
  assert.match(page, /openSellCabinetFlow/)
  assert.match(page, /OPEN_ROLE_SWITCH_FOR_SELL_EVENT/)
})

test('reservation history endpoint exposes real property location fields', () => {
  assert.match(endpoint, /property_location/)
  assert.match(endpoint, /property_city/)
  assert.match(endpoint, /property_country/)
  assert.match(endpoint, /property_address/)
})
