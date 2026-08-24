import { useCallback, useEffect, useState } from 'react'
import { useAuth, useClerk } from '@clerk/clerk-react'

import { getStoredNumericUserId, logout } from '../services/authService'
import {
  getBiometricStatus,
  isBiometricEnabledOnThisDevice,
  isBiometricCancel,
  rememberBiometricEnabled,
  verifyPlatformBiometric,
} from '../services/biometricAuthService'
import BiometricSecurityDrawer from './BiometricSecurityDrawer'

function errorText(error) {
  const code = String(error?.message || '')
  if (code === 'biometric_platform_unavailable') {
    return 'На этом устройстве системная биометрия недоступна.'
  }
  if (code === 'biometric_browser_unsupported') {
    return 'Этот браузер не поддерживает системную биометрию.'
  }
  if (code === 'biometric_login_session_missing') {
    return 'Сессия устарела. Выйдите из профиля и войдите снова.'
  }
  if (code === 'secure_context_required') {
    return 'Для биометрии откройте защищённую HTTPS-версию сайта.'
  }
  if (isBiometricCancel(error)) return ''
  return 'Не удалось подтвердить вход. Попробуйте ещё раз.'
}

export default function BiometricLockGate() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const userId = getStoredNumericUserId()
  const unlockedKey = userId ? `syb.biometricUnlocked:${userId}` : ''

  const authContext = useCallback(async () => ({
    clerkToken: isSignedIn ? await getToken() : '',
    role: localStorage.getItem('userRole') || 'buyer',
  }), [getToken, isSignedIn])

  useEffect(() => {
    if (!isLoaded || !userId) return undefined
    if (localStorage.getItem('isLoggedIn') !== 'true') return undefined
    if (unlockedKey && sessionStorage.getItem(unlockedKey) === '1') return undefined

    let cancelled = false
    const knownProtected = isBiometricEnabledOnThisDevice(userId)
    const timer = window.setTimeout(async () => {
      try {
        const status = await getBiometricStatus(await authContext())
        if (cancelled) return
        rememberBiometricEnabled(userId, status.enabled)
        if (status.enabled) setOpen(true)
      } catch (nextError) {
        // Once this device is protected, an outage or expired token must not bypass the lock.
        if (!cancelled && knownProtected) {
          setError(errorText(nextError))
          setOpen(true)
        }
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [authContext, isLoaded, unlockedKey, userId])

  const handleUnlock = async () => {
    setBusy(true)
    setError('')
    try {
      await verifyPlatformBiometric(await authContext())
      if (unlockedKey) sessionStorage.setItem(unlockedKey, '1')
      setOpen(false)
    } catch (nextError) {
      setError(errorText(nextError))
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
