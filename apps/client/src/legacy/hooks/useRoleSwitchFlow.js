import { useCallback, useState } from 'react'
import { useClerk, useUser, useSignIn } from '@clerk/clerk-react'
import { getUserData, loginWithEmail, saveUserData, validatePassword } from '../services/authService'
import { fetchUserById, invalidateUserByIdCache } from '../utils/usersApi'
import { getCabinetHomePath, isSellerCabinetRole, readStoredUserRole } from '../utils/cabinetRoutes'
import { createLinkedRole, fetchLinkedRoles, setLinkedRolePassword } from '../utils/roleSwitchApi'
import {
  promotePendingPurchasedPropertyToSellerArrival,
  readPendingSellPurchasedProperty,
} from '../utils/purchasedPropertyListingPrefill'
import { showNotification } from '../utils/toastHelper'
import {
  hasNativeSessionSwitch,
  switchNativeSession,
} from '../utils/nativeDomBridge'

const PROFILE_API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api'

function getStoredUserId() {
  const raw = localStorage.getItem('userId') || getUserData()?.id
  const n = parseInt(String(raw), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function buildProfilePreview() {
  const user = getUserData()
  const name = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || ''
  return {
    name: name.trim() || '—',
    email: user?.email || localStorage.getItem('userEmail') || '—',
    phone: user?.phone || user?.phone_number || '—',
    country: user?.country || '—',
  }
}

async function loadProfilePreview() {
  const base = buildProfilePreview()
  const userId = getStoredUserId()
  if (!userId) return base

  try {
    const dbUser = await fetchUserById(PROFILE_API_BASE, userId)
    if (!dbUser) return base
    const name = [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ')
    return {
      name: name.trim() || base.name,
      email: dbUser.email || base.email,
      phone: dbUser.phone_number || base.phone,
      country: dbUser.country || base.country,
    }
  } catch {
    return base
  }
}

/**
 * @param {'buyer' | 'seller'} targetRole — кабинет, который открываем или создаём
 */
export function useRoleSwitchFlow(targetRole) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const { signOut } = useClerk()
  const { signIn, isLoaded: signInLoaded } = useSignIn()

  const [phase, setPhase] = useState(null)
  const [linkedStatus, setLinkedStatus] = useState(null)
  const [profilePreview, setProfilePreview] = useState(buildProfilePreview)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordHints, setPasswordHints] = useState(null)
  const [pendingSwitchRole, setPendingSwitchRole] = useState(null)
  const [switching, setSwitching] = useState(false)

  const currentRole = readStoredUserRole()
  const isCurrentSeller = isSellerCabinetRole(currentRole)

  const closeAll = useCallback(() => {
    setPhase(null)
    setError('')
    setPasswordHints(null)
    setPendingSwitchRole(null)
    setLoading(false)
  }, [])

  const refreshLinkedStatus = useCallback(async () => {
    const userId = getStoredUserId()
    if (!userId) return null
    const status = await fetchLinkedRoles({ userId })
    setLinkedStatus(status)
    return status
  }, [])

  const switchToRole = useCallback(
    async (role, password) => {
      const email = getUserData()?.email || linkedStatus?.email
      if (!email) {
        setError('Email не найден в профиле')
        return false
      }

      setLoading(true)
      setSwitching(true)
      setError('')
      let redirecting = false
      try {
        sessionStorage.setItem('clerk_logout_in_progress', 'true')
        sessionStorage.setItem('role_switch_in_progress', '1')
        const usesNativeSessionBridge = hasNativeSessionSwitch()
        try {
          if (!usesNativeSessionBridge && clerkUser && signOut) {
            await signOut()
          }
        } catch (e) {
          console.warn('role switch Clerk signOut:', e)
        }

        const result = await loginWithEmail(email, password, role)
        if (!result.success) {
          sessionStorage.removeItem('role_switch_in_progress')
          setError(result.error || 'Неверный пароль')
          return false
        }

        const newRole = result.user?.role || role
        const wantedSeller = role === 'seller'
        const gotSeller =
          newRole === 'seller' || newRole === 'owner'
        if (wantedSeller !== gotSeller) {
          sessionStorage.removeItem('role_switch_in_progress')
          setError('Неверный пароль для выбранного кабинета')
          return false
        }

        const pendingSell = readPendingSellPurchasedProperty()
        if (pendingSell?.id && gotSeller) {
          promotePendingPurchasedPropertyToSellerArrival({ sellerUserId: result.user?.id })
        }

        const targetPath = getCabinetHomePath(newRole)

        if (result.user?.id) {
          try {
            invalidateUserByIdCache(PROFILE_API_BASE, result.user.id)
          } catch {
            /* ignore cache errors */
          }
        }

        redirecting = true
        if (usesNativeSessionBridge) {
          const switched = await switchNativeSession({
            user: result.user,
            authToken: result.authToken || null,
            path: targetPath,
          })
          if (!switched?.success) {
            throw new Error(switched?.error || 'Не удалось переключить кабинет в приложении')
          }
          return true
        }
        window.location.assign(targetPath)
        return true
      } catch (e) {
        sessionStorage.removeItem('role_switch_in_progress')
        setError(e.message || 'Ошибка переключения кабинета')
        return false
      } finally {
        sessionStorage.removeItem('clerk_logout_in_progress')
        if (!redirecting) {
          setSwitching(false)
          setLoading(false)
        }
      }
    },
    [clerkUser, signOut, linkedStatus],
  )

  const openFlow = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const userId = getStoredUserId()
      if (!userId) {
        showNotification('Войдите в аккаунт, чтобы переключить кабинет', 'error')
        return
      }

      const preview = await loadProfilePreview()
      setProfilePreview(preview)
      if (!preview.email || preview.email === '—') {
        showNotification('Добавьте email в профиле, чтобы создать связанный кабинет', 'error')
        return
      }

      const status = await fetchLinkedRoles({ userId })
      setLinkedStatus(status)

      const targetExists =
        targetRole === 'buyer' ? Boolean(status.buyer) : Boolean(status.seller)

      if (status.hasBoth || targetExists) {
        setPhase('cabinet')
        return
      }

      setPhase('pitch')
    } catch (e) {
      showNotification(e.message || 'Не удалось открыть переключение кабинета', 'error')
    } finally {
      setLoading(false)
    }
  }, [targetRole])

  const openCabinetPicker = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const userId = getStoredUserId()
      if (!userId) {
        showNotification('Войдите в аккаунт, чтобы переключить кабинет', 'error')
        return
      }

      const preview = await loadProfilePreview()
      setProfilePreview(preview)
      if (!preview.email || preview.email === '—') {
        showNotification('Добавьте email в профиле, чтобы создать связанный кабинет', 'error')
        return
      }

      const status = await fetchLinkedRoles({ userId })
      setLinkedStatus(status)
      setPhase('cabinet')
    } catch (e) {
      showNotification(e.message || 'Не удалось открыть переключение кабинета', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  const continueFromPitch = useCallback(async () => {
    setError('')
    setPasswordHints(null)
    setLoading(true)
    try {
      const preview = await loadProfilePreview()
      setProfilePreview(preview)
      const status = await refreshLinkedStatus()
      const buyerNeedsPassword =
        targetRole === 'seller' &&
        Boolean(status?.buyer) &&
        status.buyer.hasPassword === false
      setPhase(buyerNeedsPassword ? 'buyer-password' : 'setup')
    } catch {
      setPhase('setup')
    } finally {
      setLoading(false)
    }
  }, [targetRole, refreshLinkedStatus])

  const submitBuyerPassword = useCallback(
    async (password) => {
      setError('')
      setPasswordHints(null)

      const validation = validatePassword(password)
      if (!validation.valid) {
        setError(validation.message)
        setPasswordHints(validation)
        return false
      }

      const userId = getStoredUserId()
      if (!userId) {
        setError('Пользователь не авторизован')
        return false
      }

      setLoading(true)
      try {
        await setLinkedRolePassword({ userId, password })
        await refreshLinkedStatus()
        const current = getUserData()
        if (current) {
          saveUserData({ ...current, hasPassword: true })
        }
        setPhase('setup')
        setError('')
        setPasswordHints(null)
        return true
      } catch (e) {
        if (e.passwordValidation) {
          setPasswordHints(e.passwordValidation)
        }
        setError(e.message || 'Не удалось сохранить пароль покупателя')
        return false
      } finally {
        setLoading(false)
      }
    },
    [refreshLinkedStatus],
  )

  const submitSetup = useCallback(
    async (password) => {
      setError('')
      setPasswordHints(null)

      const validation = validatePassword(password)
      if (!validation.valid) {
        setError(validation.message)
        setPasswordHints(validation)
        return false
      }

      const userId = getStoredUserId()
      if (!userId) {
        setError('Пользователь не авторизован')
        return false
      }

      if (targetRole === 'seller') {
        const status = linkedStatus || (await refreshLinkedStatus())
        if (status?.buyer && status.buyer.hasPassword === false) {
          setPhase('buyer-password')
          setError('Сначала задайте пароль для кабинета покупателя')
          return false
        }
      }

      setLoading(true)
      try {
        await createLinkedRole({ userId, targetRole, password })
        await refreshLinkedStatus()
        return await switchToRole(targetRole, password)
      } catch (e) {
        if (e.status === 'buyer_password_required') {
          setPhase('buyer-password')
        }
        if (e.passwordValidation) {
          setPasswordHints(e.passwordValidation)
        }
        setError(e.message || 'Не удалось создать кабинет')
        return false
      } finally {
        setLoading(false)
      }
    },
    [targetRole, linkedStatus, refreshLinkedStatus, switchToRole],
  )

  const selectCabinet = useCallback(
    (role) => {
      const normalized = isSellerCabinetRole(role) ? 'seller' : 'buyer'
      const currentNormalized = isCurrentSeller ? 'seller' : 'buyer'

      if (normalized === currentNormalized) {
        closeAll()
        return
      }

      const targetExists =
        normalized === 'seller' ? Boolean(linkedStatus?.seller) : Boolean(linkedStatus?.buyer)
      if (!targetExists && normalized === targetRole) {
        setPhase('pitch')
        setError('')
        return
      }

      setPendingSwitchRole(normalized)
      setPhase('switch-password')
      setError('')
    },
    [isCurrentSeller, closeAll, linkedStatus, targetRole],
  )

  const submitSwitchPassword = useCallback(
    async (password) => {
      if (!pendingSwitchRole) return false
      return switchToRole(pendingSwitchRole, password)
    },
    [pendingSwitchRole, switchToRole],
  )

  const switchToBuyerViaGoogle = useCallback(async () => {
    if (!signInLoaded || !signIn) {
      setError('Система авторизации не готова. Обновите страницу.')
      return false
    }

    setLoading(true)
    setSwitching(true)
    setError('')
    try {
      sessionStorage.setItem('role_switch_in_progress', '1')
      sessionStorage.setItem('clerk_oauth_redirect_started', 'true')
      sessionStorage.setItem('clerk_oauth_user_role', 'buyer')
      sessionStorage.setItem('clerk_oauth_flow_mode', 'login')

      const { getClerkOAuthReturnUrl } = await import('../utils/clerkOAuth')
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: getClerkOAuthReturnUrl(),
      })
      return true
    } catch (e) {
      sessionStorage.removeItem('role_switch_in_progress')
      setError(e.message || 'Не удалось войти через Google')
      setSwitching(false)
      setLoading(false)
      return false
    }
  }, [signIn, signInLoaded])

  const goBackToCabinet = useCallback(() => {
    setPhase('cabinet')
    setPendingSwitchRole(null)
    setError('')
  }, [])

  /** Открыть флоу продажи купленного объекта: переключение или создание кабинета продавца. */
  const openSellCabinetFlow = useCallback(
    async (mode = 'register') => {
      setError('')
      setLoading(true)
      try {
        const userId = getStoredUserId()
        if (!userId) {
          showNotification('Войдите в аккаунт, чтобы продать объект', 'error')
          return
        }

        const preview = await loadProfilePreview()
        setProfilePreview(preview)
        if (!preview.email || preview.email === '—') {
          showNotification('Добавьте email в профиле, чтобы создать кабинет продавца', 'error')
          return
        }

        const status = await fetchLinkedRoles({ userId })
        setLinkedStatus(status)

        if (mode === 'switch' && status.seller) {
          setPendingSwitchRole('seller')
          setPhase('switch-password')
          return
        }

        if (status.seller) {
          setPendingSwitchRole('seller')
          setPhase('switch-password')
          return
        }

        setPhase('pitch')
      } catch (e) {
        showNotification(e.message || 'Не удалось открыть кабинет продавца', 'error')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    phase,
    linkedStatus,
    profilePreview,
    loading,
    error,
    passwordHints,
    pendingSwitchRole,
    currentRole,
    isCurrentSeller,
    targetRole,
    openFlow,
    openCabinetPicker,
    closeAll,
    continueFromPitch,
    submitBuyerPassword,
    submitSetup,
    selectCabinet,
    submitSwitchPassword,
    switchToBuyerViaGoogle,
    goBackToCabinet,
    openSellCabinetFlow,
    clerkLoaded,
    switching,
  }
}
