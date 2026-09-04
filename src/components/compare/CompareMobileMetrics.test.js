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
  assert.match(source, /compare-mobile__value-media/)
  assert.match(source, /compare-mobile__value-image/)
  assert.match(source, /<FaTrophy \/>/)
  assert.match(source, /METRIC_ICON_ROOT/)
  assert.match(source, /metric-icons/)
  assert.match(source, /\$\{row\.id\}\.png/)
  assert.match(source, /compare-mobile__value-badge/)
  assert.doesNotMatch(source, /FiChevronRight/)
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
  assert.match(css, /\.compare-mobile__metric-icon/)
  assert.match(css, /\.compare-mobile__metric-head[\s\S]*display:\s*flex/)
  assert.match(css, /\.compare-mobile__values[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(css, /\.compare-mobile__value-media[\s\S]*width:\s*100%;[\s\S]*height:\s*72px/)
  assert.match(css, /\.compare-mobile__value-image[\s\S]*object-fit:\s*cover/)
  assert.match(css, /\.compare-mobile__value-badge/)
  assert.doesNotMatch(css, /\.compare-mobile__value-index/)
})

test('winner trophy and VS marker stay white on Tiffany circles', () => {
  assert.match(css, /\.compare-mobile__versus \{[\s\S]*?background: var\(--buyer-teal, #4fc7cf\);[\s\S]*?color: #ffffff;/)
  assert.match(css, /\.compare-mobile__winner \{[\s\S]*?background: var\(--buyer-teal, #4fc7cf\);[\s\S]*?color: #ffffff;/)
  assert.match(css, /\.compare-mobile__winner \{[\s\S]*?position:\s*absolute/)
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
  const alignedCardIndex = pageCss.indexOf('Keep the AI analysis in the same light comparison-card system')
  assert.ok(alignedCardIndex > overrideIndex)
  const alignedCardCss = pageCss.slice(alignedCardIndex)
  assert.match(alignedCardCss, /\.compare-page \.compare-ai-section[\s\S]*background:\s*#ffffff/)
  assert.match(alignedCardCss, /\.compare-page \.compare-ai-mobile-value--win[\s\S]*background:\s*#e8faf7/)
})

test('all comparison card headings use the market estimate display type', () => {
  assert.match(pageCss, /--compare-card-heading-font:\s*var\(--buyer-font-display,\s*'Montserrat'/)
  assert.match(pageCss, /--compare-card-heading-weight:\s*800/)
  assert.match(pageCss, /\.compare-page \.compare-mobile__group-head h3,/)
  assert.match(pageCss, /\.compare-page \.compare-mobile__metric-label,/)
  assert.match(pageCss, /\.compare-page \.compare-market__header h2,/)
  assert.match(pageCss, /\.compare-page \.compare-decision__title,/)
  assert.match(pageCss, /\.compare-page \.compare-ai-title,/)
  assert.match(pageCss, /font-family:\s*var\(--compare-card-heading-font\)/)
  assert.match(pageCss, /font-weight:\s*var\(--compare-card-heading-weight\)/)
})
