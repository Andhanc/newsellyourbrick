import test from 'node:test'
import assert from 'node:assert/strict'
import { passesApprovedFilters, passesAuctionFilters } from './module2PropertyPrisma.js'

test('catalog filters skip unresolved property rows instead of crashing the whole catalogue', () => {
  assert.equal(passesApprovedFilters(null), false)
  assert.equal(passesApprovedFilters(undefined), false)
  assert.equal(passesAuctionFilters(null), false)
})

test('catalog filters preserve valid approved and auction rows', () => {
  assert.equal(passesApprovedFilters({ is_auction: 0, sale_type: 'sale' }), true)
  assert.equal(passesApprovedFilters({ is_auction: 1, sale_type: 'sale' }), false)
  assert.equal(passesAuctionFilters({ is_auction: 1, auction_starting_price: 100000 }), true)
})
