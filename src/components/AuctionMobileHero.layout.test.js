import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const heroCss = await readFile(new URL('./Hero.css', import.meta.url), 'utf8')
const homeJsx = await readFile(new URL('../pages/Home.jsx', import.meta.url), 'utf8')

test('adds an occasional staggered shimmer to static mobile auction cards', () => {
  assert.match(heroCss, /@keyframes hero-auction-card-shimmer/)
  assert.match(heroCss, /animation:\s*hero-auction-card-shimmer 7\.5s/)
  assert.match(heroCss, /nth-child\(2\)[\s\S]*animation-delay:\s*2\.5s/)
  assert.match(heroCss, /nth-child\(3\)[\s\S]*animation-delay:\s*5s/)
  assert.match(
    heroCss,
    /hero-feature-card--static::after[\s\S]*z-index:\s*2;[\s\S]*pointer-events:\s*none/,
  )
  assert.match(heroCss, /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none/)
})

test('enlarges static mobile auction artwork at both phone breakpoints', () => {
  assert.match(
    heroCss,
    /hero-features--static-mobile[\s\S]*hero-feature-image__img[\s\S]*width:\s*82px;[\s\S]*height:\s*82px/,
  )
  assert.match(
    heroCss,
    /@media \(max-width:\s*480px\)[\s\S]*hero-features--static-mobile[\s\S]*hero-feature-image__img[\s\S]*width:\s*68px;[\s\S]*height:\s*68px/,
  )
})

test('does not render a mobile auction breadcrumb block', () => {
  assert.doesNotMatch(homeJsx, /PageBreadcrumbs/)
  assert.doesNotMatch(homeJsx, /isMobileViewport/)
})
