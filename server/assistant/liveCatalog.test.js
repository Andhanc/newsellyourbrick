import test from 'node:test'
import assert from 'node:assert/strict'
import { isAssistantCatalogListing, resolveAssistantCatalog } from './liveCatalog.js'

test('uses live site listings and ignores a client Spain/Dubai filter', () => {
  const catalog = resolveAssistantCatalog(
    [
      { id: 1, location: 'Беларусь, Минск', price: 100000 },
      { id: 2, location: 'Беларусь, Минск', price: 150000 },
    ],
    [
      { id: 99, location: 'Spain, Madrid', price: 400000 },
      { id: 100, location: 'Dubai Marina', price: 500000 },
    ],
  )
  assert.equal(catalog.length, 2)
  assert.ok(catalog.every((item) => String(item.location).includes('Минск')))
})

test('falls back to client listings only when the live catalog is empty', () => {
  const catalog = resolveAssistantCatalog([], [{ id: 7, location: 'Беларусь, Минск', price: 90000 }])
  assert.equal(catalog.length, 1)
  assert.equal(catalog[0].id, 7)
})

test('excludes sold, sold-out, inactive and private-club listings', () => {
  assert.equal(isAssistantCatalogListing({ id: 1, status: 'sold' }), false)
  assert.equal(isAssistantCatalogListing({ id: 2, is_sold: 1 }), false)
  assert.equal(isAssistantCatalogListing({ id: 3, total_shares: 10, shares_sold: 10 }), false)
  assert.equal(isAssistantCatalogListing({ id: 4, private_club_only: 1 }), false)
  assert.equal(isAssistantCatalogListing({ id: 5, is_active: 0 }), false)
  assert.equal(isAssistantCatalogListing({ id: 6, status: 'available' }), true)
})
