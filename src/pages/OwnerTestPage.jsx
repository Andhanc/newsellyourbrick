import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { OwnerTestNavigationProvider, useOwnerTestNav } from '../context/OwnerTestNavigationContext'
import OwnerTestCabinetChrome from '../components/OwnerTestCabinetChrome'
import { OWNER_VIEWS, VIEW_PAGE_ACTIVE, buildOwnerTestPath } from '../utils/ownerTestNav'
import { readPendingSellPurchasedProperty } from '../utils/purchasedPropertyListingPrefill'
import MainOwnerTestPage from './MainOwnerTestPage'
import OwnerPropertiesTestPage from './OwnerPropertiesTestPage'
import OwnerPropertyAnalyticsTestPage from './OwnerPropertyAnalyticsTestPage'
import OwnerTestDrivePage from './OwnerTestDrivePage'
import OwnerSubscriptionsTestPage from './OwnerSubscriptionsTestPage'
import OwnerWalletTestPage from './OwnerWalletTestPage'
import OwnerProfileTestPage from './OwnerProfileTestPage'
import OwnerAddPropertyTestPage from './OwnerAddPropertyTestPage'

function OwnerTestViewRouter() {
  const { view } = useOwnerTestNav()

  useEffect(() => {
    const cls = VIEW_PAGE_ACTIVE[view] || VIEW_PAGE_ACTIVE[OWNER_VIEWS.HOME]
    document.documentElement.classList.add(cls)
    return () => document.documentElement.classList.remove(cls)
  }, [view])

  switch (view) {
    case OWNER_VIEWS.PROPERTIES:
      return <OwnerPropertiesTestPage />
    case OWNER_VIEWS.PROPERTY_ANALYTICS:
      return <OwnerPropertyAnalyticsTestPage />
    case OWNER_VIEWS.TEST_DRIVE:
      return <OwnerTestDrivePage />
    case OWNER_VIEWS.SUBSCRIPTIONS:
      return <OwnerSubscriptionsTestPage />
    case OWNER_VIEWS.WALLET:
      return <OwnerWalletTestPage />
    case OWNER_VIEWS.PROFILE:
      return <OwnerProfileTestPage />
    case OWNER_VIEWS.ADD_PROPERTY:
      return <OwnerAddPropertyTestPage />
    case OWNER_VIEWS.HOME:
    default:
      return <MainOwnerTestPage />
  }
}

function OwnerTestPageContent() {
  const { view } = useOwnerTestNav()
  const navigate = useNavigate()

  useEffect(() => {
    const pending = readPendingSellPurchasedProperty()
    if (!pending?.id) return
    const role = String(localStorage.getItem('userRole') || '').toLowerCase()
    if (role !== 'seller' && role !== 'owner') return
    if (view === OWNER_VIEWS.ADD_PROPERTY) return
    navigate(buildOwnerTestPath(OWNER_VIEWS.ADD_PROPERTY), { replace: true })
  }, [view, navigate])

  if (view === OWNER_VIEWS.ADD_PROPERTY) {
    return <OwnerTestViewRouter />
  }

  return (
    <OwnerTestCabinetChrome>
      <OwnerTestViewRouter />
    </OwnerTestCabinetChrome>
  )
}

export default function OwnerTestPage() {
  return (
    <OwnerTestNavigationProvider>
      <OwnerTestPageContent />
    </OwnerTestNavigationProvider>
  )
}
