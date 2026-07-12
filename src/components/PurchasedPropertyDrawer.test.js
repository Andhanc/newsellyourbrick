import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const component = await readFile(new URL('./PurchasedPropertyDrawer.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./PurchasedPropertyDrawer.css', import.meta.url), 'utf8')

test('contains accessible purchase details and both primary actions', () => {
  assert.match(component, /role="dialog"/)
  assert.match(component, /aria-modal="true"/)
  assert.match(component, /Связаться с менеджером/)
  assert.match(component, /Продать объект/)
  assert.match(component, /Осталось оплатить/)
  assert.match(component, /event\.key === 'Escape'/)
  assert.match(component, /event\.key !== 'Tab'/)
  assert.match(component, /element\.inert = true/)
  assert.match(component, /querySelector\('\.app-layout'\)/)
})

test('contains all six resale onboarding steps and seller CTA', () => {
  assert.match(component, /Создайте аккаунт продавца/)
  assert.match(component, /Подтвердите личность и контакты/)
  assert.match(component, /Получите объект в кабинете/)
  assert.match(component, /Проверьте карточку и документы/)
  assert.match(component, /Выберите формат продажи/)
  assert.match(component, /Отправьте на модерацию/)
  assert.match(component, /Стать продавцом/)
})

test('uses a desktop right drawer and mobile bottom sheet', () => {
  assert.match(css, /right:\s*0/)
  assert.match(css, /max-width:\s*520px/)
  assert.match(css, /@media \(max-width: 680px\)/)
  assert.match(css, /env\(safe-area-inset-bottom\)/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
})
