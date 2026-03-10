import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation, Link, NavLink } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
  FiBell,
  FiSearch,
  FiChevronDown,
  FiX,
  FiMenu,
  FiUser,
} from 'react-icons/fi'
import { IoLocationOutline } from 'react-icons/io5'
import { properties } from '../data/properties'
import LoginModal from './LoginModal'
import { getUserData, clearUserData } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import '../pages/MainPage.css'

const resortLocations = [
  'Costa Adeje, Tenerife',
  'Playa de las Américas, Tenerife',
  'Los Cristianos, Tenerife',
  'Puerto de la Cruz, Tenerife',
  'Santa Cruz de Tenerife, Tenerife',
  'La Laguna, Tenerife',
  'San Cristóbal de La Laguna, Tenerife',
  'Golf del Sur, Tenerife',
  'Callao Salvaje, Tenerife',
  'El Médano, Tenerife',
]

const Header = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { user, isLoaded: userLoaded } = useUser()
  const [selectedLocation, setSelectedLocation] = useState(resortLocations[0])
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMenuClosing, setIsMenuClosing] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [userPhoto, setUserPhoto] = useState(null) // Фотография пользователя
  const [isLoggedIn, setIsLoggedIn] = useState(false) // Статус авторизации
  const [isAIChatOpen, setIsAIChatOpen] = useState(false) // Состояние AI чата для страницы аукцион
  const locationRef = useRef(null)
  const notificationRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)
  const searchWrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setIsLocationOpen(false)
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
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
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

  // Загружаем фотографию пользователя при изменении авторизации
  useEffect(() => {
    const loadUserPhoto = async () => {
      // Проверяем авторизацию через Clerk
      if (userLoaded && user) {
        // Пользователь авторизован через Clerk
        const clerkPhoto = user.imageUrl || user.profileImageUrl || null
        setUserPhoto(clerkPhoto)
        setIsLoggedIn(true)
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
              const response = await fetch(`${API_BASE_URL}/users/${dbUserId}`)
              
              // Если пользователь в БД не найден (например, был удален админом) —
              // принудительно сбрасываем локальную сессию
              if (response.status === 404) {
                console.warn('⚠️ Локальная сессия пользователя устарела: пользователь не найден в БД. Очищаем данные.')
                clearUserData()
                setIsLoggedIn(false)
                setUserPhoto(null)
                return
              }

              if (response.ok) {
                const result = await response.json()
                if (result.success && result.data && result.data.user_photo) {
                  // Если user_photo начинается с /uploads, добавляем базовый URL
                  const photoPath = result.data.user_photo
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
              }
            } catch (error) {
              console.warn('⚠️ Не удалось загрузить фотографию из БД:', error)
            }
          }
          
          setUserPhoto(photo)
        } else {
          setIsLoggedIn(false)
          setUserPhoto(null)
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

  const handleLocationSelect = (location) => {
    setSelectedLocation(location)
    setIsLocationOpen(false)
  }

  // Определение страниц для поиска
  const searchablePages = [
    {
      path: '/',
      keywords: ['главная', 'home', 'начало', 'старт'],
      title: 'Главная',
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] // Доступна всем
    },
    {
      path: '/auction',
      keywords: ['аукцион', 'auction', 'торги', 'продажа', 'недвижимость'],
      title: 'Аукцион',
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] // Доступна всем
    },
    {
      path: '/map',
      keywords: ['карта', 'map', 'карты', 'локация', 'место'],
      title: 'Карта',
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] // Доступна всем
    },
    {
      path: '/chat',
      keywords: ['чат', 'chat', 'сообщения', 'messages', 'переписка'],
      title: 'Чат',
      requiresAuth: false,
      allowedRoles: ['buyer', 'seller', 'owner', 'admin', 'client'] // Доступна всем
    },
    {
      path: '/profile',
      keywords: ['профиль', 'profile', 'аккаунт', 'личный кабинет', 'личный', 'кабинет', 'настройки', 'settings'],
      title: 'Профиль',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/favorites',
      keywords: ['избранное', 'favorites', 'избранные', 'закладки', 'bookmarks'],
      title: 'Избранное',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/wallet',
      keywords: ['кошелек', 'wallet', 'баланс', 'balance', 'деньги', 'money', 'платежи', 'payments'],
      title: 'Кошелек',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/data',
      keywords: ['данные', 'data', 'информация', 'information', 'персональные данные'],
      title: 'Данные',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/subscriptions',
      keywords: ['подписки', 'subscriptions', 'подписка', 'subscription', 'тарифы', 'tariffs'],
      title: 'Подписки',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/history',
      keywords: ['история', 'history', 'история покупок', 'покупки', 'purchases'],
      title: 'История',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin'] // Только для покупателей и админов
    },
    {
      path: '/bonuses',
      keywords: ['бонусы', 'bonuses', 'промокод', 'промокоды', 'задания', 'инстаграм', 'тикток'],
      title: 'Бонусы',
      requiresAuth: true,
      allowedRoles: ['buyer', 'client', 'admin']
    },
    {
      path: '/owner',
      keywords: ['кабинет продавца', 'owner', 'продавец', 'seller', 'владелец', 'dashboard', 'дашборд', 'панель продавца'],
      title: 'Кабинет продавца',
      requiresAuth: true,
      requiresRole: ['seller', 'owner'],
      allowedRoles: ['seller', 'owner', 'admin'] // Только для продавцов и админов
    },
    {
      path: '/owner/property/new',
      keywords: ['добавить недвижимость', 'add property', 'новая недвижимость', 'создать объявление', 'разместить'],
      title: 'Добавить недвижимость',
      requiresAuth: true,
      requiresRole: ['seller', 'owner'],
      allowedRoles: ['seller', 'owner', 'admin'] // Только для продавцов и админов
    },
    {
      path: '/admin',
      keywords: ['админ', 'admin', 'администратор', 'administrator', 'панель администратора', 'админка'],
      title: 'Админ-панель',
      requiresAuth: true,
      requiresRole: ['admin'],
      allowedRoles: ['admin'] // Только для админов
    }
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
        const matchesTitle = page.title.toLowerCase().includes(queryLower)
        
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
    navigate(page.path)
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

  const firstProperty = properties[0] || {
    id: 1,
    title: 'Квартира',
    location: 'Москва',
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80']
  }

  return (
    <>
      {/* Новый хедер для десктопной версии */}
      <header className={`new-header ${isMenuOpen ? 'new-header--menu-open' : ''}`}>
        <div className={`new-header__container ${isMenuOpen ? 'new-header__container--menu-open' : ''}`}>
          <div className="new-header__left">
            <div className="new-header__location">
              <span className="new-header__location-icon">
                <IoLocationOutline size={20} />
              </span>
              <div className="new-header__location-info" ref={locationRef}>
                <span className="new-header__location-label">{t('location')}</span>
                <button
                  type="button"
                  className="new-header__location-select"
                  onClick={() => setIsLocationOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isLocationOpen}
                >
                  <span className="new-header__location-value">{selectedLocation}</span>
                  <FiChevronDown
                    size={16}
                    className={`new-header__location-select-icon ${
                      isLocationOpen ? 'new-header__location-select-icon--open' : ''
                    }`}
                  />
                </button>
                {isLocationOpen && (
                  <div className="new-header__location-dropdown">
                    {resortLocations.map((location) => (
                      <button
                        type="button"
                        className={`new-header__location-option ${
                          location === selectedLocation ? 'new-header__location-option--active' : ''
                        }`}
                        key={location}
                        onClick={() => handleLocationSelect(location)}
                      >
                        {location}
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
                aria-label="Меню"
                aria-expanded={isMenuOpen}
              >
                <FiMenu size={20} className="new-header__menu-icon" />
                <span>Меню</span>
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
                      aria-label="Закрыть меню"
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
                        <h3 className="menu-dropdown__column-title">Навигация по сайту</h3>
                        <div className="menu-dropdown__column-items">
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Главная</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/auction')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Аукцион</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/map')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Карта</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/about')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>О нас</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/favorites')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Понравилось</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              if (location.pathname === '/auction') {
                                window.dispatchEvent(new CustomEvent('openAIChat'))
                              } else {
                                navigate('/chat')
                              }
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Умный помощник</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/chat')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Чат</span>
                          </button>
                          <button 
                            className="menu-dropdown__item"
                            onClick={() => {
                              navigate('/bonuses')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Бонусы</span>
                          </button>
                        </div>
                      </div>
                      <div className="menu-dropdown__column">
                        <h3 className="menu-dropdown__column-title">Профиль</h3>
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
                                <span>Профиль</span>
                              </button>
                              <button 
                                className="menu-dropdown__item"
                                onClick={() => {
                                  navigate('/wallet')
                                  setIsMenuOpen(false)
                                }}
                              >
                                <span>Кошелек</span>
                              </button>
                              <button 
                                className="menu-dropdown__item"
                                onClick={() => {
                                  navigate('/subscriptions')
                                  setIsMenuOpen(false)
                                }}
                              >
                                <span>Подписки</span>
                              </button>
                              <button 
                                className="menu-dropdown__item"
                                onClick={() => {
                                  navigate('/data')
                                  setIsMenuOpen(false)
                                }}
                              >
                                <span>Данные</span>
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
                              <span>Войти</span>
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
              onClick={() => navigate('/chat')}
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
              <span>{t('aiAssistant') || 'Умный помощник'}</span>
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
                    placeholder={t('search') || 'Поиск...'}
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
                    aria-label="Закрыть поиск"
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
                        <span className="new-header__search-result-title">{result.title}</span>
                        {!result.canAccess.allowed && (
                          <span className="new-header__search-result-hint">
                            {result.canAccess.reason === 'auth' ? '🔒 Требуется вход' : '⚠️ Нет доступа'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.trim() && searchResults.length === 0 && (
                  <div className="new-header__search-results">
                    <div className="new-header__search-result new-header__search-result--no-results">
                      <span>Ничего не найдено</span>
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
                      aria-label="Открыть поиск"
                    >
                      <FiSearch size={20} />
                    </button>
                    <button 
                      type="button"
                      className="new-header__auction-btn"
                      onClick={() => navigate('/')}
                    >
                      Главная
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button"
                      className="new-header__auction-btn"
                      onClick={() => navigate('/auction')}
                    >
                      Аукцион
                    </button>
                    <button 
                      className="new-header__search-btn"
                      onClick={() => {
                        setIsSearchOpen(true)
                        setSearchQuery('')
                        setSearchResults([])
                      }}
                      aria-label="Открыть поиск"
                    >
                      <FiSearch size={20} />
                    </button>
                  </>
                )}
                <button 
                  className={`new-header__user-btn ${isLoggedIn ? 'new-header__user-btn--avatar' : ''}`}
                  onClick={() => {
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
                    if (userLoaded && user) {
                      // Для пользователей Clerk по умолчанию открываем профиль покупателя
                      navigate('/profile')
                    } else if (userData.isLoggedIn) {
                      // Локально авторизованный покупатель
                      navigate('/profile')
                    } else {
                      // Не авторизован — открываем модалку
                      setIsLoginModalOpen(true)
                    }
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
                </button>
                <button 
                  type="button" 
                  className="new-header__notification-btn"
                  onClick={() => setIsNotificationOpen((prev) => !prev)}
                  aria-expanded={isNotificationOpen}
                >
                  <FiBell size={20} />
                  <span className="new-header__notification-indicator" />
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
                      <h3 className="notification-panel__title">Уведомления</h3>
                      <button 
                        type="button" 
                        className="notification-panel__close"
                        onClick={() => setIsNotificationOpen(false)}
                        aria-label="Закрыть уведомления"
                      >
                        <FiX size={20} />
                      </button>
                    </div>
                    <div className="notification-panel__list">
                      <div className="notification-item notification-item--property">
                        <div className="notification-item__content">
                          <h4 className="notification-item__title">{t('foundProperty') || 'Нашли для вас объявление!'}</h4>
                          <div className="notification-item__property">
                            <div className="notification-item__image">
                              <img 
                                src={firstProperty.images[0]}
                                alt={firstProperty.title}
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80'
                                }}
                              />
                            </div>
                            <div className="notification-item__info">
                              <p className="notification-item__property-name">{firstProperty.title}</p>
                              <p className="notification-item__property-location">{firstProperty.location}</p>
                              <button 
                                type="button" 
                                className="notification-item__button"
                                onClick={() => {
                                  setIsNotificationOpen(false)
                                  navigate(`/property/${firstProperty.id}`)
                                }}
                              >
                                {t('goTo') || 'Перейти'}
                                <FiChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
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

