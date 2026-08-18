import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { listingRelistsPurchase, mergeOwnerListWithPurchases } from './ownerPurchaseListingDedupe.js'

const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8')

test('seller my-objects mapper turns purchases into table rows with status markers', async () => {
  const source = await read('./ownerPurchasedListRows.js')
  const history = await read('./cabinetPurchaseHistory.js')
  const page = await read('../pages/OwnerPropertiesTestPage.jsx')
  const list = await read('./ownerPropertiesList.js')
  const data = await read('../pages/ownerPropertiesTestData.js')

  assert.match(source, /export function mapAuctionWinToOwnerListRow/)
  assert.match(source, /export function mapReservationToOwnerListRow/)
  assert.match(source, /export function mapSharePurchaseToOwnerListRow/)
  assert.match(source, /isPurchased: true/)
  assert.match(source, /purchaseStatus: 'bought'/)
  assert.match(source, /resolvePurchaseStatus/)
  assert.match(source, /filterKey: PURCHASED_TAB_ID/)
  assert.match(source, /mergeOwnerListWithPurchases/)
  assert.match(source, /listingRelistsPurchase/)
  assert.match(source, /ownerPurchaseListingDedupe/)
  assert.match(history, /need_more/)
  assert.match(history, /wait_approval/)

  assert.match(page, /ownerPurchased_colPaid/)
  assert.match(page, /ownerPurchased_colRemaining/)
  assert.match(page, /ownerPurchased_colStatus/)
  assert.match(page, /ObjectsSection/)
  assert.match(page, /ownerPurchased_sectionTitle/)
  assert.match(page, /ownerTest_listingsSectionTitle/)
  assert.match(page, /visiblePurchased/)
  assert.match(page, /visibleListings/)
  assert.match(page, /useOwnerPurchasedListRows/)
  assert.doesNotMatch(page, /<OwnerPurchasedAssets/)
  assert.match(page, /className="op-purchased-sell"/)
  assert.match(page, /queueSellPurchasedPropertyListing/)
  assert.match(page, /buyerCabinet_sellProperty/)
  assert.match(page, /OWNER_VIEWS\.ADD_PROPERTY/)
  assert.match(data, /getOwnerPurchasedMetrics/)
  assert.match(data, /ownerPurchased_paidInFull/)

  assert.match(list, /tab === PURCHASED_TAB_ID/)
  assert.match(list, /row.isPurchased/)
  assert.match(list, /sourcePurchasedPropertyId/)
})

test('hides a purchase after the same object is relisted as a seller listing', () => {
  const purchaseKept = {
    id: 17,
    isPurchased: true,
    title: 'frew',
    location: 'Беларусь, Минск, улица Киселёва, 18',
  }
  const purchaseRelisted = {
    id: 79,
    isPurchased: true,
    title: '234',
    location: 'Беларусь, Минск, улица Уборевича, 66 к1',
  }
  const listing = {
    id: 104,
    isPurchased: false,
    title: '234',
    location: 'Беларусь, Минск, улица Уборевича, 66 к1',
  }

  assert.equal(listingRelistsPurchase(listing, purchaseRelisted), true)
  assert.equal(listingRelistsPurchase(listing, purchaseKept), false)

  const merged = mergeOwnerListWithPurchases([listing], [purchaseKept, purchaseRelisted])
  assert.deepEqual(
    merged.map((row) => row.id),
    [17, 104],
  )
})

test('hides a purchase when the listing stores the source purchased property id', () => {
  const purchase = { id: 79, isPurchased: true, title: 'New title', location: 'Other street' }
  const listing = {
    id: 200,
    isPurchased: false,
    title: 'Renamed listing',
    location: 'Another address',
    sourcePurchasedPropertyId: 79,
  }

  const merged = mergeOwnerListWithPurchases([listing], [purchase])
  assert.deepEqual(
    merged.map((row) => row.id),
    [200],
  )
})
