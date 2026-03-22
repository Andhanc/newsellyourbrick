import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import MainPage from './pages/MainPage'
import OAuthBridgePage from './pages/OAuthBridgePage'
import Footer from './components/Footer'
import ClerkAuthSync from './components/ClerkAuthSync'
import ClerkAuthHandler from './components/ClerkAuthHandler'
import ToastContainer from './components/ToastContainer'
import VisitorHeartbeat from './components/VisitorHeartbeat'
import UserCabinetSseBridge from './components/UserCabinetSseBridge'
import { validateSession, getUserData } from './services/authService'
import { prefetchAuctionList } from './services/auctionListCache'
import './App.css'
import { GlassFilterDefs } from './components/ui/GlassFilterDefs'

// Ленивая загрузка страниц — чанк грузится только при переходе на маршрут
const Home = lazy(() => import('./pages/Home'))
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'))
const TestDriveBookingPage = lazy(() => import('./pages/TestDriveBookingPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const Profile = lazy(() => import('./pages/Profile'))
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'))
const Data = lazy(() => import('./pages/Data'))
const Subscriptions = lazy(() => import('./pages/Subscriptions'))
const History = lazy(() => import('./pages/History'))
const Chat = lazy(() => import('./pages/Chat'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Bonuses = lazy(() => import('./pages/Bonuses'))
const Shares = lazy(() => import('./pages/Shares'))
const Debts = lazy(() => import('./pages/Debts'))
const ShareDetailPage = lazy(() => import('./pages/ShareDetailPage'))
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard'))
const TelegramAuthCallback = lazy(() => import('./pages/TelegramAuthCallback'))
const AddProperty = lazy(() => import('./pages/AddProperty'))
const Wallet = lazy(() => import('./pages/Wallet'))
const SearchResults = lazy(() => import('./pages/SearchResults'))
const AdminPanelPage = lazy(() => import('./admin/AdminPanelPage'))
const About = lazy(() => import('./pages/About'))
const InvestmentCalculator = lazy(() => import('./pages/InvestmentCalculator'))
const JetonPage = lazy(() => import('./pages/JetonPage'))
const BlockedUserModal = lazy(() => import('./components/BlockedUserModal'))

const PageFallback = () => <div className="app-page-fallback" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true" />

// Компонент для валидации сессии при запуске приложения
function SessionValidator({ onBlockedChange }) {
  useEffect(() => {
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
        if (!result.valid && result.cleared) {
          console.log('✅ Устаревшая сессия автоматически очищена при запуске приложения')
          // Перезагружаем страницу для полного сброса состояния
          window.location.reload()
        } else if (result.valid) {
          console.log('✅ Сессия валидна, пользователь авторизован')
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
    
    return () => clearTimeout(timeoutId)
  }, [onBlockedChange])

  return null
}

// Компонент для прокрутки страницы вверх при изменении маршрута
function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    // Прокручиваем страницу вверх при каждом изменении маршрута
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Используем 'instant' вместо 'smooth' для мгновенной прокрутки
    })
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
  '/bonuses',
  '/favorites',
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
  // Инициализируем состояние блокировки из localStorage сразу
  const [isBlocked, setIsBlocked] = useState(() => {
    const isBlockedFlag = localStorage.getItem('isBlocked') === 'true';
    console.log('🔍 Начальное состояние блокировки из localStorage:', isBlockedFlag);
    return isBlockedFlag;
  });

  // Проверяем блокировку при загрузке пользователя из localStorage
  useEffect(() => {
    console.log('🔍 Начинаем проверку блокировки пользователя...');
    
    const checkBlockedStatus = async () => {
      // Сначала проверяем флаг блокировки в localStorage
      const isBlockedFlag = localStorage.getItem('isBlocked') === 'true';
      const blockedUserId = localStorage.getItem('blockedUserId');
      
      console.log('🔍 Флаг блокировки в localStorage:', { isBlockedFlag, blockedUserId });
      
      if (isBlockedFlag && blockedUserId) {
        // Если есть флаг блокировки, сразу показываем модальное окно
        console.log('🚫 Пользователь заблокирован (найден флаг в localStorage), показываем модальное окно');
        setIsBlocked(true);
        
        // Дополнительно проверяем статус в БД
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
          const response = await fetch(`${API_BASE_URL}/users/${blockedUserId}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.is_blocked === 1) {
              console.log('✅ Подтверждено: пользователь заблокирован в БД');
              setIsBlocked(true);
            } else {
              // Если пользователь разблокирован, очищаем флаги
              console.log('✅ Пользователь разблокирован в БД, очищаем флаги');
              localStorage.removeItem('isBlocked');
              localStorage.removeItem('blockedUserId');
              setIsBlocked(false);
            }
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
      console.log('🔍 Данные пользователя:', { isLoggedIn: userData.isLoggedIn, id: userData.id });
      
      // Используем числовой ID из БД (из localStorage), а не Clerk ID
      const dbUserId = localStorage.getItem('userId')
      if (userData.isLoggedIn && dbUserId && /^\d+$/.test(dbUserId)) {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
          const response = await fetch(`${API_BASE_URL}/users/${dbUserId}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.is_blocked === 1) {
              console.log('🚫 Пользователь заблокирован (найдено в БД), сохраняем флаг');
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

  // Prefetch списка аукциона при старте — на /auction объекты покажутся сразу, без "Загрузка объявлений..."
  useEffect(() => {
    prefetchAuctionList()
  }, [])

  console.log('🔍 App render, isBlocked:', isBlocked);

  const tonManifestUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tonconnect-manifest.json`
    : '/tonconnect-manifest.json'

  return (
    <TonConnectUIProvider manifestUrl={tonManifestUrl}>
    <Router>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <ScrollToTop />
      <MainPageViewportLock />
      <AuctionMobileOverflowLock />
      <ReferralCapture />
      <VisitorHeartbeat />
      <SessionValidator onBlockedChange={setIsBlocked} />
      <UserCabinetSseBridge />
      <AdminSessionCleaner />
      <ClerkAuthSync />
      <ClerkAuthHandler />
      <GlassFilterDefs />
      <div className={`app-layout ${isBlocked ? 'app-layout--blocked' : ''}`}>
        <div className="app-layout__content">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/auction" element={<Home />} />
              <Route path="/main" element={<Home />} />
              <Route path="/property/:id/test-drive" element={<TestDriveBookingPage />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
              <Route path="/search-results" element={<SearchResults />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/profile/bookings" element={<MyBookingsPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/oauth-bridge" element={<OAuthBridgePage />} />
              <Route path="/auth/telegram-callback" element={<TelegramAuthCallback />} />
              <Route path="/data" element={<Data />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/history" element={<History />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/bonuses" element={<Bonuses />} />
              <Route path="/shares" element={<Shares />} />
              <Route path="/debts" element={<Debts />} />
              <Route path="/about" element={<About />} />
              <Route path="/shares/:id" element={<ShareDetailPage />} />
              <Route path="/calculator" element={<InvestmentCalculator />} />
              <Route path="/jeton" element={<JetonPage />} />
              <Route path="/owner" element={<OwnerDashboard />} />
              <Route path="/owner/property/new" element={<AddProperty />} />
              <Route path="/property/:id/edit" element={<AddProperty />} />
              <Route path="/admin" element={<AdminPanelPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
        <Footer />
      </div>
      {isBlocked && (
        <Suspense fallback={null}>
          <BlockedUserModal isOpen={true} />
        </Suspense>
      )}
      <ToastContainer />
    </Router>
    </TonConnectUIProvider>
  )
}

export default App

