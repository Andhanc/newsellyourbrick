import { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import ClerkAuthSync from './components/ClerkAuthSync'
import ToastContainer from './components/ToastContainer'
import {
  ClerkAuthHandlerGate,
  DeferredSiteAdsHost,
  LoggedInVerificationGatesHost,
  PrivateClubKickModalHost,
} from './components/DeferredAppShellGates'
import VisitorHeartbeat from './components/VisitorHeartbeat'
import UserCabinetSseBridge from './components/UserCabinetSseBridge'
import { validateSession, getUserData, ensureLocalUserIdFromSession } from './services/authService'
import { fetchUserById } from './utils/usersApi'
import { PropertyFavoritesProvider } from './context/PropertyFavoritesContext'
import { runDevBackendHintOnce } from './utils/devBackendHint'
import { installReturningVisitorListeners, markUserHasVisitedSite } from './utils/visitorAuthDefault'
import { rememberInternalRoutePath } from './utils/propertyNavigation'
import './App.css'
import { GlassFilterDefs } from './components/ui/GlassFilterDefs'
import { LayoutScrollRefContext } from './context/LayoutScrollContext'
import { scrollMainTo } from './utils/mainScroll'
import { lazyWithRetry } from './utils/lazyWithRetry'
import RouteErrorBoundary from './components/RouteErrorBoundary'
import SiteFooterNearObserver from './components/SiteFooterNearObserver'
import ChatDockActiveBridge from './components/ChatDockActiveBridge'
import MainPage from './pages/MainPage'
import SiteNotificationsProvider from './context/SiteNotificationsContext'
import SiteAdsErrorBoundary from './components/siteAds/SiteAdsErrorBoundary'
import { CO_INVESTMENT_PATH } from './utils/sectionPaths'
import { PageSeoProvider } from './context/PageSeoContext'
import SitePageSeo from './components/SitePageSeo'
import { BuyerCabinetScrollStyles } from './components/RouteScopedStyles'

function pathnameIsAuction(pathname) {
  return pathname === '/auction' || pathname === '/main' || pathname.startsWith('/auction/')
}

const OwnerTestCabinetPageFallback = lazyWithRetry(() =>
  import('./components/OwnerTestCabinetPageFallback'),
)
const DepositRedirect = lazyWithRetry(() => import('./components/DepositRedirect'))
const CabinetDataRedirect = lazyWithRetry(() => import('./components/CabinetDataRedirect'))
const CabinetSubscriptionsRedirect = lazyWithRetry(() =>
  import('./components/CabinetSubscriptionsRedirect'),
)
const NotFoundPage = lazyWithRetry(() => import('./components/NotFoundPage'))
const LegacyOwnerCabinetRedirect = lazyWithRetry(() =>
  import('./components/LegacyRouteRedirects').then((m) => ({ default: m.LegacyOwnerCabinetRedirect })),
)
const LegacyProfileRedirect = lazyWithRetry(() =>
  import('./components/LegacyRouteRedirects').then((m) => ({ default: m.LegacyProfileRedirect })),
)
const LegacySharesIndexRedirect = lazyWithRetry(() =>
  import('./components/LegacySharesRedirect').then((m) => ({ default: m.LegacySharesIndexRedirect })),
)
const LegacySharesDetailRedirect = lazyWithRetry(() =>
  import('./components/LegacySharesRedirect').then((m) => ({ default: m.LegacySharesDetailRedirect })),
)

function OwnerTestCabinetLazyFallback() {
  return (
    <Suspense fallback={<PageFallback />}>
      <OwnerTestCabinetPageFallback />
    </Suspense>
  )
}

// Ленивая загрузка страниц — чанк грузится только при переходе на маршрут
const TestDriveLandingPage = lazyWithRetry(() => import('./pages/TestDriveLandingPage'))
const TestDriveBookingPage = lazyWithRetry(() => import('./pages/TestDriveBookingPage'))
const TestDriveCheckInRoute = lazyWithRetry(() => import('./pages/TestDriveCheckInRoute'))
const TestDriveSurveyPage = lazyWithRetry(() => import('./pages/TestDriveSurveyPage'))
const TestDriveExitFeedbackPage = lazyWithRetry(() => import('./pages/TestDriveExitFeedbackPage'))
const MapPage = lazyWithRetry(() => import('./pages/MapPage'))
const MyBookingsPage = lazyWithRetry(() => import('./pages/MyBookingsPage'))
const Subscriptions = lazyWithRetry(() => import('./pages/Subscriptions'))
const History = lazyWithRetry(() => import('./pages/History'))
const Chat = lazyWithRetry(() => import('./pages/Chat'))
const Favorites = lazyWithRetry(() => import('./pages/Favorites'))
const Compare = lazyWithRetry(() => import('./pages/Compare'))
const Bonuses = lazyWithRetry(() => import('./pages/Bonuses'))
const PrivateClub = lazyWithRetry(() => import('./pages/PrivateClub'))
const TelegramAuthCallback = lazyWithRetry(() => import('./pages/TelegramAuthCallback'))
const AddProperty = lazyWithRetry(() => import('./pages/AddProperty'))
const Wallet = lazyWithRetry(() => import('./pages/Wallet'))
const AdminPanelPage = lazyWithRetry(() => import('./admin/AdminPanelPage'))
const About = lazyWithRetry(() => import('./pages/About.tsx'))
const News = lazyWithRetry(() => import('./pages/News'))
const NewsArticlePage = lazyWithRetry(() => import('./pages/NewsArticlePage'))
const MarketerPanel = lazyWithRetry(() => import('./pages/MarketerPanel'))
const SectionsPage = lazyWithRetry(() => import('./pages/SectionsPage'))
const InvestmentCalculator = lazyWithRetry(() => import('./pages/InvestmentCalculator'))
const TestPage = lazyWithRetry(() => import('./pages/TestPage'))
const SellYourBrickLandingPage = lazyWithRetry(() => import('./pages/SellYourBrickLandingPage'))
const SellerPage = lazyWithRetry(() => import('./pages/SellerPage'))
const OwnerTestRoute = lazyWithRetry(() => import('./pages/OwnerTestRoute'), 'OwnerTestRoute')
const OwnerTestLegacyRedirect = lazyWithRetry(() =>
  import('./pages/ownerTestLegacyRedirects').then((m) => ({ default: m.OwnerTestLegacyRedirect }))
)
const OwnerTestLegacyRedirectWrapper = lazyWithRetry(() =>
  import('./pages/ownerTestLegacyRedirects').then((m) => ({ default: m.OwnerTestLegacyRedirectWrapper }))
)
const OwnerTestLegacyProfileRedirect = lazyWithRetry(() =>
  import('./pages/ownerTestLegacyRedirects').then((m) => ({ default: m.OwnerTestLegacyProfileRedirect }))
)
const CabinetProfileRoute = lazyWithRetry(() => import('./components/CabinetProfileRoute'))
const BlockedUserModal = lazyWithRetry(() => import('./components/BlockedUserModal'))
const LazyOAuthBridgePage = lazyWithRetry(() => import('./pages/OAuthBridgePage'))
const LazyFooter = lazyWithRetry(() => import('./components/Footer'))
const LazyShares = lazyWithRetry(() => import('./pages/Shares'))
const LazyShareDetailPage = lazyWithRetry(() => import('./pages/ShareDetailPage'))
const CatalogCityPage = lazyWithRetry(() => import('./pages/CatalogCityPage'))
const Home = lazyWithRetry(() => import('./pages/Home'))
const DebtsPage = lazyWithRetry(() => import('./pages/Debts'))
const SearchResults = lazyWithRetry(() => import('./pages/SearchResults'))
const PropertyDetailPage = lazyWithRetry(() => import('./pages/PropertyDetailPage'))
const PageFallback = () => (
  <div
    className="app-page-fallback app-page-fallback--instant"
    role="status"
    aria-live="polite"
  >
    <span className="app-page-fallback__sr">Загрузка</span>
  </div>
)

/** Только lazy-чанки; без отдельного Suspense вокруг маршрута — при suspend подставлялся бы общий fallback роутера. Здесь fallback — короткий однотонный кадр до появления страницы. */
function LazyPage({ children, fallback }) {
  return <Suspense fallback={fallback ?? <PageFallback />}>{children}</Suspense>
}

function AppLayoutFrame({ isBlocked, appLayoutRef, children }) {
  const { pathname } = useLocation()

  const addPropertySingleScroll =
    pathname === '/owner/property/new' || /^\/property\/[^/]+\/edit$/.test(pathname)
  const calculatorSingleScroll = pathname === '/calculator'
  const newsArticleScroll = /^\/news\/[^/]+$/.test(pathname)

  const routeClass = addPropertySingleScroll
    ? 'app-layout--add-property-single-scroll'
    : calculatorSingleScroll
      ? 'app-layout--calculator-single-scroll'
      : newsArticleScroll
        ? 'app-layout--news-article'
        : ''

  return (
    <div
      ref={appLayoutRef}
      className={`app-layout ${isBlocked ? 'app-layout--blocked' : ''}${routeClass ? ` ${routeClass}` : ''}`}
    >
      {children}
    </div>
  )
}

// Компонент для валидации сессии при запуске приложения
function isOwnerTestMockPath(pathname = '') {
  if (pathname === '/owner-test' || pathname.startsWith('/owner-test/')) return true
  if (pathname === '/main-owner-test' || pathname === '/owner-test-drive') return true
  return /^\/owner-[a-z0-9-]*-test(\/|$)/.test(pathname)
}

function SessionValidator({ onBlockedChange }) {
  useEffect(() => {
    let cancelled = false

    // Валидируем сессию при монтировании приложения
    const checkSession = async () => {
      // Сначала проверяем флаг блокировки в localStorage
      const isBlockedFlag = localStorage.getItem('isBlocked') === 'true';
      if (isBlockedFlag) {
        // Если пользователь заблокирован, не проверяем сессию дальше
        // Состояние блокировки уже установлено в основном useEffect
        console.warn('🚫 Пользователь заблокирован (найден флаг в localStorage)');
        return;
      }
      
      try {
        const result = await validateSession()
        if (cancelled) return

        if (!result.valid && result.cleared) {
          console.log('✅ Устаревшая сессия автоматически очищена при запуске приложения')
          // На mock owner-test не делаем full reload — иначе гонка с lazy-чанками даёт цикл F5
          if (!isOwnerTestMockPath(window.location.pathname)) {
            window.location.reload()
          }
        } else if (result.valid) {
          // validateSession для гостя возвращает { valid: true, user: null } — не считаем это «визитом»
          if (result.user != null) {
            console.log('✅ Сессия валидна, пользователь авторизован')
            markUserHasVisitedSite()
          }
          // Проверяем блокировку
          if (result.is_blocked) {
            console.warn('🚫 Пользователь заблокирован')
            // Сохраняем флаг блокировки
            if (result.user && result.user.id) {
              localStorage.setItem('isBlocked', 'true');
              localStorage.setItem('blockedUserId', result.user.id.toString());
            }
            onBlockedChange(true)
          } else {
            onBlockedChange(false)
          }
        } else {
          onBlockedChange(false)
        }
      } catch (error) {
        console.error('❌ Ошибка при валидации сессии:', error)
        // Не сбрасываем состояние блокировки при ошибке, если флаг уже установлен
        if (!isBlockedFlag) {
          onBlockedChange(false)
        }
      }
    }
    
    // Небольшая задержка, чтобы дать время другим компонентам инициализироваться
    const timeoutId = setTimeout(checkSession, 500)
    
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [onBlockedChange])

  return null
}

// Компонент для прокрутки страницы вверх при изменении маршрута
function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    scrollMainTo(0, 0, 'instant')
  }, [location.pathname])

  return null
}

