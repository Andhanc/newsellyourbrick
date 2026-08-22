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

const source = await readOrEmpty(new URL('./CompareMobileMetrics.jsx', import.meta.url))
const css = await readOrEmpty(new URL('./CompareMobileMetrics.css', import.meta.url))
const pageCss = await readOrEmpty(new URL('../../pages/Compare.css', import.meta.url))

test('mobile comparison keeps both object identities visible', () => {
  assert.match(source, /compare-mobile__pair/)
  assert.match(source, /compare-mobile__object-image/)
  assert.match(source, /onError=/)
  assert.match(source, /FALLBACK_IMAGE/)
  assert.match(source, /comparePage_object1/)
  assert.match(source, /comparePage_object2/)
  assert.match(source, /onReplace\('left'\)/)
  assert.match(source, /onReplace\('right'\)/)
  assert.match(source, /comparePage_replaceAria/)
  assert.match(source, /compare-mobile__versus/)
  assert.match(source, /compare-mobile__clear/)
  assert.match(source, /comparePage_pickOtherPair/)
  assert.match(source, /onClick=\{onClear\}/)
})

test('mobile comparison renders semantic metric cards instead of a table', () => {
  assert.match(source, /METRIC_GROUP_DEFS/)
  assert.match(source, /comparePage_groupPrice/)
  assert.match(source, /comparePage_groupProperty/)
  assert.match(source, /comparePage_groupComfort/)
  assert.match(source, /compare-mobile__group/)
  assert.match(source, /rows\.map/)
  assert.match(source, /compare-mobile__metric/)
  assert.match(source, /compare-mobile__metric-label/)
  assert.match(source, /compare-mobile__value--winner/)
  assert.match(source, /<FiCheck \/>/)
  assert.doesNotMatch(source, /comparePage_incompleteFields/)
  assert.doesNotMatch(source, /<table/)
})

test('mobile comparison has no horizontal scroll and uses readable buyer tokens', () => {
  assert.match(css, /overflow-x:\s*clip/)
  assert.match(css, /position:\s*sticky/)
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(css, /min-height:\s*var\(--buyer-touch\)/)
  assert.match(css, /\.compare-mobile__winner[\s\S]*var\(--buyer-teal/)
  assert.doesNotMatch(css, /\.compare-mobile__group-warning/)
  assert.match(css, /@media\s*\(max-width:\s*360px\)/)
  assert.match(css, /top:\s*var\(--compare-mobile-header-offset,\s*calc\(96px \+ env\(safe-area-inset-top, 0px\)\)\)/)
  assert.match(css, /\.compare-mobile__versus/)
  assert.match(css, /\.compare-mobile__clear/)
})

test('winner check and VS marker stay white on Tiffany circles', () => {
  assert.match(css, /\.compare-mobile__versus \{[\s\S]*?background: var\(--buyer-teal, #4fc7cf\);[\s\S]*?color: #ffffff;/)
  assert.match(css, /\.compare-mobile__winner \{[\s\S]*?background: var\(--buyer-teal, #4fc7cf\);[\s\S]*?color: #ffffff;/)
})

test('mobile comparison relies on the Header spacer without adding a second header-sized gap', () => {
  assert.match(pageCss, /--compare-mobile-header-offset:\s*calc\(96px \+ env\(safe-area-inset-top, 0px\)\)/)
  assert.match(pageCss, /padding:\s*var\(--compare-mobile-header-offset\)\s+var\(--buyer-gutter\)/)
  assert.doesNotMatch(pageCss, /\.compare-container\s*\{[^}]*padding:\s*calc\(96px \+ env\(safe-area-inset-top, 0px\)\)/)
})

test('compact mobile AI overrides are declared after the base AI rules', () => {
  const baseIndex = pageCss.indexOf('.compare-ai-section {')
  const overrideIndex = pageCss.indexOf('.compare-page .compare-ai-mobile-card')
  assert.ok(baseIndex >= 0)
  assert.ok(overrideIndex > baseIndex)
  assert.match(pageCss.slice(overrideIndex), /\.compare-page \.compare-ai-mobile-card/)
  assert.match(pageCss, /\.compare-page \.compare-ai-idle/)
})
