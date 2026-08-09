import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'components/SiteFooterNearObserver.jsx'), 'utf8')

test('SiteFooterNearObserver resets footer-near flag on route change', () => {
  assert.match(source, /useLocation/)
  assert.match(source, /pathname/)
  assert.match(source, /setSiteFooterNear\(false\)/)
  assert.match(source, /\[layoutScrollRef, pathname\]/)
})

test('SiteFooterNearObserver waits for lazy #site-footer via MutationObserver', () => {
  assert.match(source, /MutationObserver/)
  assert.match(source, /getElementById\('site-footer'\)/)
  assert.match(source, /childList:\s*true/)
})
