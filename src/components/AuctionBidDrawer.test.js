import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const drawerCss = await readFile(new URL('./AuctionBidDrawer.css', import.meta.url), 'utf8')
const legacyDrawerCss = await readFile(
  new URL('../../apps/client/src/legacy/components/AuctionBidDrawer.css', import.meta.url),
  'utf8',
)
const ceilingCss = await readFile(new URL('./AuctionBidCeilingModal.css', import.meta.url), 'utf8')
const functionalDrawerChromeCss = await readFile(
  new URL('../styles/functionalDrawerChrome.css', import.meta.url),
  'utf8',
)
const legacyFunctionalDrawerChromeCss = await readFile(
  new URL('../../apps/client/src/legacy/styles/functionalDrawerChrome.css', import.meta.url),
  'utf8',
)
const biddingForm = await readFile(
  new URL('./PropertyDetailAuctionBiddingForm.jsx', import.meta.url),
  'utf8',
)
const legacyBiddingForm = await readFile(
  new URL(
    '../../apps/client/src/legacy/components/PropertyDetailAuctionBiddingForm.jsx',
    import.meta.url,
  ),
  'utf8',
)
const propertyPage = await readFile(
  new URL('../pages/PropertyDetailClassic.jsx', import.meta.url),
  'utf8',
)
const legacyPropertyPage = await readFile(
  new URL('../../apps/client/src/legacy/pages/PropertyDetailClassic.jsx', import.meta.url),
  'utf8',
)

