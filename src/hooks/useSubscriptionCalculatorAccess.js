import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
  CLERK_DB_USER_SYNCED,
  fetchNumericDbUserIdForApi,
  getStoredNumericUserId,
  isAuthenticated,
} from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import { subscriptionUnlocksCalculator } from '../utils/subscriptionAccess'

/**
 * Загружает подписку и сообщает, открыт ли инвестиционный калькулятор (Pro/VIP active).
 */
export function useSubscriptionCalculatorAccess() {
  const { user, isLoaded: userLoaded } = useUser()
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  const [resolved, setResolved] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const apply = () => {
      const n = getStoredNumericUserId()
      if (n != null) setDbUserId(n)
    }
    apply()
    window.addEventListener(CLERK_DB_USER_SYNCED, apply)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, apply)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const id = await fetchNumericDbUserIdForApi({
        clerkUser: user,
        clerkUserLoaded: userLoaded,
      })
      if (!cancelled && id != null) setDbUserId(id)
    })()
    return () => {
      cancelled = true
    }
  }, [user, userLoaded])

  useEffect(() => {
    if (user && !userLoaded) return undefined

    let cancelled = false

    const run = async () => {
      const signedIn = (user && userLoaded) || isAuthenticated()
      if (!signedIn) {
        if (!cancelled) {
          setAllowed(false)
          setResolved(true)
        }
        return
      }

      const uid = dbUserId ?? getStoredNumericUserId()
      if (!uid) {
        if (!cancelled) {
          setAllowed(false)
          setResolved(true)
        }
        return
      }

      try {
        const base = await getApiBaseUrl()
        const res = await fetch(`${base}/users/${uid}/subscription-billing`)
        const json = await res.json().catch(() => ({}))
        const sub = json?.success && json?.data ? json.data.subscription : null
        if (!cancelled) {
          setAllowed(subscriptionUnlocksCalculator(sub))
          setResolved(true)
        }
      } catch {
        if (!cancelled) {
          setAllowed(false)
          setResolved(true)
        }
      }
    }

    setResolved(false)
    void run()

    return () => {
      cancelled = true
    }
  }, [dbUserId, user, userLoaded])

  return { resolved, allowed }
}
