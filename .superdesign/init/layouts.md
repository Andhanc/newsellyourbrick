# Shared layouts

The application owns document scrolling inside `.app-layout`; pages are rendered inside `.app-layout__content` and the shared footer follows it. Mobile buyer routes either use the global `Header` or an immersive route-owned app bar, but must preserve the same provider, drawer, safe-area and scroll behavior.

## Application shell and route host

- File: `src/App.jsx`
- Purpose: Root provider stack, scroll-owning app layout, lazy route host, global gates and footer placement.

```jsx
import { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import ClerkAuthSync from './components/ClerkAuthSync'
import ClerkAuthHandler from './components/ClerkAuthHandler'
import ToastContainer from './components/ToastContainer'
import GlobalVerificationSuccessGate from './components/GlobalVerificationSuccessGate'
import VisitorHeartbeat from './components/VisitorHeartbeat'
import UserCabinetSseBridge from './components/UserCabinetSseBridge'
import PrivateClubKickModal from './components/PrivateClubKickModal'

import VerificationRejectedGate from './components/VerificationRejectedGate'
import { validateSession, getUserData, ensureLocalUserIdFromSession } from './services/authService'
import { prefetchAuctionList } from './services/auctionListCache'
import { fetchUserById } from './utils/usersApi'
import { PropertyFavoritesProvider } from './context/PropertyFavoritesContext'
import { runDevBackendHintOnce } from './utils/devBackendHint'
import { installReturningVisitorListeners, markUserHasVisitedSite } from './utils/visitorAuthDefault'
import { rememberInternalRoutePath } from './utils/propertyNavigation'
import './App.css'
import './styles/buyer-mobile-tokens.css'
import { GlassFilterDefs } from './components/ui/GlassFilterDefs'
import { LayoutScrollRefContext } from './context/LayoutScrollContext'
import { scrollMainTo } from './utils/mainScroll'
import { lazyWithRetry } from './utils/lazyWithRetry'
import RouteErrorBoundary from './components/RouteErrorBoundary'
import OwnerTestCabinetPageFallback from './components/OwnerTestCabinetPageFallback'
import SiteFooterNearObserver from './components/SiteFooterNearObserver'
import ChatDockActiveBridge from './components/ChatDockActiveBridge'
import HomeRedesignPage from './pages/home-redesign/HomeRedesignPage'
import Home from './pages/Home'
import SiteNotificationsProvider from './context/SiteNotificationsContext'
import { PurchaseSuccessProvider } from './context/PurchaseSuccessContext'
import PurchaseCheckoutSuccessBridge from './components/PurchaseCheckoutSuccessBridge'
import SiteAdsHost from './components/siteAds/SiteAdsHost'
import SiteAdsErrorBoundary from './components/siteAds/SiteAdsErrorBoundary'
import DebtsPage from './pages/Debts'
import SearchResults from './pages/SearchResults'
import PropertyDetailPage from './pages/PropertyDetailPage'
import DepositRedirect from './components/DepositRedirect'
import CabinetDataRedirect from './components/CabinetDataRedirect'
import { LegacySharesDetailRedirect, LegacySharesIndexRedirect } from './components/LegacySharesRedirect'
import { CO_INVESTMENT_PATH } from './utils/sectionRoutes'
import NotFoundPage from './components/NotFoundPage'
import { PageSeoProvider } from './context/PageSeoContext'
import SitePageSeo from './components/SitePageSeo'
import { isAuctionRoute } from './utils/auctionFilterUrl'

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
const PurchasedObjectGuidePage = lazyWithRetry(() => import('./pages/PurchasedObjectGuidePage'))
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
const BuyerPage = lazyWithRetry(() => import('./pages/BuyerPage'))
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
const LegacyProfileRedirect = lazyWithRetry(() =>
  import('./components/LegacyRouteRedirects').then((m) => ({ default: m.LegacyProfileRedirect }))
)
const LegacyOwnerCabinetRedirect = lazyWithRetry(() =>
  import('./components/LegacyRouteRedirects').then((m) => ({ default: m.LegacyOwnerCabinetRedirect }))
)
const CabinetProfileRoute = lazyWithRetry(() => import('./components/CabinetProfileRoute'))
const BlockedUserModal = lazyWithRetry(() => import('./components/BlockedUserModal'))
const LazyOAuthBridgePage = lazyWithRetry(() => import('./pages/OAuthBridgePage'))
const LazyFooter = lazyWithRetry(() => import('./components/Footer'))
const LazyShares = lazyWithRetry(() => import('./pages/Shares'))
const LazyShareDetailPage = lazyWithRetry(() => import('./pages/ShareDetailPage'))
const CatalogCityPage = lazyWithRetry(() => import('./pages/CatalogCityPage'))
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
  const homePageScroll = pathname === '/'

  const routeClass = homePageScroll
    ? 'app-layout--investor-home'
    : addPropertySingleScroll
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
      const on = isAuctionRoute(location.pathname) && window.matchMedia('(max-width: 768px)').matches
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

/** После первого кадра подгружаем чанк карты в idle — реже однотонный fallback при первом заходе на /map. */
function HeavyRouteChunksPrefetch() {
  useEffect(() => {
    let cancelled = false
    let idleId = null
    let timeoutId = null
    const rafIds = []

    const run = () => {
      if (cancelled) return
      void import('./pages/MapPage')
    }

    const schedule = () => {
      if (cancelled) return
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(run, { timeout: 600 })
      } else {
        timeoutId = window.setTimeout(run, 0)
      }
    }

    rafIds.push(
      requestAnimationFrame(() => {
        rafIds.push(requestAnimationFrame(schedule))
      }),
    )

    return () => {
      cancelled = true
      rafIds.forEach((id) => cancelAnimationFrame(id))
      if (idleId != null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
      if (timeoutId != null) window.clearTimeout(timeoutId)
    }
  }, [])
  return null
}

/**
 * Кэш списка аукциона: на /debts не запускаем — иначе батч запросов конкурирует с LCP и /properties/debts.
 * На главных маршрутах — в idle, чтобы не блокировать первую отрисовку.
 */
function AuctionListPrefetch() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (pathname === '/debts') return undefined

    let cancelled = false
    const run = () => {
      if (!cancelled) prefetchAuctionList()
    }

    const fastPaths = new Set(['/', '/auction', '/main'])
    if (fastPaths.has(pathname)) {
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

  useEffect(() => {
    void import('./styles/buyer-cabinet-scroll.css')
  }, [])

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
      <PageSeoProvider>
      <SitePageSeo />
      <SiteNotificationsProvider>
      <PurchaseSuccessProvider>
      <PurchaseCheckoutSuccessBridge />
      <div className="app-shell">
      <PropertyFavoritesProvider>
      <RouteHistoryTracker />
      <ScrollToTop />
      <NumericUserIdHydration />
      <MainPageViewportLock />
      <AuctionMobileOverflowLock />
      <ReferralCapture />
      <AuctionListPrefetch />
      <HeavyRouteChunksPrefetch />
      <ReturningVisitorSiteTracking />
      <VisitorHeartbeat />
      <SessionValidator onBlockedChange={setIsBlocked} />
      <UserCabinetSseBridge />
      <PrivateClubKickModal />
      <GlobalVerificationSuccessGate />
      <VerificationRejectedGate blockedUser={isBlocked} />
      <AdminSessionCleaner />
      <ClerkAuthSync />
      <ClerkAuthHandler />
      <GlassFilterDefs />
      <LayoutScrollRefContext.Provider value={appLayoutRef}>
      <SiteFooterNearObserver />
      <ChatDockActiveBridge />
      <AppLayoutFrame appLayoutRef={appLayoutRef} isBlocked={isBlocked}>
        <SiteAdsErrorBoundary>
          <SiteAdsHost />
        </SiteAdsErrorBoundary>
        <div className="app-layout__content">
          <RouteErrorBoundary>
            <Routes>
              <Route path="/" element={<HomeRedesignPage />} />
              <Route path="/auction" element={<Home />} />
              <Route path="/auction/property/:slugOrId" element={<PropertyDetailPage />} />
              <Route path="/auction/:segment1/:segment2?" element={<Home />} />
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
              <Route path="/property/:slugOrId" element={<PropertyDetailPage />} />
              <Route
                path="/auction/:country/:city/property/:slugOrId"
                element={<PropertyDetailPage />}
              />
              <Route
                path="/debts/:country/:city/property/:slugOrId"
                element={<PropertyDetailPage />}
              />
              <Route
                path="/search-results/:country/:city/property/:slugOrId"
                element={<PropertyDetailPage />}
              />
              <Route path="/search-results/:country" element={<SearchResults />} />
              <Route path="/search-results/:country/:city" element={<SearchResults />} />
              <Route path="/search-results" element={<SearchResults />} />
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
                path="/profile/purchased/:propertyId"
                element={
                  <LazyPage>
                    <PurchasedObjectGuidePage />
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
              <Route path="/data" element={<CabinetDataRedirect />} />
              <Route
                path="/subscriptions"
                element={
                  <LazyPage>
                    <Subscriptions />
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
              <Route path="/deposit" element={<DepositRedirect />} />
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
              <Route path="/shares" element={<LegacySharesIndexRedirect />} />
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
              <Route path="/shares/:slugOrId" element={<LegacySharesDetailRedirect />} />
              <Route path="/debts/property/:slugOrId" element={<PropertyDetailPage />} />
              <Route path="/debts" element={<DebtsPage />} />
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
                path="/buyer"
                element={
                  <LazyPage>
                    <BuyerPage />
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
              <Route path="/home-redesign" element={<Navigate to="/" replace />} />
              <Route
                path="/owner-test"
                element={
                  <LazyPage fallback={<OwnerTestCabinetPageFallback />}>
                    <OwnerTestRoute />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-test/:view"
                element={
                  <LazyPage fallback={<OwnerTestCabinetPageFallback />}>
                    <OwnerTestRoute />
                  </LazyPage>
                }
              />
              <Route
                path="/owner-test/:view/:propertyId"
                element={
                  <LazyPage fallback={<OwnerTestCabinetPageFallback />}>
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
                path="/owner"
                element={
                  <LazyPage>
                    <LegacyOwnerCabinetRedirect />
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
              <Route path="*" element={<NotFoundPage />} />
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
      </PurchaseSuccessProvider>
      </SiteNotificationsProvider>
      </PageSeoProvider>
    </Router>
    </div>
  )
}

export default App
```

## Shared site header

- File: `src/components/Header.jsx`
- Purpose: Responsive buyer/site header with search/navigation/auth/profile/notifications entry points.

