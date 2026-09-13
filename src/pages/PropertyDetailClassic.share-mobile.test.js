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
  assert.match(panel, /resolveShareDistributionChart/)
  assert.match(panel, /shareDetailPieCurrentPurchase/)
  assert.match(panel, /shareDetailLegendYours/)
  assert.match(panel, /shareDetailLegendPending/)
  assert.doesNotMatch(panel, /chart\.myShares > 0/)
  assert.match(page, /property-detail-mobile-share-chart[\s\S]*?<ShareDetailPurchasePanel[\s\S]*?mode="chart"/)
  assert.match(page, /isShareListing\s*\?\s*\[aboutTab,\s*buyNowTab,\s*galleryTab\]\.filter\(Boolean\)/)
})

test('uses a dedicated fixed mobile bar to buy several shares', () => {
  assert.match(page, /import ShareMobilePurchaseBar from '..\/components\/ShareMobilePurchaseBar'/)
  assert.match(page, /auctionMobileTab !== 'buy_now'[\s\S]*?<ShareMobilePurchaseBar config=\{shareListingConfig\} \/>/)
  assert.match(mobileBar, /share-mobile-purchase-bar__stepper/)
  assert.match(mobileBar, /onBuyCountChange\?\.\(Math\.max\(1, buyCount - 1\)\)/)
  assert.match(mobileBar, /onBuyCountChange\?\.\(Math\.min\(availableToBuy, buyCount \+ 1\)\)/)
  assert.match(mobileBar, /shareDetailBuyShares/)
  assert.match(mobileBar, /shareDetailSoldOutTitle/)
  assert.doesNotMatch(mobileBar, /shareDetailBuyNowShort/)
  assert.doesNotMatch(mobileBar, /share-mobile-purchase-bar__cta--buy-now/)
})

test('gives configured share listings their own buy-now tab and full-page state', () => {
  assert.match(page, /const showShareBuyNowTab = Boolean\([\s\S]*?shareListingConfig\?\.buyNowEnabled/)
  assert.match(page, /const showMobileBuyNowTab = showAuctionBuyNowTab \|\| showShareBuyNowTab/)
  assert.match(page, /const buyNowTab = showMobileBuyNowTab \? \(/)
  assert.match(page, /isShareBuyNowTab \? shareListingConfig\?\.onBuyNow : handleBookNow/)
  assert.match(page, /shareDetailBuyNowDescription/)
  assert.match(page, /shareDetailBuyNowLocked/)
  assert.match(page, /shareDetailBuyNowCompleted/)
  assert.match(page, /shareDetailBuyNowUnavailable/)
  assert.match(page, /property-detail-mobile-buy-now--share-locked/)
  assert.match(pageCss, /property-detail-mobile-buy-now--share-locked[\s\S]*?filter:\s*saturate\(0\.42\)/)
})

test('reserves enough safe-area space for the taller share purchase bar', () => {
  assert.match(pageCss, /property-detail-page-new--share-listing\s*\{[\s\S]*?padding-bottom:\s*calc\(164px/)
  assert.match(mobileBarCss, /padding:\s*12px 16px calc\(12px \+ env\(safe-area-inset-bottom, 0px\)\)/)
  assert.match(mobileBarCss, /min-height:\s*44px/)
  assert.match(mobileBarCss, /@media \(max-width: 360px\)/)
})
