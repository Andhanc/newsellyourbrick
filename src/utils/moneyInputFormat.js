/** Формат сумм в форме ставки и блоке лидера: 1,234,567 или 1,234,567.50 */
export const BID_AMOUNT_LOCALE = 'en-US'

export function parseMoneyInputValue(value) {
  if (value == null || value === '') return NaN
  const cleaned = String(value).replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '.') return NaN
  const dot = cleaned.indexOf('.')
  let normalized = cleaned
  if (dot !== -1) {
    normalized = cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '')
  }
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : NaN
}

/** Оставляет только цифры и одну точку, до 2 знаков после точки */
export function sanitizeMoneyInputRaw(raw) {
  let s = String(raw).replace(/,/g, '').replace(/[^\d.]/g, '')
  if (!s) return ''

  const firstDot = s.indexOf('.')
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }

  const parts = s.split('.')
  const intPart = parts[0] ?? ''
  const hasDot = firstDot !== -1

  if (hasDot && parts.length > 1) {
    const decPart = (parts[1] ?? '').slice(0, 2)
    if (s.endsWith('.') && decPart === '') {
      return `${intPart}.`
    }
    return decPart.length ? `${intPart}.${decPart}` : intPart
  }

  return intPart
}

/** Форматирование во время ввода (сохраняет незавершённую дробную часть) */
export function formatMoneyInputDisplay(sanitized) {
  if (sanitized == null || sanitized === '') return ''
  if (sanitized === '.') return '0.'

  const endsWithDot = sanitized.endsWith('.')
  const [intRaw, decRaw] = sanitized.split('.')
  const intDigits = (intRaw ?? '').replace(/\D/g, '')

  if (!intDigits && decRaw === undefined && !endsWithDot) return ''

  const intFormatted = intDigits
    ? Number(intDigits).toLocaleString(BID_AMOUNT_LOCALE, { maximumFractionDigits: 0 })
    : '0'

  if (endsWithDot && decRaw === undefined) {
    return `${intFormatted}.`
  }
  if (decRaw !== undefined) {
    return `${intFormatted}.${decRaw}`
  }
  return intFormatted
}

/** Отображение сохранённой суммы (без лишнего .00 для целых) */
export function formatBidInputDisplayFromStored(stored) {
  if (!stored) return ''
  if (stored.endsWith('.')) return formatMoneyInputDisplay(stored)

  const n = parseMoneyInputValue(stored)
  if (!Number.isFinite(n)) return formatMoneyInputDisplay(stored)

  return n.toLocaleString(BID_AMOUNT_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function formatBidMoneyAmount(amount, { symbol = '' } = {}) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return symbol ? `${symbol}—` : '—'
  const formatted = n.toLocaleString(BID_AMOUNT_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return symbol ? `${symbol}${formatted}` : formatted
}
