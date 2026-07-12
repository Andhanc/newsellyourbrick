import { useCallback, useState } from 'react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { getUserData, loginWithEmail, validatePassword } from '../services/authService'
import { fetchUserById, invalidateUserByIdCache } from '../utils/usersApi'
import { getCabinetHomePath, isSellerCabinetRole, readStoredUserRole } from '../utils/cabinetRoutes'
import { OWNER_VIEWS, buildOwnerTestPath } from '../utils/ownerTestNav'
import { createLinkedRole, fetchLinkedRoles } from '../utils/roleSwitchApi'
import { readPendingSellPurchasedProperty } from '../utils/purchasedPropertyListingPrefill'
import { showNotification } from '../utils/toastHelper'

const PROFILE_API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

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
        try {
          if (clerkUser && signOut) {
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
        const targetPath =
          pendingSell?.id && gotSeller
            ? buildOwnerTestPath(OWNER_VIEWS.ADD_PROPERTY)
            : getCabinetHomePath(newRole)

        if (result.user?.id) {
          try {
            invalidateUserByIdCache(PROFILE_API_BASE, result.user.id)
          } catch {
            /* ignore cache errors */
          }
        }

        redirecting = true
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

  const continueFromPitch = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const preview = await loadProfilePreview()
      setProfilePreview(preview)
      setPhase('setup')
    } catch {
      setPhase('setup')
    } finally {
      setLoading(false)
    }
  }, [])

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

      setLoading(true)
      try {
        await createLinkedRole({ userId, targetRole, password })
        const status = await refreshLinkedStatus()
        setPhase('cabinet')
        return true
      } catch (e) {
        if (e.passwordValidation) {
          setPasswordHints(e.passwordValidation)
        }
        setError(e.message || 'Не удалось создать кабинет')
        return false
      } finally {
        setLoading(false)
      }
    },
    [targetRole, refreshLinkedStatus],
  )

  const selectCabinet = useCallback(
    (role) => {
      const normalized = isSellerCabinetRole(role) ? 'seller' : 'buyer'
      const currentNormalized = isCurrentSeller ? 'seller' : 'buyer'

      if (normalized === currentNormalized) {
        closeAll()
        return
      }

      setPendingSwitchRole(normalized)
      setPhase('switch-password')
      setError('')
    },
    [isCurrentSeller, closeAll],
  )

  const submitSwitchPassword = useCallback(
    async (password) => {
      if (!pendingSwitchRole) return false
      return switchToRole(pendingSwitchRole, password)
    },
    [pendingSwitchRole, switchToRole],
  )

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
    closeAll,
    continueFromPitch,
    submitSetup,
    selectCabinet,
    submitSwitchPassword,
    goBackToCabinet,
    openSellCabinetFlow,
    clerkLoaded,
    switching,
  }
}
