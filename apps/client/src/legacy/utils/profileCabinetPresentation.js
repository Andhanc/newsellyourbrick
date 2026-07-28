const HISTORY_CATEGORY_DEFS = [
  { key: 'bids', title: 'Ставки', eyebrow: 'Участие в торгах' },
  { key: 'properties', title: 'Купленные объекты', eyebrow: 'Ваша недвижимость' },
  { key: 'shares', title: 'Купленные доли', eyebrow: 'Совместные инвестиции' },
  { key: 'debts', title: 'Долги', eyebrow: 'Объекты с обязательствами' },
]

function finiteAmount(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

export function buildProfileHistoryDashboard(historySections = []) {
  const source = new Map(
    (Array.isArray(historySections) ? historySections : []).map((section) => [
      section.key,
      Array.isArray(section.items) ? section.items : [],
    ]),
  )
  const purchased = [...(source.get('auction') || []), ...(source.get('reserve') || [])]
  const itemsByCategory = {
    bids: source.get('bids') || [],
    properties: purchased.filter((item) => !item?.isDebt),
    shares: source.get('shares') || [],
    debts: purchased.filter((item) => Boolean(item?.isDebt)),
  }
  const categories = HISTORY_CATEGORY_DEFS.map((definition) => ({
    ...definition,
    items: itemsByCategory[definition.key],
    count: itemsByCategory[definition.key].length,
  }))
  const investedByCurrency = {}
  for (const category of categories) {
    if (category.key === 'bids') continue
    for (const item of category.items) {
      const amount = finiteAmount(item?.amountValue)
      if (!amount) continue
      const currency = String(item?.currency || 'EUR').toUpperCase()
      investedByCurrency[currency] = (investedByCurrency[currency] || 0) + amount
    }
  }

  return {
    categories,
    analytics: {
      operations: categories.reduce((sum, category) => sum + category.count, 0),
      activeBids: itemsByCategory.bids.length,
      purchases:
        itemsByCategory.properties.length +
        itemsByCategory.shares.length +
        itemsByCategory.debts.length,
      investedByCurrency,
    },
  }
}

function parseBookingDate(value) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isFinite(date.getTime()) ? date : null
}

export function buildBookingTicket(booking = {}, locale = 'ru-RU') {
  const start = parseBookingDate(booking.start_date)
  const end = parseBookingDate(booking.end_date)
  const days = start && end && end >= start
    ? Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    : 0
  const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' }

  return {
    ...booking,
    title: booking.property_title || `Объект #${booking.property_id ?? '—'}`,
    statusKey: String(booking.status || 'pending').toLowerCase(),
    day: start ? String(start.getDate()).padStart(2, '0') : '—',
    month: start
      ? start.toLocaleDateString(locale, { month: 'short' }).replace('.', '').toUpperCase()
      : 'ДАТА',
    year: start ? String(start.getFullYear()) : '',
    days,
    dateRange:
      start && end
        ? `${start.toLocaleDateString(locale, dateOptions)} — ${end.toLocaleDateString(locale, dateOptions)}`
        : [booking.start_date, booking.end_date].filter(Boolean).join(' — ') || 'Дата уточняется',
  }
}
