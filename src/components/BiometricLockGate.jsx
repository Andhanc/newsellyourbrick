import { useCallback, useEffect, useState } from 'react'
import { useAuth, useClerk } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'

import {
  CLERK_DB_USER_SYNCED,
  getStoredNumericUserId,
  logout,
} from '../services/authService'
import {
  getBiometricStatus,
  isBiometricEnabledOnThisDevice,
  isBiometricCancel,
  rememberBiometricEnabled,
  verifyPlatformBiometric,
} from '../services/biometricAuthService'
import { getBiometricErrorMessage } from '../utils/biometricMessages'
import BiometricSecurityDrawer from './BiometricSecurityDrawer'

function isLoggedInLocally() {
  try {
    return localStorage.getItem('isLoggedIn') === 'true'
  } catch {
    return false
  }
}

function biometricUnlockedKey(userId) {
  return userId ? `syb.biometricUnlocked:${userId}` : ''
}

function isBiometricUnlocked(userId) {
  const key = biometricUnlockedKey(userId)
  if (!key) return false
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function shouldLockImmediately(userId) {
  return Boolean(
    userId &&
      isLoggedInLocally() &&
      isBiometricEnabledOnThisDevice(userId) &&
      !isBiometricUnlocked(userId),
  )
}

export default function BiometricLockGate() {
  const { t } = useTranslation()
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { signOut } = useClerk()
  const [userId, setUserId] = useState(() => getStoredNumericUserId())
  const [open, setOpen] = useState(() => shouldLockImmediately(getStoredNumericUserId()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const unlockedKey = biometricUnlockedKey(userId)

  const authContext = useCallback(async () => ({
    clerkToken: isSignedIn ? await getToken() : '',
    role: localStorage.getItem('userRole') || 'buyer',
  }), [getToken, isSignedIn])

  useEffect(() => {
    const refreshUser = (event) => {
      const eventUserId = Number(event?.detail?.userId)
      const nextUserId = Number.isInteger(eventUserId) && eventUserId > 0
        ? eventUserId
        : getStoredNumericUserId()
      setUserId(nextUserId || null)
      if (shouldLockImmediately(nextUserId)) setOpen(true)
    }

    window.addEventListener(CLERK_DB_USER_SYNCED, refreshUser)
    window.addEventListener('storage', refreshUser)
    window.addEventListener('focus', refreshUser)
    refreshUser()
    return () => {
      window.removeEventListener(CLERK_DB_USER_SYNCED, refreshUser)
      window.removeEventListener('storage', refreshUser)
      window.removeEventListener('focus', refreshUser)
    }
  }, [])

  useEffect(() => {
    if (!userId || !isLoggedInLocally()) {
      if (isLoaded && !isSignedIn) setOpen(false)
      return undefined
    }
    if (isBiometricUnlocked(userId)) {
      setOpen(false)
      return undefined
    }

    let cancelled = false
    const knownProtected = isBiometricEnabledOnThisDevice(userId)
    // Fail closed immediately from the device-local flag. The server check below
    // confirms the state in the background instead of delaying the global lock.
    if (knownProtected) setOpen(true)
    if (!isLoaded) return undefined

    ;(async () => {
      try {
        const status = await getBiometricStatus(await authContext())
        if (cancelled) return
        rememberBiometricEnabled(userId, status.enabled)
        setOpen(Boolean(status.enabled))
      } catch (nextError) {
        // Once this device is protected, an outage or expired token must not bypass the lock.
        if (!cancelled && knownProtected) {
          setError(getBiometricErrorMessage(t, nextError, 'lock'))
          setOpen(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authContext, isLoaded, isSignedIn, t, unlockedKey, userId])

  const handleUnlock = async () => {
    setBusy(true)
    setError('')
    try {
      await verifyPlatformBiometric(await authContext())
      if (unlockedKey) sessionStorage.setItem(unlockedKey, '1')
      setOpen(false)
    } catch (nextError) {
      setError(getBiometricErrorMessage(t, nextError, 'lock'))
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async () => {
    setBusy(true)
    try {
      await logout()
      if (isSignedIn) await signOut()
      window.location.assign('/')
    } finally {
      setBusy(false)
    }
  }

  return (
    <BiometricSecurityDrawer
      open={open}
      mode="lock"
      busy={busy}
      error={error}
      onPrimary={handleUnlock}
      onSecondary={handleLogout}
    />
  )
}
