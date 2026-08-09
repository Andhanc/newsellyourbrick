import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getListingAuctionTimerStatus,
  isListingAuctionTimerCritical,
} from './formatListingAuctionTimeLeft.js'

test('timer status bands: green >=90, yellow >=60, red below', () => {
  assert.equal(getListingAuctionTimerStatus(120), 'timer-long')
  assert.equal(getListingAuctionTimerStatus(90), 'timer-long')
  assert.equal(getListingAuctionTimerStatus(89), 'timer-medium')
  assert.equal(getListingAuctionTimerStatus(60), 'timer-medium')
  assert.equal(getListingAuctionTimerStatus(59), 'timer-short')
  assert.equal(getListingAuctionTimerStatus(0), 'timer-short')
})

test('critical flashing band is under 30 days', () => {
  assert.equal(isListingAuctionTimerCritical(30), false)
  assert.equal(isListingAuctionTimerCritical(29), true)
  assert.equal(isListingAuctionTimerCritical(0), true)
})