test('mobile bid drawer uses the full-screen catalog bid page', () => {
  assert.match(
    propertyPage,
    /<AuctionBidDrawer[\s\S]*?<PropertyDetailAuctionBiddingForm[\s\S]*?layout="panel"/,
  )
  assert.match(propertyPage, /onOpenBidHistory:/)
  assert.match(
    propertyPage,
    /if \(!isBidDrawerOpen\) \{[\s\S]*triggerAuctionBidHaptic\('placed'\)[\s\S]*propertyDetail_bidSuccess/,
  )
  assert.match(propertyPage, /triggerCoinFallHaptic/)
  assert.match(propertyPage, /stopCoinFallHaptic/)
  assert.match(propertyPage, /setBidCelebrateToken/)
  assert.match(propertyPage, /setBidCelebrating\(true\)/)
  assert.match(propertyPage, /celebrateBid: bidCelebrating && isBidDrawerOpen/)
  assert.match(biddingForm, /import '\.\/AuctionBidDrawer\.css'/)
  assert.match(biddingForm, /createPortal\(celebrateOverlay, document\.body\)/)
  assert.match(drawerCss, /--coin-top/)
  assert.match(biddingForm, /--coin-top/)
  assert.match(biddingForm, /--coin-fall/)
  assert.doesNotMatch(
    propertyPage,
    /propertyDetail_bidSuccess[\s\S]{0,220}setIsBidDrawerOpen\(false\)/,
  )
  assert.match(biddingForm, /auction-bid-hero/)
  assert.match(biddingForm, /normalizePropertyMediaFields/)
  assert.match(biddingForm, /listingPhotos/)
  assert.match(biddingForm, /auction-bid-thumbs/)
  assert.match(biddingForm, /thumbItems/)
  assert.match(biddingForm, /auction-bid-thumbs__more/)
  assert.match(biddingForm, /AuctionBidCeilingModal/)
  assert.match(biddingForm, /embedded/)
  assert.match(biddingForm, /bidCeilingModalProps/)
  assert.match(biddingForm, /auction-bid-mode/)
  assert.match(biddingForm, /auctionBidDrawerAutoBid/)
  assert.match(biddingForm, /auction-bid-mission/)
  assert.match(biddingForm, /AUCTION_BID_MISSION_ART/)
  assert.match(biddingForm, /bidding-section__panel-box--ready/)
  assert.match(biddingForm, /property-detail-sidebar__current-bid--auction-stage/)
  assert.match(biddingForm, /bidding-section__panel-submit-shine/)
  assert.match(biddingForm, /bidding-section__quick-btn-shine/)
  assert.match(biddingForm, /auction-bid-coins/)
  assert.match(biddingForm, /AUCTION_BID_COIN_ART/)
  assert.match(biddingForm, /syb-coin-a/)
  assert.match(biddingForm, /BID_SUCCESS_COINS/)
  assert.match(biddingForm, /BID_CELEBRATE_MS/)
  assert.match(biddingForm, /bidCelebrateToken/)
  assert.match(biddingForm, /auction-bid-celebrate-layer/)
  assert.match(biddingForm, /createPortal/)
  assert.match(biddingForm, /isUserLeader && !celebrateBid/)
  assert.match(biddingForm, /auction-bid-rise/)
  assert.match(biddingForm, /FiArrowUp/)
  assert.match(biddingForm, /AUCTION_BID_TROPHY_ART/)
  assert.match(biddingForm, /syb-trophy/)
  assert.match(biddingForm, /auctionBidDrawerHistoryLink/)
  assert.match(biddingForm, /onOpenBidHistory/)
  assert.doesNotMatch(biddingForm, /auction-bid-tiffany-sofa/)
})

test('mobile bid drawer fills the viewport like a catalog page', () => {
  assert.doesNotMatch(drawerCss, /#07131f|#082631|#071d28/)
  assert.match(drawerCss, /Full-screen catalog bid page/)
  assert.match(drawerCss, /height:\s*100%/)
  assert.match(drawerCss, /auction-bid-mode/)
  assert.match(drawerCss, /auction-bid-thumbs/)
  assert.match(drawerCss, /object-fit:\s*cover/)
  assert.match(drawerCss, /height:\s*calc\(36vh \+ 20px\)/)
  assert.match(drawerCss, /margin:\s*-20px 0 0/)
  assert.match(drawerCss, /border-radius:\s*24px 24px 0 0/)
  assert.match(drawerCss, /auction-bid-drawer__close \{[\s\S]*width:\s*44px/)
  assert.match(drawerCss, /auction-bid-thumbs__btn \{[\s\S]*border-radius:\s*12px/)
  assert.match(drawerCss, /bottom:\s*28px/)
  assert.match(drawerCss, /text-overflow:\s*ellipsis/)
  assert.match(drawerCss, /white-space:\s*nowrap/)
  assert.match(drawerCss, /auction-bid-mission/)
  assert.match(drawerCss, /background:\s*#f3f5f7/)
  assert.match(drawerCss, /bidding-section__panel-submit:focus-visible/)
  assert.match(drawerCss, /position:\s*sticky/)
  assert.match(drawerCss, /#6ec6d0/)
  assert.match(drawerCss, /border-radius:\s*999px/)
  assert.match(drawerCss, /auction-bid-iridescent/)
  assert.match(drawerCss, /bidding-section__quick-btn-shine/)
  assert.match(drawerCss, /auction-bid-coin-fall/)
  assert.match(drawerCss, /auction-bid-winner-rise/)
  assert.match(drawerCss, /auction-bid-rise-card/)
  assert.match(drawerCss, /auction-bid-arrow-bob/)
  assert.match(drawerCss, /auction-bid-celebrate-layer/)
  assert.match(drawerCss, /z-index:\s*13450/)
  assert.match(drawerCss, /position:\s*fixed/)
  assert.match(drawerCss, /auction-bid-rise__arrow/)
  assert.match(drawerCss, /@media \(prefers-reduced-motion: reduce\)/)
})

test('bid increments stay gray and submit matches the auto-bid button', () => {
  assert.doesNotMatch(functionalDrawerChromeCss, /\.auction-bid-drawer__body \.bidding-section__(?:quick-btn|panel-submit)/)
  assert.equal(legacyFunctionalDrawerChromeCss, functionalDrawerChromeCss)

  const quickButton = drawerCss.match(/\.auction-bid-drawer__body \.bidding-section__quick-btn \{([^}]+)\}/)?.[1]
  const submitButton = drawerCss.match(/\.auction-bid-drawer__body \.bidding-section__panel-submit \{([^}]+)\}/)?.[1]
  const autoBidButton = ceilingCss.match(/\.abc-fix \{([^}]+)\}/)?.[1]
  const background = (rule) => rule?.match(/background: (linear-gradient\([^;]+\));/)?.[1]

  assert.match(quickButton, /color: #334155 !important;/)
  assert.match(quickButton, /background: linear-gradient\(118deg, #dce3e8/)
  assert.equal(background(submitButton), background(autoBidButton))
})

test('drawer preserves dismiss-only dragging and escape', async () => {
  const drawer = await readFile(new URL('./AuctionBidDrawer.jsx', import.meta.url), 'utf8')
  const legacyDrawer = await readFile(new URL('../../apps/client/src/legacy/components/AuctionBidDrawer.jsx', import.meta.url), 'utf8')
  assert.equal(drawer, legacyDrawer)
  assert.match(drawer, /dismissOnly: true/)
  assert.match(drawer, /FiChevronLeft/)
  assert.doesNotMatch(drawer, /maxViewportHeightRatio:/)
  assert.match(drawer, /event\.key === 'Escape'/)
})

test('web and legacy mobile bid drawer implementations stay identical', () => {
  assert.equal(legacyDrawerCss, drawerCss)
  assert.equal(legacyBiddingForm, biddingForm)
  assert.equal(legacyPropertyPage, propertyPage)
})
