import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (relativePath) =>
  fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8')

test('dedicated buy-now catalogue includes configured share listings', () => {
  const page = read('./BuyNow.jsx')
  const css = read('./BuyNow.css')
  const app = read('../App.jsx')
  const pinnedNav = read('../utils/pinnedCatalogNav.js')

  assert.match(app, /path="\/auction\/buy-now"/)
  assert.match(page, /isShareBuyNowEnabled\(property\)/)
  assert.match(page, /<SharesPropertyCard/)
  assert.match(page, /<AuctionPropertyCard/)
  assert.match(page, /<DebtsPropertyCard/)
  assert.match(page, /getPropertyListingKind\(property\)\.key/)
  assert.match(page, /getDebtsContextPropertyPath\(property\)/)
  assert.match(page, /discover-auction-cards--buy-now/)
  assert.match(page, /hr-showcases--debts-listing/)
  assert.match(page, /<SharesMobileFiltersDrawer/)
  assert.match(page, /onClick=\{\(\) => setMobileFiltersOpen\(true\)\}/)
  assert.match(page, /name="buy-now-property-type"/)
  assert.match(css, /\.buy-now-mobile-filters__options label\.is-active/)
  assert.match(page, /className="buy-now-hero__brand"/)
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.buy-now-page \.new-header-spacer[\s\S]*?height: 0 !important/)
  assert.match(css, /border-radius: 0 0 50% 50% \/ 0 0 4% 4%/)
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(pinnedNav, /id: 'buyNow', path: '\/auction\/buy-now'/)
  assert.match(pinnedNav, /!path\.startsWith\('\/auction\/buy-now'\)/)
})

test('seller opt-in and share detail full-purchase UI are wired end to end', () => {
  const sellerPage = read('./OwnerAddPropertyTestPage.jsx')
  const publish = read('../utils/oapPublishProperty.js')
  const detail = read('./ShareDetailPage.jsx')
  const panel = read('../components/ShareDetailPurchasePanel.jsx')

  assert.match(sellerPage, /id: 'shares_buy_now'/)
  assert.match(publish, /buy_now_enabled', shareBuyNowEnabled \? '1' : '0'/)
  assert.match(detail, /getShareBuyNowAvailability/)
  assert.match(detail, /<BuyNowModal/)
  assert.match(panel, /disabled=\{!buyNowAvailable\}/)
})

test('new buy-now share surfaces stay identical in web and legacy bundles', () => {
  const pairs = [
    ['./BuyNow.jsx', '../../apps/client/src/legacy/pages/BuyNow.jsx'],
    ['./BuyNow.css', '../../apps/client/src/legacy/pages/BuyNow.css'],
    ['./ShareDetailPage.jsx', '../../apps/client/src/legacy/pages/ShareDetailPage.jsx'],
    [
      '../components/ShareDetailPurchasePanel.jsx',
      '../../apps/client/src/legacy/components/ShareDetailPurchasePanel.jsx',
    ],
    [
      '../components/ShareMobilePurchaseBar.jsx',
      '../../apps/client/src/legacy/components/ShareMobilePurchaseBar.jsx',
    ],
    [
      '../components/SharesPropertyCard.jsx',
      '../../apps/client/src/legacy/components/SharesPropertyCard.jsx',
    ],
    ['../utils/shareBuyNow.js', '../../apps/client/src/legacy/utils/shareBuyNow.js'],
  ]

  for (const [webPath, legacyPath] of pairs) {
    assert.equal(read(webPath), read(legacyPath), `${webPath} must match legacy copy`)
  }
})
