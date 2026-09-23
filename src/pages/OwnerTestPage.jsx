import { Suspense, useEffect } from 'react'
import { OwnerTestNavigationProvider, useOwnerTestNav } from '../context/OwnerTestNavigationContext'
import OwnerTestCabinetChrome from '../components/OwnerTestCabinetChrome'
import OwnerCabinetWelcomeHost from '../components/OwnerCabinetWelcomeHost'
import OwnerTestCabinetPageFallback from '../components/OwnerTestCabinetPageFallback'
import { OWNER_VIEWS, VIEW_PAGE_ACTIVE } from '../utils/ownerTestNav'
import { lazyWithRetry } from '../utils/lazyWithRetry'
import SellerPurchasedPropertyArrivalDrawer from '../components/SellerPurchasedPropertyArrivalDrawer'

const MainOwnerTestPage = lazyWithRetry(() => import('./MainOwnerTestPage'))
const OwnerPropertiesTestPage = lazyWithRetry(() => import('./OwnerPropertiesTestPage'))
const OwnerPropertyAnalyticsTestPage = lazyWithRetry(() => import('./OwnerPropertyAnalyticsTestPage'))
const OwnerTestDrivePage = lazyWithRetry(() => import('./OwnerTestDrivePage'))
const OwnerSubscriptionsTestPage = lazyWithRetry(() => import('./OwnerSubscriptionsTestPage'))
const OwnerWalletTestPage = lazyWithRetry(() => import('./OwnerWalletTestPage'))
const OwnerProfileTestPage = lazyWithRetry(() => import('./OwnerProfileTestPage'))
const OwnerAddPropertyTestPage = lazyWithRetry(() => import('./OwnerAddPropertyTestPage'))

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
  const viewTree = (
    <Suspense fallback={<OwnerTestCabinetPageFallback />}>
      <OwnerTestViewRouter />
    </Suspense>
  )

  if (view === OWNER_VIEWS.ADD_PROPERTY) {
    return (
      <OwnerCabinetWelcomeHost>
        {viewTree}
        <SellerPurchasedPropertyArrivalDrawer />
      </OwnerCabinetWelcomeHost>
    )
  }

  return (
    <OwnerCabinetWelcomeHost>
      <OwnerTestCabinetChrome>
        {viewTree}
      </OwnerTestCabinetChrome>
      <SellerPurchasedPropertyArrivalDrawer />
    </OwnerCabinetWelcomeHost>
  )
}

export default function OwnerTestPage() {
  return (
    <OwnerTestNavigationProvider>
      <OwnerTestPageContent />
    </OwnerTestNavigationProvider>
  )
}
