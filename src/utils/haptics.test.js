import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUCTION_BID_HAPTIC_PATTERNS,
  COIN_FALL_HAPTIC_PATTERN,
  COIN_FALL_WEBKIT_OFFSETS_MS,
  PUBLISH_SUCCESS_HAPTIC_PATTERN,
  PUBLISH_SUCCESS_WEBKIT_OFFSETS_MS,
  SELECTION_HAPTIC_DURATION_MS,
  triggerAuctionBidHaptic,
  triggerCoinFallHaptic,
  triggerPublishSuccessHaptic,
  triggerSelectionHaptic,
} from './haptics.js'

test('selection haptic uses an audible-on-hardware Android vibration pulse', () => {
  const calls = []
  const result = triggerSelectionHaptic({
    navigatorObject: {
      vibrate(pattern) {
        calls.push(pattern)
        return true
      },
    },
    documentObject: null,
  })

  assert.equal(result, true)
  assert.equal(SELECTION_HAPTIC_DURATION_MS, 30)
  assert.deepEqual(calls, [30])
})

test('selection haptic falls back to a native WebKit switch control', () => {
  const inputAttributes = new Map()
  const input = {
    setAttribute(name, value) {
      inputAttributes.set(name, value)
    },
  }
  const label = {
    clicked: false,
    style: {},
    setAttribute() {},
    appendChild(child) {
      this.child = child
    },
    click() {
      this.clicked = true
    },
  }
  const body = {
    appended: null,
    appendChild(node) {
      this.appended = node
    },
    removeChild(node) {
      if (this.appended === node) this.appended = null
    },
  }
  const result = triggerSelectionHaptic({
    navigatorObject: {},
    documentObject: {
      body,
      createElement(tag) {
        return tag === 'label' ? label : input
      },
    },
  })

  assert.equal(result, true)
  assert.equal(label.clicked, true)
  assert.equal(label.child, input)
  assert.equal(input.type, 'checkbox')
  assert.equal(inputAttributes.has('switch'), true)
  assert.equal(body.appended, null)
})

test('auction bid confirmation and outbid warning use distinct vibration patterns', () => {
  const calls = []
  const navigatorObject = {
    vibrate(pattern) {
      calls.push(pattern)
      return true
    },
  }

  assert.equal(triggerAuctionBidHaptic('placed', { navigatorObject }), true)
  assert.equal(triggerAuctionBidHaptic('outbid', { navigatorObject }), true)
  assert.deepEqual(calls, [
    [...AUCTION_BID_HAPTIC_PATTERNS.placed],
    [...AUCTION_BID_HAPTIC_PATTERNS.outbid],
  ])
  assert.ok(
    AUCTION_BID_HAPTIC_PATTERNS.outbid.reduce((sum, value) => sum + value, 0) >
      AUCTION_BID_HAPTIC_PATTERNS.placed.reduce((sum, value) => sum + value, 0),
    'outbid warning lasts longer than a placed confirmation',
  )
})

test('coin fall haptic uses a staggered vibration pattern and can be cancelled', () => {
  const calls = []
  const navigatorObject = {
    vibrate(pattern) {
      calls.push(pattern)
      return true
    },
  }

  const stop = triggerCoinFallHaptic({ navigatorObject, documentObject: null })
  assert.equal(typeof stop, 'function')
  stop()
  assert.deepEqual(calls, [[...COIN_FALL_HAPTIC_PATTERN], 0])
  assert.ok(COIN_FALL_HAPTIC_PATTERN.reduce((sum, value) => sum + value, 0) > 4000)
  assert.ok(COIN_FALL_WEBKIT_OFFSETS_MS.length >= 7)
})

test('publish success haptic lasts about three and a half seconds and stops on close', () => {
  const calls = []
  const stop = triggerPublishSuccessHaptic({
    navigatorObject: {
      vibrate(pattern) {
        calls.push(pattern)
        return true
      },
    },
    documentObject: null,
  })

  const duration = PUBLISH_SUCCESS_HAPTIC_PATTERN.reduce((sum, value) => sum + value, 0)
  assert.ok(duration >= 3000 && duration <= 4000)
  assert.deepEqual(calls, [[...PUBLISH_SUCCESS_HAPTIC_PATTERN]])
  stop()
  assert.deepEqual(calls.at(-1), 0)
})

test('publish success WebKit fallback cancels its scheduled pulses', () => {
  const scheduled = []
  const cancelled = []
  const stop = triggerPublishSuccessHaptic({
    navigatorObject: {},
    documentObject: { body: {}, createElement() {} },
    schedule(callback, delay) {
      scheduled.push({ callback, delay })
      return scheduled.length
    },
    cancelSchedule(id) {
      cancelled.push(id)
    },
  })

  assert.deepEqual(scheduled.map(({ delay }) => delay), [...PUBLISH_SUCCESS_WEBKIT_OFFSETS_MS])
  stop()
  assert.equal(cancelled.length, scheduled.length)
})
