import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./DebtAuctionInsight.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./DebtAuctionInsight.css', import.meta.url), 'utf8')

test('offers a debt summary and VIP documents dialog', () => {
  assert.match(component, /Финансовая картина/)
  assert.match(component, /isAuction \? 'Долговой аукцион' : 'Объект с долгом'/)
  assert.match(component, /isAuction \? 'Текущая ставка' : 'Стоимость объекта'/)
  assert.match(component, /Что известно о долге/)
  assert.match(component, /Открыть документы/)
  assert.match(component, /canAccess\('documents'\)/)
  assert.match(component, /onOpenDocuments/)
  assert.match(component, /role="dialog"/)
  assert.match(component, /aria-modal="true"/)
  assert.match(component, /Документы по долговому объекту/)
  assert.match(component, /startVipSubscriptionCheckout/)
  assert.doesNotMatch(component, /startProSubscriptionCheckout/)
  assert.doesNotMatch(component, /Полный анализ долга/)
  assert.match(component, /\/subscriptions#subscriptions-pricing-section/)
})

test('implements a phone-first bottom sheet with safe touch targets', () => {
  assert.match(css, /@media \(max-width: 760px\)/)
  assert.match(css, /padding-bottom:\s*calc\([^)]*env\(safe-area-inset-bottom\)/)
  assert.match(css, /min-height:\s*44px/)
  assert.match(css, /max-height:\s*min\(88dvh,\s*760px\)/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
})
