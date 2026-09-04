import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isDepositVerificationAllowedPath,
  needsDepositVerificationFromStatus,
  shouldActivateDepositVerificationGate,
} from './depositVerificationGate.js'

test('needsDepositVerificationFromStatus respects API flag and fallbacks', () => {
  assert.equal(needsDepositVerificationFromStatus(null), false)
  assert.equal(
    needsDepositVerificationFromStatus({
      needsDepositVerification: true,
      isVerified: false,
    }),
    true,
  )
  assert.equal(
    needsDepositVerificationFromStatus({
      needsDepositVerification: true,
      isVerified: true,
    }),
    false,
  )
  assert.equal(
    needsDepositVerificationFromStatus({
      needsReverificationAfterRejection: true,
      needsDepositVerification: true,
    }),
    false,
  )
  assert.equal(
    needsDepositVerificationFromStatus({
      hasDocuments: true,
      needsDepositVerification: true,
    }),
    false,
  )
  assert.equal(
    needsDepositVerificationFromStatus({
      depositAmount: 500,
      isVerified: false,
      hasDocuments: false,
    }),
    true,
  )
})

test('shouldActivateDepositVerificationGate uses API when available', () => {
  assert.equal(
    shouldActivateDepositVerificationGate(
      { needsDepositVerification: true, isVerified: false },
      53,
    ),
    true,
  )
  assert.equal(
    shouldActivateDepositVerificationGate(
      { needsDepositVerification: false, isVerified: true },
      53,
    ),
    false,
  )
  assert.equal(shouldActivateDepositVerificationGate(null, null), false)
})

test('isDepositVerificationAllowedPath keeps wallet and oauth routes', () => {
  assert.equal(isDepositVerificationAllowedPath('/wallet'), true)
  assert.equal(isDepositVerificationAllowedPath('/deposit'), true)
  assert.equal(isDepositVerificationAllowedPath('/oauth-bridge'), true)
  assert.equal(isDepositVerificationAllowedPath('/auction'), false)
  assert.equal(isDepositVerificationAllowedPath('/profile'), false)
})
