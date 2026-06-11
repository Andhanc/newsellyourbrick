import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  OWNER_VIEWS,
  buildOwnerTestSearchParams,
  resolveOwnerTestView,
  scrollOwnerCabinetToTop,
} from '../utils/ownerTestNav'

const OwnerTestNavigationContext = createContext(null)

export function OwnerTestNavigationProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams()

  // После Stripe возвращаем на мастер добавления объекта (черновик в localStorage).
  useEffect(() => {
    const checkout = searchParams.get('listing_fee_checkout')
    if (!checkout) return
    if (searchParams.get('view') === OWNER_VIEWS.ADD_PROPERTY) return
    const next = new URLSearchParams(searchParams)
    next.set('view', OWNER_VIEWS.ADD_PROPERTY)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const view = resolveOwnerTestView(searchParams)
  const propertyId = searchParams.get('propertyId') || ''
  const tab = searchParams.get('tab') || 'personal'
  const highlight = searchParams.get('highlight') || ''

  const goTo = useCallback(
    (nextView, params = {}) => {
      const sp = buildOwnerTestSearchParams(nextView, params)
      setSearchParams(sp, { replace: false })
    },
    [setSearchParams]
  )

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      scrollOwnerCabinetToTop()
      window.requestAnimationFrame(scrollOwnerCabinetToTop)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [view, propertyId, tab, highlight])

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
