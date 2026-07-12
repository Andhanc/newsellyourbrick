import test from 'node:test'
import assert from 'node:assert/strict'
import { mapReservationPurchase } from './cabinetPurchaseHistory.js'

const baseRow = {
  id: 91,
  amount_cents: 4_500_000,
  currency: 'eur',
  paid_at: '2026-07-11T10:00:00.000Z',
  property_title: 'Пентхаус с тремя спальнями на продажу в Пальм-Мар',
  property_city: 'Palm-Mar',
  property_country: 'Spain',
  property_image: 'https://example.com/palm-mar.jpg',
  billing: {
    property_id: 39,
    property_type: 'house',
    minimum_sale_price: 450_000,
    total_paid_toward_price: 45_000,
    remaining_to_full_purchase: 405_000,
    policy_version: 'reservation_policy_test_v1',
  },
}

test('maps a reservation purchase into structured real-property finance data', () => {
  const item = mapReservationPurchase(baseRow)

  assert.equal(item.propertyId, 39)
  assert.equal(item.propertyType, 'house')
  assert.equal(item.location, 'Palm-Mar, Spain')
  assert.equal(item.paidAmount, 45_000)
  assert.equal(item.totalAmount, 450_000)
  assert.equal(item.remainingAmount, 405_000)
  assert.equal(item.paymentPercent, 10)
  assert.equal(item.currency, 'EUR')
  assert.equal(item.purchaseChannel, 'buy_now')
})

test('derives safe remaining and clamps percentage for numeric strings', () => {
  const item = mapReservationPurchase({
    ...baseRow,
    amount_cents: '70000000',
    billing: {
      ...baseRow.billing,
      minimum_sale_price: '450000',
      total_paid_toward_price: '700000',
      remaining_to_full_purchase: null,
    },
  })

  assert.equal(item.remainingAmount, 0)
  assert.equal(item.paymentPercent, 100)
})

test('prefers explicit location and rejects non-finite money', () => {
  const item = mapReservationPurchase({
    ...baseRow,
    property_location: 'Palm-Mar, Arona, Tenerife',
    amount_cents: 'not-money',
    billing: {
      ...baseRow.billing,
      total_paid_toward_price: null,
    },
  })

  assert.equal(item.location, 'Palm-Mar, Arona, Tenerife')
  assert.equal(item.paidAmount, 0)
  assert.equal(item.paymentPercent, 0)
})

test('prefers city and country over a raw address when location is absent', () => {
  const item = mapReservationPurchase({
    ...baseRow,
    property_location: null,
    property_address: 'Calle de ejemplo 7',
  })

  assert.equal(item.location, 'Palm-Mar, Spain')
})

test('marks purchased debt property for the separate history category', () => {
  const item = mapReservationPurchase({
    ...baseRow,
    property_sale_type: 'debt',
    property_is_debt: 1,
  })

  assert.equal(item.isDebt, true)
})
