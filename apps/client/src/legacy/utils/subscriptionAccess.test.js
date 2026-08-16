import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buyerTierAllows,
  canAccessBuyerFeature,
  requiredPlanLabel,
  subscriptionUnlocksCalculator,
} from './subscriptionAccess.js'

test('starter cannot open Pro/VIP features', () => {
  assert.equal(canAccessBuyerFeature('starter', 'calculator'), false)
  assert.equal(canAccessBuyerFeature('starter', 'documents'), false)
  assert.equal(canAccessBuyerFeature('starter', 'privateClubLots'), false)
  assert.equal(canAccessBuyerFeature('starter', 'auction'), true)
})

test('pro opens calculator, not manager or documents', () => {
  assert.equal(canAccessBuyerFeature('pro', 'calculator'), true)
  assert.equal(canAccessBuyerFeature('pro', 'personalManager'), false)
  assert.equal(canAccessBuyerFeature('pro', 'documents'), false)
  assert.equal(canAccessBuyerFeature('pro', 'privateClubLots'), false)
})

test('vip opens documents, closed lots and manager', () => {
  assert.equal(canAccessBuyerFeature('vip', 'documents'), true)
  assert.equal(canAccessBuyerFeature('vip', 'calculator'), true)
  assert.equal(canAccessBuyerFeature('vip', 'personalManager'), true)
  assert.equal(canAccessBuyerFeature('vip', 'privateClubLots'), true)
  assert.equal(requiredPlanLabel('documents'), 'VIP')
  assert.equal(requiredPlanLabel('personalManager'), 'VIP')
  assert.equal(requiredPlanLabel('calculator'), 'Pro')
})

test('vip club unlocks calculator even without stripe pro', () => {
  assert.equal(subscriptionUnlocksCalculator({ plan_key: 'starter', status: 'active' }, { active: true }), true)
  assert.equal(subscriptionUnlocksCalculator({ plan_key: 'starter', status: 'active' }, { active: false }), false)
  assert.equal(subscriptionUnlocksCalculator({ plan_key: 'pro', status: 'active' }), true)
  assert.equal(subscriptionUnlocksCalculator({ plan_key: 'pro', status: 'canceled' }), false)
})

test('tier comparison', () => {
  assert.equal(buyerTierAllows('vip', 'pro'), true)
  assert.equal(buyerTierAllows('pro', 'vip'), false)
})
