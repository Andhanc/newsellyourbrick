import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchAuctionMaxBidsBatch, fetchAuctionMaxBidsBatchResult, fetchAuctionMaxBidsWithFallback, hasResolvedListingBid } from './fetchAuctionMaxBids.js'

const properties = [{ id: 1, source_table: 'houses' }, { id: 1, source_table: 'apartments' }]

test('a successful empty batch does not request individual bid histories', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url) => { calls.push(url); return Response.json({ success: true, data: {} }) }
  try {
    const result = await fetchAuctionMaxBidsWithFallback('/api', properties)
    assert.equal(result.size, 0)
    assert.deepEqual(calls, ['/api/bids/max-amounts'])
  } finally { globalThis.fetch = original }
})

test('batch failures remain distinguishable so older-server fallback can work', async () => {
  const original = globalThis.fetch
  try {
    for (const reply of [() => new Response('', { status: 503 }), () => Response.json({ success: false }), () => { throw new Error('offline') }]) {
      globalThis.fetch = async () => reply()
      assert.equal((await fetchAuctionMaxBidsBatchResult('/api', properties)).ok, false)
    }
  } finally { globalThis.fetch = original }
})

test('deduplication preserves distinct source tables and the existing Map interface', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (_url, init) => {
    calls++
    assert.equal(JSON.parse(init.body).items.length, 2)
    return Response.json({ success: true, data: { 'properties_houses:1': 10, 'properties_apartments:1': 20 } })
  }
  try {
    const [a, b] = await Promise.all([fetchAuctionMaxBidsBatch('/api', [...properties, properties[0]]), fetchAuctionMaxBidsBatch('/api', properties)])
    assert.equal(calls, 1)
    assert.equal(a.size, 2)
    assert.deepEqual(a, b)
  } finally { globalThis.fetch = original }
})

test('only an explicit numeric server current_bid avoids an additional bid request', () => {
  assert.equal(hasResolvedListingBid({ current_bid: 0 }), true)
  assert.equal(hasResolvedListingBid({ current_bid: '1200' }), true)
  for (const current_bid of [null, undefined, '', 'invalid']) assert.equal(hasResolvedListingBid({ current_bid }), false)
  assert.equal(hasResolvedListingBid({ currentBid: 100, auction_starting_price: 100 }), false)
})

test('unavailable batch falls back to bid histories without mixing same-id tables', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async url => {
    calls.push(url)
    return url.endsWith('/max-amounts') ? new Response('', { status: 404 }) : Response.json({ success: true, data: [{ bid_amount: 10 }, { bid_amount: 15 }] })
  }
  try {
    const bids = await fetchAuctionMaxBidsWithFallback('/api', properties)
    assert.equal(calls.length, 3)
    assert.equal(bids.size, 2)
    assert.ok([...bids.values()].every(value => value === 15))
  } finally { globalThis.fetch = original }
})
