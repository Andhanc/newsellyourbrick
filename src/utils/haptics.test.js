import test from 'node:test'
import assert from 'node:assert/strict'
import { SELECTION_HAPTIC_DURATION_MS, triggerSelectionHaptic } from './haptics.js'

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
