import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser, useClerk } from '@clerk/clerk-react'
import { getUserData, isAuthenticated, logout, CLERK_DB_USER_SYNCED, getStoredNumericUserId } from '../services/authService'
import VerificationToast from '../components/VerificationToast'
import WonPropertyCard from '../components/WonPropertyCard'
import BuyNowCompletedHistoryCard from '../components/BuyNowCompletedHistoryCard'
import BuyerCabinetSidebar from '../components/BuyerCabinetSidebar'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { fetchVerificationStatus } from '../utils/verificationStatusApi'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { getPropertyCardImage } from '../utils/propertyImage'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import ImageWithSkeleton from '../components/ImageWithSkeleton'
import i18n from '../i18n/config'
import './History.css'
import './Profile.css'
import { useChainedAppLayoutScroll } from '../hooks/useChainedAppLayoutScroll'
import { PlaceCard } from '@/components/ui/card-22'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const SHARE_PURCHASE_IMAGE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'

function sharePurchaseImageSrc(raw) {
  if (!raw || typeof raw !== 'string') return SHARE_PURCHASE_IMAGE_PLACEHOLDER
  const t = raw.trim()
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:') || t.startsWith('/')) {
    return t
  }
  return `/${t.replace(/^\/+/, '')}`
}

function intlLocale() {
  const code = (i18n.language || 'ru').split('-')[0]
  const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }
  return map[code] || 'en-US'
}

function currencySymbolFromCode(currency) {
  const c = String(currency || 'EUR').toUpperCase()
  if (c === 'USD') return '$'
  if (c === 'EUR') return '€'
  if (c === 'BYN') return 'Br'
  return '€'
}

/** Срок резерва в истории: обратный отсчёт 3 суток с момента оплаты. */
const RESERVE_HOLD_MS = 3 * 24 * 60 * 60 * 1000

