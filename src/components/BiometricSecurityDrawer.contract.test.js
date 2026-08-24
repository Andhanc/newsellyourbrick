import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const drawer = readFileSync(new URL('./BiometricSecurityDrawer.jsx', import.meta.url), 'utf8')
const gate = readFileSync(new URL('./BiometricLockGate.jsx', import.meta.url), 'utf8')

test('drawer uses the supplied fingerprint asset and explains local biometric privacy', () => {
  assert.match(drawer, /biometric-fingerprint-v1\.png/)
  assert.match(drawer, /Отпечаток остаётся на устройстве/)
  assert.match(drawer, /aria-modal="true"/)
  assert.match(drawer, /Добавить/)
  assert.match(drawer, /Позже/)
})

test('enabled biometric protection blocks the mobile session until verification', () => {
  assert.match(gate, /status\.enabled/)
  assert.match(gate, /isBiometricEnabledOnThisDevice/)
  assert.match(gate, /knownProtected/)
  assert.match(gate, /verifyPlatformBiometric/)
  assert.match(gate, /syb\.biometricUnlocked:/)
  assert.match(gate, /mode="lock"/)
})
