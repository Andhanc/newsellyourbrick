import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8')

test('add-property keeps a purchased draft when pending was already consumed', async () => {
  const source = await read('./purchasedPropertyListingPrefill.js')
  const page = await read('../pages/OwnerAddPropertyTestPage.jsx')
  const properties = await read('../pages/OwnerPropertiesTestPage.jsx')
  const sellNav = await read('./navigateToSellPurchasedProperty.js')
  const draft = await read('./oapAddPropertyDraft.js')

  assert.match(source, /export function shouldClearStalePurchasedPrefillOnAddPropertyMount/)
  assert.match(source, /export function shouldApplyPendingPurchasedPrefill/)
  assert.match(source, /if \(isFilledListingDraft\(existingDraft\)\) return false/)
  assert.match(source, /if \(pending\?\.id\) return false/)
  assert.match(source, /existingDraft\?\.\[PURCHASED_LISTING_DRAFT_FLAG\]/)
  assert.match(source, /existingDraft\?\.draftOrigin === DRAFT_ORIGIN_PURCHASED_PREFILL/)
  assert.match(source, /sourcePurchasedPropertyId/)

  assert.match(page, /shouldApplyPendingPurchasedPrefill/)
  assert.match(page, /shouldClearStalePurchasedPrefillOnAddPropertyMount/)
  assert.match(page, /isSellerCabinetRole\(\)/)
  assert.match(page, /applyPurchasedPropertyListingPrefill\(pending\.id\)/)
  assert.match(page, /ownerPurchased_sellError/)
  assert.match(page, /draftHydrated/)
  assert.match(page, /oap_listing_fee_publish_pending/)
  assert.match(page, /draftSnapshotRef\.current/)
  assert.doesNotMatch(
    page,
    /}, \[searchParams, userId, setSearchParams, handleAfterListingFeeSuccess\]/,
  )

  assert.match(draft, /export function isFilledListingDraft/)
  assert.match(draft, /export function isSparseOapForm/)
  assert.match(draft, /keepExistingDocs/)

  assert.match(properties, /queueSellPurchasedPropertyListing/)
  assert.match(properties, /className="op-purchased-sell"/)
  assert.doesNotMatch(sellNav, /applyPurchasedPropertyListingPrefill\(pid\)/)
  assert.match(sellNav, /storePendingSellPurchasedProperty\(snapshot\)/)
})
