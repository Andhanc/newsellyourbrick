import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./PurchasedPropertyHistoryCard.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./PurchasedPropertyHistoryCard.css', import.meta.url), 'utf8')

test('renders a real purchased-property summary and one details action', () => {
  assert.match(component, /Купить сейчас/)
  assert.match(component, /Оплачено \{Math\.round\(item\.paymentPercent\)\}%/)
  assert.match(component, /Подробнее/)
  assert.match(component, /role="progressbar"/)
  assert.match(component, /item\.imageSrc/)
  assert.match(component, /item\.location/)
  assert.doesNotMatch(component, /Продать объект/)
})

test('uses cabinet styling and accessible touch targets', () => {
  assert.match(css, /\.purchased-property-card/)
  assert.match(css, /min-height:\s*44px/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
})
