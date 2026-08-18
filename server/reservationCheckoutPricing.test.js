import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeBuyNowSalePriceMajor,
  computeMinimumSalePriceMajor,
  computeReservationSalePriceMajor,
} from './reservationCheckoutPricing.js'

const listing = {
  price: 123333,
  minimum_sale_price: 12345,
}

test('buy-now reserve uses the buy-now price, not the auction floor', () => {
  assert.equal(computeBuyNowSalePriceMajor(listing), 123333)
  assert.equal(computeReservationSalePriceMajor(listing, 'buyNow'), 123333)
  assert.equal(Math.round(computeReservationSalePriceMajor(listing, 'buyNow') * 0.1 * 100) / 100, 12333.3)
})

test('minimum sale helper still prefers the auction floor', () => {
  assert.equal(computeMinimumSalePriceMajor(listing), 12345)
})

test('buy-now falls back to minimum sale when price is missing', () => {
  assert.equal(computeBuyNowSalePriceMajor({ minimum_sale_price: 50000 }), 50000)
  assert.equal(computeReservationSalePriceMajor({ minimum_sale_price: 50000 }, 'buyNow'), 50000)
})
