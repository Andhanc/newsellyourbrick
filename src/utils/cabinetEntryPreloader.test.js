import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CABINET_ENTRY_PENDING_KEY,
  CABINET_ENTRY_SHOWN_KEY,
  claimCabinetEntry,
  isUserCabinetPath,
  markCabinetEntry,
  openCabinetAfterAuth,
} from './cabinetEntryPreloader.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

test('cabinet entry is only for buyer and seller homes', () => {
  assert.equal(isUserCabinetPath('/profile'), true)
  assert.equal(isUserCabinetPath('/profile?data=1'), true)
  assert.equal(isUserCabinetPath('/owner-test'), true)
  assert.equal(isUserCabinetPath('/owner-test/wallet'), true)
  assert.equal(isUserCabinetPath('/admin'), false)
  assert.equal(isUserCabinetPath('/marketer'), false)
})

test('a cabinet entry is armed once, then claimed, and ignored during the cooldown', () => {
  const storage = memoryStorage()
  const events = []
  assert.equal(markCabinetEntry(storage, { now: 1_000, dispatch: () => events.push('show') }), true)
  assert.equal(events.length, 1)
  assert.equal(storage.getItem(CABINET_ENTRY_PENDING_KEY), '1')
  assert.equal(claimCabinetEntry(storage, 1_000), true)
  assert.equal(storage.getItem(CABINET_ENTRY_PENDING_KEY), null)
  assert.equal(storage.getItem(CABINET_ENTRY_SHOWN_KEY), '1000')
  assert.equal(claimCabinetEntry(storage, 1_100), false)
  assert.equal(markCabinetEntry(storage, { now: 2_000, dispatch: () => events.push('again') }), false)
  assert.equal(events.length, 1)
  assert.equal(markCabinetEntry(storage, { now: 6_000, defer: true }), true)
  assert.equal(storage.getItem(CABINET_ENTRY_PENDING_KEY), '1')
  assert.equal(events.length, 1)
})

test('opening a cabinet after auth navigates, and a full reload only arms the splash', () => {
  const storage = memoryStorage()
  const calls = []
  openCabinetAfterAuth((path, options) => calls.push([path, options]), '/profile', {
    storage,
    replace: true,
    now: 10,
  })
  assert.deepEqual(calls, [['/profile', { replace: true }]])
  assert.equal(storage.getItem(CABINET_ENTRY_PENDING_KEY), '1')

  const reloaded = memoryStorage()
  const hardCalls = []
  openCabinetAfterAuth((path) => hardCalls.push(path), '/profile', {
    storage: reloaded,
    hard: true,
    now: 20,
  })
  assert.deepEqual(hardCalls, [])
  assert.equal(reloaded.getItem(CABINET_ENTRY_PENDING_KEY), '1')
})
