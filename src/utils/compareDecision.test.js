import test from 'node:test'
import assert from 'node:assert/strict'
import {
  comparisonWinPercents,
  formatComparisonDecision,
  isAuctionListing,
  resolvePositivePropertyPrice,
  selectComparisonItem,
  summarizeComparisonRows,
} from './compareDecision.js'

test('counts every comparable point and turns wins into percents', () => {
  assert.deepEqual(summarizeComparisonRows([
    { id: 'price', winner: 'left', decisionSignal: true },
    { id: 'ppm', winner: 'right', decisionSignal: true },
    { id: 'area', winner: 'right' },
    { id: 'year', winner: 'left' },
    { id: 'rooms', winner: 'left' },
    { id: 'comfort', winner: 'unknown', decisionSignal: true },
    { id: 'material', winner: null, displayOnly: true },
  ]), {
    left: 3,
    right: 2,
    tie: 0,
    compared: 5,
    decided: 5,
    leader: 'left',
    leftPct: 60,
    rightPct: 40,
  })
})

test('turns 7 and 3 wins into 70% and 30%', () => {
  const rows = [
    ...Array.from({ length: 7 }, () => ({ winner: 'left' })),
    ...Array.from({ length: 3 }, () => ({ winner: 'right' })),
  ]
  assert.deepEqual(summarizeComparisonRows(rows), {
    left: 7,
    right: 3,
    tie: 0,
    compared: 10,
    decided: 10,
    leader: 'left',
    leftPct: 70,
    rightPct: 30,
  })
})

test('keeps ties out of the percentage and still reports a 50/50 split on equal wins', () => {
  assert.deepEqual(comparisonWinPercents(7, 3), { leftPct: 70, rightPct: 30, decided: 10 })
  assert.deepEqual(comparisonWinPercents(1, 2), { leftPct: 33, rightPct: 67, decided: 3 })
  assert.deepEqual(comparisonWinPercents(2, 2), { leftPct: 50, rightPct: 50, decided: 4 })
  assert.deepEqual(comparisonWinPercents(0, 0), { leftPct: 0, rightPct: 0, decided: 0 })

  const tied = summarizeComparisonRows([
    { winner: 'left' },
    { winner: 'right' },
    { winner: 'tie' },
    { winner: 'tie' },
  ])
  assert.deepEqual(tied, {
    left: 1,
    right: 1,
    tie: 2,
    compared: 4,
    decided: 2,
    leader: 'tie',
    leftPct: 50,
    rightPct: 50,
  })
})

test('reports tie and unknown without inventing a winner', () => {
  assert.equal(summarizeComparisonRows([
    { winner: 'left' },
    { winner: 'right' },
  ]).leader, 'tie')
  assert.equal(summarizeComparisonRows([{ winner: 'tie' }]).leader, 'tie')
  assert.equal(summarizeComparisonRows([{ displayOnly: true, winner: null }]).leader, 'unknown')
})

test('formats both percentages so the score is readable', () => {
  const labels = {
    comparePage_decisionUnknown: 'unknown',
    comparePage_decisionTie: '{{object1}} — {{leftPct}}%, {{object2}} — {{rightPct}}%. tie',
    comparePage_decisionTieAll: 'all ties',
    comparePage_decisionLead: '{{object1}} — {{leftPct}}%, {{object2}} — {{rightPct}}%. {{leader}} {{score}}/{{count}}',
    comparePage_object1: 'Object 1',
    comparePage_object2: 'Object 2',
  }
  const t = (key, params = {}) => String(labels[key] || key).replace(/\{\{(\w+)\}\}/g, (_, name) => params[name] ?? '')

  assert.equal(
    formatComparisonDecision({
      leader: 'left',
      leftPct: 70,
      rightPct: 30,
      left: 7,
      right: 3,
      decided: 10,
    }, t),
    'Object 1 — 70%, Object 2 — 30%. Object 1 7/10',
  )
  assert.equal(
    formatComparisonDecision({ leader: 'tie', leftPct: 50, rightPct: 50, decided: 4 }, t),
    'Object 1 — 50%, Object 2 — 50%. tie',
  )
  assert.equal(formatComparisonDecision({ leader: 'tie', leftPct: 0, rightPct: 0, decided: 0 }, t), 'all ties')
  assert.equal(formatComparisonDecision({ leader: 'unknown' }, t), 'unknown')
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
