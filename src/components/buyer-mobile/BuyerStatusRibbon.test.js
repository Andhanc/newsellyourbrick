import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readOrEmpty(url) {
  try {
    return await readFile(url, 'utf8')
  } catch {
    return ''
  }
}

const source = await readOrEmpty(new URL('./BuyerStatusRibbon.jsx', import.meta.url))
const css = await readOrEmpty(new URL('./BuyerStatusRibbon.css', import.meta.url))
const listingCard = await readOrEmpty(new URL('../PropertyListingCard.jsx', import.meta.url))
const auctionCard = await readOrEmpty(new URL('../AuctionPropertyCard.jsx', import.meta.url))
const mobileAuction = await readOrEmpty(new URL('../ui/AuctionMobileLayout.jsx', import.meta.url))

test('buyer ribbon exposes readable final-state copy without blocking the card', () => {
  assert.match(source, /listingState/)
  assert.match(source, /aria-label=\{label\}/)
  assert.match(source, /buyer-status-ribbon--\$\{tone\}/)
  assert.match(css, /pointer-events:\s*none/)
  assert.match(css, /user-select:\s*text/)
})

test('sold and ended auctions have distinct commercial treatments', () => {
  assert.match(css, /\.buyer-status-ribbon--sold[\s\S]*var\(--buyer-teal-deep\)/)
  assert.match(css, /\.buyer-status-ribbon--auction-ended[\s\S]*var\(--buyer-auction\)/)
  assert.match(css, /repeating-linear-gradient/)
  assert.match(css, /transform:\s*rotate\(-[0-9.]+deg\)/)
})

test('ribbon remains legible on narrow cards and under reduced motion', () => {
  assert.match(css, /font-family:\s*var\(--buyer-font-display\)/)
  assert.match(css, /text-wrap:\s*balance/)
  assert.match(css, /@media\s*\(max-width:\s*360px\)/)
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
})

test('catalog cards consume the shared final-state resolver and ribbon', () => {
  assert.match(listingCard, /resolveBuyerListingState/)
  assert.match(listingCard, /BuyerStatusRibbon/)
  assert.match(auctionCard, /resolveBuyerListingState/)
  assert.match(auctionCard, /AuctionFinalStateRibbon/)
  for (const card of [listingCard, auctionCard]) {
    assert.match(card, /blocksPurchase/)
    assert.match(card, /blocksBid/)
  }
  assert.doesNotMatch(listingCard, /property-auction-ended-overlay--full-card/)
  assert.doesNotMatch(auctionCard, /auction-card__ended-overlay/)
  assert.match(mobileAuction, /resolveBuyerListingState/)
  assert.match(mobileAuction, /BuyerStatusRibbon/)
  assert.doesNotMatch(mobileAuction, /property-auction-ended-overlay--full-card/)
})
