import { useEffect, useState } from 'react'
import { getUserData } from '../services/authService'
import { fetchLinkedRoles } from '../utils/roleSwitchApi'

function getStoredUserId() {
  const raw = localStorage.getItem('userId') || getUserData()?.id
  const n = parseInt(String(raw), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** true, если у email уже есть и кабинет покупателя, и кабинет продавца */
export function useHasBothLinkedRoles() {
  const [hasBoth, setHasBoth] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const userId = getStoredUserId()
    if (!userId) {
      setHasBoth(false)
      setLoaded(true)
      return undefined
    }

    ;(async () => {
      try {
        const status = await fetchLinkedRoles({ userId })
        if (!cancelled) setHasBoth(Boolean(status?.hasBoth))
      } catch {
        if (!cancelled) setHasBoth(false)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { hasBoth, loaded }
}
