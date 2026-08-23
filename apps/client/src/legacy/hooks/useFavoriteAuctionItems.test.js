import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./useFavoriteAuctionItems.js', import.meta.url), 'utf8')

test('favorites and comparison drop sold or ended listings', () => {
  assert.match(source, /isClosedForWishlist/)
  assert.match(source, /if \(isClosedForWishlist\(prop\)\) continue/)
  assert.match(source, /!isClosedForWishlist\(p\)/)
})