```jsx
import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation, Link, NavLink } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  FiSearch,
  FiChevronDown,
  FiX,
  FiUser,
  FiGlobe,
} from 'react-icons/fi'
import { isInlineAiChatRoute } from '../utils/inlineAiChatRoutes'
import { getUserData, clearUserData } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import { navigateToWallet } from '../utils/walletNavigation'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { fetchUserById } from '../utils/usersApi'
/** Стили шапки (new-header*, меню, поиск и т.д.) определены в MainPage.css — импорт намеренно общий для визуального паритета. */
import '../pages/MainPage.css'
import { NotificationsBell } from '../context/SiteNotificationsContext'
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon'
import {
  getCabinetDataPath,
  getCabinetHomePath,
  getCabinetProfilePath,
  getCabinetSubscriptionsPath,
  isSellerCabinetRole,
} from '../utils/cabinetRoutes'
import { UI_LANGUAGES } from '../constants/uiLanguages'
import { setSiteNavDrawerOpen } from '../utils/siteNavDrawerDocumentFlag'
import HeaderPinnedCatalogNav from './HeaderPinnedCatalogNav'

const LoginModalLazy = lazy(() => import('./LoginModal'))
const SiteNavDrawerLazy = lazy(() => import('./SiteNavDrawer'))

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { user, isLoaded: userLoaded } = useUser()
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuClosing, setIsMenuClosing] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  /** wizard: иконка человечка / «Войти» в меню — сначала роль, потом вход/регистрация */
  const [loginModalEntry, setLoginModalEntry] = useState('direct')
  const [userPhoto, setUserPhoto] = useState(null) // Фотография пользователя
  const [isLoggedIn, setIsLoggedIn] = useState(false) // Статус авторизации
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false) // Состояние AI чата для страницы аукцион
  const [isManagerChatOpen, setIsManagerChatOpen] = useState(false)
  const [isGlobalAiModalOpen, setIsGlobalAiModalOpen] = useState(false)
  const languageDropdownRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)
  const searchWrapperRef = useRef(null)

  const checkProfileCompleteness = (userData) => {
    if (!userData || typeof userData !== 'object') return true

    const hasFirstName = Boolean(userData.first_name || userData.firstName || userData.name)
    const hasLastName = Boolean(userData.last_name || userData.lastName)
    const hasEmail = Boolean(userData.email)
    const hasPhone = Boolean(userData.phone || userData.phone_number)
    const hasAddress = Boolean(userData.address)
    const hasPassportSeries = Boolean(userData.passport_series)
    const hasPassportNumber = Boolean(userData.passport_number)

    const missingBasicFields = !hasFirstName || !hasLastName || (!hasEmail && !hasPhone)
    const missingOptionalFields = !hasAddress || (!hasPassportSeries && !hasPassportNumber)
    return missingBasicFields || missingOptionalFields
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setIsLanguageOpen(false)
      }
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target) && isSearchOpen) {
        // Не закрываем поиск при клике вне, только если это не клик на другие элементы хедера
        const headerElements = document.querySelectorAll('.new-header__search-btn, .new-header__user-btn, .new-header__notification-btn, .new-header__auction-btn')
        const clickedOnHeaderElement = Array.from(headerElements).some(el => el.contains(event.target))
        if (!clickedOnHeaderElement) {
          setSearchResults([])
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSearchOpen])

  useEffect(() => {
    if (isMenuOpen) {
      const main = document.querySelector('.app-layout')
      const originalOverflow = main ? main.style.overflow : document.body.style.overflow
      if (main) main.style.overflow = 'hidden'
      else document.body.style.overflow = 'hidden'
      return () => {
        if (main) main.style.overflow = originalOverflow
        else document.body.style.overflow = originalOverflow
      }
    }
  }, [isMenuOpen])

  useEffect(() => {
    setSiteNavDrawerOpen(isMenuOpen)
    return () => setSiteNavDrawerOpen(false)
  }, [isMenuOpen])

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  // Слушаем события изменения состояния AI чата
  useEffect(() => {
    const handleAIChatStateChange = (event) => {
      setIsAIChatOpen(event.detail.isOpen)
    }

    window.addEventListener('aiChatStateChange', handleAIChatStateChange)

    return () => {
      window.removeEventListener('aiChatStateChange', handleAIChatStateChange)
    }
  }, [])

  useEffect(() => {
    const onManager = (event) => {
      setIsManagerChatOpen(Boolean(event.detail?.isOpen))
    }
    window.addEventListener('managerChatStateChange', onManager)
    return () => window.removeEventListener('managerChatStateChange', onManager)
  }, [])

  useEffect(() => {
    const onOpenAIChat = () => {
      if (!isInlineAiChatRoute(location.pathname)) {
        setIsGlobalAiModalOpen(true)
      }
    }
    window.addEventListener('openAIChat', onOpenAIChat)
    return () => window.removeEventListener('openAIChat', onOpenAIChat)
  }, [location.pathname])

  useEffect(() => {
    if (!isGlobalAiModalOpen) return undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isGlobalAiModalOpen])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('globalAiModalStateChange', { detail: { isOpen: isGlobalAiModalOpen } })
    )
  }, [isGlobalAiModalOpen])

  // Открываем модальное окно регистрации/входа принудительно (например после OAuth)
  useEffect(() => {
    const forceOpen = sessionStorage.getItem('login_modal_force_open')
    if (forceOpen === 'true') {
      const wantWizard = sessionStorage.getItem('login_modal_force_wizard') === 'true'
      sessionStorage.removeItem('login_modal_force_open')
      sessionStorage.removeItem('login_modal_force_wizard')
      setLoginModalEntry(wantWizard ? 'wizard' : 'direct')
      setIsLoginModalOpen(true)
    }
  }, [location.pathname])

  // Дополнительно: ловим кастомное событие от OAuth-обработчиков.
  // Это важно, если URL не менялся (например, мы уже на '/').
  useEffect(() => {
    const onForceOpenLoginModal = () => {
      const forceOpen = sessionStorage.getItem('login_modal_force_open')
      if (forceOpen !== 'true') return
      const wantWizard = sessionStorage.getItem('login_modal_force_wizard') === 'true'
      sessionStorage.removeItem('login_modal_force_open')
      sessionStorage.removeItem('login_modal_force_wizard')
      setLoginModalEntry(wantWizard ? 'wizard' : 'direct')
      setIsLoginModalOpen(true)
    }

    window.addEventListener('forceOpenLoginModal', onForceOpenLoginModal)
    return () => {
      window.removeEventListener('forceOpenLoginModal', onForceOpenLoginModal)
    }
  }, [])

  // Загружаем фотографию пользователя при изменении авторизации
  useEffect(() => {
    const loadUserPhoto = async () => {
      // Проверяем авторизацию через Clerk
      if (userLoaded && user) {
        // Пользователь авторизован через Clerk, но нам важно понять:
        // есть ли он в нашей БД (localStorage->userId + реальный запрос в БД).
        // Иначе после очистки БД/ручных сценариев мы не должны считать пользователя залогиненным.
        const clerkPhoto = user.imageUrl || user.profileImageUrl || null

        const dbUserId = localStorage.getItem('userId')
        const hasNumericDbUserId = dbUserId && /^\d+$/.test(String(dbUserId))

        // Если userId в localStorage отсутствует — считаем, что в БД пользователя нет.
        if (!hasNumericDbUserId) {
          setUserPhoto(clerkPhoto)
          setIsLoggedIn(false)
          setHasIncompleteProfile(false)
          return
        }

        try {
          const API_BASE_URL = await getApiBaseUrl()
          const userResult = await fetchUserById(API_BASE_URL, dbUserId, { includeMeta: true })

          // Пользователь отсутствует в БД — сбрасываем localStorage
          if (userResult.notFound) {
            clearUserData()
            setIsLoggedIn(false)
            setUserPhoto(null)
            setHasIncompleteProfile(false)
            return
          }

          if (userResult.ok) {
            setIsLoggedIn(true)
            setUserPhoto(clerkPhoto)
            setHasIncompleteProfile(checkProfileCompleteness(userResult.user))
            return
          }

          // Любая другая ошибка — считаем, что пользователь не валиден для нашего приложения
          setIsLoggedIn(false)
          setUserPhoto(clerkPhoto)
          setHasIncompleteProfile(false)
        } catch (e) {
          console.warn('Header: Failed to validate Clerk user in DB', e)
          setIsLoggedIn(false)
          setUserPhoto(clerkPhoto)
          setHasIncompleteProfile(false)
        }
      } else {
        // Проверяем старую систему авторизации
        const userData = getUserData()
        if (userData.isLoggedIn) {
          setIsLoggedIn(true)

          // Сначала пытаемся получить фотографию из localStorage
          let photo = userData.picture || null

          // Если фотографии нет в localStorage, пытаемся загрузить из БД
          // Используем числовой ID из БД (из localStorage), а не Clerk ID
          const dbUserId = localStorage.getItem('userId')
          if (!photo && dbUserId && /^\d+$/.test(dbUserId)) {
            try {
              const API_BASE_URL = await getApiBaseUrl()
              const result = await fetchUserById(API_BASE_URL, dbUserId, { includeMeta: true })

              // Если пользователь в БД не найден (например, был удален админом) —
              // принудительно сбрасываем локальную сессию
              if (result.notFound) {
                console.warn('⚠️ Локальная сессия пользователя устарела: пользователь не найден в БД. Очищаем данные.')
                clearUserData()
                setIsLoggedIn(false)
                setUserPhoto(null)
                setHasIncompleteProfile(false)
                return
              }

              if (result.ok && result.user?.user_photo) {
                // Если user_photo начинается с /uploads, добавляем базовый URL
                const photoPath = result.user.user_photo
                const baseUrl = API_BASE_URL.replace('/api', '')
                photo = photoPath.startsWith('http')
                  ? photoPath
                  : `${baseUrl}${photoPath}`

                // Обновляем localStorage с фотографией
                const updatedUserData = {
                  ...userData,
                  picture: photo
                }
                localStorage.setItem('userData', JSON.stringify(updatedUserData))
              }

              if (result.ok && result.user) {
                setHasIncompleteProfile(checkProfileCompleteness(result.user))
              } else {
                const profileIncomplete = !userData.name || (!userData.email && !userData.phone)
                setHasIncompleteProfile(profileIncomplete)
              }
            } catch (error) {
              console.warn('⚠️ Не удалось загрузить фотографию из БД:', error)
              const profileIncomplete = !userData.name || (!userData.email && !userData.phone)
              setHasIncompleteProfile(profileIncomplete)
            }
          }
          if (!dbUserId || !/^\d+$/.test(dbUserId)) {
            const profileIncomplete = !userData.name || (!userData.email && !userData.phone)
            setHasIncompleteProfile(profileIncomplete)
          }

          setUserPhoto(photo)
        } else {
          setIsLoggedIn(false)
          setUserPhoto(null)
          setHasIncompleteProfile(false)
        }
      }
    }

    loadUserPhoto()

    // Обновляем фотографию при фокусе окна (когда пользователь возвращается на страницу)
    const handleFocus = () => {
      loadUserPhoto()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, userLoaded, location.pathname]) // Обновляем при изменении маршрута

  const headerLangCode = (i18n.language || 'ru').split('-')[0]
  const currentHeaderLanguage =
    UI_LANGUAGES.find((lang) => lang.code === headerLangCode) || UI_LANGUAGES[0]

  const handleHeaderLanguageSelect = async (langCode) => {
    try {
      await i18n.changeLanguage(langCode)
    } catch (e) {
      console.error('Header: language change failed', e)
    }
    setIsLanguageOpen(false)
  }

  // Определение страниц для поиска
  const cabinetProfilePath = getCabinetProfilePath()
  const cabinetDataPath = getCabinetDataPath()
  const cabinetSubscriptionsPath = getCabinetSubscriptionsPath()
  const sellerCabinet = isSellerCabinetRole()
  const searchablePages = [
    { path: '/', keywords: ['главная', 'home', 'начало', 'старт'], titleKey: 'home', requiresAuth: false, allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] },
    {
      path: '/sections',
      keywords: ['разделы', 'sections', 'рубрики', 'навигация', 'раздел'],
      titleKey: 'sectionsNavTitle',
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'],
    },
    { path: '/auction', keywords: ['аукцион', 'auction', 'торги', 'продажа', 'недвижимость'], titleKey: 'auction', requiresAuth: false, allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] },
    { path: '/map', keywords: ['карта', 'map', 'карты', 'локация', 'место'], titleKey: 'mapLink', requiresAuth: true, allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] },
    { path: '/calculator', keywords: ['калькулятор', 'calculator', 'доходность', 'рендита', 'profitability', 'доход', 'инвестиции'], titleKey: 'calculator', requiresAuth: false, allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] },
    { path: '/chat?manager=1', keywords: ['чат', 'chat', 'сообщения', 'messages', 'переписка'], titleKey: 'chat', requiresAuth: true, allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] },
    { path: cabinetProfilePath, keywords: ['профиль', 'profile', 'аккаунт', 'личный кабинет', 'настройки', 'settings'], titleKey: 'profile', requiresAuth: true, allowedRoles: sellerCabinet ? ['seller', 'owner', 'admin'] : ['buyer', 'client', 'admin'] },
    { path: '/favorites', keywords: ['избранное', 'favorites', 'избранные', 'закладки', 'bookmarks'], titleKey: 'favorites', requiresAuth: true, allowedRoles: ['buyer', 'client', 'admin'] },
    {
      path: '/deposit',
      keywords: ['кошелек', 'wallet', 'депозит', 'deposit', 'баланс', 'balance', 'деньги', 'money', 'платежи', 'payments'],
      titleKey: 'wallet',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'],
    },
    { path: cabinetDataPath, keywords: ['данные', 'data', 'информация', 'information', 'персональные данные'], titleKey: 'data', requiresAuth: true, allowedRoles: sellerCabinet ? ['seller', 'owner', 'admin'] : ['buyer', 'client', 'admin'] },
    { path: cabinetSubscriptionsPath, keywords: ['подписки', 'subscriptions', 'подписка', 'subscription', 'тарифы', 'tariffs'], titleKey: 'subscriptions', requiresAuth: true, allowedRoles: ['buyer', 'client', 'seller', 'owner', 'admin'] },
    { path: '/history', keywords: ['история', 'history', 'история покупок', 'покупки', 'purchases'], titleKey: 'history', requiresAuth: true, allowedRoles: ['buyer', 'client', 'admin'] },
    { path: '/bonuses', keywords: ['бонусы', 'bonuses', 'промокод', 'промокоды', 'задания'], titleKey: 'bonuses', requiresAuth: true, allowedRoles: ['buyer', 'client', 'admin'] },
    { path: '/owner-test', keywords: ['кабинет продавца', 'owner', 'продавец', 'seller', 'владелец', 'dashboard', 'дашборд'], titleKey: 'ownerDashboard', requiresAuth: true, requiresRole: ['seller', 'owner'], allowedRoles: ['seller', 'owner', 'admin'] },
    { path: '/owner/property/new', keywords: ['добавить недвижимость', 'add property', 'новая недвижимость', 'создать объявление', 'разместить'], titleKey: 'addProperty', requiresAuth: true, requiresRole: ['seller', 'owner'], allowedRoles: ['seller', 'owner', 'admin'] },
    { path: '/admin', keywords: ['админ', 'admin', 'администратор', 'administrator', 'панель администратора', 'админка'], titleKey: 'adminPanel', requiresAuth: true, requiresRole: ['admin'], allowedRoles: ['admin'] }
  ]

  // Получение текущей роли пользователя
  const getUserRole = () => {
    const userData = getUserData()
    const localRole = localStorage.getItem('userRole')
    const storedRole = userData.role || localRole || 'client'
    const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true' && storedRole === 'admin'
    const isOwner = storedRole === 'seller' || storedRole === 'owner' || localStorage.getItem('isOwnerLoggedIn') === 'true'

    // Админ имеет приоритет
    if (isAdmin) return 'admin'

    // Проверяем продавца/владельца
    if (isOwner) {
      return storedRole === 'seller' ? 'seller' : 'owner'
    }

    // Все остальные - покупатели (buyer или client)
    // Если роль явно указана как buyer, возвращаем buyer, иначе client
    return (storedRole === 'buyer' || storedRole === 'client') ? storedRole : 'client'
  }

  // Функция поиска страниц
  const searchPages = (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const queryLower = query.toLowerCase().trim()
    const currentUserRole = getUserRole()

    const results = searchablePages
      .filter(page => {
        // Проверяем совпадение по ключевым словам
        const matchesKeywords = page.keywords.some(keyword =>
          keyword.toLowerCase().includes(queryLower) || queryLower.includes(keyword.toLowerCase())
        )

        // Проверяем совпадение по названию
        const matchesTitle = t(page.titleKey).toLowerCase().includes(queryLower)

        if (!(matchesKeywords || matchesTitle)) {
          return false
        }

        // Фильтруем по роли пользователя
        // Если пользователь не авторизован, показываем только страницы без авторизации
        const userData = getUserData()
        const isUserLoggedIn = isLoggedIn || (userLoaded && user) || userData.isLoggedIn

        if (!isUserLoggedIn) {
          return !page.requiresAuth
        }

        // Если страница доступна всем ролям или не указаны ограничения
        if (!page.allowedRoles || page.allowedRoles.length === 0) {
          return true
        }

        // Строго проверяем, есть ли роль пользователя в списке разрешенных
        // Если роли нет в списке - страница НЕ показывается вообще
        return page.allowedRoles.includes(currentUserRole)
      })
      .map(page => ({
        ...page,
        // Проверяем авторизацию
        canAccess: checkPageAccess(page)
      }))

    setSearchResults(results)
  }

  // Проверка доступа к странице
  const checkPageAccess = (page) => {
    // Если страница не требует авторизации
    if (!page.requiresAuth) {
      return { allowed: true }
    }

    // Проверяем авторизацию
    const userData = getUserData()
    const isUserLoggedIn = isLoggedIn || (userLoaded && user) || userData.isLoggedIn

    if (!isUserLoggedIn) {
      return {
        allowed: false,
        reason: 'auth',
        message: 'Для доступа к этой странице необходимо войти в систему'
      }
    }

    // Проверяем роль, если требуется
    if (page.requiresRole) {
      const userRole = userData.role || localStorage.getItem('userRole') || 'client'
      const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true' && userRole === 'admin'
      const isOwner = userRole === 'seller' || userRole === 'owner' || localStorage.getItem('isOwnerLoggedIn') === 'true'

      if (page.requiresRole.includes('admin') && !isAdmin) {
        return {
          allowed: false,
          reason: 'role',
          message: 'Доступ только для администраторов'
        }
      }

      if (page.requiresRole.includes('seller') && !isOwner && !isAdmin) {
        return {
          allowed: false,
          reason: 'role',
          message: 'Доступ только для продавцов'
        }
      }
    }

    return { allowed: true }
  }

  const openLoginOrNavigate = (path, closeMenu = false) => {
    if (!isSiteUserSignedIn(user, userLoaded)) {
      setLoginModalEntry('wizard')
      setIsLoginModalOpen(true)
      if (closeMenu) setIsMenuOpen(false)
      return
    }
    if (path === '/chat?manager=1' || String(path).startsWith('/chat?manager=')) {
      window.dispatchEvent(new CustomEvent('openManagerChat'))
      if (closeMenu) setIsMenuOpen(false)
      return
    }
    navigate(path)
    if (closeMenu) setIsMenuOpen(false)
  }

  const openWalletFromMenu = (closeMenu = false) => {
    if (!isSiteUserSignedIn(user, userLoaded)) {
      setLoginModalEntry('wizard')
      setIsLoginModalOpen(true)
      if (closeMenu) setIsMenuOpen(false)
      return
    }
    navigateToWallet(navigate, location.pathname)
    if (closeMenu) setIsMenuOpen(false)
  }

  const openAiAssistantFromHeader = () => {
    window.dispatchEvent(new CustomEvent('openAIChat'))
  }

  // Обработка выбора результата поиска
  const handleSearchResultClick = (page) => {
    const access = checkPageAccess(page)

    if (!access.allowed) {
      if (access.reason === 'auth') {
        setIsSearchOpen(false)
        setSearchQuery('')
        setLoginModalEntry('direct')
        setIsLoginModalOpen(true)
      } else {
        // Показываем сообщение об ошибке доступа
        alert(access.message)
      }
      return
    }

    // Переходим на страницу
    if (page.path === '/deposit' || page.path === '/wallet') {
      navigateToWallet(navigate, location.pathname)
    } else {
      navigate(page.path)
    }
    setIsSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  // Обработка изменения поискового запроса
  useEffect(() => {
    if (isSearchOpen && searchQuery.trim()) {
      searchPages(searchQuery)
    } else if (!searchQuery.trim()) {
      setSearchResults([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, isSearchOpen])

  return (
    <>
      {/* Новый хедер для десктопной версии */}
      <div className="new-header-spacer" aria-hidden="true" />
      <header className={`new-header ${isMenuOpen ? 'new-header--menu-open' : ''}`}>
        <div className={`new-header__container ${isMenuOpen ? 'new-header__container--menu-open' : ''}`}>
          <div className="new-header__left">
            <div className="new-header__location">
              <span className="new-header__location-icon">
                <FiGlobe size={20} aria-hidden />
              </span>
              <div className="new-header__location-info" ref={languageDropdownRef}>
                <span className="new-header__location-label">{t('headerLanguage')}</span>
                <button
                  type="button"
                  className="new-header__location-select"
                  onClick={() => setIsLanguageOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isLanguageOpen}
                  aria-label={t('selectLanguageAria')}
                >
                  <span className="new-header__location-value">{currentHeaderLanguage.name}</span>
                  <FiChevronDown
                    size={16}
                    className={`new-header__location-select-icon ${
                      isLanguageOpen ? 'new-header__location-select-icon--open' : ''
                    }`}
                  />
                </button>
                {isLanguageOpen && (
                  <div className="new-header__location-dropdown">
                    {UI_LANGUAGES.map((lang) => (
                      <button
                        type="button"
                        className={`new-header__location-option ${
                          lang.code === headerLangCode ? 'new-header__location-option--active' : ''
                        }`}
                        key={lang.code}
                        onClick={() => handleHeaderLanguageSelect(lang.code)}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={`new-header__menu-wrapper ${isMenuOpen ? 'new-header__menu-wrapper--active' : ''}`} ref={menuRef}>
              <button
                className={`new-header__menu-btn ${isMenuOpen ? 'new-header__menu-btn--active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (isMenuOpen) {
                    setIsMenuClosing(true)
                    setTimeout(() => {
                      setIsMenuOpen(false)
                      setIsMenuClosing(false)
                    }, 300)
                  } else {
                    setIsMenuOpen(true)
                  }
                }}
                aria-label={t('menu')}
                aria-expanded={isMenuOpen}
              >
                <MenuToggleIcon open={isMenuOpen} className="new-header__menu-icon" duration={500} />
                <span>{t('menu')}</span>
              </button>
            </div>

            {(isMenuOpen || isMenuClosing) ? (
              <Suspense fallback={null}>
                <SiteNavDrawerLazy
              menuRef={menuRef}
              isMenuOpen={isMenuOpen}
              isMenuClosing={isMenuClosing}
              setIsMenuOpen={setIsMenuOpen}
              setIsMenuClosing={setIsMenuClosing}
              isLoggedIn={isLoggedIn}
              isManagerChatOpen={isManagerChatOpen}
              aiConsultantOpen={isAIChatOpen}
              openLoginOrNavigate={openLoginOrNavigate}
              openWalletFromMenu={openWalletFromMenu}
              onOpenLoginWizard={() => {
                setLoginModalEntry('wizard')
                setIsLoginModalOpen(true)
                setIsMenuOpen(false)
              }}
                />
              </Suspense>
            ) : null}
          </div>

          <div className="new-header__filters">
                       <button
              type="button"
              className={`new-header__filter-btn ${
                location.pathname === '/chat' || isManagerChatOpen ? 'new-header__filter-btn--active' : ''
              }`}
              onClick={() => openLoginOrNavigate('/chat?manager=1')}
            >
              <span>{t('chat')}</span>
            </button>
            <button
              type="button"
              className={`new-header__filter-btn ${location.pathname === '/favorites' ? 'new-header__filter-btn--active' : ''}`}
              onClick={() => navigate('/favorites')}
            >
              <span>{t('favorites')}</span>
            </button>
            <button
              type="button"
              className={`new-header__filter-btn ${
                isInlineAiChatRoute(location.pathname)
                  ? isAIChatOpen
                    ? 'new-header__filter-btn--active'
                    : ''
                  : location.pathname === '/chat'
                    ? 'new-header__filter-btn--active'
                    : ''
              }`}
              onClick={() => {
                openAiAssistantFromHeader()
              }}
            >
              <span>{t('aiAssistant')}</span>
            </button>
            <button
              type="button"
              className={`new-header__filter-btn ${location.pathname === '/map' ? 'new-header__filter-btn--active' : ''}`}
              onClick={() => openLoginOrNavigate('/map')}
            >
              <span>{t('map')}</span>
            </button>
          </div>

          <div className="new-header__right">
            {isSearchOpen ? (
              <div className="new-header__search-wrapper" ref={searchWrapperRef}>
                <div className="new-header__search-field">
                  <FiSearch size={18} className="new-header__search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={t('search')}
                    className="new-header__search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsSearchOpen(false)
                        setSearchQuery('')
                        setSearchResults([])
                      } else if (e.key === 'Enter' && searchResults.length > 0) {
                        // Переходим на первую доступную страницу
                        const firstAccessible = searchResults.find(r => r.canAccess.allowed)
                        if (firstAccessible) {
                          handleSearchResultClick(firstAccessible)
                        } else if (searchResults[0]) {
                          handleSearchResultClick(searchResults[0])
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="new-header__search-close"
                    onClick={() => {
                      setIsSearchOpen(false)
                      setSearchQuery('')
                      setSearchResults([])
                    }}
                    aria-label={t('closeSearch')}
                  >
                    <FiX size={18} />
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="new-header__search-results">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.path}-${index}`}
                        type="button"
                        className={`new-header__search-result ${!result.canAccess.allowed ? 'new-header__search-result--disabled' : ''}`}
                        onClick={() => handleSearchResultClick(result)}
                        disabled={!result.canAccess.allowed}
                      >
                        <span className="new-header__search-result-title">{t(result.titleKey)}</span>
                        {!result.canAccess.allowed && (
                          <span className="new-header__search-result-hint">
                            {result.canAccess.reason === 'auth' ? `🔒 ${t('authRequired')}` : `⚠️ ${t('noAccess')}`}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.trim() && searchResults.length === 0 && (
                  <div className="new-header__search-results">
                    <div className="new-header__search-result new-header__search-result--no-results">
                      <span>{t('nothingFound')}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  className="new-header__search-btn"
                  onClick={() => {
                    setIsSearchOpen(true)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  aria-label={t('openSearch')}
                >
                  <FiSearch size={20} />
                </button>
                <HeaderPinnedCatalogNav />
                <button
                  className={`new-header__user-btn ${isLoggedIn ? 'new-header__user-btn--avatar' : ''}`}
                  onClick={() => {
                    // Если вход через соцсеть завершился без создания пользователя в БД,
                    // то мы должны открыть регистрацию, а не отправлять на /profile.
                    const oauthFlowMode = sessionStorage.getItem('clerk_oauth_flow_mode')
                    const forcedOpen = sessionStorage.getItem('login_modal_force_open') === 'true'
                    const forcedMode = sessionStorage.getItem('login_modal_mode')

                    if (forcedOpen || forcedMode === 'register' || oauthFlowMode === 'login') {
                      const wantWizard = sessionStorage.getItem('login_modal_force_wizard') === 'true'
                      if (wantWizard) sessionStorage.removeItem('login_modal_force_wizard')
                      setLoginModalEntry(wantWizard ? 'wizard' : 'direct')
                      setIsLoginModalOpen(true)
                      return
                    }

                    // Всегда сначала пробуем прочитать локальные данные (роль, флаги)
                    const userData = getUserData()
                    const localRole = localStorage.getItem('userRole')
                    const storedRole = userData.role || localRole
                    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true'
                    const isAdmin = isAdminLoggedIn && storedRole === 'admin'
                    const isOwnerFlag = localStorage.getItem('isOwnerLoggedIn') === 'true'
                    const isOwner =
                      storedRole === 'seller' ||
                      storedRole === 'owner' ||
                      isOwnerFlag

                    // Если по локальным данным видно, что это админ — ведем в админ-панель
                    if (isAdmin) {
                      navigate('/admin')
                      return
                    }

                    // Если по локальным данным видно, что это продавец — ведем в кабинет продавца
                    if (isOwner) {
                      navigate(getCabinetHomePath('seller'))
                      return
                    }

                    // Дальше проверяем авторизацию через Clerk и локальную авторизацию покупателя
                    const localHasDbUser = userData.isLoggedIn && /^\d+$/.test(String(localStorage.getItem('userId') || ''))

                    // Если есть Clerk-сессия, но в нашей БД нет пользователя — открываем модалку,
                    // иначе будем снова попадать в сценарии "зарегистрируйся".
                    if (userLoaded && user && !localHasDbUser) {
                      if (oauthFlowMode === 'login') {
                        sessionStorage.setItem('login_modal_mode', 'register')
                      }
                      setLoginModalEntry('direct')
                      setIsLoginModalOpen(true)
                      return
                    }

                    // Переходим в профиль, если Clerk привязан к записи в нашей БД
                    if (userLoaded && user && localHasDbUser) {
                      navigate(getCabinetProfilePath())
                      return
                    }

                    // Локальная сессия (email, Telegram, WhatsApp и т.д.) — как на главной (MainPage), без Clerk
                    if (userData.isLoggedIn) {
                      navigate(getCabinetProfilePath())
                      return
                    }

                    // Не авторизован — открываем модалку (мастер: роль → вход/регистрация)
                    setLoginModalEntry('wizard')
                    setIsLoginModalOpen(true)
                  }}
                  aria-label={t('profile')}
                >
                  {isLoggedIn ? (
                    userPhoto ? (
                      <img
                        src={userPhoto}
                        alt="Profile"
                        className="new-header__avatar-img"
                        onError={(e) => {
                          // Если фото не загрузилось, показываем placeholder
                          setUserPhoto(null)
                        }}
                      />
                    ) : (
                      <div className="new-header__avatar-placeholder">
                        <FiUser size={20} />
                      </div>
                    )
                  ) : (
                    <FiUser size={20} />
                  )}
                  {isLoggedIn && hasIncompleteProfile && (
                    <span className="new-header__profile-indicator" />
                  )}
                </button>
                <NotificationsBell />
              </>
            )}
          </div>
        </div>
      </header>

      {/* Модальное окно входа/регистрации */}
      {isLoginModalOpen ? (
        <Suspense fallback={null}>
          <LoginModalLazy
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false)
          setLoginModalEntry('direct')
        }}
        authEntryVariant={loginModalEntry === 'wizard' ? 'header_wizard' : 'default'}
          />
        </Suspense>
      ) : null}

      {isGlobalAiModalOpen && (
        <div className="global-ai-modal" role="dialog" aria-modal="true" aria-label={t('aiAssistant')}>
          <div className="global-ai-modal__panel">
            <button
              type="button"
              className="global-ai-modal__close"
              onClick={() => setIsGlobalAiModalOpen(false)}
              aria-label={t('closeChat')}
            >
              <FiX size={20} />
            </button>
            <iframe
              title={t('aiAssistant')}
              className="global-ai-modal__iframe"
              src="/chat?assistant=1&embed=1"
            />
          </div>
        </div>
      )}
    </>
  )
}

export default Header
```

## Mobile navigation drawer

- File: `src/components/SiteNavDrawer.jsx`
- Purpose: Mobile site navigation composition used by the shared header.

```jsx
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  isCabinetDataPath,
  isCabinetProfilePath,
  isCabinetSubscriptionsPath,
} from '../utils/cabinetRoutes'
import { CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from '../utils/sectionRoutes'
import HeaderMegaMenu from './HeaderMegaMenu'

/**
 * Бургер-панель навигации (как на /auction). Для highlight «умный помощник» передайте
 * aiConsultantOpen: открыт ли виджет AI на текущей странице (аукцион / главная).
 */
export function useSiteDrawerMenuActive(isManagerChatOpen, aiConsultantOpen) {
  const { pathname, search } = useLocation()

  return useMemo(() => {
    const managerQ = new URLSearchParams(search).get('manager')
    const isManagerChatUrl = pathname === '/chat' && (managerQ === '1' || managerQ === 'true')
    const managerChatHighlighted =
      isManagerChatUrl || (pathname !== '/chat' && isManagerChatOpen)

    const starts = (base) => pathname === base || pathname.startsWith(`${base}/`)
    const isAiChatRoute = pathname === '/chat' && !isManagerChatUrl
    const aiAssistantHighlighted =
      isAiChatRoute ||
      ((pathname === '/auction' || pathname === '/' || pathname === '/main') && aiConsultantOpen)

    return {
      home: pathname === '/',
      auction: starts('/auction') || pathname === '/main',
      shares: starts(CO_INVESTMENT_PATH) || starts('/shares'),
      debts: starts('/debts'),
      testDrive: starts(TEST_DRIVE_PATH),
      chat: managerChatHighlighted,
      bonuses: starts('/bonuses'),
      map: starts('/map'),
      calculator: starts('/calculator'),
      aiAssistant: aiAssistantHighlighted,
      moreSections: starts('/sections'),
      profile: isCabinetProfilePath(pathname),
      wallet: pathname === '/deposit' || pathname === '/wallet',
      subscriptions: isCabinetSubscriptionsPath(pathname, search),
      data: isCabinetDataPath(pathname, search),
    }
  }, [pathname, search, isManagerChatOpen, aiConsultantOpen])
}

export default function SiteNavDrawer({
  menuRef,
  isMenuOpen,
  isMenuClosing,
  setIsMenuOpen,
  setIsMenuClosing,
  openLoginOrNavigate,
}) {
  const closeAfterNav = () => {
    setIsMenuOpen(false)
  }

  const startCloseDrawer = () => {
    setIsMenuClosing(true)
    setTimeout(() => {
      setIsMenuOpen(false)
      setIsMenuClosing(false)
    }, 300)
  }

  const visible = isMenuOpen || isMenuClosing
  if (!visible) return null

  return (
    <>
      <div
        className={`menu-backdrop ${isMenuClosing ? 'menu-backdrop--closing' : ''}`}
        onClick={(e) => {
          const menuBtn = menuRef.current?.querySelector('.new-header__menu-btn')
          const menuDropdown = document.querySelector('.menu-dropdown')

          if (menuBtn && menuBtn.contains(e.target)) return
          if (menuDropdown && menuDropdown.contains(e.target)) return

          startCloseDrawer()
        }}
      />
      <div className={`menu-dropdown menu-dropdown--mega ${isMenuClosing ? 'menu-dropdown--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="menu-dropdown__content menu-dropdown__content--mega">
          <HeaderMegaMenu
            onClose={startCloseDrawer}
            openLoginOrNavigate={openLoginOrNavigate}
            closeAfterNav={closeAfterNav}
          />
        </div>
      </div>
    </>
  )
}
```

## Desktop/mobile catalogue mega menu

- File: `src/components/HeaderMegaMenu.jsx`
- Purpose: Shared catalogue navigation surface composed into the header and drawer.

```jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Compass,
  Gavel,
  Gift,
  Handshake,
  Heart,
  History,
  Home,
  Info,
  Landmark,
  Lock,
  LogOut,
  Map,
  MessageSquare,
  PieChart,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Store,
  User,
  Users,
  Wallet,
  Zap,
  Bot,
  Car,
} from 'lucide-react'
import { SiteBrandIcon } from './SiteBrandLogo'
import './SiteBrandLogo.css'
import { FiX } from 'react-icons/fi'
import { CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from '../utils/sectionRoutes'
import { getUserData, logout } from '../services/authService'
import {
  getCabinetProfilePath,
  getCabinetWalletPath,
  isSellerCabinetRole,
  readStoredUserRole,
} from '../utils/cabinetRoutes'
import './HeaderMegaMenu.css'

const MOBILE_MEGA_MENU_BREAKPOINT = 1023

const LINK_ICONS = {
  home: Home,
  auction: Gavel,
  coInvestment: PieChart,
  debtsTitle: Landmark,
  headerMegaBuyNow: Zap,
  testDrive: Car,
  aiAssistant: Bot,
  calculator: BarChart3,
  chat: MessageSquare,
  favorites: Heart,
  mapLink: Map,
  profile: User,
  listProperty: PlusCircle,
  ownerTest_tabBookings: CalendarDays,
  ownerTest_navMyProperties: Briefcase,
  bonuses: Gift,
  buyerCabinet_tileDepositTitle: Wallet,
  history: History,
  aboutUs: Info,
  headerMegaForSellerPage: Store,
  headerMegaForBuyerPage: ShoppingBag,
  footerBecomePartner: Handshake,
  footerOurTeam: Users,
  privateClubPageTitle: Lock,
}

const TRADES_COLUMN = {
  id: 'trades',
  titleKey: 'headerMegaTrades',
  icon: Gavel,
  links: [
    { labelKey: 'home', path: '/' },
    { labelKey: 'auction', path: '/auction' },
    { labelKey: 'coInvestment', path: CO_INVESTMENT_PATH },
    { labelKey: 'debtsTitle', path: '/debts' },
    { labelKey: 'headerMegaBuyNow', path: '/auction?filter=buy_now' },
  ],
}

const SERVICES_COLUMN = {
  id: 'services',
  titleKey: 'headerMegaServices',
  icon: Sparkles,
  links: [
    { labelKey: 'testDrive', path: TEST_DRIVE_PATH },
    { labelKey: 'aiAssistant', path: null, action: 'ai' },
    { labelKey: 'calculator', path: '/calculator', requiresAuth: true },
    { labelKey: 'chat', path: '/chat?manager=1', requiresAuth: true },
    { labelKey: 'favorites', path: '/favorites' },
    { labelKey: 'mapLink', path: '/map', requiresAuth: true },
  ],
}

const FOR_YOU_COLUMN = {
  id: 'for-you',
  titleKey: 'headerMegaForYou',
  icon: Compass,
  links: [
    { labelKey: 'aboutUs', path: '/about' },
    { labelKey: 'headerMegaForSellerPage', path: '/seller' },
    { labelKey: 'headerMegaForBuyerPage', path: '/buyer' },
    { labelKey: 'footerBecomePartner', path: '/about#partner-title' },
    { labelKey: 'footerOurTeam', path: '/about' },
    { labelKey: 'privateClubPageTitle', path: '/private-club' },
  ],
}

function buildRoleColumn(role) {
  if (isSellerCabinetRole(role)) {
    return {
      id: 'cabinet-role',
      titleKey: 'headerMegaForSeller',
      icon: Store,
      links: [
        { labelKey: 'profile', path: '/owner-test/profile', requiresAuth: true },
        { labelKey: 'listProperty', path: '/owner-test/add-property', requiresAuth: true },
        { labelKey: 'ownerTest_tabBookings', path: '/owner-test/test-drive', requiresAuth: true },
        { labelKey: 'ownerTest_navMyProperties', path: '/owner-test/properties', requiresAuth: true },
        { labelKey: 'bonuses', path: '/bonuses', requiresAuth: true },
      ],
    }
  }

  return {
    id: 'cabinet-role',
    titleKey: 'headerMegaForBuyer',
    icon: ShoppingBag,
    links: [
      { labelKey: 'profile', path: getCabinetProfilePath(role), requiresAuth: true },
      { labelKey: 'ownerTest_tabBookings', path: '/profile/bookings', requiresAuth: true },
      { labelKey: 'buyerCabinet_tileDepositTitle', path: getCabinetWalletPath(role), requiresAuth: true },
      { labelKey: 'history', path: '/history', requiresAuth: true },
      { labelKey: 'bonuses', path: '/bonuses', requiresAuth: true },
    ],
  }
}

function matchesMenuPath(pathname, search, linkPath) {
  if (!linkPath) return false

  const [base, queryString] = linkPath.split('?')

  let pathMatch = false
  if (base === '/') {
    pathMatch = pathname === '/' || pathname === '/main'
  } else if (base === CO_INVESTMENT_PATH) {
    pathMatch =
      pathname === CO_INVESTMENT_PATH ||
      pathname.startsWith(`${CO_INVESTMENT_PATH}/`) ||
      pathname === '/shares' ||
      pathname.startsWith('/shares/')
  } else if (base === '/about') {
    pathMatch = pathname === '/about' || pathname.startsWith('/about/')
  } else if (base === '/owner-test/profile') {
    pathMatch = pathname === '/owner-test/profile' || pathname === '/owner-test'
  } else {
    pathMatch = pathname === base || pathname.startsWith(`${base}/`)
  }

  if (!pathMatch) return false
  if (!queryString) return true

  const expected = new URLSearchParams(queryString)
  const actual = new URLSearchParams(search)
  for (const [key, value] of expected.entries()) {
    if (actual.get(key) !== value) return false
  }
  return true
}

function getInitialOpenSections(columns, pathname, search) {
  const open = {}
  let hasActive = false

  for (const column of columns) {
    const active = column.links.some((link) => matchesMenuPath(pathname, search, link.path))
    if (active) {
      open[column.id] = true
      hasActive = true
    }
  }

  if (!hasActive) {
    open.trades = true
  }

  return open
}

function splitFullName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function buildMegaMenuUserSnapshot(clerkUser) {
  const userData = getUserData()
  const role = readStoredUserRole()

  let firstName = String(
    userData.first_name || userData.firstName || clerkUser?.firstName || '',
  ).trim()
  let lastName = String(
    userData.last_name || userData.lastName || clerkUser?.lastName || '',
  ).trim()

  if (!firstName && !lastName) {
    const fromName = splitFullName(userData.name || clerkUser?.fullName || '')
    firstName = fromName.firstName
    lastName = fromName.lastName
  }

  const email = String(
    userData.email ||
      localStorage.getItem('userEmail') ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      '',
  ).trim()

  const picture = userData.picture || clerkUser?.imageUrl || null
  const isLoggedIn = Boolean(userData.isLoggedIn || clerkUser)

  return {
    firstName,
    lastName,
    email,
    role,
    picture,
    isLoggedIn,
  }
}

function getUserInitials(firstName, lastName, email) {
  const first = firstName?.[0] || ''
  const last = lastName?.[0] || ''
  if (first || last) return `${first}${last}`.toUpperCase()
  if (email) return email[0].toUpperCase()
  return '?'
}

function getMegaMenuRoleLabel(role, t) {
  if (role === 'admin') return t('headerMegaMenuRoleAdmin')
  if (isSellerCabinetRole(role)) return t('roleSeller')
  if (role === 'buyer' || role === 'client') return t('roleBuyer')
  return t('headerMegaMenuRoleGuest')
}

function useMegaMenuMobile(breakpoint = MOBILE_MEGA_MENU_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint,
  )

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [breakpoint])

  return isMobile
}

