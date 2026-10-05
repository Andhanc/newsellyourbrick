export function resolveCalendarLocale(locale, i18nLanguage) {
  const raw = String(locale || i18nLanguage || 'en').trim()
  if (!raw) return 'en'
  return raw.replace('_', '-')
}

export function getMonthLabels(locale) {
  const formatter = new Intl.DateTimeFormat(locale || 'en', { month: 'long' })
  return Array.from({ length: 12 }, (_, month) =>
    formatter.format(new Date(2024, month, 1)),
  )
}

/** Sunday-first short weekday labels to match the calendar grid. */
export function getWeekdayShortLabels(locale) {
  const formatter = new Intl.DateTimeFormat(locale || 'en', { weekday: 'short' })
  // 2024-01-07 is Sunday
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(2024, 0, 7 + index)),
  )
}
