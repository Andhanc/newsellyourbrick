import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBookingTicket,
  buildProfileHistoryDashboard,
} from './profileCabinetPresentation.js'

test('history dashboard always exposes the four mobile categories in product order', () => {
  const dashboard = buildProfileHistoryDashboard([
    {
      key: 'auction',
      items: [
        { id: 'home', amountValue: 210000, currency: 'EUR' },
        { id: 'debt', amountValue: 85000, currency: 'EUR', isDebt: true },
      ],
    },
    { key: 'reserve', items: [{ id: 'reserve', amountValue: 24000, currency: 'EUR' }] },
    { key: 'shares', items: [{ id: 'share', amountValue: 12000, currency: 'EUR' }] },
    { key: 'bids', items: [{ id: 'bid' }] },
  ])

  assert.deepEqual(dashboard.categories.map((section) => section.key), [
    'bids',
    'properties',
    'shares',
    'debts',
  ])
  assert.deepEqual(dashboard.categories[1].items.map((item) => item.id), ['home', 'reserve'])
  assert.deepEqual(dashboard.categories[3].items.map((item) => item.id), ['debt'])
  assert.equal(dashboard.analytics.operations, 5)
  assert.equal(dashboard.analytics.activeBids, 1)
  assert.equal(dashboard.analytics.purchases, 4)
  assert.equal(dashboard.analytics.investedByCurrency.EUR, 331000)
})

test('booking ticket formats a compact date badge and inclusive duration', () => {
  const ticket = buildBookingTicket(
    {
      id: 17,
      start_date: '2026-08-14',
      end_date: '2026-08-20',
      status: 'approved',
      property_title: 'Villa Mar',
    },
    'ru-RU',
  )

  assert.equal(ticket.day, '14')
  assert.match(ticket.month, /авг/i)
  assert.equal(ticket.days, 7)
  assert.equal(ticket.statusKey, 'approved')
  assert.equal(ticket.title, 'Villa Mar')
})

test('booking ticket stays usable when dates are missing', () => {
  const ticket = buildBookingTicket({ id: 18, property_id: 44 }, 'ru-RU')

  assert.equal(ticket.day, '—')
  assert.equal(ticket.month, 'ДАТА')
  assert.equal(ticket.days, 0)
  assert.equal(ticket.title, 'Объект #44')
})
