import { useCallback, useRef, useState } from 'react'
import { useUser, useSignIn } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import {
  getUserData, getMobileAuthToken, loginWithEmail, rememberMobileAuthToken, saveUserData, validatePassword,
} from '../services/authService'
import { fetchUserById, invalidateUserByIdCache } from '../utils/usersApi'
import { isSellerCabinetRole, readStoredUserRole } from '../utils/cabinetRoutes'
import { createLinkedRole, fetchLinkedRoles, setLinkedRolePassword } from '../utils/roleSwitchApi'
import {
  promotePendingPurchasedPropertyToSellerArrival,
  readPendingSellPurchasedProperty,
} from '../utils/purchasedPropertyListingPrefill'
import { showNotification } from '../utils/toastHelper'
import { markCabinetEntry } from '../utils/cabinetEntryPreloader'
import { formatPasswordValidationMessage } from '../utils/passwordValidationMessage'
import { clearRoleSwitchArrival, readRoleSwitchArrival, storeRoleSwitchArrival } from '../utils/roleSwitchArrival'

import {
  beginRoleSwitchTransition, captureCabinetSession, clearCabinetSessionFields,
  clearRoleSwitchTransition, commitRoleSwitchTransition, readRoleSwitchTransition,
  restoreCabinetSession, roleSwitchSessionMatches, ROLE_SWITCH_TIMEOUT_MS,
} from '../utils/roleSwitchTransition'

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
  const { t } = useTranslation()
  const { isLoaded: clerkLoaded } = useUser()
  const switchingRef = useRef(false)
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
      if (switchingRef.current || readRoleSwitchTransition()) return false
      const sourceUser = getUserData()
      const email = sourceUser?.email || linkedStatus?.email
      if (!email) {
        setError(t('roleSwitch_emailNotFoundInProfile'))
        return false
      }

      switchingRef.current = true
      setLoading(true)
      setSwitching(true)
      setError('')
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), ROLE_SWITCH_TIMEOUT_MS)
      let transition = null
      let snapshot = null
      let sessionWritten = false
      let redirecting = false
      try {
        transition = beginRoleSwitchTransition({ role, sourceUserId: sourceUser.id, label: t('roleSwitch_switchingProfile') })
        clearRoleSwitchArrival()
        // Keep both the current cabinet and Clerk identity intact until the new session is verified.
        // Clerk signOut() navigates to afterSignOutUrl and must never be used for a role switch.
        const result = await loginWithEmail(email, password, role, { persist: false, signal: controller.signal })
        if (controller.signal.aborted) throw new Error('roleSwitch_switchTimeout')
        if (!result.success) {
          setError(result.error || t('roleSwitch_wrongPassword'))
          return false
        }
        if (!roleSwitchSessionMatches(result.user, role, email) || !result.authToken) {
          throw new Error('roleSwitch_wrongPasswordForCabinet')
        }

        const response = await fetch(`${PROFILE_API_BASE}/auth/mobile/session`, {
          headers: { Authorization: `Bearer ${result.authToken}` },
          signal: controller.signal,
          cache: 'no-store',
        })
        const confirmed = await response.json()
        if (!response.ok || !confirmed.success || !roleSwitchSessionMatches(confirmed.user, role, email) ||
          String(confirmed.user.id) !== String(result.user.id)) {
          throw new Error('roleSwitch_sessionVerificationFailed')
        }
        if (controller.signal.aborted) throw new Error('roleSwitch_switchTimeout')
        const currentUser = getUserData()
        if (String(currentUser?.id) !== String(sourceUser.id) || currentUser.role !== sourceUser.role ||
          currentUser.email !== sourceUser.email) throw new Error('roleSwitch_sessionChanged')

        snapshot = captureCabinetSession()
        sessionWritten = true
        clearCabinetSessionFields()
        saveUserData(result.user, 'email', { notify: false })
        rememberMobileAuthToken(result.authToken)
        if (String(getUserData()?.id) !== String(result.user.id) ||
          !roleSwitchSessionMatches(getUserData(), role, email) || getMobileAuthToken() !== result.authToken) {
          throw new Error('roleSwitch_sessionSaveFailed')
        }
        storeRoleSwitchArrival({ role, userId: result.user.id })
        if (!readRoleSwitchArrival({ role, userId: result.user.id })) throw new Error('roleSwitch_sessionSaveFailed')
        commitRoleSwitchTransition(transition.id, result.user.id)

        for (const key of ['clerk_oauth_redirect_started', 'clerk_oauth_flow_mode', 'clerk_oauth_user_role']) {
          sessionStorage.removeItem(key)
        }
        invalidateUserByIdCache(PROFILE_API_BASE, result.user.id)
        const pendingSell = readPendingSellPurchasedProperty()
        if (pendingSell?.id && role === 'seller') {
          promotePendingPurchasedPropertyToSellerArrival({ sellerUserId: result.user.id })
        }
        // A document navigation isolates every account-specific context and in-flight request.
        window.location.replace(transition.path)
        redirecting = true
        return true
      } catch (e) {
        if (sessionWritten && snapshot) restoreCabinetSession(snapshot)
        clearRoleSwitchArrival()
        const key = controller.signal.aborted ? 'roleSwitch_switchTimeout' : e.message
        setError(t(key?.startsWith('roleSwitch_') ? key : 'roleSwitch_switchError'))
        return false
      } finally {
        clearTimeout(timeout)
        if (!redirecting) {
          if (transition) clearRoleSwitchTransition(transition.id)
          switchingRef.current = false
          setSwitching(false)
          setLoading(false)
        }
      }
    },
    [linkedStatus, t],
  )

  const openFlow = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const userId = getStoredUserId()
      if (!userId) {
        showNotification(t('roleSwitch_loginToSwitch'), 'error')
        return
      }

      const preview = await loadProfilePreview()
      setProfilePreview(preview)
      if (!preview.email || preview.email === '—') {
        showNotification(t('roleSwitch_addEmailForLinkedCabinet'), 'error')
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
      showNotification(e.message || t('roleSwitch_openSwitchFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [targetRole, t])

  const openCabinetPicker = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const userId = getStoredUserId()
      if (!userId) {
        showNotification(t('roleSwitch_loginToSwitch'), 'error')
        return
      }

      const preview = await loadProfilePreview()
      setProfilePreview(preview)
      if (!preview.email || preview.email === '—') {
        showNotification(t('roleSwitch_addEmailForLinkedCabinet'), 'error')
        return
      }

      const status = await fetchLinkedRoles({ userId })
      setLinkedStatus(status)
      setPhase('cabinet')
    } catch (e) {
      showNotification(e.message || t('roleSwitch_openSwitchFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t])
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
        setError(formatPasswordValidationMessage(validation, t))
        setPasswordHints(validation)
        return false
      }

      const userId = getStoredUserId()
      if (!userId) {
        setError(t('roleSwitch_userNotAuthorized'))
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
          setError(formatPasswordValidationMessage(e.passwordValidation, t))
        } else {
          setError(e.message || t('roleSwitch_buyerPasswordSaveFailed'))
        }
        return false
      } finally {
        setLoading(false)
      }
    },
    [refreshLinkedStatus, t],
  )

  const submitSetup = useCallback(
    async (password) => {
      setError('')
      setPasswordHints(null)

      const validation = validatePassword(password)
      if (!validation.valid) {
        setError(formatPasswordValidationMessage(validation, t))
        setPasswordHints(validation)
        return false
      }

      const userId = getStoredUserId()
      if (!userId) {
        setError(t('roleSwitch_userNotAuthorized'))
        return false
      }

      if (targetRole === 'seller') {
        const status = linkedStatus || (await refreshLinkedStatus())
        if (status?.buyer && status.buyer.hasPassword === false) {
          setPhase('buyer-password')
          setError(t('buyerPasswordRequiredFirst'))
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
          setError(formatPasswordValidationMessage(e.passwordValidation, t))
        } else {
          setError(e.message || t('roleSwitch_createCabinetFailed'))
        }
        return false
      } finally {
        setLoading(false)
      }
    },
    [targetRole, linkedStatus, refreshLinkedStatus, switchToRole, t],
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
      setError(t('authSystemNotReady'))
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
      markCabinetEntry(sessionStorage, { defer: true })

      const { getClerkOAuthReturnUrl } = await import('../utils/clerkOAuth')
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: getClerkOAuthReturnUrl(),
      })
      return true
    } catch (e) {
      sessionStorage.removeItem('role_switch_in_progress')
      setError(e.message || t('googleSignInFailed'))
      setSwitching(false)
      setLoading(false)
      return false
    }
  }, [signIn, signInLoaded, t])

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
          showNotification(t('roleSwitch_loginToSell'), 'error')
          return
        }

        const preview = await loadProfilePreview()
        setProfilePreview(preview)
        if (!preview.email || preview.email === '—') {
          showNotification(t('roleSwitch_addEmailForSellerCabinet'), 'error')
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
        showNotification(e.message || t('roleSwitch_openSellerCabinetFailed'), 'error')
      } finally {
        setLoading(false)
      }
    },
    [t],
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
