export const AUCTION_MIN_MONTHS = 3
export const AUCTION_MIN_DAYS = 15

export function parseMoneyDigits(value) {
  const n = parseFloat(String(value ?? '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function getTodayDateString() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString().split('T')[0]
}

function parseDayOr(value, fallback) {
  const base = new Date(fallback)
  base.setHours(0, 0, 0, 0)
  if (value == null) return base
  const raw = String(value).trim()
  if (!raw) return base
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return base
  d.setHours(0, 0, 0, 0)
  return d
}

export function getMinAuctionEndDate(
  startDateRaw,
  minMonths = AUCTION_MIN_MONTHS,
  minDays = AUCTION_MIN_DAYS,
) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseDayOr(startDateRaw, today)
  const minEnd = new Date(start)
  minEnd.setMonth(minEnd.getMonth() + minMonths)
  minEnd.setDate(minEnd.getDate() + minDays)
  if (Number.isNaN(minEnd.getTime())) return null
  return minEnd.toISOString().split('T')[0]
}

function formatDateRu(dateStr) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function getAuctionEndDateError(startDateRaw, endDateRaw) {
  const raw = String(endDateRaw ?? '').trim()
  if (!raw) return 'Укажите дату окончания аукциона'

  const end = new Date(raw)
  if (Number.isNaN(end.getTime())) return 'Укажите дату окончания аукциона'

  const minEndStr = getMinAuctionEndDate(startDateRaw)
  if (!minEndStr) return null

  const minEnd = new Date(minEndStr)
  minEnd.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  if (end < minEnd) {
    return `Минимальный период аукциона составляет 3 месяца и 15 дней. Минимальная дата окончания: ${formatDateRu(minEndStr)}`
  }

  return null
}

/** Минимальная цена продажи не выше «Продать сейчас» и не выше 90% от неё. */
export function getMinimumSaleVsBuyNowError(minRaw, buyNowRaw) {
  const min = parseMoneyDigits(minRaw)
  const buyNow = parseMoneyDigits(buyNowRaw)
  if (!buyNow || buyNow <= 0 || !min || min <= 0) return null
  if (min > buyNow + 1e-9) {
    return 'Минимальная цена продажи не может быть выше цены «Продать сейчас»'
  }
  if (min > buyNow * 0.9 + 1e-9) {
    return 'Минимальная цена продажи не может превышать 90% от цены «Продать сейчас»'
  }
  return null
}

/** Стартовая ставка не может превышать 30% от «Продать сейчас», если она задана. */
export function getAuctionStartingVsBuyNowError(buyNowRaw, startingRaw) {
  const buyNow = parseMoneyDigits(buyNowRaw)
  const starting = parseMoneyDigits(startingRaw)
  if (!buyNow || buyNow <= 0) return null
  if (!starting || starting <= 0) return null
  const maxAllowed = buyNow * 0.3
  if (starting > maxAllowed + 1e-9) {
    return 'Стартовая ставка не может превышать 30% от цены «Продать сейчас»'
  }
  return null
}

const AUCTION_MODES = new Set(['auction', 'auction_buy_now', 'debt_auction'])
const BUY_NOW_MODES = new Set(['auction_buy_now', 'debt_auction'])

export function getPricingCrossFieldErrors(form) {
  const errors = {}
  const mode = form.listingMode

  if (!AUCTION_MODES.has(mode)) return errors

  if (BUY_NOW_MODES.has(mode)) {
    const minErr = getMinimumSaleVsBuyNowError(form.minimumSalePrice, form.price)
    if (minErr) errors.minimumSalePrice = minErr

    const startErr = getAuctionStartingVsBuyNowError(form.price, form.auctionStartingPrice)
    if (startErr) errors.auctionStartingPrice = startErr
  } else if (mode === 'auction') {
    const startErr = getAuctionStartingVsBuyNowError('', form.auctionStartingPrice)
    if (startErr) errors.auctionStartingPrice = startErr
  }

  return errors
}
