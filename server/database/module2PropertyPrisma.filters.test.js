import test from 'node:test'
import assert from 'node:assert/strict'
import {
  passesApprovedFilters,
  passesAuctionFilters,
  pickPrismaModelData,
  prismaModelFieldNames,
} from './module2PropertyPrisma.js'

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

test('house create payload keeps buy_now_enabled and drops unknown Prisma fields', () => {
  const fields = prismaModelFieldNames('properties_houses')
  assert.ok(fields instanceof Set)
  assert.equal(fields.has('buy_now_enabled'), true)
  assert.equal(fields.has('title'), true)

  const picked = pickPrismaModelData('properties_houses', {
    title: 'ори',
    buy_now_enabled: 0,
    not_a_real_column: 1,
  })
  assert.equal(picked.title, 'ори')
  assert.equal(picked.buy_now_enabled, 0)
  assert.equal(Object.hasOwn(picked, 'not_a_real_column'), false)
})
