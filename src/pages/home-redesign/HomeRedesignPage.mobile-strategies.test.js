import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const jsx = await readFile(new URL('./HomeRedesignPage.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./HomeRedesignPage.css', import.meta.url), 'utf8')

test('gives every home strategy its own mobile 3D artwork', () => {
  for (const image of [
    '/images/home-sale-formats/mobile/sale-format-auction-3d.webp',
    '/images/home-sale-formats/mobile/sale-format-buy-now-3d.webp',
    '/images/home-sale-formats/mobile/sale-format-shares-3d.webp',
    '/images/home-sale-formats/mobile/sale-format-debts-3d.webp',
  ]) {
    assert.match(jsx, new RegExp(image.replaceAll('/', '\\/')))
  }

  assert.match(jsx, /className="hr-strategy-stat-card__visual"/)
  assert.match(jsx, /className="hr-strategy-stat-card__number"/)
  assert.match(jsx, /className="hr-strategy-stat-card__cta"/)
})

test('turns only the phone layout into a bounded scroll-snap rail', () => {
  const mobile = css.slice(css.indexOf('@media (max-width: 600px)'))

  assert.match(mobile, /grid-auto-flow:\s*column/)
  assert.match(mobile, /grid-auto-columns:\s*clamp\(16\.5rem,\s*86vw,\s*24rem\)/)
  assert.match(mobile, /scroll-snap-type:\s*x mandatory/)
  assert.match(mobile, /height:\s*clamp\(20\.5rem,\s*92vw,\s*24rem\)/)
  assert.match(mobile, /\.hr-strategy-stat-card__visual\s*\{[\s\S]*?opacity:\s*0\.[4-8]/)
  assert.match(mobile, /\.hr-strategies__lead\s*\{[\s\S]*?display:\s*none/)
  assert.match(mobile, /\.hr-strategies__pager-dot\.is-active/)
  assert.match(jsx, /className="hr-strategies__pager"/)
  assert.match(jsx, /className="hr-strategies__title-pill"/)
  assert.match(css, /@media\s*\(max-width:\s*359px\)/)
})