/** Храним 2 последних внутренних маршрута для корректной кнопки «Назад» на странице объекта после Stripe. */
function RouteHistoryTracker() {
  const location = useLocation()
  useEffect(() => {
    rememberInternalRoutePath(`${location.pathname}${location.search || ''}`)
  }, [location.pathname, location.search])
  return null
}

/** Подтягивает числовой userId из userData в localStorage при навигации (легаси без Clerk). */
function NumericUserIdHydration() {
  const location = useLocation()
  useEffect(() => {
    ensureLocalUserIdFromSession()
  }, [location.pathname])
  return null
}

const VIEWPORT_DEFAULT = 'width=device-width, initial-scale=1.0'
const VIEWPORT_MAIN_NO_ZOOM =
  'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no'

/** Маршруты без масштабирования: главная, аукцион, профиль, кошелёк, бонусы, избранное. */
const NO_ZOOM_PATHS = new Set([
  '/',
  '/auction',
  '/main',
  '/profile',
  '/wallet',
  '/deposit',
  '/bonuses',
  '/favorites',
  '/compare',
])

function isNoZoomPath(pathname) {
  return NO_ZOOM_PATHS.has(pathname) || pathname.startsWith('/auction/')
}

/** Запрет pinch/жестов и масштаба Ctrl/⌘+колесо и горячих клавиш на выбранных маршрутах. */
function MainPageViewportLock() {
  const location = useLocation()
  const lockZoom = isNoZoomPath(location.pathname)

  useEffect(() => {
    const vp = document.querySelector('meta[name="viewport"]')
    if (!vp) return

    if (lockZoom) {
      vp.setAttribute('content', VIEWPORT_MAIN_NO_ZOOM)
      document.documentElement.classList.add('main-page-no-zoom')
      document.body.classList.add('main-page-no-zoom')
    } else {
      vp.setAttribute('content', VIEWPORT_DEFAULT)
      document.documentElement.classList.remove('main-page-no-zoom')
      document.body.classList.remove('main-page-no-zoom')
    }

    return () => {
      if (!lockZoom) return
      vp.setAttribute('content', VIEWPORT_DEFAULT)
      document.documentElement.classList.remove('main-page-no-zoom')
      document.body.classList.remove('main-page-no-zoom')
    }
  }, [lockZoom])

  useEffect(() => {
    if (!lockZoom) return

    const preventWheelZoom = (e) => {
      if (e.ctrlKey) e.preventDefault()
    }

    const preventKeyZoom = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      const { code, key } = e
      if (
        code === 'Equal' ||
        code === 'Minus' ||
        code === 'Digit0' ||
        code === 'NumpadAdd' ||
        code === 'NumpadSubtract' ||
        code === 'Numpad0' ||
        key === '+' ||
        key === '-' ||
        key === '=' ||
        key === '0'
      ) {
        e.preventDefault()
      }
    }

    const preventGesture = (e) => {
      e.preventDefault()
    }

    window.addEventListener('wheel', preventWheelZoom, { passive: false })
    window.addEventListener('keydown', preventKeyZoom, true)
    document.addEventListener('gesturestart', preventGesture, { passive: false })
    document.addEventListener('gesturechange', preventGesture, { passive: false })

    return () => {
      window.removeEventListener('wheel', preventWheelZoom)
      window.removeEventListener('keydown', preventKeyZoom, true)
      document.removeEventListener('gesturestart', preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
    }
  }, [lockZoom])

  return null
}

