import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CLERK_DB_USER_SYNCED } from '../services/authService'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { getCabinetDataPath } from '../utils/cabinetRoutes'
import { fetchVerificationStatus } from '../utils/verificationStatusApi'
import {
  getBuyerOnboardingGateUserId,
  isBuyerOnboardingAllowedPath,
  isBuyerSessionForOnboardingGate,
  needsBuyerProfileOnboardingFromProgress,
  readBuyerOnboardingGateFlag,
  writeBuyerOnboardingGateFlag,
} from '../utils/buyerProfileOnboardingGate'

/**
 * Глобальная защита: пока профиль покупателя <78%, нельзя уйти с /profile
 * (в т.ч. «назад» в браузере) — возвращаем на /profile?data=1.
 */
export default function BuyerProfileOnboardingRouteGate() {
  const location = useLocation()
  const navigate = useNavigate()
  const [gateActive, setGateActive] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const redirectingRef = useRef(false)

  const refreshGate = useCallback(async ({ force = false } = {}) => {
    if (!isBuyerSessionForOnboardingGate()) {
      try {
        const raw = localStorage.getItem('userId')
        if (raw && /^\d+$/.test(String(raw).trim())) {
          writeBuyerOnboardingGateFlag(raw, false, { silent: true })
        }
      } catch {
        /* ignore */
      }
      setGateActive(false)
      setHydrated(true)
      return false
    }

    const userId = getBuyerOnboardingGateUserId()
    if (userId == null) {
      setGateActive(false)
      setHydrated(true)
      return false
    }

    if (!force && readBuyerOnboardingGateFlag(userId)) {
      setGateActive(true)
      setHydrated(true)
    }

    try {
      const apiBase = getApiBaseUrlSync()
      const status = await fetchVerificationStatus(apiBase, userId, {
        force,
        ttlMs: force ? 0 : 15000,
      })
      const progress = status?.progress
      const active = needsBuyerProfileOnboardingFromProgress(
        typeof progress === 'number' ? progress : Number.NaN,
      )
      writeBuyerOnboardingGateFlag(userId, active, { silent: true })
      setGateActive(active)
      setHydrated(true)
      return active
    } catch {
      const fallback = readBuyerOnboardingGateFlag(userId)
      setGateActive(fallback)
      setHydrated(true)
      return fallback
    }
  }, [])

  useEffect(() => {
    void refreshGate()
  }, [refreshGate, location.pathname])

  useEffect(() => {
    const onRefresh = () => void refreshGate({ force: true })
    const onFlag = (event) => {
      const uid = getBuyerOnboardingGateUserId()
      if (uid == null) return
      if (event?.detail?.userId != null && Number(event.detail.userId) !== Number(uid)) return
      if (typeof event?.detail?.active === 'boolean') {
        setGateActive(event.detail.active)
        setHydrated(true)
        return
      }
      void refreshGate({ force: true })
    }
    window.addEventListener('verification-status-update', onRefresh)
    window.addEventListener('buyer-profile-onboarding-gate', onFlag)
    window.addEventListener(CLERK_DB_USER_SYNCED, onRefresh)
    window.addEventListener('focus', onRefresh)
    return () => {
      window.removeEventListener('verification-status-update', onRefresh)
      window.removeEventListener('buyer-profile-onboarding-gate', onFlag)
      window.removeEventListener(CLERK_DB_USER_SYNCED, onRefresh)
      window.removeEventListener('focus', onRefresh)
    }
  }, [refreshGate])

  useEffect(() => {
    if (!hydrated) return
    if (!gateActive) return
    if (!isBuyerSessionForOnboardingGate()) return
    if (isBuyerOnboardingAllowedPath(location.pathname)) return
    if (redirectingRef.current) return

    redirectingRef.current = true
    navigate(getCabinetDataPath(), { replace: true })
    const t = window.setTimeout(() => {
      redirectingRef.current = false
    }, 400)
    return () => window.clearTimeout(t)
  }, [gateActive, hydrated, location.pathname, location.search, navigate])

  return null
}
