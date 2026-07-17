import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const bookingsSource = await readFile(new URL('./MyBookingsPage.jsx', import.meta.url), 'utf8')
const bookingsCss = await readFile(new URL('./MyBookingsPage.css', import.meta.url), 'utf8')
const historySource = await readFile(new URL('./History.jsx', import.meta.url), 'utf8')
const historyCss = await readFile(new URL('./History.css', import.meta.url), 'utf8')
const profileSource = await readFile(new URL('./TestPage.jsx', import.meta.url), 'utf8')
const profileCss = await readFile(new URL('./TestPage.css', import.meta.url), 'utf8')
const notificationsSource = await readFile(
  new URL('../context/SiteNotificationsPanel.jsx', import.meta.url),
  'utf8',
)
const notificationsCss = await readFile(
  new URL('../context/SiteNotificationsPanel.css', import.meta.url),
  'utf8',
)
const notificationsContextSource = await readFile(
  new URL('../context/SiteNotificationsContext.jsx', import.meta.url),
  'utf8',
)

test('bookings mobile experience guides the buyer by status and next action', () => {
  assert.match(bookingsSource, /my-bookings-spotlight/)
  assert.match(bookingsSource, /my-bookings-filters/)
  assert.match(bookingsSource, /bookingStatusFilter/)
  assert.match(bookingsSource, /BuyerSheetShell/)
  assert.match(bookingsSource, /selectedBooking/)
  assert.match(bookingsSource, /Что делать дальше/)
  assert.match(bookingsSource, /my-bookings-state__retry/)
  assert.match(bookingsSource, /\['pending', 'paid', 'approved', 'completed'/)
  assert.match(bookingsCss, /@media \(max-width: 767px\)[\s\S]*\.my-bookings-spotlight/)
  assert.match(bookingsCss, /\.my-bookings-filter[\s\S]*min-height:\s*44px/)
  assert.match(bookingsCss, /\.my-bookings-card__next[\s\S]*min-height:\s*44px/)
})

test('history mobile experience leads with a truthful portfolio summary', () => {
  assert.match(historySource, /history-mobile-hero/)
  assert.match(historySource, /history-mobile-hero__value/)
  assert.match(historySource, /history-mobile-hero__actions/)
  assert.match(historyCss, /@media \(max-width: 767px\)[\s\S]*\.history-mobile-hero/)
  assert.match(historyCss, /\.history-mobile-hero__action[\s\S]*min-height:\s*44px/)
  assert.match(historyCss, /@media \(max-width: 767px\)[\s\S]*\.history-card[\s\S]*border-radius:\s*24px/)
})

test('profile mobile hero reads as a premium app home rather than a desktop card', () => {
  assert.match(profileSource, /test-hero-pro__mobile-eyebrow/)
  assert.match(profileSource, /translationPrefix="buyerTest"/)
  assert.match(profileCss, /@media \(max-width: 560px\)[\s\S]*\.test-hero-pro__mobile-eyebrow/)
  assert.match(profileCss, /@media \(max-width: 560px\)[\s\S]*\.test-hero-pro\s*\{[\s\S]*background:\s*#063b3f/)
  assert.match(profileCss, /@media \(max-width: 560px\)[\s\S]*\.test-hero-icon-tile[\s\S]*min-height:\s*72px/)
})

test('buyer notification drawer animates calmly and states the next step', () => {
  assert.match(notificationsSource, /notificationNextStep/)
  assert.match(notificationsSource, /notification-item__next-step/)
  assert.match(notificationsCss, /notification-item-in/)
  assert.match(notificationsCss, /\.notification-panel__group-items \.notification-item:nth-child\(2\)/)
  assert.match(notificationsCss, /\.notification-item__next-step/)
  assert.match(notificationsCss, /@media \(prefers-reduced-motion:\s*reduce\)/)
  assert.match(notificationsContextSource, /aria-label=\{t\('notifications'\)\}/)
})
