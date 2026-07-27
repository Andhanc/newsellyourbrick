import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./Toast.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./Toast.css', import.meta.url), 'utf8')
const containerCss = await readFile(new URL('./ToastContainer.css', import.meta.url), 'utf8')

test('toast renders a structured, actionable and accessible message', () => {
  assert.match(source, /toast__title/)
  assert.match(source, /toast__message/)
  assert.match(source, /toast__action/)
  assert.match(source, /action\?\.label/)
  assert.match(source, /aria-live=\{announcement\}/)
  assert.match(source, /role=\{type === 'error' \? 'alert' : 'status'\}/)
  assert.match(source, /aria-label="Закрыть уведомление"/)
  assert.match(source, /toast__progress/)
})

test('toast timer pauses during interaction and when the page is hidden', () => {
  assert.match(source, /pauseTimer/)
  assert.match(source, /resumeTimer/)
  assert.match(source, /onMouseEnter=\{pauseTimer\}/)
  assert.match(source, /onMouseLeave=\{resumeTimer\}/)
  assert.match(source, /onFocusCapture=\{pauseTimer\}/)
  assert.match(source, /onBlurCapture=\{handleBlur\}/)
  assert.match(source, /visibilitychange/)
  assert.match(source, /document\.hidden/)
})

test('toast styling follows the buyer system on phones', () => {
  assert.match(css, /font-family:\s*var\(--buyer-font-body\)/)
  assert.match(css, /\.toast__title[\s\S]*var\(--buyer-font-display\)/)
  assert.match(css, /\.toast__action[\s\S]*min-height:\s*var\(--buyer-touch\)/)
  assert.match(css, /\.toast__close[\s\S]*min-width:\s*var\(--buyer-touch\)/)
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  assert.match(containerCss, /env\(safe-area-inset-top/)
  assert.match(containerCss, /display:\s*flex/)
})
