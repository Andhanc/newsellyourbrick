import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearOwnerCabinetOnboardingComplete,
  getOwnerCabinetOnboardingStorageKey,
  hasCompletedOwnerCabinetOnboarding,
  markOwnerCabinetOnboardingComplete,
} from './ownerCabinetOnboarding.js'

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

test('owner cabinet onboarding storage is scoped per numeric user id', () => {
  assert.equal(getOwnerCabinetOnboardingStorageKey('42'), 'ownerTestCabinetOnboardingDone:42')
  assert.equal(getOwnerCabinetOnboardingStorageKey(''), null)
  assert.equal(getOwnerCabinetOnboardingStorageKey('clerk_abc'), null)
})

test('owner cabinet onboarding completion persists in localStorage', () => {
  clearOwnerCabinetOnboardingComplete(9001)
  assert.equal(hasCompletedOwnerCabinetOnboarding(9001), false)
  markOwnerCabinetOnboardingComplete(9001)
  assert.equal(hasCompletedOwnerCabinetOnboarding(9001), true)
  clearOwnerCabinetOnboardingComplete(9001)
  assert.equal(hasCompletedOwnerCabinetOnboarding(9001), false)
})
