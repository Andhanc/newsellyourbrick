'use dom'

// Versioned entry: changing this file path gives Android WebView a fresh bundled URL.

import './storage-polyfill'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

import '../legacy/i18n/config'
import '../legacy/App.css'
import '../legacy/styles/buyer-mobile-tokens.css'
import '../legacy/styles/drawerDismiss.css'
import './legacy-public-shell.css'

import { PropertyFavoritesProvider } from '../legacy/context/PropertyFavoritesContext'
import {
  setNativeNavigate,
  setNativeFirstFavoriteNotification,
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

const MobileDiscoverPage = lazy(() => import('../legacy/pages/MobileDiscoverPage'))
const Home = lazy(() => import('../legacy/pages/Home'))
const Shares = lazy(() => import('../legacy/pages/Shares'))
const Debts = lazy(() => import('../legacy/pages/Debts'))
const TestDriveLandingPage = lazy(() => import('../legacy/pages/TestDriveLandingPage'))
const About = lazy(() => import('../legacy/pages/About'))
const BuyerPage = lazy(() => import('../legacy/pages/BuyerPage'))
const SellerPage = lazy(() => import('../legacy/pages/SellerPage'))
const AppDownloadPage = lazy(() => import('../legacy/pages/AppDownloadPage'))
const LotteryPage = lazy(() => import('../legacy/pages/LotteryPage'))
const SectionsPage = lazy(() => import('../legacy/pages/SectionsPage'))
const SellYourBrickLandingPage = lazy(() => import('../legacy/pages/SellYourBrickLandingPage'))
const PrivateClub = lazy(() => import('../legacy/pages/PrivateClub'))
const SearchResults = lazy(() => import('../legacy/pages/SearchResults'))
const MapPage = lazy(() => import('../legacy/pages/MapPage'))
const Bonuses = lazy(() => import('../legacy/pages/Bonuses'))
const Chat = lazy(() => import('../legacy/pages/Chat'))
const Compare = lazy(() => import('../legacy/pages/Compare'))
const Favorites = lazy(() => import('../legacy/pages/Favorites'))
const InvestmentCalculator = lazy(() => import('../legacy/pages/InvestmentCalculator'))
const PropertyDetailPage = lazy(() => import('../legacy/pages/PropertyDetailPage'))
const Subscriptions = lazy(() => import('../legacy/pages/Subscriptions'))
const Wallet = lazy(() => import('../legacy/pages/Wallet'))
const PurchasedObjectGuidePage = lazy(() => import('../legacy/pages/PurchasedObjectGuidePage'))
const TestDriveBookingPage = lazy(() => import('../legacy/pages/TestDriveBookingPage'))
const TestDriveSurveyPage = lazy(() => import('../legacy/pages/TestDriveSurveyPage'))
const TestDriveExitFeedbackPage = lazy(() => import('../legacy/pages/TestDriveExitFeedbackPage'))
const CabinetProfileRoute = lazy(() => import('../legacy/components/CabinetProfileRoute'))
const OwnerTestRoute = lazy(() => import('../legacy/pages/OwnerTestRoute'))
const LegacyBookingsRedirect = lazy(() =>
  import('../legacy/components/LegacyRouteRedirects').then((module) => ({
    default: module.LegacyBookingsRedirect,
  })),
)
const LegacyHistoryRedirect = lazy(() =>
  import('../legacy/components/LegacyRouteRedirects').then((module) => ({
    default: module.LegacyHistoryRedirect,
  })),
)

type PublicPageProps = {
  initialPath: string
  onNavigate: (path: string) => Promise<void>
  onLogout: () => Promise<void>
  onSwitchSession: (input: NativeSessionSwitchInput) => Promise<NativeSessionSwitchResult>
  onProfileSavedVibration: () => Promise<void>
  onFirstFavoriteNotification: (input: { body: string }) => Promise<boolean>
  onReady: () => Promise<void>
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
              <Suspense fallback={<div className="native-dom-loading" role="status" aria-label="Loading" />}>
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
              </Suspense>
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
  onFirstFavoriteNotification: PublicPageProps['onFirstFavoriteNotification'],
  nativeAppVersion: PublicPageProps['nativeAppVersion'],
) {
  setAppVersion(nativeAppVersion)
  setNativeClerkUser(user)
  setNativeClerkSignOut(onLogout)
  setNativeNavigate(onNavigate)
  setNativeSessionAuthenticated(Boolean(user))
  setNativeSessionSwitch(onSwitchSession)
  setNativeProfileSavedVibration(onProfileSavedVibration)
  setNativeFirstFavoriteNotification(onFirstFavoriteNotification)
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
  onFirstFavoriteNotification,
  onReady,
  nativeAppVersion,
  nativeUser,
}: PublicPageProps) {
  syncNativeSession(
    nativeUser,
    onLogout,
    onNavigate,
    onSwitchSession,
    onProfileSavedVibration,
    onFirstFavoriteNotification,
    nativeAppVersion,
  )
  useEffect(() => {
    void onReady()
  }, [onReady])
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <PublicRoutes initialPath={initialPath} onNavigate={onNavigate} />
    </MemoryRouter>
  )
}
