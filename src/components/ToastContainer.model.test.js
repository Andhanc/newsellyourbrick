import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const container = await readFile(new URL('./ToastContainer.jsx', import.meta.url), 'utf8')
const helper = await readFile(new URL('../utils/toastHelper.js', import.meta.url), 'utf8')

test('toast container uses the structured queue while keeping the legacy call signature', () => {
  assert.match(container, /normalizeToastEvent/)
  assert.match(container, /enqueueToast/)
  assert.match(container, /removeToast/)
  assert.match(container, /showToast = \(messageOrEvent, type = 'success', duration = 3000\)/)
  assert.match(container, /visible\.map/)
})

test('notification helper forwards structured events without guessing from their copy', () => {
  assert.match(helper, /typeof messageOrEvent === 'object'/)
  assert.match(helper, /showToast\(messageOrEvent\)/)
})
