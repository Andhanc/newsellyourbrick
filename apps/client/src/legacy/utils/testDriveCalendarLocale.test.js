import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getMonthLabels,
  getWeekdayShortLabels,
  resolveCalendarLocale,
} from './testDriveCalendarLocale.js'

test('resolveCalendarLocale normalizes UI language', () => {
  assert.equal(resolveCalendarLocale('es', 'en'), 'es')
  assert.equal(resolveCalendarLocale(undefined, 'es-ES'), 'es-ES')
  assert.equal(resolveCalendarLocale('de_DE', undefined), 'de-DE')
  assert.equal(resolveCalendarLocale(undefined, undefined), 'en')
})

test('Spanish month and weekday labels are not English', () => {
  const months = getMonthLabels('es')
  assert.match(months[9], /octubre/i)
  assert.doesNotMatch(months[9], /october/i)

  const days = getWeekdayShortLabels('es')
  assert.equal(days.length, 7)
  // Sunday-first
  assert.match(days[0], /dom/i)
  assert.match(days[1], /lun/i)
  assert.doesNotMatch(days[0], /^sun$/i)
})

test('Russian weekday labels stay localized', () => {
  const days = getWeekdayShortLabels('ru')
  assert.match(days[0], /вс/i)
  assert.match(days[1], /пн/i)
})
