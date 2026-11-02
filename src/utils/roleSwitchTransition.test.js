import test from 'node:test'
import assert from 'node:assert/strict'
import {
  beginRoleSwitchTransition, commitRoleSwitchTransition, clearRoleSwitchTransition,
  readRoleSwitchTransition, ROLE_SWITCH_TRANSITION_KEY,
} from './roleSwitchTransition.js'

function setup(t) {
  const values = new Map()
  const previous = globalThis.sessionStorage
  globalThis.sessionStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
  t.after(() => {
    if (previous === undefined) delete globalThis.sessionStorage
    else globalThis.sessionStorage = previous
  })
  return values
}

test('only one transaction may run, and a committed handoff has a fixed profile destination', t => {
  const values = setup(t)
  const pending = beginRoleSwitchTransition({ role: 'seller', sourceUserId: 6, label: 'Switching' })
  assert.throws(() => beginRoleSwitchTransition({ role: 'buyer', sourceUserId: 7 }), /operationInProgress/)
  const committed = commitRoleSwitchTransition(pending.id, 7)
  assert.equal(committed.phase, 'committed')
  assert.equal(committed.path, '/owner-test/profile')
  assert.equal(committed.userId, '7')
  assert.doesNotMatch(values.get(ROLE_SWITCH_TRANSITION_KEY), /password|authToken|email/)
  clearRoleSwitchTransition(pending.id)
  assert.equal(readRoleSwitchTransition(), null)
})

test('expired, external and unrecognized destinations cannot own the handoff', t => {
  const values = setup(t)
  for (const invalid of [
    { path: 'https://example.test' }, { path: '/admin' }, { role: 'admin' },
    { startedAt: Date.now() - 46000 }, { phase: 'unknown' },
  ]) {
    values.set(ROLE_SWITCH_TRANSITION_KEY, JSON.stringify({
      id: 'test', role: 'buyer', path: '/profile', phase: 'committed', startedAt: Date.now(), ...invalid,
    }))
    assert.equal(readRoleSwitchTransition(), null)
    assert.equal(values.has(ROLE_SWITCH_TRANSITION_KEY), false)
  }
})

test('cleanup of an older operation cannot cancel a newer one', t => {
  setup(t)
  const current = beginRoleSwitchTransition({ role: 'buyer', sourceUserId: 7 })
  clearRoleSwitchTransition('old-operation')
  assert.equal(readRoleSwitchTransition()?.id, current.id)
})
