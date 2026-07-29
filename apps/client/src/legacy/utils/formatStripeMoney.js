/**
 * Форматирование сумм из Stripe (minor units = центы) и основных единиц валюты.
 */

export function formatMoneyFromMinorUnits(cents, currency, locale) {
  if (cents == null || !Number.isFinite(Number(cents))) return ''
  const cur = String(currency || 'eur').toUpperCase()
  const major = Number(cents) / 100
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(major)
  } catch {
    return `${major.toFixed(2)} ${cur}`
  }
}

export function formatMoneyMajorUnits(amount, currency, locale) {
  if (amount == null || !Number.isFinite(Number(amount))) return ''
  const cur = String(currency || 'eur').toUpperCase()
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(Number(amount))
  } catch {
    return `${Number(amount).toFixed(2)} ${cur}`
  }
}
