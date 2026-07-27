import test from 'node:test'
import assert from 'node:assert/strict'

let helpers = {}
try {
  helpers = await import('./shareMarketplaceQueries.js')
} catch {}

const {
  mergeShareRowsPage = () => { throw new Error('mergeShareRowsPage is not implemented') },
  formatShareMarketplaceApiItem = () => { throw new Error('formatShareMarketplaceApiItem is not implemented') },
} = helpers

test('keeps colliding apartment and house ids distinct with stable source tables', () => {
  const rows = mergeShareRowsPage(
    [{ id: 5, property_type: 'apartment', created_at: '2026-07-17T11:00:00Z' }],
    [{ id: 5, property_type: 'house', created_at: '2026-07-17T10:00:00Z' }],
    0,
    10,
  )

  assert.equal(rows.length, 2)
  assert.equal(rows[0].source_table, 'properties_apartments')
  assert.equal(rows[1].source_table, 'properties_houses')
  assert.notEqual(`${rows[0].source_table}:${rows[0].id}`, `${rows[1].source_table}:${rows[1].id}`)
})

test('applies offset after globally merging both property tables', () => {
  const apartments = [
    { id: 1, created_at: '2026-07-17T12:00:00Z' },
    { id: 2, created_at: '2026-07-17T10:00:00Z' },
  ]
  const houses = [
    { id: 1, created_at: '2026-07-17T11:00:00Z' },
    { id: 2, created_at: '2026-07-17T09:00:00Z' },
  ]

  assert.deepEqual(
    mergeShareRowsPage(apartments, houses, 1, 2).map((row) => [row.source_table, row.id]),
    [['properties_houses', 1], ['properties_apartments', 2]],
  )
})

test('API presentation preserves source table and leaves a missing photo empty', () => {
  const item = formatShareMarketplaceApiItem({
    id: 5,
    source_table: 'properties_houses',
    property_type: 'house',
    title: 'Casa Verde',
    price: 200000,
    total_shares: 20,
    shares_sold: 4,
  }, [])

  assert.equal(item.source_table, 'properties_houses')
  assert.equal(item.shareId, 'properties_houses-5')
  assert.equal(item.image, '')
  assert.deepEqual(item.photos, [])
  assert.equal(item.pricePerShare, 10000)
})
