import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./useBottomSheetDrag.js', import.meta.url), 'utf8')

test('bottom sheet can close by pulling content down from the top', () => {
  assert.match(source, /dismissOnly/)
  assert.match(source, /CONTENT_PULL_ARM_PX/)
  assert.match(source, /WHEEL_DISMISS_PX/)
  assert.match(source, /touchstart/)
  assert.match(source, /touchmove/)
  assert.match(source, /addEventListener\('wheel'/)
  assert.match(source, /scrollTop/)
  assert.match(source, /requestCloseRef\.current\(\)/)
  assert.match(source, /DISMISS_DRAG_PX/)
})

test('content pull ignores handles, form fields and scrolled lists', () => {
  assert.match(source, /HANDLE_SELECTOR/)
  assert.match(source, /INTERACTIVE_SELECTOR/)
  assert.match(source, /findScrollableAncestor/)
  assert.match(source, /buyer-sheet__handle/)
})
