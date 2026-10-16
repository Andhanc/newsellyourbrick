import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const page = await readFile(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')

test('main page uses the shared auction AI FAB instead of the grid menu', () => {
  assert.match(page, /wrapperClassName="md-discover-ai-floats"/)
  assert.doesNotMatch(page, /md-fab|FiGrid/)
  assert.match(css, /\.md-discover-ai-floats/)
  assert.doesNotMatch(css, /\.md-fab/)
})

test('AI FAB remains available beside search and carousels on the main stage', () => {
  assert.match(page, /hideFab=\{screen === 'hero' \|\| isFooterNear\}/)
  assert.match(page, /querySelector\('\.md-footer-wrap'\)/)
  assert.match(page, /new IntersectionObserver/)
  assert.match(page, /root: stage/)
})
