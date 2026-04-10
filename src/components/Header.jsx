import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation, Link, NavLink } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  FiBell,
  FiSearch,
  FiChevronDown,
  FiX,
  FiUser,
  FiGlobe,
} from 'react-icons/fi'
import LoginModal from './LoginModal'
import { getUserData, clearUserData } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import { navigateToWallet } from '../utils/walletNavigation'
import { fetchUserById } from '../utils/usersApi'
import {
  fetchUserNotifications,
  invalidateUserNotificationsCache,
} from '../utils/notificationsApi'
import '../pages/MainPage.css'
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon'
import { UI_LANGUAGES } from '../constants/uiLanguages'

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { user, isLoaded: userLoaded } = useUser()
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuClosing, setIsMenuClosing] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [userPhoto, setUserPhoto] = useState(null) // Фотография пользователя
  const [isLoggedIn, setIsLoggedIn] = useState(false) // Статус авторизации
  const [hasIncompleteProfile, setHasIncompleteProfile] = useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false) // Состояние AI чата для страницы аукцион
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const languageDropdownRef = useRef(null)
  const notificationRef = useRef(null)
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
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false)
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

  // Открываем модальное окно регистрации/входа принудительно (например после OAuth)
  useEffect(() => {
    const forceOpen = sessionStorage.getItem('login_modal_force_open')
    if (forceOpen === 'true') {
      setIsLoginModalOpen(true)
      sessionStorage.removeItem('login_modal_force_open')
    }
  }, [location.pathname])

  // Дополнительно: ловим кастомное событие от OAuth-обработчиков.
  // Это важно, если URL не менялся (например, мы уже на '/').
  useEffect(() => {
    const onForceOpenLoginModal = () => {
      const forceOpen = sessionStorage.getItem('login_modal_force_open')
      if (forceOpen === 'true') {
        setIsLoginModalOpen(true)
        sessionStorage.removeItem('login_modal_force_open')
      }
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
              } else if (!result.ok) {
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
  const searchablePages = [
    { path: '/', keywords: ['главная', 'home', 'начало', 'старт'], titleKey: 'home', requiresAuth: false, allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] },
    { path: '/auction', keywords: ['аукцион', 'auction', 'торги', 'продажа', 'недвижимость'], titleKey: 'auction', requiresAuth: false, allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] },
    { path: '/map', keywords: ['карта', 'map', 'карты', 'локация', 'место'], titleKey: 'mapLink', requiresAuth: false, allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] },
    { path: '/calculator', keywords: ['калькулятор', 'calculator', 'доходность', 'рендита', 'profitability', 'доход', 'инвестиции'], titleKey: 'calculator', requiresAuth: false, allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] },
    { path: '/chat?manager=1', keywords: ['чат', 'chat', 'сообщения', 'messages', 'переписка'], titleKey: 'chat', requiresAuth: false, allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] },
    { path: '/profile', keywords: ['профиль', 'profile', 'аккаунт', 'личный кабинет', 'настройки', 'settings'], titleKey: 'profile', requiresAuth: true, allowedRoles: ['buyer', 'client', 'admin'] },
    { path: '/favorites', keywords: ['избранное', 'favorites', 'избранные', 'закладки', 'bookmarks'], titleKey: 'favorites', requiresAuth: true, allowedRoles: ['buyer', 'client', 'admin'] },
    { path: '/wallet', keywords: ['кошелек', 'wallet', 'баланс', 'balance', 'деньги', 'money', 'платежи', 'payments'], titleKey: 'wallet', requiresAuth: true, allowedRoles: ['buyer', 'client', 'admin'] },
    { path: '/data', keywords: ['данные', 'data', 'информация', 'information', 'персональные данные'], titleKey: 'data', requiresAuth: true, allowedRoles: ['buyer', 'client', 'admin'] },
    { path: '/subscriptions', keywords: ['подписки', 'subscriptions', 'подписка', 'subscription', 'тарифы', 'tariffs'], titleKey: 'subscriptions', requiresAuth: true, allowedRoles: ['buyer', 'client', 'admin'] },
    { path: '/history', keywords: ['история', 'history', 'история покупок', 'покупки', 'purchases'], titleKey: 'history', requiresAuth: true, allowedRoles: ['buyer', 'client', 'admin'] },
    { path: '/bonuses', keywords: ['бонусы', 'bonuses', 'промокод', 'промокоды', 'задания'], titleKey: 'bonuses', requiresAuth: true, allowedRoles: ['buyer', 'client', 'admin'] },
    { path: '/owner', keywords: ['кабинет продавца', 'owner', 'продавец', 'seller', 'владелец', 'dashboard', 'дашборд'], titleKey: 'ownerDashboard', requiresAuth: true, requiresRole: ['seller', 'owner'], allowedRoles: ['seller', 'owner', 'admin'] },
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

  // Обработка выбора результата поиска
  const handleSearchResultClick = (page) => {
    const access = checkPageAccess(page)
    
    if (!access.allowed) {
      if (access.reason === 'auth') {
        setIsSearchOpen(false)
        setSearchQuery('')
        setIsLoginModalOpen(true)
      } else {
        // Показываем сообщение об ошибке доступа
        alert(access.message)
      }
      return
    }

    // Переходим на страницу
    if (page.path === '/wallet') {
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

  const unreadNotificationsCount = notifications.filter((n) => n.view_count === 0).length

  const getNotificationClass = (notification) => {
    if (notification.type === 'verification_success') return 'notification-item--success'
    if (notification.type === 'verification_rejected') return 'notification-item--error'
    if (notification.type === 'bid_outbid') return 'notification-item--warning'
    if (notification.type === 'buy_now_approved') return 'notification-item--success'
    if (notification.type === 'buy_now_rejected') return 'notification-item--error'
    if (notification.type === 'auction_won') return 'notification-item--success'
    if (notification.type === 'auction_lost') return 'notification-item--warning'
    if (notification.type === 'payment_deadline') return 'notification-item--warning'
    if (notification.type === 'test_drive_request') return 'notification-item--warning'
    if (notification.type === 'test_drive_result') return 'notification-item--success'
    return 'notification-item--property'
  }

  const handleNotificationView = async (notificationId) => {
    try {
      await fetch(`${await getApiBaseUrl()}/notifications/${notificationId}/view`, {
        method: 'PUT'
      })
      const dbUserId = localStorage.getItem('userId')
      if (dbUserId && /^\d+$/.test(String(dbUserId).trim())) {
        invalidateUserNotificationsCache(dbUserId)
      }
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, view_count: Math.max(1, notification.view_count || 0) }
            : notification
        )
      )
    } catch (error) {
      console.error('Ошибка при просмотре уведомления:', error)
    }
  }

  useEffect(() => {
    const loadNotifications = async () => {
      if (!isLoggedIn) {
        setNotifications([])
        return
      }

      const dbUserId = localStorage.getItem('userId')
      if (!dbUserId || !/^\d+$/.test(String(dbUserId).trim())) {
        setNotifications([])
        return
      }

      setNotificationsLoading(true)
      try {
        const parsedNotifications = await fetchUserNotifications(dbUserId, { ttlMs: 15000 })
        setNotifications(parsedNotifications || [])
      } catch (error) {
        console.error('Ошибка загрузки уведомлений:', error)
        setNotifications([])
      } finally {
        setNotificationsLoading(false)
      }
    }

    loadNotifications()
    if (!isLoggedIn) return

    const handleFocus = () => loadNotifications()
    window.addEventListener('focus', handleFocus)
    const pollId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadNotifications()
      }
    }, 120000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(pollId)
    }
  }, [isLoggedIn])

  return (
    <>
      {/* Новый хедер для десктопной версии */}
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
            
            {/* Модальное окно меню */}
            {(isMenuOpen || isMenuClosing) && (
              <>
                <div 
                  className={`menu-backdrop ${isMenuClosing ? 'menu-backdrop--closing' : ''}`}
                  onClick={(e) => {
                    const menuBtn = menuRef.current?.querySelector('.new-header__menu-btn')
                    const menuDropdown = document.querySelector('.menu-dropdown')
                    
                    if (menuBtn && menuBtn.contains(e.target)) {
                      return
                    }
                    
                    if (menuDropdown && menuDropdown.contains(e.target)) {
                      return
                    }
                    
                    setIsMenuClosing(true)
                    setTimeout(() => {
                      setIsMenuOpen(false)
                      setIsMenuClosing(false)
                    }, 300)
                  }}
                />
                <div 
                  className={`menu-dropdown ${isMenuClosing ? 'menu-dropdown--closing' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="menu-dropdown__content">
                    <button
                      type="button"
                      className="menu-dropdown__close-btn"
                      aria-label={t('closeMenu')}
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsMenuClosing(true)
                        setTimeout(() => {
                          setIsMenuOpen(false)
                          setIsMenuClosing(false)
                        }, 300)
                      }}
                    >
                      <FiX size={22} />
                    </button>
                    <div className="menu-dropdown__columns">
                      <div className="menu-dropdown__column">
                        <h3 className="menu-dropdown__column-title">{t('navSiteTitle')}</h3>
                        <div className="menu-dropdown__column-items">
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>{t('home')}</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/auction')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>{t('auction')}</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/map')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>{t('mapLink')}</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/debts')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>{t('debtsTitle')}</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/favorites')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>{t('favorites')}</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/shares')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>{t('shares')}</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/chat?manager=1')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>{t('chat')}</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/bonuses')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>{t('bonuses')}</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/calculator')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>{t('calculator')}</span>
                          </button>
                        </div>
                      </div>
                      <div className="menu-dropdown__column">
                        <h3 className="menu-dropdown__column-title">{t('profile')}</h3>
                        <div className="menu-dropdown__column-items">
                          {isLoggedIn ? (
                            <>
                              <button 
                                className="menu-dropdown__item"
                                onClick={() => {
                                  navigate('/profile')
                                  setIsMenuOpen(false)
                                }}
                              >
                                <span>{t('profile')}</span>
                              </button>
                              <button 
                                className="menu-dropdown__item"
                                onClick={() => {
                                  navigateToWallet(navigate, location.pathname)
                                  setIsMenuOpen(false)
                                }}
                              >
                                <span>{t('wallet')}</span>
                              </button>
                              <button 
                                className="menu-dropdown__item"
                                onClick={() => {
                                  navigate('/subscriptions')
                                  setIsMenuOpen(false)
                                }}
                              >
                                <span>{t('subscriptions')}</span>
                              </button>
                              <button 
                                className="menu-dropdown__item"
                                onClick={() => {
                                  navigate('/data')
                                  setIsMenuOpen(false)
                                }}
                              >
                                <span>{t('data')}</span>
                              </button>
                            </>
                          ) : (
                            <button 
                              className="menu-dropdown__item"
                              onClick={() => {
                                setIsLoginModalOpen(true)
                                setIsMenuOpen(false)
                              }}
                            >
                              <span>{t('logIn')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="new-header__filters">
            <button
              type="button"
              className={`new-header__filter-btn ${location.pathname === '/chat' ? 'new-header__filter-btn--active' : ''}`}
              onClick={() => navigate('/chat?manager=1')}
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
              className={`new-header__filter-btn ${location.pathname === '/auction' ? (isAIChatOpen ? 'new-header__filter-btn--active' : '') : (location.pathname === '/chat' ? 'new-header__filter-btn--active' : '')}`}
              onClick={() => {
                // Если мы на странице аукцион, открываем AI консультант
                if (location.pathname === '/auction') {
                  // Диспатчим событие для открытия AI чата
                  window.dispatchEvent(new CustomEvent('openAIChat'))
                } else {
                  // На других страницах переходим на /chat
                  navigate('/chat')
                }
              }}
            >
              <span>{t('aiAssistant')}</span>
            </button>
            <button
              type="button"
              className={`new-header__filter-btn ${location.pathname === '/map' ? 'new-header__filter-btn--active' : ''}`}
              onClick={() => navigate('/map')}
            >
              <span>{t('map')}</span>
            </button>
          </div>

          <div className="new-header__right" ref={notificationRef}>
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
                {location.pathname === '/auction' ? (
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
                      navigate('/owner')
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
                      setIsLoginModalOpen(true)
                      return
                    }

                    // Переходим в профиль, если Clerk привязан к записи в нашей БД
                    if (userLoaded && user && localHasDbUser) {
                      navigate('/profile')
                      return
                    }

                    // Локальная сессия (email, Telegram, WhatsApp и т.д.) — как на главной (MainPage), без Clerk
                    if (userData.isLoggedIn) {
                      navigate('/profile')
                      return
                    }

                    // Не авторизован — открываем модалку
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
                <button 
                  type="button" 
                  className="new-header__notification-btn"
                  onClick={() => setIsNotificationOpen((prev) => !prev)}
                  aria-expanded={isNotificationOpen}
                >
                  <FiBell size={20} />
                  {unreadNotificationsCount > 0 && <span className="new-header__notification-indicator" />}
                </button>
              </>
            )}
            {isNotificationOpen && (
              <>
                <div 
                  className="notification-backdrop"
                  onClick={() => setIsNotificationOpen(false)}
                />
                <div className="notification-panel">
                  <div className="notification-panel__content">
                    <div className="notification-panel__header">
                      <h3 className="notification-panel__title">{t('notifications')}</h3>
                      <button 
                        type="button" 
                        className="notification-panel__close"
                        onClick={() => setIsNotificationOpen(false)}
                        aria-label={t('closeNotifications')}
                      >
                        <FiX size={20} />
                      </button>
                    </div>
                    <div className="notification-panel__list">
                      {notificationsLoading ? (
                        <div style={{ padding: '20px', textAlign: 'center' }}>{t('loading')}</div>
                      ) : notifications.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                          {t('noNotifications')}
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`notification-item ${getNotificationClass(notification)}`}
                            onClick={() => {
                              if (notification.type === 'test_drive_request') return
                              handleNotificationView(notification.id)
                            }}
                          >
                            <div className="notification-item__content">
                              <h4 className="notification-item__title">{notification.title}</h4>
                              {notification.message && (
                                <p className="notification-item__message">{notification.message}</p>
                              )}
                              {notification.data?.property_id && (
                                <div className="notification-item__property">
                                  <div className="notification-item__info">
                                    <button
                                      type="button"
                                      className="notification-item__button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setIsNotificationOpen(false)
                                        handleNotificationView(notification.id)
                                        navigate(`/property/${notification.data.property_id}`)
                                      }}
                                    >
                                      {t('goTo') || 'Перейти'}
                                      <FiChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
                                    </button>
                                  </div>
                                </div>
                              )}
                              {!notification.data?.property_id && notification.type === 'buy_now_approved' && (
                                <div className="notification-item__property">
                                  <div className="notification-item__info">
                                    <button
                                      type="button"
                                      className="notification-item__button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setIsNotificationOpen(false)
                                        handleNotificationView(notification.id)
                                        navigate('/history')
                                      }}
                                    >
                                      {t('goTo') || 'Перейти'}
                                      <FiChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      
      {/* Модальное окно входа/регистрации */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </>
  )
}

export default Header

