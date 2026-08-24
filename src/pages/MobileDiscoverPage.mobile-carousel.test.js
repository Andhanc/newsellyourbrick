import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const jsx = readFileSync(new URL('./MobileDiscoverPage.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('./MobileDiscoverPage.css', import.meta.url), 'utf8')

test('mobile home uses the restored swipe rail and generated card icons', () => {
  assert.match(jsx, /const cardsRef = useRef\(null\)/)
  assert.match(jsx, /className="md-cards-dots"/)
  assert.match(jsx, /src=\{card\.iconSrc\}/)
  assert.match(jsx, /className="md-card__image"/)
  assert.match(jsx, /src=\{card\.image\}/)
  assert.match(jsx, /sale-format-auction-summer\.webp/)
  assert.match(jsx, /sale-format-buy-now-summer\.webp/)
  assert.match(jsx, /sale-format-debts-summer\.webp/)
  assert.match(jsx, /sale-format-shares-summer\.webp/)
  assert.match(css, /object-position: var\(--md-card-image-position, center\)/)
  assert.match(css, /@media \(max-width: 767px\)/)
  assert.match(css, /grid-auto-columns: clamp\(226px, 68vw, 262px\)/)
  assert.match(css, /scroll-snap-type: x mandatory/)
  assert.match(css, /aspect-ratio: 0\.84/)
})

test('desktop four-column layout is preserved', () => {
  assert.match(css, /@media \(min-width: 1024px\)[\s\S]*grid-template-columns: repeat\(4/)
})
