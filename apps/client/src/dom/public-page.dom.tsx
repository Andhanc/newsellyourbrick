'use dom'

import './storage-polyfill'
import { useEffect, useRef } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import '../legacy/i18n/config'
import '../legacy/App.css'
import '../legacy/styles/buyer-mobile-tokens.css'
import '../legacy/styles/drawerDismiss.css'
import './legacy-public-shell.css'

import MobileDiscoverPage from '../legacy/pages/MobileDiscoverPage'
import Home from '../legacy/pages/Home'
import Shares from '../legacy/pages/Shares'
import Debts from '../legacy/pages/Debts'
import TestDriveLandingPage from '../legacy/pages/TestDriveLandingPage'
import About from '../legacy/pages/About'
import BuyerPage from '../legacy/pages/BuyerPage'
import SellerPage from '../legacy/pages/SellerPage'
import AppDownloadPage from '../legacy/pages/AppDownloadPage'
import LotteryPage from '../legacy/pages/LotteryPage'
import SectionsPage from '../legacy/pages/SectionsPage'
import SellYourBrickLandingPage from '../legacy/pages/SellYourBrickLandingPage'
import PrivateClub from '../legacy/pages/PrivateClub'
import SearchResults from '../legacy/pages/SearchResults'
import MapPage from '../legacy/pages/MapPage'
import Bonuses from '../legacy/pages/Bonuses'
import Chat from '../legacy/pages/Chat'
import Compare from '../legacy/pages/Compare'
import Favorites from '../legacy/pages/Favorites'
import InvestmentCalculator from '../legacy/pages/InvestmentCalculator'
import PropertyDetailPage from '../legacy/pages/PropertyDetailPage'
import Subscriptions from '../legacy/pages/Subscriptions'
import Wallet from '../legacy/pages/Wallet'
import PurchasedObjectGuidePage from '../legacy/pages/PurchasedObjectGuidePage'
import TestDriveBookingPage from '../legacy/pages/TestDriveBookingPage'
import TestDriveSurveyPage from '../legacy/pages/TestDriveSurveyPage'
import TestDriveExitFeedbackPage from '../legacy/pages/TestDriveExitFeedbackPage'
import CabinetProfileRoute from '../legacy/components/CabinetProfileRoute'
import {
  LegacyBookingsRedirect,
  LegacyHistoryRedirect,
} from '../legacy/components/LegacyRouteRedirects'
import OwnerTestRoute from '../legacy/pages/OwnerTestRoute'
import { PropertyFavoritesProvider } from '../legacy/context/PropertyFavoritesContext'
import {
  setNativeNavigate,
  setNativeProfileSavedVibration,
  setNativeSessionAuthenticated,
  setNativeSessionSwitch,
} from '../legacy/utils/nativeDomBridge'
import { setAppVersion } from '../legacy/utils/appVersion'
import {
  setNativeClerkSignOut,
  setNativeClerkUser,
  type NativeClerkUser,
} from './shims/clerk-react'

type PublicPageProps = {
  initialPath: string
  onNavigate: (path: string) => Promise<void>
  onLogout: () => Promise<void>
  onSwitchSession: (input: NativeSessionSwitchInput) => Promise<NativeSessionSwitchResult>
  onProfileSavedVibration: () => Promise<void>
  nativeAppVersion: string
  nativeUser: (NativeClerkUser & { role?: string }) | null
  dom?: import('expo/dom').DOMProps
}

type NativeSessionSwitchInput = {
  user: NativeClerkUser & { role?: string }
  authToken?: string | null
  path: string
}

type NativeSessionSwitchResult = {
  success: boolean
  error?: string
}

function NativeNavigationBridge({
  initialPath,
  onNavigate,
}: Pick<PublicPageProps, 'initialPath' | 'onNavigate'>) {
  const location = useLocation()
  const lastForwardedPath = useRef(initialPath)
  const currentPath = `${location.pathname}${location.search}${location.hash}`

  useEffect(() => {
    if (currentPath === initialPath || currentPath === lastForwardedPath.current) return
    lastForwardedPath.current = currentPath
    void onNavigate(currentPath)
  }, [currentPath, initialPath, onNavigate])

  return null
}

