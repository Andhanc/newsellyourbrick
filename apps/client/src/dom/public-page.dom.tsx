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
import MyBookingsPage from '../legacy/pages/MyBookingsPage'
import PurchasedObjectGuidePage from '../legacy/pages/PurchasedObjectGuidePage'
import TestDriveBookingPage from '../legacy/pages/TestDriveBookingPage'
import TestDriveSurveyPage from '../legacy/pages/TestDriveSurveyPage'
import TestDriveExitFeedbackPage from '../legacy/pages/TestDriveExitFeedbackPage'
import CabinetProfileRoute from '../legacy/components/CabinetProfileRoute'
import { PropertyFavoritesProvider } from '../legacy/context/PropertyFavoritesContext'
import {
  setNativeClerkSignOut,
  setNativeClerkUser,
  type NativeClerkUser,
} from './shims/clerk-react'

type PublicPageProps = {
  initialPath: string
  onNavigate: (path: string) => Promise<void>
  onLogout: () => Promise<void>
  nativeUser: (NativeClerkUser & { role?: string }) | null
  dom?: import('expo/dom').DOMProps
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
                <Route path="/" element={<MobileDiscoverPage />} />
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
                <Route path="/profile" element={<CabinetProfileRoute />} />
                <Route path="/profile/bookings" element={<MyBookingsPage />} />
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
) {
  setNativeClerkUser(user)
  setNativeClerkSignOut(onLogout)
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

export default function PublicPage({ initialPath, onNavigate, onLogout, nativeUser }: PublicPageProps) {
  syncNativeSession(nativeUser, onLogout)
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <PublicRoutes initialPath={initialPath} onNavigate={onNavigate} />
    </MemoryRouter>
  )
}
