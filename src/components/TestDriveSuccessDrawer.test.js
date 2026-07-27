import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const drawer = await readFile(new URL('./TestDriveSuccessDrawer.jsx', import.meta.url), 'utf8')
const css = await readFile(new URL('./TestDriveSuccessDrawer.css', import.meta.url), 'utf8')
const page = await readFile(new URL('../pages/TestDriveBookingPage.jsx', import.meta.url), 'utf8')
const billing = await readFile(new URL('../../server/stripeBilling.js', import.meta.url), 'utf8')

test('test-drive confirmation is a guided accessible buyer drawer', () => {
  assert.match(drawer, /BuyerSheetShell/)
  assert.match(drawer, /Тест-драйв забронирован/)
  assert.match(drawer, /Открыть мои бронирования/)
  assert.match(drawer, /Вернуться к объекту/)
  assert.match(css, /min-height:\s*52px/)
})

test('confirmed checkout returns and renders factual booking context', () => {
  assert.match(billing, /start_date:\s*String\(session\.metadata\?\.start_date/)
  assert.match(billing, /buyer_contact_channel/)
  assert.match(page, /TestDriveSuccessDrawer/)
  assert.match(page, /confirmingSessionRef/)
  assert.match(page, /import\.meta\.env\.DEV/)
  assert.match(page, /buyer_booking_preview/)
  assert.doesNotMatch(page, /requestOpenLoginModal\(\{ wizard: true \}\)\s*\n\s*requestOpenLoginModal/)
})
