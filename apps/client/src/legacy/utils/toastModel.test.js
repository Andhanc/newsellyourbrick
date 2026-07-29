import test from 'node:test'
import assert from 'node:assert/strict'

let api = {}
try {
  api = await import('./toastModel.js')
} catch {
  // The first RED run intentionally covers the missing implementation.
}

const normalizeToastEvent = api.normalizeToastEvent || (() => ({}))
const isStructuredToastEvent = api.isStructuredToastEvent || (() => false)
const enqueueToast = api.enqueueToast || (() => ({ visible: [], queued: [] }))
const removeToast = api.removeToast || (() => ({ visible: [], queued: [] }))

test('normalizes a legacy message into a structured event', () => {
  assert.deepEqual(
    normalizeToastEvent('Ставка принята', 'success', 4200),
    {
      type: 'success',
      title: 'Готово',
      message: 'Ставка принята',
      action: null,
      duration: 4200,
      persistent: false,
      dedupeKey: null,
      announcement: 'polite',
    },
  )
})

test('normalizes structured errors as assertive and persistent events as timeless', () => {
  const action = { label: 'Пополнить', onClick: () => {} }
  const event = normalizeToastEvent({
    type: 'error',
    title: 'Недостаточно депозита',
    message: 'Пополните ещё 1 200 €',
    action,
    persistent: true,
    dedupeKey: 'deposit-required',
  })

  assert.equal(event.announcement, 'assertive')
  assert.equal(event.duration, 0)
  assert.equal(event.action, action)
  assert.equal(event.dedupeKey, 'deposit-required')
})

test('rejects unknown types and unsafe action shapes', () => {
  const event = normalizeToastEvent({
    type: 'celebration',
    message: 'Новость',
    action: { label: 'Открыть', onClick: 'javascript:alert(1)' },
    duration: -10,
  })

  assert.equal(event.type, 'info')
  assert.equal(event.action, null)
  assert.equal(event.duration, 5000)
})

test('keeps legacy React content instead of mistaking it for a structured event', () => {
  const reactContent = { $$typeof: Symbol.for('react.transitional.element'), type: 'span', props: {} }
  const event = normalizeToastEvent(reactContent, 'warning', 4000)

  assert.equal(isStructuredToastEvent(reactContent), false)
  assert.equal(event.message, reactContent)
  assert.equal(event.type, 'warning')
})

test('deduplicates active events in place and preserves their stable id', () => {
  const existing = { id: 7, dedupeKey: 'outbid:42', message: 'Ставка 10 000' }
  const next = enqueueToast(
    { visible: [existing], queued: [] },
    { id: 8, dedupeKey: 'outbid:42', message: 'Ставка 10 500', type: 'warning' },
  )

  assert.equal(next.visible.length, 1)
  assert.equal(next.visible[0].id, 7)
  assert.equal(next.visible[0].message, 'Ставка 10 500')
})

test('shows no more than three events and promotes the queue on close', () => {
  let state = { visible: [], queued: [] }
  for (let id = 1; id <= 5; id += 1) {
    state = enqueueToast(state, { id, message: `Событие ${id}` })
  }

  assert.deepEqual(state.visible.map((event) => event.id), [1, 2, 3])
  assert.deepEqual(state.queued.map((event) => event.id), [4, 5])

  state = removeToast(state, 2)
  assert.deepEqual(state.visible.map((event) => event.id), [1, 3, 4])
  assert.deepEqual(state.queued.map((event) => event.id), [5])
})
