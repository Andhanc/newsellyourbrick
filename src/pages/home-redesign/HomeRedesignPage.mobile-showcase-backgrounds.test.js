import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const css = await readFile(new URL('./HomeRedesignPage.css', import.meta.url), 'utf8')
const showcase = await readFile(
  new URL('../../components/InvestorPropertyShowcaseSection.jsx', import.meta.url),
  'utf8',
)
const mobile = css.slice(css.indexOf('@media (max-width: 600px)'))

test('uses clean solid showcase surfaces instead of muddy rgba overlays', () => {
  assert.match(mobile, /--hr-showcase-mist:\s*#e9f3f6/)
  assert.match(mobile, /--hr-showcase-mist-deep:\s*#deebef/)
  assert.doesNotMatch(mobile, /--hr-showcase-tint:\s*rgba\(/)
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.invest-showcase--buy-now[\s\S]*?var\(--hr-showcase-mist-deep\)/,
  )
})

test('keeps one Montserrat typography system across mobile showcase sections', () => {
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.invest-showcase__title[\s\S]*?font-family:\s*Montserrat[\s\S]*?font-weight:\s*800/,
  )
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.invest-showcase__header[\s\S]*?grid-template-areas:[\s\S]*?'title cta'/,
  )
  assert.match(mobile, /var\(--hr-showcase-action\)/)
  assert.match(showcase, /invest-showcase__cta-pill-text">Перейти</)
})

test('hides hard dividers on phones so section colors blend smoothly', () => {
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.invest-showcase \+ \.invest-showcase::before[\s\S]*?display:\s*none/,
  )
})
