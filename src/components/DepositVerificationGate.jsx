import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { CLERK_DB_USER_SYNCED, getUserData } from '../services/authService'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import {
  fetchVerificationStatus,
  invalidateVerificationStatusCache,
} from '../utils/verificationStatusApi'
import {
  isBuyerRoleForDepositVerificationGate,
  isDepositVerificationAllowedPath,
  readDepositVerificationUserId,
  shouldActivateDepositVerificationGate,
  writeDepositVerificationGateFlag,
} from '../utils/depositVerificationGate'
import './VerificationRejectedGate.css'

const SellerVerificationModalLazy = lazy(() => import('./SellerVerificationModal'))

/**
 * Блокирующая верификация после пополнения депозита.
 * Источник истины — API needsDepositVerification (депозит > 0, не верифицирован, нет pending-доков).
 */
export default function DepositVerificationGate({ blockedUser = false }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const [gateActive, setGateActive] = useState(false)
  const [userId, setUserId] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const redirectingRef = useRef(false)

  const refreshGate = useCallback(
    async ({ force = false } = {}) => {
      if (blockedUser) {
        setGateActive(false)
        setUserId(null)
        setHydrated(true)
        return false
      }
      if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/marketer')) {
        setGateActive(false)
        setUserId(null)
        setHydrated(true)
        return false
      }
      if (
        localStorage.getItem('isAdminLoggedIn') === 'true'
        && localStorage.getItem('userRole') === 'admin'
      ) {
        setGateActive(false)
        setUserId(null)
        setHydrated(true)
        return false
      }
      if (!authLoaded) return false

      if (!isBuyerRoleForDepositVerificationGate()) {
        const uid = readDepositVerificationUserId()
        if (uid != null) writeDepositVerificationGateFlag(uid, false, { silent: true })
        setGateActive(false)
        setUserId(null)
        setHydrated(true)
        return false
      }

      const legacy = getUserData()
      const legacyIn = Boolean(legacy?.isLoggedIn)
      const uid = readDepositVerificationUserId()
      if (uid == null || (!isSignedIn && !legacyIn)) {
        setGateActive(false)
        setUserId(null)
        setHydrated(true)
        return false
      }

      setUserId(uid)

      try {
        const apiBase = getApiBaseUrlSync()
        const status = await fetchVerificationStatus(apiBase, uid, {
          force,
          ttlMs: force ? 0 : 10000,
        })
        const active = shouldActivateDepositVerificationGate(status, uid)
        writeDepositVerificationGateFlag(uid, active, { silent: true })
        setGateActive(active)
        setHydrated(true)
        return active
      } catch {
        const fallback = shouldActivateDepositVerificationGate(null, uid)
        setGateActive(fallback)
        setHydrated(true)
        return fallback
      }
    },
    [authLoaded, blockedUser, isSignedIn, location.pathname],
  )

  useEffect(() => {
    void refreshGate()
  }, [refreshGate])

  useEffect(() => {
    const onRefresh = () => void refreshGate({ force: true })
    const onFlag = (event) => {
      const uid = readDepositVerificationUserId()
      if (uid == null) return
      if (event?.detail?.userId != null && Number(event.detail.userId) !== Number(uid)) return
      if (typeof event?.detail?.active === 'boolean') {
        setGateActive(event.detail.active)
        setHydrated(true)
        if (event.detail.active) setUserId(uid)
        return
      }
      void refreshGate({ force: true })
    }
    window.addEventListener('verification-status-update', onRefresh)
    window.addEventListener('deposit-verification-gate', onFlag)
    window.addEventListener('focus', onRefresh)
    window.addEventListener(CLERK_DB_USER_SYNCED, onRefresh)
    return () => {
      window.removeEventListener('verification-status-update', onRefresh)
      window.removeEventListener('deposit-verification-gate', onFlag)
      window.removeEventListener('focus', onRefresh)
      window.removeEventListener(CLERK_DB_USER_SYNCED, onRefresh)
    }
  }, [refreshGate])

  useEffect(() => {
    if (!hydrated || !gateActive) return
    if (isDepositVerificationAllowedPath(location.pathname)) return
    if (redirectingRef.current) return

    redirectingRef.current = true
    navigate('/wallet', { replace: true })
    const timer = window.setTimeout(() => {
      redirectingRef.current = false
    }, 400)
    return () => window.clearTimeout(timer)
  }, [gateActive, hydrated, location.pathname, navigate])

  if (!gateActive || !userId) return null

  return (
    <Suspense fallback={null}>
      <SellerVerificationModalLazy
        isOpen
        required
        onClose={() => {
          void refreshGate({ force: true })
        }}
        userId={userId}
        title={t('walletPage_verificationTitle')}
        subtitle={t('walletPage_verificationSubtitle')}
        onComplete={async () => {
          const apiBase = getApiBaseUrlSync()
          invalidateVerificationStatusCache(apiBase, userId)
          window.dispatchEvent(new Event('verification-status-update'))
          await refreshGate({ force: true })
          return true
        }}
      />
    </Suspense>
  )
}