export default function HeaderMegaMenu({
  onClose,
  openLoginOrNavigate,
  closeAfterNav,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const isMobile = useMegaMenuMobile()

  const menuUser = useMemo(() => buildMegaMenuUserSnapshot(clerkUser), [clerkUser])
  const emptyValue = t('buyerData_notSpecified')
  const roleLabel = getMegaMenuRoleLabel(menuUser.role, t)
  const profilePath = isSellerCabinetRole(menuUser.role)
    ? '/owner-test/profile'
    : getCabinetProfilePath(menuUser.role)

  const role = menuUser.role
  const megaColumns = [
    TRADES_COLUMN,
    SERVICES_COLUMN,
    buildRoleColumn(role),
    FOR_YOU_COLUMN,
  ]

  const [openSections, setOpenSections] = useState(() =>
    getInitialOpenSections(megaColumns, pathname, search),
  )

  const toggleSection = useCallback((sectionId) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }, [])

  const handleLink = (link) => {
    if (link.action === 'ai') {
      window.dispatchEvent(new CustomEvent('openAIChat'))
      closeAfterNav?.()
      return
    }

    if (link.requiresAuth) {
      openLoginOrNavigate(link.path, true)
      return
    }

    navigate(link.path)
    closeAfterNav?.()
  }

  const renderLinkIcon = (labelKey, size = 16) => {
    const Icon = LINK_ICONS[labelKey] || ChevronRight
    return <Icon size={size} strokeWidth={1.75} aria-hidden />
  }

  const renderDesktopColumn = (column) => {
    const Icon = column.icon
    return (
      <section
        key={column.id}
        id={`mega-${column.id}`}
        className="header-mega-menu__column"
        aria-labelledby={`mega-title-${column.id}`}
      >
        <div className="header-mega-menu__column-head">
          <span className="header-mega-menu__column-icon" aria-hidden>
            <Icon size={18} strokeWidth={2} />
          </span>
          <h3 id={`mega-title-${column.id}`} className="header-mega-menu__column-title">
            {t(column.titleKey)}
          </h3>
        </div>
        <ul id={`mega-links-${column.id}`} className="header-mega-menu__links">
          {column.links.map((link) => (
            <li key={`${column.id}-${link.labelKey}`}>
              <button type="button" className="header-mega-menu__link" onClick={() => handleLink(link)}>
                <span className="header-mega-menu__link-icon">{renderLinkIcon(link.labelKey, 15)}</span>
                <span>{t(link.labelKey)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  const handleUserCardClick = () => {
    openLoginOrNavigate(profilePath, true)
  }

  const handleLogout = useCallback(async () => {
    if (!menuUser.isLoggedIn) return

    if (!window.confirm(t('buyerCabinet_logoutConfirm'))) {
      return
    }

    closeAfterNav?.()
    onClose?.()

    sessionStorage.setItem('clerk_logout_in_progress', 'true')
    try {
      if (clerkUser && signOut) {
        await signOut({ redirectUrl: `${window.location.origin}/` })
      }
    } catch (error) {
      console.warn('HeaderMegaMenu: Clerk signOut', error)
    }

    try {
      await logout()
    } catch (error) {
      console.warn('HeaderMegaMenu: logout()', error)
    } finally {
      sessionStorage.removeItem('clerk_logout_in_progress')
    }

    window.location.assign('/')
  }, [clerkUser, closeAfterNav, menuUser.isLoggedIn, onClose, signOut, t])

  const renderMobileUserCard = () => {
    const initials = getUserInitials(menuUser.firstName, menuUser.lastName, menuUser.email)
    const fullName = [menuUser.firstName, menuUser.lastName].filter(Boolean).join(' ') || emptyValue

    return (
      <div className="header-mega-menu__user-plate">
        <button
          type="button"
          className="header-mega-menu__user-plate-main"
          onClick={handleUserCardClick}
          aria-label={t('profile')}
        >
          <span className="header-mega-menu__user-avatar" aria-hidden>
            {menuUser.picture ? (
              <img src={menuUser.picture} alt="" className="header-mega-menu__user-avatar-img" />
            ) : (
              <span className="header-mega-menu__user-avatar-fallback">{initials}</span>
            )}
          </span>

          <span className="header-mega-menu__user-card-info">
            <span className="header-mega-menu__user-card-name">{fullName}</span>
            <span className="header-mega-menu__user-card-email">{menuUser.email || emptyValue}</span>
            <span className={`header-mega-menu__user-card-role header-mega-menu__user-card-role--${menuUser.role}`}>
              {roleLabel}
            </span>
          </span>
        </button>

        {menuUser.isLoggedIn ? (
          <button
            type="button"
            className="header-mega-menu__user-logout"
            onClick={handleLogout}
            aria-label={t('logOutLabel')}
            title={t('logOutLabel')}
          >
            <LogOut size={20} strokeWidth={1.85} aria-hidden />
          </button>
        ) : null}
      </div>
    )
  }

  const renderMobileSection = (column) => {
    const SectionIcon = column.icon
    const isOpen = Boolean(openSections[column.id])

    return (
      <section
        key={column.id}
        className={`header-mega-menu__section${isOpen ? ' is-open' : ''}`}
      >
        <button
          type="button"
          className="header-mega-menu__section-toggle"
          onClick={() => toggleSection(column.id)}
          aria-expanded={isOpen}
          aria-controls={`mega-mobile-${column.id}`}
        >
          <span className="header-mega-menu__section-icon" aria-hidden>
            <SectionIcon size={18} strokeWidth={1.85} />
          </span>
          <span className="header-mega-menu__section-label">{t(column.titleKey)}</span>
          <ChevronDown
            size={18}
            strokeWidth={1.85}
            className="header-mega-menu__section-chevron"
            aria-hidden
          />
        </button>

        <div
          id={`mega-mobile-${column.id}`}
          className="header-mega-menu__section-panel"
          aria-hidden={!isOpen}
        >
          <ul className="header-mega-menu__section-children">
            {column.links.map((link, index) => {
              const isActive = matchesMenuPath(pathname, search, link.path)
              const isLast = index === column.links.length - 1

              return (
                <li
                  key={`${column.id}-${link.labelKey}`}
                  className={`header-mega-menu__child-row${isLast ? ' is-last' : ''}`}
                >
                  <button
                    type="button"
                    className={`header-mega-menu__child-link${isActive ? ' is-active' : ''}`}
                    onClick={() => handleLink(link)}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <span className="header-mega-menu__child-link-icon">
                      {renderLinkIcon(link.labelKey, 15)}
                    </span>
                    <span className="header-mega-menu__child-link-text">{t(link.labelKey)}</span>
                    {isActive ? (
                      <ChevronRight size={16} strokeWidth={1.85} className="header-mega-menu__child-link-arrow" aria-hidden />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    )
  }

  return (
    <div className="header-mega-menu">
      <div className="header-mega-menu__mobile-top">
        <button
          type="button"
          className="header-mega-menu__brand site-brand site-brand--header"
          onClick={() => {
            navigate('/')
            closeAfterNav?.()
          }}
        >
          <SiteBrandIcon />
          <span className="site-brand__text">sellyourbrick</span>
        </button>
        <button
          type="button"
          className="header-mega-menu__close"
          onClick={onClose}
          aria-label={t('closeMenu')}
        >
          <FiX size={20} />
        </button>
      </div>

      <div className="header-mega-menu__body">
        <div className="header-mega-menu__scroll">
          {isMobile ? (
            <nav className="header-mega-menu__mobile-list" aria-label={t('menu')}>
              {megaColumns.map((column) => renderMobileSection(column))}
            </nav>
          ) : (
            <div className="header-mega-menu__grid">
              {megaColumns.map((column) => renderDesktopColumn(column))}
            </div>
          )}
        </div>

        {isMobile ? renderMobileUserCard() : null}
      </div>
    </div>
  )
}
```

## Shared footer

- File: `src/components/Footer.jsx`
- Purpose: Site-wide footer with brand, navigation, contacts and language controls.

```jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { FaApple, FaTelegramPlane, FaYoutube, FaWhatsapp, FaInstagram } from 'react-icons/fa'
import { MdSentimentDissatisfied } from 'react-icons/md'
import { FiX, FiChevronDown, FiCheck } from 'react-icons/fi'
import whatsappQR from '../../6019556644745841501.png'
import './Footer.css'
import { scrollMainTo } from '../utils/mainScroll'
import { navigateToWallet } from '../utils/walletNavigation'
import { isSiteUserSignedIn, routeRequiresSiteLogin } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { getCabinetProfilePath } from '../utils/cabinetRoutes'
import { CO_INVESTMENT_PATH } from '../utils/sectionRoutes'
import { UI_LANGUAGES } from '../constants/uiLanguages'

const WHATSAPP_HREF = 'https://wa.me/447700183959'

const SOCIAL_LINKS = [
  { labelKey: 'sectionsSocialTelegram', href: 'https://t.me/', Icon: FaTelegramPlane },
  { labelKey: 'sectionsSocialYoutube', href: 'https://youtube.com/', Icon: FaYoutube },
  { labelKey: 'sectionsSocialWhatsapp', href: WHATSAPP_HREF, Icon: FaWhatsapp },
  { labelKey: 'sectionsSocialInstagram', href: 'https://instagram.com/', Icon: FaInstagram },
]

/** @typedef {{ to?: string; onClick?: () => void; label: string; requiresAuth?: boolean }} FooterLinkItem */

/** @typedef {{ title: string; links: FooterLinkItem[] }} FooterColumn */

const Footer = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoaded: userLoaded } = useUser()
  const languageDropdownRef = useRef(null)
  const [storeComingSoonOpen, setStoreComingSoonOpen] = useState(false)
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false)

  const currentLanguage =
    UI_LANGUAGES.find((lang) => lang.code === (i18n.language || 'ru').split('-')[0]) ||
    UI_LANGUAGES[0]

  const handleLanguageChange = async (langCode) => {
    try {
      await i18n.changeLanguage(langCode)
      setIsLanguageDropdownOpen(false)
    } catch (error) {
      console.error('Error changing language:', error)
    }
  }

  const scrollToTop = () => {
    scrollMainTo(0, 0, 'instant')
  }

  const openStoreComingSoon = () => setStoreComingSoonOpen(true)
  const closeStoreComingSoon = useCallback(() => setStoreComingSoonOpen(false), [])

  useEffect(() => {
    if (!storeComingSoonOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeStoreComingSoon()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [storeComingSoonOpen, closeStoreComingSoon])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
        setIsLanguageDropdownOpen(false)
      }
    }
    if (isLanguageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isLanguageDropdownOpen])

  const goWallet = () => {
    scrollToTop()
    if (!isSiteUserSignedIn(user, userLoaded)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    navigateToWallet(navigate, location.pathname)
  }

  const cabinetProfilePath = getCabinetProfilePath()

  const handleFooterProtectedNav = (to, requiresAuth = false) => {
    scrollToTop()
    const needsLogin =
      (requiresAuth || routeRequiresSiteLogin(to)) && !isSiteUserSignedIn(user, userLoaded)
    if (needsLogin) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    navigate(to)
  }

  const linkNeedsAuth = (item) =>
    item.requiresAuth || (item.to ? routeRequiresSiteLogin(item.to) : false)

  /** @type {FooterColumn[]} */
  const footerColumns = [
    {
      title: t('footerColTrading'),
      links: [
        { to: '/', label: t('home') },
        { to: '/auction', label: t('auction') },
        { to: CO_INVESTMENT_PATH, label: t('footerShares') },
        { to: '/debts', label: t('debtsTitle') },
        { to: '/auction/buy-now', label: t('footerBuyNowShort') },
      ],
    },
    {
      title: t('footerColTools'),
      links: [
        { onClick: goWallet, label: t('buyerCabinet_tileDepositTitle'), requiresAuth: true },
        { to: '/calculator', label: t('calculator'), requiresAuth: true },
        { to: '/compare', label: t('footerCompareObjects'), requiresAuth: true },
        { to: '/favorites', label: t('footerLiked'), requiresAuth: true },
        { to: '/test-drive', label: t('testDrive') },
      ],
    },
    {
      title: t('footerColForYou'),
      links: [
        { to: '/subscriptions#subscriptions-pricing-section', label: t('tariffs'), requiresAuth: true },
        { to: '/bonuses', label: t('bonuses'), requiresAuth: true },
        { to: '/news', label: t('news') },
        { to: '/chat', label: t('aiAssistant'), requiresAuth: true },
        { to: '/sections', label: t('footerAllSections') },
      ],
    },
    {
      title: t('footerColProfile'),
      links: [
        { to: cabinetProfilePath, label: t('profile'), requiresAuth: true },
        { to: '/wallet', label: t('footerAssets'), requiresAuth: true },
        { to: '/profile/bookings', label: t('buyerCabinet_myBookings'), requiresAuth: true },
        { to: '/history', label: t('history'), requiresAuth: true },
      ],
    },
    {
      title: t('footerColCompany'),
      links: [
        { to: '/about#about-intro', label: t('aboutUs') },
        { to: '/seller', label: t('footerForSeller') },
        { to: '/buyer', label: t('sectionsBuyerPageLink') },
        { to: '/about#about-agents', label: t('footerOurTeam') },
        { to: '/about#contacts', label: t('footerBecomePartner') },
      ],
    },
  ]

  const renderLink = (item, i, keyPrefix) => {
    const key = `${keyPrefix}-${i}`
    if (item.onClick) {
      return (
        <button
          key={key}
          type="button"
          className="footer__menu-link"
          onClick={() => {
            item.onClick()
          }}
        >
          {item.label}
        </button>
      )
    }
    if (linkNeedsAuth(item) && !isSiteUserSignedIn(user, userLoaded)) {
      return (
        <button
          key={key}
          type="button"
          className="footer__menu-link"
          onClick={() => handleFooterProtectedNav(item.to, item.requiresAuth)}
        >
          {item.label}
        </button>
      )
    }
    return (
      <Link key={key} to={item.to} onClick={scrollToTop} className="footer__menu-link">
        {item.label}
      </Link>
    )
  }

  const renderFooterBrand = (className) => (
    <Link to="/" onClick={scrollToTop} className={className} aria-label={t('home')}>
      <div className="footer__brand-icon">
        <span className="footer__brand-house" />
      </div>
      <span className="footer__brand-text">Sellyourbrick</span>
    </Link>
  )

  return (
    <footer
      id="site-footer"
      className={`footer${location.pathname === '/deposit' ? ' footer--deposit' : ''}${isLanguageDropdownOpen ? ' footer--language-open' : ''}`}
    >
      <div className="footer__container">
        <nav className="footer__nav-grid" aria-label={t('footerAllSections')}>
          {footerColumns.slice(0, 4).map((col, ci) => (
            <div key={col.title} className="footer__menu-column">
              <p className="footer__menu-heading">{col.title}</p>
              {col.links.map((item, i) => renderLink(item, i, `c${ci}`))}
            </div>
          ))}

          <div className="footer__nav-bottom">
            <div className="footer__menu-column footer__menu-column--company">
              <p className="footer__menu-heading">{footerColumns[4].title}</p>
              {footerColumns[4].links.map((item, i) => renderLink(item, i, 'company'))}
            </div>

            <aside className="footer__nav-qr-slot" aria-label={t('footerQrApp')}>
              <div className="footer__whatsapp-qr">
                <img
                  src={whatsappQR}
                  alt={t('footerQrApp')}
                  className="footer__qr-image"
                  width={130}
                  height={130}
                  loading="lazy"
                  decoding="async"
                />
                <p className="footer__qr-caption">{t('footerQrApp')}</p>
              </div>
            </aside>
          </div>
        </nav>

        <div className="footer__bottom-panel">
          <div className="footer__bottom-row footer__bottom-row--brand-socials">
            {renderFooterBrand('footer__brand footer__brand--panel')}
            <div className="footer__socials" aria-label={t('sectionsSocialAria')}>
              {SOCIAL_LINKS.map(({ labelKey, href, Icon }) => (
                <a
                  key={labelKey}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer__social-btn"
                  aria-label={t(labelKey)}
                >
                  <Icon aria-hidden size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="footer__bottom-row footer__bottom-row--stores">
            <button
              type="button"
              className="footer__store-btn footer__store-btn--compact"
              onClick={openStoreComingSoon}
              aria-label={t('downloadGooglePlay')}
            >
              <div className="footer__store-icon footer__store-icon--google">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5Z" fill="#4285F4"/>
                  <path d="M16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12Z" fill="#EA4335"/>
                  <path d="M6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" fill="#FBBC04"/>
                  <path d="M16.81 8.88L20.16 6.51C20.66 6.26 21 5.75 21 5.16V18.84C21 18.25 20.66 17.74 20.16 17.49L16.81 15.12L14.54 12.85L16.81 8.88Z" fill="#34A853"/>
                </svg>
              </div>
              <div className="footer__store-text">
                <span className="footer__store-name">Google Play</span>
              </div>
            </button>

            <button
              type="button"
              className="footer__store-btn footer__store-btn--compact"
              onClick={openStoreComingSoon}
              aria-label={`${t('downloadIn')} App Store`}
            >
              <div className="footer__store-icon">
                <FaApple size={16} />
              </div>
              <div className="footer__store-text">
                <span className="footer__store-name">App Store</span>
              </div>
            </button>

            <div
              className="footer__language-selector footer__language-selector--inline"
              ref={languageDropdownRef}
            >
              <button
                type="button"
                className="footer__language-selector-btn footer__language-selector-btn--compact"
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                aria-label={t('selectLanguageAria')}
                aria-expanded={isLanguageDropdownOpen}
              >
                <span className={`footer__language-flag ${currentLanguage.flagClass}`} />
                <span className="footer__language-name">{currentLanguage.name}</span>
                <FiChevronDown
                  size={14}
                  className={`footer__language-chevron ${isLanguageDropdownOpen ? 'footer__language-chevron--open' : ''}`}
                />
              </button>
              {isLanguageDropdownOpen && (
                <div className="footer__language-dropdown">
                  {UI_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`footer__language-option ${(i18n.language || 'ru').split('-')[0] === lang.code ? 'footer__language-option--active' : ''}`}
                      onClick={() => handleLanguageChange(lang.code)}
                    >
                      <span className={`footer__language-flag ${lang.flagClass}`} />
                      <span className="footer__language-name">{lang.name}</span>
                      {(i18n.language || 'ru').split('-')[0] === lang.code && (
                        <FiCheck size={16} className="footer__language-check" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="footer__legal">
          <p className="footer__copyright">
            {t('footerCopyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>

      {storeComingSoonOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="footer-store-modal-overlay"
              role="presentation"
              onClick={closeStoreComingSoon}
            >
              <div
                className="footer-store-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="footer-store-modal-title"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="footer-store-modal__close"
                  onClick={closeStoreComingSoon}
                  aria-label={t('footerCloseModal')}
                >
                  <FiX size={22} />
                </button>
                <MdSentimentDissatisfied className="footer-store-modal__icon" aria-hidden />
                <p id="footer-store-modal-title" className="footer-store-modal__title">
                  {t('footerComingSoon')}
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </footer>
  )
}

export default Footer
```

## Buyer cabinet navigation

- File: `src/components/BuyerCabinetSidebar.jsx`
- Purpose: Reusable buyer account navigation for cabinet, bookings, wallet and related account routes.

```jsx
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getInterfaceLanguageNativeName } from '../utils/interfaceLanguages'
import {
  getCabinetDataPath,
  getCabinetProfilePath,
  getCabinetSubscriptionsPath,
  isCabinetDataPath,
  isCabinetProfilePath,
  isCabinetSubscriptionsPath,
} from '../utils/cabinetRoutes'

const headerBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 24px',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#0099A9',
  fontSize: '18px',
  fontWeight: '600',
  transition: 'opacity 0.2s',
}

/**
 * Общее боковое меню кабинета покупателя (профиль, данные, история, подписки и т.д.).
 * @param {string} asideClassName — CSS-класс сайдбара (например profile-sidebar или data-sidebar)
 * @param {boolean} compact — без футера (язык, соглашение, бренд); только нижняя кнопка «Выйти», как на странице «Данные»
 * @param {boolean} showProfileIndicator — красная точка у «Профиль»
 * @param {boolean} showDataIndicator — красная точка у «Данные»
 * @param {() => void} onLogout
 * @param {boolean} [headerSpaceBetween] — выравнивание «Назад» и «Выйти» по краям (страница Data)
 */
export default function BuyerCabinetSidebar({
  asideClassName = 'profile-sidebar',
  compact = false,
  showProfileIndicator = false,
  showDataIndicator = false,
  onLogout,
  headerSpaceBetween = false,
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const langName = getInterfaceLanguageNativeName(i18n.language)
  const profilePath = getCabinetProfilePath()
  const dataPath = getCabinetDataPath()
  const subscriptionsPath = getCabinetSubscriptionsPath()

  const goBackFromCabinet = () => {
    // React Router (History API) кладёт в state.idx индекс записи; на первой странице сессии idx === 0
    const idx = window.history.state?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const navClass = (path, options = {}) => {
    const { activePaths } = options
    const paths = activePaths || [path]
    const isActive = paths.some((p) => pathname === p)
    return isActive ? 'nav-item active' : 'nav-item'
  }

  return (
    <aside className={asideClassName}>
      <div
        className="sidebar-header"
        style={{
          marginTop: '24px',
          ...(headerSpaceBetween
            ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
            : {}),
        }}
      >
        <button
          type="button"
          onClick={goBackFromCabinet}
          className="back-button"
          style={headerBtnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t('buyerCabinet_back')}</span>
        </button>
        <button
          type="button"
          className="header-logout-button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onLogout()
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t('logOutLabel')}</span>
        </button>
      </div>
      <nav className="sidebar-nav">
        <Link
          to={profilePath}
          className={isCabinetProfilePath(pathname) ? 'nav-item active' : 'nav-item'}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z"
              fill="currentColor"
            />
            <path
              d="M10 12C5.58172 12 2 13.7909 2 16V20H18V16C18 13.7909 14.4183 12 10 12Z"
              fill="currentColor"
            />
          </svg>
          <span>{t('profile')}</span>
          {showProfileIndicator ? <span className="nav-item-indicator" /> : null}
        </Link>
        <Link
          to={dataPath}
          className={isCabinetDataPath(pathname, search) ? 'nav-item active' : 'nav-item'}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 8H14M6 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{t('data')}</span>
          {showDataIndicator ? <span className="nav-item-indicator" /> : null}
        </Link>
        <Link to="/profile/bookings" className={navClass('/profile/bookings')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 8H17" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 2V5M13 2V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{t('buyerCabinet_myBookings')}</span>
        </Link>
        <Link to={subscriptionsPath} className={isCabinetSubscriptionsPath(pathname, search) ? 'nav-item active' : 'nav-item'}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z" fill="currentColor" />
          </svg>
          <span>{t('subscriptions')}</span>
        </Link>
        <Link to="/chat?manager=1" className={navClass('/chat')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M7 8H13M7 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{t('chat')}</span>
        </Link>
        <Link to="/favorites" className={navClass('/favorites')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z" fill="currentColor" />
          </svg>
          <span>{t('favorites')}</span>
        </Link>
        <Link to="/compare" className={navClass('/compare')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 4h6v6H3V4zm8 0h6v6h-6V4zM3 12h6v6H3v-6zm8 0h6v6h-6v-6z" fill="currentColor" />
          </svg>
          <span>{t('buyerCabinet_compare')}</span>
        </Link>
      </nav>

      {compact ? (
        <button
          type="button"
          className="logout-button"
          onClick={onLogout}
          style={{ marginTop: 'auto', marginBottom: '24px', marginLeft: '16px', marginRight: '16px' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t('logOutLabel')}</span>
        </button>
      ) : (
        <div className="sidebar-footer">
          <div className="language-selector">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 1C9.5 3 10.5 5.5 10.5 8C10.5 10.5 9.5 13 8 15M8 1C6.5 3 5.5 5.5 5.5 8C5.5 10.5 6.5 13 8 15M1 8H15"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span>{langName}</span>
          </div>
          <a href="#" className="help-link" onClick={(e) => e.preventDefault()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5V8M8 11H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{t('buyerCabinet_userAgreement')}</span>
          </a>
          <a href="#" className="help-link" onClick={(e) => e.preventDefault()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 6H10M6 10H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{t('buyerCabinet_brandLine')}</span>
          </a>
          <div className="copyright">
            {t('buyerCabinet_copyright', { year: new Date().getFullYear() })}
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onLogout()
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{t('logOutLabel')}</span>
          </button>
        </div>
      )}
    </aside>
  )
}
```

## Auction mobile layout

- File: `src/components/ui/AuctionMobileLayout.jsx`
- Purpose: Reusable dense-commerce mobile shell and catalogue card/grid presentation shared across buyer listing experiences.

```jsx
import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react'
import { useUser } from '@clerk/clerk-react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion'
import { List, LayoutGrid, MapPin, ShoppingBag, Car } from 'lucide-react'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { cn } from '@/lib/utils'
import ListingCardAuctionTimer from '../ListingCardAuctionTimer'
import CircularTimer from '../CircularTimer'
import PropertyTimer from '../PropertyTimer'
import { showNotification } from '@/utils/toastHelper'
import { ensureCanOpenProperty } from '@/utils/propertyAccessGuard'
import { requestOpenLoginModal } from '@/utils/requestOpenLoginModal'
import { hasBuyNowOption, hasAuctionBuyNowListingForm } from '@/utils/hasBuyNowOption'
import { hasEmailForBuyNowFlow } from '@/utils/buyNowEmailGate'
import {
  getEffectiveAuctionEndTime,
  hasTestTimerDateString,
  isBuyNowPurchaseCompleted,
  isAuctionListingEnded,
  shouldShowCircularAuctionTimer,
} from '@/utils/auctionReminderBounds'
import { getPropertyCardImage } from '@/utils/propertyImage'
import { resolveAuctionCurrentBidValue } from '../../services/auctionListCache'
import { auctionListingDedupeKey, PROPERTY_DETAIL_AUCTION_TAB_BIDS, buildPropertyDetailNavigation } from '../../utils/propertyDetailUrl'
import { isPrivateClubAuctionLot } from '../../utils/isPrivateClubAuctionLot'
import { AUCTION_MOBILE_VIEW_STORAGE_KEY } from '../../constants/auctionMobileViewStorage'
import { buildResponsiveImageProps } from '../../utils/responsiveImage'
import ImageWithSkeleton from '../ImageWithSkeleton'
import AuctionPropertyCard from '../AuctionPropertyCard'
import BuyerStatusRibbon from '../buyer-mobile/BuyerStatusRibbon'
import { resolveBuyerListingState } from '../../utils/resolveBuyerListingState'
import DebtsPropertyCard from '../DebtsPropertyCard'
import '../PropertyList.css'
import '../../styles/hrShowcaseAuctionCards.css'
import '../../styles/hrShowcaseDebtsCards.css'
import './AuctionMobileLayout.css'

const STORAGE_KEY = AUCTION_MOBILE_VIEW_STORAGE_KEY

const snappySpring = {
  type: 'spring',
  stiffness: 350,
  damping: 30,
  mass: 1,
}

export default function AuctionMobileLayout({
  properties,
  formatPrice,
  isFavorite,
  onFavoriteToggle,
  viewerHasVip = false,
  onOpen,
  onTooltip,
  debtsCards = false,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [view, setView] = useState('card')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, view)
    } catch (_) {}
  }, [view])

  const openProperty = useCallback(
    (property, { auctionTab } = {}) => {
      if (onOpen) {
        onOpen(property, { auctionTab })
        return
      }
      if (!ensureCanOpenProperty()) {
        showNotification(
          <span>
            {t('toastOpenListingLoginPrefix')}{' '}
            <button
              type="button"
              className="auth-toast-link"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                requestOpenLoginModal({ wizard: true })
              }}
            >
              {t('toastOpenListingLoginLink')}{' '}
              <span className="auth-toast-link__arrow">→</span>
            </button>
          </span>,
          'warning',
          7000,
        )
        return
      }
      const { pathname, state } = buildPropertyDetailNavigation(property, {
        auctionTab: auctionTab || undefined,
      })
      navigate(pathname, { state })
    },
    [navigate, onOpen, t],
  )

  return (
    <div className="auction-mobile-layout w-full max-w-none px-3 pb-2 sm:px-4">
      <div className="auction-mobile-tabs">
        <ViewTab
          active={view === 'card'}
          onClick={() => setView('card')}
          icon={LayoutGrid}
          label={t('auctionViewCard')}
        />
        <ViewTab
          active={view === 'list'}
          onClick={() => setView('list')}
          icon={List}
          label={t('auctionViewList')}
        />
      </div>

      <div className="relative min-h-[120px] flex flex-col">
        <LayoutGroup>
          <motion.div
            layout
            transition={snappySpring}
            className={cn(
              'w-full',
              view === 'list' && 'auction-mobile-stack',
              view === 'card' &&
                (debtsCards
                  ? 'hr-showcases hr-showcases--debts-listing auction-mobile-stack--desktop-cards properties-grid properties-grid--auction-cards'
                  : 'hr-showcases hr-showcases--auction-listing auction-mobile-stack--desktop-cards properties-grid properties-grid--auction-cards'),
            )}
          >
            {properties.map((property) =>
              view === 'card' ? (
                debtsCards ? (
                  <DebtsPropertyCard
                    key={auctionListingDedupeKey(property)}
                    property={property}
                    isFavorite={typeof isFavorite === 'function' ? isFavorite(property) : false}
                    onFavoriteToggle={onFavoriteToggle}
                    onOpen={openProperty}
                  />
                ) : (
                  <AuctionPropertyCard
                    key={auctionListingDedupeKey(property)}
                    property={property}
                    isFavorite={typeof isFavorite === 'function' ? isFavorite(property) : false}
                    onFavoriteToggle={onFavoriteToggle}
                    onOpen={openProperty}
                    onTooltip={onTooltip}
                    viewerHasVip={viewerHasVip}
                    formatPrice={formatPrice}
                  />
                )
              ) : (
                <AuctionMobileItem
                  key={auctionListingDedupeKey(property)}
                  property={property}
                  view={view}
                  formatPrice={formatPrice}
                  t={t}
                  onOpen={openProperty}
                  isFavorite={isFavorite}
                  onFavoriteToggle={onFavoriteToggle}
                  viewerHasVip={viewerHasVip}
                />
              ),
            )}
          </motion.div>
        </LayoutGroup>
      </div>
    </div>
  )
}

function ViewTab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('auction-mobile-tab', active && 'auction-mobile-tab--active')}
    >
      {active && (
        <motion.div
          layoutId="auction-mobile-active-tab"
          className="auction-mobile-tab-pill"
          transition={snappySpring}
        />
      )}
      <span>
        <Icon size={16} strokeWidth={2.2} />
        {label}
      </span>
    </button>
  )
}

/** Летающие сердечки при лайке (мобильный аукцион) */
function AuctionLikeHeartsBurst({ origin, burstKey, onDone }) {
  const reduceMotion = useReducedMotion()
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const hearts = useMemo(() => {
    if (reduceMotion) return []
    return Array.from({ length: 11 }, (_, i) => {
      const seed = burstKey + i * 9973
      const rnd = (n) => {
        const x = Math.sin(seed * 0.001 + n * 12.9898) * 43758.5453
        return x - Math.floor(x)
      }
      const angle = (rnd(1) - 0.5) * 1.15
      const dist = 140 + rnd(2) * 200
      const dx = Math.sin(angle) * dist + (rnd(3) - 0.5) * 28
      const dy = -Math.cos(Math.abs(angle) * 0.85 + 0.35) * dist - rnd(4) * 55
      const rot = (rnd(5) - 0.5) * 55
      const delay = i * 0.035
      const size = 18 + rnd(6) * 14
      return { id: i, dx, dy, rot, delay, size, midScale: 0.95 + rnd(7) * 0.35 }
    })
  }, [burstKey, reduceMotion])

  useEffect(() => {
    if (reduceMotion) {
      onDoneRef.current?.()
      return
    }
    const t = window.setTimeout(() => onDoneRef.current?.(), 1850)
    return () => window.clearTimeout(t)
  }, [burstKey, reduceMotion])

  if (reduceMotion || typeof document === 'undefined') return null

  return createPortal(
    <div className="auction-like-hearts-layer" aria-hidden>
      {hearts.map((h) => (
        <motion.svg
          key={`${burstKey}-${h.id}`}
          className="auction-like-heart-fly"
          width={h.size}
          height={h.size}
          viewBox="0 0 24 24"
          style={{
            position: 'fixed',
            left: origin.x,
            top: origin.y,
            marginLeft: -h.size / 2,
            marginTop: -h.size / 2,
          }}
          initial={{ opacity: 0, scale: 0.35, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.35, 1.12, h.midScale, 0.75],
            x: [0, h.dx * 0.22, h.dx * 0.72, h.dx],
            y: [0, h.dy * 0.35, h.dy * 0.78, h.dy],
            rotate: [0, h.rot * 0.4, h.rot * 0.85, h.rot],
          }}
          transition={{
            duration: 1.35,
            delay: h.delay,
            times: [0, 0.12, 0.55, 1],
            ease: [0.22, 0.61, 0.36, 1],
          }}
        >
          <defs>
            <linearGradient id={`ahg-${burstKey}-${h.id}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="55%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#ahg-${burstKey}-${h.id})`}
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </motion.svg>
      ))}
    </div>,
    document.body,
  )
}

/** Иконка на фото + подсказка в портале (не обрезается узкой карточкой в сетке) */

function AuctionPhotoHint({ type, tooltipKey, onGo }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const bubbleRef = useRef(null)
  const [bubblePos, setBubblePos] = useState({ top: 0, left: 12, width: 300 })

  const syncBubblePosition = () => {
    const el = btnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const margin = 12
    const maxW = Math.min(320, window.innerWidth - margin * 2)
    let left = rect.left + rect.width / 2 - maxW / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - margin - maxW))
    setBubblePos({ top: rect.bottom + 8, left, width: maxW })
  }

  useLayoutEffect(() => {
    if (!open) return
    syncBubblePosition()
    const onResize = () => syncBubblePosition()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      const node = e.target
      if (wrapRef.current?.contains(node)) return
      if (bubbleRef.current?.contains(node)) return
      setOpen(false)
    }
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', handler)
      document.addEventListener('touchstart', handler, { passive: true })
    }, 0)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  const Icon = type === 'buy' ? ShoppingBag : Car

  const bubbleEl =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={bubbleRef}
        className="auction-photo-hint__bubble auction-photo-hint__bubble--portal"
        role="tooltip"
        style={{
          position: 'fixed',
          top: bubblePos.top,
          left: bubblePos.left,
          width: bubblePos.width,
          zIndex: 10050,
        }}
      >
        <p className="auction-photo-hint__text">{t(tooltipKey)}</p>
        <button
          type="button"
          className="auction-photo-hint__link"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
            onGo()
          }}
        >
          {t('goTo')}
        </button>
      </div>,
      document.body,
    )

  return (
    <>
      <div className="auction-photo-hint" ref={wrapRef}>
        <button
          ref={btnRef}
          type="button"
          className={cn('auction-photo-hint__btn', type === 'buy' && 'auction-photo-hint__btn--buy')}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          aria-expanded={open}
          aria-label={type === 'buy' ? 'Buy now' : 'Test drive'}
        >
          <span className="auction-photo-hint__btn-glass" aria-hidden />
          <Icon className="auction-photo-hint__icon" size={18} strokeWidth={2.25} />
        </button>
      </div>
      {bubbleEl}
    </>
  )
}

function AuctionPrivateClubMobileHero({ t, layout, onGo }) {
  return (
    <div
      className={cn(
        'property-club-mobile-hero',
        layout === 'inline' && 'property-club-mobile-hero--auction-mobile-list',
        layout === 'cardBody' && 'property-club-mobile-hero--auction-mobile-card-body',
      )}
      role="group"
      aria-label={t('auctionPrivateClubLotTooltip')}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="property-club-mobile-hero__shine" aria-hidden="true" />
      <div className="property-club-mobile-hero__inner">
        <div className="property-club-mobile-hero__titles">
          <span className="property-club-mobile-hero__vip">{t('auctionPrivateClubVipBadge')}</span>
          <span className="property-club-mobile-hero__label">{t('auctionPrivateClubMobileLabel')}</span>
        </div>
        <button
          type="button"
          className="property-club-mobile-hero__btn"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onGo()
          }}
        >
          {t('auctionPrivateClubGoCta')}
        </button>
      </div>
    </div>
  )
}

function AuctionMobileItem({
  property,
  view,
  formatPrice,
  t,
  onOpen,
  isFavorite,
  onFavoriteToggle,
  viewerHasVip = false,
}) {
  const { user, isLoaded: clerkUserLoaded } = useUser()
  const buyNowEmailOk = useMemo(
    () => hasEmailForBuyNowFlow(user, clerkUserLoaded),
    [user, clerkUserLoaded],
  )
  const reduceMotion = useReducedMotion()
  const favoriteBtnRef = useRef(null)
  const [likeBurst, setLikeBurst] = useState(null)
  const propertyTitle = property.title || property.name || ''
  const propertyImage = getPropertyCardImage(
    property,
    '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'
  )
  const propertyImageProps = buildResponsiveImageProps(propertyImage, {
    widths: [240, 320, 480, 640],
    sizes: view === 'card' ? '50vw' : '42vw',
    quality: 72,
    fit: 'crop',
  })

  const buyNowPurchaseCompleted = isBuyNowPurchaseCompleted(property)
  const effectiveAuctionEnd = getEffectiveAuctionEndTime(property)
  const hasTestTimerRaw =
    !buyNowPurchaseCompleted && hasTestTimerDateString(property)
  const showCircularOnCard = shouldShowCircularAuctionTimer(property)
  const hasTimer =
    (property.isAuction === true &&
      (buyNowPurchaseCompleted ||
        (effectiveAuctionEnd != null &&
          String(effectiveAuctionEnd).trim() !== ''))) ||
    hasTestTimerRaw

  const isDebtProperty =
    property.sale_type === 'debt' ||
    property.is_debt === 1 ||
    property.is_debt === true ||
    property.has_debt === 1 ||
    property.has_debt === true
  const hasTestDrive =
    !isDebtProperty &&
    hasAuctionBuyNowListingForm(property) &&
    (property.test_drive === 1 ||
      property.testDrive === true ||
      property.test_drive === true)
  const isReserved = property.is_reserved === true || property.is_reserved === 1
  const showBuyNow = hasBuyNowOption(property)
  const testTimerDurationMs =
    property.test_timer_duration != null && property.test_timer_duration !== ''
      ? Number(property.test_timer_duration)
      : null
  const normalizedTestTimerDuration =
    testTimerDurationMs != null && Number.isFinite(testTimerDurationMs) && testTimerDurationMs > 0
      ? testTimerDurationMs
      : null

  const listingState = resolveBuyerListingState(property)
  const blocksPurchase = listingState.blocksPurchase
  const blocksBid = listingState.blocksBid
  const isAuctionEndedCard = listingState.state === 'sold' || listingState.state === 'auction-ended'
  const buyNowWinnerId = property.buy_now_winner_user_id

  const showMobilePrivateClubHero =
    Boolean(viewerHasVip) &&
    isPrivateClubAuctionLot(property) &&
    !isAuctionListingEnded(property) &&
    !isAuctionEndedCard &&
    !isReserved

  const greenOnImage =
    hasTimer && !blocksBid && !isReserved && !showCircularOnCard && effectiveAuctionEnd && !isDebtProperty
  const redOnImage =
    hasTimer && !blocksBid && !isReserved && showCircularOnCard && property.test_timer_end_date
  const buyNowEndedSealOnImage =
    hasTimer &&
    !blocksBid &&
    !isReserved &&
    buyNowPurchaseCompleted &&
    !showCircularOnCard &&
    !effectiveAuctionEnd

  const displayPriceValue = hasTimer
    ? resolveAuctionCurrentBidValue(property)
    : property.price || 0

  const goDetail = (options) => {
    onOpen?.(property, options)
  }

  const handleCardClick = (e) => {
    if (e?.target?.closest?.('button') || e?.target?.closest?.('a')) return
    goDetail()
  }

  const isFav = typeof isFavorite === 'function' ? isFavorite(property) : false

  const metaRow =
    hasTimer && (property.area || property.sqft || property.rooms || property.bathrooms) ? (
      <div className="auction-mobile-meta">
        {(property.area || property.sqft) && (
          <span>
            <BiArea size={15} />
            {property.area || property.sqft} {t('squareMeters')}
          </span>
        )}
        {(property.rooms || property.beds || property.bedrooms) && (
          <span>
            <MdBed size={15} />
            {property.rooms || property.beds || property.bedrooms}
          </span>
        )}
        {property.bathrooms ? (
          <span>
            <MdOutlineBathtub size={15} />
            {property.bathrooms}
          </span>
        ) : null}
      </div>
    ) : null

  const handleFavoriteClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const added = onFavoriteToggle(property, e)
    if (!added || reduceMotion) return
    const el = favoriteBtnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setLikeBurst({
      key: Date.now(),
      origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    })
  }

  const privateClubCard = showMobilePrivateClubHero && view === 'card'

  const debtsBodyFlipTimerEl =
    isDebtProperty &&
    hasTimer &&
    !isReserved &&
    effectiveAuctionEnd &&
    !showCircularOnCard ? (
      <ListingCardAuctionTimer
        endTime={effectiveAuctionEnd}
        endedLabel={t('propertyDetailAuctionCompleted')}
        className="auction-mobile-debts-timer"
      />
    ) : null

  const greenCardTimerEl =
    greenOnImage && view === 'card' ? (
      <div className="auction-mobile-body-timer">
        <PropertyTimer
          endTime={effectiveAuctionEnd}
          compact
          className="property-timer--auction-mobile property-timer--auction-mobile-inline"
          auctionEndedLabel={t('propertyDetailAuctionCompleted')}
        />
      </div>
    ) : null

  const redCardTimerEl =
    view === 'card' && redOnImage ? (
      <div className="auction-mobile-body-circular-timer auction-mobile-body-circular-timer--overlap">
        <CircularTimer
          endTime={property.test_timer_end_date}
          size={54}
          strokeWidth={4}
          originalDuration={normalizedTestTimerDuration}
          progressKey={`auction-mobile:${property.id}`}
          auctionEndedLabel={t('auctionCircularEndedShort')}
        />
      </div>
    ) : null

  const buyEndedCardTimerEl =
    view === 'card' && buyNowEndedSealOnImage ? (
      <div className="auction-mobile-body-circular-timer auction-mobile-body-circular-timer--overlap">
        <CircularTimer
          endTime={property.buy_now_completed_at}
          size={54}
          strokeWidth={4}
          auctionEndedLabel={t('auctionCircularEndedShort')}
        />
      </div>
    ) : null

  const locationEl = property.location ? (
    <p className="auction-mobile-loc">
      <MapPin size={14} strokeWidth={2} />
      <span>{property.location}</span>
    </p>
  ) : null

  const buyNowWinnerEl =
    buyNowWinnerId != null && !isAuctionListingEnded(property) ? (
      <p className="auction-mobile-buy-now-winner" role="status">
        {t('propertyCardBuyNowWinner', { id: buyNowWinnerId })}
      </p>
    ) : null

  return (
    <div className="auction-mobile-item-wrap">
      {likeBurst ? (
        <AuctionLikeHeartsBurst
          origin={likeBurst.origin}
          burstKey={likeBurst.key}
          onDone={() => setLikeBurst(null)}
        />
      ) : null}
      <motion.div
        layout
        transition={snappySpring}
        className={cn(
          'auction-mobile-item',
          view === 'list' && 'auction-mobile-item--list auction-mobile--list',
          view === 'card' && 'auction-mobile-item--card auction-mobile--card',
          isAuctionEndedCard && 'auction-mobile-item--ended',
          `auction-mobile-item--buyer-${listingState.state}`,
          privateClubCard && 'auction-mobile-item--private-club-card',
        )}
        onClick={handleCardClick}
        style={{ cursor: 'pointer' }}
        whileTap={reduceMotion ? undefined : { scale: 0.992 }}
      >
        <div className="auction-mobile-item__media">
          <div className="auction-mobile-image-wrap">
            <ImageWithSkeleton
              imgProps={propertyImageProps}
              alt={propertyTitle}
              className="rounded-[inherit]"
              containerClassName="rounded-[inherit]"
            />
            <BuyerStatusRibbon listingState={listingState} />
            <button
              ref={favoriteBtnRef}
              type="button"
              className={cn(
                'auction-mobile-favorite-btn auction-mobile-favorite-btn--media',
                isFav && 'auction-mobile-favorite-btn--active',
              )}
              onClick={handleFavoriteClick}
              aria-label="favorite"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill={isFav ? 'currentColor' : 'none'}
                />
              </svg>
            </button>
            {viewerHasVip &&
            isPrivateClubAuctionLot(property) &&
            !isAuctionListingEnded(property) &&
            !isAuctionEndedCard &&
            (view === 'list' || !showMobilePrivateClubHero) ? (
              <span
                className="property-vip-club-badge auction-mobile-vip-club-badge"
                role="img"
                aria-label={t('auctionPrivateClubLotTooltip')}
                title={t('auctionPrivateClubLotTooltip')}
                onClick={(e) => e.stopPropagation()}
              >
                {t('auctionPrivateClubVipBadge')}
              </span>
            ) : null}
            {!isReserved &&
            !showMobilePrivateClubHero &&
            (showBuyNow || hasTestDrive) &&
            !isAuctionListingEnded(property) && (
              <div
                className="auction-mobile-photo-icons"
                onClick={(e) => e.stopPropagation()}
              >
                {showBuyNow && (
                  <AuctionPhotoHint type="buy" tooltipKey="buyNowTooltip" onGo={goDetail} />
                )}
                {hasTestDrive && (
                  <AuctionPhotoHint type="test" tooltipKey="testDriveTooltip" onGo={goDetail} />
                )}
              </div>
            )}
            {view === 'list' && redOnImage && (
              <div className="auction-mobile-circular-timer auction-mobile-circular-timer--list-bottom">
                <CircularTimer
                  endTime={property.test_timer_end_date}
                  size={54}
                  strokeWidth={4}
                  originalDuration={normalizedTestTimerDuration}
                  progressKey={`auction-mobile:${property.id}`}
                  auctionEndedLabel={t('auctionCircularEndedShort')}
                />
              </div>
            )}
            {view === 'list' && buyNowEndedSealOnImage && (
              <div className="auction-mobile-circular-timer auction-mobile-circular-timer--list-bottom">
                <CircularTimer
                  endTime={property.buy_now_completed_at}
                  size={54}
                  strokeWidth={4}
                  auctionEndedLabel={t('auctionCircularEndedShort')}
                />
              </div>
            )}
            {greenOnImage && view !== 'card' && (
              <div className="property-timer-overlay auction-mobile-timer-slot">
                <PropertyTimer
                  endTime={effectiveAuctionEnd}
                  compact
                  className="property-timer--auction-mobile"
                  auctionEndedLabel={t('propertyDetailAuctionCompleted')}
                />
              </div>
            )}
          </div>
        </div>

        <div className="auction-mobile-item__body">
          {!privateClubCard && debtsBodyFlipTimerEl}
          {!privateClubCard && greenCardTimerEl}
          {!privateClubCard && redCardTimerEl}
          {!privateClubCard && buyEndedCardTimerEl}

          <div className="auction-mobile-head">
            <h3 className="auction-mobile-card-title">{propertyTitle}</h3>
          </div>

          {privateClubCard ? (
            <div
              className="auction-mobile-private-club-card-slot"
              onClick={(e) => e.stopPropagation()}
            >
              <AuctionPrivateClubMobileHero t={t} layout="cardBody" onGo={goDetail} />
            </div>
          ) : null}

          {!privateClubCard ? locationEl : null}
          {!privateClubCard ? buyNowWinnerEl : null}

          {isDebtProperty && property.debt_amount != null && property.debt_amount !== '' && !Number.isNaN(Number(property.debt_amount)) ? (
            <>
              <div className="auction-mobile-price-row auction-mobile-price-row--debt-inline">
                <span className="auction-mobile-price-row__label">{t('debtsDebtAmount')}</span>
                <span className="auction-mobile-price-row__value">
                  {formatPrice(Number(property.debt_amount), property.currency)}
                </span>
              </div>
              <div className="auction-mobile-price-row auction-mobile-price-row--debt-inline">
                <span className="auction-mobile-price-row__label">{t('currentBid')}</span>
                <span className="auction-mobile-price-row__value">
                  {formatPrice(resolveAuctionCurrentBidValue(property), property.currency)}
                </span>
              </div>
            </>
          ) : (
            <div className="auction-mobile-price-row">
              <span className="auction-mobile-price-row__label">
                {hasTimer ? t('currentBid') : t('auctionAskingPrice')}
              </span>
              <span className="auction-mobile-price-row__value">{formatPrice(displayPriceValue, property.currency)}</span>
            </div>
          )}

          {privateClubCard ? locationEl : null}
          {privateClubCard ? buyNowWinnerEl : null}

          {privateClubCard && greenCardTimerEl}
          {privateClubCard && redCardTimerEl}
          {privateClubCard && buyEndedCardTimerEl}

          {view === 'list' ? (
            metaRow ?? (
              <div className="auction-mobile-meta auction-mobile-meta--placeholder" aria-hidden />
            )
          ) : (
            metaRow
          )}

          {showMobilePrivateClubHero && view === 'card' ? null : (
            <div
              className={cn('property-actions auction-mobile-actions')}
              onClick={(e) => e.stopPropagation()}
            >
              {showMobilePrivateClubHero && view === 'list' ? (
                <AuctionPrivateClubMobileHero t={t} layout="inline" onGo={goDetail} />
              ) : (
                <>
                  {!blocksBid ? (
                    <button
                      type="button"
                      className={cn('btn btn-primary btn-liquid-glass')}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        goDetail()
                      }}
                      disabled={isReserved}
                      style={{
                        opacity: isReserved ? 0.5 : 1,
                        cursor: isReserved ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isReserved ? t('objectReserved') : t('placeBid')}
                    </button>
                  ) : null}
                  {showBuyNow && !blocksPurchase && !isAuctionListingEnded(property) && (
                    <button
                      type="button"
                      className="btn btn-buy-now btn-liquid-glass-buy"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (isReserved) {
                          showNotification(t('objectReservedNotification'))
                          return
                        }
                        if (!buyNowEmailOk) {
                          showNotification(t('buyNowEmailRequired'))
                          return
                        }
                        goDetail()
                      }}
                      disabled={isReserved || !buyNowEmailOk}
                      title={!buyNowEmailOk ? t('buyNowEmailRequired') : undefined}
                      style={{
                        opacity: isReserved || !buyNowEmailOk ? 0.45 : 1,
                        cursor:
                          isReserved || !buyNowEmailOk ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isReserved ? t('objectReserved') : t('buyNowSectionTitle')}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {isAuctionEndedCard ? (
            <button
              type="button"
              className="buyer-card-final-action auction-mobile-final-action"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                goDetail({ auctionTab: PROPERTY_DETAIL_AUCTION_TAB_BIDS, auctionSoldOutNotice: true })
              }}
            >
              <span>{listingState.state === 'sold' ? 'Сделка завершена' : 'Торги завершены'}</span>
              <strong>{t('auctionResultSummary')} <span aria-hidden>→</span></strong>
            </button>
          ) : null}
        </div>
      </motion.div>
    </div>
  )
}
```
