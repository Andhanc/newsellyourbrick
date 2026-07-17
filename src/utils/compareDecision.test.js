import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isAuctionListing,
  resolvePositivePropertyPrice,
  selectComparisonItem,
  summarizeComparisonRows,
} from './compareDecision.js'

test('summarizes only explicitly supported comparison signals', () => {
  assert.deepEqual(summarizeComparisonRows([
    { id: 'price', winner: 'left', decisionSignal: true },
    { id: 'ppm', winner: 'right', decisionSignal: true },
    { id: 'area', winner: 'right' },
    { id: 'year', winner: 'left' },
    { id: 'rooms', winner: 'left' },
    { id: 'comfort', winner: 'unknown', decisionSignal: true },
    { id: 'material', winner: null, displayOnly: true },
  ]), { left: 1, right: 1, tie: 0, compared: 2, leader: 'tie' })
})

test('reports tie and unknown without inventing a winner', () => {
  assert.equal(summarizeComparisonRows([
    { winner: 'left', decisionSignal: true },
    { winner: 'right', decisionSignal: true },
  ]).leader, 'tie')
  assert.equal(summarizeComparisonRows([{ displayOnly: true, winner: null }]).leader, 'unknown')
})

test('resolves the first truthful positive price and falls through zero values', () => {
  assert.equal(resolvePositivePropertyPrice({
    isAuction: true,
    currentBid: 0,
    current_bid: 185000,
    auction_starting_price: 170000,
    price: 220000,
  }), 185000)
  assert.equal(resolvePositivePropertyPrice({ currentBid: 0, price: 220000 }), 220000)
  assert.equal(resolvePositivePropertyPrice({ currentBid: '0', price: 0 }), null)
})

test('recognizes backend auction flags consistently, including string values', () => {
  assert.equal(isAuctionListing({ is_auction: '1' }), true)
  assert.equal(isAuctionListing({ is_auction: 'true' }), true)
  assert.equal(isAuctionListing({ is_auction: ' TRUE ' }), true)
  assert.equal(isAuctionListing({ is_auction: '0' }), false)
  assert.equal(isAuctionListing({ is_auction: 'false' }), false)
})

test('auction price order uses the shared truth recognizer for string flags', () => {
  assert.equal(resolvePositivePropertyPrice({
    is_auction: 'true',
    currentBid: 0,
    auction_starting_price: 170000,
    price: 220000,
  }), 170000)
})

test('returns only an explicitly selected side', () => {
  const pair = { left: { key: 'left:1' }, right: { key: 'right:2' } }
  assert.equal(selectComparisonItem(pair, 'right').key, 'right:2')
  assert.equal(selectComparisonItem(pair, 'auto'), null)
})
