import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearCompareSnapshot,
  readCompareSnapshot,
  writeCompareSnapshot,
} from './compareSnapshot.js'

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v))
    },
    removeItem: (k) => {
      map.delete(k)
    },
  }
}

test('compare snapshot round-trips selected pair and results', () => {
  const storage = memoryStorage()
  const written = writeCompareSnapshot(
    {
      selectedKeys: ['properties_houses:1', 'properties_houses:2'],
      pairKey: 'properties_houses:1::properties_houses:2',
      aiResult: {
        summary: 'Villa A looks stronger',
        rows: [{ aspect: 'Location', left: 'Good', right: 'Ok', winner: 'left' }],
      },
      aiError: null,
      calcData: {
        left: { recommendedPrice: 100000, recommendedPricePerSqm: 2000, note: 'ok' },
        right: { recommendedPrice: 90000, recommendedPricePerSqm: 1800, note: 'ok' },
      },
      calcError: { left: null, right: null },
      showdownCompleted: true,
    },
    { storage, userId: '49', now: () => 1_700_000_000_000 },
  )

  assert.ok(written)
  const read = readCompareSnapshot({
    storage,
    userId: '49',
    now: () => 1_700_000_000_000,
  })
  assert.equal(read.pairKey, 'properties_houses:1::properties_houses:2')
  assert.equal(read.aiResult.summary, 'Villa A looks stronger')
  assert.equal(read.calcData.left.recommendedPrice, 100000)
  assert.equal(read.showdownCompleted, true)
})

test('compare snapshot expires after ttl', () => {
  const storage = memoryStorage()
  writeCompareSnapshot(
    {
      selectedKeys: ['properties_apartments:1', 'properties_apartments:2'],
      pairKey: 'properties_apartments:1::properties_apartments:2',
      aiResult: null,
      calcData: { left: null, right: null },
      calcError: { left: null, right: null },
    },
    { storage, userId: '1', now: () => 1_000 },
  )
  const read = readCompareSnapshot({
    storage,
    userId: '1',
    now: () => 1_000 + 61 * 60 * 1_000,
  })
  assert.equal(read, null)
})

test('clearCompareSnapshot removes stored data', () => {
  const storage = memoryStorage()
  writeCompareSnapshot(
    {
      selectedKeys: ['a:1', 'a:2'],
      pairKey: 'a:1::a:2',
      aiResult: null,
      calcData: { left: null, right: null },
      calcError: { left: null, right: null },
    },
    { storage, userId: '7', now: () => 5_000 },
  )
  clearCompareSnapshot({ storage, userId: '7' })
  assert.equal(readCompareSnapshot({ storage, userId: '7', now: () => 5_000 }), null)
})
