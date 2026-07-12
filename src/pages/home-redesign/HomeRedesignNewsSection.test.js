import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const jsx = await readFile(new URL('./HomeRedesignNewsSection.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./HomeRedesignNewsSection.css', import.meta.url), 'utf8')

test('renders four equal localized news cards in one rail', () => {
  assert.match(jsx, /const NEWS_ITEMS = \[/)
  assert.equal((jsx.match(/titleKey: 'sybLandingNews\dTitle'/g) || []).length, 4)
  assert.doesNotMatch(jsx, /SellYourBrick · Journal|hr-editorial-news__eyebrow/)
  assert.match(jsx, /className="hr-editorial-news__rail"/)
  assert.match(jsx, /className="hr-editorial-news__card"/)
  assert.doesNotMatch(jsx, /featured|SybLandingNewsShowcase/)
  assert.match(css, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/)
})

test('uses the site font and turns the same card row into a phone snap rail', () => {
  assert.match(css, /font-family:\s*var\(--site-font-family/)

  const mobile = css.slice(css.indexOf('@media (max-width: 700px)'))
  assert.match(
    mobile,
    /\.hr-editorial-news__title\s*\{[\s\S]*?max-width:\s*min\(18ch,\s*100%\)[\s\S]*?font-size:\s*clamp\(1\.75rem,\s*8vw,\s*2\.125rem\)/,
  )
  assert.match(mobile, /grid-auto-flow:\s*column/)
  assert.match(mobile, /grid-auto-columns:\s*clamp\(16\.75rem,\s*78vw,\s*20rem\)/)
  assert.match(mobile, /scroll-snap-type:\s*x mandatory/)
  assert.match(mobile, /scroll-padding-inline:\s*var\(--hr-news-mobile-gutter\)/)
  assert.match(mobile, /min-height:\s*44px/)
})

test('keeps card interaction accessible and motion optional', () => {
  assert.match(jsx, /<Link[\s\S]*?className="hr-editorial-news__card-link"/)
  assert.match(jsx, /aria-label=\{item\.title\}/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /scrollbar-width:\s*none/)
})
