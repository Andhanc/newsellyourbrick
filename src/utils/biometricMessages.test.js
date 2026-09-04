import test from 'node:test'
import assert from 'node:assert/strict'
import { getBiometricErrorMessage } from './biometricMessages.js'

const t = (key) => `i18n:${key}`

test('maps lock biometric error codes to i18n keys', () => {
  assert.equal(
    getBiometricErrorMessage(t, { message: 'biometric_platform_unavailable' }, 'lock'),
    'i18n:biometric_errPlatformUnavailable',
  )
  assert.equal(
    getBiometricErrorMessage(t, { message: 'biometric_browser_unsupported' }, 'lock'),
    'i18n:biometric_errBrowserUnsupported',
  )
  assert.equal(
    getBiometricErrorMessage(t, { message: 'biometric_login_session_missing' }, 'lock'),
    'i18n:biometric_errSessionMissing',
  )
  assert.equal(
    getBiometricErrorMessage(t, { message: 'secure_context_required' }, 'lock'),
    'i18n:biometric_errSecureContext',
  )
  assert.equal(getBiometricErrorMessage(t, { message: 'other' }, 'lock'), 'i18n:biometric_errVerifyFailed')
})

test('maps offer biometric error codes to i18n keys', () => {
  assert.equal(
    getBiometricErrorMessage(t, { message: 'biometric_platform_unavailable' }, 'offer'),
    'i18n:biometric_errOfferPlatform',
  )
  assert.equal(
    getBiometricErrorMessage(t, { message: 'biometric_login_session_missing' }, 'offer'),
    'i18n:biometric_errOfferSessionMissing',
  )
  assert.equal(
    getBiometricErrorMessage(t, { message: 'secure_context_required' }, 'offer'),
    'i18n:biometric_errOfferSecureContext',
  )
  assert.equal(getBiometricErrorMessage(t, null, 'offer'), 'i18n:biometric_errOfferFailed')
})