/** На /auction в мобильной вёрстке убираем горизонтальный скролл у viewport (часто даёт body, а не контент). */
function AuctionMobileOverflowLock() {
  const location = useLocation()
  const CLASS = 'auction-mobile-lock-x'

  useEffect(() => {
    const apply = () => {
      const on = pathnameIsAuction(location.pathname) && window.matchMedia('(max-width: 768px)').matches
      if (on) {
        document.documentElement.classList.add(CLASS)
        document.body.classList.add(CLASS)
      } else {
        document.documentElement.classList.remove(CLASS)
        document.body.classList.remove(CLASS)
      }
    }
    apply()
    const mq = window.matchMedia('(max-width: 768px)')
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.documentElement.classList.remove(CLASS)
      document.body.classList.remove(CLASS)
    }
  }, [location.pathname])

  return null
}

// Сохраняем реферальный ref из URL (?ref=userId) в localStorage для использования при регистрации
function ReferralCapture() {
  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const ref = params.get('ref')
    if (ref && ref.trim()) {
      localStorage.setItem('referral_id', ref.trim())
    }
  }, [location.search])
  return null
}

/**
 * Кэш списка аукциона: на /debts не запускаем — иначе батч запросов конкурирует с LCP и /properties/debts.
 * На `/` не запускаем — MainPage сам грузит approved/auctions/debts без test-timers и max-amounts.
 * На /auction — в idle, чтобы не блокировать первую отрисовку.
 */
