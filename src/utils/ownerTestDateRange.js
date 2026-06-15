const TODAY = new Date()
const WEEK_START = new Date(TODAY)
WEEK_START.setDate(TODAY.getDate() - 6)
const MONTH_START = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
const QUARTER_START = new Date(TODAY.getFullYear(), TODAY.getMonth() - 2, 1)

export function toOwnerTestInputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function monthPresetLabel(date, locale) {
  const label = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function getDefaultOwnerTestDateRange() {
  return {
    id: 'month',
    from: toOwnerTestInputDate(MONTH_START),
    to: toOwnerTestInputDate(TODAY),
  }
}

export function formatOwnerTestDateRangeLabel(range, locale) {
  const format = (value) => {
    if (!value) return ''
    const date = new Date(`${value}T00:00:00`)
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
      .format(date)
      .replace(/\.$/, '')
  }
  return `${format(range.from)} – ${format(range.to)}`
}

export function getOwnerTestDatePresets(t, locale) {
  return [
    {
      id: 'week',
      label: t('ownerTest_datePreset7d'),
      from: toOwnerTestInputDate(WEEK_START),
      to: toOwnerTestInputDate(TODAY),
    },
    {
      id: 'month',
      label: monthPresetLabel(TODAY, locale),
      from: toOwnerTestInputDate(MONTH_START),
      to: toOwnerTestInputDate(TODAY),
    },
    {
      id: 'quarter',
      label: t('ownerTest_datePresetQuarter'),
      from: toOwnerTestInputDate(QUARTER_START),
      to: toOwnerTestInputDate(TODAY),
    },
  ]
}

export function bookingOverlapsDateRange(startDate, endDate, range) {
  if (!range?.from || !range?.to) return true
  const start = String(startDate || '').slice(0, 10)
  const end = String(endDate || startDate || '').slice(0, 10)
  if (!start) return true
  return start <= range.to && end >= range.from
}
