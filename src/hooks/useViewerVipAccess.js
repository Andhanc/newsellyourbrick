import { useState, useEffect } from 'react'
import {
  CLERK_DB_USER_SYNCED,
  fetchNumericDbUserIdForApi,
  getStoredNumericUserId,
} from '../services/authService'
import { SUBSCRIPTION_BILLING_UPDATED_EVENT } from '../constants/cabinetEvents'
import { effectiveDisplayTier, userHasVipAccess } from './useCabinetOverviewData'
import { canAccessBuyerFeature } from '../utils/subscriptionAccess'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'

function tierToPlanName(tier) {
  if (tier === 'vip') return 'VIP'
  if (tier === 'starter') return 'Starter'
  return 'Pro'
}

/**
 * Лёгкая проверка VIP / тарифа для листингов и лендингов:
 * без истории/превью кабинета из useCabinetOverviewData.
 */
export function useViewerVipAccess() {
  const [numericUserId, setNumericUserId] = useState(() => getStoredNumericUserId())
  const [cabinetVipActive, setCabinetVipActive] = useState(false)
  const [displayTier, setDisplayTier] = useState(/** @type {'starter' | 'pro' | 'vip'} */ ('starter'))
  const [resolved, setResolved] = useState(false)

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
        setDisplayTier('starter')
        setResolved(true)
        return
      }
      try {
        const res = await fetch(`${API_BASE_URL}/users/${uid}/subscription-billing`)
        const json = res.ok ? await res.json().catch(() => null) : null
        if (cancelled) return
        const data = json?.success && json?.data ? json.data : null
        const subscription = data?.subscription ?? null
        const vipClub = data?.vipClub
        setCabinetVipActive(userHasVipAccess({ subscription, vipClub }))
        setDisplayTier(effectiveDisplayTier(subscription, vipClub))
        setResolved(true)
      } catch {
        if (!cancelled) {
          setCabinetVipActive(false)
          setDisplayTier('starter')
          setResolved(true)
        }
      }
    }

    void loadVip()
    const onBillingUpdated = () => void loadVip()
    window.addEventListener(SUBSCRIPTION_BILLING_UPDATED_EVENT, onBillingUpdated)

    return () => {
      cancelled = true
      window.removeEventListener(SUBSCRIPTION_BILLING_UPDATED_EVENT, onBillingUpdated)
    }
  }, [numericUserId])

  const canAccess = (feature) => {
    if (!resolved) return false
    return canAccessBuyerFeature(displayTier, feature)
  }

  return {
    cabinetVipActive,
    numericUserId,
    displayTier,
    ownedPlanName: tierToPlanName(displayTier),
    resolved,
    canAccess,
  }
}
