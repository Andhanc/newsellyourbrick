import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const catalog = readFileSync(new URL('./MobileDiscoverCatalog.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')

test('format stack leaves touch, wheel and momentum scrolling to the browser', () => {
  // Reintroducing the pager would cancel native gestures, clamp entry momentum
  // and animate scrollTop while a finger or trackpad is still scrolling.
  assert.doesNotMatch(catalog, /addEventListener\(['"](?:touch\w+|wheel|scroll)['"]/)
  assert.doesNotMatch(catalog, /\.scrollTop\s*=|\.scrollTo\(|\.scrollBy\(/)
  assert.doesNotMatch(catalog, /requestAnimationFrame|setTimeout|formatLock/)
  assert.doesNotMatch(css, /data-format-lock/)
})

test('format panels retain the sticky visual stack with a stable viewport height', () => {
  assert.match(css, /\.md-format-card\s*\{[^}]*position: sticky;[^}]*height: 100svh;[^}]*max-height: 100svh;/s)
  assert.match(css, /\.md-debts-pin\s*\{[^}]*position: sticky;[^}]*min-height: 100svh;/s)
  assert.match(catalog, /<FormatCard/)
  assert.match(catalog, /<DebtsFlow/)
  assert.match(catalog, /<AppDownloadSection \/>[\s\S]*<NewsSection[\s\S]*<MobileDiscoverFaq \/>/)
})

test('web and legacy catalog and styles stay in parity', () => {
  for (const name of ['MobileDiscoverCatalog.jsx', 'MobileDiscoverPage.css']) {
    assert.equal(
      readFileSync(new URL(`./${name}`, import.meta.url), 'utf8'),
      readFileSync(new URL(`../../apps/client/src/legacy/pages/${name}`, import.meta.url), 'utf8'),
      name,
    )
  }
})