function PublicRoutes({ initialPath, onNavigate }: Pick<PublicPageProps, 'initialPath' | 'onNavigate'>) {
  const location = useLocation()
  const isDiscover = location.pathname === '/'

  return (
    <PropertyFavoritesProvider>
      <NativeNavigationBridge initialPath={initialPath} onNavigate={onNavigate} />
      <div className="expo-public-page app-root-fill">
        <div className="app-shell">
          <main className={`app-layout${isDiscover ? ' app-layout--mobile-discover' : ''}`}>
            <div className="app-layout__content">
              <Routes>
                <Route path="/" element={<MobileDiscoverPage hideFooter />} />
                <Route path="/auction" element={<Home />} />
                <Route path="/auction/:segment1/:segment2?" element={<Home />} />
                <Route path="/co-investment" element={<Shares />} />
                <Route path="/debts" element={<Debts />} />
                <Route path="/test-drive" element={<TestDriveLandingPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/buyer" element={<BuyerPage />} />
                <Route path="/seller" element={<SellerPage />} />
                <Route path="/app" element={<AppDownloadPage />} />
                <Route path="/lottery" element={<LotteryPage />} />
                <Route path="/sections" element={<SectionsPage />} />
                <Route path="/sellyourbrick" element={<SellYourBrickLandingPage />} />
                <Route path="/private-club" element={<PrivateClub />} />
                <Route path="/search-results" element={<SearchResults />} />
                <Route path="/search-results/:country" element={<SearchResults />} />
                <Route path="/search-results/:country/:city" element={<SearchResults />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/bonuses" element={<Bonuses />} />
                <Route path="/calculator" element={<InvestmentCalculator />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/history" element={<LegacyHistoryRedirect />} />
                <Route path="/property/:slugOrId" element={<PropertyDetailPage />} />
                <Route path="/profile" element={<CabinetProfileRoute />} />
                <Route path="/profile/bookings" element={<LegacyBookingsRedirect />} />
                <Route path="/owner-test" element={<OwnerTestRoute />} />
                <Route path="/owner-test/:view" element={<OwnerTestRoute />} />
                <Route path="/owner-test/:view/:propertyId" element={<OwnerTestRoute />} />
                <Route path="/profile/purchased/:propertyId" element={<PurchasedObjectGuidePage />} />
                <Route path="/property/:slugOrId/test-drive" element={<TestDriveBookingPage />} />
                <Route path="/test-drive/survey/:token" element={<TestDriveSurveyPage />} />
                <Route path="/test-drive/feedback/:token" element={<TestDriveExitFeedbackPage />} />
                <Route path="*" element={null} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </PropertyFavoritesProvider>
  )
}

function syncNativeSession(
  user: PublicPageProps['nativeUser'],
  onLogout: PublicPageProps['onLogout'],
  onNavigate: PublicPageProps['onNavigate'],
  onSwitchSession: PublicPageProps['onSwitchSession'],
  onProfileSavedVibration: PublicPageProps['onProfileSavedVibration'],
  nativeAppVersion: PublicPageProps['nativeAppVersion'],
) {
  setAppVersion(nativeAppVersion)
  setNativeClerkUser(user)
  setNativeClerkSignOut(onLogout)
  setNativeNavigate(onNavigate)
  setNativeSessionAuthenticated(Boolean(user))
  setNativeSessionSwitch(onSwitchSession)
  setNativeProfileSavedVibration(onProfileSavedVibration)
  if (typeof window === 'undefined') return

  if (!user) {
    for (const key of ['userData', 'userId', 'userRole', 'isLoggedIn', 'isOwnerLoggedIn', 'isAdminLoggedIn']) {
      window.localStorage.removeItem(key)
    }
    return
  }

  const role = String(user.role || 'buyer').toLowerCase()
  window.localStorage.setItem('userData', JSON.stringify({ ...user, isLoggedIn: true }))
  window.localStorage.setItem('userId', String(user.id))
  window.localStorage.setItem('userRole', role)
  window.localStorage.setItem('isLoggedIn', 'true')
  window.localStorage.setItem('isOwnerLoggedIn', String(role === 'seller' || role === 'owner'))
  window.localStorage.setItem('isAdminLoggedIn', String(role === 'admin'))
}

export default function PublicPage({
  initialPath,
  onNavigate,
  onLogout,
  onSwitchSession,
  onProfileSavedVibration,
  nativeAppVersion,
  nativeUser,
}: PublicPageProps) {
  syncNativeSession(
    nativeUser,
    onLogout,
    onNavigate,
    onSwitchSession,
    onProfileSavedVibration,
    nativeAppVersion,
  )
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <PublicRoutes initialPath={initialPath} onNavigate={onNavigate} />
    </MemoryRouter>
  )
}
