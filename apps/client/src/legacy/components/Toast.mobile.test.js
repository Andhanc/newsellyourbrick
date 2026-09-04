import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('./Toast.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./Toast.css', import.meta.url), 'utf8')
const containerCss = await readFile(new URL('./ToastContainer.css', import.meta.url), 'utf8')
const container = await readFile(new URL('./ToastContainer.jsx', import.meta.url), 'utf8')

test('toast renders a structured, actionable and accessible message', () => {
  assert.match(source, /toast__title/)
  assert.match(source, /toast__message/)
  assert.match(source, /toast__action/)
  assert.match(source, /action\?\.label/)
  assert.match(source, /aria-live=\{announcement\}/)
  assert.match(source, /role=\{type === 'error' \? 'alert' : 'status'\}/)
  assert.match(source, /toastCloseAria/)
  assert.doesNotMatch(source, /toast__progress/)
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

test('toast enters after mount and leaves before queue removal', () => {
  assert.match(source, /requestAnimationFrame/)
  assert.match(source, /EXIT_MS = 360/)
  assert.match(source, /toast--leaving/)
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

test('toast uses unified tiffany surface with type-aware icons', () => {
  assert.match(css, /--toast-tiffany:\s*#4ecdd6/)
  assert.match(css, /\.toast__title[\s\S]*color:\s*#fff/)
  assert.match(css, /\.toast__accent[\s\S]*display:\s*none/)
  assert.match(css, /\.toast--success,\s*\.toast--error,\s*\.toast--warning,\s*\.toast--info/)
  assert.doesNotMatch(css, /--toast-accent:\s*#279b76/)
  assert.match(source, /function ToastIcon\(\{ type \}\)/)
  assert.match(source, /FiCheck/)
  assert.match(source, /FiAlertCircle/)
  assert.match(source, /FiAlertTriangle/)
  assert.match(source, /FiInfo/)
  assert.match(source, /<ToastIcon type=\{type\} \/>/)
  assert.match(container, /translateToast|translate:/)
})