function formatReserveCountdown(msLeft) {
  if (msLeft <= 0) return '0:00:00'
  const totalSec = Math.floor(msLeft / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (d > 0) return `${d}д ${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function ReservationReserveCountdown({ paidAt, hide }) {
  const { t } = useTranslation()
  const endMs = (() => {
    if (paidAt == null || paidAt === '') return null
    const t0 = new Date(paidAt).getTime()
    if (!Number.isFinite(t0)) return null
    return t0 + RESERVE_HOLD_MS
  })()

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (endMs == null) return undefined
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [endMs])

  if (hide) return null
  if (endMs == null) return null

  const msLeft = endMs - now

  if (msLeft <= 0) {
    return (
      <div className="history-reservation-timer history-reservation-timer--expired" role="status">
        <span className="history-reservation-timer__value">{t('buyerHistory_reserveTimerExpired')}</span>
      </div>
    )
  }

  return (
    <div className="history-reservation-timer" role="timer" aria-live="polite" aria-atomic="true">
      <span className="history-reservation-timer__label">{t('buyerHistory_reserveTimerLabel')}</span>
      <span className="history-reservation-timer__value">{formatReserveCountdown(msLeft)}</span>
    </div>
  )
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
      loadCompletedPurchaseRequests()
      loadSharePurchases()
      loadBidHistory()
    } else {
      setIsLoadingPurchases(false)
      setIsLoadingReservations(false)
      setIsLoadingSharePurchases(false)
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
            const firstPhoto = getPropertyCardImage(
              property,
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
            )
            
            return {
              id: winner.id,
              propertyId: winner.property_id,
              propertyTitle: property.title || '',
              location: property.location || property.address || '',
              purchasePrice: winner.winning_bid_amount,
              purchaseDate: winner.won_at || winner.auction_end_date,
              status: winner.deposit_paid === 1 ? 'deposit_paid' : 'pending_deposit',
              image: firstPhoto,
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

  const loadVerificationStatus = async (force = false) => {
    if (!userId) return
    
    // Убеждаемся, что userId - число
    const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId
    if (isNaN(numericUserId)) {
      console.error('❌ userId не является числом в loadVerificationStatus:', userId)
      return
    }
    
    try {
      const status = await fetchVerificationStatus(API_BASE_URL, numericUserId, { ttlMs: 20000, force })
      if (status) setVerificationStatus(status)
    } catch (error) {
      console.error('Ошибка загрузки статуса верификации:', error)
    }
  }

  useEffect(() => {
    const onPush = () => {
      if (userId) loadVerificationStatus(true)
    }
    window.addEventListener('verification-status-update', onPush)
    return () => window.removeEventListener('verification-status-update', onPush)
  }, [userId])

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
    return !missingFields.passportNumber && 
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
  /** Запросы на покупку со статусом completed (менеджер нажал «Завершить») — скрываем таймер резерва. */
  const [completedPurchaseRequestIds, setCompletedPurchaseRequestIds] = useState(() => new Set())
  const [sharePurchases, setSharePurchases] = useState([])
  const [isLoadingSharePurchases, setIsLoadingSharePurchases] = useState(true)
  const [bidHistory, setBidHistory] = useState([])
  const [isLoadingBids, setIsLoadingBids] = useState(true)

  const handleSellObject = () => {
    const role = String(
      localStorage.getItem('userRole') || getUserData()?.role || 'buyer'
    ).toLowerCase()
    if (role === 'seller' || role === 'owner') {
      navigate('/owner/property/new')
      return
    }
    try {
      sessionStorage.setItem('login_modal_mode', 'register')
      sessionStorage.setItem('login_modal_user_role', 'seller')
    } catch {
      /* ignore */
    }
    requestOpenLoginModal({ wizard: false })
    navigate('/', { replace: true })
  }

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

  const loadCompletedPurchaseRequests = async () => {
    if (!userId) return
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId
    if (isNaN(numericUserId)) return
    try {
      const response = await fetch(
        `${API_BASE_URL}/purchase-requests/buyer/${numericUserId}?limit=200`
      )
      if (!response.ok) return
      const result = await response.json()
      if (!result.success || !Array.isArray(result.data)) return
      const ids = new Set()
      for (const row of result.data) {
        if (row.status === 'completed' && row.id != null) ids.add(Number(row.id))
      }
      setCompletedPurchaseRequestIds(ids)
    } catch (e) {
      console.warn('История: не удалось загрузить статусы запросов на покупку', e)
    }
  }

  const loadSharePurchases = async () => {
    if (!userId) return
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId
    if (isNaN(numericUserId)) return
    setIsLoadingSharePurchases(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users/${numericUserId}/share-purchases`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && Array.isArray(result.data)) {
          setSharePurchases(result.data)
        } else {
          setSharePurchases([])
        }
      } else {
        setSharePurchases([])
      }
    } catch (e) {
      console.error('Ошибка загрузки покупок долей:', e)
      setSharePurchases([])
    } finally {
      setIsLoadingSharePurchases(false)
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
              
              const imageUrls = []
              const pushImg = (raw) => {
                if (raw == null) return
                const u = String(raw).trim()
                if (!u) return
                if (u.startsWith('http') || u.startsWith('data:')) imageUrls.push(u)
                else imageUrls.push(u.startsWith('/') ? u : `/${u.replace(/^\/+/, '')}`)
              }
              if (Array.isArray(photos) && photos.length) {
                photos.forEach((p) => {
                  if (typeof p === 'string') pushImg(p)
                  else if (p && typeof p === 'object') pushImg(p.url || p.src || p.path)
                })
              }
              if (imageUrls.length === 0 && property.image) pushImg(property.image)
              if (imageUrls.length === 0) imageUrls.push(SHARE_PURCHASE_IMAGE_PLACEHOLDER)

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
                isAuction: isAuction,
                imageUrls,
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

  const { activeReservationPurchases, completedBuyNowReservations } = useMemo(() => {
    const active = []
    const completed = []
    for (const row of reservationPurchases) {
      const b = row.billing || {}
      const prId = b.purchase_request_id != null ? Number(b.purchase_request_id) : null
      const isDone =
        prId != null && !Number.isNaN(prId) && completedPurchaseRequestIds.has(prId)
      if (isDone) completed.push(row)
      else active.push(row)
    }
    return {
      activeReservationPurchases: active,
      completedBuyNowReservations: completed,
    }
  }, [reservationPurchases, completedPurchaseRequestIds])

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
                ) : (
                  <>
                    {purchaseHistory.length > 0 ? (
                      <div className="history-purchase-group">
                        <h3 className="history-purchase-group__title">
                          {t('buyerHistory_auctionBids')}
                        </h3>
                        <p className="history-purchase-group__subtitle">
                          {t('buyerHistory_termsAuctionPurchased', {
                            defaultValue:
                              'Покупка с аукциона: после победы вносится резерв/депозит, затем завершается сделка.',
                          })}
                        </p>
                        {purchaseHistory.map((purchase) => (
                          <WonPropertyCard
                            key={purchase.id}
                            purchase={purchase}
                            formatPrice={formatPrice}
                            formatDate={formatDate}
                            purchaseTerms={t('buyerHistory_termsAuctionPurchased', {
                              defaultValue:
                                'Условия покупки: победа в торгах, оплата депозита в срок и завершение сделки.',
                            })}
                            onSellObject={handleSellObject}
                          />
                        ))}
                      </div>
                    ) : null}
                    {!isLoadingReservations && completedBuyNowReservations.length > 0 ? (
                      <div className="history-purchase-group">
                        <h3 className="history-purchase-group__title">
                          {t('buyerHistory_buyNowSection', { defaultValue: 'Купить сейчас' })}
                        </h3>
                        <p className="history-purchase-group__subtitle">
                          {t('buyerHistory_termsBuyNowPurchased', {
                            defaultValue:
                              'Покупка по фиксированной цене: резерв 10% и последующая полная оплата объекта.',
                          })}
                        </p>
                        {completedBuyNowReservations.map((row) => (
                          <BuyNowCompletedHistoryCard
                            key={row.id || row.dedupe_key}
                            row={row}
                            formatPrice={formatPrice}
                            formatDate={formatDate}
                            sharePurchaseImageSrc={sharePurchaseImageSrc}
                            placeholderSrc={SHARE_PURCHASE_IMAGE_PLACEHOLDER}
                            purchaseTerms={t('buyerHistory_termsBuyNowPurchased', {
                              defaultValue:
                                'Условия покупки: внесен резерв, подтверждена сделка, объект закреплен за вами.',
                            })}
                            onSellObject={handleSellObject}
                          />
                        ))}
                      </div>
                    ) : null}
                    {isLoadingReservations && purchaseHistory.length === 0 ? (
                      <div className="empty-state" style={{ marginTop: 16 }}>
                        <p>{t('buyerHistory_loadingReserves')}</p>
                      </div>
                    ) : null}
                    {!isLoadingPurchases &&
                      !isLoadingReservations &&
                      purchaseHistory.length === 0 &&
                      completedBuyNowReservations.length === 0 && (
                        <div className="empty-state">
                          <p>{t('buyerHistory_emptyWins')}</p>
                        </div>
                      )}
                  </>
                )}
                {isLoadingReservations ? null : activeReservationPurchases.length > 0 ? (
                  <div className="history-reservations" style={{ marginTop: 24 }}>
                    <h3 className="section-subtitle" style={{ marginBottom: 12, fontSize: '1.1rem' }}>
                      {t('buyerHistory_reserveSection')}
                    </h3>
                    {activeReservationPurchases.map((row) => {
                      const b = row.billing || {}
                      const pid = b.property_id
                      const minSale = b.minimum_sale_price
                      const paidStripe = (row.amount_cents || 0) / 100
                      const walletEur = b.wallet_eur_applied || 0
                      const totalPaid = b.total_paid_toward_price ?? paidStripe + walletEur
                      const remaining = b.remaining_to_full_purchase ?? (minSale != null ? Math.max(0, minSale - totalPaid) : null)
                      const cur = (row.currency || 'eur').toUpperCase()
                      const title =
                        row.property_title ||
                        (pid != null
                          ? t('buyerHistory_propertyTitle', { id: pid })
                          : t('buyerHistory_propertyTitle', { id: '—' }))
                      const imgSrc = sharePurchaseImageSrc(row.property_image)
                      const imageProps = buildResponsiveImageProps(imgSrc, {
                        widths: [320, 480, 640],
                        sizes: '(max-width: 768px) 100vw, 420px',
                        fit: 'cover',
                        quality: 72,
                        format: 'webp',
                      })
                      const sig = row.agreement_signature
                      return (
                        <div
                          key={row.id || row.dedupe_key}
                          className="history-card purchase-card history-reservation-card"
                          style={{ marginBottom: 16 }}
                        >
                          <div className="card-image history-reservation-card__image">
                            <ImageWithSkeleton
                              imgProps={imageProps}
                              alt={title}
                              containerClassName="history-reservation-card__image"
                              onError={(e) => {
                                e.currentTarget.onerror = null
                                e.currentTarget.src = SHARE_PURCHASE_IMAGE_PLACEHOLDER
                              }}
                            />
                          </div>
                          <div className="card-content">
                            <div className="card-header">
                              <h3 className="card-title">{title}</h3>
                              <span className="status-badge status-success">
                                {t('buyerHistory_reservePaid')}
                              </span>
                            </div>
                            <ReservationReserveCountdown paidAt={row.paid_at} hide={false} />
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
                              {row.agreement_policy_version && (
                                <div className="detail-item">
                                  <span className="detail-label">Политика</span>
                                  <span className="detail-value">{row.agreement_policy_version}</span>
                                </div>
                              )}
                            </div>
                            {sig && String(sig).startsWith('data:image') && (
                              <div className="history-reservation-signature">
                                <span className="detail-label">Подпись согласия</span>
                                <img src={sig} alt="" className="history-reservation-signature__img" />
                              </div>
                            )}
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
                {isLoadingSharePurchases ? (
                  <div className="empty-state" style={{ marginTop: 16 }}>
                    <p>{t('buyerHistory_loadingShares')}</p>
                  </div>
                ) : sharePurchases.length > 0 ? (
                  <div className="history-reservations history-purchase-group" style={{ marginTop: 24 }}>
                    <h3 className="section-subtitle" style={{ marginBottom: 12, fontSize: '1.1rem' }}>
                      {t('buyerHistory_shareSection')}
                    </h3>
                    <p className="history-purchase-group__subtitle">
                      {t('buyerHistory_termsSharesPurchased', {
                        defaultValue:
                          'Покупка долей: фиксируется количество долей и цена за долю на дату сделки.',
                      })}
                    </p>
                    {sharePurchases.map((row) => {
                      const cur = (row.currency || 'USD').toUpperCase()
                      const shareTo = `/shares/${row.property_type}-${row.property_id}`
                      const title =
                        row.property_title || t('buyerHistory_propertyTitle', { id: row.property_id })
                      const imgSrc = sharePurchaseImageSrc(row.property_image)
                      const imageProps = buildResponsiveImageProps(imgSrc, {
                        widths: [320, 480, 640],
                        sizes: '(max-width: 768px) 100vw, 420px',
                        fit: 'cover',
                        quality: 72,
                        format: 'webp',
                      })
                      return (
                        <div
                          key={row.id}
                          className="history-card history-share-purchase-card purchase-card"
                          style={{ marginBottom: 16 }}
                        >
                          <div className="card-image history-share-purchase-card__image">
                            <ImageWithSkeleton
                              imgProps={imageProps}
                              alt={title}
                              containerClassName="history-share-purchase-card__image"
                              onError={(e) => {
                                e.currentTarget.onerror = null
                                e.currentTarget.src = SHARE_PURCHASE_IMAGE_PLACEHOLDER
                              }}
                            />
                            <span className="history-share-purchase-card__badge">{t('buyerHistory_shareBadge')}</span>
                          </div>
                          <div className="card-content">
                            <div className="card-header">
                              <h3 className="card-title">{title}</h3>
                              <span className="status-badge status-success">{t('buyerHistory_sharePaid')}</span>
                            </div>
                            {(row.property_location || row.property_type) && (
                              <p className="card-location">
                                {[row.property_location, row.property_type].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            <p className="history-purchase-terms">
                              {t('buyerHistory_termsSharesPurchased', {
                                defaultValue:
                                  'Условия покупки: количество долей и стоимость зафиксированы при оплате.',
                              })}
                            </p>
                            <div className="card-details">
                              <div className="detail-item">
                                <span className="detail-label">{t('buyerHistory_sharesBought')}</span>
                                <span className="detail-value">{row.shares_count}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">{t('buyerHistory_pricePerShare')}</span>
                                <span className="detail-value price">
                                  {formatPrice(row.price_per_share, cur)}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">{t('buyerHistory_totalPaidShares')}</span>
                                <span className="detail-value price">
                                  {formatPrice(row.total_price, cur)}
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">{t('buyerHistory_date')}</span>
                                <span className="detail-value">{formatDate(row.purchase_date)}</span>
                              </div>
                            </div>
                            <Link to={shareTo} className="card-button">
                              {t('buyerHistory_shareOpenObject')}
                            </Link>
                            <button
                              type="button"
                              className="card-button card-button--secondary"
                              onClick={handleSellObject}
                            >
                              Продать объект
                            </button>
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
              <div className="history-list history-list--bids-grid">
                {isLoadingBids ? (
                  <div className="empty-state">
                    <p>{t('buyerHistory_loading')}</p>
                  </div>
                ) : bidHistory.length > 0 ? (
                  bidHistory.map((bid) => {
                    const dateRange = bid.endTime
                      ? `${formatDate(bid.bidDate)} — ${formatDate(bid.endTime)}`
                      : formatDate(bid.bidDate)
                    const tags = [
                      bid.isAuction ? t('buyerHistory_bidCard_tagAuction') : t('buyerHistory_bidCard_tagListing'),
                      getStatusLabel(bid.status),
                    ]
                    const descParts = [
                      bid.location || t('buyerHistory_fallbackAddress'),
                      `${t('buyerHistory_yourBid')} ${formatPrice(bid.bidAmount, bid.currency)}`,
                    ]
                    if (bid.status === 'active' || bid.status === 'outbid') {
                      descParts.push(`${t('buyerHistory_currentBid')} ${formatPrice(bid.currentBid, bid.currency)}`)
                    }
                    if (bid.status === 'won' || bid.status === 'lost') {
                      descParts.push(`${t('buyerHistory_finalPrice')} ${formatPrice(bid.finalPrice, bid.currency)}`)
                    }
                    descParts.push(
                      `${t('buyerHistory_bidDateLabel')} ${formatDate(bid.bidDate)} ${t('buyerHistory_bidDateAt')} ${bid.bidTime}`
                    )
                    const description = descParts.join(' · ')
                    const ctaLabel =
                      bid.status === 'active'
                        ? t('buyerHistory_continueBid')
                        : bid.status === 'outbid'
                          ? t('buyerHistory_raiseBid')
                          : t('buyerHistory_viewProperty')
                    return (
                      <PlaceCard
                        key={bid.id}
                        className="w-full max-w-none"
                        images={bid.imageUrls || [SHARE_PURCHASE_IMAGE_PLACEHOLDER]}
                        tags={tags}
                        rating={null}
                        title={bid.propertyTitle || t('buyerHistory_fallbackProperty')}
                        dateRange={dateRange}
                        hostType={t('buyerHistory_bidCard_hostType')}
                        isTopRated={bid.status === 'won'}
                        topRatedLabel={t('buyerHistory_bidCard_topRated')}
                        description={description}
                        priceAmount={bid.currentBid}
                        currencySymbol={currencySymbolFromCode(bid.currency)}
                        priceSuffix={t('buyerHistory_bidCard_priceSuffix')}
                        bookNowLabel={ctaLabel}
                        bookNowTo={`/property/${bid.id}`}
                        onBookNowClick={(e) => {
                          if (ensureCanOpenProperty()) return
                          e.preventDefault()
                        }}
                      />
                    )
                  })
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

