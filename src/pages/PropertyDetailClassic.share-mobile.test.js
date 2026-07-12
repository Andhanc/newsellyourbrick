import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const readSource = (url) => readFile(url, 'utf8').catch(() => '')

const page = await readSource(new URL('./PropertyDetailClassic.jsx', import.meta.url))
const pageCss = await readSource(new URL('./PropertyDetailClassic.css', import.meta.url))
const panel = await readSource(new URL('../components/ShareDetailPurchasePanel.jsx', import.meta.url))
const mobileBar = await readSource(new URL('../components/ShareMobilePurchaseBar.jsx', import.meta.url))
const mobileBarCss = await readSource(new URL('../components/ShareMobilePurchaseBar.css', import.meta.url))

test('places the live ownership chart below the mobile share title', () => {
  assert.match(panel, /mode = 'full'/)
  assert.match(panel, /const showChart = mode !== 'purchase'/)
  assert.match(panel, /const showPurchase = mode !== 'chart'/)
  assert.match(page, /property-detail-mobile-share-chart[\s\S]*?<ShareDetailPurchasePanel[\s\S]*?mode="chart"/)
  assert.match(page, /isShareListing \? \[aboutTab, galleryTab\]/)
})

test('uses a dedicated fixed mobile bar to buy several shares', () => {
  assert.match(page, /import ShareMobilePurchaseBar from '..\/components\/ShareMobilePurchaseBar'/)
  assert.match(page, /<ShareMobilePurchaseBar config=\{shareListingConfig\} \/>/)
  assert.match(mobileBar, /share-mobile-purchase-bar__stepper/)
  assert.match(mobileBar, /onBuyCountChange\?\.\(Math\.max\(1, buyCount - 1\)\)/)
  assert.match(mobileBar, /onBuyCountChange\?\.\(Math\.min\(availableToBuy, buyCount \+ 1\)\)/)
  assert.match(mobileBar, /shareDetailBuyShares/)
  assert.match(mobileBar, /shareDetailSoldOutTitle/)
})

test('reserves enough safe-area space for the taller share purchase bar', () => {
  assert.match(pageCss, /property-detail-page-new--share-listing\s*\{[\s\S]*?padding-bottom:\s*calc\(164px/)
  assert.match(mobileBarCss, /padding:\s*12px 16px calc\(12px \+ env\(safe-area-inset-bottom, 0px\)\)/)
  assert.match(mobileBarCss, /min-height:\s*44px/)
  assert.match(mobileBarCss, /@media \(max-width: 360px\)/)
})
