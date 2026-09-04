import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearBuyerCabinetWelcomeComplete,
  getBuyerCabinetWelcomeStorageKey,
  hasCompletedBuyerCabinetWelcome,
  markBuyerCabinetWelcomeComplete,
} from './buyerCabinetWelcome.js'

const memoryStore = new Map()
globalThis.localStorage = {
  getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
  setItem: (key, value) => {
    memoryStore.set(key, String(value))
  },
  removeItem: (key) => {
    memoryStore.delete(key)
  },
}

test('buyer welcome onboarding storage is scoped per numeric user id', () => {
  assert.equal(getBuyerCabinetWelcomeStorageKey('42'), 'buyerCabinetWelcomeDone:42')
  assert.equal(getBuyerCabinetWelcomeStorageKey(''), null)
  assert.equal(getBuyerCabinetWelcomeStorageKey('clerk_abc'), null)
})

test('buyer welcome completion persists in localStorage', () => {
  clearBuyerCabinetWelcomeComplete(9001)
  assert.equal(hasCompletedBuyerCabinetWelcome(9001), false)
  markBuyerCabinetWelcomeComplete(9001)
  assert.equal(hasCompletedBuyerCabinetWelcome(9001), true)
  clearBuyerCabinetWelcomeComplete(9001)
  assert.equal(hasCompletedBuyerCabinetWelcome(9001), false)
})
