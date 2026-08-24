import {
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'

import { getApiBaseUrlSync } from '../utils/apiConfig'
import {
  getMobileAuthToken,
  getStoredNumericUserId,
  rememberMobileAuthToken,
} from './authService'

const API_BASE_URL = getApiBaseUrlSync()

export function biometricEnabledStorageKey(userId) {
  return userId ? `syb.biometricEnabled:${userId}` : ''
}

export function rememberBiometricEnabled(userId, enabled) {
  const key = biometricEnabledStorageKey(userId)
  if (!key) return
  try {
    if (enabled) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    /* localStorage can be unavailable in embedded/privacy contexts */
  }
}

export function isBiometricEnabledOnThisDevice(userId) {
  const key = biometricEnabledStorageKey(userId)
  if (!key) return false
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

async function readJson(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body?.success === false) {
    const error = new Error(body?.error || `biometric_http_${response.status}`)
    error.status = response.status
    throw error
  }
  return body
}

export async function isPlatformBiometricAvailable() {
  if (typeof window === 'undefined' || !window.isSecureContext) return false
  if (typeof window.PublicKeyCredential === 'undefined') return false
  try {
    return await platformAuthenticatorIsAvailable()
  } catch {
    return false
  }
}

async function assertPlatformBiometricAvailable() {
  if (typeof window === 'undefined' || !window.isSecureContext) {
    throw new Error('secure_context_required')
  }
  if (typeof window.PublicKeyCredential === 'undefined') {
    throw new Error('biometric_browser_unsupported')
  }
  if (!(await isPlatformBiometricAvailable())) {
    throw new Error('biometric_platform_unavailable')
  }
}

export async function ensureBiometricAuthToken({ clerkToken, role = 'buyer' } = {}) {
  const existing = getMobileAuthToken()
  if (existing) return existing
  if (!clerkToken) throw new Error('biometric_login_session_missing')

  const response = await fetch(`${API_BASE_URL}/auth/clerk/mobile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clerkToken}`,
    },
    body: JSON.stringify({
      role,
      mode: 'login',
      userId: getStoredNumericUserId(),
    }),
  })
  const body = await readJson(response)
  if (!body.authToken) throw new Error('biometric_login_session_missing')
  rememberMobileAuthToken(body.authToken)
  return body.authToken
}

async function biometricFetch(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE_URL}/biometric/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (response.status === 401) {
    rememberMobileAuthToken(null)
    throw new Error('biometric_login_session_missing')
  }
  return readJson(response)
}

export async function getBiometricStatus(auth) {
  const token = await ensureBiometricAuthToken(auth)
  return biometricFetch('status', { token })
}

export async function registerPlatformBiometric(auth) {
  await assertPlatformBiometricAvailable()
  const token = await ensureBiometricAuthToken(auth)
  const ceremony = await biometricFetch('register/options', { token, method: 'POST' })
  const response = await startRegistration({ optionsJSON: ceremony.options })
  return biometricFetch('register/verify', {
    token,
    method: 'POST',
    body: { response },
  })
}

export async function verifyPlatformBiometric(auth) {
  await assertPlatformBiometricAvailable()
  const token = await ensureBiometricAuthToken(auth)
  const ceremony = await biometricFetch('authentication/options', { token, method: 'POST' })
  const response = await startAuthentication({ optionsJSON: ceremony.options })
  return biometricFetch('authentication/verify', {
    token,
    method: 'POST',
    body: { response },
  })
}

export function isBiometricCancel(error) {
  return error?.name === 'NotAllowedError' || /cancel|not.?allowed/i.test(String(error?.message || ''))
}
