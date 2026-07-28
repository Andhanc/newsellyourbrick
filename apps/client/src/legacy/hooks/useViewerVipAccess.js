import { useState, useEffect } from 'react'
import {
  CLERK_DB_USER_SYNCED,
  fetchNumericDbUserIdForApi,
  getStoredNumericUserId,
} from '../services/authService'
import { SUBSCRIPTION_BILLING_UPDATED_EVENT } from '../constants/cabinetEvents'
import { userHasVipAccess } from './useCabinetOverviewData'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

/**
 * Лёгкая проверка VIP для листингов (аукцион): без истории/превью кабинета из useCabinetOverviewData.
 */
export function useViewerVipAccess() {
  const [numericUserId, setNumericUserId] = useState(() => getStoredNumericUserId())
  const [cabinetVipActive, setCabinetVipActive] = useState(false)

  useEffect(() => {
    const applyFromStorage = () => {
      const n = getStoredNumericUserId()
      setNumericUserId((prev) => (prev === n ? prev : n))
    }
    applyFromStorage()
    window.addEventListener(CLERK_DB_USER_SYNCED, applyFromStorage)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, applyFromStorage)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadVip = async () => {
      let uid = numericUserId ?? getStoredNumericUserId()
      if (!uid) {
        const id = await fetchNumericDbUserIdForApi({ clerkUser: null, clerkUserLoaded: false })
        if (cancelled) return
        if (id) {
          uid = id
          setNumericUserId(id)
        }
      }
      if (!uid) {
        setCabinetVipActive(false)
        return
      }
      try {
        const res = await fetch(`${API_BASE_URL}/users/${uid}/subscription-billing`)
        const json = res.ok ? await res.json().catch(() => null) : null
        if (cancelled) return
        const data = json?.success && json?.data ? json.data : null
        setCabinetVipActive(
          userHasVipAccess({
            subscription: data?.subscription ?? null,
            vipClub: data?.vipClub,
          }),
        )
      } catch {
        if (!cancelled) setCabinetVipActive(false)
      }
    }

    const schedule =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? () => window.requestIdleCallback(() => void loadVip(), { timeout: 4500 })
        : () => window.setTimeout(() => void loadVip(), 900)

    const handle = schedule()
    const onBillingUpdated = () => void loadVip()
    window.addEventListener(SUBSCRIPTION_BILLING_UPDATED_EVENT, onBillingUpdated)

    return () => {
      cancelled = true
      window.removeEventListener(SUBSCRIPTION_BILLING_UPDATED_EVENT, onBillingUpdated)
      if (typeof handle === 'number') {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          window.cancelIdleCallback(handle)
        } else if (typeof window !== 'undefined') {
          window.clearTimeout(handle)
        }
      }
    }
  }, [numericUserId])

  return { cabinetVipActive, numericUserId }
}
