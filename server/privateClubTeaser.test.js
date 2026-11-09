import test from 'node:test'
import assert from 'node:assert/strict'
import { privateClubListingForViewer } from './privateClubTeaser.js'

const lot = {
  id: 42, source_table: 'houses', property_type: 'villa', private_club_only: 1,
  user_id: 7, title: 'Secret villa', photos: ['/private.jpg'], address: 'Private address',
  coordinates: [1, 2], documents: ['/contract.pdf'], email: 'seller@example.test', price: 800000,
}

test('guests receive an allowlisted VIP teaser without property or owner details', () => {
  for (const flag of [1, true, '1']) {
    const teaser = privateClubListingForViewer({ ...lot, private_club_only: flag, future_secret_field: 'hidden' })
    assert.deepEqual(teaser, {
      id: 42, source_table: 'houses', property_type: 'villa', private_club_only: 1,
      vip_locked: true, isAuction: true, is_auction: 1, moderation_status: 'approved',
    })
  }
})

test('VIP members and the owner retain full listings; other users receive teasers', () => {
  assert.equal(privateClubListingForViewer(lot, { hasVip: true }), lot)
  assert.equal(privateClubListingForViewer(lot, { viewerId: 7 }), lot)
  assert.equal(privateClubListingForViewer(lot, { viewerId: 9 }).vip_locked, true)
})

test('ordinary listings remain unchanged', () => {
  const regular = { ...lot, private_club_only: 0 }
  assert.equal(privateClubListingForViewer(regular), regular)
})
