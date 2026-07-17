import test from 'node:test'
import assert from 'node:assert/strict'

let presentation = {}
try {
  presentation = await import('./sharesMarketplacePresentation.js')
} catch {}

const {
  SHARES_MARKETPLACE_PAGE_SIZE,
  normalizeMarketplaceShare = () => {
    throw new Error('normalizeMarketplaceShare is not implemented')
  },
  paginateSharesMarketplace = () => {
    throw new Error('paginateSharesMarketplace is not implemented')
  },
  resolveShareMarketplaceState = () => {
    throw new Error('resolveShareMarketplaceState is not implemented')
  },
  formatForecastYield = () => {
    throw new Error('formatForecastYield is not implemented')
  },
} = presentation

test('normalises only confirmed API values and leaves unknown facts unknown', () => {
  const share = normalizeMarketplaceShare({
    id: 42,
    source_table: 'properties_apartments',
    property_type: 'apartments',
    title: 'Marina View',
    location: 'Marbella, Spain',
    image: '/uploads/marina.jpg',
    price: 240000,
    total_shares: 24,
    shares_sold: 6,
  })

  assert.equal(share.id, 42)
  assert.equal(share.totalPrice, 240000)
  assert.equal(share.totalShares, 24)
  assert.equal(share.sharesSold, 6)
  assert.equal(share.pricePerShare, 10000)
  assert.equal(share.availableShares, 18)
  assert.equal(share.collectedPercent, 25)
  assert.equal(share.annualYield, null)
  assert.equal(share.city, 'Marbella')
  assert.equal(share.country, 'Spain')
})

test('does not manufacture price, inventory, yield, image, or status defaults', () => {
  const share = normalizeMarketplaceShare({ id: 7, title: 'Unknown terms' })

  assert.equal(share.totalPrice, null)
  assert.equal(share.totalShares, null)
  assert.equal(share.sharesSold, null)
  assert.equal(share.pricePerShare, null)
  assert.equal(share.availableShares, null)
  assert.equal(share.collectedPercent, null)
  assert.equal(share.annualYield, null)
  assert.equal(share.image, '')
  assert.equal(share.statusLabel, 'Условия уточняются')
})

test('labels annual return as a forecast and shows an honest unknown value', () => {
  assert.deepEqual(formatForecastYield(12.45, 'ru-RU'), {
    label: 'Прогноз доходности',
    value: '12,5%',
    note: 'Прогноз, не гарантия',
  })
  assert.deepEqual(formatForecastYield(null, 'ru-RU'), {
    label: 'Прогноз доходности',
    value: '—',
    note: 'Прогноз не опубликован',
  })
})

test('paginates the real list into strict groups of sixteen', () => {
  assert.equal(SHARES_MARKETPLACE_PAGE_SIZE, 16)
  const list = Array.from({ length: 35 }, (_, index) => ({ id: index + 1 }))

  assert.deepEqual(paginateSharesMarketplace(list, 1), {
    items: list.slice(0, 16),
    totalPages: 3,
    currentPage: 1,
    totalItems: 35,
  })
  assert.deepEqual(paginateSharesMarketplace(list, 3), {
    items: list.slice(32, 35),
    totalPages: 3,
    currentPage: 3,
    totalItems: 35,
  })
})

test('blocks investment for sold-out and backend-final listings', () => {
  const soldOut = resolveShareMarketplaceState({ totalShares: 20, sharesSold: 20 })
  assert.equal(soldOut.state, 'sold')
  assert.equal(soldOut.label, 'Сбор завершён')
  assert.equal(soldOut.blocksInvestment, true)
  assert.equal(soldOut.ctaLabel, 'Сбор завершён')

  const archived = resolveShareMarketplaceState({ status: 'archived', totalShares: 20, sharesSold: 2 })
  assert.equal(archived.state, 'unavailable')
  assert.equal(archived.blocksInvestment, true)

  const open = resolveShareMarketplaceState({ status: 'active', totalShares: 20, sharesSold: 2 })
  assert.equal(open.state, 'available')
  assert.equal(open.blocksInvestment, false)
  assert.equal(open.ctaLabel, 'Подробнее')
})

test('honours only an active reservation window with a reservation owner', () => {
  const active = resolveShareMarketplaceState({
    status: 'active',
    reserved_by: 17,
    reserved_until: '2026-08-01T12:00:00.000Z',
    totalShares: 20,
    sharesSold: 4,
  }, new Date('2026-07-17T10:00:00.000Z'))

  const expired = resolveShareMarketplaceState({
    status: 'active',
    reserved_by: 17,
    reserved_until: '2026-07-16T12:00:00.000Z',
    totalShares: 20,
    sharesSold: 4,
  }, new Date('2026-07-17T10:00:00.000Z'))

  assert.equal(active.state, 'reserved')
  assert.equal(active.blocksInvestment, true)
  assert.equal(expired.state, 'available')
  assert.equal(expired.blocksInvestment, false)
})
