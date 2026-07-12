import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./hrShowcaseAuctionCards.css', import.meta.url), 'utf8')
const card = await readFile(new URL('../components/AuctionPropertyCard.jsx', import.meta.url), 'utf8')

test('stretches the single auction bid action across the full listing card', () => {
  assert.match(card, /auction-card__actions--single/)
  assert.match(
    css,
    /\.hr-showcases\.hr-showcases--auction-listing\.auction-mobile-stack--desktop-cards \.auction-card__actions--single,[\s\S]*?grid-template-columns:\s*1fr/,
  )
})

test('keeps two columns when bid and buy-now actions are both present', () => {
  assert.match(
    css,
    /\.hr-showcases\.hr-showcases--auction-listing\.auction-mobile-stack--desktop-cards \.auction-card__actions,[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
  )
})
