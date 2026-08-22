import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isBuyerOnboardingAllowedPath,
  needsBuyerProfileOnboardingFromProgress,
  PROFILE_ONBOARDING_MIN_COMPLETE_PCT,
} from './buyerProfileOnboardingGate.js'

test('onboarding threshold matches cabinet gate', () => {
  assert.equal(PROFILE_ONBOARDING_MIN_COMPLETE_PCT, 78)
  assert.equal(needsBuyerProfileOnboardingFromProgress(0), true)
  assert.equal(needsBuyerProfileOnboardingFromProgress(77), true)
  assert.equal(needsBuyerProfileOnboardingFromProgress(78), false)
  assert.equal(needsBuyerProfileOnboardingFromProgress(100), false)
  assert.equal(needsBuyerProfileOnboardingFromProgress(Number.NaN), false)
})

test('only buyer cabinet paths are allowed while gate is active', () => {
  assert.equal(isBuyerOnboardingAllowedPath('/profile'), true)
  assert.equal(isBuyerOnboardingAllowedPath('/profile?data=1'), true)
  assert.equal(isBuyerOnboardingAllowedPath('/profile/bookings/1'), true)
  assert.equal(isBuyerOnboardingAllowedPath('/data'), true)
  assert.equal(isBuyerOnboardingAllowedPath('/'), false)
  assert.equal(isBuyerOnboardingAllowedPath('/auction'), false)
  assert.equal(isBuyerOnboardingAllowedPath('/wallet'), false)
  assert.equal(isBuyerOnboardingAllowedPath('/map'), false)
  assert.equal(isBuyerOnboardingAllowedPath('/owner-test'), false)
})
