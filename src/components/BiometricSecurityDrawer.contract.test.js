import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const drawer = readFileSync(new URL('./BiometricSecurityDrawer.jsx', import.meta.url), 'utf8')
const gate = readFileSync(new URL('./BiometricLockGate.jsx', import.meta.url), 'utf8')
const buyerProfile = readFileSync(new URL('../pages/TestPage.jsx', import.meta.url), 'utf8')

test('drawer uses the supplied fingerprint asset and explains local biometric privacy', () => {
  assert.match(drawer, /biometric-fingerprint-v1\.png/)
  assert.match(drawer, /biometric_privacy/)
  assert.match(drawer, /aria-modal="true"/)
  assert.match(drawer, /biometric_add/)
  assert.match(drawer, /biometric_later/)
})

test('enabled biometric protection blocks the mobile session until verification', () => {
  assert.match(gate, /status\.enabled/)
  assert.match(gate, /isBiometricEnabledOnThisDevice/)
  assert.match(gate, /knownProtected/)
  assert.match(gate, /shouldLockImmediately/)
  assert.match(gate, /CLERK_DB_USER_SYNCED/)
  assert.doesNotMatch(gate, /setTimeout/)
  assert.match(gate, /verifyPlatformBiometric/)
  assert.match(gate, /syb\.biometricUnlocked:/)
  assert.match(gate, /mode="lock"/)
  assert.match(gate, /getBiometricErrorMessage/)
  assert.match(gate, /useTranslation/)
})

test('locked drawer makes the app underneath non-interactive', () => {
  assert.match(drawer, /setAttribute\('inert'/)
  assert.match(drawer, /setAttribute\('aria-hidden', 'true'\)/)
  assert.match(drawer, /autoFocus=\{locked\}/)
})

test('buyer logout clears the local biometric session before Clerk redirects', () => {
  const handler = buyerProfile.slice(
    buyerProfile.indexOf('const handleQuickLogout'),
    buyerProfile.indexOf('const handleBecomeSellerRegister'),
  )
  assert.ok(handler.indexOf('await logout()') < handler.indexOf('await signOut('))
})

test('buyer biometric offer uses localized success and error copy', () => {
  assert.match(buyerProfile, /biometric_enabledSuccess/)
  assert.match(buyerProfile, /getBiometricErrorMessage\(t, error, 'offer'\)/)
})
