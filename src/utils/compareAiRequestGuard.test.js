import test from 'node:test'
import assert from 'node:assert/strict'
import { createCompareAiRequestGuard } from './compareAiRequestGuard.js'

test('starting a new comparison request aborts and invalidates the previous one', () => {
  const guard = createCompareAiRequestGuard()
  const first = guard.start()
  const second = guard.start()

  assert.equal(first.signal.aborted, true)
  assert.equal(guard.isCurrent(first.requestId), false)
  assert.equal(guard.isCurrent(second.requestId), true)
})

test('cancelling on pair change or unmount invalidates a pending response', () => {
  const guard = createCompareAiRequestGuard()
  const pending = guard.start()

  guard.cancel()

  assert.equal(pending.signal.aborted, true)
  assert.equal(guard.isCurrent(pending.requestId), false)
})
