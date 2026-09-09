import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const drawerCss = await readFile(new URL('./AuctionBidDrawer.css', import.meta.url), 'utf8')
const legacyDrawerCss = await readFile(
  new URL('../../apps/client/src/legacy/components/AuctionBidDrawer.css', import.meta.url),
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

test('mobile bid drawer uses the branded auction stage layout', () => {
  assert.match(
    propertyPage,
    /<AuctionBidDrawer[\s\S]*?<PropertyDetailAuctionBiddingForm[\s\S]*?layout="panel"/,
  )
  assert.match(biddingForm, /bidding-section__quick-label/)
  assert.match(biddingForm, /bidding-section__panel-box--ready/)
  assert.match(biddingForm, /property-detail-sidebar__current-bid--auction-stage/)
  assert.match(biddingForm, /propertyDetailAuctionLive/)
  assert.match(biddingForm, /current-bid-live__dot/)
  assert.match(biddingForm, /<Gavel/)
})

test('mobile bid drawer keeps the listing clear and fits its content without a scroll cap', () => {
  assert.doesNotMatch(drawerCss, /backdrop-filter|overflow-y:\s*(auto|scroll)|max-height:\s*min/)
  assert.doesNotMatch(drawerCss, /#07131f|#082631|#071d28/)
  assert.match(drawerCss, /Light, content-sized sheet/)
  assert.match(drawerCss, /bidding-section__panel-box--ready/)
  assert.match(drawerCss, /bidding-section__panel-submit:focus-visible/)
  assert.match(drawerCss, /@media \(prefers-reduced-motion: reduce\)/)
})

test('drawer preserves the real timer and uses dismiss-only dragging', async () => {
  const drawer = await readFile(new URL('./AuctionBidDrawer.jsx', import.meta.url), 'utf8')
  const legacyDrawer = await readFile(new URL('../../apps/client/src/legacy/components/AuctionBidDrawer.jsx', import.meta.url), 'utf8')
  assert.equal(drawer, legacyDrawer)
  assert.match(drawer, /dismissOnly: true/)
  assert.doesNotMatch(drawer, /maxViewportHeightRatio:/)
  assert.match(propertyPage, /contextAnchorSelector="\.property-detail-mobile-head__timer"/)
  assert.match(drawer, /anchor\.closest\('\.app-layout'\)/)
  assert.match(drawer, /scrollRoot\?\.scrollTop \?\? window\.scrollY/)
  assert.match(drawer, /scrollTarget\.scrollTo/)
  assert.match(drawer, /observer\?\.observe\(anchor\)/)
  assert.match(drawer, /top: originalScrollY/)
  assert.match(drawer, /event\.key === 'Escape'/)
})

test('web and legacy mobile bid drawer implementations stay identical', () => {
  assert.equal(legacyDrawerCss, drawerCss)
  assert.equal(legacyBiddingForm, biddingForm)
  assert.equal(legacyPropertyPage, propertyPage)
})