function AuctionListPrefetch() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname === '/debts' || pathname === '/') return undefined

    let cancelled = false
    const run = () => {
      if (cancelled) return
      import('./services/auctionListCache')
        .then((m) => m.prefetchAuctionList())
        .catch((err) => console.error('❌ Prefetch auction list:', err))
    }

    const fastPaths = new Set(['/auction', '/main'])
    if (fastPaths.has(pathname) || pathnameIsAuction(pathname)) {
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(run, { timeout: 2500 })
        return () => {
          cancelled = true
          window.cancelIdleCallback(id)
        }
      }
      const t = window.setTimeout(run, 0)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }

    const t = window.setTimeout(run, 6000)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [pathname])

  return null
}

/** Флаг «уже бывал на сайте» — для вкладки Войти/Регистрация в LoginModal (localStorage + pagehide). */
function ReturningVisitorSiteTracking() {
  useEffect(() => {
    try {
      if (localStorage.getItem('isLoggedIn') === 'true') markUserHasVisitedSite()
    } catch {
      /* ignore */
    }
    return installReturningVisitorListeners()
  }, [])
  return null
}

// Компонент для очистки сессии администратора при переходе с админ-панели
function AdminSessionCleaner() {
  const location = useLocation()

  useEffect(() => {
    // Сессия администратора теперь сохраняется при выходе из админки
    // Это позволяет админу просматривать объекты через кнопку "Перейти к объекту"
    // Автоматическая очистка сессии админа отключена
  }, [location.pathname])

  return null
}

