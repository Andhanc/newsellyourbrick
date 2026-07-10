import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./HomeRedesignPage.css', import.meta.url), 'utf8')
const showcase = await readFile(
  new URL('../../components/InvestorPropertyShowcaseSection.jsx', import.meta.url),
  'utf8',
)

test('fits two complete property cards and a third-card hint on phones', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 600px)'))

  assert.match(mobile, /--hr-property-card-width:\s*clamp\(8\.4rem,\s*43vw,\s*15rem\)/)
  assert.match(mobile, /\.hr-page \.hr-showcases \.invest-showcase__scroller\s*\{[\s\S]*?gap:\s*8px/)
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.home-showcase__slot\s*\{[\s\S]*?flex:\s*0 0 var\(--hr-property-card-width\)[\s\S]*?width:\s*var\(--hr-property-card-width\)/,
  )
  assert.match(mobile, /scroll-snap-align:\s*start/)

  const cardWidthAt = (viewportWidth) =>
    Math.min(15 * 16, Math.max(8.4 * 16, viewportWidth * 0.43))

  for (const viewportWidth of [320, 390, 480, 600]) {
    const railWidth = viewportWidth - 28
    const cardWidth = cardWidthAt(viewportWidth)

    assert.ok(2 * cardWidth + 8 <= railWidth, `two cards fit at ${viewportWidth}px`)
    assert.ok(3 * cardWidth + 16 > railWidth, `the third card stays partial at ${viewportWidth}px`)
  }
})

test('keeps every card layer readable inside the compact width', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 600px)'))

  assert.match(mobile, /aspect-ratio:\s*3 \/ 2/)
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.listing-card-auction-timer\s*\{[\s\S]*?margin-top:\s*-6px/,
  )
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.auction-card:has\(\.listing-card-auction-timer\) \.auction-card__title[\s\S]*?display:\s*none/,
  )
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.invest-showcase \.auction-card__price-panel\s*\{[\s\S]*?flex-direction:\s*row[\s\S]*?#ffffff/,
  )
  assert.match(mobile, /@keyframes hr-showcase-bid-shimmer/)
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.invest-showcase \.auction-card__price-label-short[\s\S]*?display:\s*inline/,
  )
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.invest-showcase \.auction-card__price-value[\s\S]*?color:\s*#0f172a/,
  )
  assert.match(mobile, /-webkit-line-clamp:\s*2/)
  assert.match(mobile, /text-overflow:\s*ellipsis/)
  assert.match(mobile, /\.auction-card__actions[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(mobile, /\.debts-property-card__actions[\s\S]*?flex-direction:\s*column/)
  assert.match(mobile, /\.shares-v2-card__footer[\s\S]*?flex-direction:\s*column/)
})

test('uses the rendered mobile gap for pagination and arrow scrolling', () => {
  assert.match(showcase, /getComputedStyle\(scroller\)\.columnGap/)
  assert.doesNotMatch(showcase, /const gap = 16/)
})
