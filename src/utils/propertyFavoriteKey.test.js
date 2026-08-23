import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatCompareSaleTypeLabel,
  getComparisonGroupKey,
  getCompareSaleTypeTone,
  normalizePropertyTypeForCompare,
  normalizeSaleTypeForCompare,
  filterComparePickerItems,
} from './propertyFavoriteKey.js'

test('property type helper still distinguishes villa, house and apartment', () => {
  assert.equal(normalizePropertyTypeForCompare({ property_type: 'villa' }), 'villa')
  assert.equal(normalizePropertyTypeForCompare({ property_type: 'house' }), 'house')
  assert.equal(normalizePropertyTypeForCompare({ property_type: 'apartment' }), 'apartment')
  assert.equal(normalizePropertyTypeForCompare({ property_type: 'flat' }), 'apartment')
})

test('compare groups auction and buy now together, and keeps debts and shares apart', () => {
  assert.equal(normalizeSaleTypeForCompare({ is_auction: 1, property_type: 'villa' }), 'standard')
  assert.equal(normalizeSaleTypeForCompare({ isAuction: true, property_type: 'apartment' }), 'standard')
  assert.equal(normalizeSaleTypeForCompare({ sale_type: 'auction', price: 250000 }), 'standard')
  assert.equal(normalizeSaleTypeForCompare({ sale_type: 'buy_now', price: 180000 }), 'standard')
  assert.equal(normalizeSaleTypeForCompare({ sale_type: 'debt', is_auction: 1 }), 'debt')
  assert.equal(normalizeSaleTypeForCompare({ sale_type: 'share', property_type: 'house' }), 'shares')
  assert.equal(normalizeSaleTypeForCompare({ price: 180000, property_type: 'villa' }), 'standard')

  assert.equal(
    getComparisonGroupKey({ is_auction: 1, property_type: 'villa' }),
    getComparisonGroupKey({ is_auction: 1, property_type: 'apartment' }),
  )
  assert.equal(
    getComparisonGroupKey({ is_auction: 1, property_type: 'villa' }),
    getComparisonGroupKey({ price: 200000, property_type: 'villa' }),
  )
  assert.equal(getComparisonGroupKey({ is_auction: 1 }), 'sale:standard')
  assert.equal(getComparisonGroupKey({ price: 120000 }), 'sale:standard')
  assert.equal(getComparisonGroupKey({ sale_type: 'debt' }), 'sale:debt')
  assert.equal(getComparisonGroupKey({ sale_type: 'share' }), 'sale:shares')
  assert.notEqual(
    getComparisonGroupKey({ is_auction: 1 }),
    getComparisonGroupKey({ sale_type: 'debt' }),
  )
})

test('after the first pick, the picker keeps only the same sale type', () => {
  const items = [
    { key: 'a1', property: { is_auction: 1 } },
    { key: 'b1', property: { price: 220000 } },
    { key: 'd1', property: { sale_type: 'debt' } },
    { key: 's1', property: { sale_type: 'share' } },
  ]
  assert.deepEqual(
    filterComparePickerItems(items, ['a1'], 'sale:standard').map((item) => item.key),
    ['a1', 'b1'],
  )
  assert.deepEqual(
    filterComparePickerItems(items, ['d1'], 'sale:debt').map((item) => item.key),
    ['d1'],
  )
  assert.equal(filterComparePickerItems(items, [], null).length, 4)
  assert.equal(filterComparePickerItems(items, ['a1', 'b1'], 'sale:standard').length, 4)
})

test('mock categories stay in their own compare groups', () => {
  assert.equal(getComparisonGroupKey(null, 'villa'), 'mock:villa')
  assert.equal(getComparisonGroupKey(null, 'flat'), 'mock:kvaritra')
  assert.equal(getComparisonGroupKey(null, 'apartment'), 'mock:kvaritra')
})

test('compare sale type labels distinguish auction, buy now, debts and shares', () => {
  const t = (key) => key
  assert.equal(formatCompareSaleTypeLabel({ is_auction: 1, price: 250000 }, t), 'comparePage_saleStandard')
  assert.equal(formatCompareSaleTypeLabel({ is_auction: 1 }, t), 'comparePage_saleAuction')
  assert.equal(formatCompareSaleTypeLabel({ price: 180000 }, t), 'comparePage_saleBuyNow')
  assert.equal(formatCompareSaleTypeLabel({ sale_type: 'debt' }, t), 'comparePage_saleDebt')
  assert.equal(formatCompareSaleTypeLabel({ sale_type: 'share' }, t), 'comparePage_saleShares')
  assert.equal(getCompareSaleTypeTone({ sale_type: 'debt' }), 'debt')
  assert.equal(getCompareSaleTypeTone({ sale_type: 'share' }), 'shares')
  assert.equal(getCompareSaleTypeTone({ is_auction: 1 }), 'standard')
})
