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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [userPhoto, setUserPhoto] = useState(null) // Фотография пользователя
  const [isLoggedIn, setIsLoggedIn] = useState(false) // Статус авторизации
  const [isAIChatOpen, setIsAIChatOpen] = useState(false) // Состояние AI чата для страницы аукцион
  const locationRef = useRef(null)
  const notificationRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setIsLocationOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
                              navigate('/favorites')
                              setIsMenuOpen(false)
                            }}
                          >
                            <span>Избранное</span>
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
                        </div>
                      </div>
                      <div className="menu-dropdown__column">
                        <h3 className="menu-dropdown__column-title">Профиль</h3>
                        <div className="menu-dropdown__column-items">
                          {/* Ссылки будут добавлены позже */}
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
                    }
                  }}
                />
                <button
                  type="button"
                  className="new-header__search-close"
                  onClick={() => {
                    setIsSearchOpen(false)
                    setSearchQuery('')
                  }}
                  aria-label="Закрыть поиск"
                >
                  <FiX size={18} />
                </button>
              </div>
            ) : (
              <>
                <button 
                  type="button"
                  className="new-header__auction-btn"
                  onClick={() => navigate('/')}
                >
                  Главная
                </button>
                <button 
                  className="new-header__search-btn"
                  onClick={() => setIsSearchOpen(true)}
                  aria-label="Открыть поиск"
                >
                  <FiSearch size={20} />
                </button>
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

