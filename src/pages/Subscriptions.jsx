import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getUserData, logout } from '../services/authService'
import VerificationToast from '../components/VerificationToast'
import premiumImage from '../img/premium.png'
import standardImage from '../img/standart.png'
import basicImage from '../img/basicc.png'
import './Subscriptions.css'
import './Profile.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const Subscriptions = () => {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)

  useEffect(() => {
    const userData = getUserData()
    if (userData?.id) {
      setUserId(userData.id)
    } else {
      // Пытаемся получить из localStorage
      const storedUserId = localStorage.getItem('userId')
      if (storedUserId) {
        setUserId(storedUserId)
      }
    }
  }, [])

  // Загружаем статус верификации
  useEffect(() => {
    if (userId) {
      loadVerificationStatus()
    }
  }, [userId])

  const loadVerificationStatus = async () => {
    if (!userId) return
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/verification-status`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setVerificationStatus(result.data)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса верификации:', error)
    }
  }

  // Функции для проверки заполненности
  const isDocumentsComplete = () => {
    return verificationStatus?.hasDocuments || false
  }

  const isBasicInfoComplete = () => {
    if (!verificationStatus?.missingFields) return false
    const { missingFields } = verificationStatus
    return !missingFields.firstName && 
           !missingFields.lastName && 
           !missingFields.emailOrPhone && 
           !missingFields.country && 
           !missingFields.address
  }

  const isPassportDataComplete = () => {
    if (!verificationStatus?.missingFields) return false
    const { missingFields } = verificationStatus
    return !missingFields.passportSeries && 
           !missingFields.passportNumber && 
           !missingFields.identificationNumber
  }

  const shouldShowProfileIndicator = () => {
    if (!verificationStatus) return false
    return !isDocumentsComplete()
  }

  const shouldShowDataIndicator = () => {
    if (!verificationStatus) return false
    return !isBasicInfoComplete() || !isPassportDataComplete()
  }

  const subscriptions = [
    {
      id: 'premium',
      title: 'Премиум',
      description: 'Получите полный доступ ко всем функциям платформы. Неограниченный просмотр объявлений, приоритетная поддержка и эксклюзивные возможности для работы с недвижимостью.',
      price: 999,
      icon: 'premium'
    },
    {
      id: 'standard',
      title: 'Стандарт',
      description: 'Расширенные возможности для работы с недвижимостью. Доступ к базе объявлений, уведомления о новых предложениях и базовые инструменты для анализа рынка.',
      price: 749,
      icon: 'standard'
    },
    {
      id: 'basic',
      title: 'Базовый',
      description: 'Начните работу с платформой. Базовый доступ к объявлениям, возможность просмотра основных данных и простые инструменты для поиска недвижимости.',
      price: 499,
      icon: 'basic'
    }
  ]

  const handleLogout = async () => {
    if (!window.confirm('Вы уверены, что хотите выйти?')) {
      return
    }

    try {
      await logout()
    } catch (error) {
      console.warn('⚠️ Ошибка при выходе из аккаунта (Subscriptions):', error)
    }

    navigate('/')
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  const handleActivate = (subscription) => {
    // Открываем внешний платежный сервис (Stripe или аналогичный)
    // Валюта оплаты — доллары США (USD)
    const paymentUrl = `https://checkout.stripe.com/pay?amount=${subscription.price * 100}&currency=usd&description=${encodeURIComponent(`Подписка ${subscription.title}`)}`
    
    // Открываем в новом окне
    window.open(paymentUrl, '_blank', 'width=600,height=800')
    
    // Альтернативный вариант - редирект на страницу оплаты
    // window.location.href = paymentUrl
  }

  return (
    <div className="subscriptions-page">
      {/* Всплывающее уведомление о прогрессе верификации */}
      {userId && <VerificationToast userId={userId} />}
      
      <div className="subscriptions-container">
        <aside className="subscriptions-sidebar">
          <div className="sidebar-header" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="back-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#0ABAB5',
                fontSize: '18px',
                fontWeight: '600',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Назад</span>
            </button>
            <button
              type="button"
              className="header-logout-button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleLogout()
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Выйти</span>
            </button>
          </div>
          <nav className="sidebar-nav">
            <Link to="/profile" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="currentColor"/>
                <path d="M10 12C5.58172 12 2 13.7909 2 16V20H18V16C18 13.7909 14.4183 12 10 12Z" fill="currentColor"/>
              </svg>
              <span>Профиль</span>
              {shouldShowProfileIndicator() && (
                <span className="nav-item-indicator"></span>
              )}
            </Link>
            <Link to="/data" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 8H14M6 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Данные</span>
              {shouldShowDataIndicator() && (
                <span className="nav-item-indicator"></span>
              )}
            </Link>
            <Link to="/subscriptions" className="nav-item active">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z" fill="currentColor"/>
              </svg>
              <span>Подписки</span>
            </Link>
            <Link to="/history" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M6 8H14M6 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>История</span>
            </Link>
            <Link to="/chat" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 8H13M7 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Чат</span>
            </Link>
            <a href="#" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z" fill="currentColor"/>
              </svg>
              <span>Понравилось</span>
            </a>
          </nav>
          <div className="sidebar-footer">
            <div className="language-selector">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M8 1C9.5 3 10.5 5.5 10.5 8C10.5 10.5 9.5 13 8 15M8 1C6.5 3 5.5 5.5 5.5 8C5.5 10.5 6.5 13 8 15M1 8H15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <span>Русский</span>
            </div>
            <a href="#" className="help-link">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5V8M8 11H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Справка</span>
            </a>
            <a href="#" className="help-link">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 6H10M6 10H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Яндекс ID для сайта</span>
            </a>
            <div className="copyright">© 2001-2025 Яндекс</div>
            <button
              type="button"
              className="logout-button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleLogout()
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Выйти</span>
            </button>
          </div>
        </aside>

        <main className="subscriptions-main">
          <h1 className="subscriptions-title">Мои подписки</h1>
          
          <div className="subscriptions-cards">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="subscription-card">
                <div className="card-content">
                  <h2 className="card-title">{subscription.title}</h2>
                  <p className="card-description">{subscription.description}</p>
                  <div className="card-price">
                    <span className="price-value">${subscription.price}</span>
                    <span className="price-period">/month</span>
                  </div>
                  <button 
                    className="card-button"
                    onClick={() => handleActivate(subscription)}
                  >
                    Активировать
                  </button>
                </div>
                <div className="card-image">
                  {subscription.icon === 'premium' && (
                    <img 
                      src={premiumImage} 
                      alt="Премиум подписка"
                      className="subscription-image"
                    />
                  )}
                  {subscription.icon === 'standard' && (
                    <img 
                      src={standardImage} 
                      alt="Стандартный тариф"
                      className="subscription-image"
                    />
                  )}
                  {subscription.icon === 'basic' && (
                    <div className="basic-image-wrapper">
                      <img 
                        src={basicImage} 
                        alt="Базовый тариф"
                        className="subscription-image"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Subscriptions

