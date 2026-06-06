import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { properties } from '../data/properties'
import CountdownTimer from '../components/CountdownTimer'
import BiddingHistoryModal from '../components/BiddingHistoryModal'
import DepositButton from '../components/DepositButton'
import DepositRequiredModal from '../components/DepositRequiredModal'
import { getUserData, isAuthenticated } from '../services/authService'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { roleSkipsAuctionKyc } from '../utils/buyerAuctionKyc'
import { isAuctionDepositSufficient } from '../utils/auctionDeposit'
import { fetchUserDeposit } from '../utils/depositApi'
import { navigateToWallet } from '../utils/walletNavigation'
import { getPropertyEntryFrom } from '../utils/propertyNavigation'
import { normalizePropertyMediaFields } from '../utils/propertyImage'
import BidOutbidNotification from '../components/BidOutbidNotification'
import { FiX, FiLayers, FiHome, FiCheck, FiX as FiXIcon, FiLock } from 'react-icons/fi'
import { IoLocationOutline } from 'react-icons/io5'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import LocationMap from '../components/LocationMap'
import './PropertyDetail.css'
import { formatPropertyPrice, getCurrencySymbol } from '../utils/currency'
import { resolvePropertySourceTable, propertyBidsApiQuery } from '../utils/propertySourceTable'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const PropertyDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n, t } = useTranslation()
  const [property, setProperty] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [bidAmount, setBidAmount] = useState('')
  const [isBidHistoryOpen, setIsBidHistoryOpen] = useState(false)
  const [userDeposit, setUserDeposit] = useState(0)
  const [minimumBid, setMinimumBid] = useState(0)
  const [currentBid, setCurrentBid] = useState(0)
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [bidError, setBidError] = useState('')
  const [bidHistoryRefresh, setBidHistoryRefresh] = useState(0)
  const [outbidNotification, setOutbidNotification] = useState(null)
  const [isDepositRequiredOpen, setIsDepositRequiredOpen] = useState(false)
  const shownNotificationIdsRef = useRef(new Set())
  const [auctionKycVerified, setAuctionKycVerified] = useState(null)
  const userData = getUserData()
  const userId = userData?.id

  // Функция для проверки, можно ли показывать депозит (только для авторизованных покупателей)
  const canShowDeposit = () => {
    // Проверяем, авторизован ли пользователь
    if (!isAuthenticated() || !userData || !userData.isLoggedIn) {
      return false
    }
    // Показываем депозит только для покупателей (не для продавцов)
    const userRole = userData.role || 'buyer'
    return userRole === 'buyer' || userRole === 'client'
  }

  // Проверка авторизации при загрузке компонента
  useEffect(() => {
    // Проверяем, является ли пользователь админом
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true'
    const userRole = localStorage.getItem('userRole')
    const isAdmin = isAdminLoggedIn && userRole === 'admin'
    
    // Если пользователь не авторизован и не админ, перенаправляем
    if (!isAdmin && (!isAuthenticated() || !userData || !userData.isLoggedIn)) {
      requestOpenLoginModal({ wizard: true })
      navigate('/')
    }
  }, [navigate])

  // Функция для загрузки данных объекта
  const loadPropertyData = async (propertyId) => {
    if (!propertyId) return null
    
    try {
      const lang = (i18n.language || 'ru').split('-')[0]
      let viewerQ = ''
      try {
        const uid = localStorage.getItem('userId')
        if (uid && /^\d+$/.test(String(uid).trim())) {
          viewerQ = `&viewer_user_id=${encodeURIComponent(String(uid).trim())}`
        }
      } catch (_) {
        /* ignore */
      }
      const response = await fetch(`${API_BASE_URL}/properties/${propertyId}?lang=${lang}${viewerQ}`)
      if (response.status === 403) {
        const errJson = await response.json().catch(() => ({}))
        if (errJson?.code === 'PRIVATE_CLUB_ONLY') {
          return { __privateClubBlocked: true }
        }
        return null
      }
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          return result.data
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки объявления:', err)
    }
    return null
  }

  // Функция для обработки данных объекта
  const processPropertyData = async (prop) => {
    // Обрабатываем фотографии (включая legacy форматы photos/images)
    const { image: normalizedImage, images: normalizedImages } = normalizePropertyMediaFields(prop)
    let processedImages = normalizedImages
    if (processedImages.length === 0) {
      processedImages = normalizedImage
        ? [normalizedImage]
        : ['/images/external/photo-1568605114967-8130f3a36994-bc29e86e2f.jpg']
    }
    
    // Обрабатываем видео
    let processedVideos = []
    if (prop.videos && Array.isArray(prop.videos) && prop.videos.length > 0) {
      const normalizeVideo = (video) => {
        const url = typeof video === 'string' ? video : (video && (video.url || video.embedUrl))
        if (!url) return video
        const urlStr = String(url).trim()
        const youtubeMatch = urlStr.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
        if (youtubeMatch) {
          return { type: 'youtube', videoId: youtubeMatch[1], url: urlStr }
        }
        const driveMatch = urlStr.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
        if (driveMatch) {
          return { type: 'googledrive', videoId: driveMatch[1], url: urlStr }
        }
        const driveOpenMatch = urlStr.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
        if (driveOpenMatch) {
          return { type: 'googledrive', videoId: driveOpenMatch[1], url: urlStr }
        }
        return typeof video === 'object' && video ? { type: 'file', url: urlStr, ...video } : { type: 'file', url: urlStr }
      }
      processedVideos = prop.videos.map(video => normalizeVideo(video)).filter(Boolean)
    }
    
    // Обрабатываем координаты
    let coordinates = [28.1000, -16.7200]
    if (prop.coordinates) {
      try {
        if (typeof prop.coordinates === 'string') {
          const parsed = JSON.parse(prop.coordinates)
          if (Array.isArray(parsed) && parsed.length >= 2) {
            coordinates = [parseFloat(parsed[0]), parseFloat(parsed[1])]
          }
        } else if (Array.isArray(prop.coordinates) && prop.coordinates.length >= 2) {
          coordinates = [parseFloat(prop.coordinates[0]), parseFloat(prop.coordinates[1])]
        }
      } catch (e) {
        console.warn('Ошибка парсинга coordinates:', e)
      }
    }
    
      // Получаем текущую максимальную ставку
      // Сначала показываем стартовую цену, если есть ставки - показываем максимальную ставку
      let currentMaxBid = prop.auction_starting_price || prop.price || 0
      let minBid = prop.auction_minimum_bid || (currentMaxBid + (currentMaxBid * 0.05))
      
      // Загружаем ставки для этого объекта, чтобы получить актуальную максимальную ставку
      try {
        const bidsTable = resolvePropertySourceTable(prop)
        const bidsResponse = await fetch(
          `${API_BASE_URL}/bids/property/${prop.id}?${propertyBidsApiQuery(prop.id, bidsTable)}`,
        )
        if (bidsResponse.ok) {
          const bidsData = await bidsResponse.json()
          if (bidsData.success && bidsData.data && bidsData.data.length > 0) {
            // Если есть ставки - показываем максимальную ставку
            const maxBid = Math.max(...bidsData.data.map(b => b.bid_amount))
            currentMaxBid = maxBid
            console.log(`✅ Найдены ставки, текущая максимальная: ${currentMaxBid}`)
          } else {
            // Если ставок нет - показываем стартовую цену
            console.log(`📊 Ставок нет, показываем стартовую цену: ${currentMaxBid}`)
          }
          // Обновляем минимальную ставку на основе актуальных данных
          minBid = prop.auction_minimum_bid || (currentMaxBid + (currentMaxBid * 0.05))
        }
      } catch (bidsError) {
        console.warn('Не удалось загрузить ставки:', bidsError)
      }
    
    // Логируем данные о резервации для отладки
    console.log('🔍 Данные о резервации из API:', {
      is_reserved: prop.is_reserved,
      reserved_until: prop.reserved_until,
      reserved_by: prop.reserved_by,
      reservation_time_remaining: prop.reservation_time_remaining
    });
    
    const formattedProperty = {
      id: prop.id,
      title: prop.title,
      name: prop.title,
      description: prop.description || '',
      location: prop.location || '',
      price: prop.price || 0,
      currentBid: currentMaxBid,
      area: prop.area || 0,
      sqft: prop.area || 0,
      rooms: prop.rooms || 0,
      beds: prop.bedrooms || prop.rooms || 0,
      bathrooms: prop.bathrooms || 0,
      floor: prop.floor || null,
      total_floors: prop.total_floors || null,
      year_built: prop.year_built || null,
      property_type: prop.property_type || 'apartment',
      coordinates: coordinates,
      images: processedImages,
      videos: processedVideos,
      balcony: prop.balcony === 1,
      parking: prop.parking === 1,
      elevator: prop.elevator === 1,
      land_area: prop.land_area || null,
      garage: prop.garage === 1,
      pool: prop.pool === 1,
      garden: prop.garden === 1,
      renovation: prop.renovation || null,
      condition: prop.condition || null,
      heating: prop.heating || null,
      water_supply: prop.water_supply || null,
      sewerage: prop.sewerage || null,
      electricity: prop.electricity === 1,
      internet: prop.internet === 1,
      security: prop.security === 1,
      furniture: prop.furniture === 1,
      commercial_type: prop.commercial_type || null,
      business_hours: prop.business_hours || null,
      currency: prop.currency || 'USD',
      is_auction: prop.is_auction === 1 || prop.is_auction === true,
      auction_start_date: prop.auction_start_date || null,
      auction_end_date: prop.auction_end_date || null,
      auction_starting_price: prop.auction_starting_price || null,
      auction_minimum_bid: prop.auction_minimum_bid || null,
      endTime: prop.auction_end_date || null,
      additional_amenities: prop.additional_amenities || null,
      seller: prop.first_name && prop.last_name 
        ? `${prop.first_name} ${prop.last_name}` 
        : 'Продавец',
      is_reserved: prop.is_reserved === true || prop.is_reserved === 1 || prop.is_reserved === 'true' || false,
      reserved_until: prop.reserved_until || null,
      reserved_by: prop.reserved_by || null,
      reservation_time_remaining: prop.reservation_time_remaining || null,
    }
    
    console.log('✅ Обработанные данные о резервации:', {
      is_reserved: formattedProperty.is_reserved,
      reserved_until: formattedProperty.reserved_until,
      reserved_until_date: formattedProperty.reserved_until ? new Date(formattedProperty.reserved_until) : null,
      is_reserved_valid: formattedProperty.is_reserved && formattedProperty.reserved_until && new Date(formattedProperty.reserved_until) > new Date()
    });
    
    setProperty(formattedProperty)
    setCurrentBid(currentMaxBid)
    setMinimumBid(minBid)
    
    return formattedProperty
  }

  // Загружаем данные объявления
  useEffect(() => {
    const loadProperty = async () => {
      // Всегда загружаем актуальные данные с сервера, чтобы получить информацию о резервации
      if (id) {
        try {
          setIsLoading(true)
          console.log(`🔍 PropertyDetail: Загрузка данных объекта ID=${id}`);
          const prop = await loadPropertyData(id)
          if (prop?.__privateClubBlocked) {
            showNotification(t('auctionPrivateClubLotTooltip'))
            navigate('/subscriptions')
            return
          }
          if (prop) {
            console.log(`🔍 PropertyDetail: Данные объекта получены:`, {
              id: prop.id,
              title: prop.title,
              is_reserved: prop.is_reserved,
              reserved_until: prop.reserved_until
            });
            await processPropertyData(prop)
          } else {
            console.warn(`⚠️ PropertyDetail: Объект с ID ${id} не найден`);
          }
        } catch (err) {
          console.error('Ошибка загрузки объявления:', err)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }

    loadProperty()
  }, [id])

  // Функция для загрузки депозита пользователя
  const loadUserDeposit = async () => {
    if (!userId) {
      setUserDeposit(0)
      return
    }
    
    try {
      const deposit = await fetchUserDeposit(API_BASE_URL, userId, { ttlMs: 15000 })
      if (deposit && typeof deposit.depositAmount === 'number') {
        setUserDeposit(deposit.depositAmount || 0)
      }
    } catch (error) {
      console.error('Ошибка загрузки депозита:', error)
      setUserDeposit(0)
    }
  }

  // Нормализуем данные объекта для совместимости с разными форматами
  const normalizedProperty = property ? {
    ...property,
    title: property.title || property.name || 'Объект недвижимости',
    area: property.area || property.sqft,
    rooms: property.rooms || property.beds,
    images: property.images || (property.image ? [property.image] : []),
    currentBid: property.currentBid || property.price,
    price: property.price || property.currentBid,
    coordinates: property.coordinates || [28.1000, -16.7200],
    // Сохраняем данные о резервации
    is_reserved: property.is_reserved === true || property.is_reserved === 1 || property.is_reserved === 'true' || false,
    reserved_until: property.reserved_until || null,
    reserved_by: property.reserved_by || null,
    reservation_time_remaining: property.reservation_time_remaining || null
  } : null
  
  // Логируем normalizedProperty для отладки
  if (normalizedProperty) {
    console.log('🔍 normalizedProperty резервация:', {
      is_reserved: normalizedProperty.is_reserved,
      reserved_until: normalizedProperty.reserved_until,
      shouldShowBanner: normalizedProperty.is_reserved && normalizedProperty.reserved_until && new Date(normalizedProperty.reserved_until) > new Date()
    });
  }
  
  // Логируем для отладки
  useEffect(() => {
    if (normalizedProperty) {
      console.log('✅ Property loaded:', normalizedProperty.id, normalizedProperty.title, 'Auction:', normalizedProperty.is_auction)
      console.log('📊 Property data:', {
        area: normalizedProperty.area,
        rooms: normalizedProperty.rooms,
        bathrooms: normalizedProperty.bathrooms,
        floor: normalizedProperty.floor,
        total_floors: normalizedProperty.total_floors,
        coordinates: normalizedProperty.coordinates
      })
    } else if (id && !isLoading) {
      console.error('❌ Property not found for ID:', id)
    }
  }, [id, normalizedProperty, isLoading])

  useEffect(() => {
    loadUserDeposit()
    const onFocus = () => loadUserDeposit()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [userId])

  // Статус одобрения KYC для аукциона (покупатель с депозитом)
  useEffect(() => {
    if (!userId) {
      setAuctionKycVerified(null)
      return
    }
    const needKyc =
      Boolean(normalizedProperty?.is_auction) &&
      !roleSkipsAuctionKyc(userData?.role || 'buyer')
    if (!needKyc) {
      setAuctionKycVerified(null)
      return
    }
    const loadKyc = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/verification-status`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setAuctionKycVerified(Boolean(data.data.isVerified))
            return
          }
        }
        setAuctionKycVerified(null)
      } catch {
        setAuctionKycVerified(null)
      }
    }
    loadKyc()
    const onRefresh = () => loadKyc()
    window.addEventListener('verification-status-update', onRefresh)
    window.addEventListener('focus', onRefresh)
    return () => {
      window.removeEventListener('verification-status-update', onRefresh)
      window.removeEventListener('focus', onRefresh)
    }
  }, [userId, normalizedProperty?.is_auction, userData?.role])

  // Периодическое обновление данных объекта (ставки, текущая ставка)
  useEffect(() => {
    if (!normalizedProperty?.id || !normalizedProperty?.is_auction) return
    
    const updateBids = async () => {
      try {
        // Загружаем актуальные ставки
        const bidsTable = resolvePropertySourceTable(normalizedProperty)
        const bidsResponse = await fetch(
          `${API_BASE_URL}/bids/property/${normalizedProperty.id}?${propertyBidsApiQuery(normalizedProperty.id, bidsTable)}`,
        )
        if (bidsResponse.ok) {
          const bidsData = await bidsResponse.json()
          if (bidsData.success && bidsData.data && bidsData.data.length > 0) {
            const maxBid = Math.max(...bidsData.data.map(b => b.bid_amount))
            if (maxBid !== currentBid) {
              setCurrentBid(maxBid)
              setProperty({
                ...normalizedProperty,
                currentBid: maxBid
              })
              // Обновляем минимальную ставку
              const prop = await loadPropertyData(normalizedProperty.id)
              if (prop && !prop.__privateClubBlocked) {
                const newMinBid = prop.auction_minimum_bid || (maxBid + (maxBid * 0.05))
                setMinimumBid(newMinBid)
              }
            }
          }
        }
      } catch (error) {
        console.warn('Ошибка обновления ставок:', error)
      }
    }
    
    const interval = setInterval(updateBids, 30000)
    const onFocus = () => updateBids()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [normalizedProperty?.id, normalizedProperty?.is_auction, currentBid])

  // Проверяем уведомления о перебитой ставке для текущего объекта
  useEffect(() => {
    if (!normalizedProperty?.id || !normalizedProperty?.is_auction || !userId) return

    const checkNotifications = async () => {
      try {
        // Загружаем уведомления пользователя
        const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            console.log('🔍 Проверка уведомлений для объекта:', normalizedProperty.id)
            console.log('🔍 Все уведомления:', data.data)
            console.log('🔍 Уведомления bid_outbid:', data.data.filter(n => n.type === 'bid_outbid'))
            
            // Ищем уведомления о перебитой ставке для текущего объекта
            const outbidNotifs = data.data.filter(n => {
              if (n.type !== 'bid_outbid') return false
              if (shownNotificationIdsRef.current.has(n.id)) return false
              if (n.view_count !== 0) return false
              
              // data уже парсится на сервере, но на всякий случай проверяем
              let notificationData = n.data
              if (typeof notificationData === 'string') {
                try {
                  notificationData = JSON.parse(notificationData)
                } catch (e) {
                  console.warn('Ошибка парсинга data уведомления:', e)
                  return false
                }
              }
              
              // Сравниваем property_id (может быть число или строка)
              const notifPropertyId = notificationData?.property_id
              const currentPropertyId = parseInt(normalizedProperty.id)
              
              console.log('🔍 Сравнение property_id:', {
                notifPropertyId,
                currentPropertyId,
                notifPropertyIdType: typeof notifPropertyId,
                currentPropertyIdType: typeof currentPropertyId,
                match: notifPropertyId == currentPropertyId || parseInt(notifPropertyId) === currentPropertyId
              })
              
              return notifPropertyId && (
                notifPropertyId == currentPropertyId || 
                parseInt(notifPropertyId) === currentPropertyId
              )
            })

            if (outbidNotifs.length > 0) {
              // Берем самое свежее уведомление
              const latestNotif = outbidNotifs.sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
              )[0]
              
              // Убеждаемся, что data парсится правильно
              let parsedData = latestNotif.data
              if (typeof parsedData === 'string') {
                try {
                  parsedData = JSON.parse(parsedData)
                } catch (e) {
                  console.warn('Ошибка парсинга data:', e)
                }
              }
              
              const notificationToShow = {
                ...latestNotif,
                data: parsedData
              }
              
              setOutbidNotification(notificationToShow)
              shownNotificationIdsRef.current.add(latestNotif.id)
              console.log('🔔 ✅ Показано уведомление о перебитой ставке на странице объекта:', latestNotif.id, notificationToShow)
            } else {
              console.log('🔍 Уведомления о перебитой ставке для этого объекта не найдены')
            }
          }
        }
      } catch (error) {
        console.warn('Ошибка проверки уведомлений:', error)
      }
    }

    checkNotifications()
    const onFocus = () => checkNotifications()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [normalizedProperty?.id, normalizedProperty?.is_auction, userId])

  if (isLoading) {
    return (
      <div className="property-detail-page">
        {canShowDeposit() && <DepositButton amount={userDeposit} />}
        <div className="property-detail">
          <div className="loading" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '50vh',
            fontSize: '18px'
          }}>
            Загрузка...
          </div>
        </div>
      </div>
    )
  }

  const handleCloseOutbidNotification = () => {
    setOutbidNotification(null)
  }

  const handleGoToPropertyFromNotification = (propertyId) => {
    // Если мы уже на странице этого объекта, просто прокручиваем к форме ставки
    if (propertyId === parseInt(normalizedProperty?.id)) {
      const bidForm = document.querySelector('.bid-form') || document.querySelector('.property-bid-section')
      if (bidForm) {
        bidForm.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  if (!normalizedProperty) {
    console.error('Property not found. ID:', id, 'Available IDs:', properties.map(p => p.id))
    return (
      <div className="property-detail-page">
        {outbidNotification && (
          <BidOutbidNotification
            notification={outbidNotification}
            onClose={handleCloseOutbidNotification}
            onGoToProperty={handleGoToPropertyFromNotification}
          />
        )}
        {canShowDeposit() && <DepositButton amount={userDeposit} />}
        <div className="property-detail">
          <div className="not-found">
            <h2>Объект не найден</h2>
            <p>ID: {id}</p>
            <Link to="/" className="btn btn-primary">Вернуться на главную</Link>
          </div>
        </div>
      </div>
    )
  }

  const formatPrice = (price) =>
    formatPropertyPrice(price, normalizedProperty.currency, { compact: true })

  const showSellerRoleWarningToast = () => {
    showNotification(
      <span>
        Продавцы не могут делать ставки на объекты.{' '}
        <button
          type="button"
          className="auth-toast-link"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            try {
              sessionStorage.setItem('login_modal_mode', 'register')
              sessionStorage.setItem('login_modal_user_role', 'buyer')
            } catch {
              // ignore
            }
            requestOpenLoginModal({ wizard: false })
          }}
        >
          Стать покупателем <span className="auth-toast-link__arrow">→</span>
        </button>
      </span>,
      'info',
      9000
    )
  }

  const handleBid = async (e) => {
    e.preventDefault()
    setBidError('')
    
    if (!userId) {
      setBidError('Необходимо войти в систему')
      return
    }
    
    // Проверяем, что пользователь не является продавцом
    const userRole = userData?.role || 'buyer'
    if (userRole === 'seller' || userRole === 'owner') {
      showSellerRoleWarningToast()
      return
    }
    
    // Проверяем резервацию объекта
    if (property?.is_reserved) {
      const reservedUntil = property.reserved_until ? new Date(property.reserved_until) : null
      if (reservedUntil && reservedUntil > new Date()) {
        const hoursRemaining = Math.ceil((reservedUntil - new Date()) / (1000 * 60 * 60))
        showNotification(`Объект забронирован на ${hoursRemaining} часов. Ставки временно недоступны.`)
        return
      }
    }
    
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setBidError('Введите сумму ставки')
      return
    }
    
    const bidAmountNum = parseFloat(bidAmount)
    
    // Проверяем минимальную ставку
    if (bidAmountNum < minimumBid) {
      setBidError(`Ставка должна быть не меньше ${formatPrice(minimumBid)}`)
      return
    }
    
    const roleForBid = userData?.role || 'buyer'
    if (normalizedProperty?.is_auction && !roleSkipsAuctionKyc(roleForBid)) {
      if (!isAuctionDepositSufficient(userDeposit)) {
        setBidError(t('propertyDetailBidDepositRequired'))
        setIsDepositRequiredOpen(true)
        return
      }
      if (auctionKycVerified === false) {
        const pendingMsg = t('propertyDetailBidVerificationPending')
        setBidError(pendingMsg)
        showNotification(pendingMsg)
        return
      }
    }

    setIsSubmittingBid(true)
    
    const requestData = {
      user_id: parseInt(userId),
      property_id: parseInt(normalizedProperty.id),
      property_table: resolvePropertySourceTable(normalizedProperty),
      property_type: normalizedProperty.property_type || undefined,
      bid_amount: parseFloat(bidAmountNum),
    }
    
    console.log('📤 Отправка ставки:', requestData)
    console.log('📤 Типы данных:', {
      user_id: typeof requestData.user_id,
      property_id: typeof requestData.property_id,
      bid_amount: typeof requestData.bid_amount
    })
    console.log('📤 API_BASE_URL:', API_BASE_URL)
    console.log('📤 Полный URL:', `${API_BASE_URL}/bids`)
    console.log('📤 userId:', userId, '->', requestData.user_id)
    console.log('📤 property_id:', normalizedProperty.id, '->', requestData.property_id)
    
    try {
      const response = await fetch(`${API_BASE_URL}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      
      console.log('📥 Ответ сервера:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Ошибка HTTP:', response.status, errorText)
        let errMsg = `Ошибка сервера: ${response.status}`
        try {
          const errData = JSON.parse(errorText)
          if (errData.code === 'VERIFICATION_PENDING') {
            errMsg = t('propertyDetailBidVerificationPending')
          } else if (errData.error) {
            errMsg = errData.error
          }
        } catch {
          /* текст ответа не JSON */
        }
        setBidError(errMsg)
        showNotification(errMsg)
        setIsSubmittingBid(false)
        return
      }
      
      const data = await response.json()
      console.log('📥 Данные ответа:', data)
      
      if (data.success) {
        console.log('✅ Ставка успешно создана на сервере:', data)
        setBidAmount('')
        setBidError('')
        
        // Сразу обновляем историю ставок
        setBidHistoryRefresh(prev => prev + 1)
        
        // Перезагружаем данные объекта с сервера для получения актуальной информации
        try {
          const prop = await loadPropertyData(normalizedProperty.id)
          if (prop && !prop.__privateClubBlocked) {
            await processPropertyData(prop)
            console.log('✅ Данные объекта обновлены')
          }
        } catch (err) {
          console.error('Ошибка обновления данных объекта:', err)
        }
        
        // Обновляем депозит
        await loadUserDeposit()
        
        // Показываем успешное сообщение
        showNotification(`Ставка ${formatPrice(bidAmountNum)} успешно принята!`)
        
        // Перезагружаем данные и историю через небольшую задержку для гарантии
        setTimeout(async () => {
          try {
            const prop = await loadPropertyData(normalizedProperty.id)
            if (prop && !prop.__privateClubBlocked) {
              await processPropertyData(prop)
            }
            // Еще раз обновляем историю
            setBidHistoryRefresh(prev => prev + 1)
            console.log('✅ Повторное обновление данных выполнено')
          } catch (err) {
            console.error('Ошибка повторного обновления:', err)
          }
        }, 1500)
      } else {
        console.error('❌ Ошибка создания ставки:', data)
        setBidError(data.error || 'Ошибка при создании ставки')
        showNotification(`Ошибка: ${data.error || 'Ошибка при создании ставки'}`)
      }
    } catch (error) {
      console.error('❌ Ошибка при создании ставки:', error)
      setBidError('Ошибка при создании ставки. Попробуйте позже.')
      showNotification(`Ошибка сети: ${error.message}`)
    } finally {
      setIsSubmittingBid(false)
    }
  }

  const reservedBlocksBid = Boolean(
    normalizedProperty?.is_reserved &&
      normalizedProperty?.reserved_until &&
      new Date(normalizedProperty.reserved_until) > new Date()
  )
  const roleForBidUi = userData?.role || 'buyer'
  const auctionKycRequiredUi =
    Boolean(normalizedProperty?.is_auction) && !roleSkipsAuctionKyc(roleForBidUi)
  const kycBidBlocked =
    auctionKycRequiredUi && isAuctionDepositSufficient(userDeposit) && auctionKycVerified === false
  const disableBidFields = reservedBlocksBid || kycBidBlocked
  const handleBackClick = () => {
    const from = getPropertyEntryFrom()
    if (from) {
      navigate(from)
      return
    }
    navigate('/auction')
  }

  return (
    <div className="property-detail-page">
      {outbidNotification && (
        <BidOutbidNotification
          notification={outbidNotification}
          onClose={handleCloseOutbidNotification}
          onGoToProperty={handleGoToPropertyFromNotification}
        />
      )}
      {canShowDeposit() && <DepositButton amount={userDeposit} />}
      <div className="property-detail">
        <div className="detail-header">
          <button onClick={handleBackClick} className="back-button">
            ← Назад
          </button>
          <div className="detail-nav">
            <Link to="/">Результаты поиска</Link>
            <span> / </span>
            <span>{normalizedProperty.title}</span>
          </div>
        </div>

        {/* Баннер резервации */}
        {(() => {
          if (!normalizedProperty) return false;
          const isReserved = normalizedProperty.is_reserved === true || normalizedProperty.is_reserved === 1 || normalizedProperty.is_reserved === 'true';
          const reservedUntil = normalizedProperty.reserved_until ? new Date(normalizedProperty.reserved_until) : null;
          const isValid = isReserved && reservedUntil && reservedUntil > new Date();
          
          console.log('🔍 Проверка отображения баннера резервации:', {
            normalizedProperty_exists: !!normalizedProperty,
            is_reserved: normalizedProperty.is_reserved,
            isReserved: isReserved,
            reserved_until: normalizedProperty.reserved_until,
            reservedUntil: reservedUntil ? reservedUntil.toISOString() : null,
            now: new Date().toISOString(),
            isValid: isValid,
            hoursRemaining: isValid && reservedUntil ? Math.ceil((reservedUntil - new Date()) / (1000 * 60 * 60)) : 0
          });
          
          return isValid;
        })() && null}

        <div className="detail-content">
          <div className="detail-images">
              <div className="main-image">
                <img 
                  src={normalizedProperty.images[selectedImage]} 
                  alt={normalizedProperty.title}
                />
                <div className="image-controls">
                  <button 
                    className="image-btn"
                    onClick={() => setSelectedImage(Math.max(0, selectedImage - 1))}
                    disabled={selectedImage === 0}
                  >
                    ←
                  </button>
                  <button 
                    className="image-btn"
                    onClick={() => setSelectedImage(Math.min(normalizedProperty.images.length - 1, selectedImage + 1))}
                    disabled={selectedImage === normalizedProperty.images.length - 1}
                  >
                    →
                  </button>
                </div>
              </div>
              <div className="image-thumbnails">
                {normalizedProperty.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`${normalizedProperty.title} ${index + 1}`}
                    className={selectedImage === index ? 'active' : ''}
                    onClick={() => setSelectedImage(index)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="detail-sidebar">
            <div className="auction-info">
              <div className="auction-status active glass-panel glass-panel--pill">
                Активный аукцион в процессе
              </div>
              
              {normalizedProperty.is_reserved && normalizedProperty.reserved_until && new Date(normalizedProperty.reserved_until) > new Date() ? (
                <div className="property-reservation-block">
                  <div className="reservation-icon">🔒</div>
                  <div className="reservation-text">
                    <div className="reservation-title">Ставки приостановлены</div>
                    <div className="reservation-subtitle">
                      Резервация до {new Date(normalizedProperty.reserved_until).toLocaleString('ru-RU', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} ({Math.ceil((new Date(normalizedProperty.reserved_until) - new Date()) / (1000 * 60 * 60))} ч)
                    </div>
                  </div>
                </div>
              ) : (
                <CountdownTimer endTime={normalizedProperty.endTime} />
              )}

              <div className="current-bid glass-panel">
                <div className="bid-label">Текущая ставка</div>
                <div className="bid-amount">{formatPrice(currentBid || normalizedProperty.currentBid)}</div>
              </div>

              <form onSubmit={handleBid} className="bid-form">
                {normalizedProperty.is_reserved && normalizedProperty.reserved_until && new Date(normalizedProperty.reserved_until) > new Date() && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#92400e',
                    fontSize: '14px'
                  }}>
                    <FiLock size={16} />
                    <span>Ставки временно недоступны. Объект забронирован.</span>
                  </div>
                )}
                {!reservedBlocksBid && kycBidBlocked && (
                  <div className="auction-verification-pending-banner" role="status">
                    {t('propertyDetailBidVerificationPending')}
                  </div>
                )}
                <div className="bid-input-group">
                  <label>Ваша ставка</label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => {
                      setBidAmount(e.target.value)
                      setBidError('')
                    }}
                    placeholder={`Минимум ${formatPrice(minimumBid || (normalizedProperty.currentBid + (normalizedProperty.currentBid * 0.05)))}`}
                    min={minimumBid || (normalizedProperty.currentBid + (normalizedProperty.currentBid * 0.05))}
                    step="1000"
                    disabled={isSubmittingBid || disableBidFields}
                    style={{
                      opacity: disableBidFields ? 0.5 : 1,
                      cursor: disableBidFields ? 'not-allowed' : 'text',
                    }}
                  />
                  {bidError && (
                    <div className="bid-error" style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                      {bidError}
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="btn btn-bid glass-button"
                  disabled={isSubmittingBid || disableBidFields}
                  style={{
                    opacity: disableBidFields ? 0.5 : 1,
                    cursor: disableBidFields ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmittingBid ? 'Отправка...' : reservedBlocksBid ? 'Объект забронирован' : 'Сделать ставку сейчас'}
                </button>
              </form>

              <div className="bid-warning glass-panel glass-panel--warning">
                Все ставки и продажи финальные и не подлежат отмене.
              </div>

              <button 
                type="button"
                className="btn btn-bid-history glass-button glass-button--secondary"
                onClick={() => setIsBidHistoryOpen(true)}
              >
                История ставок
              </button>

              <div className="bid-status">
                <div className="status-item">
                  <span className="status-label">Статус ставки:</span>
                  <span className="status-value">У ВАС НЕТ СТАВОК</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Статус участника:</span>
                  <span className="status-value link">Проверить сейчас &gt;</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Статус продажи:</span>
                  <span className="status-value">Чистая продажа</span>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-main">
              <div className="detail-header-info">
                <h1 className="detail-title">{normalizedProperty.title}</h1>
                <div className="detail-location">
                  <IoLocationOutline size={18} />
                  <span>{normalizedProperty.location}</span>
                </div>
                {/* Цена объекта */}
                {normalizedProperty.price && (
                  <div className="detail-price">
                    <span className="detail-price-label">Цена:</span>
                    <span className="detail-price-value">
                      {getCurrencySymbol(normalizedProperty.currency)}
                      {normalizedProperty.price.toLocaleString('ru-RU')}
                    </span>
                  </div>
                )}
                {/* Тип недвижимости */}
                {normalizedProperty.property_type && (
                  <div className="detail-property-type">
                    <span className="property-type-badge">
                      {normalizedProperty.property_type === 'apartment' ? 'Квартира' :
                       normalizedProperty.property_type === 'house' ? 'Дом' :
                       normalizedProperty.property_type === 'villa' ? 'Вилла' :
                       normalizedProperty.property_type === 'townhouse' ? 'Дом' :
                       normalizedProperty.property_type === 'commercial' ? 'Коммерческая' :
                       normalizedProperty.property_type}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Основная информация об объекте */}
              <div className="detail-info-sections">
                {/* Основные параметры */}
                <div className="detail-section">
                  <h3 className="detail-section-title">Основные параметры</h3>
                  <div className="detail-specs-grid">
                    {(normalizedProperty.area || normalizedProperty.sqft) && (
                      <div className="spec-item-icon">
                        <BiArea size={20} />
                        <div className="spec-item-content">
                          <span className="spec-label">Площадь</span>
                          <span className="spec-value">{normalizedProperty.area || normalizedProperty.sqft || 0} м²</span>
                        </div>
                      </div>
                    )}
                    {(normalizedProperty.rooms || normalizedProperty.beds) && (
                      <div className="spec-item-icon">
                        <MdBed size={20} />
                        <div className="spec-item-content">
                          <span className="spec-label">Комнат</span>
                          <span className="spec-value">{normalizedProperty.rooms || normalizedProperty.beds || 'Студия'}</span>
                        </div>
                      </div>
                    )}
                    {normalizedProperty.bathrooms && (
                      <div className="spec-item-icon">
                        <MdOutlineBathtub size={20} />
                        <div className="spec-item-content">
                          <span className="spec-label">Ванных</span>
                          <span className="spec-value">{normalizedProperty.bathrooms}</span>
                        </div>
                      </div>
                    )}
                    {(normalizedProperty.floor || normalizedProperty.total_floors) && (
                      <div className="spec-item-icon">
                        <FiLayers size={20} />
                        <div className="spec-item-content">
                          <span className="spec-label">Этаж</span>
                          <span className="spec-value">
                            {normalizedProperty.floor || ''}
                            {normalizedProperty.total_floors && `/${normalizedProperty.total_floors}`}
                          </span>
                        </div>
                      </div>
                    )}
                    {normalizedProperty.year_built && (
                      <div className="spec-item-icon">
                        <FiHome size={20} />
                        <div className="spec-item-content">
                          <span className="spec-label">Год постройки</span>
                          <span className="spec-value">{normalizedProperty.year_built}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Удобства и особенности */}
                {(normalizedProperty.balcony || normalizedProperty.parking || normalizedProperty.elevator || 
                  normalizedProperty.garage || normalizedProperty.pool || normalizedProperty.garden ||
                  normalizedProperty.electricity || normalizedProperty.internet || normalizedProperty.security ||
                  normalizedProperty.furniture) && (
                  <div className="detail-section">
                    <h3 className="detail-section-title">Удобства и особенности</h3>
                    <div className="detail-features-grid">
                      {normalizedProperty.balcony && (
                        <div className="feature-item">
                          <FiCheck size={18} />
                          <span>Балкон</span>
                        </div>
                      )}
                      {normalizedProperty.parking && (
                        <div className="feature-item">
                          <FiCheck size={18} />
                          <span>Парковка</span>
                        </div>
                      )}
                      {normalizedProperty.elevator && (
                        <div className="feature-item">
                          <FiCheck size={18} />
                          <span>Лифт</span>
                        </div>
                      )}
                      {normalizedProperty.garage && (
                        <div className="feature-item">
                          <FiCheck size={18} />
                          <span>Гараж</span>
                        </div>
                      )}
                      {normalizedProperty.pool && (
                        <div className="feature-item">
                          <FiCheck size={18} />
                          <span>Бассейн</span>
                        </div>
                      )}
                      {normalizedProperty.garden && (
                        <div className="feature-item">
                          <FiCheck size={18} />
                          <span>Сад</span>
                        </div>
                      )}
                      {normalizedProperty.electricity && (
                        <div className="feature-item">
                          <FiCheck size={18} />
                          <span>Электричество</span>
                        </div>
                      )}
                      {normalizedProperty.internet && (
                        <div className="feature-item">
                          <FiCheck size={18} />
                          <span>Интернет</span>
                        </div>
                      )}
                      {normalizedProperty.security && (
                        <div className="feature-item">
                          <FiCheck size={18} />
                          <span>Охрана</span>
                        </div>
                      )}
                      {normalizedProperty.furniture && (
                        <div className="feature-item">
                          <FiCheck size={18} />
                          <span>Мебель</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Дополнительная информация */}
                {(normalizedProperty.land_area || normalizedProperty.renovation || normalizedProperty.condition ||
                  normalizedProperty.heating || normalizedProperty.water_supply || normalizedProperty.sewerage ||
                  normalizedProperty.commercial_type || normalizedProperty.business_hours) && (
                  <div className="detail-section">
                    <h3 className="detail-section-title">Дополнительная информация</h3>
                    <div className="detail-additional-info">
                      {normalizedProperty.land_area && (
                        <div className="info-item">
                          <span className="info-label">Площадь участка:</span>
                          <span className="info-value">{normalizedProperty.land_area} м²</span>
                        </div>
                      )}
                      {normalizedProperty.renovation && (
                        <div className="info-item">
                          <span className="info-label">Ремонт:</span>
                          <span className="info-value">{normalizedProperty.renovation}</span>
                        </div>
                      )}
                      {normalizedProperty.condition && (
                        <div className="info-item">
                          <span className="info-label">Состояние:</span>
                          <span className="info-value">{normalizedProperty.condition}</span>
                        </div>
                      )}
                      {normalizedProperty.heating && (
                        <div className="info-item">
                          <span className="info-label">Отопление:</span>
                          <span className="info-value">{normalizedProperty.heating}</span>
                        </div>
                      )}
                      {normalizedProperty.water_supply && (
                        <div className="info-item">
                          <span className="info-label">Водоснабжение:</span>
                          <span className="info-value">{normalizedProperty.water_supply}</span>
                        </div>
                      )}
                      {normalizedProperty.sewerage && (
                        <div className="info-item">
                          <span className="info-label">Канализация:</span>
                          <span className="info-value">{normalizedProperty.sewerage}</span>
                        </div>
                      )}
                      {normalizedProperty.commercial_type && (
                        <div className="info-item">
                          <span className="info-label">Тип коммерческой недвижимости:</span>
                          <span className="info-value">{normalizedProperty.commercial_type}</span>
                        </div>
                      )}
                      {normalizedProperty.business_hours && (
                        <div className="info-item">
                          <span className="info-label">Часы работы:</span>
                          <span className="info-value">{normalizedProperty.business_hours}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Описание */}
                {normalizedProperty.description && (
                  <div className="detail-section">
                    <h3 className="detail-section-title">Описание</h3>
                    <div className="detail-description">
                      <p>{normalizedProperty.description}</p>
                    </div>
                  </div>
                )}

                {/* Карта */}
                {normalizedProperty.coordinates && Array.isArray(normalizedProperty.coordinates) && normalizedProperty.coordinates.length === 2 && (
                  <div className="detail-section">
                    <h3 className="detail-section-title">Местоположение</h3>
                    <div className="detail-map">
                      <div className="detail-map-container">
                        <LocationMap
                          center={normalizedProperty.coordinates}
                          zoom={15}
                          marker={normalizedProperty.coordinates}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="detail-sidebar">
            <div className="auction-info">
              <div className="auction-status active glass-panel glass-panel--pill">
                Активный аукцион в процессе
              </div>
              
              {normalizedProperty.is_reserved && normalizedProperty.reserved_until && new Date(normalizedProperty.reserved_until) > new Date() ? (
                <div className="property-reservation-block">
                  <div className="reservation-icon">🔒</div>
                  <div className="reservation-text">
                    <div className="reservation-title">Ставки приостановлены</div>
                    <div className="reservation-subtitle">
                      Резервация до {new Date(normalizedProperty.reserved_until).toLocaleString('ru-RU', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} ({Math.ceil((new Date(normalizedProperty.reserved_until) - new Date()) / (1000 * 60 * 60))} ч)
                    </div>
                  </div>
                </div>
              ) : (
                <CountdownTimer endTime={normalizedProperty.endTime} />
              )}

              <div className="current-bid glass-panel">
                <div className="bid-label">Текущая ставка</div>
                <div className="bid-amount">{formatPrice(currentBid || normalizedProperty.currentBid)}</div>
              </div>

              <form onSubmit={handleBid} className="bid-form">
                {normalizedProperty.is_reserved && normalizedProperty.reserved_until && new Date(normalizedProperty.reserved_until) > new Date() && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#92400e',
                    fontSize: '14px'
                  }}>
                    <FiLock size={16} />
                    <span>Ставки временно недоступны. Объект забронирован.</span>
                  </div>
                )}
                {!reservedBlocksBid && kycBidBlocked && (
                  <div className="auction-verification-pending-banner" role="status">
                    {t('propertyDetailBidVerificationPending')}
                  </div>
                )}
                <div className="bid-input-group">
                  <label>Ваша ставка</label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => {
                      setBidAmount(e.target.value)
                      setBidError('')
                    }}
                    placeholder={`Минимум ${formatPrice(minimumBid || (normalizedProperty.currentBid + (normalizedProperty.currentBid * 0.05)))}`}
                    min={minimumBid || (normalizedProperty.currentBid + (normalizedProperty.currentBid * 0.05))}
                    step="1000"
                    disabled={isSubmittingBid || disableBidFields}
                    style={{
                      opacity: disableBidFields ? 0.5 : 1,
                      cursor: disableBidFields ? 'not-allowed' : 'text',
                    }}
                  />
                  {bidError && (
                    <div className="bid-error" style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                      {bidError}
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="btn btn-bid glass-button"
                  disabled={isSubmittingBid || disableBidFields}
                  style={{
                    opacity: disableBidFields ? 0.5 : 1,
                    cursor: disableBidFields ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmittingBid ? 'Отправка...' : reservedBlocksBid ? 'Объект забронирован' : 'Сделать ставку сейчас'}
                </button>
              </form>

              <div className="bid-warning glass-panel glass-panel--warning">
                Все ставки и продажи финальные и не подлежат отмене.
              </div>

              <button 
                type="button"
                className="btn btn-bid-history glass-button glass-button--secondary"
                onClick={() => setIsBidHistoryOpen(true)}
              >
                История ставок
              </button>

              <div className="bid-status">
                <div className="status-item">
                  <span className="status-label">Статус ставки:</span>
                  <span className="status-value">У ВАС НЕТ СТАВОК</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Статус участника:</span>
                  <span className="status-value link">Проверить сейчас &gt;</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Статус продажи:</span>
                  <span className="status-value">Чистая продажа</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно истории ставок */}
      <BiddingHistoryModal
        isOpen={isBidHistoryOpen}
        onClose={() => setIsBidHistoryOpen(false)}
        refreshTrigger={bidHistoryRefresh}
        property={{
          id: normalizedProperty.id,
          title: normalizedProperty.title,
          start_date: normalizedProperty.auction_start_date,
          end_date: normalizedProperty.auction_end_date,
          auction_starting_price: normalizedProperty.auction_starting_price,
          price: normalizedProperty.price,
          currentBid: normalizedProperty.currentBid
        }}
      />

      <DepositRequiredModal
        isOpen={isDepositRequiredOpen}
        onClose={() => setIsDepositRequiredOpen(false)}
        onGoToDeposit={() => {
          setIsDepositRequiredOpen(false)
          const from =
            typeof window !== 'undefined' ? window.location.pathname : '/auction'
          navigateToWallet(navigate, from)
        }}
      />
    </div>
  )
}

export default PropertyDetail

