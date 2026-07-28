import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./hrShowcaseAuctionCards.css', import.meta.url), 'utf8')
const card = await readFile(new URL('../components/AuctionPropertyCard.jsx', import.meta.url), 'utf8')

test('hr showcase stylesheet still styles generic showcase cards', () => {
  assert.match(card, /auction-card__actions--single/)
  assert.match(css, /\.hr-showcases \.auction-card__btn--primary/)
})
