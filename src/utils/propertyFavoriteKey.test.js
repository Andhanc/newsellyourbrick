import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getComparisonGroupKey,
  normalizePropertyTypeForCompare,
  normalizeSaleTypeForCompare,
} from './propertyFavoriteKey.js'

test('property type helper still distinguishes villa, house and apartment', () => {
  assert.equal(normalizePropertyTypeForCompare({ property_type: 'villa' }), 'villa')
  assert.equal(normalizePropertyTypeForCompare({ property_type: 'house' }), 'house')
  assert.equal(normalizePropertyTypeForCompare({ property_type: 'apartment' }), 'apartment')
  assert.equal(normalizePropertyTypeForCompare({ property_type: 'flat' }), 'apartment')
})

test('compare groups by sale type, not property type', () => {
  assert.equal(normalizeSaleTypeForCompare({ is_auction: 1, property_type: 'villa' }), 'auction')
  assert.equal(normalizeSaleTypeForCompare({ isAuction: true, property_type: 'apartment' }), 'auction')
  assert.equal(normalizeSaleTypeForCompare({ sale_type: 'auction', price: 250000 }), 'auction')
  assert.equal(normalizeSaleTypeForCompare({ sale_type: 'debt', is_auction: 1 }), 'debt')
  assert.equal(normalizeSaleTypeForCompare({ sale_type: 'share', property_type: 'house' }), 'shares')
  assert.equal(normalizeSaleTypeForCompare({ price: 180000, property_type: 'villa' }), 'buy_now')

  assert.equal(
    getComparisonGroupKey({ is_auction: 1, property_type: 'villa' }),
    getComparisonGroupKey({ is_auction: 1, property_type: 'apartment' }),
  )
  assert.equal(getComparisonGroupKey({ is_auction: 1 }), 'sale:auction')
  assert.equal(getComparisonGroupKey({ sale_type: 'debt' }), 'sale:debt')
  assert.equal(getComparisonGroupKey({ sale_type: 'share' }), 'sale:shares')
  assert.equal(getComparisonGroupKey({ price: 120000 }), 'sale:buy_now')
  assert.notEqual(
    getComparisonGroupKey({ is_auction: 1, property_type: 'villa' }),
    getComparisonGroupKey({ price: 200000, property_type: 'villa' }),
  )
})

test('mock categories stay in their own compare groups', () => {
  assert.equal(getComparisonGroupKey(null, 'villa'), 'mock:villa')
  assert.equal(getComparisonGroupKey(null, 'flat'), 'mock:kvaritra')
  assert.equal(getComparisonGroupKey(null, 'apartment'), 'mock:kvaritra')
})
