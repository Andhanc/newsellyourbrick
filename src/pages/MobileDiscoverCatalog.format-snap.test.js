import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const catalog = readFileSync(new URL('./MobileDiscoverCatalog.jsx', import.meta.url), 'utf8')
const legacyCatalog = readFileSync(
  new URL('../../apps/client/src/legacy/pages/MobileDiscoverCatalog.jsx', import.meta.url),
  'utf8',
)
const page = readFileSync(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const pageCss = readFileSync(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')
const legacyCss = readFileSync(
  new URL('../../apps/client/src/legacy/pages/MobileDiscoverPage.css', import.meta.url),
  'utf8',
)

test('format stack hard-pages on a small vertical swipe by default', () => {
  assert.match(catalog, /Hard pager \(one small vertical swipe = one card\)/)
  assert.match(catalog, /pagerOwnsMove/)
  assert.match(catalog, /commitFlipByDelta/)
  assert.match(catalog, /nearestFlipIndex/)
  assert.match(catalog, /cardStepHeight/)
  // Park offsets are cached — the scroll handler must not re-read layout.
  assert.match(catalog, /geometryDirty/)
  assert.match(catalog, /new ResizeObserver\(invalidateGeom\)/)
  assert.doesNotMatch(catalog, /GEOM_TTL_MS/)
  assert.match(catalog, /invalidateGeom/)
  // Hard pager is default; native settle is opt-in via data-native-format-scroll="true"
  assert.match(catalog, /nativeFormatScroll !== 'true'/)
})

test('pager commits mid-gesture instead of waiting for touchend', () => {
  // Own rAF animation — scrollTo({behavior:'smooth'}) is deferred until touchend.
  assert.match(catalog, /requestAnimationFrame/)
  assert.match(catalog, /PAGER_MS/)
  assert.doesNotMatch(catalog, /behavior: 'smooth'/)
  assert.match(catalog, /if \(Math\.abs\(dy\) < TOUCH_GESTURE\) return/)
  assert.match(catalog, /FLICK_GESTURE/)
})

test('one swipe never flips more than one card', () => {
  assert.match(catalog, /Exactly one card per gesture/)
  assert.match(catalog, /if \(committed \|\| jumpingRef\.current\) return/)
  assert.match(catalog, /if \(commitFlipByDelta\(dy\)\) committed = true/)
  // A trackpad inertia tail must not count as a second flick.
  assert.match(catalog, /WHEEL_FLICK_GAP/)
  assert.match(catalog, /flickSpent/)
})

test('a fresh flick is never blocked by the previous inertia tail', () => {
  // Waiting for wheel silence would stall the next flip for about a second,
  // so the decaying tail is detected by delta shape instead.
  assert.match(catalog, /const tailOver =/)
  assert.match(catalog, /reversed \|\|/)
  assert.match(catalog, /mag > lastMag \+ WHEEL_RISE/)
  assert.match(catalog, /mag <= WHEEL_TAIL/)
  // The only lock left is the pager's own animation.
  assert.doesNotMatch(catalog, /JUMP_LOCK_MS/)
  assert.match(catalog, /const PAGER_MS = 230/)
})

test('reaching the auction card is plain native scroll', () => {
  // No pager takeover above the first park.
  assert.doesNotMatch(catalog, /nearEntry/)
  assert.match(catalog, /Above the stack the auction sheet rises with plain native scroll/)
  assert.match(catalog, /if \(!inFlipZone\(\)\) return false/)
  // Cards refuse native drag only while the stack is parked.
  assert.match(catalog, /const syncLock = \(\)/)
  assert.match(catalog, /formatLock/)
  assert.match(pageCss, /\.md-stage\[data-format-lock='on'\] \.md-format-card \{[\s\S]*?touch-action: pan-x;/)
  assert.match(legacyCss, /\.md-stage\[data-format-lock='on'\] \.md-format-card \{[\s\S]*?touch-action: pan-x;/)
  assert.match(catalog, /entryReleaseY/)
})

test('nothing else may drive stage scroll to a mid-park offset', () => {
  // Catalog stops the wheel so the page shell cannot re-scroll the stage.
  assert.match(catalog, /event\.stopPropagation\(\)/)
  assert.match(page, /if \(event\.defaultPrevented\) return/)
  // Native momentum is stopped at the first park, never past it.
  assert.match(catalog, /if \(crossedIn\) \{/)
})

test('web and legacy catalog snap logic stay in parity', () => {
  assert.equal(catalog, legacyCatalog)
})
