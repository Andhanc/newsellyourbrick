import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { getUserData, isAuthenticated } from '../services/authService'
import VerificationToast from '../components/VerificationToast'
import WonPropertyCard from '../components/WonPropertyCard'
import './History.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

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
        const parsedId = parseInt(storedUserId)
        console.log('📋 Используем userId из localStorage:', parsedId)
        setUserId(parsedId)
        return
      }

      // Проверяем авторизацию через Clerk
      const isClerkAuth = user && userLoaded
      const isOldAuth = isAuthenticated()

      console.log('📋 Проверка авторизации:', { isClerkAuth, isOldAuth, userLoaded, hasUser: !!user })

      if (isClerkAuth && user) {
        // Для Clerk пользователей получаем ID из БД
        try {
          const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
          console.log('📋 Email пользователя Clerk:', userEmail)
          
          if (userEmail) {
            const userResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail)}`)
            console.log('📋 Ответ сервера для получения userId:', userResponse.status)
            
            if (userResponse.ok) {
              const userData = await userResponse.json()
              console.log('📋 Данные пользователя из БД:', userData)
              
              if (userData.success && userData.data && userData.data.id) {
                const numericId = userData.data.id
                console.log('✅ Найден userId для Clerk пользователя:', numericId)
                setUserId(numericId)
                localStorage.setItem('userId', String(numericId))
                return
              } else {
                console.warn('⚠️ userId не найден в ответе сервера:', userData)
              }
            } else {
              const errorText = await userResponse.text().catch(() => 'Не удалось прочитать ошибку')
              console.error('❌ Ошибка при получении userId:', userResponse.status, errorText)
            }
          } else {
            console.warn('⚠️ Email не найден у Clerk пользователя')
          }
        } catch (e) {
          console.error('❌ Ошибка при получении userId из БД для Clerk пользователя:', e)
        }
      } else if (isOldAuth) {
        // Для старой системы авторизации
        const userData = getUserData()
        if (userData?.id) {
          const id = userData.id
          // Проверяем, что ID числовой
          if (/^\d+$/.test(id.toString())) {
            console.log('📋 Используем userId из старой системы:', id)
            setUserId(parseInt(id))
            localStorage.setItem('userId', String(id))
          }
        }
      } else {
        console.log('⚠️ Пользователь не авторизован')
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
      loadBidHistory()
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
  const [bidHistory, setBidHistory] = useState([])
  const [isLoadingBids, setIsLoadingBids] = useState(true)

  // Загружаем ставки пользователя
  const loadBidHistory = async () => {
    if (!userId) {
      console.log('⚠️ userId не установлен, пропускаем загрузку ставок')
      setIsLoadingBids(false)
      return
    }
    
    // Убеждаемся, что userId - число
    const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId
    if (isNaN(numericUserId)) {
      console.error('❌ userId не является числом:', userId)
      setIsLoadingBids(false)
      return
    }
    
    setIsLoadingBids(true)
    try {
      console.log(`📊 Запрос ставок для пользователя ${numericUserId}`)
      console.log(`📊 API URL: ${API_BASE_URL}/bids/user/${numericUserId}`)
      const response = await fetch(`${API_BASE_URL}/bids/user/${numericUserId}`)
      console.log(`📊 Ответ сервера:`, response.status, response.statusText)
      
      if (response.ok) {
        const result = await response.json()
        console.log(`📊 Результат запроса ставок:`, result)
        console.log(`📊 Количество ставок:`, result.data?.length || 0)
        
        if (result.success && result.data) {
          // Логируем все ставки для отладки
          console.log(`📊 Все ставки пользователя:`, result.data)
          
          // Группируем ставки по объектам и определяем статус
          const bidsByProperty = {}
          
          result.data.forEach(bid => {
            const propertyId = bid.property_id
            console.log(`📊 Обработка ставки:`, { propertyId, bid_amount: bid.bid_amount, title: bid.title, is_auction: bid.is_auction })
            
            if (!bidsByProperty[propertyId]) {
              bidsByProperty[propertyId] = {
                property: bid,
                bids: []
              }
            }
            bidsByProperty[propertyId].bids.push(bid)
          })
          
          console.log(`📊 Сгруппировано объектов:`, Object.keys(bidsByProperty).length)
          
          // Для каждого объекта определяем статус и формируем данные
          const formattedBids = await Promise.all(
            Object.values(bidsByProperty).map(async ({ property, bids }) => {
              // Сортируем ставки пользователя по дате (последняя первая)
              const sortedBids = bids.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              const userMaxBid = Math.max(...bids.map(b => b.bid_amount))
              const userLastBid = sortedBids[0]
              
              // Получаем текущую максимальную ставку для объекта
              let currentMaxBid = userMaxBid
              let isUserLeader = false
              let status = 'active'
              
              try {
                const bidsResponse = await fetch(`${API_BASE_URL}/bids/property/${propertyId}`)
                if (bidsResponse.ok) {
                  const bidsData = await bidsResponse.json()
                  if (bidsData.success && bidsData.data && bidsData.data.length > 0) {
                    const allBids = bidsData.data.sort((a, b) => {
                      if (b.bid_amount !== a.bid_amount) {
                        return b.bid_amount - a.bid_amount
                      }
                      return new Date(b.created_at) - new Date(a.created_at)
                    })
                    const maxBid = allBids[0]
                    currentMaxBid = maxBid.bid_amount
                    isUserLeader = maxBid.user_id === numericUserId
                    
                    // Определяем статус
                    const endDate = property.auction_end_date || property.end_date
                    const isAuctionEnded = endDate ? new Date(endDate) <= new Date() : false
                    
                    if (isUserLeader) {
                      // Если пользователь лидер и аукцион закончился - выиграл
                      if (isAuctionEnded) {
                        status = 'won'
                      } else {
                        status = 'active'
                      }
                    } else {
                      // Если пользователь не лидер
                      if (isAuctionEnded) {
                        // Аукцион закончился, но пользователь не лидер - проиграл
                        status = 'lost'
                      } else {
                        // Аукцион еще идет, но ставку перебили
                        status = 'outbid'
                      }
                    }
                  }
                }
              } catch (error) {
                console.warn('Ошибка получения текущей ставки:', error)
              }
              
              // Парсим photos если это строка
              let photos = []
              if (property.photos) {
                try {
                  photos = typeof property.photos === 'string' 
                    ? JSON.parse(property.photos) 
                    : property.photos
                } catch (e) {
                  photos = []
                }
              }
              
              const bidDate = new Date(userLastBid.created_at)
              
              // Для обычных объектов (не аукционов) статус всегда 'active' или 'outbid'
              // так как у них нет даты окончания
              const isAuction = property.is_auction === 1 || property.is_auction === true
              if (!isAuction) {
                // Для обычных объектов статус зависит только от того, лидер ли пользователь
                status = isUserLeader ? 'active' : 'outbid'
              }
              
              console.log(`📊 Форматирование ставки для объекта ${propertyId}:`, {
                title: property.title,
                is_auction: property.is_auction,
                isAuction,
                status,
                userMaxBid,
                currentMaxBid,
                isUserLeader,
                endDate: property.auction_end_date || property.end_date
              })
              
              return {
                id: propertyId,
                propertyId: propertyId,
                propertyTitle: property.title || 'Объект недвижимости',
                location: property.location || property.address || 'Адрес не указан',
                bidAmount: userMaxBid,
                bidDate: bidDate.toISOString().split('T')[0],
                bidTime: bidDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                status: status,
                currentBid: currentMaxBid,
                finalPrice: status === 'won' || status === 'lost' ? currentMaxBid : null,
                endTime: property.auction_end_date || property.end_date || null,
                currency: property.currency || 'USD',
                isAuction: isAuction
              }
            })
          )
          
          // Сортируем по дате ставки (новые первые)
          formattedBids.sort((a, b) => new Date(b.bidDate + 'T' + b.bidTime) - new Date(a.bidDate + 'T' + a.bidTime))
          
          console.log(`📊 Отформатировано ставок для отображения:`, formattedBids.length)
          console.log(`📊 Данные ставок:`, formattedBids)
          
          setBidHistory(formattedBids)
        } else {
          console.log('⚠️ Нет данных в ответе сервера')
          setBidHistory([])
        }
      } else {
        const errorText = await response.text().catch(() => 'Не удалось прочитать ошибку')
        console.error('❌ Ошибка HTTP при загрузке ставок:', response.status, errorText)
        setBidHistory([])
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки ставок:', error)
      console.error('❌ Stack trace:', error.stack)
      setBidHistory([])
    } finally {
      setIsLoadingBids(false)
    }
  }

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
                {isLoadingBids ? (
                  <div className="empty-state">
                    <p>Загрузка...</p>
                  </div>
                ) : bidHistory.length > 0 ? (
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

