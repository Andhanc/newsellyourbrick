import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import {
  parseAuctionFilterPath,
  readAuctionSearchQuery,
} from './auctionFilterUrl.js'

test('reads the catalogue query passed from a landing search bar', () => {
  assert.equal(readAuctionSearchQuery('?q=%20Villa%20'), 'Villa')
  assert.equal(readAuctionSearchQuery('?filter=auction'), '')
})

test('preserves the catalogue query while canonicalizing legacy auction filters', () => {
  const parsed = parseAuctionFilterPath(
    '/auction',
    '?filter=buy_now&category=villa&q=Ocean+View&utm_source=landing',
  )

  assert.deepEqual(parsed.saleFilters, ['buy_now'])
  assert.deepEqual(parsed.propertyTypes, ['вилла'])
  assert.equal(
    parsed.legacyRedirect,
    '/auction/buy-now/villas?q=Ocean+View&utm_source=landing',
  )
})

test('PropertyList restores its search state from the auction query parameter', async () => {
  const component = await readFile(
    new URL('../components/PropertyList.jsx', import.meta.url),
    'utf8',
  )

  assert.match(component, /setSearchQuery\(readAuctionSearchQuery\(location\.search\)\)/)
})
