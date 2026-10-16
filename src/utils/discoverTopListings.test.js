import test from 'node:test'
import assert from 'node:assert/strict'
import { selectDiscoverTopListings } from './discoverTopListings.js'

const p = (id, property_type = 'apartment', extra = {}) => ({ id, property_type, ...extra })

test('top listings alternate formats and stop at five real objects', () => {
  const selected = selectDiscoverTopListings([
    { kind: 'auction', items: [p(1), p(2), p(3)] },
    { kind: 'buy_now', items: [p(4), p(5)] },
    { kind: 'debts', items: [p(6)] },
    { kind: 'shares', items: [p(7)] },
  ])
  assert.deepEqual(selected.map(({ property }) => property.id), [1, 4, 6, 7, 2])
  assert.deepEqual(selected.map(({ kind }) => kind), ['auction', 'buy_now', 'debts', 'shares', 'auction'])
})

test('deduplicates cross-format listings but keeps separate tables with the same id', () => {
  const selected = selectDiscoverTopListings([
    { kind: 'auction', items: [null, p(1, 'apartment', { source_table: 'apartments' })] },
    { kind: 'debts', items: [p(1, 'apartment'), p(2)] },
    { kind: 'shares', items: [p(1, 'villa', { source_table: 'houses' })] },
  ])
  assert.deepEqual(selected.map(({ key }) => key), ['apartments:1', 'apartments:2', 'houses:1'])
})

test('handles empty groups and never mutates the source lists', () => {
  const items = [p(1)]
  assert.equal(selectDiscoverTopListings([{ kind: 'auction', items }]).length, 1)
  assert.equal(items.length, 1)
  assert.deepEqual(selectDiscoverTopListings([]), [])
})
