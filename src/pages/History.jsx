import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser, useClerk } from '@clerk/clerk-react'
import { getUserData, isAuthenticated, logout, CLERK_DB_USER_SYNCED, getStoredNumericUserId } from '../services/authService'
import VerificationToast from '../components/VerificationToast'
import WonPropertyCard from '../components/WonPropertyCard'
import BuyerCabinetSidebar from '../components/BuyerCabinetSidebar'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import i18n from '../i18n/config'
import './History.css'
import './Profile.css'
import { useChainedAppLayoutScroll } from '../hooks/useChainedAppLayoutScroll'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function intlLocale() {
  const code = (i18n.language || 'ru').split('-')[0]
  const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }
  return map[code] || 'en-US'
}

const History = () => {
  const navigate = useNavigate()
  const { t, i18n: i18nApi } = useTranslation()
  const billingLocale = (() => {
    const code = (i18nApi.language || 'ru').split('-')[0]
    const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }
    return map[code] || 'en-US'
  })()
  const { user, isLoaded: userLoaded } = useUser()
  const { signOut: clerkSignOut } = useClerk()
  const [userId, setUserId] = useState(() => getStoredNumericUserId())
  const [verificationStatus, setVerificationStatus] = useState(null)
  const buyerCabinetPageRef = useRef(null)
  const buyerCabinetMainScrollRef = useRef(null)

  useChainedAppLayoutScroll(buyerCabinetPageRef, buyerCabinetMainScrollRef, { active: true })

  // Получаем userId с поддержкой Clerk + CLERK_DB_USER_SYNCED
  useEffect(() => {
    const applyFromStorage = () => {
      const raw = localStorage.getItem('userId')
      if (raw && /^\d+$/.test(raw)) {
        const n = parseInt(raw, 10)
        setUserId((prev) => (prev === n ? prev : n))
      }
    }
    applyFromStorage()
    window.addEventListener(CLERK_DB_USER_SYNCED, applyFromStorage)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, applyFromStorage)
  }, [])

  useEffect(() => {
    const fetchUserId = async () => {
      // Сначала проверяем localStorage
      const storedUserId = localStorage.getItem('userId')
      if (storedUserId && /^\d+$/.test(storedUserId)) {
        setUserId(parseInt(storedUserId, 10))
        return
      }

      // Проверяем авторизацию через Clerk
      const isClerkAuth = user && userLoaded
      const isOldAuth = isAuthenticated()

      if (isClerkAuth && user) {
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
          console.error('❌ Ошибка при получении userId из БД для Clerk пользователя:', e)
        }
      } else if (isOldAuth) {
        const userData = getUserData()
        if (userData?.id && /^\d+$/.test(userData.id.toString())) {
          setUserId(parseInt(userData.id, 10))
          localStorage.setItem('userId', String(userData.id))
        }
      }
    }

    if (userLoaded || isAuthenticated()) {
      fetchUserId()
    }
  }, [user, userLoaded])

  // Загружаем статус верификации и реальные данные ставок/покупок
  useEffect(() => {
    if (userId) {
      loadVerificationStatus()
      loadWonProperties()
      loadReservationPurchases()
      loadBidHistory()
    } else {
      setIsLoadingPurchases(false)
      setIsLoadingReservations(false)
      setIsLoadingBids(false)
    }
  }, [userId, i18nApi.language])

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
              propertyTitle: property.title || '',
              location: property.location || property.address || '',
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
  const [reservationPurchases, setReservationPurchases] = useState([])
  const [isLoadingReservations, setIsLoadingReservations] = useState(true)
  const [bidHistory, setBidHistory] = useState([])
  const [isLoadingBids, setIsLoadingBids] = useState(true)

  const loadReservationPurchases = async () => {
    if (!userId) return
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId
    if (isNaN(numericUserId)) return
    setIsLoadingReservations(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users/${numericUserId}/reservation-purchases`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setReservationPurchases(result.data)
        } else {
          setReservationPurchases([])
        }
      } else {
        setReservationPurchases([])
      }
    } catch (e) {
      console.error('Ошибка загрузки резервов:', e)
      setReservationPurchases([])
    } finally {
      setIsLoadingReservations(false)
    }
  }

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
              const propertyId = property.property_id ?? property.id
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
                propertyTitle: property.title || '',
                location: property.location || property.address || '',
                bidAmount: userMaxBid,
                bidDate: bidDate.toISOString().split('T')[0],
                bidTime: bidDate.toLocaleTimeString(intlLocale(), { hour: '2-digit', minute: '2-digit' }),
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
    return `${symbol}${price.toLocaleString(billingLocale)}`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(billingLocale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStatusLabel = (status) => {
    const key = `buyerHistory_status_${status}`
    const tr = t(key)
    return tr !== key ? tr : status
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

  const handleLogout = async () => {
    if (!window.confirm(t('buyerCabinet_logoutConfirm'))) return
    try {
      if (user) {
        await clerkSignOut()
      }
      logout()
      localStorage.removeItem('userId')
      navigate('/', { replace: true })
    } catch (e) {
      logout()
      localStorage.removeItem('userId')
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="history-page" ref={buyerCabinetPageRef}>
      {/* Всплывающее уведомление о прогрессе верификации */}
      {userId && <VerificationToast userId={userId} />}
      
      <div className="history-container buyer-cabinet-layout-container">
        <BuyerCabinetSidebar
          asideClassName="history-sidebar"
          headerSpaceBetween
          onLogout={handleLogout}
          showProfileIndicator={shouldShowProfileIndicator()}
          showDataIndicator={shouldShowDataIndicator()}
        />

        <main className="history-main buyer-cabinet-layout-main">
          <div className="buyer-cabinet-main-scroll" ref={buyerCabinetMainScrollRef}>
          <h1 className="history-title">{t('buyerHistory_title')}</h1>

          <div className="history-content">
            <section className="history-section">
              <h2 className="section-title">{t('buyerHistory_myPurchases')}</h2>
              <div className="history-list">
                {isLoadingPurchases ? (
                  <div className="empty-state">
                    <p>{t('buyerHistory_loading')}</p>
                  </div>
                ) : purchaseHistory.length > 0 ? (
                  purchaseHistory.map((purchase) => (
                    <WonPropertyCard
                      key={purchase.id}
                      purchase={purchase}
                      formatPrice={formatPrice}
                      formatDate={formatDate}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <p>{t('buyerHistory_emptyWins')}</p>
                  </div>
                )}
                {isLoadingReservations ? (
                  <div className="empty-state" style={{ marginTop: 16 }}>
                    <p>{t('buyerHistory_loadingReserves')}</p>
                  </div>
                ) : reservationPurchases.length > 0 ? (
                  <div className="history-reservations" style={{ marginTop: 24 }}>
                    <h3 className="section-subtitle" style={{ marginBottom: 12, fontSize: '1.1rem' }}>
                      {t('buyerHistory_reserveSection')}
                    </h3>
                    {reservationPurchases.map((row) => {
                      const b = row.billing || {}
                      const pid = b.property_id
                      const minSale = b.minimum_sale_price
                      const paidStripe = (row.amount_cents || 0) / 100
                      const walletEur = b.wallet_eur_applied || 0
                      const totalPaid = b.total_paid_toward_price ?? paidStripe + walletEur
                      const remaining = b.remaining_to_full_purchase ?? (minSale != null ? Math.max(0, minSale - totalPaid) : null)
                      const cur = (row.currency || 'eur').toUpperCase()
                      return (
                        <div key={row.id || row.dedupe_key} className="history-card" style={{ marginBottom: 16 }}>
                          <div className="card-content">
                            <div className="card-header">
                              <h3 className="card-title">
                                {pid != null
                                  ? t('buyerHistory_propertyTitle', { id: pid })
                                  : t('buyerHistory_propertyTitle', { id: '—' })}
                              </h3>
                              <span className="status-badge status-success">{t('buyerHistory_reservePaid')}</span>
                            </div>
                            <div className="card-details">
                              <div className="detail-item">
                                <span className="detail-label">{t('buyerHistory_minSale')}</span>
                                <span className="detail-value price">
                                  {minSale != null ? formatPrice(minSale, cur) : '—'}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">{t('buyerHistory_paidCard')}</span>
                                <span className="detail-value price">
                                  {formatPrice(paidStripe, cur)}
                                </span>
                              </div>
                              {walletEur > 0 && (
                                <div className="detail-item">
                                  <span className="detail-label">{t('buyerHistory_fromWallet')}</span>
                                  <span className="detail-value price">€{walletEur.toLocaleString(billingLocale)}</span>
                                </div>
                              )}
                              <div className="detail-item">
                                <span className="detail-label">{t('buyerHistory_totalPaid')}</span>
                                <span className="detail-value price">
                                  {typeof totalPaid === 'number' ? formatPrice(totalPaid, cur) : '—'}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">{t('buyerHistory_remaining')}</span>
                                <span className="detail-value price">
                                  {remaining != null ? formatPrice(remaining, cur) : '—'}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">{t('buyerHistory_date')}</span>
                                <span className="detail-value">{formatDate(row.paid_at)}</span>
                              </div>
                            </div>
                            {pid != null && (
                              <Link to={`/property/${pid}`} className="card-button">
                                {t('buyerHistory_openProperty')}
                              </Link>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="history-section">
              <h2 className="section-title">{t('buyerHistory_auctionBids')}</h2>
              <div className="history-list">
                {isLoadingBids ? (
                  <div className="empty-state">
                    <p>{t('buyerHistory_loading')}</p>
                  </div>
                ) : bidHistory.length > 0 ? (
                  bidHistory.map((bid) => (
                    <div key={bid.id} className="history-card bid-card">
                      <div className="card-content">
                        <div className="card-header">
                          <h3 className="card-title">
                            {bid.propertyTitle || t('buyerHistory_fallbackProperty')}
                          </h3>
                          <div className={`status-badge ${getStatusClass(bid.status)}`}>
                            {getStatusLabel(bid.status)}
                          </div>
                        </div>
                        <p className="card-location">{bid.location || t('buyerHistory_fallbackAddress')}</p>
                        <div className="card-details">
                          <div className="detail-item">
                            <span className="detail-label">{t('buyerHistory_yourBid')}</span>
                            <span className="detail-value price">{formatPrice(bid.bidAmount)}</span>
                          </div>
                          {bid.status === 'active' && (
                            <div className="detail-item">
                              <span className="detail-label">{t('buyerHistory_currentBid')}</span>
                              <span className="detail-value price">{formatPrice(bid.currentBid)}</span>
                            </div>
                          )}
                          {(bid.status === 'won' || bid.status === 'lost') && (
                            <div className="detail-item">
                              <span className="detail-label">{t('buyerHistory_finalPrice')}</span>
                              <span className="detail-value price">{formatPrice(bid.finalPrice)}</span>
                            </div>
                          )}
                          {bid.status === 'outbid' && (
                            <div className="detail-item">
                              <span className="detail-label">{t('buyerHistory_currentBid')}</span>
                              <span className="detail-value price">{formatPrice(bid.currentBid)}</span>
                            </div>
                          )}
                          <div className="detail-item">
                            <span className="detail-label">{t('buyerHistory_bidDateLabel')}</span>
                            <span className="detail-value">
                              {formatDate(bid.bidDate)} {t('buyerHistory_bidDateAt')} {bid.bidTime}
                            </span>
                          </div>
                        </div>
                        {bid.status === 'active' && (
                          <Link
                            to={`/property/${bid.id}`}
                            className="card-button"
                            onClick={(e) => {
                              if (ensureCanOpenProperty()) return
                              e.preventDefault()
                            }}
                          >
                            {t('buyerHistory_continueBid')}
                          </Link>
                        )}
                        {bid.status === 'outbid' && (
                          <Link
                            to={`/property/${bid.id}`}
                            className="card-button"
                            onClick={(e) => {
                              if (ensureCanOpenProperty()) return
                              e.preventDefault()
                            }}
                          >
                            {t('buyerHistory_raiseBid')}
                          </Link>
                        )}
                        {(bid.status === 'won' || bid.status === 'lost') && (
                          <Link
                            to={`/property/${bid.id}`}
                            className="card-link"
                            onClick={(e) => {
                              if (ensureCanOpenProperty()) return
                              e.preventDefault()
                            }}
                          >
                            {t('buyerHistory_viewProperty')}
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>{t('buyerHistory_emptyBids')}</p>
                  </div>
                )}
              </div>
            </section>
          </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default History

