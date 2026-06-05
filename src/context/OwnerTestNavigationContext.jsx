import { createContext, useCallback, useContext, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  OWNER_VIEWS,
  buildOwnerTestSearchParams,
  resolveOwnerTestView,
} from '../utils/ownerTestNav'

const OwnerTestNavigationContext = createContext(null)

export function OwnerTestNavigationProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const view = resolveOwnerTestView(searchParams)
  const propertyId = searchParams.get('propertyId') || ''
  const tab = searchParams.get('tab') || 'personal'
  const highlight = searchParams.get('highlight') || ''

  const goTo = useCallback(
    (nextView, params = {}) => {
      const sp = buildOwnerTestSearchParams(nextView, params)
      setSearchParams(sp, { replace: false })
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' })
      }
    },
    [setSearchParams]
  )

  const value = useMemo(
    () => ({
      embedded: true,
      view,
      propertyId,
      tab,
      highlight,
      goTo,
    }),
    [view, propertyId, tab, highlight, goTo]
  )

  return (
    <OwnerTestNavigationContext.Provider value={value}>
      {children}
    </OwnerTestNavigationContext.Provider>
  )
}

export function useOwnerTestNav() {
  const ctx = useContext(OwnerTestNavigationContext)
  if (!ctx) {
    throw new Error('useOwnerTestNav must be used within OwnerTestNavigationProvider')
  }
  return ctx
}

export function useOwnerTestNavOptional() {
  return useContext(OwnerTestNavigationContext)
}

export { OWNER_VIEWS }
