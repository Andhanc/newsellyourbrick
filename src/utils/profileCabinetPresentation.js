const HISTORY_CATEGORY_DEFS = [
  {
    key: 'bids',
    titleKey: 'profileHistory_dashBidsTitle',
    chipTitleKey: 'profileHistory_dashBidsChip',
    eyebrowKey: 'profileHistory_dashBidsEyebrow',
    title: 'Bids',
    chipTitle: 'Bids',
    eyebrow: 'Auction participation',
  },
  {
    key: 'properties',
    titleKey: 'profileHistory_dashPropertiesTitle',
    chipTitleKey: 'profileHistory_dashPropertiesChip',
    eyebrowKey: 'profileHistory_dashPropertiesEyebrow',
    title: 'Purchased properties',
    chipTitle: 'Properties',
    eyebrow: 'Your real estate',
  },
  {
    key: 'shares',
    titleKey: 'profileHistory_dashSharesTitle',
    chipTitleKey: 'profileHistory_dashSharesChip',
    eyebrowKey: 'profileHistory_dashSharesEyebrow',
    title: 'Purchased shares',
    chipTitle: 'Shares',
    eyebrow: 'Co-investment',
  },
  {
    key: 'debts',
    titleKey: 'profileHistory_dashDebtsTitle',
    chipTitleKey: 'profileHistory_dashDebtsChip',
    eyebrowKey: 'profileHistory_dashDebtsEyebrow',
    title: 'Debts',
    chipTitle: 'Debts',
    eyebrow: 'Distressed properties',
  },
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

export function buildBookingTicket(booking = {}, locale = 'en-US') {
  const start = parseBookingDate(booking.start_date)
  const end = parseBookingDate(booking.end_date)
  const days = start && end && end >= start
    ? Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    : 0
  const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const propertyId = booking.property_id ?? '—'

  return {
    ...booking,
    titleKey: booking.property_title ? null : 'buyerBookings_propertyFallback',
    titleParams: booking.property_title ? null : { id: propertyId },
    title: booking.property_title || `Property #${propertyId}`,
    statusKey: String(booking.status || 'pending').toLowerCase(),
    day: start ? String(start.getDate()).padStart(2, '0') : '—',
    monthKey: start ? null : 'profileBookings_dateBadge',
    month: start
      ? start.toLocaleDateString(locale, { month: 'short' }).replace('.', '').toUpperCase()
      : 'DATE',
    year: start ? String(start.getFullYear()) : '',
    days,
    dateRangeKey:
      start && end
        ? null
        : [booking.start_date, booking.end_date].filter(Boolean).length
          ? null
          : 'profileBookings_dateTbd',
    dateRange:
      start && end
        ? `${start.toLocaleDateString(locale, dateOptions)} — ${end.toLocaleDateString(locale, dateOptions)}`
        : [booking.start_date, booking.end_date].filter(Boolean).join(' — ') || 'Date TBD',
  }
}
