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

test('dismiss gesture keeps its offset through the closing animation', async () => {
  const legacySource = await readFile(
    new URL('../../apps/client/src/legacy/hooks/useBottomSheetDrag.js', import.meta.url),
    'utf8',
  )
  const dismissCss = await readFile(new URL('../styles/drawerDismiss.css', import.meta.url), 'utf8')
  const legacyDismissCss = await readFile(
    new URL('../../apps/client/src/legacy/styles/drawerDismiss.css', import.meta.url),
    'utf8',
  )
  assert.equal(source, legacySource)
  assert.equal(dismissCss, legacyDismissCss)
  assert.match(source, /'--drawer-dismiss-start-y': `\$\{dragY\}px`/)
  assert.match(dismissCss, /translate3d\(0, var\(--drawer-dismiss-start-y, 0px\), 0\)/)
  assert.match(dismissCss, /\.drawer-dismiss-from-bottom--closing\.drawer-dismiss-modal--closing/)
})