function App() {
  const appLayoutRef = useRef(null)

  // Инициализируем состояние блокировки из localStorage сразу
  const [isBlocked, setIsBlocked] = useState(() => {
    const isBlockedFlag = localStorage.getItem('isBlocked') === 'true';
    return isBlockedFlag;
  });

  // Проверяем блокировку при загрузке пользователя из localStorage
  useEffect(() => {
    const checkBlockedStatus = async () => {
      // Сначала проверяем флаг блокировки в localStorage
      const isBlockedFlag = localStorage.getItem('isBlocked') === 'true';
      const blockedUserId = localStorage.getItem('blockedUserId');
      
      if (isBlockedFlag && blockedUserId) {
        // Если есть флаг блокировки, сразу показываем модальное окно
        setIsBlocked(true);
        
        // Дополнительно проверяем статус в БД
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
          const dbUser = await fetchUserById(API_BASE_URL, blockedUserId);
          if (dbUser && dbUser.is_blocked === 1) {
            setIsBlocked(true);
          } else {
            // Если пользователь разблокирован, очищаем флаги
            localStorage.removeItem('isBlocked');
            localStorage.removeItem('blockedUserId');
            setIsBlocked(false);
          }
        } catch (error) {
          console.warn('⚠️ Не удалось проверить статус блокировки:', error);
          // Оставляем модальное окно видимым при ошибке проверки
          setIsBlocked(true);
        }
        return;
      }
      
      // Если нет флага блокировки, проверяем пользователя по его данным
      const userData = getUserData();
      // Используем числовой ID из БД (из localStorage), а не Clerk ID
      const dbUserId = localStorage.getItem('userId')
      if (userData.isLoggedIn && dbUserId && /^\d+$/.test(dbUserId)) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
          const dbUser = await fetchUserById(API_BASE_URL, dbUserId);
            if (dbUser && dbUser.is_blocked === 1) {
            // Сохраняем флаг блокировки
            localStorage.setItem('isBlocked', 'true');
            localStorage.setItem('blockedUserId', userData.id.toString());
            setIsBlocked(true);
          } else {
            // Очищаем флаги блокировки, если пользователь не заблокирован
            localStorage.removeItem('isBlocked');
            localStorage.removeItem('blockedUserId');
            setIsBlocked(false);
          }
        } catch (error) {
          console.warn('⚠️ Не удалось проверить статус блокировки:', error);
        }
      } else {
        // Очищаем флаги блокировки, если пользователь не авторизован
        localStorage.removeItem('isBlocked');
        localStorage.removeItem('blockedUserId');
        setIsBlocked(false);
      }
    };
    
    checkBlockedStatus();
    return () => {};
  }, [])

  useEffect(() => {
    runDevBackendHintOnce()
  }, [])

  return (
    <div className="app-root-fill">
    <Router>
      <BuyerCabinetScrollStyles />
      <PageSeoProvider>
      <SitePageSeo />
      <SiteNotificationsProvider>
      <div className="app-shell">
      <PropertyFavoritesProvider>
      <RouteHistoryTracker />
      <ScrollToTop />
      <NumericUserIdHydration />
      <MainPageViewportLock />
      <AuctionMobileOverflowLock />
      <ReferralCapture />
      <AuctionListPrefetch />
      <ReturningVisitorSiteTracking />
      <VisitorHeartbeat />
      <SessionValidator onBlockedChange={setIsBlocked} />
      <UserCabinetSseBridge />
      <PrivateClubKickModalHost />
      <LoggedInVerificationGatesHost isBlocked={isBlocked} />
      <AdminSessionCleaner />
      <ClerkAuthSync />
      <ClerkAuthHandlerGate />
      <GlassFilterDefs />
      <LayoutScrollRefContext.Provider value={appLayoutRef}>
      <SiteFooterNearObserver />
      <ChatDockActiveBridge />
      <AppLayoutFrame appLayoutRef={appLayoutRef} isBlocked={isBlocked}>
        <SiteAdsErrorBoundary>
          <DeferredSiteAdsHost />
        </SiteAdsErrorBoundary>
        <div className="app-layout__content">
          <RouteErrorBoundary>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route
                path="/auction"
                element={
                  <LazyPage>
                    <Home />
                  </LazyPage>
                }
              />
              <Route
                path="/auction/property/:slugOrId"
                element={
                  <LazyPage>
                    <PropertyDetailPage />
                  </LazyPage>
                }
              />
              <Route
                path="/auction/:segment1/:segment2?"
                element={
                  <LazyPage>
                    <Home />
                  </LazyPage>
                }
              />
              <Route path="/main" element={<Navigate to="/auction" replace />} />
              <Route
                path="/property/:slugOrId/test-drive"
                element={
                  <LazyPage>
                    <TestDriveBookingPage />
                  </LazyPage>
                }
              />
              <Route
                path="/test-drive/survey/:token"
                element={
                  <LazyPage>
                    <TestDriveSurveyPage />
                  </LazyPage>
                }
              />
              <Route
                path="/test-drive/feedback/:token"
                element={
                  <LazyPage>
                    <TestDriveExitFeedbackPage />
                  </LazyPage>
                }
              />
              <Route
                path="/test-drive"
                element={
                  <LazyPage>
                    <TestDriveLandingPage />
                  </LazyPage>
                }
              />
              <Route
                path="/profile/bookings/:bookingId/check-in"
                element={
                  <LazyPage>
                    <TestDriveCheckInRoute />
                  </LazyPage>
                }
              />
              <Route
                path="/property/:slugOrId"
                element={
                  <LazyPage>
                    <PropertyDetailPage />
                  </LazyPage>
                }
              />
              <Route
                path="/auction/:country/:city/property/:slugOrId"
                element={
                  <LazyPage>
                    <PropertyDetailPage />
                  </LazyPage>
                }
              />
              <Route
                path="/debts/:country/:city/property/:slugOrId"
                element={
                  <LazyPage>
                    <PropertyDetailPage />
                  </LazyPage>
                }
              />
              <Route
                path="/search-results/:country/:city/property/:slugOrId"
                element={
                  <LazyPage>
                    <PropertyDetailPage />
                  </LazyPage>
                }
              />
              <Route
                path="/search-results/:country"
                element={
                  <LazyPage>
                    <SearchResults />
                  </LazyPage>
                }
              />
              <Route
                path="/search-results/:country/:city"
                element={
                  <LazyPage>
                    <SearchResults />
                  </LazyPage>
                }
              />
              <Route
                path="/search-results"
                element={
                  <LazyPage>
                    <SearchResults />
                  </LazyPage>
                }
              />
              <Route
                path="/map"
                element={
                  <LazyPage>
                    <MapPage />
                  </LazyPage>
                }
              />
              <Route
                path="/profile/bookings"
                element={
                  <LazyPage>
                    <MyBookingsPage />
                  </LazyPage>
                }
              />
              <Route
                path="/profile"
                element={
                  <LazyPage>
                    <CabinetProfileRoute />
                  </LazyPage>
                }
              />
              <Route
                path="/profile-legacy"
                element={
                  <LazyPage>
                    <LegacyProfileRedirect />
                  </LazyPage>
                }
              />
              <Route
                path="/oauth-bridge"
                element={
                  <LazyPage>
                    <LazyOAuthBridgePage />
                  </LazyPage>
                }
              />
              <Route
                path="/auth/telegram-callback"
                element={
                  <LazyPage>
                    <TelegramAuthCallback />
                  </LazyPage>
                }
              />
              <Route
                path="/data"
                element={
                  <LazyPage>
                    <CabinetDataRedirect />
                  </LazyPage>
                }
              />
              <Route
                path="/subscriptions"
                element={
                  <LazyPage>
                    <CabinetSubscriptionsRedirect>
                      <LazyPage>
                        <Subscriptions />
                      </LazyPage>
                    </CabinetSubscriptionsRedirect>
                  </LazyPage>
                }
              />
              <Route
                path="/history"
                element={
                  <LazyPage>
                    <History />
                  </LazyPage>
                }
              />
              <Route
                path="/chat"
                element={
                  <LazyPage>
                    <Chat />
                  </LazyPage>
                }
              />
              <Route
                path="/favorites"
                element={
                  <LazyPage>
                    <Favorites />
                  </LazyPage>
                }
              />
              <Route
                path="/compare"
                element={
                  <LazyPage>
                    <Compare />
                  </LazyPage>
                }
              />
              <Route
                path="/wallet"
                element={
                  <LazyPage>
                    <Wallet />
                  </LazyPage>
                }
              />
              <Route
                path="/deposit"
                element={
                  <LazyPage>
                    <DepositRedirect />
                  </LazyPage>
                }
              />
              <Route
                path="/bonuses"
                element={
                  <LazyPage>
                    <Bonuses />
                  </LazyPage>
                }
              />
              <Route
                path={CO_INVESTMENT_PATH}
                element={
                  <LazyPage>
                    <LazyShares />
                  </LazyPage>
                }
              />
              <Route
                path="/shares"
                element={
                  <LazyPage>
                    <LegacySharesIndexRedirect />
                  </LazyPage>
                }
              />
              <Route
                path={`${CO_INVESTMENT_PATH}/:slugOrId`}
                element={
                  <LazyPage>
                    <LazyShareDetailPage />
                  </LazyPage>
                }
              />
              <Route
                path={`${CO_INVESTMENT_PATH}/:country/:city/property/:slugOrId`}
                element={
                  <LazyPage>
                    <LazyShareDetailPage />
                  </LazyPage>
                }
              />
              <Route
                path="/shares/:slugOrId"
                element={
                  <LazyPage>
                    <LegacySharesDetailRedirect />
                  </LazyPage>
                }
              />
              <Route
                path="/debts/property/:slugOrId"
                element={
                  <LazyPage>
                    <PropertyDetailPage />
                  </LazyPage>
                }
              />
              <Route
                path="/debts"
                element={
                  <LazyPage>
                    <DebtsPage />
                  </LazyPage>
                }
              />
              <Route
                path="/private-club"
                element={
                  <LazyPage>
                    <PrivateClub />
                  </LazyPage>
                }
              />
              <Route
                path="/about"
                element={
                  <LazyPage>
                    <About />
                  </LazyPage>
                }
              />
              <Route
                path="/sections"
                element={
                  <LazyPage>
                    <SectionsPage />
                  </LazyPage>
                }
              />
              <Route
                path="/sellyourbrick"
                element={
                  <LazyPage>
                    <SellYourBrickLandingPage />
                  </LazyPage>
                }
              />
              <Route
                path="/seller"
                element={
                  <LazyPage>
                    <SellerPage />
                  </LazyPage>
                }
              />
              <Route
                path="/news"
                element={
                  <LazyPage>
                    <News />
                  </LazyPage>
                }
              />
              <Route
                path="/news/:slug"
                element={
                  <LazyPage>
                    <NewsArticlePage />
                  </LazyPage>
                }
              />
              <Route
                path="/marketer"
                element={
                  <LazyPage>
                    <MarketerPanel />
                  </LazyPage>
                }
              />
              <Route
                path="/calculator"
                element={
                  <LazyPage>
                    <InvestmentCalculator />
                  </LazyPage>
                }
              />
              <Route path="/jeton" element={<Navigate to="/" replace />} />
              <Route
                path="/test"
                element={
                  <LazyPage>
                    <TestPage />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-test"
                element={
                  <LazyPage fallback={<OwnerTestCabinetLazyFallback />}>
                    <OwnerTestRoute />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-test/:view"
                element={
                  <LazyPage fallback={<OwnerTestCabinetLazyFallback />}>
                    <OwnerTestRoute />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-test/:view/:propertyId"
                element={
                  <LazyPage fallback={<OwnerTestCabinetLazyFallback />}>
                    <OwnerTestRoute />
                  </LazyPage>
                }
              />
              <Route
                path="/main-owner-test"
                element={
                  <LazyPage>
                    <OwnerTestLegacyRedirect />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-properties-test"
                element={
                  <LazyPage>
                    <OwnerTestLegacyRedirect view="properties" />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-property-analytics-test/:propertyId"
                element={
                  <LazyPage>
                    <OwnerTestLegacyRedirectWrapper />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-test-drive"
                element={
                  <LazyPage>
                    <OwnerTestLegacyRedirect view="test-drive" />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-subscriptions-test"
                element={
                  <LazyPage>
                    <OwnerTestLegacyRedirect view="subscriptions" />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-sales-test"
                element={
                  <LazyPage>
                    <OwnerTestLegacyRedirect view="sales" />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-wallet-test"
                element={
                  <LazyPage>
                    <OwnerTestLegacyRedirect view="wallet" />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-profile-test"
                element={
                  <LazyPage>
                    <OwnerTestLegacyProfileRedirect />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-add-property-test"
                element={
                  <LazyPage>
                    <OwnerTestLegacyRedirect view="add-property" />
                  </LazyPage>
                }
              />
              <Route
                path="/owner/property/new"
                element={
                  <LazyPage>
                    <AddProperty />
                  </LazyPage>
                }
              />
              <Route
                path="/owner"
                element={
                  <LazyPage>
                    <LegacyOwnerCabinetRedirect />
                  </LazyPage>
                }
              />
              <Route
                path="/property/:slugOrId/edit"
                element={
                  <LazyPage>
                    <AddProperty />
                  </LazyPage>
                }
              />
              <Route
                path="/admin"
                element={
                  <LazyPage>
                    <AdminPanelPage />
                  </LazyPage>
                }
              />
              <Route
                path="/:country/:city/:typePlural?"
                element={
                  <LazyPage>
                    <CatalogCityPage />
                  </LazyPage>
                }
              />
              <Route
                path="*"
                element={
                  <LazyPage>
                    <NotFoundPage />
                  </LazyPage>
                }
              />
            </Routes>
          </RouteErrorBoundary>
        </div>
        <Suspense
          fallback={
            <div
              className="app-footer-skeleton"
              style={{
                minHeight: 120,
                flexShrink: 0,
                background: '#ffffff',
                borderTop: '1px solid #e5e7eb',
              }}
              aria-hidden
            />
          }
        >
          <LazyFooter />
        </Suspense>
      </AppLayoutFrame>
      </LayoutScrollRefContext.Provider>
      {isBlocked && (
        <Suspense fallback={null}>
          <BlockedUserModal isOpen={true} />
        </Suspense>
      )}
      <ToastContainer />
      </PropertyFavoritesProvider>
      </div>
      </SiteNotificationsProvider>
      </PageSeoProvider>
    </Router>
    </div>
  )
}

export default App
