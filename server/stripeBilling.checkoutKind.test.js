import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findStripeProductByName,
  pickStripeRecurringPriceId,
  resolveCheckoutSessionKind,
} from './stripeBilling.js'

test('buyer Pro checkout is not treated as the owner Pro plan', () => {
  assert.equal(resolveCheckoutSessionKind('pro'), 'buyer')
  assert.equal(resolveCheckoutSessionKind('vip'), 'buyer')
  assert.equal(resolveCheckoutSessionKind('PRO'), 'buyer')
})

test('owner checkout keeps Pro when it opts in via purpose or return path', () => {
  assert.equal(
    resolveCheckoutSessionKind('pro', { checkoutPurpose: 'owner_subscription' }),
    'owner',
  )
  assert.equal(
    resolveCheckoutSessionKind('pro', { returnPath: '/owner-test/subscriptions' }),
    'owner',
  )
  assert.equal(resolveCheckoutSessionKind('standard'), 'owner')
  assert.equal(resolveCheckoutSessionKind('institutional'), 'owner')
})

test('deposit and unknown plans stay distinct', () => {
  assert.equal(resolveCheckoutSessionKind('deposit'), 'deposit')
  assert.equal(resolveCheckoutSessionKind('starter'), 'unknown')
})

test('VIP product is found by Stripe catalog name', () => {
  const vip = findStripeProductByName(
    [{ id: 'prod_pro', name: 'Pro' }, { id: 'prod_vip', name: 'VIP' }],
    'vip',
  )
  assert.equal(vip?.id, 'prod_vip')
  assert.equal(findStripeProductByName([{ id: 'prod_pro', name: 'Pro' }], 'VIP'), null)
})

test('monthly EUR VIP price is preferred over other intervals', () => {
  const id = pickStripeRecurringPriceId(
    [
      { id: 'price_year', currency: 'eur', recurring: { interval: 'year' } },
      { id: 'price_month', currency: 'eur', recurring: { interval: 'month' } },
    ],
    { interval: 'month', currency: 'eur' },
  )
  assert.equal(id, 'price_month')
})
