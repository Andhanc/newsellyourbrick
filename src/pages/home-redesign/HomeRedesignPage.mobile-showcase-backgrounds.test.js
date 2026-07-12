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
  assert.match(mobile, /--hr-showcase-buy-now:\s*#e5f2f5/)
  assert.match(mobile, /--hr-showcase-debts:\s*#eef1df/)
  assert.doesNotMatch(mobile, /--hr-showcase-tint:\s*rgba\(/)
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.invest-showcase--buy-now[\s\S]*?background:\s*var\(--hr-showcase-buy-now\)[\s\S]*?box-shadow:\s*inset/,
  )
  assert.match(
    mobile,
    /\.hr-page \.hr-showcases \.invest-showcase--debts[\s\S]*?background:\s*var\(--hr-showcase-debts\)[\s\S]*?box-shadow:\s*inset/,
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
