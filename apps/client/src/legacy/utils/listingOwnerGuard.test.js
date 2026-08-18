import test from 'node:test'
import assert from 'node:assert/strict'
import { viewerOwnsListing, viewerOwnsPropertyRecord } from './listingOwnerGuard.js'

test('same user id owns the listing', () => {
  assert.equal(
    viewerOwnsListing({
      viewerUserId: 12,
      viewerEmail: 'buyer@example.com',
      listingOwnerUserId: 12,
      listingOwnerEmail: 'seller@example.com',
    }),
    true,
  )
})

test('linked buyer and seller cabinets match by email', () => {
  assert.equal(
    viewerOwnsListing({
      viewerUserId: 40,
      viewerEmail: 'andrei@example.com',
      listingOwnerUserId: 88,
      listingOwnerEmail: 'andrei@example.com',
    }),
    true,
  )
})

test('unrelated viewer does not own the listing', () => {
  assert.equal(
    viewerOwnsListing({
      viewerUserId: 40,
      viewerEmail: 'buyer@example.com',
      listingOwnerUserId: 88,
      listingOwnerEmail: 'seller@example.com',
    }),
    false,
  )
})

test('looks up the owner email when the property payload has none', async () => {
  const userQueries = {
    getById: async (id) => ({ id, email: 'owner@example.com' }),
  }
  const owns = await viewerOwnsPropertyRecord(
    userQueries,
    { id: 40, email: 'owner@example.com' },
    { user_id: 88 },
  )
  assert.equal(owns, true)
})
