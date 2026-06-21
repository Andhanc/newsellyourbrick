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
import { GlassFilterDefs } from './components/ui/GlassFilterDefs'
import { LayoutScrollRefContext } from './context/LayoutScrollContext'
import { scrollMainTo } from './utils/mainScroll'
import { lazyWithRetry } from './utils/lazyWithRetry'
import RouteErrorBoundary from './components/RouteErrorBoundary'
import OwnerTestCabinetPageFallback from './components/OwnerTestCabinetPageFallback'
import SiteFooterNearObserver from './components/SiteFooterNearObserver'
import ChatDockActiveBridge from './components/ChatDockActiveBridge'
import MainPage from './pages/MainPage'
import Home from './pages/Home'
import SiteNotificationsProvider from './context/SiteNotificationsContext'
import SiteAdsHost from './components/siteAds/SiteAdsHost'
import SiteAdsErrorBoundary from './components/siteAds/SiteAdsErrorBoundary'
import DebtsPage from './pages/Debts'
import SearchResults from './pages/SearchResults'
import PropertyDetailPage from './pages/PropertyDetailPage'
import CabinetDataRedirect from './components/CabinetDataRedirect'

// Ленивая загрузка страниц — чанк грузится только при переходе на маршрут
const TestDriveBookingPage = lazyWithRetry(() => import('./pages/TestDriveBookingPage'))
const TestDriveCheckInRoute = lazyWithRetry(() => import('./pages/TestDriveCheckInRoute'))
const TestDriveSurveyPage = lazyWithRetry(() => import('./pages/TestDriveSurveyPage'))
const TestDriveExitFeedbackPage = lazyWithRetry(() => import('./pages/TestDriveExitFeedbackPage'))
const MapPage = lazyWithRetry(() => import('./pages/MapPage'))
const MyBookingsPage = lazyWithRetry(() => import('./pages/MyBookingsPage'))
const Profile = lazyWithRetry(() => import('./pages/Profile'))
const Subscriptions = lazyWithRetry(() => import('./pages/Subscriptions'))
const History = lazyWithRetry(() => import('./pages/History'))
const Chat = lazyWithRetry(() => import('./pages/Chat'))
const Favorites = lazyWithRetry(() => import('./pages/Favorites'))
const Compare = lazyWithRetry(() => import('./pages/Compare'))
const Bonuses = lazyWithRetry(() => import('./pages/Bonuses'))
const PrivateClub = lazyWithRetry(() => import('./pages/PrivateClub'))
const OwnerDashboard = lazyWithRetry(() => import('./pages/OwnerDashboard'))
const TelegramAuthCallback = lazyWithRetry(() => import('./pages/TelegramAuthCallback'))
const AddProperty = lazyWithRetry(() => import('./pages/AddProperty'))
const Wallet = lazyWithRetry(() => import('./pages/Wallet'))
const AdminPanelPage = lazyWithRetry(() => import('./admin/AdminPanelPage'))
const About = lazyWithRetry(() => import('./pages/About'))
const News = lazyWithRetry(() => import('./pages/News'))
const NewsArticlePage = lazyWithRetry(() => import('./pages/NewsArticlePage'))
const MarketerPanel = lazyWithRetry(() => import('./pages/MarketerPanel'))
const SectionsPage = lazyWithRetry(() => import('./pages/SectionsPage'))
const InvestmentCalculator = lazyWithRetry(() => import('./pages/InvestmentCalculator'))
const JetonPage = lazyWithRetry(() => import('./pages/JetonPage'))
const TestPage = lazyWithRetry(() => import('./pages/TestPage'))
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
  return NO_ZOOM_PATHS.has(pathname)
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
      const on = location.pathname === '/auction' && window.matchMedia('(max-width: 768px)').matches
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

/** Сразу после гидрации подгружаем чанк нижней части главной (витрины и сетки). */
function MainPageChunkPrefetch() {
  useEffect(() => {
    let cancelled = false
    const load = () => {
      if (!cancelled) void import('./pages/MainPageBelowFold')
    }
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(load, { timeout: 1800 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }
    const t = window.setTimeout(load, 0)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [])
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
      <MainPageChunkPrefetch />
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
              <Route path="/" element={<MainPage />} />
              <Route path="/auction" element={<Home />} />
              <Route path="/main" element={<Home />} />
              <Route
                path="/property/:id/test-drive"
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
                path="/profile/bookings/:bookingId/check-in"
                element={
                  <LazyPage>
                    <TestDriveCheckInRoute />
                  </LazyPage>
                }
              />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
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
                    <Profile />
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
              <Route
                path="/deposit"
                element={
                  <LazyPage>
                    <Wallet />
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
                path="/shares"
                element={
                  <LazyPage>
                    <LazyShares />
                  </LazyPage>
                }
              />
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
                path="/shares/:id"
                element={
                  <LazyPage>
                    <LazyShareDetailPage />
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
              <Route
                path="/jeton"
                element={
                  <LazyPage>
                    <JetonPage />
                  </LazyPage>
                }
              />
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
                    <OwnerDashboard />
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
                path="/property/:id/edit"
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
              <Route path="*" element={<Navigate to="/" replace />} />
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
    </Router>
    </div>
  )
}

export default App

