import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const catalog = readFileSync(new URL('./MobileDiscoverCatalog.jsx', import.meta.url), 'utf8')
const legacyCatalog = readFileSync(
  new URL('../../apps/client/src/legacy/pages/MobileDiscoverCatalog.jsx', import.meta.url),
  'utf8',
)

test('format stack snaps to nearest park after native scroll settles', () => {
  assert.match(catalog, /Native mode: free finger scroll, snap when gesture \/ momentum ends/)
  assert.match(catalog, /scheduleSettle/)
  assert.match(catalog, /settleFlip/)
  assert.match(catalog, /nearestFlipIndex/)
  assert.match(catalog, /cardStepHeight/)
  // Default path must NOT early-return before settle wiring
  assert.doesNotMatch(
    catalog,
    /if \(stage\.dataset\.nativeFormatScroll !== 'false'\) return undefined/,
  )
})

test('web and legacy catalog snap logic stay in parity', () => {
  assert.equal(catalog, legacyCatalog)
})
