import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { getUserData, isAuthenticated } from '../services/authService'
import VerificationToast from '../components/VerificationToast'
import WonPropertyCard from '../components/WonPropertyCard'
import './History.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const History = () => {
  const { user, isLoaded: userLoaded } = useUser()
  const [userId, setUserId] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)

  // Получаем userId с поддержкой Clerk
  useEffect(() => {
    const fetchUserId = async () => {
      // Сначала проверяем localStorage
      const storedUserId = localStorage.getItem('userId')
      if (storedUserId && /^\d+$/.test(storedUserId)) {
        setUserId(parseInt(storedUserId))
        return
      }

      // Проверяем авторизацию через Clerk
      const isClerkAuth = user && userLoaded
      const isOldAuth = isAuthenticated()

      if (isClerkAuth && user) {
        // Для Clerk пользователей получаем ID из БД
        try {
          const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
          if (userEmail) {
            const userResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail)}`)
            if (userResponse.ok) {
              const userData = await userResponse.json()
              if (userData.success && userData.data && userData.data.id) {
                const numericId = userData.data.id
                setUserId(numericId)
                localStorage.setItem('userId', String(numericId))
                return
              }
            }
          }
        } catch (e) {
          console.warn('Не удалось получить userId из БД для Clerk пользователя:', e)
        }
      } else if (isOldAuth) {
        // Для старой системы авторизации
        const userData = getUserData()
        if (userData?.id) {
          const id = userData.id
          // Проверяем, что ID числовой
          if (/^\d+$/.test(id.toString())) {
            setUserId(parseInt(id))
            localStorage.setItem('userId', String(id))
          }
        }
      }
    }

    if (userLoaded || isAuthenticated()) {
      fetchUserId()
    }
  }, [user, userLoaded])

  // Загружаем статус верификации
  useEffect(() => {
    if (userId) {
      loadVerificationStatus()
      loadWonProperties()
    }
  }, [userId])

  // Загружаем выигранные объекты
  const loadWonProperties = async () => {
    if (!userId) {
      console.log('⚠️ userId не установлен, пропускаем загрузку выигранных объектов')
      return
    }
    
    // Убеждаемся, что userId - число
    const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId
    if (isNaN(numericUserId)) {
      console.error('❌ userId не является числом:', userId)
      setIsLoadingPurchases(false)
      return
    }
    
    setIsLoadingPurchases(true)
    try {
      console.log(`📊 Запрос выигранных объектов для пользователя ${numericUserId}`)
      const response = await fetch(`${API_BASE_URL}/auction-winners/user/${numericUserId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Преобразуем данные в формат для отображения
          const formattedPurchases = result.data.map(winner => {
            const property = winner.property || {}
            const photos = property.photos || []
            const firstPhoto = photos.length > 0 ? photos[0] : null
            
            return {
              id: winner.id,
              propertyId: winner.property_id,
              propertyTitle: property.title || 'Объект недвижимости',
              location: property.location || property.address || 'Адрес не указан',
              purchasePrice: winner.winning_bid_amount,
              purchaseDate: winner.won_at || winner.auction_end_date,
              status: winner.deposit_paid === 1 ? 'deposit_paid' : 'pending_deposit',
              image: firstPhoto || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
              currency: winner.currency || 'USD',
              depositAmount: winner.deposit_amount,
              depositDueDate: winner.deposit_due_date,
              depositPaid: winner.deposit_paid === 1,
              winnerData: winner // Сохраняем полные данные для компонента
            }
          })
          setPurchaseHistory(formattedPurchases)
        } else {
          setPurchaseHistory([])
        }
      } else {
        setPurchaseHistory([])
      }
    } catch (error) {
      console.error('Ошибка загрузки выигранных объектов:', error)
      setPurchaseHistory([])
    } finally {
      setIsLoadingPurchases(false)
    }
  }

  const loadVerificationStatus = async () => {
    if (!userId) return
    
    // Убеждаемся, что userId - число
    const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId
    if (isNaN(numericUserId)) {
      console.error('❌ userId не является числом в loadVerificationStatus:', userId)
      return
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${numericUserId}/verification-status`)
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

  const [purchaseHistory, setPurchaseHistory] = useState([])
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(true)

  const bidHistory = [
    {
      id: 1,
      propertyTitle: "1-комн. квартира, 35 м², 3/5 этаж",
      location: "Санкт-Петербург, Невский проспект, д. 12",
      bidAmount: 2800000,
      bidDate: "2024-01-20",
      bidTime: "14:30",
      status: "active",
      currentBid: 3200000,
      endTime: "2024-01-25T18:00:00"
    },
    {
      id: 2,
      propertyTitle: "Студия, 28 м², 2/10 этаж",
      location: "Москва, ул. Тверская, д. 8",
      bidAmount: 1500000,
      bidDate: "2024-01-18",
      bidTime: "10:15",
      status: "outbid",
      currentBid: 1800000
    },
    {
      id: 3,
      propertyTitle: "2-комн. квартира, 65 м², 7/12 этаж",
      location: "Казань, ул. Баумана, д. 25",
      bidAmount: 4500000,
      bidDate: "2024-01-10",
      bidTime: "16:45",
      status: "won",
      finalPrice: 4500000
    },
    {
      id: 4,
      propertyTitle: "4-комн. квартира, 120 м², 1/3 этаж",
      location: "Сочи, ул. Навагинская, д. 15",
      bidAmount: 8500000,
      bidDate: "2023-12-28",
      bidTime: "11:20",
      status: "lost",
      finalPrice: 9200000
    }
  ]

  const formatPrice = (price, currency = 'USD') => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'BYN' ? 'Br' : '$'
    if (price >= 1000000) {
      return `${symbol}${(price / 1000000).toFixed(1)}M`
    }
    return `${symbol}${price.toLocaleString('ru-RU')}`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStatusLabel = (status) => {
    switch(status) {
      case 'completed':
        return 'Завершена'
      case 'active':
        return 'Активна'
      case 'outbid':
        return 'Перебита'
      case 'won':
        return 'Выиграна'
      case 'lost':
        return 'Проиграна'
      default:
        return status
    }
  }

  const getStatusClass = (status) => {
    switch(status) {
      case 'completed':
      case 'won':
        return 'status-success'
      case 'active':
        return 'status-active'
      case 'outbid':
      case 'lost':
        return 'status-failed'
      default:
        return ''
    }
  }

  return (
    <div className="history-page">
      {/* Всплывающее уведомление о прогрессе верификации */}
      {userId && <VerificationToast userId={userId} />}
      
      <div className="history-container">
        <aside className="history-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#gradient1)"/>
                <path d="M2 17L12 22L22 17" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="url(#gradient1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ABAB5" />
                    <stop offset="100%" stopColor="#089a95" />
                  </linearGradient>
                </defs>
              </svg>
              <span>Профиль</span>
            </div>
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
            <Link to="/subscriptions" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z" fill="currentColor"/>
              </svg>
              <span>Подписки</span>
            </Link>
            <Link to="/history" className="nav-item active">
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
              <span>Фаворит</span>
            </a>
          </nav>
        </aside>

        <main className="history-main">
          <h1 className="history-title">История</h1>

          <div className="history-content">
            <section className="history-section">
              <h2 className="section-title">Мои покупки</h2>
              <div className="history-list">
                {isLoadingPurchases ? (
                  <div className="empty-state">
                    <p>Загрузка...</p>
                  </div>
                ) : purchaseHistory.length > 0 ? (
                  purchaseHistory.map((purchase) => (
                    <WonPropertyCard
                      key={purchase.id}
                      purchase={purchase}
                      formatPrice={formatPrice}
                      formatDate={formatDate}
                      getStatusLabel={getStatusLabel}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <p>У вас пока нет покупок</p>
                  </div>
                )}
              </div>
            </section>

            <section className="history-section">
              <h2 className="section-title">Ставки на аукционе</h2>
              <div className="history-list">
                {bidHistory.length > 0 ? (
                  bidHistory.map((bid) => (
                    <div key={bid.id} className="history-card bid-card">
                      <div className="card-content">
                        <div className="card-header">
                          <h3 className="card-title">{bid.propertyTitle}</h3>
                          <div className={`status-badge ${getStatusClass(bid.status)}`}>
                            {getStatusLabel(bid.status)}
                          </div>
                        </div>
                        <p className="card-location">{bid.location}</p>
                        <div className="card-details">
                          <div className="detail-item">
                            <span className="detail-label">Ваша ставка:</span>
                            <span className="detail-value price">{formatPrice(bid.bidAmount)}</span>
                          </div>
                          {bid.status === 'active' && (
                            <div className="detail-item">
                              <span className="detail-label">Текущая ставка:</span>
                              <span className="detail-value price">{formatPrice(bid.currentBid)}</span>
                            </div>
                          )}
                          {(bid.status === 'won' || bid.status === 'lost') && (
                            <div className="detail-item">
                              <span className="detail-label">Финальная цена:</span>
                              <span className="detail-value price">{formatPrice(bid.finalPrice)}</span>
                            </div>
                          )}
                          {bid.status === 'outbid' && (
                            <div className="detail-item">
                              <span className="detail-label">Текущая ставка:</span>
                              <span className="detail-value price">{formatPrice(bid.currentBid)}</span>
                            </div>
                          )}
                          <div className="detail-item">
                            <span className="detail-label">Дата ставки:</span>
                            <span className="detail-value">{formatDate(bid.bidDate)} в {bid.bidTime}</span>
                          </div>
                        </div>
                        {bid.status === 'active' && (
                          <Link to={`/property/${bid.id}`} className="card-button">
                            Продолжить участие
                          </Link>
                        )}
                        {bid.status === 'outbid' && (
                          <Link to={`/property/${bid.id}`} className="card-button">
                            Повысить ставку
                          </Link>
                        )}
                        {(bid.status === 'won' || bid.status === 'lost') && (
                          <Link to={`/property/${bid.id}`} className="card-link">
                            Посмотреть объект →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>У вас пока нет ставок</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default History

