import { useState, useRef, useEffect } from 'react'
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
import LoginModal from './LoginModal'
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
import SiteNavDrawer from './SiteNavDrawer'
import { setSiteNavDrawerOpen } from '../utils/siteNavDrawerDocumentFlag'

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
            
            <SiteNavDrawer
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
                {location.pathname !== '/' ? (
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
                    <button 
                      type="button"
                      className="new-header__auction-btn"
                      onClick={() => navigate('/')}
                    >
                      {t('home')}
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button"
                      className="new-header__auction-btn"
                      onClick={() => navigate('/auction')}
                    >
                      {t('auction')}
                    </button>
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
                  </>
                )}
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
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => {
          setIsLoginModalOpen(false)
          setLoginModalEntry('direct')
        }}
        authEntryVariant={loginModalEntry === 'wizard' ? 'header_wizard' : 'default'}
      />

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

