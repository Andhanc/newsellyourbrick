import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readOrEmpty(url) {
  try {
    return await readFile(url, 'utf8')
  } catch {
    return ''
  }
}

const source = await readOrEmpty(new URL('./BuyerSheetShell.jsx', import.meta.url))
const css = await readOrEmpty(new URL('./BuyerSheetShell.css', import.meta.url))

test('buyer sheet exposes one accessible dialog contract', () => {
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-labelledby=\{labelledBy \|\| titleId\}/)
  assert.match(source, /aria-describedby=\{describedBy\}/)
  assert.match(source, /closeLabel/)
  assert.match(source, /useDrawerDismiss/)
  assert.match(source, /createPortal/)
})

test('buyer sheet manages Escape, focus trap, scroll lock and focus return', () => {
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /event\.key !== 'Tab'/)
  assert.match(source, /FOCUSABLE_SELECTOR/)
  assert.match(source, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(source, /previouslyFocusedRef\.current\?\.focus/)
  assert.match(source, /onClick=\{handleBackdropClick\}/)
  assert.match(source, /dismissible/)
})

test('closing animation does not prematurely release scroll or restore focus', () => {
  assert.doesNotMatch(source, /\[initialFocusRef, isClosing, isOpen\]/)
  assert.match(source, /\[initialFocusRef, isOpen\]/)
})

test('buyer sheet is a safe-area mobile bottom sheet with motion fallback', () => {
  assert.match(css, /\.buyer-sheet__surface[\s\S]*border-radius:\s*var\(--buyer-radius-sheet\)\s+var\(--buyer-radius-sheet\)\s+0\s+0/)
  assert.match(css, /padding-bottom:\s*calc\([^;]*env\(safe-area-inset-bottom/)
  assert.match(css, /min-height:\s*var\(--buyer-touch\)/)
  assert.match(css, /@media\s*\(min-width:\s*768px\)/)
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
})
