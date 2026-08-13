import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  OWNER_VIEWS,
  buildOwnerTestPath,
  buildOwnerTestQueryParams,
  resolveOwnerTestRoute,
  scrollOwnerCabinetToTop,
} from '../utils/ownerTestNav'

const OwnerTestNavigationContext = createContext(null)

export function OwnerTestNavigationProvider({ children }) {
  const navigate = useNavigate()
  const { view: routeView, propertyId: routePropertyId } = useParams()
  const [searchParams] = useSearchParams()
  const routeState = useMemo(
    () => resolveOwnerTestRoute({ routeView, routePropertyId, searchParams }),
    [routeView, routePropertyId, searchParams],
  )

  // После Stripe возвращаем на мастер добавления объекта (черновик в localStorage).
  // Важно: session_id должен сохраниться — без него публикация не стартует.
  useEffect(() => {
    const checkout = routeState.listing_fee_checkout
    if (!checkout) return
    if (routeState.view === OWNER_VIEWS.ADD_PROPERTY) return
    const nextPath = buildOwnerTestPath(OWNER_VIEWS.ADD_PROPERTY)
    const nextQuery = buildOwnerTestQueryParams({
      listing_fee_checkout: checkout,
      session_id: routeState.session_id,
      tab: routeState.tab,
      highlight: routeState.highlight,
    })
    const qs = nextQuery.toString()
    navigate(qs ? `${nextPath}?${qs}` : nextPath, { replace: true })
  }, [
    navigate,
    routeState.highlight,
    routeState.listing_fee_checkout,
    routeState.session_id,
    routeState.tab,
    routeState.view,
  ])

  // Поддержка legacy URL /owner-test?view=...: канонизируем к path-based ссылке.
  useEffect(() => {
    if (!routeState.legacyViewUsed) return
    const nextPath = buildOwnerTestPath(routeState.view, { propertyId: routeState.propertyId })
    const nextQuery = buildOwnerTestQueryParams({
      tab: routeState.tab,
      highlight: routeState.highlight,
      listing_fee_checkout: routeState.listing_fee_checkout,
      session_id: routeState.session_id,
    })
    const qs = nextQuery.toString()
    navigate(qs ? `${nextPath}?${qs}` : nextPath, { replace: true })
  }, [
    navigate,
    routeState.highlight,
    routeState.legacyViewUsed,
    routeState.listing_fee_checkout,
    routeState.session_id,
    routeState.propertyId,
    routeState.tab,
    routeState.view,
  ])

  const view = routeState.view
  const propertyId = routeState.propertyId
  const tab = routeState.tab
  const highlight = routeState.highlight

  const goTo = useCallback(
    (nextView, params = {}) => {
      const path = buildOwnerTestPath(nextView, { propertyId: params.propertyId })
      const sp = buildOwnerTestQueryParams({
        tab: params.tab,
        highlight: params.highlight,
        listing_fee_checkout: params.listing_fee_checkout,
        session_id: params.session_id,
      })
      const qs = sp.toString()
      navigate(qs ? `${path}?${qs}` : path, { replace: false })
    },
    [navigate]
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
