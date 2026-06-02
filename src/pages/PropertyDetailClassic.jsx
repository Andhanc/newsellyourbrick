import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  FiArrowLeft,
  FiShare2,
  FiHeart,
  FiChevronLeft,
  FiChevronRight,
  FiArrowRight,
  FiFileText,
  FiUser,
  FiClock,
  FiArrowUp,
  FiXCircle,
  FiLock,
  FiCheck,
  FiPlay,
} from 'react-icons/fi'
import { FaHeart as FaHeartSolid } from 'react-icons/fa'
import { IoLocationOutline } from 'react-icons/io5'
import {
  isAuthenticated,
  getUserData,
  getStoredNumericUserId,
  fetchNumericDbUserIdForApi,
} from '../services/authService'
import { resolvePropertySourceTable, propertyBidsApiQuery } from '../utils/propertySourceTable'
import PropertyTimer from '../components/PropertyTimer'
import CircularTimer from '../components/CircularTimer'
import BiddingHistoryModal from '../components/BiddingHistoryModal'
import BuyNowModal from '../components/BuyNowModal'
import AuctionReminderModal from '../components/AuctionReminderModal'
import DepositRequiredModal from '../components/DepositRequiredModal'
import LocationMap from '../components/LocationMap'
import { showToast } from '../components/ToastContainer'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import BidOutbidNotification from '../components/BidOutbidNotification'
import Confetti from 'react-confetti'
import './PropertyDetailClassic.css'

import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import { flagEmojiForStoredCountry } from '../utils/countryFlagFromStored'
import FlipCard from '../components/ui/FlipCard'
import { Awards } from '@/components/ui/award'
import TestDriveSection from '../components/TestDriveSection'
import PageBackButton from '../components/PageBackButton'
import TestDrivePromoDrawer from '../components/TestDrivePromoDrawer'
import AuctionBidDrawer from '../components/AuctionBidDrawer'
import AuctionBidCeilingModal from '../components/AuctionBidCeilingModal'
import PropertyDetailAuctionBiddingForm from '../components/PropertyDetailAuctionBiddingForm'
import PropertyDetailYieldPromo from '../components/PropertyDetailYieldPromo'
import { propertyBlocksTestDrivePromo, propertyShowsTestDrive } from '../utils/propertyShowsTestDrive'
import { getAuctionMinBidStep } from '../utils/auctionBidStep'
import { hasAuctionBuyNowListingForm } from '../utils/hasBuyNowOption'
import { navigateToWallet } from '../utils/walletNavigation'
import { getPropertyEntryFrom } from '../utils/propertyNavigation'
import { appendViewerUserIdToPropertyApiUrl, PROPERTY_DETAIL_AUCTION_TAB_BIDS } from '../utils/propertyDetailUrl'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { getResolvedAmenityLabels } from '../utils/tzAmenityLabels'
import { patchCachedAuctionPropertyBid } from '../services/auctionListCache'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import {
  getEffectiveAuctionEndTime,
  hasTestTimerDateString,
  shouldShowCircularAuctionTimer,
} from '../utils/auctionReminderBounds'
import { roleSkipsAuctionKyc } from '../utils/buyerAuctionKyc'
import { isAuctionDepositSufficient } from '../utils/auctionDeposit'
import { confirmPropertyReservationSession } from '../utils/subscriptionCheckout'
import { hasEmailForBuyNowFlow } from '../utils/buyNowEmailGate'
import { usePropertyDisplayCurrency } from '../hooks/usePropertyDisplayCurrency'
import { useHorizontalSwipe } from '../hooks/useHorizontalSwipe'
import useAuctionDesktopBidPanelDock from '../hooks/useAuctionDesktopBidPanelDock'
import {
  formatBidInputDisplayFromStored,
  formatBidMoneyAmount,
  parseMoneyInputValue,
  sanitizeMoneyInputRaw,
} from '../utils/moneyInputFormat'
import PropertyCurrencySelector from '../components/PropertyCurrencySelector'
import '../components/PropertyCurrencySelector.css'
import { ShieldQuestionMark, ShieldAlert, ShieldCheck, Bell, Home, LayoutGrid, Trophy } from 'lucide-react'

// Используем синхронную версию для инициализации, затем обновим при загрузке
let API_BASE_URL = getApiBaseUrlSync()

// Классическая страница объекта.
// Для аукционных объектов дополнительно отображает таймер и историю ставок.
function PropertyDetailClassic({ property: initialProperty, onBack, showDocuments = false, onRequireLogin }) {
  const { t, i18n } = useTranslation()
  const currentLang = (i18n.language || 'ru').split('-')[0]
  const { user, isLoaded: userLoaded } = useUser()
  const buyNowEmailOk = useMemo(() => hasEmailForBuyNowFlow(user, userLoaded), [user, userLoaded])
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const userData = getUserData()
  const [property, setProperty] = useState(initialProperty)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const thumbnailScrollRef = useRef(null)
  const mobileGalleryFilmstripRef = useRef(null)
  const desktopAuctionFilmstripRef = useRef(null)
  const auctionDesktopBidPanelRef = useRef(null)
  const auctionDesktopBidAnchorRef = useRef(null)
  const [isBidHistoryOpen, setIsBidHistoryOpen] = useState(false)
  const [isBuyNowModalOpen, setIsBuyNowModalOpen] = useState(false)
  const [buyNowModalVariant, setBuyNowModalVariant] = useState('buyNow')
  const [auctionReminderOpen, setAuctionReminderOpen] = useState(false)
  const [bidCeilingOpen, setBidCeilingOpen] = useState(false)
  const [userBidCeiling, setUserBidCeiling] = useState(null)
  const [mapCoordinates, setMapCoordinates] = useState(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [isDepositRequiredOpen, setIsDepositRequiredOpen] = useState(false)
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [currentBid, setCurrentBid] = useState(null)
  const [recentBids, setRecentBids] = useState([])
  const [auctionBidsList, setAuctionBidsList] = useState([])
  const [userLastBid, setUserLastBid] = useState(null) // Последняя ставка пользователя
  const [bidOutbidShown, setBidOutbidShown] = useState(false) // Флаг, что уведомление о перебитии уже показано
  const [previousLeaderId, setPreviousLeaderId] = useState(null) // ID предыдущего лидера (кто делал максимальную ставку)
  const wasUserLeaderRef = useRef(false) // Ref для отслеживания, был ли пользователь лидером в предыдущем цикле
  const isInitialLoadRef = useRef(true) // Ref для отслеживания первой загрузки
  const [priceAnimation, setPriceAnimation] = useState(false) // Флаг для анимации изменения цены
  const [prevBid, setPrevBid] = useState(null) // Предыдущая ставка для сравнения
  const [outbidNotification, setOutbidNotification] = useState(null) // Уведомление о перебитой ставке
  const shownNotificationIdsRef = useRef(new Set()) // ID показанных уведомлений
  const [isUserLeader, setIsUserLeader] = useState(false) // Флаг, что пользователь является лидером
  const [currentLeaderId, setCurrentLeaderId] = useState(null) // ID текущего лидера
  const [currentLeader, setCurrentLeader] = useState(null) // Информация о текущем лидере (игрок с наивысшей ставкой)
  const [previousLeader, setPreviousLeader] = useState(null) // Предыдущий лидер для анимации
  const [isLeaderChanging, setIsLeaderChanging] = useState(false) // Флаг анимации смены лидера
  const [originalTestTimer, setOriginalTestTimer] = useState(null) // Исходное значение тестового таймера (дата окончания)
  const [originalTestTimerDuration, setOriginalTestTimerDuration] = useState(null) // Исходная длительность таймера в миллисекундах
  const [timerExpired, setTimerExpired] = useState(false) // Флаг окончания таймера
  /** Запись из auction_winners после окончания аукциона (если есть) */
  const [auctionWinnerFromDb, setAuctionWinnerFromDb] = useState(undefined)
  /** Публичный номер игрока (user_id_number) при показе победителя только из auction_winners */
  const [endedAuctionPlayerPublicId, setEndedAuctionPlayerPublicId] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false) // Слой конфетти (canvas)
  const [showWinnerModal, setShowWinnerModal] = useState(false) // Модалка победы (отдельно от конфетти)
  const [confettiRecycle, setConfettiRecycle] = useState(true) // Пока true — конфетти бесконечно; false — падает и исчезает
  const confettiShownRef = useRef(false) // Ref для отслеживания, было ли показано конфетти
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })
  const [selectedDocument, setSelectedDocument] = useState(null) // Выбранный документ для просмотра
  const [desktopGalleryLightboxIndex, setDesktopGalleryLightboxIndex] = useState(null)
  const auctionDesktopTitleRef = useRef(null)
  const auctionMobileTitleRef = useRef(null)
  const [isAuctionDesktopTitleVisible, setIsAuctionDesktopTitleVisible] = useState(true)
  const [isAuctionMobileTitleVisible, setIsAuctionMobileTitleVisible] = useState(true)
  const [isAuctionMobileHeaderSolid, setIsAuctionMobileHeaderSolid] = useState(false)
  const [isMobileBidBarNearFooter, setIsMobileBidBarNearFooter] = useState(false)
  const [processedDocuments, setProcessedDocuments] = useState([]) // Обработанные документы
  const [timerBidInfo, setTimerBidInfo] = useState(null) // Информация о ставке для отображения в таймере (флаг и номер)
  /** Объект хотя бы раз показывался с круговым таймером — не переключаемся на линейный после его окончания */
  const [hadCircularTimerAuction, setHadCircularTimerAuction] = useState(false)
  const shownLeaderInfoRef = useRef(null) // Ref для отслеживания, какому лидеру уже показывали информацию
  const reservationCheckoutHandledRef = useRef(null)
  const [isTestDrivePromoOpen, setIsTestDrivePromoOpen] = useState(false)
  const testDrivePromoDismissedRef = useRef(false)
  /** После окончания аукциона не даём сбросить timerExpired, если сервер подставил другую дату окончания */
  const auctionFinishedLatchRef = useRef(false)
  /** Последняя известная дата кругового таймера (если API убрал test_timer_end_date) */
  const lastTestTimerEndRef = useRef(null)
  const [auctionMobileTab, setAuctionMobileTab] = useState('about')

  useEffect(() => {
    if (location.state?.auctionTab === PROPERTY_DETAIL_AUCTION_TAB_BIDS) {
      setAuctionMobileTab(PROPERTY_DETAIL_AUCTION_TAB_BIDS)
    }
  }, [location.state?.auctionTab, property?.id])
  const [isBidDrawerOpen, setIsBidDrawerOpen] = useState(false)
  const [mobileMainSpecsExpanded, setMobileMainSpecsExpanded] = useState(false)
  const [propertyViewerCount, setPropertyViewerCount] = useState(null)

  const MOBILE_MAIN_SPECS_INITIAL_COUNT = 6
  const MOBILE_AUCTION_TITLE_INLINE_MAX = 26
  const VISITOR_STORAGE_KEY = 'visitor_global_id'
  const PROPERTY_VIEWER_HEARTBEAT_MS = 30 * 1000

  // Отслеживаем изменения currentBid и запускаем анимацию при росте
  useEffect(() => {
    if (currentBid !== null && prevBid !== null && currentBid > prevBid) {
      console.log('🎬 Запуск анимации цены:', { prevBid, currentBid })
      setPriceAnimation(true)
      const timer = setTimeout(() => {
        setPriceAnimation(false)
      }, 2000) // Анимация длится 2 секунды
      return () => clearTimeout(timer)
    }
  }, [currentBid, prevBid])

  // Проверка авторизации при загрузке компонента
  useEffect(() => {
    // Проверяем, является ли пользователь админом
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true'
    const userRole = localStorage.getItem('userRole')
    const isAdmin = isAdminLoggedIn && userRole === 'admin'
    
    // Если пользователь не авторизован и не админ — показываем модальное окно входа или редирект
    if (!isAdmin && (!isAuthenticated() || !userData || !userData.isLoggedIn)) {
      if (onRequireLogin) {
        onRequireLogin()
      } else {
        requestOpenLoginModal({ wizard: true })
        if (onBack) {
          onBack()
        } else {
          navigate('/')
        }
      }
    }
  }, [navigate, onBack, onRequireLogin])

  // Отслеживаем размер окна для конфетти
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Отслеживаем истечение таймера и показываем конфетти для победителя
  useEffect(() => {
    if (timerExpired && isUserLeader && !confettiShownRef.current) {
      confettiShownRef.current = true
      setShowConfetti(true)
      setShowWinnerModal(true)
      setConfettiRecycle(true)
      // Через 10 с убираем только модалку; конфетти с recycle=false допадает вниз, затем onConfettiComplete
      const timer = setTimeout(() => {
        setShowWinnerModal(false)
        setConfettiRecycle(false)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [timerExpired, isUserLeader])

  // Если колбэк конфетти не сработал — убираем слой через запасной таймаут
  useEffect(() => {
    if (!showConfetti || confettiRecycle) return
    const fallback = setTimeout(() => {
      setShowConfetti(false)
    }, 45000)
    return () => clearTimeout(fallback)
  }, [showConfetti, confettiRecycle])


  // Функция для обработки URL документа
  const processDocumentUrl = async (docUrl) => {
    if (!docUrl) return null
    
    // Data URL (base64) - используем как есть
    if (docUrl.startsWith('data:')) {
      return docUrl
    }
    
    // Полный HTTP/HTTPS URL - используем как есть
    if (docUrl.startsWith('http://') || docUrl.startsWith('https://')) {
      return docUrl
    }
    
    // Получаем актуальный базовый URL
    const currentApiUrl = await getApiBaseUrl()
    const baseUrl = currentApiUrl.replace('/api', '').replace(/\/$/, '')
    
    // Убираем возможные пробелы и лишние символы
    const cleanUrl = docUrl.trim()
    
    // Путь начинается с /uploads/ - добавляем базовый URL
    if (cleanUrl.startsWith('/uploads/')) {
      return `${baseUrl}${cleanUrl}`
    }
    
    // Путь начинается с uploads/ без слеша - добавляем / и базовый URL
    if (cleanUrl.startsWith('uploads/')) {
      return `${baseUrl}/${cleanUrl}`
    }
    
    // Если путь уже содержит полный путь к файлу, используем его
    if (cleanUrl.includes('/') && !cleanUrl.startsWith('/')) {
      // Это может быть путь вида "folder/file.pdf" - добавляем базовый URL и /uploads/
      return `${baseUrl}/uploads/${cleanUrl}`
    }
    
    // Относительный путь - добавляем /uploads/
    return `${baseUrl}/uploads/${cleanUrl}`
  }

  // Функция для определения типа документа
  const getDocumentType = (docUrl, docName) => {
    if (!docUrl) return 'image'
    
    // Проверяем имя файла
    if (docName && (docName.toLowerCase().endsWith('.pdf') || docName.toLowerCase().includes('.pdf'))) {
      return 'pdf'
    }
    
    // Проверяем URL на .pdf
    if (typeof docUrl === 'string') {
      if (docUrl.toLowerCase().endsWith('.pdf') || docUrl.toLowerCase().includes('.pdf')) {
        return 'pdf'
      }
      // Проверяем MIME тип в base64
      if (docUrl.startsWith('data:application/pdf') || docUrl.startsWith('data:application/octet-stream')) {
        return 'pdf'
      }
    }
    
    return 'image'
  }

  // Убрали лишние логи, которые вызывают бесконечный цикл

  // Обрабатываем координаты (как в админке - просто используем как есть)
  let coordinates = [53.9045, 27.5615] // Дефолтные координаты (Минск)
  if (property.coordinates) {
    try {
      if (typeof property.coordinates === 'string') {
        const parsed = JSON.parse(property.coordinates)
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const lat = parseFloat(parsed[0])
          const lng = parseFloat(parsed[1])
          if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            coordinates = [lat, lng]
          }
        }
      } else if (Array.isArray(property.coordinates) && property.coordinates.length >= 2) {
        const lat = parseFloat(property.coordinates[0])
        const lng = parseFloat(property.coordinates[1])
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          coordinates = [lat, lng]
        }
      }
    } catch (e) {
      console.warn('Ошибка парсинга coordinates:', e)
    }
  }

  // Убрали лишние логи

  // Геокодирование адреса, если координат нет
  useEffect(() => {
    const geocodeAddress = async () => {
      // Если координаты уже есть и валидны, используем их
      const hasValidCoordinates = coordinates && 
        coordinates[0] !== 53.9045 && 
        coordinates[1] !== 27.5615 &&
        !isNaN(coordinates[0]) && 
        !isNaN(coordinates[1])
      
      if (hasValidCoordinates) {
        setMapCoordinates(coordinates)
        return
      }

      // Если координат нет, но есть адрес, пытаемся геокодировать
      const address = property.location || property.address
      if (address && !isGeocoding && !mapCoordinates) {
        setIsGeocoding(true)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&accept-language=ru&addressdetails=1`
          )
          if (response.ok) {
            const data = await response.json()
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat)
              const lon = parseFloat(data[0].lon)
              if (!isNaN(lat) && !isNaN(lon)) {
                setMapCoordinates([lat, lon])
                console.log('✅ Адрес геокодирован:', address, '->', [lat, lon])
              } else {
                // Если геокодирование не удалось, используем дефолтные координаты
                setMapCoordinates(coordinates)
              }
            } else {
              // Если результатов нет, используем дефолтные координаты
              setMapCoordinates(coordinates)
            }
          } else {
            setMapCoordinates(coordinates)
          }
        } catch (error) {
          console.warn('Ошибка геокодирования адреса:', error)
          setMapCoordinates(coordinates)
        } finally {
          setIsGeocoding(false)
        }
      } else if (!address) {
        // Если нет ни координат, ни адреса, используем дефолтные координаты
        setMapCoordinates(coordinates)
      }
    }

    geocodeAddress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.location, property.address])

  // Инициализируем API URL при монтировании компонента
  useEffect(() => {
    const initApiUrl = async () => {
      const url = await getApiBaseUrl()
      API_BASE_URL = url
    }
    initApiUrl()
  }, [])

  // Загружаем и обрабатываем документы
  useEffect(() => {
    const loadDocuments = async () => {
      const docs = []
      const isDebtProperty =
        displayProperty.sale_type === 'debt' ||
        property.sale_type === 'debt' ||
        displayProperty.is_debt === 1 ||
        displayProperty.is_debt === true ||
        displayProperty.has_debt === 1 ||
        displayProperty.has_debt === true ||
        property.is_debt === 1 ||
        property.is_debt === true ||
        property.has_debt === 1 ||
        property.has_debt === true;
      
      // Документ о праве собственности
      if (displayProperty.ownership_document || property.ownership_document || property.ownershipDocument) {
        const docUrl = displayProperty.ownership_document || property.ownership_document || property.ownershipDocument
        if (docUrl) {
          const processedUrl = await processDocumentUrl(docUrl)
          console.log('📄 Документ о праве собственности:', { original: docUrl, processed: processedUrl })
          docs.push({
            name: 'Документ о праве собственности',
            url: processedUrl,
            type: getDocumentType(docUrl, 'Документ о праве собственности')
          })
        }
      }
      
      // Справка об отсутствии обременений (не показываем для объектов с долгами)
      if (
        !isDebtProperty &&
        (displayProperty.no_debts_document || property.no_debts_document || property.noDebtsDocument)
      ) {
        const docUrl = displayProperty.no_debts_document || property.no_debts_document || property.noDebtsDocument
        if (docUrl) {
          const processedUrl = await processDocumentUrl(docUrl)
          console.log('📄 Справка об отсутствии обременений:', { original: docUrl, processed: processedUrl })
          docs.push({
            name: 'Справка об отсутствии обременений',
            url: processedUrl,
            type: getDocumentType(docUrl, 'Справка об отсутствии обременений')
          })
        }
      }
      
      // Дополнительные документы
      let additionalDocs = []
      const rawAdditionalDocs = displayProperty.additional_documents || property.additional_documents || property.additionalDocuments
      if (rawAdditionalDocs) {
        if (typeof rawAdditionalDocs === 'string') {
          try {
            additionalDocs = JSON.parse(rawAdditionalDocs)
          } catch (e) {
            console.warn('Ошибка парсинга additional_documents:', e)
          }
        } else if (Array.isArray(rawAdditionalDocs)) {
          additionalDocs = rawAdditionalDocs
        }
        
        for (const doc of additionalDocs) {
          const docName = typeof doc === 'string' ? doc : (doc.name || `Документ ${additionalDocs.indexOf(doc) + 1}`)
          const docUrl = typeof doc === 'object' && doc.url ? doc.url : (typeof doc === 'string' ? doc : null)
          if (docUrl) {
            const processedUrl = await processDocumentUrl(docUrl)
            docs.push({
              name: docName,
              url: processedUrl,
              type: typeof doc === 'object' && doc.type ? doc.type : getDocumentType(docUrl, docName)
            })
          }
        }
      }
      
      setProcessedDocuments(docs)
    }
    
    loadDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBack, showDocuments, property.ownership_document, property.no_debts_document, property.additional_documents])

  // Используем геокодированные координаты или исходные
  const finalCoordinates = mapCoordinates || coordinates

  // Длительность кругового таймера (мс) — нужна для shouldShowCircularAuctionTimer / getEffectiveAuctionEndTime
  const normalizedTestTimerDuration = (() => {
    const v = property.test_timer_duration
    if (v == null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  })()

  const auctionContextForTimers = {
    ...property,
    test_timer_end_date: property.test_timer_end_date || null,
    test_timer_duration: normalizedTestTimerDuration,
    auction_end_date: property.auction_end_date || null,
    auction_start_date: property.auction_start_date || null,
    buy_now_winner_user_id: property.buy_now_winner_user_id ?? null,
    buy_now_completed_at: property.buy_now_completed_at ?? null,
  }

  // Нормализуем данные под формат детальной страницы (используем данные как есть, как в админке)
  const displayProperty = {
    ...property,
    name: property.title || property.name,
    sqft: property.area || property.sqft,
    area: property.area || property.sqft,
    living_area: property.living_area || property.livingArea || null,
    beds: property.rooms ?? property.beds,
    rooms: property.rooms ?? property.beds,
    // Для домов/вилл используем bedrooms, для квартир/апартаментов - rooms
    // Важно: проверяем на null/undefined, а не на falsy, чтобы 0 не превращался в null
    bedrooms: (property.property_type === 'house' || property.property_type === 'villa') 
      ? (property.bedrooms !== undefined && property.bedrooms !== null ? property.bedrooms : null)
      : (property.bedrooms !== undefined && property.bedrooms !== null ? property.bedrooms : (property.rooms !== undefined && property.rooms !== null ? property.rooms : null)),
    bathrooms: property.bathrooms || property.baths || 0,
    coordinates: coordinates,
    // Убеждаемся, что все поля передаются (сохраняем null если есть, но не перезаписываем 0)
    floor: property.floor !== undefined && property.floor !== null ? property.floor : null,
    // Для домов/вилл используем floors как total_floors, для квартир/апартаментов - total_floors
    total_floors: (property.property_type === 'house' || property.property_type === 'villa')
      ? (property.floors !== undefined && property.floors !== null ? property.floors : (property.total_floors !== undefined && property.total_floors !== null ? property.total_floors : null))
      : (property.total_floors !== undefined && property.total_floors !== null ? property.total_floors : null),
    year_built: property.year_built !== undefined && property.year_built !== null ? property.year_built : null,
    property_type: property.property_type || property.propertyType,
    building_type: property.building_type || property.buildingType,
    land_area: property.land_area,
    renovation: property.renovation,
    condition: property.condition,
    heating: property.heating,
    water_supply: property.water_supply,
    sewerage: property.sewerage,
    commercial_type: property.commercial_type,
    business_hours: property.business_hours,
    additional_amenities: property.additional_amenities || property.additionalAmenities || null,
    // Удобства - нормализуем булевы значения
    balcony: property.balcony === true || property.balcony === 1 || property.balcony === '1',
    parking: property.parking === true || property.parking === 1 || property.parking === '1',
    elevator: property.elevator === true || property.elevator === 1 || property.elevator === '1',
    garage: property.garage === true || property.garage === 1 || property.garage === '1',
    pool: property.pool === true || property.pool === 1 || property.pool === '1',
    garden: property.garden === true || property.garden === 1 || property.garden === '1',
    electricity: property.electricity === true || property.electricity === 1 || property.electricity === '1',
    internet: property.internet === true || property.internet === 1 || property.internet === '1',
    security: property.security === true || property.security === 1 || property.security === '1',
    furniture: property.furniture === true || property.furniture === 1 || property.furniture === '1',
    // Feature поля (feature1 - feature26)
    feature1: property.feature1 === true || property.feature1 === 1 || property.feature1 === '1',
    feature2: property.feature2 === true || property.feature2 === 1 || property.feature2 === '1',
    feature3: property.feature3 === true || property.feature3 === 1 || property.feature3 === '1',
    feature4: property.feature4 === true || property.feature4 === 1 || property.feature4 === '1',
    feature5: property.feature5 === true || property.feature5 === 1 || property.feature5 === '1',
    feature6: property.feature6 === true || property.feature6 === 1 || property.feature6 === '1',
    feature7: property.feature7 === true || property.feature7 === 1 || property.feature7 === '1',
    feature8: property.feature8 === true || property.feature8 === 1 || property.feature8 === '1',
    feature9: property.feature9 === true || property.feature9 === 1 || property.feature9 === '1',
    feature10: property.feature10 === true || property.feature10 === 1 || property.feature10 === '1',
    feature11: property.feature11 === true || property.feature11 === 1 || property.feature11 === '1',
    feature12: property.feature12 === true || property.feature12 === 1 || property.feature12 === '1',
    feature13: property.feature13 === true || property.feature13 === 1 || property.feature13 === '1',
    feature14: property.feature14 === true || property.feature14 === 1 || property.feature14 === '1',
    feature15: property.feature15 === true || property.feature15 === 1 || property.feature15 === '1',
    feature16: property.feature16 === true || property.feature16 === 1 || property.feature16 === '1',
    feature17: property.feature17 === true || property.feature17 === 1 || property.feature17 === '1',
    feature18: property.feature18 === true || property.feature18 === 1 || property.feature18 === '1',
    feature19: property.feature19 === true || property.feature19 === 1 || property.feature19 === '1',
    feature20: property.feature20 === true || property.feature20 === 1 || property.feature20 === '1',
    feature21: property.feature21 === true || property.feature21 === 1 || property.feature21 === '1',
    feature22: property.feature22 === true || property.feature22 === 1 || property.feature22 === '1',
    feature23: property.feature23 === true || property.feature23 === 1 || property.feature23 === '1',
    feature24: property.feature24 === true || property.feature24 === 1 || property.feature24 === '1',
    feature25: property.feature25 === true || property.feature25 === 1 || property.feature25 === '1',
    feature26: property.feature26 === true || property.feature26 === 1 || property.feature26 === '1',
    // Цена - используем обычную стоимость объекта (минимальная цена продажи), а не начальную ставку
    price: property.price,
    currentBid: property.currentBid,
    auction_starting_price: property.auction_starting_price || property.auctionStartingPrice,
    currency: property.currency || 'USD',
    // Документы
    ownership_document: property.ownership_document || property.ownershipDocument,
    no_debts_document: property.no_debts_document || property.noDebtsDocument,
    additional_documents: property.additional_documents || property.additionalDocuments,
    // Тест-драйв - отключаем для объектов с долгами
    test_drive:
      !(
        property.sale_type === 'debt' ||
        property.is_debt === 1 ||
        property.is_debt === true ||
        property.has_debt === 1 ||
        property.has_debt === true
      ) && property.test_drive,
    testDrive:
      !(
        property.sale_type === 'debt' ||
        property.is_debt === 1 ||
        property.is_debt === true ||
        property.has_debt === 1 ||
        property.has_debt === true
      ) &&
      (property.testDrive !== undefined
        ? property.testDrive
        : (property.test_drive !== undefined ? (property.test_drive === 1 || property.test_drive === true) : false)),
    // Тестовый таймер
    test_timer_end_date: property.test_timer_end_date || null,
    test_timer_duration: normalizedTestTimerDuration,
    endTime: getEffectiveAuctionEndTime(auctionContextForTimers),
    // Резервация
    is_reserved: property.is_reserved === true || property.is_reserved === 1 || property.is_reserved === 'true' || false,
    reserved_until: property.reserved_until || null,
    reserved_by: property.reserved_by || null,
    reservation_time_remaining: property.reservation_time_remaining || null,
    debt_severity: property.debt_severity || null,
  }

  const priceLocale = currentLang === 'ru' ? 'ru-RU' : 'en-US'
  const propertySourceTable = useMemo(
    () => resolvePropertySourceTable(displayProperty),
    [
      displayProperty.source_table,
      displayProperty.property_type,
      displayProperty.id,
    ],
  )

  const currencyView = usePropertyDisplayCurrency(displayProperty.currency)
  const fmtPrice = (amount) => currencyView.formatMoney(amount, priceLocale)

  /** Только просмотр — с учётом выбранной валюты конвертера */
  const fmtBidPrice = useCallback(
    (amount) => {
      const n = Number(amount)
      if (!Number.isFinite(n)) return '—'
      const converted = currencyView.isConverted ? currencyView.convert(n) : n
      if (!Number.isFinite(converted)) return '—'
      return formatBidMoneyAmount(converted, { symbol: currencyView.symbol })
    },
    [currencyView],
  )

  /** Ставки и покупка — всегда в валюте объявления */
  const fmtListingBidPrice = useCallback(
    (amount) => {
      const n = Number(amount)
      if (!Number.isFinite(n)) return '—'
      return formatBidMoneyAmount(n, { symbol: currencyView.baseSymbol })
    },
    [currencyView.baseSymbol],
  )

  const paymentActionsLocked = currencyView.isConverted

  const notifyListingCurrencyOnly = useCallback(
    (action) => {
      const key =
        action === 'buy'
          ? 'propertyDetailListingCurrencyActionBuy'
          : 'propertyDetailListingCurrencyActionBid'
      showToast(t(key, { currency: currencyView.baseCurrency }), 'warning', 5500)
    },
    [t, currencyView.baseCurrency],
  )

  const formatQuickBidLabel = useCallback(
    (amountInListingCurrency) => {
      const n = Number(amountInListingCurrency)
      if (!Number.isFinite(n)) return `+${amountInListingCurrency}`
      if (currencyView.isConverted) {
        const converted = currencyView.convert(n)
        if (Number.isFinite(converted)) {
          return `+${formatBidMoneyAmount(Math.round(converted), { symbol: currencyView.symbol })}`
        }
      }
      const formatted = n.toLocaleString('en-US', {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      })
      return `+${currencyView.baseSymbol}${formatted}`
    },
    [currencyView],
  )

  const bidAmountInputValue = useMemo(() => {
    if (!bidAmount) return ''
    if (!currencyView.isConverted) {
      return formatBidInputDisplayFromStored(bidAmount)
    }
    const base = parseMoneyInputValue(bidAmount)
    if (!Number.isFinite(base)) return formatBidInputDisplayFromStored(bidAmount)
    const shown = currencyView.convert(base)
    if (!Number.isFinite(shown)) return ''
    const rounded = Math.round(shown * 100) / 100
    return formatBidInputDisplayFromStored(
      Number.isInteger(rounded) ? String(rounded) : String(rounded),
    )
  }, [bidAmount, currencyView.isConverted, currencyView.convert, currencyView.rate])

  const isReservedActive =
    displayProperty.is_reserved &&
    displayProperty.reserved_until &&
    new Date(displayProperty.reserved_until) > new Date()

  const isDebtProperty =
    displayProperty.sale_type === 'debt' ||
    displayProperty.is_debt === 1 ||
    displayProperty.is_debt === true ||
    displayProperty.has_debt === 1 ||
    displayProperty.has_debt === true;

  const showsTestDriveSection =
    propertyShowsTestDrive(displayProperty) &&
    (property.test_drive === 1 ||
      property.test_drive === true ||
      property.test_drive === '1')

  useEffect(() => {
    testDrivePromoDismissedRef.current = false
    setIsTestDrivePromoOpen(false)
  }, [displayProperty.id])

  useEffect(() => {
    setMobileMainSpecsExpanded(false)
  }, [displayProperty.id])

  const dismissTestDrivePromo = () => {
    testDrivePromoDismissedRef.current = true
    setIsTestDrivePromoOpen(false)
  }

  const scrollToTestDriveSection = () => {
    testDrivePromoDismissedRef.current = true
    window.setTimeout(() => {
      const section = document.getElementById('property-test-drive-section')
      if (!section) return
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      section.classList.add('property-detail-test-drive--highlight')
      window.setTimeout(() => {
        section.classList.remove('property-detail-test-drive--highlight')
      }, 2400)
    }, 400)
  }
  
  // Логируем данные о резервации для отладки
  console.log('🔍 PropertyDetailClassic - Данные о резервации:', {
    property_is_reserved: property.is_reserved,
    property_reserved_until: property.reserved_until,
    displayProperty_is_reserved: displayProperty.is_reserved,
    displayProperty_reserved_until: displayProperty.reserved_until,
    shouldShowBanner: isReservedActive
  });

  // Убрали лишние логи, которые вызывают бесконечный цикл

  const images =
    displayProperty.images && displayProperty.images.length > 0
      ? displayProperty.images
      : [
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
        ]

  // Получаем видео из property
  let videos = []
  if (displayProperty.videos && Array.isArray(displayProperty.videos) && displayProperty.videos.length > 0) {
    videos = displayProperty.videos
  } else if (displayProperty.videos && typeof displayProperty.videos === 'string') {
    try {
      const parsed = JSON.parse(displayProperty.videos)
      if (Array.isArray(parsed)) {
        videos = parsed
      }
    } catch (e) {
      console.warn('Ошибка парсинга videos:', e)
    }
  }

  // Объединяем фото и видео в один массив медиа (БЕЗ дублирования фотографий)
  const allMedia = [
    ...images.map((img, idx) => ({ type: 'photo', url: img, index: idx })),
    ...videos.map((video, idx) => ({ 
      type: 'video', 
      url: typeof video === 'string' ? video : (video.url || video.embedUrl || video.videoId),
      videoId: typeof video === 'object' ? video.videoId : null,
      videoType: typeof video === 'object' ? video.type : null,
      thumbnail: typeof video === 'object' ? video.thumbnail : null,
      index: images.length + idx 
    }))
  ]

  // Используем все медиа без дублирования
  const galleryMedia = allMedia

  const currentMedia = galleryMedia[currentImageIndex] || galleryMedia[0]
  
  // Функции для работы с YouTube и Google Drive
  const getYouTubeEmbedUrl = (videoId) => {
    return `https://www.youtube.com/embed/${videoId}`
  }
  
  const getGoogleDriveEmbedUrl = (fileId) => {
    return `https://drive.google.com/file/d/${fileId}/preview`
  }

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : galleryMedia.length - 1))
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev < galleryMedia.length - 1 ? prev + 1 : 0))
  }

  const handleThumbnailClick = (index) => {
    setCurrentImageIndex(index)
    if (thumbnailScrollRef.current) {
      const thumbnail = thumbnailScrollRef.current.children[index]
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
    if (mobileGalleryFilmstripRef.current) {
      const stripThumb = mobileGalleryFilmstripRef.current.children[index]
      if (stripThumb) {
        stripThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
    if (desktopAuctionFilmstripRef.current) {
      const stripThumb = desktopAuctionFilmstripRef.current.children[index]
      if (stripThumb) {
        stripThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }

  const openDesktopGalleryLightbox = (index) => {
    setDesktopGalleryLightboxIndex(index)
    setCurrentImageIndex(index)
  }

  const closeDesktopGalleryLightbox = useCallback(() => {
    setDesktopGalleryLightboxIndex(null)
  }, [])

  const stepDesktopGalleryLightbox = useCallback(
    (direction) => {
      setDesktopGalleryLightboxIndex((prev) => {
        if (prev == null || galleryMedia.length <= 1) return prev
        const next =
          direction === 'next'
            ? prev < galleryMedia.length - 1
              ? prev + 1
              : 0
            : prev > 0
              ? prev - 1
              : galleryMedia.length - 1
        setCurrentImageIndex(next)
        return next
      })
    },
    [galleryMedia.length],
  )

  useEffect(() => {
    if (desktopGalleryLightboxIndex == null) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDesktopGalleryLightbox()
      if (event.key === 'ArrowRight') stepDesktopGalleryLightbox('next')
      if (event.key === 'ArrowLeft') stepDesktopGalleryLightbox('prev')
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [desktopGalleryLightboxIndex, closeDesktopGalleryLightbox, stepDesktopGalleryLightbox])

  useEffect(() => {
    if (auctionMobileTab !== 'gallery' || !mobileGalleryFilmstripRef.current) return
    const stripThumb = mobileGalleryFilmstripRef.current.children[currentImageIndex]
    stripThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentImageIndex, auctionMobileTab])

  const gallerySwipeEnabled =
    galleryMedia.length > 1 && !isReservedActive

  const gallerySwipeHandlers = useHorizontalSwipe({
    enabled: gallerySwipeEnabled,
    onSwipeLeft: handleNextImage,
    onSwipeRight: handlePreviousImage,
  })

  useEffect(() => {
    if (thumbnailScrollRef.current) {
      const thumbnail = thumbnailScrollRef.current.children[currentImageIndex]
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [currentImageIndex])

  const propertyInfo = displayProperty.title || displayProperty.name

  const [auctionUserDeposit, setAuctionUserDeposit] = useState(0)
  const [auctionKycVerified, setAuctionKycVerified] = useState(null)
  const { isFavorite: isFavoriteInStore, toggleFavorite } = usePropertyFavorites()

  // Признак аукционного объекта (включая объекты с долгами — их UX тоже аукционный).
  // Тестовый круговой таймер задаётся без is_auction — всё равно показываем аукционный блок.
  const isAuctionProperty =
    displayProperty.isAuction === true ||
    displayProperty.is_auction === true ||
    displayProperty.is_auction === 1 ||
    displayProperty.is_auction === '1' ||
    displayProperty.is_auction === 'true' ||
    hasTestTimerDateString(displayProperty) ||
    hadCircularTimerAuction

  useEffect(() => {
    const titleEl = auctionDesktopTitleRef.current
    if (!titleEl || !isAuctionProperty) return undefined

    const mq = window.matchMedia('(min-width: 961px)')

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (mq.matches) setIsAuctionDesktopTitleVisible(entry.isIntersecting)
      },
      { rootMargin: '-58px 0px 0px 0px', threshold: 0 },
    )

    observer.observe(titleEl)
    mq.addEventListener('change', () => {
      if (mq.matches) setIsAuctionDesktopTitleVisible(true)
    })

    return () => {
      observer.disconnect()
    }
  }, [isAuctionProperty, propertyInfo])

  useEffect(() => {
    if (!isAuctionProperty) return undefined

    const mq = window.matchMedia('(max-width: 960px)')
    const scrollRoot = document.querySelector('.app-layout')
    const mobileHeaderZone = 72
    let attachRaf = 0
    let disposed = false

    const updateMobileHeader = () => {
      if (!mq.matches) {
        setIsAuctionMobileTitleVisible(true)
        setIsAuctionMobileHeaderSolid(false)
        return
      }

      const scrollTop = scrollRoot?.scrollTop ?? window.scrollY
      setIsAuctionMobileHeaderSolid(scrollTop > 24)

      const titleEl = auctionMobileTitleRef.current
      if (!titleEl) return

      const titleBottom = titleEl.getBoundingClientRect().bottom
      setIsAuctionMobileTitleVisible(titleBottom > mobileHeaderZone)
    }

    const attach = () => {
      if (disposed) return

      if (!auctionMobileTitleRef.current) {
        attachRaf = requestAnimationFrame(attach)
        return
      }

      updateMobileHeader()
    }

    attach()
    scrollRoot?.addEventListener('scroll', updateMobileHeader, { passive: true })
    window.addEventListener('resize', updateMobileHeader, { passive: true })
    mq.addEventListener('change', updateMobileHeader)

    return () => {
      disposed = true
      if (attachRaf) cancelAnimationFrame(attachRaf)
      scrollRoot?.removeEventListener('scroll', updateMobileHeader)
      window.removeEventListener('resize', updateMobileHeader)
      mq.removeEventListener('change', updateMobileHeader)
    }
  }, [isAuctionProperty, propertyInfo])

  useEffect(() => {
    if (!isAuctionProperty) return undefined

    const mq = window.matchMedia('(max-width: 960px)')
    const scrollRoot = document.querySelector('.app-layout')
    const bottomBarHeight = 88

    const updateBidBarFooterProximity = () => {
      if (!mq.matches) {
        setIsMobileBidBarNearFooter(false)
        return
      }

      const footer = document.getElementById('site-footer')
      if (!footer) {
        setIsMobileBidBarNearFooter(false)
        return
      }

      const footerTop = footer.getBoundingClientRect().top
      const hideLine = window.innerHeight - bottomBarHeight
      setIsMobileBidBarNearFooter(footerTop <= hideLine)
    }

    updateBidBarFooterProximity()
    scrollRoot?.addEventListener('scroll', updateBidBarFooterProximity, { passive: true })
    window.addEventListener('resize', updateBidBarFooterProximity, { passive: true })
    mq.addEventListener('change', updateBidBarFooterProximity)

    const footer = document.getElementById('site-footer')
    let ro = null
    if (footer) {
      ro = new ResizeObserver(updateBidBarFooterProximity)
      ro.observe(footer)
    }

    return () => {
      scrollRoot?.removeEventListener('scroll', updateBidBarFooterProximity)
      window.removeEventListener('resize', updateBidBarFooterProximity)
      mq.removeEventListener('change', updateBidBarFooterProximity)
      ro?.disconnect()
      setIsMobileBidBarNearFooter(false)
    }
  }, [isAuctionProperty])

  const auctionEndTime = getEffectiveAuctionEndTime(displayProperty)
  const testDrivePromoBlocked = propertyBlocksTestDrivePromo(displayProperty, { timerExpired })
  const shouldShowTestDrivePromo = showsTestDriveSection && !testDrivePromoBlocked

  useEffect(() => {
    if (!shouldShowTestDrivePromo) {
      setIsTestDrivePromoOpen(false)
      return undefined
    }
    if (testDrivePromoDismissedRef.current) {
      setIsTestDrivePromoOpen(false)
      return undefined
    }
    const timer = window.setTimeout(() => {
      if (!testDrivePromoDismissedRef.current && shouldShowTestDrivePromo) {
        setIsTestDrivePromoOpen(true)
      }
    }, 750)
    return () => window.clearTimeout(timer)
  }, [displayProperty.id, shouldShowTestDrivePromo])

  const favoriteProperty = useMemo(() => {
    const sourceTable =
      displayProperty.source_table ||
      property.source_table ||
      displayProperty.sourceTable ||
      property.sourceTable

    return {
      ...displayProperty,
      id: displayProperty.id,
      source_table: sourceTable,
    }
  }, [displayProperty, property])
  const isFavorite = isFavoriteInStore(
    favoriteProperty,
    hasDbBackedProperty(favoriteProperty) ? undefined : 'property'
  )

  useEffect(() => {
    if (!isAuctionProperty || !displayProperty?.id || currentBid == null) return
    patchCachedAuctionPropertyBid(displayProperty.id, currentBid, propertySourceTable)
    window.dispatchEvent(
      new CustomEvent('syb-auction-current-bid-updated', {
        detail: {
          propertyId: displayProperty.id,
          currentBid,
          property_table: propertySourceTable,
        },
      })
    )
  }, [isAuctionProperty, displayProperty?.id, currentBid])

  useEffect(() => {
    setHadCircularTimerAuction(false)
    auctionFinishedLatchRef.current = false
    lastTestTimerEndRef.current = null
  }, [displayProperty.id])

  useEffect(() => {
    if (shouldShowCircularAuctionTimer(displayProperty)) {
      setHadCircularTimerAuction(true)
      lastTestTimerEndRef.current = displayProperty.test_timer_end_date
    }
  }, [displayProperty.test_timer_end_date, displayProperty.auction_end_date])

  useEffect(() => {
    if (!isAuctionProperty || !displayProperty?.id) {
      setAuctionUserDeposit(0)
      setAuctionKycVerified(null)
      return
    }

    const refreshAuctionWalletAndKyc = async () => {
      const uid = getStoredNumericUserId()
      if (!uid) {
        setAuctionUserDeposit(0)
        setAuctionKycVerified(null)
        return
      }
      try {
        let base = API_BASE_URL
        if (!base || base.includes('localhost')) {
          base = await getApiBaseUrl()
          API_BASE_URL = base
        }
        const [depRes, verRes] = await Promise.all([
          fetch(`${base}/users/${uid}/deposit`),
          fetch(`${base}/users/${uid}/verification-status`),
        ])
        if (depRes.ok) {
          const dj = await depRes.json()
          setAuctionUserDeposit(dj.success ? (dj.data?.depositAmount || 0) : 0)
        } else {
          setAuctionUserDeposit(0)
        }
        if (verRes.ok) {
          const vj = await verRes.json()
          setAuctionKycVerified(
            vj.success && vj.data != null ? Boolean(vj.data.isVerified) : null
          )
        } else {
          setAuctionKycVerified(null)
        }
      } catch {
        setAuctionUserDeposit(0)
        setAuctionKycVerified(null)
      }
    }

    refreshAuctionWalletAndKyc()
    window.addEventListener('focus', refreshAuctionWalletAndKyc)
    window.addEventListener('verification-status-update', refreshAuctionWalletAndKyc)
    return () => {
      window.removeEventListener('focus', refreshAuctionWalletAndKyc)
      window.removeEventListener('verification-status-update', refreshAuctionWalletAndKyc)
    }
  }, [isAuctionProperty, displayProperty?.id, userLoaded, user?.id])

  const userRoleForAuction = userData?.role || 'buyer'
  const auctionKycRequired =
    isAuctionProperty && !roleSkipsAuctionKyc(userRoleForAuction)
  const kycBidBlocked =
    auctionKycRequired && isAuctionDepositSufficient(auctionUserDeposit) && auctionKycVerified === false
  const disableAuctionBidFields = isReservedActive || kycBidBlocked
  const aboutDepositContentLocked =
    isAuctionProperty &&
    Number(auctionUserDeposit) <= 0 &&
    !roleSkipsAuctionKyc(userRoleForAuction)

  const wrapDepositGatedBlock = (block, { desktopCard = false } = {}) => {
    if (!block) return null
    if (!aboutDepositContentLocked) return block

    const openDepositGateModal = () => setIsDepositRequiredOpen(true)

    return (
      <div
        className={`property-detail-mobile-deposit-gate property-detail-mobile-deposit-gate--locked${
          desktopCard ? ' property-detail-deposit-gate--desktop-card' : ''
        }`}
      >
        <div className="property-detail-mobile-deposit-gate__content" aria-hidden="true">
          {block}
        </div>
        <button
          type="button"
          className="property-detail-mobile-deposit-gate__overlay"
          onClick={openDepositGateModal}
          aria-label={t('propertyDetailDepositGateAria')}
        >
          <span className="property-detail-mobile-deposit-gate__prompt">
            <FiLock size={18} strokeWidth={2.25} aria-hidden />
            <span className="property-detail-mobile-deposit-gate__prompt-text">
              {t('propertyDetailDepositGateTitle')}
            </span>
            <FiArrowRight size={18} aria-hidden />
          </span>
        </button>
      </div>
    )
  }

  /** @deprecated use wrapDepositGatedBlock */
  const wrapMobileDepositGatedBlock = (block) => wrapDepositGatedBlock(block)

  // После оплаты резерва в Stripe — подтвердить сессию (если webhook ещё не обработал)
  useEffect(() => {
    const checkout = searchParams.get('reservation_checkout')
    const sessionId = searchParams.get('session_id')
    if (checkout !== 'success' || !sessionId || !sessionId.startsWith('cs_')) return
    if (reservationCheckoutHandledRef.current === sessionId) return

    let cancelled = false

    const run = async () => {
      if (!userLoaded) {
        return
      }

      let uid = localStorage.getItem('userId')
      if (!uid || !/^\d+$/.test(uid)) {
        const legacy = getUserData()
        if (legacy?.id != null && /^\d+$/.test(String(legacy.id))) {
          uid = String(legacy.id)
          localStorage.setItem('userId', uid)
        }
      }
      if (!uid || !/^\d+$/.test(uid)) {
        if (user?.primaryEmailAddress?.emailAddress) {
          try {
            if (!API_BASE_URL || API_BASE_URL.includes('localhost')) {
              API_BASE_URL = await getApiBaseUrl()
            }
            const r = await fetch(
              `${API_BASE_URL}/users/email/${encodeURIComponent(user.primaryEmailAddress.emailAddress)}`
            )
            if (r.ok) {
              const j = await r.json()
              if (j.success && j.data?.id) {
                uid = String(j.data.id)
                localStorage.setItem('userId', uid)
              }
            }
          } catch (e) {
            console.warn('PropertyDetailClassic: reservation confirm user id', e)
          }
        }
      }
      if (!uid || !/^\d+$/.test(uid)) {
        requestOpenLoginModal({ wizard: true })
        const next = new URLSearchParams(searchParams)
        next.delete('reservation_checkout')
        next.delete('session_id')
        setSearchParams(next, { replace: true })
        return
      }

      reservationCheckoutHandledRef.current = sessionId
      try {
        const result = await confirmPropertyReservationSession(sessionId, uid)
        if (cancelled) return
        if (result.ok) {
          if (result.data?.already) {
            showNotification('Резерв уже был учтён ранее.')
          } else {
            showNotification(
              'Оплата резерва получена. Объект зарезервирован, менеджер свяжется с вами.'
            )
          }
          try {
            let base = API_BASE_URL
            if (!base || base.includes('localhost')) {
              base = await getApiBaseUrl()
            }
            const fromPath =
              typeof window !== 'undefined'
                ? window.location.pathname.match(/\/property\/(\d+)/)
                : null
            const pid = displayProperty?.id || (fromPath ? parseInt(fromPath[1], 10) : null)
            if (pid) {
              const propResponse = await fetch(
                appendViewerUserIdToPropertyApiUrl(`${base}/properties/${pid}?lang=${currentLang}`)
              )
              if (propResponse.ok) {
                const propData = await propResponse.json()
                if (propData.success && propData.data) {
                  setProperty((prev) => ({ ...prev, ...propData.data }))
                }
              }
            }
          } catch (refetchErr) {
            console.warn('PropertyDetailClassic: refetch property after reservation', refetchErr)
          }
        } else {
          showNotification(result.error || 'Не удалось подтвердить резерв', 'error')
          reservationCheckoutHandledRef.current = null
        }
      } catch (e) {
        if (!cancelled) {
          showNotification(e?.message || 'Ошибка подтверждения', 'error')
          reservationCheckoutHandledRef.current = null
        }
      } finally {
        if (!cancelled) {
          const next = new URLSearchParams(searchParams)
          next.delete('reservation_checkout')
          next.delete('session_id')
          setSearchParams(next, { replace: true })
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, userLoaded, user?.primaryEmailAddress?.emailAddress])

  // Сохраняем исходное значение тестового таймера и его длительность при первой загрузке
  useEffect(() => {
    if (displayProperty.test_timer_end_date) {
      if (!originalTestTimer) {
        setOriginalTestTimer(displayProperty.test_timer_end_date);
      }
      // Используем сохраненную длительность из базы данных, если она есть
      if (displayProperty.test_timer_duration && !originalTestTimerDuration) {
        setOriginalTestTimerDuration(displayProperty.test_timer_duration);
        console.log('💾 Сохранена исходная длительность таймера из БД:', displayProperty.test_timer_duration, 'мс (', Math.floor(displayProperty.test_timer_duration / 60000), 'мин', Math.floor((displayProperty.test_timer_duration % 60000) / 1000), 'сек)');
      } else if (!displayProperty.test_timer_duration && !originalTestTimerDuration) {
        // Fallback: вычисляем длительность как разницу между датой окончания и текущим временем
        const endDate = new Date(displayProperty.test_timer_end_date);
        const now = new Date();
        const duration = Math.max(0, endDate.getTime() - now.getTime());
        
        if (duration > 0) {
          setOriginalTestTimerDuration(duration);
          console.log('💾 Вычислена исходная длительность таймера:', duration, 'мс (', Math.floor(duration / 60000), 'мин', Math.floor((duration % 60000) / 1000), 'сек)');
        } else {
          // Если таймер истек и длительность не сохранена, используем значение по умолчанию
          const defaultDuration = 10 * 60 * 1000; // 10 минут по умолчанию
          setOriginalTestTimerDuration(defaultDuration);
          console.log('⚠️ Таймер истек, используем длительность по умолчанию:', defaultDuration, 'мс');
        }
      }
    }
  }, [displayProperty.test_timer_end_date, displayProperty.test_timer_duration]);

  // SSE: новая ставка по объекту — сервер пушит событие, клиент один раз подгружает ставки (без polling)
  useEffect(() => {
    if (!displayProperty?.id || !isAuctionProperty) return

    let es = null
    let reconnectTimer = null
    let cancelled = false

    const connect = async () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (es) {
        es.close()
        es = null
      }
      if (cancelled) return

      const base = await getApiBaseUrl()
      if (cancelled) return // проверяем снова после await — cleanup мог сработать пока ждали
      API_BASE_URL = base
      const normalized = base.replace(/\/$/, '')
      const path = `${normalized}/events/property-bids?property_id=${displayProperty.id}`
      const url = base.startsWith('http') ? path : `${window.location.origin}${path}`

      es = new EventSource(url)

      es.onopen = () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
      }

      es.onmessage = (event) => {
        try {
          if (typeof event.data === 'string' && event.data.startsWith(':')) return
          const data = JSON.parse(event.data)
          if (data.type === 'bid_placed' && Number(data.property_id) === Number(displayProperty.id)) {
            const nextBid = Number(data.bid_amount)
            if (Number.isFinite(nextBid) && nextBid > 0) {
              const start = Number(
                displayProperty.auction_starting_price ?? displayProperty.price ?? 0
              )
              setCurrentBid((prev) => {
                const prevNum = prev != null && !Number.isNaN(Number(prev)) ? Number(prev) : null
                const oldForAnim = prevNum != null ? prevNum : start
                if (nextBid > oldForAnim) {
                  setPrevBid(oldForAnim)
                }
                return nextBid
              })
              setCurrentLeader((prev) =>
                prev && typeof prev === 'object' ? { ...prev, bidAmount: nextBid } : prev
              )
            }
            if (data.test_timer_end_date) {
              setProperty((prev) => ({
                ...prev,
                test_timer_end_date: data.test_timer_end_date,
                test_timer_duration:
                  data.test_timer_duration != null ? data.test_timer_duration : prev.test_timer_duration,
              }))
              setTimerExpired(false)
            }
            window.dispatchEvent(new Event('property-bid-sse'))
            window.dispatchEvent(
              new CustomEvent('syb-testdrive-refresh', { detail: { propertyId: displayProperty.id } })
            )
          }
        } catch (_) {}
      }

      es.onerror = () => {
        if (cancelled) return
        if (es) {
          es.close()
          es = null
        }
        if (reconnectTimer) return
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          connect()
        }, 4000)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (es) es.close()
    }
  }, [displayProperty.id, isAuctionProperty])

  // Тот же канал, что на главной /auction: админка и сервер пушат test_timer_update — подтягиваем без опроса.
  useEffect(() => {
    if (!displayProperty?.id || !isAuctionProperty) return

    let eventSource = null
    let reconnectTimer = null
    let cancelled = false

    const connect = async () => {
      const base = await getApiBaseUrl()
      if (cancelled) return
      const url = base.startsWith('http')
        ? `${base.replace(/\/$/, '')}/events/auction-updates`
        : `${window.location.origin}${base.replace(/\/$/, '')}/events/auction-updates`
      eventSource = new EventSource(url)
      eventSource.onopen = () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
      }
      eventSource.onmessage = (event) => {
        try {
          if (typeof event.data === 'string' && event.data.startsWith(':')) return
          const data = JSON.parse(event.data)
          if (data.type !== 'test_timer_update' || !data.property) return
          const patch = data.property
          if (Number(patch.id) !== Number(displayProperty.id)) return
          const cleared = patch.test_timer_end_date == null || patch.test_timer_end_date === ''
          setProperty((prev) => ({
            ...prev,
            test_timer_end_date: cleared ? null : patch.test_timer_end_date,
            test_timer_duration:
              patch.test_timer_duration != null
                ? patch.test_timer_duration
                : cleared
                  ? null
                  : prev.test_timer_duration,
          }))
          if (!cleared) setTimerExpired(false)
        } catch (_) {}
      }
      eventSource.onerror = () => {
        if (cancelled) return
        if (eventSource) {
          eventSource.close()
          eventSource = null
        }
        if (reconnectTimer) return
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          void connect()
        }, 3000)
      }
    }

    void connect()
    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (eventSource) eventSource.close()
    }
  }, [displayProperty.id, isAuctionProperty])

  // Загружаем ставки для всех объектов (аукционных и обычных) и обновляем текущую ставку
  useEffect(() => {
    if (!displayProperty.id) return

    const loadBids = async () => {
      try {
        // Получаем userId для проверки ставок пользователя
        const isClerkAuth = user && userLoaded
        const isOldAuth = isAuthenticated()
        
        let userId = null
        if (isClerkAuth && user) {
          const savedUserId = localStorage.getItem('userId')
          if (savedUserId && /^\d+$/.test(savedUserId)) {
            userId = parseInt(savedUserId)
          } else {
            // Пытаемся получить из БД по email
            try {
              const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
              if (userEmail) {
                const userResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail)}`)
                if (userResponse.ok) {
                  const userData = await userResponse.json()
                  if (userData.success && userData.data && userData.data.id) {
                    userId = userData.data.id
                    localStorage.setItem('userId', String(userId))
                  }
                }
              }
            } catch (e) {
              console.warn('Не удалось получить userId:', e)
            }
          }
        } else if (isOldAuth) {
          const { getUserData } = await import('../services/authService')
          const userData = getUserData()
          userId = userData?.id
        }

        const response = await fetch(
          `${API_BASE_URL}/bids/property/${displayProperty.id}?${propertyBidsApiQuery(displayProperty.id, propertySourceTable)}`,
        )
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data && data.data.length > 0) {
            // Сортируем ставки по убыванию суммы и дате
            const sortedBids = [...data.data].sort((a, b) => {
              if (b.bid_amount !== a.bid_amount) {
                return b.bid_amount - a.bid_amount
              }
              return new Date(b.created_at) - new Date(a.created_at)
            })
            
            // Если есть ставки - показываем максимальную ставку
            const maxBid = sortedBids[0].bid_amount
            const leaderBid = sortedBids[0] // Полная информация о лидере
            const newCurrentLeaderId = leaderBid.user_id // ID текущего лидера (кто сделал максимальную ставку)
            const prevMaxBid = currentBid
            
            // Проверяем, изменился ли лидер перед обновлением
            const leaderChanged = currentLeaderId !== null && currentLeaderId !== newCurrentLeaderId
            
            // Если лидер изменился, сохраняем предыдущего лидера для анимации
            if (leaderChanged && currentLeader) {
              setPreviousLeader(currentLeader)
              setIsLeaderChanging(true)
              // После завершения анимации падения старой карточки, убираем её
              setTimeout(() => {
                setPreviousLeader(null)
                setIsLeaderChanging(false)
              }, 600) // Время анимации падения
            }
            
            // Сохраняем информацию о лидере и не теряем флаг/страну при фоновых обновлениях.
            const leaderCountryFromBid = leaderBid.bidder_country || leaderBid.country || ''
            const leaderFlagFromBid = flagEmojiForStoredCountry(leaderCountryFromBid) || ''
            setCurrentLeader((prev) => {
              const isSameLeader =
                prev &&
                (String(prev.userId ?? prev.id) === String(leaderBid.user_id))
              return {
                id: leaderBid.user_id,
                userId: leaderBid.user_id,
                userIdNumber: leaderBid.user_id_number ?? (isSameLeader ? prev.userIdNumber : undefined),
                bidAmount: maxBid,
                bidDate: leaderBid.created_at,
                country: isSameLeader ? (prev.country || leaderCountryFromBid) : leaderCountryFromBid,
                countryFlag: isSameLeader ? (prev.countryFlag || leaderFlagFromBid) : leaderFlagFromBid,
              }
            })
            
            // Обновляем ID текущего лидера
            const previousLeaderId = currentLeaderId
            setCurrentLeaderId(newCurrentLeaderId)
            
            // Если лидер изменился и мы еще не показывали информацию об этом лидере, получаем данные и показываем
            if (previousLeaderId !== newCurrentLeaderId && leaderBid.user_id && shownLeaderInfoRef.current !== newCurrentLeaderId) {
              shownLeaderInfoRef.current = newCurrentLeaderId // Помечаем, что показали информацию об этом лидере
              
              try {
                const leaderUserResponse = await fetch(`${API_BASE_URL}/users/${leaderBid.user_id}`)
                if (leaderUserResponse.ok) {
                  const leaderUserData = await leaderUserResponse.json()
                  if (leaderUserData.success && leaderUserData.data) {
                    const leaderUser = leaderUserData.data
                    const leaderCountry = leaderUser.country || ''
                    const leaderFlag = flagEmojiForStoredCountry(leaderCountry) || ''

                    // Дополняем текущего лидера страной и флагом
                    setCurrentLeader((prev) =>
                      prev && prev.userId === leaderBid.user_id
                        ? { ...prev, country: leaderCountry, countryFlag: leaderFlag }
                        : prev
                    )

                    // Показываем флаг и номер нового лидера в таймере на 3 секунды
                    setTimerBidInfo({
                      country: leaderCountry,
                      userIdNumber: leaderUser.user_id_number || leaderBid.user_id
                    })
                    
                    // Скрываем информацию через 3 секунды
                    setTimeout(() => {
                      setTimerBidInfo(null)
                    }, 3000)
                    
                    console.log('🏳️ Показан новый лидер в таймере:', {
                      userId: leaderBid.user_id,
                      userIdNumber: leaderUser.user_id_number,
                      country: leaderUser.country
                    })
                  }
                }
              } catch (leaderError) {
                console.warn('⚠️ Не удалось получить данные лидера для таймера:', leaderError)
              }
            }
            
            // Проверяем, является ли текущий пользователь лидером
            // Приводим к числу для корректного сравнения
            const userIdNum = userId ? parseInt(userId) : null
            const leaderIdNum = newCurrentLeaderId ? parseInt(newCurrentLeaderId) : null
            const isUserCurrentlyLeader = userIdNum && leaderIdNum && userIdNum === leaderIdNum
            if (isUserCurrentlyLeader) {
              setIsUserLeader(true)
              console.log('🏆 Пользователь является лидером!', { userId: userIdNum, leaderId: leaderIdNum, maxBid })
            } else {
              setIsUserLeader(false)
              if (userIdNum && leaderIdNum) {
                console.log('ℹ️ Пользователь не лидер:', { userId: userIdNum, leaderId: leaderIdNum })
              }
            }
            
            // Проверяем, изменился ли лидер (только если это не первая загрузка)
            // Если пользователь был лидером в предыдущем цикле, а теперь не лидер - значит ставку перебили
            if (!isInitialLoadRef.current && userId && wasUserLeaderRef.current && !isUserCurrentlyLeader && !bidOutbidShown) {
              // Пользователь был лидером, а теперь не лидер - значит ставку перебили
              console.log('🚨 Ставка перебита!', {
                wasUserLeader: wasUserLeaderRef.current,
                isUserCurrentlyLeader,
                userId,
                newCurrentLeaderId,
                maxBid,
                prevMaxBid
              })
              showToast(`Вашу ставку перебили! Текущая максимальная ставка: ${maxBid.toLocaleString('ru-RU')}`, 'warning', 5000)
              setBidOutbidShown(true)
            }
            
            // Обновляем ref для следующего цикла
            wasUserLeaderRef.current = isUserCurrentlyLeader
            
            // После первой загрузки сбрасываем флаг
            if (isInitialLoadRef.current) {
              isInitialLoadRef.current = false
            }
            
            // Обновляем ID предыдущего лидера (после проверки перебития)
            setPreviousLeaderId(newCurrentLeaderId)
            
            setCurrentBid((prev) => {
              if (prev !== maxBid) {
                const startingPrice = isAuctionProperty
                  ? Number(displayProperty.auction_starting_price || 0)
                  : Number(displayProperty.price || 0)
                setPrevBid(prev !== null && !Number.isNaN(Number(prev)) ? Number(prev) : startingPrice)
                return maxBid
              }
              return prev
            })
            
            // Обновляем userLastBid для отслеживания ставок пользователя
            if (userId) {
              const userBids = data.data.filter(b => Number(b.user_id) === Number(userId))
              if (userBids.length > 0) {
                const userMaxBid = Math.max(...userBids.map(b => b.bid_amount))
                // Если пользователь сделал новую ставку (стал лидером), сбрасываем флаг
                // Приводим к числу для корректного сравнения
                const userIdNum = userId ? parseInt(userId) : null
                const leaderIdNum = newCurrentLeaderId ? parseInt(newCurrentLeaderId) : null
                if (userIdNum && leaderIdNum && userIdNum === leaderIdNum) {
                  setBidOutbidShown(false)
                  wasUserLeaderRef.current = true
                  setIsUserLeader(true)
                  console.log('✅ Пользователь стал лидером после ставки:', { userId: userIdNum, leaderId: leaderIdNum })
                }
                setUserLastBid(userMaxBid)
              } else {
                if (userLastBid !== null) {
                  setUserLastBid(null)
                  setBidOutbidShown(false)
                }
              }
            }
            
            // Сохраняем последние две ставки (сортируем по дате для отображения последних)
            const sortedByDate = [...data.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            const newRecentBids = sortedByDate.slice(0, 3)
            setAuctionBidsList(sortedByDate)
            setRecentBids(prev => {
              const prevStr = JSON.stringify(prev)
              const newStr = JSON.stringify(newRecentBids)
              if (prevStr !== newStr) {
                return newRecentBids
              }
              return prev
            })
          } else {
            // Если ставок нет - показываем стартовую цену (для аукциона) или цену объекта (для обычных)
            const startingPrice = isAuctionProperty 
              ? (displayProperty.auction_starting_price || 0)
              : (displayProperty.price || 0)
            setCurrentBid(prev => {
              if (prev !== startingPrice) {
                return startingPrice
              }
              return prev
            })
            setRecentBids(prev => {
              if (prev.length > 0) {
                return []
              }
              return prev
            })
            setAuctionBidsList([])
            // Сбрасываем лидера когда нет ставок
            setCurrentLeader(null)
            setCurrentLeaderId(null)
          }
        }
      } catch (error) {
        console.warn('Ошибка загрузки ставок:', error)
        // В случае ошибки показываем стартовую цену (для аукциона) или цену объекта (для обычных)
        const startingPrice = isAuctionProperty 
          ? (displayProperty.auction_starting_price || 0)
          : (displayProperty.price || 0)
        setCurrentBid(prev => {
          if (prev !== startingPrice) {
            return startingPrice
          }
          return prev
        })
        setRecentBids(prev => {
          if (prev.length > 0) {
            return []
          }
          return prev
        })
        setAuctionBidsList([])
      }
    }

    loadBids()
    const onFocus = () => loadBids()
    const onRemoteBid = () => loadBids()
    window.addEventListener('focus', onFocus)
    window.addEventListener('property-bid-sse', onRemoteBid)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('property-bid-sse', onRemoteBid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayProperty.id, propertySourceTable])

  // Периодически обновляем данные объекта с сервера для синхронизации таймера
  useEffect(() => {
    if (!displayProperty.id || !displayProperty.test_timer_end_date) return;

    const updatePropertyData = async () => {
      try {
        const propResponse = await fetch(
          appendViewerUserIdToPropertyApiUrl(
            `${API_BASE_URL}/properties/${displayProperty.id}?lang=${currentLang}`
          )
        );
        if (propResponse.ok) {
          const propData = await propResponse.json();
          if (propData.success && propData.data) {
            const updatedProp = propData.data;
            // Обновляем только таймер, если он изменился И если он не null/undefined/пустая строка
            // Это предотвращает потерю test_timer_end_date при обновлении данных
            if (updatedProp.test_timer_end_date && 
                updatedProp.test_timer_end_date !== property.test_timer_end_date) {
              setProperty(prev => ({
                ...prev,
                test_timer_end_date: updatedProp.test_timer_end_date,
                test_timer_duration: updatedProp.test_timer_duration || prev.test_timer_duration
              }));
              console.log('🔄 Таймер обновлен с сервера:', updatedProp.test_timer_end_date);
            }
            // Если таймер на сервере null, но у нас он был - не обновляем (сохраняем текущее значение)
          }
        }
      } catch (error) {
        console.warn('Ошибка обновления данных объекта:', error);
      }
    };

    // Обновление таймера с сервера реже (каждые 30 сек), без агрессивного polling
    const interval = setInterval(updatePropertyData, 30000);
    return () => clearInterval(interval);
  }, [displayProperty.id, displayProperty.test_timer_end_date, property.test_timer_end_date]);

  // Проверяем, закончился ли таймер
  // Используем только значение из базы данных для синхронизации между всеми пользователями
  useEffect(() => {
    if (!auctionEndTime) return;
    
    const checkTimer = () => {
      const now = new Date().getTime();
      const end = new Date(auctionEndTime).getTime();
      if (end <= now) {
        auctionFinishedLatchRef.current = true;
        setTimerExpired(true);
      } else if (!auctionFinishedLatchRef.current) {
        setTimerExpired(false);
      }
    };
    
    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [auctionEndTime]);

  // Подтягиваем победителя из БД, если аукцион уже завершён (лидер из ставок может отсутствовать в редких случаях)
  useEffect(() => {
    if (!displayProperty?.id || !isAuctionProperty || !auctionEndTime) {
      setAuctionWinnerFromDb(undefined)
      return
    }
    if (new Date(auctionEndTime).getTime() > Date.now()) {
      setAuctionWinnerFromDb(undefined)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const base = await getApiBaseUrl()
        API_BASE_URL = base
        const r = await fetch(`${base}/auction-winners/property/${displayProperty.id}`)
        if (cancelled) return
        const j = await r.json().catch(() => ({}))
        if (j.success && j.data) {
          setAuctionWinnerFromDb(j.data)
        } else {
          setAuctionWinnerFromDb(null)
        }
      } catch {
        if (!cancelled) setAuctionWinnerFromDb(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [displayProperty?.id, isAuctionProperty, auctionEndTime])

  useEffect(() => {
    setEndedAuctionPlayerPublicId(null)
    if (!timerExpired || !auctionWinnerFromDb?.user_id || currentLeader) {
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const base = await getApiBaseUrl()
        API_BASE_URL = base
        const r = await fetch(`${base}/users/${auctionWinnerFromDb.user_id}`)
        if (cancelled || !r.ok) return
        const j = await r.json().catch(() => ({}))
        if (!j.success || !j.data || cancelled) return
        const pub = j.data.user_id_number ?? j.data.id
        if (pub != null && !cancelled) setEndedAuctionPlayerPublicId(pub)
      } catch (_) {}
    })()
    return () => {
      cancelled = true
    }
  }, [timerExpired, auctionWinnerFromDb?.user_id, currentLeader])

  const resolvedWinnerUserId =
    currentLeader?.userIdNumber ??
    currentLeader?.userId ??
    currentLeader?.id ??
    auctionWinnerFromDb?.user_id ??
    null
  const resolvedWinningBidRaw =
    currentLeader?.bidAmount != null ? currentLeader.bidAmount : auctionWinnerFromDb?.winning_bid_amount
  const resolvedWinningBid =
    resolvedWinningBidRaw != null && resolvedWinningBidRaw !== '' && !Number.isNaN(Number(resolvedWinningBidRaw))
      ? Number(resolvedWinningBidRaw)
      : null
  const showAuctionCompletedWinner =
    timerExpired && resolvedWinnerUserId != null && resolvedWinningBid != null
  const showAuctionCompletedNoBids =
    timerExpired &&
    !currentLeader &&
    auctionWinnerFromDb === null

  const isBuyNowSaleCompleted =
    displayProperty?.buy_now_winner_user_id != null &&
    displayProperty?.buy_now_completed_at != null &&
    String(displayProperty.buy_now_completed_at ?? '').trim() !== ''

  /** Как у завершённого аукциона: боковой блок «завершено» и те же классы. */
  const auctionEndedForSidebar = timerExpired || isBuyNowSaleCompleted

  const displayEndedAuctionPlayerId =
    currentLeader?.userIdNumber ??
    endedAuctionPlayerPublicId ??
    currentLeader?.userId ??
    currentLeader?.id ??
    auctionWinnerFromDb?.user_id ??
    null

  const showCircularTimerAuctionBlock =
    !isBuyNowSaleCompleted &&
    (shouldShowCircularAuctionTimer(displayProperty) ||
      (hadCircularTimerAuction && timerExpired))

  const circularTimerEndTime = shouldShowCircularAuctionTimer(displayProperty)
    ? displayProperty.test_timer_end_date
    : lastTestTimerEndRef.current

  // Сохраняем победителя когда таймер закончился
  useEffect(() => {
    if (!timerExpired || !isAuctionProperty || !currentLeader || !displayProperty.id) return;
    
    // Проверяем, является ли текущий пользователь победителем
    const checkIfUserWon = async () => {
      try {
        const isClerkAuth = user && userLoaded;
        const isOldAuth = isAuthenticated();
        
        let userId = null;
        if (isClerkAuth && user) {
          const savedUserId = localStorage.getItem('userId');
          if (savedUserId && /^\d+$/.test(savedUserId)) {
            userId = parseInt(savedUserId);
          } else {
            try {
              const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress;
              if (userEmail) {
                const userResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail)}`);
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  if (userData.success && userData.data && userData.data.id) {
                    userId = userData.data.id;
                    localStorage.setItem('userId', String(userId));
                  }
                }
              }
            } catch (e) {
              console.warn('Не удалось получить userId:', e);
            }
          }
        } else if (isOldAuth) {
          const { getUserData } = await import('../services/authService');
          const userData = getUserData();
          userId = userData?.id;
        }
        
        if (userId && currentLeader) {
          const userIdNum = parseInt(userId);
          const leaderIdNum = currentLeader.userId ? parseInt(currentLeader.userId) : (currentLeader.id ? parseInt(currentLeader.id) : null);
          const userWon = leaderIdNum && userIdNum === leaderIdNum;
          
          if (userWon) {
            setIsUserLeader(true);
            console.log('🏆 Пользователь выиграл аукцион!', { userId: userIdNum, leaderId: leaderIdNum, currentLeader });
          } else {
            setIsUserLeader(false);
            console.log('ℹ️ Пользователь не выиграл аукцион:', { userId: userIdNum, leaderId: leaderIdNum, currentLeader });
          }
        }
      } catch (error) {
        console.warn('⚠️ Ошибка при проверке победителя:', error);
      }
    };
    
    checkIfUserWon();
    
    const saveWinner = async () => {
      try {
        const leaderUserIdRaw = currentLeader.userId ?? currentLeader.id
        const leaderUserId = leaderUserIdRaw != null ? parseInt(leaderUserIdRaw, 10) : NaN
        if (!Number.isFinite(leaderUserId)) {
          console.warn('⚠️ Нет корректного user_id лидера для сохранения победителя')
          return
        }

        // Определяем таблицу объекта
        // Используем property_type из displayProperty, если доступен
        let propertyTable = 'properties';
        const propertyType = displayProperty.property_type || displayProperty.propertyType;
        if (propertyType === 'apartment' || propertyType === 'commercial') {
          propertyTable = 'properties_apartments';
        } else if (propertyType === 'house' || propertyType === 'villa') {
          propertyTable = 'properties_houses';
        } else {
          // Если property_type не определен, пытаемся получить из API
          try {
            const propResponse = await fetch(
              appendViewerUserIdToPropertyApiUrl(
                `${API_BASE_URL}/properties/${displayProperty.id}?lang=${currentLang}`
              )
            )
            if (propResponse.ok) {
              const propData = await propResponse.json();
              const apiPropertyType = propData.data?.property_type;
              if (apiPropertyType === 'apartment' || apiPropertyType === 'commercial') {
                propertyTable = 'properties_apartments';
              } else if (apiPropertyType === 'house' || apiPropertyType === 'villa') {
                propertyTable = 'properties_houses';
              }
            }
          } catch (e) {
            console.warn('⚠️ Не удалось определить таблицу объекта, используем по умолчанию:', e);
          }
        }
        
        // Сохраняем победителя (user_id — лидер по максимальной ставке, а не текущий зритель)
        const winnerData = {
          user_id: leaderUserId,
          property_id: displayProperty.id,
          property_table: propertyTable,
          winning_bid_amount: currentLeader.bidAmount,
          currency: displayProperty.currency || 'USD',
          auction_end_date: auctionEndTime
        };
        
        console.log('🏆 Сохранение победителя:', winnerData);
        
        const response = await fetch(`${API_BASE_URL}/auction-winners`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(winnerData)
        });
        
        const pullWinnerRow = async () => {
          try {
            const r = await fetch(`${API_BASE_URL}/auction-winners/property/${displayProperty.id}`);
            if (!r.ok) return;
            const j = await r.json();
            if (j.success && j.data) setAuctionWinnerFromDb(j.data);
            else if (j.success) setAuctionWinnerFromDb(null);
          } catch (_) {
            /* ignore */
          }
        };

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ Победитель успешно сохранен:', result.data);
            await pullWinnerRow();
          } else {
            console.warn('⚠️ Ошибка при сохранении победителя:', result.error);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          // Если победитель уже сохранен (409), это нормально
          if (response.status === 409) {
            console.log('ℹ️ Победитель уже был сохранен ранее');
            await pullWinnerRow();
          } else {
            console.error('❌ Ошибка при сохранении победителя:', errorData);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка при сохранении победителя:', error);
      }
    };
    
    saveWinner();
  }, [timerExpired, currentLeader, displayProperty.id, isAuctionProperty, auctionEndTime, user, userLoaded]);

  // Проверяем уведомления о перебитой ставке для текущего объекта (для всех объектов)
  useEffect(() => {
    if (!displayProperty.id) return

    const checkNotifications = async () => {
      try {
        // Получаем userId
        const isClerkAuth = user && userLoaded
        const isOldAuth = isAuthenticated()
        
        let userId = null
        if (isClerkAuth && user) {
          const savedUserId = localStorage.getItem('userId')
          if (savedUserId && /^\d+$/.test(savedUserId)) {
            userId = parseInt(savedUserId)
          } else {
            try {
              const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
              if (userEmail) {
                const userResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail)}`)
                if (userResponse.ok) {
                  const userData = await userResponse.json()
                  if (userData.success && userData.data && userData.data.id) {
                    userId = userData.data.id
                    localStorage.setItem('userId', String(userId))
                  }
                }
              }
            } catch (e) {
              console.warn('Не удалось получить userId:', e)
            }
          }
        } else if (isOldAuth) {
          const { getUserData } = await import('../services/authService')
          const userData = getUserData()
          const sid = localStorage.getItem('userId')
          if (sid && /^\d+$/.test(String(sid).trim())) {
            userId = parseInt(String(sid).trim(), 10)
          } else if (userData?.id && /^\d+$/.test(String(userData.id).trim())) {
            userId = parseInt(String(userData.id).trim(), 10)
          } else {
            userId = null
          }
        }

        if (!userId) return

        // Загружаем уведомления пользователя
        const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            console.log('🔍 Проверка уведомлений для объекта:', displayProperty.id)
            console.log('🔍 Все уведомления:', data.data)
            console.log('🔍 Уведомления bid_outbid:', data.data.filter(n => n.type === 'bid_outbid'))
            
            // Ищем уведомления о перебитой ставке для текущего объекта
            const outbidNotifs = data.data.filter(n => {
              if (n.type !== 'bid_outbid') return false
              if (shownNotificationIdsRef.current.has(n.id)) return false
              if (n.view_count !== 0) return false
              
              // Парсим data, если это строка
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
              const currentPropertyId = displayProperty.id
              
              console.log('🔍 Сравнение property_id:', {
                notifPropertyId,
                currentPropertyId,
                notifPropertyIdType: typeof notifPropertyId,
                currentPropertyIdType: typeof currentPropertyId,
                match: notifPropertyId == currentPropertyId || parseInt(notifPropertyId) === parseInt(currentPropertyId)
              })
              
              return notifPropertyId && (
                notifPropertyId == currentPropertyId || 
                parseInt(notifPropertyId) === parseInt(currentPropertyId)
              )
            })

            if (outbidNotifs.length > 0) {
              // Берем самое свежее уведомление
              const latestNotif = outbidNotifs.sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
              )[0]
              
              setOutbidNotification(latestNotif)
              shownNotificationIdsRef.current.add(latestNotif.id)
              console.log('🔔 Показано уведомление о перебитой ставке на странице объекта:', latestNotif.id)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayProperty.id, user, userLoaded])

  const handleToggleFavorite = async () => {
    // Проверяем авторизацию через Clerk или старую систему
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    
    // Разрешаем удаление из избранного без авторизации, но добавление требует авторизации
    if (!isFavorite && !isClerkAuth && !isOldAuth) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    
    await toggleFavorite(
      favoriteProperty,
      hasDbBackedProperty(favoriteProperty) ? undefined : 'property'
    )
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: propertyInfo,
          text: displayProperty.description,
          url: window.location.href,
        })
        .catch(() => {})
    }
  }

  const openBuyNowModal = (variant = 'buyNow') => {
    if (paymentActionsLocked) {
      notifyListingCurrencyOnly('buy')
      return
    }

    // Проверяем резервацию перед открытием модального окна
    if (isReservedActive) {
      showNotification('Объект временно забронирован. Покупка недоступна.')
      return
    }

    // Проверяем авторизацию
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()

    if (!isClerkAuth && !isOldAuth) {
      requestOpenLoginModal({ wizard: true })
      return
    }

    // Проверяем, что пользователь не является продавцом
    const userRole = userData?.role || 'buyer'
    if (userRole === 'seller' || userRole === 'owner') {
      showSellerRoleWarningToast('покупать')
      return
    }

    if (!buyNowEmailOk) {
      showToast(t('buyNowEmailRequired'), 'warning')
      return
    }

    if (isAuctionProperty && !roleSkipsAuctionKyc(userRole)) {
      if (!isAuctionDepositSufficient(auctionUserDeposit)) {
        setIsDepositRequiredOpen(true)
        return
      }
    }

    setBuyNowModalVariant(variant)
    setIsBuyNowModalOpen(true)
  }

  const handleBookNow = () => openBuyNowModal('buyNow')

  const showSellerRoleWarningToast = (actionLabel = 'делать ставки') => {
    showNotification(
      <span>
        Продавцы не могут {actionLabel} на объекты.{' '}
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

  // Функция для определения значений кнопок быстрых ставок в зависимости от текущей ставки
  const getQuickBidAmounts = () => {
    const startingPrice = isAuctionProperty
      ? (displayProperty.auction_starting_price || 0)
      : (displayProperty.price || 0)
    const effectiveCurrentBid = currentBid !== null ? currentBid : (displayProperty.currentBid || startingPrice)
    const step0 = getAuctionMinBidStep(effectiveCurrentBid)
    if (effectiveCurrentBid < 300000) {
      return [step0, 3000, 5000]
    }
    if (effectiveCurrentBid < 500000) {
      return [step0, 10000, 15000]
    }
    if (effectiveCurrentBid < 1000000) {
      return [step0, 20000, 25000]
    }
    return [step0, 50000, 100000]
  }

  const handleQuickBid = (amount) => {
    if (paymentActionsLocked) {
      notifyListingCurrencyOnly('bid')
      return
    }

    // Проверяем авторизацию
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    
    if (!isClerkAuth && !isOldAuth) {
      requestOpenLoginModal({ wizard: true })
      return
    }

    // Проверяем, что пользователь не является продавцом
    const userRole = userData?.role || 'buyer'
    if (userRole === 'seller' || userRole === 'owner') {
      showSellerRoleWarningToast('делать ставки')
      return
    }

    // Проверяем резервацию объекта
    if (displayProperty?.is_reserved) {
      const reservedUntil = displayProperty.reserved_until ? new Date(displayProperty.reserved_until) : null
      if (reservedUntil && reservedUntil > new Date()) {
        const hoursRemaining = Math.ceil((reservedUntil - new Date()) / (1000 * 60 * 60))
        showToast(`Объект забронирован на ${hoursRemaining} часов. Ставки временно недоступны.`, 'error')
        return
      }
    }

    if (isAuctionProperty && !roleSkipsAuctionKyc(userData?.role || 'buyer')) {
      if (!isAuctionDepositSufficient(auctionUserDeposit)) {
        setIsDepositRequiredOpen(true)
        return
      }
      if (auctionKycVerified === false) {
        showToast(t('propertyDetailBidVerificationPending'), 'error')
        return
      }
    }

    // Используем текущую максимальную ставку (currentBid), которая обновляется динамически
    // Если currentBid еще не загружен, используем значение из displayProperty или стартовую цену
    const startingPrice = isAuctionProperty 
      ? (displayProperty.auction_starting_price || 0)
      : (displayProperty.price || 0)
    const effectiveCurrentBid = currentBid !== null ? currentBid : (displayProperty.currentBid || startingPrice)
    
    // Если пользователь уже ввел сумму в поле, используем её как базу только если она >= текущей ставки
    // Иначе используем текущую максимальную ставку
    const currentInput = parseMoneyInputValue(bidAmount) || 0
    
    // Базой должна быть либо введенная пользователем сумма (если она >= текущей ставки),
    // либо текущая максимальная ставка
    let baseAmount = effectiveCurrentBid
    if (currentInput > 0 && currentInput >= effectiveCurrentBid) {
      baseAmount = currentInput
    }
    
    // Добавляем значение кнопки к базовой сумме
    const quickBidAmount = baseAmount + amount
    
    // Получаем минимальный шаг из текущих значений кнопок
    const quickBidAmounts = getQuickBidAmounts()
    const minBidStep = quickBidAmounts[0] // Минимальный шаг - это первая кнопка
    const minimumBid = effectiveCurrentBid + minBidStep
    const finalBidAmount = Math.max(quickBidAmount, minimumBid)
    
    setBidAmount(finalBidAmount.toString())
    
    console.log('🔢 handleQuickBid:', {
      amount,
      currentInput,
      effectiveCurrentBid,
      baseAmount,
      quickBidAmount,
      minimumBid,
      finalBidAmount,
      minBidStep
    })
  }

  const handleBidSubmit = async () => {
    if (paymentActionsLocked) {
      notifyListingCurrencyOnly('bid')
      return
    }

    // Проверяем авторизацию
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    
    if (!isClerkAuth && !isOldAuth) {
      requestOpenLoginModal({ wizard: true })
      return
    }

    // Проверяем, что пользователь не является продавцом
    const userRole = userData?.role || 'buyer'
    if (userRole === 'seller' || userRole === 'owner') {
      showSellerRoleWarningToast('делать ставки')
      return
    }

    // Проверяем резервацию объекта
    if (displayProperty?.is_reserved) {
      const reservedUntil = displayProperty.reserved_until ? new Date(displayProperty.reserved_until) : null
      if (reservedUntil && reservedUntil > new Date()) {
        const hoursRemaining = Math.ceil((reservedUntil - new Date()) / (1000 * 60 * 60))
        showToast(`Объект забронирован на ${hoursRemaining} часов. Ставки временно недоступны.`, 'error')
        return
      }
    }

    if (isAuctionProperty && !roleSkipsAuctionKyc(userData?.role || 'buyer')) {
      if (!isAuctionDepositSufficient(auctionUserDeposit)) {
        setIsDepositRequiredOpen(true)
        return
      }
      if (auctionKycVerified === false) {
        showToast(t('propertyDetailBidVerificationPending'), 'error')
        return
      }
    }

    const amount = parseMoneyInputValue(bidAmount)
    if (!amount || isNaN(amount) || amount <= 0) {
      showToast('Пожалуйста, введите корректную сумму ставки', 'error')
      return
    }

    const startingPrice = isAuctionProperty
      ? (displayProperty.auction_starting_price || 0)
      : (displayProperty.price || 0)

    setIsSubmittingBid(true)

    try {
      let userId = getStoredNumericUserId()
      if (!userId && isClerkAuth) {
        userId = await fetchNumericDbUserIdForApi({ clerkUser: user, clerkUserLoaded: userLoaded })
      } else if (!userId && isOldAuth) {
        const legacyUser = getUserData()
        userId = legacyUser?.id != null ? parseInt(String(legacyUser.id), 10) : null
      }

      if (!userId) {
        requestOpenLoginModal({ wizard: true })
        return
      }

      const effectiveCurrentBid =
        currentBid !== null ? currentBid : (displayProperty.currentBid || startingPrice)
      const minBidStep = getAuctionMinBidStep(effectiveCurrentBid)
      const minimumBid = effectiveCurrentBid + minBidStep

      if (amount < minimumBid) {
        showToast(
          `Минимальная ставка: ${fmtListingBidPrice(minimumBid)} (текущая максимальная + ${fmtListingBidPrice(minBidStep)})`,
          'error',
        )
        return
      }

      const requestBody = {
        user_id: parseInt(userId, 10),
        property_id: parseInt(displayProperty.id, 10),
        property_table: propertySourceTable,
        property_type: displayProperty.property_type || undefined,
        bid_amount: parseFloat(amount),
      }
      
      console.log('📤 Отправка ставки:', requestBody)
      console.log('📤 Типы данных:', {
        user_id: typeof requestBody.user_id,
        property_id: typeof requestBody.property_id,
        bid_amount: typeof requestBody.bid_amount
      })
      
      // Отправляем ставку на сервер
      const response = await fetch(`${API_BASE_URL}/bids`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('📥 Ответ сервера:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Ошибка HTTP:', response.status, errorText)
        let errorMessage = `Ошибка сервера: ${response.status}`
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.code === 'VERIFICATION_PENDING') {
            errorMessage = t('propertyDetailBidVerificationPending')
          } else if (errorData.code === 'INSUFFICIENT_AUCTION_DEPOSIT') {
            setIsDepositRequiredOpen(true)
            errorMessage = errorData.error || errorMessage
          } else if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (e) {
          // Используем стандартное сообщение
        }
        showToast(errorMessage, 'error')
        setIsSubmittingBid(false)
        return
      }
      
      const data = await response.json()
      console.log('📥 Данные ответа:', data)
      
      if (data.success) {
        const userIdNum = userId ? parseInt(userId, 10) : null
        const serverBid = Number(data.data?.bid_amount)
        const appliedBid = Number.isFinite(serverBid) && serverBid > 0 ? serverBid : amount

        setIsSubmittingBid(false)
        setBidAmount('')
        setPrevBid(currentBid !== null ? currentBid : appliedBid)
        setCurrentBid(appliedBid)
        setUserLastBid(appliedBid)
        setBidOutbidShown(false)
        setIsUserLeader(true)
        wasUserLeaderRef.current = true
        if (userIdNum) {
          setCurrentLeaderId(userIdNum)
          setPreviousLeaderId(userIdNum)
          setCurrentLeader((prev) => ({
            ...(prev && typeof prev === 'object' ? prev : {}),
            id: userIdNum,
            userId: userIdNum,
            bidAmount: appliedBid,
            bidDate: new Date().toISOString(),
          }))
        }

        patchCachedAuctionPropertyBid(displayProperty.id, appliedBid, propertySourceTable)
        window.dispatchEvent(
          new CustomEvent('syb-auction-current-bid-updated', {
            detail: {
              propertyId: displayProperty.id,
              currentBid: appliedBid,
              property_table: propertySourceTable,
            },
          }),
        )
        window.dispatchEvent(new Event('property-bid-sse'))
        window.dispatchEvent(
          new CustomEvent('syb-testdrive-refresh', { detail: { propertyId: displayProperty.id } }),
        )

        if (data.data?.test_timer_end_date) {
          setProperty((prev) => ({
            ...prev,
            test_timer_end_date: data.data.test_timer_end_date,
            test_timer_duration:
              data.data.test_timer_duration != null ? data.data.test_timer_duration : prev.test_timer_duration,
          }))
          setTimerExpired(false)
        }

        showToast(
          `Ставка ${appliedBid.toLocaleString('ru-RU')} ${displayProperty.currency || 'USD'} успешно отправлена!`,
          'success',
          4000,
        )
        setIsBidDrawerOpen(false)

        void (async () => {
          try {
            const bidsResponse = await fetch(
              `${API_BASE_URL}/bids/property/${displayProperty.id}?${propertyBidsApiQuery(displayProperty.id, propertySourceTable)}`,
            )
            if (!bidsResponse.ok) return
            const bidsData = await bidsResponse.json()
            if (!bidsData.success || !Array.isArray(bidsData.data) || bidsData.data.length === 0) return
            const sortedByDate = [...bidsData.data].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at),
            )
            setAuctionBidsList(sortedByDate)
            setRecentBids(sortedByDate.slice(0, 3))
          } catch (err) {
            console.warn('Фоновая синхронизация ставок:', err)
          }
        })()
      } else {
        console.error('❌ Ошибка создания ставки:', data)
        showToast(data.error || 'Ошибка при создании ставки', 'error')
      }
    } catch (error) {
      console.error('❌ Ошибка при отправке ставки:', error)
      showToast(`Ошибка сети: ${error.message}`, 'error')
    } finally {
      setIsSubmittingBid(false)
    }
  }

  const handleBidAmountChange = (e) => {
    if (paymentActionsLocked) {
      notifyListingCurrencyOnly('bid')
      return
    }
    const sanitized = sanitizeMoneyInputRaw(e.target.value)
    setBidAmount(sanitized)
  }

  const handleCloseOutbidNotification = () => {
    setOutbidNotification(null)
  }

  const handleGoToPropertyFromNotification = (propertyId) => {
    // Если мы уже на странице этого объекта, просто прокручиваем к форме ставки
    if (propertyId === displayProperty.id) {
      const bidForm = document.querySelector('.property-detail-sidebar__bid-form')
      if (bidForm) {
        bidForm.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const auctionWinCelebrationText = useMemo(() => {
    const pid = currentLeader?.userIdNumber ?? currentLeader?.userId ?? currentLeader?.id
    const recipientText =
      pid != null ? t('propertyDetailWinnerUserId', { id: pid }) : undefined
    const lang = (i18n.language || 'ru').split('-')[0]
    const dateLine = new Date().toLocaleDateString(
      lang === 'ru' ? 'ru-RU' : lang === 'de' ? 'de-DE' : lang === 'sv' ? 'sv-SE' : 'en-US',
      { day: 'numeric', month: 'long', year: 'numeric' }
    )
    return { recipientText, dateLine }
  }, [currentLeader, t, i18n.language])

  const handleBackClick = () => {
    if (typeof onBack === 'function') {
      onBack()
      return
    }
    const from = getPropertyEntryFrom()
    if (from) {
      navigate(from)
      return
    }
    navigate('/auction')
  }

  const currentUserNumericId =
    Number(userData?.id) ||
    Number(user?.id) ||
    Number(getStoredNumericUserId()) ||
    null
  const currentLeaderNumericId =
    Number(currentLeader?.userId ?? currentLeader?.id) || null
  const isCurrentUserLeadingCard =
    Boolean(currentUserNumericId) &&
    Boolean(currentLeaderNumericId) &&
    currentUserNumericId === currentLeaderNumericId
  const currentLeaderLabel = isCurrentUserLeadingCard
    ? 'ВЫ ЛИДЕР АУКЦИОНА'
    : t('propertyDetailAuctionLeader')

  const auctionPropertyTypeLabel = useMemo(() => {
    const type = displayProperty?.property_type || displayProperty?.propertyType
    if (type === 'house') return t('propertyTypeHouse')
    if (type === 'villa') return t('propertyTypeVilla')
    if (type === 'commercial') return t('propertyTypeFlat')
    return t('propertyTypeApartment')
  }, [displayProperty?.property_type, displayProperty?.propertyType, t])

  const auctionStickyPriceLabel = t('propertyDetailCurrentMaxBid')

  const auctionStickyPriceValue = fmtBidPrice(
    currentBid !== null
      ? currentBid
      : displayProperty?.auction_starting_price || 0,
  )

  const openInvestorPanelForProperty = useCallback(() => {
    navigate('/calculator', {
      state: {
        calculatorFromProperty: {
          ...displayProperty,
          currentBid:
            currentBid != null ? currentBid : displayProperty?.currentBid ?? null,
        },
        calculatorStrategy: 'rent',
      },
    })
  }, [navigate, displayProperty, currentBid])

  const auctionGalleryStripItems = useMemo(() => {
    if (!galleryMedia.length) return []
    const maxVisible = 5
    if (galleryMedia.length <= maxVisible) {
      return galleryMedia.map((media, index) => ({ media, index, moreCount: 0 }))
    }
    return galleryMedia.slice(0, maxVisible).map((media, index) => ({
      media,
      index,
      moreCount: index === maxVisible - 1 ? galleryMedia.length - maxVisible : 0,
    }))
  }, [galleryMedia])


  const renderAuctionLeaderCards = () => (
    <>
      {previousLeader && !auctionEndedForSidebar && isLeaderChanging && (
        <div className="auction-leader-card auction-leader-card--exiting">
          <div className="auction-leader-label">{t('propertyDetailAuctionLeader')}</div>
          <div className="auction-leader-name">
            {previousLeader.countryFlag && (
              <span className="auction-leader-country-flag">{previousLeader.countryFlag}</span>
            )}
            <span className="auction-leader-id">
              {previousLeader.userIdNumber ||
                previousLeader.userId ||
                previousLeader.id ||
                t('propertyDetailUnknown')}
            </span>
          </div>
          <div className="auction-leader-bid">
            {t('propertyDetailBid')} {fmtBidPrice(previousLeader.bidAmount)}
          </div>
        </div>
      )}
      {currentLeader && !auctionEndedForSidebar && (
        <div
          className={`auction-leader-card ${isLeaderChanging ? 'auction-leader-card--entering' : ''}`}
        >
          <div className="auction-leader-label">{currentLeaderLabel}</div>
          <div className="auction-leader-name">
            {currentLeader.countryFlag && (
              <span className="auction-leader-country-flag">{currentLeader.countryFlag}</span>
            )}
            <span className="auction-leader-id">
              {currentLeader.userIdNumber || currentLeader.userId || currentLeader.id}
            </span>
          </div>
          <div className={`auction-leader-bid ${priceAnimation ? 'auction-leader-bid--price-up' : ''}`}>
            <span className="auction-leader-bid__amount">
              {t('propertyDetailBid')} {fmtBidPrice(currentLeader.bidAmount)}
            </span>
            {priceAnimation && (
              <FiArrowUp className="auction-leader-bid__arrow-up" size={18} aria-hidden />
            )}
          </div>
        </div>
      )}
    </>
  )

  const renderPropertyBuildingTypeValue = () => {
    const buildingType = displayProperty.building_type
    if (!buildingType) return '—'
    if (buildingType === 'monolithic') return t('addPropertyDetailsBuildingMonolithic')
    if (buildingType === 'brick') return t('addPropertyDetailsBuildingBrick')
    if (buildingType === 'panel') return t('addPropertyDetailsBuildingPanel')
    if (buildingType === 'block') return t('addPropertyDetailsBuildingBlock')
    if (buildingType === 'wood') return t('addPropertyDetailsBuildingWood')
    if (buildingType === 'frame') return t('addPropertyDetailsBuildingFrame')
    if (buildingType === 'aerated_concrete') return t('addPropertyDetailsBuildingAerated')
    if (buildingType === 'foam_concrete') return t('addPropertyDetailsBuildingFoam')
    if (buildingType === 'other') return t('addPropertyDetailsBuildingOther')
    return buildingType
  }

  const getPropertyMainDetailItems = () => {
    const isHouseOrVilla =
      displayProperty.property_type === 'house' || displayProperty.property_type === 'villa'
    const items = []

    const pushItem = (label, value, wide = false) => {
      items.push({ key: `${label}-${items.length}`, label, value, wide })
    }

    if (isHouseOrVilla) {
      if (
        displayProperty.land_area !== null &&
        displayProperty.land_area !== undefined &&
        displayProperty.land_area !== '' &&
        Number(displayProperty.land_area) > 0
      ) {
        pushItem(t('addPropertyDetailsLandAreaLabel'), `${displayProperty.land_area} м²`)
      }
      pushItem(
        t('addPropertyDetailsAreaLabel'),
        displayProperty.area || displayProperty.sqft
          ? `${displayProperty.area || displayProperty.sqft} м²`
          : '—'
      )
      if (
        displayProperty.living_area !== null &&
        displayProperty.living_area !== undefined &&
        displayProperty.living_area !== '' &&
        Number(displayProperty.living_area) > 0
      ) {
        pushItem(t('addPropertyDetailsLivingAreaLabel'), `${displayProperty.living_area} м²`)
      }
      pushItem(
        t('addPropertyDetailsBedroomsLabel'),
        displayProperty.bedrooms !== undefined &&
          displayProperty.bedrooms !== null &&
          displayProperty.bedrooms !== ''
          ? displayProperty.bedrooms
          : '—'
      )
      pushItem(t('addPropertyDetailsBathroomsShortLabel'), displayProperty.bathrooms || '—')
      pushItem(
        t('addPropertyDetailsFloorsCountLabel'),
        displayProperty.total_floors !== undefined && displayProperty.total_floors !== null
          ? displayProperty.total_floors
          : '—'
      )
      pushItem(t('addPropertyDetailsBuildingMaterialLabel'), renderPropertyBuildingTypeValue())
      pushItem(
        t('addPropertyDetailsYearBuiltLabel'),
        displayProperty.year_built !== undefined && displayProperty.year_built !== null
          ? displayProperty.year_built
          : '—'
      )
    } else {
      pushItem(
        t('propertyDetailRoomsLabel'),
        displayProperty.rooms || displayProperty.beds || displayProperty.bedrooms || '—'
      )
      pushItem(
        t('addPropertyDetailsAreaLabel'),
        displayProperty.area || displayProperty.sqft
          ? `${displayProperty.area || displayProperty.sqft} м²`
          : '—'
      )
      if (
        displayProperty.living_area !== null &&
        displayProperty.living_area !== undefined &&
        displayProperty.living_area !== '' &&
        Number(displayProperty.living_area) > 0
      ) {
        pushItem(t('addPropertyDetailsLivingAreaLabel'), `${displayProperty.living_area} м²`)
      }
      pushItem(t('addPropertyDetailsBathroomsShortLabel'), displayProperty.bathrooms || '—')
      pushItem(
        t('propertyDetailFloorLabel'),
        displayProperty.floor !== undefined && displayProperty.floor !== null
          ? displayProperty.floor
          : '—'
      )
      pushItem(
        t('propertyDetailTotalFloorsShort'),
        displayProperty.total_floors !== undefined && displayProperty.total_floors !== null
          ? displayProperty.total_floors
          : '—'
      )
      pushItem(t('propertyDetailBuildingTypeShort'), renderPropertyBuildingTypeValue())
      pushItem(
        t('addPropertyDetailsYearBuiltLabel'),
        displayProperty.year_built !== undefined && displayProperty.year_built !== null
          ? displayProperty.year_built
          : '—'
      )
    }

    return items
  }

  const getPropertyAdditionalDetailItems = () => {
    const items = []
    if (displayProperty.renovation) {
      items.push({ key: 'renovation', label: t('propertyDetailRenovation'), value: displayProperty.renovation })
    }
    if (displayProperty.condition) {
      items.push({ key: 'condition', label: t('propertyDetailCondition'), value: displayProperty.condition })
    }
    if (displayProperty.heating) {
      items.push({ key: 'heating', label: t('propertyDetailHeating'), value: displayProperty.heating })
    }
    if (displayProperty.water_supply) {
      items.push({
        key: 'water_supply',
        label: t('propertyDetailWaterSupply'),
        value: displayProperty.water_supply,
      })
    }
    if (displayProperty.sewerage) {
      items.push({ key: 'sewerage', label: t('propertyDetailSewerage'), value: displayProperty.sewerage })
    }
    if (displayProperty.commercial_type) {
      items.push({
        key: 'commercial_type',
        label: t('propertyDetailCommercialType'),
        value: displayProperty.commercial_type,
      })
    }
    if (displayProperty.business_hours) {
      items.push({
        key: 'business_hours',
        label: t('propertyDetailBusinessHours'),
        value: displayProperty.business_hours,
      })
    }
    return items
  }

  const renderMobileSpecsSection = (
    title,
    items,
    { collapseAfter = null, expanded = true, onExpand } = {}
  ) => {
    if (!items.length) return null

    const canCollapse =
      collapseAfter != null && items.length > collapseAfter && typeof onExpand === 'function'
    const visibleItems =
      canCollapse && !expanded ? items.slice(0, collapseAfter) : items
    const hiddenCount =
      canCollapse && !expanded ? items.length - collapseAfter : 0

    return (
      <section className="property-detail-mobile-specs">
        <h3 className="property-detail-mobile-specs__title">{title}</h3>
        <div className="property-detail-mobile-specs__grid" role="list">
          {visibleItems.map((item) => (
            <div
              key={item.key}
              className={`property-detail-mobile-specs__cell${
                item.wide ? ' property-detail-mobile-specs__cell--wide' : ''
              }`}
              role="listitem"
            >
              <span className="property-detail-mobile-specs__label">{item.label}</span>
              <span className="property-detail-mobile-specs__value">{item.value}</span>
            </div>
          ))}
        </div>
        {hiddenCount > 0 ? (
          <button
            type="button"
            className="property-detail-mobile-specs__more"
            onClick={onExpand}
          >
            {t('showMore', { count: hiddenCount })}
          </button>
        ) : null}
      </section>
    )
  }

  const renderPropertyMainDetailsBlock = ({ layout = 'desktop' } = {}) => {
    const items = getPropertyMainDetailItems()

    if (layout === 'mobile-about') {
      return renderMobileSpecsSection(t('addPropertyDetailsTitle'), items, {
        collapseAfter: MOBILE_MAIN_SPECS_INITIAL_COUNT,
        expanded: mobileMainSpecsExpanded,
        onExpand: () => setMobileMainSpecsExpanded(true),
      })
    }

    return (
      <div className="property-detail-info-block property-detail-info-block--main-details">
        <h3 className="property-detail-info-block__title">{t('addPropertyDetailsTitle')}</h3>
        <div className="property-detail-info-block__content property-detail-info-block__content--horizontal">
          {items.map((item) => (
            <div
              key={item.key}
              className="property-detail-info-item property-detail-info-item--horizontal"
            >
              <span className="property-detail-info-label">{item.label}:</span>
              <span className="property-detail-info-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderPropertyAdditionalDetailsBlock = ({ layout = 'desktop' } = {}) => {
    const items = getPropertyAdditionalDetailItems()
    if (!items.length) return null

    if (layout === 'mobile-about') {
      return renderMobileSpecsSection(t('propertyDetailAdditionalInfoTitle'), items)
    }

    return (
      <div className="property-detail-info-block">
        <h3 className="property-detail-info-block__title">{t('propertyDetailAdditionalInfoTitle')}</h3>
        <div className="property-detail-info-block__content property-detail-info-block__content--grid">
          {items.map((item) => (
            <div key={item.key} className="property-detail-info-item">
              <span className="property-detail-info-label">{item.label}:</span>
              <span className="property-detail-info-value">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getPropertyAmenityLabels = () => {
    const merged = {
      ...displayProperty,
      ...property,
      amenities: property?.amenities ?? displayProperty?.amenities,
      tz_amenities_json: property?.tz_amenities_json ?? displayProperty?.tz_amenities_json,
    }
    return getResolvedAmenityLabels(merged)
  }

  const renderPropertyAmenitiesBlock = ({ layout = 'desktop' } = {}) => {
    if (isDebtProperty) return null

    const amenities = getPropertyAmenityLabels()

    if (layout === 'mobile-about') {
      return wrapMobileDepositGatedBlock(
        <section className="property-detail-mobile-amenities">
          <h3 className="property-detail-mobile-amenities__title">{t('propertyDetailAmenitiesTitle')}</h3>
          {amenities.length === 0 ? (
            <p className="property-detail-mobile-amenities__empty">{t('propertyDetailAmenitiesNone')}</p>
          ) : (
            <ul className="property-detail-mobile-amenities__list">
              {amenities.map((amenity, index) => (
                <li key={`${amenity}-${index}`} className="property-detail-mobile-amenities__item">
                  <span className="property-detail-mobile-amenities__icon" aria-hidden>
                    <FiCheck size={14} strokeWidth={3} />
                  </span>
                  <span className="property-detail-mobile-amenities__label">{amenity}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )
    }

    if (layout === 'desktop-auction') {
      return amenities.length === 0 ? (
        <p className="property-detail-auction-desktop-amenities__empty">
          {t('propertyDetailAmenitiesNone')}
        </p>
      ) : (
        <ul className="property-detail-auction-desktop-amenities__list">
          {amenities.map((amenity, index) => (
            <li key={`${amenity}-${index}`} className="property-detail-auction-desktop-amenities__item">
              <span>{amenity}</span>
            </li>
          ))}
        </ul>
      )
    }

    return (
      <div className="property-detail-info-block">
        <h3 className="property-detail-info-block__title">{t('propertyDetailAmenitiesTitle')}</h3>
        <div className="property-detail-info-block__content property-detail-info-block__content--amenities">
          {amenities.length === 0 ? (
            <span className="amenity-tag amenity-tag--empty">{t('propertyDetailAmenitiesNone')}</span>
          ) : (
            amenities.map((amenity, index) => (
              <span key={`${amenity}-${index}`} className="amenity-tag">
                {amenity}
              </span>
            ))
          )}
        </div>
      </div>
    )
  }

  const renderMobileAboutAdditionalAmenitiesBlock = () => {
    const additionalInfo =
      displayProperty.additional_amenities ||
      property.additional_amenities ||
      property.additionalAmenities ||
      null
    const text =
      additionalInfo !== null && additionalInfo !== undefined ? String(additionalInfo).trim() : ''
    if (!text) return null

    const lines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)

    return wrapMobileDepositGatedBlock(
      <section className="property-detail-mobile-extra-amenities">
        <h3 className="property-detail-mobile-extra-amenities__title">
          {t('propertyDetailAdditionalAmenitiesTitle')}
        </h3>
        {lines.length > 1 ? (
          <ul className="property-detail-mobile-extra-amenities__list">
            {lines.map((line, index) => (
              <li key={`${index}-${line.slice(0, 24)}`} className="property-detail-mobile-extra-amenities__item">
                <FiCheck className="property-detail-mobile-extra-amenities__check" size={16} aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="property-detail-mobile-extra-amenities__text">{text}</p>
        )}
      </section>
    )
  }

  const mobileListingPostedDate = useMemo(() => {
    const raw =
      displayProperty?.reviewed_at ||
      displayProperty?.created_at ||
      displayProperty?.auction_start_date ||
      null
    if (!raw) return null
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return null
    const localeByLang = {
      ru: 'ru-RU',
      de: 'de-DE',
      sv: 'sv-SE',
      fr: 'fr-FR',
      es: 'es-ES',
      en: 'en-US',
    }
    const locale = localeByLang[currentLang] || 'en-US'
    return parsed.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [
    displayProperty?.reviewed_at,
    displayProperty?.created_at,
    displayProperty?.auction_start_date,
    currentLang,
  ])

  useEffect(() => {
    if (!isAuctionProperty || !displayProperty?.id) return undefined

    const propertyId = String(displayProperty.id)
    let visitorId = localStorage.getItem(VISITOR_STORAGE_KEY)
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem(VISITOR_STORAGE_KEY, visitorId)
    }

    let cancelled = false

    const sendHeartbeat = async () => {
      try {
        const base = API_BASE_URL || (await getApiBaseUrl())
        const response = await fetch(`${base}/properties/${propertyId}/viewer-heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: visitorId }),
          cache: 'no-store',
          keepalive: true,
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled && typeof data?.count === 'number') {
          setPropertyViewerCount(data.count)
        }
      } catch {
        // ignore network errors
      }
    }

    sendHeartbeat()
    const intervalId = setInterval(sendHeartbeat, PROPERTY_VIEWER_HEARTBEAT_MS)
    const onFocus = () => sendHeartbeat()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sendHeartbeat()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuctionProperty, displayProperty?.id])

  useEffect(() => {
    setPropertyViewerCount(null)
  }, [displayProperty?.id])

  const renderMobileAuctionListingMeta = () => {
    if (!isAuctionProperty) return null
    const hasPostedDate = Boolean(mobileListingPostedDate)
    const hasViewerCount = propertyViewerCount != null
    if (!hasPostedDate && !hasViewerCount) return null

    return (
      <p className="property-detail-mobile-listing-meta">
        {hasPostedDate ? (
          <span>{t('propertyDetailListedOn', { date: mobileListingPostedDate })}</span>
        ) : null}
        {hasPostedDate && hasViewerCount ? (
          <span className="property-detail-mobile-listing-meta__sep" aria-hidden>
            {' '}
            ·{' '}
          </span>
        ) : null}
        {hasViewerCount ? (
          <span>{t('propertyDetailOnlineNow', { count: propertyViewerCount })}</span>
        ) : null}
      </p>
    )
  }

  const galleryPhotoCount = useMemo(
    () => galleryMedia.filter((item) => item.type === 'photo').length,
    [galleryMedia],
  )
  const galleryVideoCount = useMemo(
    () => galleryMedia.filter((item) => item.type === 'video').length,
    [galleryMedia],
  )

  const formatMobileBidDateTime = useCallback(
    (iso) => {
      if (!iso) return ''
      const localeByLang = {
        ru: 'ru-RU',
        de: 'de-DE',
        sv: 'sv-SE',
        fr: 'fr-FR',
        es: 'es-ES',
        en: 'en-US',
      }
      const locale = localeByLang[currentLang] || 'en-US'
      return new Date(iso).toLocaleString(locale, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    },
    [currentLang],
  )

  const renderMobileGalleryTab = () => {
    if (!galleryMedia.length) {
      return (
        <p className="property-detail-mobile-gallery__empty" role="status">
          {t('propertyDetailGalleryEmpty')}
        </p>
      )
    }

    const heroMedia = currentMedia
    const heroIsVideo = heroMedia?.type === 'video'
    const heroImageSrc =
      heroIsVideo && heroMedia.thumbnail ? heroMedia.thumbnail : heroMedia?.url

    return (
      <section className="property-detail-mobile-gallery" aria-label={t('propertyDetailTabGallery')}>
        <div
          className="property-detail-mobile-gallery__hero"
          {...(gallerySwipeEnabled ? gallerySwipeHandlers : {})}
        >
          {galleryMedia.length > 1 ? (
            <>
              <button
                type="button"
                className="property-detail-mobile-gallery__nav property-detail-mobile-gallery__nav--prev"
                onClick={handlePreviousImage}
                aria-label={t('previous') || 'Previous'}
              >
                <FiChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="property-detail-mobile-gallery__nav property-detail-mobile-gallery__nav--next"
                onClick={handleNextImage}
                aria-label={t('next') || 'Next'}
              >
                <FiChevronRight size={22} />
              </button>
            </>
          ) : null}
          <span className="property-detail-mobile-gallery__counter">
            {currentImageIndex + 1} / {galleryMedia.length}
          </span>
          <div className="property-detail-mobile-gallery__stage">
            {heroIsVideo ? (
              <>
                {heroImageSrc ? (
                  <img src={heroImageSrc} alt="" className="property-detail-mobile-gallery__hero-img" />
                ) : (
                  <div className="property-detail-mobile-gallery__hero-video-fallback" aria-hidden />
                )}
                <span className="property-detail-mobile-gallery__play-badge" aria-hidden>
                  <FiPlay size={28} />
                </span>
              </>
            ) : (
              <img src={heroMedia?.url} alt="" className="property-detail-mobile-gallery__hero-img" />
            )}
          </div>
        </div>

        {(galleryPhotoCount > 0 || galleryVideoCount > 0) && (
          <div className="property-detail-mobile-gallery__meta">
            {galleryPhotoCount > 0 ? (
              <span className="property-detail-mobile-gallery__pill">
                {t('propertyDetailGalleryPhotosCount', { count: galleryPhotoCount })}
              </span>
            ) : null}
            {galleryVideoCount > 0 ? (
              <span className="property-detail-mobile-gallery__pill property-detail-mobile-gallery__pill--video">
                {t('propertyDetailGalleryVideosCount', { count: galleryVideoCount })}
              </span>
            ) : null}
          </div>
        )}

        <div
          ref={mobileGalleryFilmstripRef}
          className="property-detail-mobile-gallery__filmstrip"
          role="list"
        >
          {galleryMedia.map((media, index) => {
            const isActive = currentImageIndex === index
            const thumbSrc =
              media.type === 'video'
                ? media.thumbnail || null
                : media.url
            return (
              <button
                key={`${media.type}-${index}`}
                type="button"
                role="listitem"
                className={`property-detail-mobile-gallery__thumb${
                  isActive ? ' property-detail-mobile-gallery__thumb--active' : ''
                }`}
                onClick={() => handleThumbnailClick(index)}
                aria-current={isActive ? 'true' : undefined}
                aria-label={t('propertyDetailGalleryItemLabel', {
                  n: index + 1,
                  total: galleryMedia.length,
                })}
              >
                {thumbSrc ? (
                  <img src={thumbSrc} alt="" loading="lazy" />
                ) : (
                  <span className="property-detail-mobile-gallery__thumb-video" aria-hidden>
                    <FiPlay size={18} />
                  </span>
                )}
                {media.type === 'video' ? (
                  <span className="property-detail-mobile-gallery__thumb-type" aria-hidden>
                    <FiPlay size={10} />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  const renderDesktopGalleryTab = () => {
    if (!galleryMedia.length) {
      return (
        <p className="property-detail-auction-desktop-gallery__empty" role="status">
          {t('propertyDetailGalleryEmpty')}
        </p>
      )
    }

    return (
      <section
        className="property-detail-auction-desktop-gallery property-detail-auction-desktop-gallery--minimal"
        aria-label={t('propertyDetailTabGallery')}
      >
        <div className="property-detail-auction-desktop-gallery__grid" role="list">
          {galleryMedia.map((media, index) => {
            const isVideo = media.type === 'video'
            const thumbSrc = isVideo && media.thumbnail ? media.thumbnail : media.url

            return (
              <button
                key={`desktop-gallery-${media.type}-${index}`}
                type="button"
                role="listitem"
                className={`property-detail-auction-desktop-gallery__item${
                  isVideo ? ' property-detail-auction-desktop-gallery__item--video' : ''
                }`}
                onClick={() => openDesktopGalleryLightbox(index)}
                aria-label={t('propertyDetailGalleryOpenItem', {
                  n: index + 1,
                  total: galleryMedia.length,
                })}
              >
                {thumbSrc ? (
                  <img src={thumbSrc} alt="" loading="lazy" />
                ) : (
                  <span className="property-detail-auction-desktop-gallery__item-fallback" aria-hidden>
                    <FiPlay size={28} />
                  </span>
                )}
                {isVideo ? (
                  <span className="property-detail-auction-desktop-gallery__item-video-badge" aria-hidden>
                    <FiPlay size={14} />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  const renderDesktopGalleryLightbox = () => {
    if (desktopGalleryLightboxIndex == null) return null

    const media = galleryMedia[desktopGalleryLightboxIndex]
    if (!media) return null

    const isVideo = media.type === 'video'

    return (
      <div
        className="property-detail-desktop-gallery-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={t('propertyDetailGalleryLightboxLabel')}
        onClick={closeDesktopGalleryLightbox}
      >
        <div
          className="property-detail-desktop-gallery-lightbox__panel"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="property-detail-desktop-gallery-lightbox__close"
            onClick={closeDesktopGalleryLightbox}
            aria-label={t('close') || 'Close'}
          >
            <FiXCircle size={28} strokeWidth={2} />
          </button>

          <span className="property-detail-desktop-gallery-lightbox__counter">
            {desktopGalleryLightboxIndex + 1} / {galleryMedia.length}
          </span>

          {galleryMedia.length > 1 ? (
            <>
              <button
                type="button"
                className="property-detail-desktop-gallery-lightbox__nav property-detail-desktop-gallery-lightbox__nav--prev"
                onClick={() => stepDesktopGalleryLightbox('prev')}
                aria-label={t('previous') || 'Previous'}
              >
                <FiChevronLeft size={28} />
              </button>
              <button
                type="button"
                className="property-detail-desktop-gallery-lightbox__nav property-detail-desktop-gallery-lightbox__nav--next"
                onClick={() => stepDesktopGalleryLightbox('next')}
                aria-label={t('next') || 'Next'}
              >
                <FiChevronRight size={28} />
              </button>
            </>
          ) : null}

          <div className="property-detail-desktop-gallery-lightbox__stage">
            {isVideo ? (
              <div className="property-detail-desktop-gallery-lightbox__video-wrap">
                <iframe
                  src={
                    media.videoType === 'youtube'
                      ? getYouTubeEmbedUrl(media.videoId || media.url)
                      : media.videoType === 'googledrive'
                        ? getGoogleDriveEmbedUrl(media.videoId || media.url)
                        : media.url
                  }
                  title={displayProperty.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <img
                src={media.url}
                alt={displayProperty.name}
                className="property-detail-desktop-gallery-lightbox__img"
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderAuctionBidsHistoryPanel = ({
    listClassName = 'property-detail-mobile-bids__list',
    rowClassName = 'property-detail-mobile-bids__row',
  } = {}) => {
    const sortedBids = [...auctionBidsList].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    const renderBidRow = (bid, index) => {
      const countryFlag = flagEmojiForStoredCountry(bid.bidder_country)
      return (
        <li
          key={bid.id || `bid-row-${index}-${bid.created_at}`}
          className={rowClassName}
        >
          <div className="property-detail-mobile-bids__row-user">
            <span className="property-detail-mobile-bids__row-avatar" aria-hidden>
              {countryFlag || <FiUser size={16} />}
            </span>
            <span className="property-detail-mobile-bids__row-id">
              #{bid.user_id_number || bid.user_id || t('propertyDetailUnknown')}
            </span>
          </div>
          <div className="property-detail-mobile-bids__row-meta">
            <span className="property-detail-mobile-bids__row-amount">
              {fmtBidPrice(bid.bid_amount)}
            </span>
            <span className="property-detail-mobile-bids__row-time">
              {formatMobileBidDateTime(bid.created_at)}
            </span>
          </div>
        </li>
      )
    }

    if (!sortedBids.length) {
      return (
        <p className="property-detail-mobile-bids__empty" role="status">
          {t('propertyDetailBidsEmpty')}
        </p>
      )
    }

    return <ul className={listClassName}>{sortedBids.map(renderBidRow)}</ul>
  }

  const renderMobileBidsTab = () => (
    <section
      className="property-detail-mobile-bids property-detail-mobile-bids--full-history"
      aria-label={t('propertyDetailTabBids')}
    >
      {renderAuctionBidsHistoryPanel()}
    </section>
  )

  const renderMobileAuctionTestDriveBlock = () => {
    if (!isAuctionProperty || !showsTestDriveSection) return null

    return (
      <div className="property-detail-mobile-test-drive">
        <div className="property-detail-mobile-test-drive__hero">
          <span className="property-detail-mobile-test-drive__icon-wrap" aria-hidden>
            <Home size={22} strokeWidth={2.25} />
          </span>
          <div className="property-detail-mobile-test-drive__hero-text">
            <span className="property-detail-mobile-test-drive__eyebrow">{t('testDrive')}</span>
            <span className="property-detail-mobile-test-drive__headline">
              {t('propertyDetailTestDriveHeadline')}
            </span>
            <span className="property-detail-mobile-test-drive__lead">{t('testDrivePromoDrawerLead')}</span>
          </div>
        </div>
        <TestDriveSection
          propertyId={displayProperty.id}
          propertyTable={
            property.source_table || displayProperty.source_table || 'properties_apartments'
          }
          hasTestDrive
          i18nLang={currentLang}
        />
      </div>
    )
  }

  const renderMobileAboutDocumentsBlock = () => {
    if (!processedDocuments.length) return null

    return wrapMobileDepositGatedBlock(
      <section className="property-detail-mobile-documents">
        <h3 className="property-detail-mobile-documents__title">
          {t('propertyDetailDocumentsTitle')}
        </h3>
        <ul className="property-detail-mobile-documents__list">
          {processedDocuments.map((doc, index) => (
            <li key={`${doc.url}-${index}`}>
              <button
                type="button"
                className="property-detail-mobile-documents__item"
                onClick={() => setSelectedDocument(doc)}
                tabIndex={aboutDepositContentLocked ? -1 : undefined}
              >
                <span className="property-detail-mobile-documents__icon-wrap" aria-hidden>
                  <FiFileText size={20} />
                </span>
                <span className="property-detail-mobile-documents__meta">
                  <span className="property-detail-mobile-documents__name">{doc.name}</span>
                  <span className="property-detail-mobile-documents__type">
                    {doc.type === 'pdf'
                      ? t('propertyDetailDocumentPdf')
                      : t('propertyDetailDocumentImage')}
                  </span>
                </span>
                <FiChevronRight
                  className="property-detail-mobile-documents__chevron"
                  size={20}
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  const renderMobileAboutPropertyContent = () => {
    const descriptionText = displayProperty.description
      ? String(displayProperty.description).trim()
      : ''

    return (
      <div className="property-detail-mobile-about-content">
        {descriptionText ? (
          <section className="property-detail-mobile-description">
            <h3 className="property-detail-mobile-description__title">
              {t('addPropertyNameLabelDescription')}
            </h3>
            <p className="property-detail-mobile-description__text">{descriptionText}</p>
          </section>
        ) : null}
        {renderPropertyMainDetailsBlock({ layout: 'mobile-about' })}
        {renderPropertyAdditionalDetailsBlock({ layout: 'mobile-about' })}
        {renderPropertyAmenitiesBlock({ layout: 'mobile-about' })}
        <PropertyDetailYieldPromo onClick={openInvestorPanelForProperty} />
        {renderMobileAboutAdditionalAmenitiesBlock()}
        {renderMobileAboutDocumentsBlock()}
      </div>
    )
  }

  const renderMobileAboutBidSummary = ({ desktopPanel = false } = {}) => {
    const startingPrice = displayProperty?.auction_starting_price || 0
    const displayBidAmount =
      currentBid !== null ? currentBid : startingPrice
    const bidLabel = t('propertyDetailCurrentMaxBid')
    const showLeader = currentLeader && !auctionEndedForSidebar
    const leaderId =
      currentLeader?.userIdNumber || currentLeader?.userId || currentLeader?.id

    const leaderTitle =
      currentLeader?.country || currentLeader?.bidder_country || undefined

    return (
      <div className="property-detail-mobile-about-bid">
        <span className="property-detail-mobile-about-bid__label">{bidLabel}</span>
        <div className="property-detail-mobile-about-bid__row">
          <div
            className={`property-detail-mobile-about-bid__price-col${
              priceAnimation ? ' property-detail-mobile-about-bid__price-col--animated' : ''
            }`}
          >
            <span className="property-detail-mobile-about-bid__value">
              {fmtBidPrice(displayBidAmount)}
            </span>
            {priceAnimation && (
              <FiArrowUp className="property-detail-mobile-about-bid__arrow" size={18} aria-hidden />
            )}
          </div>
          {showLeader && leaderId != null && leaderId !== '' && (
            <div
              className={`property-detail-mobile-about-leader${
                isCurrentUserLeadingCard ? ' property-detail-mobile-about-leader--you' : ''
              }${desktopPanel ? ' property-detail-auction-desktop-leader' : ''}`}
              title={leaderTitle}
            >
              {desktopPanel ? (
                <span
                  className={`property-detail-auction-desktop-leader__trophy${
                    isCurrentUserLeadingCard
                      ? ' property-detail-auction-desktop-leader__trophy--you'
                      : ''
                  }`}
                  aria-hidden
                >
                  <Trophy size={18} strokeWidth={2.25} />
                </span>
              ) : null}
              {currentLeader.countryFlag && !desktopPanel ? (
                <span className="property-detail-mobile-about-leader__flag-wrap" aria-hidden>
                  <span className="property-detail-mobile-about-leader__flag">
                    {currentLeader.countryFlag}
                  </span>
                </span>
              ) : null}
              <span className="property-detail-mobile-about-leader__meta">
                <span className="property-detail-mobile-about-leader__caption">
                  {isCurrentUserLeadingCard
                    ? t('propertyDetailYouAreWinningShort')
                    : t('propertyDetailAuctionLeaderShort')}
                </span>
                <span className="property-detail-mobile-about-leader__id">
                  {currentLeader.userIdNumber
                    ? String(currentLeader.userIdNumber)
                    : t('propertyDetailWinnerUserId', { id: leaderId })}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderAuctionTimerVisual = () => {
    if (showCircularTimerAuctionBlock && circularTimerEndTime) {
      return (
        <CircularTimer
          endTime={circularTimerEndTime}
          size={168}
          strokeWidth={8}
          originalDuration={displayProperty.test_timer_duration || originalTestTimerDuration}
          isUserLeader={isUserLeader && !auctionEndedForSidebar}
          bidInfo={timerBidInfo}
          auctionEndedLabel={t('propertyDetailAuctionCompleted')}
        />
      )
    }
    if (auctionEndTime) {
      return (
        <PropertyTimer
          endTime={auctionEndTime}
          auctionEndedLabel={t('propertyDetailAuctionCompleted')}
        />
      )
    }
    return null
  }

  const fetchUserBidCeiling = useCallback(async () => {
    const userId = getStoredNumericUserId()
    if (!userId || !displayProperty?.id || !isAuctionProperty) {
      setUserBidCeiling(null)
      return
    }
    try {
      const q = new URLSearchParams({
        user_id: String(userId),
        property_id: String(displayProperty.id),
        property_table: propertySourceTable || 'properties_apartments',
      })
      const res = await fetch(`${API_BASE_URL}/bids/ceiling?${q.toString()}`)
      const json = await res.json()
      if (json.success && json.data?.max_amount != null) {
        setUserBidCeiling(json.data)
      } else {
        setUserBidCeiling(null)
      }
    } catch {
      setUserBidCeiling(null)
    }
  }, [displayProperty?.id, isAuctionProperty, propertySourceTable])

  useEffect(() => {
    void fetchUserBidCeiling()
  }, [fetchUserBidCeiling])

  const handleOpenBidCeiling = () => {
    if (paymentActionsLocked) {
      notifyListingCurrencyOnly('bid')
      return
    }
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    if (!isClerkAuth && !isOldAuth) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    if (isReservedActive) return
    if (isAuctionProperty && !roleSkipsAuctionKyc(userData?.role || 'buyer')) {
      if (!isAuctionDepositSufficient(auctionUserDeposit)) {
        setIsDepositRequiredOpen(true)
        return
      }
      if (auctionKycVerified === false) {
        showToast(t('propertyDetailBidVerificationPending'), 'error')
        return
      }
    }
    setIsBidDrawerOpen(false)
    setBidCeilingOpen(true)
  }

  useAuctionDesktopBidPanelDock({
    enabled: isAuctionProperty,
    panelRef: auctionDesktopBidPanelRef,
    anchorRef: auctionDesktopBidAnchorRef,
    dockKey: displayProperty?.id ?? property?.id,
  })

  const auctionBiddingFormProps = {
    isAuctionProperty,
    displayProperty,
    currentBid,
    priceAnimation,
    fmtBidPrice,
    isReservedActive,
    kycBidBlocked,
    paymentActionsLocked,
    currencyView,
    getQuickBidAmounts,
    formatQuickBidLabel,
    handleQuickBid,
    isSubmittingBid,
    isUserLeader,
    disableAuctionBidFields,
    notifyListingCurrencyOnly,
    bidAmountInputValue,
    handleBidAmountChange,
    bidAmount,
    handleBidSubmit,
    auctionEndedForSidebar,
    showBidCeilingButton: isAuctionProperty && !auctionEndedForSidebar,
    onOpenBidCeiling: handleOpenBidCeiling,
    bidCeilingActive: userBidCeiling?.max_amount != null,
  }

  const renderAuctionBuyNowBlock = ({ variant = 'sidebar' } = {}) => {
    const buyNowPrice = displayProperty.price ? Number(displayProperty.price) : 0
    const startingPrice = displayProperty.auction_starting_price
      ? Number(displayProperty.auction_starting_price)
      : 0
    const effectiveCurrentBid =
      currentBid !== null ? currentBid : displayProperty.currentBid || startingPrice
    const shouldShowBuyNow =
      isAuctionProperty &&
      buyNowPrice > 0 &&
      buyNowPrice > startingPrice &&
      !timerExpired &&
      !isBuyNowSaleCompleted &&
      effectiveCurrentBid < buyNowPrice

    if (!shouldShowBuyNow) return null

    if (variant === 'mobile-about') {
      return (
        <section className="property-detail-mobile-buy-now" aria-label={t('buyNowSectionTitle')}>
          <div className="property-detail-mobile-buy-now__price-row">
            <span className="property-detail-mobile-buy-now__label">
              {t('propertyDetailMinSellingPrice')}
            </span>
            <span className="property-detail-mobile-buy-now__value">
              {fmtBidPrice(displayProperty.price)}
            </span>
          </div>
          <button
            type="button"
            className={`property-detail-mobile-buy-now__btn${
              paymentActionsLocked ? ' property-detail-mobile-buy-now__btn--currency-preview' : ''
            }`}
            onClick={handleBookNow}
            disabled={isReservedActive || !buyNowEmailOk}
            title={!buyNowEmailOk ? t('buyNowEmailRequired') : undefined}
          >
            {isReservedActive ? t('objectReserved') : t('buyNowSectionTitle')}
          </button>
        </section>
      )
    }

    return (
      <>
        <div className="property-detail-sidebar__current-bid property-detail-auction-desktop__buy-now-price">
          <span className="current-bid-label">{t('propertyDetailMinSellingPrice')}</span>
          <span className="current-bid-value">{fmtBidPrice(displayProperty.price)}</span>
        </div>
        <button
          type="button"
          className={`property-detail-sidebar__buy-now-btn${
            paymentActionsLocked ? ' property-detail-sidebar__buy-now-btn--currency-preview' : ''
          }`}
          onClick={handleBookNow}
          disabled={isReservedActive || !buyNowEmailOk}
          title={!buyNowEmailOk ? t('buyNowEmailRequired') : undefined}
          style={{
            opacity: isReservedActive || !buyNowEmailOk ? 0.5 : 1,
            cursor:
              isReservedActive || !buyNowEmailOk || paymentActionsLocked
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {isReservedActive ? t('objectReserved') : t('buyNowSectionTitle')}
        </button>
      </>
    )
  }

  const renderAuctionWinnerPurchaseButton = () => {
    if (!isAuctionProperty || !timerExpired || !isUserLeader || isBuyNowSaleCompleted) {
      return null
    }
    return (
      <button
        type="button"
        className={`property-detail-sidebar__buy-btn property-detail-sidebar__buy-btn--winner${
          paymentActionsLocked ? ' property-detail-sidebar__buy-now-btn--currency-preview' : ''
        }`}
        onClick={() => openBuyNowModal('auctionWinner')}
        disabled={isReservedActive || !buyNowEmailOk}
        title={!buyNowEmailOk ? t('buyNowEmailRequired') : undefined}
        style={{
          opacity: isReservedActive || !buyNowEmailOk ? 0.5 : 1,
          cursor: isReservedActive || !buyNowEmailOk ? 'not-allowed' : 'pointer',
        }}
      >
        {t('propertyDetailGoToPurchase')}
      </button>
    )
  }

  const renderAuctionEndedState = () => {
    if (!auctionEndedForSidebar) return null
    if (showAuctionCompletedWinner) {
      return (
        <div className="auction-winner-card auction-winner-card--settled property-detail-auction-desktop__winner">
          <div className="auction-winner-label">{t('propertyDetailAuctionWinner')}</div>
          <div className="auction-winner-name">
            {displayEndedAuctionPlayerId != null
              ? `#${displayEndedAuctionPlayerId}`
              : t('propertyDetailUnknown')}
          </div>
          {resolvedWinningBid != null ? (
            <div className="auction-winner-bid">{fmtBidPrice(resolvedWinningBid)}</div>
          ) : null}
        </div>
      )
    }
    if (showAuctionCompletedNoBids) {
      return (
        <div className="auction-completed-no-bids property-detail-auction-desktop__no-bids">
          {t('propertyDetailAuctionNoBids')}
        </div>
      )
    }
    return null
  }

  const renderDesktopAuctionDebtRisk = () => {
    if (!isDebtProperty) return null
    const sev = displayProperty.debt_severity
    const accentColor =
      sev === 'red' ? '#DC2626' : sev === 'yellow' ? '#CA8A04' : '#16A34A'
    const riskIcon =
      sev === 'red' ? ShieldQuestionMark : sev === 'yellow' ? ShieldAlert : ShieldCheck
    const riskTitle =
      sev === 'red' ? 'Высокий риск' : sev === 'yellow' ? 'Средний риск' : 'Низкий риск'
    const riskSubtitle =
      sev === 'red'
        ? 'Красный — существенные задолженности'
        : sev === 'yellow'
          ? 'Жёлтый — требуют времени и расходов'
          : 'Зелёный — технические и процедурные моменты'
    const riskDescription =
      sev === 'red'
        ? 'Существенные задолженности и/или ограничения. Перед покупкой потребуется глубокая юридическая и финансовая проверка.'
        : sev === 'yellow'
          ? 'Вопросы, которые могут потребовать времени и дополнительных расходов, но, как правило, решаемы при грамотном сопровождении.'
          : 'В основном технические или процедурные вопросы, решаемые стандартными действиями при сделке.'
    const ctaText =
      sev === 'red'
        ? 'Высокий шанс заработать'
        : sev === 'yellow'
          ? 'Средний шанс заработать'
          : 'Стабильный шанс заработать'
    const debtFeatures = [
      displayProperty.debt_utilities && 'Долги по коммунальным услугам',
      displayProperty.debt_mortgage_pledge && 'Залог у банка',
      displayProperty.debt_property_taxes && 'Неоплаченные налоги на имущество',
      displayProperty.debt_arrest && 'Арест / ограничения',
      displayProperty.debt_inherited && 'Долги наследодателя',
      displayProperty.debt_third_party && 'Долги перед третьими лицами',
      displayProperty.debt_other && displayProperty.debt_other,
      displayProperty.debt_amount
        ? `Сумма долга: ${fmtPrice(displayProperty.debt_amount)}`
        : null,
    ].filter(Boolean)
    if (debtFeatures.length === 0) debtFeatures.push('Долговые обязательства уточняются')

    return (
      <div className="property-detail-debt-risk-card property-detail-auction-desktop__debt">
        <FlipCard
          color={accentColor}
          icon={riskIcon}
          title={riskTitle}
          subtitle={riskSubtitle}
          description={riskDescription}
          features={debtFeatures.slice(0, 4)}
          ctaText={ctaText}
          clickToFlip
        />
      </div>
    )
  }

  const renderAuctionContentTabs = ({ desktop = false } = {}) => {
    const tabsClass = desktop
      ? 'property-detail-auction-desktop-tabs property-detail-auction-content-tabs property-detail-auction-desktop-only'
      : 'property-detail-mobile-tabs property-detail-auction-content-tabs'
    const tabBtnClass = desktop
      ? 'property-detail-auction-desktop-tabs__tab'
      : 'property-detail-mobile-tabs__tab'
    const tabActiveClass = desktop
      ? ' property-detail-auction-desktop-tabs__tab--active'
      : ' property-detail-mobile-tabs__tab--active'

    return (
      <div className={tabsClass} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={auctionMobileTab === 'about'}
          className={`${tabBtnClass}${auctionMobileTab === 'about' ? tabActiveClass : ''}`}
          onClick={() => setAuctionMobileTab('about')}
        >
          {t('propertyDetailTabAbout')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={auctionMobileTab === 'gallery'}
          className={`${tabBtnClass}${auctionMobileTab === 'gallery' ? tabActiveClass : ''}`}
          onClick={() => setAuctionMobileTab('gallery')}
        >
          {t('propertyDetailTabGallery')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={auctionMobileTab === 'bids'}
          className={`${tabBtnClass}${auctionMobileTab === 'bids' ? tabActiveClass : ''}`}
          onClick={() => setAuctionMobileTab('bids')}
        >
          {t('propertyDetailTabBids')}
        </button>
      </div>
    )
  }

  const renderAuctionMobileToolbarActions = () => {
    const showAuctionReminderButton =
      !shouldShowCircularAuctionTimer(displayProperty) &&
      auctionEndTime &&
      !timerExpired &&
      !isBuyNowSaleCompleted &&
      !isReservedActive &&
      hasDbBackedProperty(displayProperty)

    return (
      <>
        {showAuctionReminderButton ? (
          <button
            type="button"
            className="property-detail-gallery__action-btn"
            onClick={() => setAuctionReminderOpen(true)}
            aria-label={t('auctionReminderButton')}
          >
            <Bell size={20} strokeWidth={2.25} />
          </button>
        ) : null}
        <button
          type="button"
          className="property-detail-gallery__action-btn"
          onClick={handleShare}
          disabled={isReservedActive}
          aria-label={t('share') || 'Поделиться'}
        >
          <FiShare2 size={20} />
        </button>
        <button
          type="button"
          className={`property-detail-gallery__action-btn${
            isFavorite ? ' property-detail-gallery__action-btn--active' : ''
          }`}
          onClick={handleToggleFavorite}
          disabled={isReservedActive}
          aria-label={t('addToFavorites') || 'В избранное'}
        >
          {isFavorite ? <FaHeartSolid size={20} /> : <FiHeart size={20} />}
        </button>
      </>
    )
  }

  const renderAuctionMobileHeader = () => {
    const showTitleInHeader = !isAuctionMobileTitleVisible
    const titleLong = (propertyInfo?.length ?? 0) > MOBILE_AUCTION_TITLE_INLINE_MAX
    const isSolid = isAuctionMobileHeaderSolid || showTitleInHeader

    return (
      <header
        className={`property-detail-auction-mobile-header property-detail-auction-mobile-only${
          isSolid ? ' property-detail-auction-mobile-header--solid' : ''
        }${showTitleInHeader ? ' property-detail-auction-mobile-header--title-visible' : ''}${
          titleLong ? ' property-detail-auction-mobile-header--title-long' : ''
        }`}
      >
        <div className="property-detail-auction-mobile-header__toolbar">
          <PageBackButton
            onClick={handleBackClick}
            className="page-back-button--icon-only property-detail-auction-mobile-header__back"
            iconSize={20}
          />
          {!titleLong ? (
            <div
              className={`property-detail-auction-mobile-header__title-inline-wrap${
                showTitleInHeader ? ' is-visible' : ''
              }`}
              aria-hidden={!showTitleInHeader}
            >
              <span className="property-detail-auction-mobile-header__title-inline">{propertyInfo}</span>
            </div>
          ) : null}
          <div className="property-detail-auction-mobile-header__actions">
            {renderAuctionMobileToolbarActions()}
          </div>
        </div>
        {titleLong ? (
          <div
            className={`property-detail-auction-mobile-header__title-row-wrap${
              showTitleInHeader ? ' is-visible' : ''
            }`}
            aria-hidden={!showTitleInHeader}
          >
            <p className="property-detail-auction-mobile-header__title-row">{propertyInfo}</p>
          </div>
        ) : null}
      </header>
    )
  }

  const renderDesktopAuctionHead = () => (
    <header className="property-detail-auction-desktop__head property-detail-auction-desktop-only">
      <h1 ref={auctionDesktopTitleRef} className="property-detail-auction-desktop__title">
        {propertyInfo}
      </h1>
      {displayProperty.location ? (
        <p className="property-detail-auction-desktop__location">
          <IoLocationOutline size={17} strokeWidth={2} aria-hidden />
          <span>{displayProperty.location}</span>
        </p>
      ) : null}
      <div className="property-detail-auction-desktop__listing-meta">
        {renderMobileAuctionListingMeta()}
      </div>
    </header>
  )

  const renderDesktopAuctionHeroGallery = () => {
    const openGalleryTab = () => setAuctionMobileTab('gallery')

    const renderMosaicCell = (media, index, { showMoreOverlay = false, moreCount = 0 } = {}) => {
      const isVideo = media?.type === 'video'
      const imgSrc = isVideo ? media.thumbnail || null : media?.url

      return (
        <>
          {isVideo && !imgSrc ? (
            <span className="property-detail-auction-hero__cell-video" aria-hidden>
              <FiPlay size={28} />
            </span>
          ) : imgSrc ? (
            <img src={imgSrc} alt="" className="property-detail-auction-hero__cell-img" loading="lazy" />
          ) : null}
          {isVideo && imgSrc ? (
            <span className="property-detail-auction-hero__cell-play" aria-hidden>
              <FiPlay size={18} />
            </span>
          ) : null}
          {showMoreOverlay && moreCount > 0 ? (
            <span className="property-detail-auction-hero__cell-more">
              +{moreCount}
            </span>
          ) : null}
        </>
      )
    }

    const showAuctionReminderButton =
      !shouldShowCircularAuctionTimer(displayProperty) &&
      auctionEndTime &&
      !timerExpired &&
      !isBuyNowSaleCompleted &&
      !isReservedActive &&
      hasDbBackedProperty(displayProperty)

    const renderHeroActions = () => (
      <div className="property-detail-auction-hero__actions-top">
        {showAuctionReminderButton ? (
          <button
            type="button"
            className="property-detail-auction-hero__action-btn"
            onClick={() => setAuctionReminderOpen(true)}
            aria-label={t('auctionReminderButton')}
          >
            <Bell size={18} strokeWidth={2.25} />
          </button>
        ) : null}
        <button
          type="button"
          className="property-detail-auction-hero__action-btn"
          onClick={handleShare}
          disabled={isReservedActive}
          aria-label={t('share') || 'Поделиться'}
        >
          <FiShare2 size={18} />
        </button>
        <button
          type="button"
          className={`property-detail-auction-hero__action-btn${
            isFavorite ? ' property-detail-auction-hero__action-btn--active' : ''
          }`}
          onClick={handleToggleFavorite}
          disabled={isReservedActive}
          aria-label={t('addToFavorites') || 'В избранное'}
        >
          {isFavorite ? <FaHeartSolid size={18} /> : <FiHeart size={18} />}
        </button>
      </div>
    )

    const renderHeroFooter = () => {
      if (galleryMedia.length <= 1) return null

      return (
        <div className="property-detail-auction-hero__footer">
          <span className="property-detail-auction-hero__footer-count">
            {currentImageIndex + 1} / {galleryMedia.length}
          </span>
          <button
            type="button"
            className="property-detail-auction-hero__footer-btn"
            onClick={openGalleryTab}
          >
            <LayoutGrid size={16} strokeWidth={2.25} aria-hidden />
            {t('propertyDetailGalleryViewAll', { count: galleryMedia.length })}
          </button>
        </div>
      )
    }

    if (!galleryMedia.length) {
      return (
        <section
          className="property-detail-auction-hero property-detail-auction-hero--empty property-detail-auction-desktop-only"
          aria-label={t('gallery')}
        >
          <p className="property-detail-auction-hero__empty">{t('propertyDetailGalleryEmpty')}</p>
        </section>
      )
    }

    const mediaCount = galleryMedia.length
    const mosaicExtraCount = mediaCount > 5 ? mediaCount - 5 : 0

    if (mediaCount === 1) {
      const media = galleryMedia[0]
      return (
        <section
          className="property-detail-auction-hero property-detail-auction-hero--single property-detail-auction-desktop-only"
          aria-label={t('gallery')}
        >
          <div
            className={`property-detail-auction-hero__stage${
              isReservedActive ? ' property-detail-auction-hero__stage--reserved' : ''
            }`}
            {...gallerySwipeHandlers}
          >
            {media.type === 'video' ? (
              <div className="property-detail-auction-hero__video-wrap">
                <iframe
                  src={
                    media.videoType === 'youtube'
                      ? getYouTubeEmbedUrl(media.videoId || media.url)
                      : media.videoType === 'googledrive'
                        ? getGoogleDriveEmbedUrl(media.videoId || media.url)
                        : media.url
                  }
                  title={displayProperty.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <img
                src={media.url}
                alt={displayProperty.name}
                className="property-detail-auction-hero__stage-img"
              />
            )}
            {isReservedActive && (
              <div className="property-detail-gallery__reserved-banner" aria-hidden>
                <span className="property-detail-gallery__reserved-text">Забронировано</span>
              </div>
            )}
            {renderHeroActions()}
            {renderHeroFooter()}
          </div>
        </section>
      )
    }

    if (mediaCount >= 4) {
      const sideCells = mediaCount === 4 ? galleryMedia.slice(1, 4) : galleryMedia.slice(1, 5)

      return (
        <section
          className="property-detail-auction-hero property-detail-auction-hero--mosaic property-detail-auction-desktop-only"
          aria-label={t('gallery')}
        >
          <div className="property-detail-auction-hero__mosaic-wrap">
            <div
              className={`property-detail-auction-hero__mosaic property-detail-auction-hero__mosaic--count-${Math.min(mediaCount, 5)}`}
            >
              <button
                type="button"
                className={`property-detail-auction-hero__mosaic-cell property-detail-auction-hero__mosaic-cell--primary${
                  currentImageIndex === 0 ? ' property-detail-auction-hero__mosaic-cell--active' : ''
                }`}
                onClick={() => handleThumbnailClick(0)}
                aria-label={t('propertyDetailGalleryItemLabel', { n: 1, total: mediaCount })}
              >
                {renderMosaicCell(galleryMedia[0], 0)}
              </button>
              <div className="property-detail-auction-hero__mosaic-side">
                {sideCells.map((media, sideIndex) => {
                  const index = sideIndex + 1
                  const isLast = index === 4
                  const showOverlay = isLast && mosaicExtraCount > 0

                  return (
                    <button
                      key={`mosaic-${index}`}
                      type="button"
                      className={`property-detail-auction-hero__mosaic-cell${
                        currentImageIndex === index && !showOverlay
                          ? ' property-detail-auction-hero__mosaic-cell--active'
                          : ''
                      }`}
                      onClick={() => (showOverlay ? openGalleryTab() : handleThumbnailClick(index))}
                      aria-label={
                        showOverlay
                          ? t('propertyDetailOpenFullGallery')
                          : t('propertyDetailGalleryItemLabel', { n: index + 1, total: mediaCount })
                      }
                    >
                      {renderMosaicCell(media, index, {
                        showMoreOverlay: showOverlay,
                        moreCount: mosaicExtraCount,
                      })}
                    </button>
                  )
                })}
              </div>
            </div>
            {renderHeroActions()}
            {renderHeroFooter()}
          </div>
        </section>
      )
    }

    return (
      <section
        className={`property-detail-auction-hero property-detail-auction-hero--stage property-detail-auction-desktop-only${
          mediaCount === 2 ? ' property-detail-auction-hero--stage-duo' : ''
        }`}
        aria-label={t('gallery')}
      >
        <div
          className={`property-detail-auction-hero__stage${
            isReservedActive ? ' property-detail-auction-hero__stage--reserved' : ''
          }`}
          {...gallerySwipeHandlers}
        >
          {currentMedia?.type === 'video' ? (
            <div className="property-detail-auction-hero__video-wrap">
              <iframe
                src={
                  currentMedia.videoType === 'youtube'
                    ? getYouTubeEmbedUrl(currentMedia.videoId || currentMedia.url)
                    : currentMedia.videoType === 'googledrive'
                      ? getGoogleDriveEmbedUrl(currentMedia.videoId || currentMedia.url)
                      : currentMedia.url
                }
                title={displayProperty.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <img
              src={currentMedia?.url}
              alt={displayProperty.name}
              className="property-detail-auction-hero__stage-img"
            />
          )}
          {isReservedActive && (
            <div className="property-detail-gallery__reserved-banner" aria-hidden>
              <span className="property-detail-gallery__reserved-text">Забронировано</span>
            </div>
          )}
          {priceAnimation && currentBid !== null && (
            <div className="property-detail-gallery__price-overlay">
              <div className="price-overlay__content">
                <div className="price-overlay__label">Новая ставка</div>
                <div className="price-overlay__value-wrapper">
                  <span className="price-overlay__value">{fmtPrice(currentBid)}</span>
                  <FiArrowUp className="price-overlay__arrow" size={24} />
                </div>
              </div>
            </div>
          )}
          {galleryMedia.length > 1 && (
            <>
              <button
                type="button"
                className="property-detail-gallery__nav property-detail-gallery__nav--prev property-detail-auction-hero__nav"
                onClick={handlePreviousImage}
                disabled={isReservedActive}
                aria-label={t('previousImage') || 'Предыдущее фото'}
              >
                <FiChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="property-detail-gallery__nav property-detail-gallery__nav--next property-detail-auction-hero__nav"
                onClick={handleNextImage}
                disabled={isReservedActive}
                aria-label={t('nextImage') || 'Следующее фото'}
              >
                <FiChevronRight size={22} />
              </button>
            </>
          )}
          {renderHeroActions()}
          {renderHeroFooter()}
        </div>

        <div className="property-detail-auction-hero__filmstrip-wrap">
          <div
            ref={desktopAuctionFilmstripRef}
            className="property-detail-auction-hero__filmstrip"
            role="list"
          >
            {galleryMedia.map((media, index) => (
              <button
                key={`desktop-strip-${index}`}
                type="button"
                role="listitem"
                className={`property-detail-auction-hero__filmstrip-item${
                  currentImageIndex === index ? ' property-detail-auction-hero__filmstrip-item--active' : ''
                }`}
                onClick={() => handleThumbnailClick(index)}
                aria-label={t('propertyDetailGalleryItemLabel', {
                  n: index + 1,
                  total: galleryMedia.length,
                })}
                aria-current={currentImageIndex === index ? 'true' : undefined}
              >
                {renderMosaicCell(media, index)}
              </button>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const renderDesktopAuctionTestDriveBlock = () => {
    if (!isAuctionProperty || !showsTestDriveSection) return null

    return (
      <section className="property-detail-auction-desktop-card property-detail-auction-desktop-test-drive">
        <div className="property-detail-auction-desktop-test-drive__banner">
          <div className="property-detail-auction-desktop-test-drive__banner-main">
            <span className="property-detail-auction-desktop-test-drive__icon" aria-hidden>
              <Home size={24} strokeWidth={2} />
            </span>
            <div className="property-detail-auction-desktop-test-drive__copy">
              <span className="property-detail-auction-desktop-test-drive__eyebrow">
                {t('testDrive')}
              </span>
              <h3 className="property-detail-auction-desktop-test-drive__title">
                {t('propertyDetailTestDriveHeadline')}
              </h3>
              <p className="property-detail-auction-desktop-test-drive__lead">
                {t('testDrivePromoDrawerLead')}
              </p>
            </div>
          </div>
          <span className="property-detail-auction-desktop-test-drive__badge">
            {t('propertyDetailTestDriveDaysBadge')}
          </span>
        </div>
        <div className="property-detail-auction-desktop-test-drive__body">
          <TestDriveSection
            propertyId={displayProperty.id}
            propertyTable={
              property.source_table || displayProperty.source_table || 'properties_apartments'
            }
            hasTestDrive
            i18nLang={currentLang}
          />
        </div>
      </section>
    )
  }

  const renderDesktopAuctionAdditionalAmenitiesBlock = () => {
    const additionalInfo =
      displayProperty.additional_amenities ||
      property.additional_amenities ||
      property.additionalAmenities ||
      null
    const text =
      additionalInfo !== null && additionalInfo !== undefined ? String(additionalInfo).trim() : ''
    if (!text) return null

    const lines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)

    return wrapDepositGatedBlock(
      <section className="property-detail-auction-desktop-card property-detail-auction-desktop-card--extra">
        <h3 className="property-detail-auction-desktop-card__title">
          {t('propertyDetailAdditionalAmenitiesTitle')}
        </h3>
        {lines.length > 1 ? (
          <ul className="property-detail-auction-desktop-amenities__list property-detail-auction-desktop-amenities__list--extra">
            {lines.map((line, index) => (
              <li
                key={`${index}-${line.slice(0, 24)}`}
                className="property-detail-auction-desktop-amenities__item"
              >
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="property-detail-auction-desktop-card__description">{text}</p>
        )}
      </section>,
      { desktopCard: true },
    )
  }

  const renderDesktopAuctionDocumentsBlock = () => {
    if (!processedDocuments.length) return null

    return wrapDepositGatedBlock(
      <section className="property-detail-auction-desktop-card property-detail-auction-desktop-card--documents">
        <header className="property-detail-auction-desktop-documents__head">
          <span className="property-detail-auction-desktop-documents__eyebrow">
            <FiFileText size={16} strokeWidth={2.25} aria-hidden />
            {t('propertyDetailDocumentsTitle')}
          </span>
          <h2 className="property-detail-auction-desktop-documents__title">
            {t('propertyDetailDocumentsDesktopTitle')}
          </h2>
          <p className="property-detail-auction-desktop-documents__lead">
            {t('propertyDetailDocumentsDesktopLead')}
          </p>
        </header>
        <ul className="property-detail-auction-desktop-documents__list">
          {processedDocuments.map((doc, index) => (
            <li key={`${doc.url}-${index}`}>
              <button
                type="button"
                className="property-detail-auction-desktop-documents__item"
                onClick={() => setSelectedDocument(doc)}
                tabIndex={aboutDepositContentLocked ? -1 : undefined}
              >
                <span className="property-detail-auction-desktop-documents__icon-wrap" aria-hidden>
                  <FiFileText size={20} />
                </span>
                <span className="property-detail-auction-desktop-documents__meta">
                  <span className="property-detail-auction-desktop-documents__name">{doc.name}</span>
                  <span className="property-detail-auction-desktop-documents__type">
                    {doc.type === 'pdf'
                      ? t('propertyDetailDocumentPdf')
                      : t('propertyDetailDocumentImage')}
                  </span>
                </span>
                <FiChevronRight
                  className="property-detail-auction-desktop-documents__chevron"
                  size={20}
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </section>,
      { desktopCard: true },
    )
  }

  const renderDesktopAuctionMapBlock = () => {
    const locationLabel = displayProperty.location || t('location') || 'Местоположение'
    const hasExactCoords =
      finalCoordinates &&
      finalCoordinates[0] !== 53.9045 &&
      finalCoordinates[1] !== 27.5615

    return (
      <section
        className="property-detail-auction-desktop-card property-detail-auction-desktop-card--map property-detail-map-mobile--auction-sheet"
        aria-label={t('location') || 'Местоположение'}
      >
        <div className="property-detail-auction-desktop-map__header">
          <div className="property-detail-auction-desktop-map__header-main">
            <span className="property-detail-auction-desktop-map__icon" aria-hidden>
              <IoLocationOutline size={22} />
            </span>
            <div className="property-detail-auction-desktop-map__copy">
              <span className="property-detail-auction-desktop-map__eyebrow">{t('location')}</span>
              <h2 className="property-detail-auction-desktop-map__title">{locationLabel}</h2>
            </div>
          </div>
        </div>

        <div className="property-detail-auction-desktop-map__frame">
          <div className="property-detail-auction-desktop-map__map-wrap">
            {typeof window !== 'undefined' && (
              <>
                <LocationMap
                  center={finalCoordinates}
                  zoom={hasExactCoords ? 15 : undefined}
                  marker={hasExactCoords ? finalCoordinates : null}
                  controlsLayout="column"
                />
                {isGeocoding ? (
                  <div className="property-detail-auction-desktop-map__loading" role="status">
                    {t('propertyDetailMapSearching') || 'Поиск местоположения...'}
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="property-detail-auction-desktop-map__frame-glow" aria-hidden />
        </div>
      </section>
    )
  }

  const renderDesktopAuctionAboutContent = () => {
    const descriptionText = displayProperty.description
      ? String(displayProperty.description).trim()
      : ''
    const mainItems = getPropertyMainDetailItems()
    const additionalItems = getPropertyAdditionalDetailItems()

    return (
      <div className="property-detail-auction-desktop-about">
        {descriptionText ? (
          <section className="property-detail-auction-desktop-card property-detail-auction-desktop-card--description">
            <h2 className="property-detail-auction-desktop-card__title">
              {t('addPropertyNameLabelDescription')}
            </h2>
            <p className="property-detail-auction-desktop-card__description">{descriptionText}</p>
          </section>
        ) : null}

        {mainItems.length > 0 ? (
          <section className="property-detail-auction-desktop-card">
            {renderPropertyMainDetailsBlock()}
          </section>
        ) : null}

        {additionalItems.length > 0 ? (
          <section className="property-detail-auction-desktop-card">
            {renderPropertyAdditionalDetailsBlock()}
          </section>
        ) : null}

        {!isDebtProperty
          ? wrapDepositGatedBlock(
              <section className="property-detail-auction-desktop-card property-detail-auction-desktop-card--amenities">
                <h2 className="property-detail-auction-desktop-card__title">
                  {t('propertyDetailAmenitiesTitle')}
                </h2>
                {renderPropertyAmenitiesBlock({ layout: 'desktop-auction' })}
              </section>,
              { desktopCard: true },
            )
          : null}

        {renderDesktopAuctionAdditionalAmenitiesBlock()}

        {renderDesktopAuctionDocumentsBlock()}

        <section className="property-detail-auction-desktop-card property-detail-auction-desktop-card--promo">
          <PropertyDetailYieldPromo
            onClick={openInvestorPanelForProperty}
            variant="desktop-auction"
          />
        </section>

        {renderDesktopAuctionMapBlock()}
        {renderDesktopAuctionTestDriveBlock()}
        {renderDesktopAuctionDebtRisk()}
      </div>
    )
  }

  const renderDesktopBidsTab = () => {
    const sortedBids = [...auctionBidsList].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    return (
      <section
        className="property-detail-auction-desktop-bids-panel property-detail-auction-desktop-bids-panel--full-history"
        aria-label={t('propertyDetailTabBids')}
      >
        {!sortedBids.length ? (
          <p className="property-detail-mobile-bids__empty" role="status">
            {t('propertyDetailBidsEmpty')}
          </p>
        ) : (
          <ul className="property-detail-auction-desktop-bids-timeline__list">
            {sortedBids.map((bid, index) => {
              const countryFlag = flagEmojiForStoredCountry(bid.bidder_country)
              const playerId = bid.user_id_number || bid.user_id || t('propertyDetailUnknown')
              const isLast = index === sortedBids.length - 1

              return (
                <li
                  key={bid.id || `desktop-bid-${index}-${bid.created_at}`}
                  className={`property-detail-auction-desktop-bids-item${
                    isLast ? ' property-detail-auction-desktop-bids-item--last' : ''
                  }`}
                >
                  <span className="property-detail-auction-desktop-bids-item__track" aria-hidden>
                    <span className="property-detail-auction-desktop-bids-item__dot" />
                    {!isLast ? (
                      <span className="property-detail-auction-desktop-bids-item__line" />
                    ) : null}
                  </span>
                  <div className="property-detail-auction-desktop-bids-item__card">
                    <div className="property-detail-auction-desktop-bids-item__user">
                      <span className="property-detail-auction-desktop-bids-item__avatar" aria-hidden>
                        {countryFlag || <FiUser size={16} />}
                      </span>
                      <div className="property-detail-auction-desktop-bids-item__user-meta">
                        <span className="property-detail-auction-desktop-bids-item__id">
                          {playerId}
                        </span>
                        <span className="property-detail-auction-desktop-bids-item__time">
                          {formatMobileBidDateTime(bid.created_at)}
                        </span>
                      </div>
                    </div>
                    <span className="property-detail-auction-desktop-bids-item__amount">
                      {fmtBidPrice(bid.bid_amount)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    )
  }

  const renderDesktopAuctionSidebar = () => (
    <div className="property-detail-auction-desktop" ref={auctionDesktopBidPanelRef}>
      <div className="property-detail-auction-desktop__sticky">
        <div className="property-detail-auction-desktop__bid-panel">
          {auctionEndTime ? (
            <div className="property-detail-auction-desktop__timer">
              {isReservedActive ? (
                <div className="property-detail-mobile-about-timer__reserved">
                  <FiLock size={18} aria-hidden />
                  <span>{t('propertyDetailBidsPaused')}</span>
                </div>
              ) : !auctionEndedForSidebar ? (
                renderAuctionTimerVisual()
              ) : (
                <div
                  className="auction-completed-banner auction-completed-banner--page"
                  role="status"
                >
                  {t('propertyDetailAuctionCompleted')}
                </div>
              )}
            </div>
          ) : null}

          {!auctionEndedForSidebar ? renderMobileAboutBidSummary({ desktopPanel: true }) : null}
          {renderAuctionEndedState()}

          {!auctionEndedForSidebar ? (
            <div className="property-detail-sidebar__auction-block property-detail-auction-desktop__leaders">
              {renderAuctionLeaderCards()}
            </div>
          ) : null}

          {!auctionEndedForSidebar ? (
            <div className="property-detail-sidebar__auction-bid-stack property-detail-auction-desktop__bid-stack">
              <PropertyDetailAuctionBiddingForm
                {...auctionBiddingFormProps}
                showCurrencySelector
                alwaysShowCurrentBid={false}
                suppressCurrentBidDisplay
              />
            </div>
          ) : null}

          {renderAuctionBuyNowBlock()}
          {renderAuctionWinnerPurchaseButton()}
        </div>
      </div>
    </div>
  )

  return (
    <div
      className={`property-detail-page-new${
        isAuctionProperty
          ? ` property-detail-page-new--auction-mobile-v2 property-detail-page-new--auction property-detail-mobile-tab-${auctionMobileTab}${
              isMobileBidBarNearFooter ? ' property-detail-page-new--bid-bar-hidden' : ''
            }${isBidDrawerOpen ? ' property-detail-page-new--bid-drawer-open' : ''}`
          : ''
      }`}
    >
      {showConfetti && (
        <>
          <div className="winner-celebration-confetti" aria-hidden>
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={confettiRecycle}
              numberOfPieces={500}
              gravity={0.1}
              wind={0.02}
              colors={['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#fbbf24']}
              confettiSource={{
                x: 0,
                y: 0,
                w: windowSize.width,
                h: 0,
              }}
              initialVelocityX={4}
              initialVelocityY={6}
              tweenDuration={10000}
              onConfettiComplete={() => setShowConfetti(false)}
            />
          </div>
          {showWinnerModal && (
            <div className="winner-celebration">
              <div className="winner-celebration__panel">
                <div
                  className="winner-celebration__message winner-celebration__message--awards"
                  role="dialog"
                  aria-modal="true"
                  aria-label={t('auctionWinModalTitle')}
                >
                  <div className="winner-celebration__award-shell">
                    <Awards
                      variant="award"
                      title={t('auctionWinModalTitle')}
                      subtitle={t('auctionWinModalSubtitle')}
                      recipient={auctionWinCelebrationText.recipientText}
                      date={auctionWinCelebrationText.dateLine}
                    />
                    <button
                      type="button"
                      className="winner-celebration__purchase-btn"
                      onClick={() => {
                        setShowWinnerModal(false)
                        setConfettiRecycle(false)
                        openBuyNowModal('auctionWinner')
                      }}
                      disabled={isReservedActive || !buyNowEmailOk}
                      title={!buyNowEmailOk ? t('buyNowEmailRequired') : undefined}
                      style={{
                        opacity: isReservedActive || !buyNowEmailOk ? 0.5 : 1,
                        cursor:
                          isReservedActive || !buyNowEmailOk
                            ? 'not-allowed'
                            : 'pointer',
                      }}
                    >
                      {t('auctionWinModalClose')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {outbidNotification && (
        <BidOutbidNotification
          notification={outbidNotification}
          onClose={handleCloseOutbidNotification}
          onGoToProperty={handleGoToPropertyFromNotification}
        />
      )}
      {isAuctionProperty ? renderAuctionMobileHeader() : null}
      {/* Заголовок (на мобильном аукционе скрыт — «Назад» в галерее) */}
      <div
        className={`property-detail-header${
          isAuctionProperty ? ' property-detail-header--auction-desktop' : ''
        }${
          isAuctionProperty && !isAuctionDesktopTitleVisible
            ? ' property-detail-header--auction-title-sticky'
            : ''
        }`}
      >
        <div className="property-detail-header__container">
          <PageBackButton onClick={handleBackClick} />
          {isAuctionProperty ? (
            <div
              className={`property-detail-header__auction-title${
                !isAuctionDesktopTitleVisible ? ' is-visible' : ''
              }`}
              aria-hidden={isAuctionDesktopTitleVisible}
            >
              <span className="property-detail-header__auction-title-text">{propertyInfo}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Баннер резервации */}
      {(() => {
        if (!displayProperty) return false;
        const isReserved = displayProperty.is_reserved === true || displayProperty.is_reserved === 1 || displayProperty.is_reserved === 'true';
        const reservedUntil = displayProperty.reserved_until ? new Date(displayProperty.reserved_until) : null;
        const isValid = isReserved && reservedUntil && reservedUntil > new Date();
        
        console.log('🔍 PropertyDetailClassic - Проверка баннера:', {
          displayProperty_exists: !!displayProperty,
          is_reserved: displayProperty.is_reserved,
          isReserved: isReserved,
          reserved_until: displayProperty.reserved_until,
          reservedUntil: reservedUntil ? reservedUntil.toISOString() : null,
          now: new Date().toISOString(),
          isValid: isValid,
          hoursRemaining: isValid && reservedUntil ? Math.ceil((reservedUntil - new Date()) / (1000 * 60 * 60)) : 0
        });
        
        return isValid;
      })() && null}

      {/* Основной контент */}
      <div className="property-detail-main">
        <div className="property-detail-main__container">
          {/* Левая колонка - обёртка для галереи и информации */}
          <div
            className={`property-detail-left-column${
              isAuctionProperty ? ' property-detail-auction-left-column' : ''
            }`}
          >
            {isAuctionProperty ? renderDesktopAuctionHeroGallery() : null}
            {isAuctionProperty ? renderDesktopAuctionHead() : null}
            {isAuctionProperty ? renderAuctionContentTabs({ desktop: true }) : null}

            {isAuctionProperty ? (
              <div className="property-detail-auction-tab-target property-detail-auction-tab-target--gallery property-detail-auction-desktop-gallery-panel property-detail-auction-desktop-only">
                {renderDesktopGalleryTab()}
              </div>
            ) : null}

            {/* Галерея (мобильная; на десктопе аукциона — компактный hero выше) */}
            <div
              className={`property-detail-gallery${
                isReservedActive ? ' property-detail-gallery--reserved' : ''
              }${isAuctionProperty ? ' property-detail-auction-mobile-gallery' : ''}`}
            >
              <div
                className="property-detail-gallery__main"
                {...gallerySwipeHandlers}
              >
                {currentMedia && (
                  currentMedia.type === 'video' ? (
                    <div style={{ width: '100%', height: '100%', position: 'relative', paddingBottom: '56.25%', backgroundColor: '#000' }}>
                      <iframe
                        src={
                          currentMedia.videoType === 'youtube' 
                            ? getYouTubeEmbedUrl(currentMedia.videoId || currentMedia.url)
                            : currentMedia.videoType === 'googledrive'
                              ? getGoogleDriveEmbedUrl(currentMedia.videoId || currentMedia.url)
                              : currentMedia.url
                        }
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          borderRadius: '12px'
                        }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <img
                      src={currentMedia.url}
                      alt={displayProperty.name}
                      className="property-detail-gallery__main-image"
                    />
                  )
                )}
                {isReservedActive && (
                  <div className="property-detail-gallery__reserved-banner" aria-hidden>
                    <span className="property-detail-gallery__reserved-text">Забронировано</span>
                  </div>
                )}
                {/* Анимация изменения цены поверх изображения */}
                {priceAnimation && currentBid !== null && (
                  <div className="property-detail-gallery__price-overlay">
                    <div className="price-overlay__content">
                      <div className="price-overlay__label">Новая ставка</div>
                      <div className="price-overlay__value-wrapper">
                        <span className="price-overlay__value">{fmtPrice(currentBid)}</span>
                        <FiArrowUp className="price-overlay__arrow" size={24} />
                      </div>
                    </div>
                  </div>
                )}
                <div className="property-detail-gallery__toolbar property-detail-auction-mobile-only">
                  {isAuctionProperty && (
                    <PageBackButton
                      onClick={handleBackClick}
                      className="page-back-button--icon-only property-detail-gallery__toolbar-back"
                      iconSize={20}
                    />
                  )}
                  <div className="property-detail-gallery__toolbar-actions">
                    {isAuctionProperty ? renderAuctionMobileToolbarActions() : null}
                  </div>
                </div>
                {isAuctionProperty && auctionGalleryStripItems.length > 0 && (
                  <div className="property-detail-gallery__thumb-strip">
                    {auctionGalleryStripItems.map(({ media, index, moreCount }) => (
                      <button
                        key={index}
                        type="button"
                        className={`property-detail-gallery__thumb-strip-item${
                          currentImageIndex === index
                            ? ' property-detail-gallery__thumb-strip-item--active'
                            : ''
                        }`}
                        onClick={() => handleThumbnailClick(index)}
                        aria-label={`${t('gallery') || 'Gallery'} ${index + 1}`}
                      >
                        {media.type === 'video' ? (
                          media.thumbnail ? (
                            <img src={media.thumbnail} alt="" />
                          ) : (
                            <span className="property-detail-gallery__thumb-strip-video">▶</span>
                          )
                        ) : (
                          <img src={media.url} alt="" />
                        )}
                        {moreCount > 0 && (
                          <span className="property-detail-gallery__thumb-strip-more">
                            +{moreCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {galleryMedia.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="property-detail-gallery__nav property-detail-gallery__nav--prev"
                      onClick={handlePreviousImage}
                      disabled={isReservedActive}
                      aria-label={t('previousImage') || 'Предыдущее фото'}
                    >
                      <FiChevronLeft size={24} />
                    </button>
                    <button
                      type="button"
                      className="property-detail-gallery__nav property-detail-gallery__nav--next"
                      onClick={handleNextImage}
                      disabled={isReservedActive}
                      aria-label={t('nextImage') || 'Следующее фото'}
                    >
                      <FiChevronRight size={24} />
                    </button>
                    <div className="property-detail-gallery__counter">
                      {currentImageIndex + 1} / {galleryMedia.length}
                    </div>
                  </>
                )}
                <div className="property-detail-gallery__actions">
                  <button
                    type="button"
                    className="property-detail-gallery__action-btn"
                    onClick={handleShare}
                    disabled={isReservedActive}
                    aria-label={t('share') || 'Поделиться'}
                  >
                    <FiShare2 size={20} />
                  </button>
                  {isAuctionProperty &&
                    !shouldShowCircularAuctionTimer(displayProperty) &&
                    auctionEndTime &&
                    !timerExpired &&
                    !isBuyNowSaleCompleted &&
                    !isReservedActive &&
                    hasDbBackedProperty(displayProperty) && (
                      <button
                        type="button"
                        className="property-detail-gallery__action-btn"
                        onClick={() => setAuctionReminderOpen(true)}
                        aria-label={t('auctionReminderButton')}
                      >
                        <Bell size={20} strokeWidth={2.25} />
                      </button>
                    )}
                  <button
                    type="button"
                    className={`property-detail-gallery__action-btn ${
                      isFavorite ? 'property-detail-gallery__action-btn--active' : ''
                    }`}
                    onClick={handleToggleFavorite}
                    disabled={isReservedActive}
                    aria-label={t('addToFavorites') || 'В избранное'}
                  >
                    {isFavorite ? <FaHeartSolid size={20} /> : <FiHeart size={20} />}
                  </button>
                </div>
              </div>

              {galleryMedia.length > 0 && (
                <div className="property-detail-gallery__thumbnails-wrapper">
                  <div className="property-detail-gallery__thumbnails" ref={thumbnailScrollRef}>
                    {galleryMedia.map((media, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`property-detail-gallery__thumbnail ${
                          currentImageIndex === index
                            ? 'property-detail-gallery__thumbnail--active'
                            : ''
                        }`}
                        onClick={() => handleThumbnailClick(index)}
                      >
                        {media.type === 'video' ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            {media.thumbnail ? (
                              <img src={media.thumbnail} alt={`Видео ${index + 1}`} />
                            ) : (
                              <div style={{ 
                                width: '100%', 
                                height: '100%', 
                                backgroundColor: '#000', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '12px'
                              }}>
                                ▶ Видео
                              </div>
                            )}
                          </div>
                        ) : (
                          <img src={media.url} alt={`${displayProperty.name} ${index + 1}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className={
                isAuctionProperty
                  ? 'property-detail-auction-tab-target property-detail-auction-tab-target--about'
                  : undefined
              }
            >
            {isAuctionProperty ? (
              <>
                <div className="property-detail-auction-desktop-only">
                  {renderDesktopAuctionAboutContent()}
                </div>
                <div className="property-detail-auction-mobile-about-left">
                  <div className="property-detail-info-section property-detail-info-section--auction-sheet">
                    {renderPropertyMainDetailsBlock()}
                    {renderPropertyAdditionalDetailsBlock()}
                    {renderPropertyAmenitiesBlock()}
                    {(() => {
                      const additionalInfo =
                        displayProperty.additional_amenities ||
                        property.additional_amenities ||
                        property.additionalAmenities ||
                        null
                      const hasAdditionalInfo =
                        additionalInfo !== null &&
                        additionalInfo !== undefined &&
                        String(additionalInfo).trim() !== ''
                      return hasAdditionalInfo ? (
                        <div className="property-detail-info-block">
                          <h3 className="property-detail-info-block__title">
                            {t('propertyDetailAdditionalAmenitiesTitle')}
                          </h3>
                          <div className="property-detail-info-block__content property-detail-info-block__content--text">
                            <p>{String(additionalInfo)}</p>
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                  <div className="property-detail-extra-text-mobile property-detail-extra-text-mobile--auction-sheet">
                    {displayProperty.description && (
                      <>
                        <h3 className="property-detail-extra-text-title">Описание</h3>
                        <p className="property-detail-extra-description">
                          {displayProperty.description}
                        </p>
                      </>
                    )}
                  </div>
                  {renderMobileAuctionTestDriveBlock()}
                </div>
              </>
            ) : (
              <>
            {/* Блок с подробной информацией об объекте - под галереей */}
            <div className="property-detail-info-section">
              {renderPropertyMainDetailsBlock()}
              {renderPropertyAdditionalDetailsBlock()}

              {renderPropertyAmenitiesBlock()}

              {/* Дополнительная информация (текст, который пользователь написал сам) */}
              {(() => {
                // Получаем additional_amenities из разных источников
                const additionalInfo = displayProperty.additional_amenities || 
                                      property.additional_amenities || 
                                      property.additionalAmenities ||
                                      null
                
                // Проверяем, что это не null, не undefined, и не пустая строка
                const hasAdditionalInfo = additionalInfo !== null && 
                                         additionalInfo !== undefined && 
                                         String(additionalInfo).trim() !== ''
                
                return hasAdditionalInfo ? (
                  <div className="property-detail-info-block">
                    <h3 className="property-detail-info-block__title">{t('propertyDetailAdditionalAmenitiesTitle')}</h3>
                    <div className="property-detail-info-block__content property-detail-info-block__content--text">
                      <p>{String(additionalInfo)}</p>
                    </div>
                  </div>
                ) : null
              })()}

              {!isDebtProperty &&
                hasAuctionBuyNowListingForm(displayProperty) &&
                (property.test_drive === 1 ||
                  property.test_drive === true ||
                  property.test_drive === '1') && (
                  <TestDriveSection
                    propertyId={displayProperty.id}
                    propertyTable={
                      property.source_table ||
                      displayProperty.source_table ||
                      'properties_apartments'
                    }
                    hasTestDrive
                    i18nLang={currentLang}
                  />
                )}
            </div>

            {/* Описание и адрес — отдельный блок под подробной информацией (для мобилки, на десктопе скрыт через CSS) */}
            <div className="property-detail-extra-text-mobile">
              {displayProperty.description && (
                <>
                  <h3 className="property-detail-extra-text-title">Описание</h3>
                  <p className="property-detail-extra-description">
                    {displayProperty.description}
                  </p>
                </>
              )}
            </div>

            {renderMobileAuctionListingMeta()}
              </>
            )}
            </div>

            {/* Карта — для неаукционных объектов */}
            {!isAuctionProperty ? (
            <div className="property-detail-map-mobile">
              <div className="property-detail-sidebar__map">
                <h2 className="property-detail-sidebar__map-title">
                  {displayProperty.location || t('location') || 'Местоположение'}
                </h2>
                <div className="property-detail-sidebar__map-container">
                  {typeof window !== 'undefined' && (
                    <>
                      <LocationMap
                        center={finalCoordinates}
                        zoom={
                          finalCoordinates &&
                          finalCoordinates[0] !== 53.9045 &&
                          finalCoordinates[1] !== 27.5615
                            ? 15
                            : undefined
                        }
                        marker={
                          finalCoordinates &&
                          finalCoordinates[0] !== 53.9045 &&
                          finalCoordinates[1] !== 27.5615
                            ? finalCoordinates
                            : null
                        }
                      />
                      {isGeocoding && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(255, 255, 255, 0.95)',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            zIndex: 1000,
                            fontSize: '14px',
                            color: '#4b5563',
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          Поиск местоположения...
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            ) : null}

            {isAuctionProperty ? (
              <div className="property-detail-map-mobile property-detail-map-mobile--auction-sheet property-detail-auction-tab-target property-detail-auction-tab-target--about property-detail-auction-mobile-about-left">
                <div className="property-detail-sidebar__map">
                  <h2 className="property-detail-sidebar__map-title">
                    {displayProperty.location || t('location') || 'Местоположение'}
                  </h2>
                  <div className="property-detail-sidebar__map-container">
                    {typeof window !== 'undefined' && (
                      <>
                        <LocationMap
                          center={finalCoordinates}
                          zoom={
                            finalCoordinates &&
                            finalCoordinates[0] !== 53.9045 &&
                            finalCoordinates[1] !== 27.5615
                              ? 15
                              : undefined
                          }
                          marker={
                            finalCoordinates &&
                            finalCoordinates[0] !== 53.9045 &&
                            finalCoordinates[1] !== 27.5615
                              ? finalCoordinates
                              : null
                          }
                        />
                        {isGeocoding && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              background: 'rgba(255, 255, 255, 0.95)',
                              padding: '12px 20px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                              zIndex: 1000,
                              fontSize: '14px',
                              color: '#4b5563',
                              fontFamily: 'Montserrat, sans-serif',
                              fontWeight: 500,
                            }}
                          >
                            Поиск местоположения...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {isAuctionProperty ? (
              <div className="property-detail-auction-tab-target property-detail-auction-tab-target--bids property-detail-auction-desktop-bids-target property-detail-auction-desktop-only">
                {renderDesktopBidsTab()}
              </div>
            ) : null}
          </div>

          {/* Правая колонка */}
          <div
            ref={isAuctionProperty ? auctionDesktopBidAnchorRef : undefined}
            className={`property-detail-sidebar${
              isAuctionProperty ? ' property-detail-sidebar--auction-mobile' : ''
            }`}
          >
            {isAuctionProperty ? renderDesktopAuctionSidebar() : null}

            <div
              className={`property-detail-sidebar__content${
                isAuctionProperty
                  ? ' property-detail-mobile-sheet property-detail-auction-mobile-only'
                  : ''
              }`}
            >
              {/* Название */}
              {isAuctionProperty ? (
                <div className="property-detail-mobile-sheet__head">
                  <div className="property-detail-mobile-sheet__badge-row">
                    <span className="property-detail-mobile-badge property-detail-mobile-badge--type">
                      {auctionPropertyTypeLabel}
                    </span>
                    {auctionEndTime && !auctionEndedForSidebar && (
                      <span className="property-detail-mobile-badge property-detail-mobile-badge--live">
                        {t('propertyDetailAuctionLive') || 'Live auction'}
                      </span>
                    )}
                  </div>
                  <h1
                    ref={auctionMobileTitleRef}
                    className="property-detail-sidebar__title property-detail-mobile-sheet__title"
                  >
                    {propertyInfo}
                  </h1>
                  {displayProperty.location ? (
                    <p className="property-detail-mobile-sheet__address">{displayProperty.location}</p>
                  ) : null}
                  {renderAuctionContentTabs()}
                </div>
              ) : (
                <h1 className="property-detail-sidebar__title">{propertyInfo}</h1>
              )}

              {isAuctionProperty && (
                <div
                  className={`property-detail-mobile-tab-panel property-detail-mobile-tab-panel--about${
                    auctionMobileTab === 'about' ? ' is-active' : ''
                  }`}
                >
                  {auctionEndTime && (
                    <div className="property-detail-mobile-about-timer">
                      {isReservedActive ? (
                        <div className="property-detail-mobile-about-timer__reserved">
                          <FiLock size={18} aria-hidden />
                          <span>{t('propertyDetailBidsPaused')}</span>
                        </div>
                      ) : auctionEndedForSidebar ? (
                        <p className="property-detail-mobile-about-timer__ended" role="status">
                          {t('propertyDetailAuctionCompleted')}
                        </p>
                      ) : (
                        renderAuctionTimerVisual()
                      )}
                    </div>
                  )}
                  {auctionEndTime && !isReservedActive && !auctionEndedForSidebar && (
                    renderMobileAboutBidSummary()
                  )}
                  {renderAuctionBuyNowBlock({ variant: 'mobile-about' })}
                  {renderMobileAboutPropertyContent()}
                </div>
              )}

              {isAuctionProperty && (
                <div
                  className={`property-detail-mobile-tab-panel property-detail-mobile-tab-panel--gallery${
                    auctionMobileTab === 'gallery' ? ' is-active' : ''
                  }`}
                >
                  {renderMobileGalleryTab()}
                </div>
              )}

              <div
                className={
                  isAuctionProperty ? 'property-detail-currency--auction-sidebar-top' : undefined
                }
              >
                <PropertyCurrencySelector
                  baseCurrency={currencyView.baseCurrency}
                  displayCurrency={currencyView.displayCurrency}
                  onChange={currencyView.setDisplayCurrency}
                  options={currencyView.options}
                  loading={currencyView.loading}
                  isConverted={currencyView.isConverted}
                />
              </div>

              {/* Цена для неаукционных объектов */}
              {!isAuctionProperty && displayProperty.price && Number(displayProperty.price) > 0 && (
                <>
                  <div className="property-detail-sidebar__price-block">
                    <span className="price-label">{t('propertyDetailPrice')}</span>
                    <span className="price-value">{fmtPrice(displayProperty.price)}</span>
                  </div>
                  <button
                    type="button"
                    className={`property-detail-sidebar__buy-now-btn${
                      paymentActionsLocked ? ' property-detail-sidebar__buy-now-btn--currency-preview' : ''
                    }`}
                    onClick={handleBookNow}
                    disabled={isReservedActive || !buyNowEmailOk}
                    title={!buyNowEmailOk ? t('buyNowEmailRequired') : undefined}
                    style={{
                      opacity: isReservedActive || !buyNowEmailOk ? 0.5 : 1,
                      cursor:
                        isReservedActive || !buyNowEmailOk || paymentActionsLocked
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {isReservedActive
                      ? t('objectReserved')
                      : t('buyNowSectionTitle')}
                  </button>
                </>
              )}

              {/* Описание */}
              {displayProperty.description && (
                <div className="property-detail-sidebar__description">
                  <p className="property-detail-sidebar__description-text">
                    {displayProperty.description}
                  </p>
                </div>
              )}

              {/* Блок риска и долговых обязательств — FlipCard */}
              {isDebtProperty && (() => {
                const sev = displayProperty.debt_severity
                const accentColor =
                  sev === 'red' ? '#DC2626' :
                  sev === 'yellow' ? '#CA8A04' :
                  '#16A34A'

                const riskIcon =
                  sev === 'red' ? ShieldQuestionMark :
                  sev === 'yellow' ? ShieldAlert :
                  ShieldCheck

                const riskTitle =
                  sev === 'red' ? 'Высокий риск' :
                  sev === 'yellow' ? 'Средний риск' :
                  'Низкий риск'

                const riskSubtitle =
                  sev === 'red' ? 'Красный — существенные задолженности' :
                  sev === 'yellow' ? 'Жёлтый — требуют времени и расходов' :
                  'Зелёный — технические и процедурные моменты'

                const riskDescription =
                  sev === 'red'
                    ? 'Существенные задолженности и/или ограничения. Перед покупкой потребуется глубокая юридическая и финансовая проверка.'
                    : sev === 'yellow'
                    ? 'Вопросы, которые могут потребовать времени и дополнительных расходов, но, как правило, решаемы при грамотном сопровождении.'
                    : 'В основном технические или процедурные вопросы, решаемые стандартными действиями при сделке.'

                const ctaText =
                  sev === 'red' ? 'Высокий шанс заработать' :
                  sev === 'yellow' ? 'Средний шанс заработать' :
                  'Стабильный шанс заработать'

                const debtFeatures = [
                  displayProperty.debt_utilities && 'Долги по коммунальным услугам',
                  displayProperty.debt_mortgage_pledge && 'Залог у банка',
                  displayProperty.debt_property_taxes && 'Неоплаченные налоги на имущество',
                  displayProperty.debt_arrest && 'Арест / ограничения',
                  displayProperty.debt_inherited && 'Долги наследодателя',
                  displayProperty.debt_third_party && 'Долги перед третьими лицами',
                  displayProperty.debt_other && displayProperty.debt_other,
                  displayProperty.debt_amount
                    ? `Сумма долга: ${fmtPrice(displayProperty.debt_amount)}`
                    : null,
                ].filter(Boolean)

                if (debtFeatures.length === 0) debtFeatures.push('Долговые обязательства уточняются')

                return (
                  <div className="property-detail-debt-risk-card">
                    <FlipCard
                      color={accentColor}
                      icon={riskIcon}
                      title={riskTitle}
                      subtitle={riskSubtitle}
                      description={riskDescription}
                      features={debtFeatures.slice(0, 4)}
                      ctaText={ctaText}
                      clickToFlip
                    />
                  </div>
                )
              })()}

              {/* Местоположение */}
              <div
                className={`property-detail-sidebar__location${
                  isAuctionProperty ? ' property-detail-sidebar__location--title-card' : ''
                }`}
              >
                <span>{displayProperty.location}</span>
              </div>

              {/* Блок таймера аукциона, текущей ставки и истории ставок.
                  Для долгов тоже показываем, чтобы UX был как у аукциона. */}
              {isAuctionProperty && auctionEndTime ? (
                <div
                  className={`property-detail-mobile-tab-panel property-detail-mobile-tab-panel--bids${
                    auctionMobileTab === 'bids' ? ' is-active' : ''
                  }`}
                >
                  {renderMobileBidsTab()}
                </div>
              ) : null}

              {/* Карта */}
              <div className="property-detail-sidebar__map">
                <h2 className="property-detail-sidebar__map-title">
                  {displayProperty.location || t('location') || 'Местоположение'}
                </h2>
                <div className="property-detail-sidebar__map-container">
                  {typeof window !== 'undefined' && (
                    <>
                      <LocationMap
                        center={finalCoordinates}
                        zoom={
                          finalCoordinates &&
                          finalCoordinates[0] !== 53.9045 &&
                          finalCoordinates[1] !== 27.5615
                            ? 15
                            : undefined
                        }
                        marker={
                          finalCoordinates &&
                          finalCoordinates[0] !== 53.9045 &&
                          finalCoordinates[1] !== 27.5615
                            ? finalCoordinates
                            : null
                        }
                      />
                      {isGeocoding && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(255, 255, 255, 0.95)',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            zIndex: 1000,
                            fontSize: '14px',
                            color: '#4b5563',
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 500,
                          }}
                        >
                          Поиск местоположения...
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* Документы - отдельный блок под property-detail-sidebar__content (только в кабинете продавца) */}
            {(onBack || showDocuments) && processedDocuments.length > 0 && (
              <div className="property-detail-sidebar__documents">
                <h3 className="property-detail-sidebar__documents-title">Документы</h3>
                <div className="property-detail-sidebar__documents-content">
                  {processedDocuments.map((doc, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedDocument(doc)}
                      className="property-detail-sidebar__document-item"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        padding: 0
                      }}
                    >
                      <FiFileText size={20} className="property-detail-sidebar__document-icon" />
                      <span className="property-detail-sidebar__document-name">{doc.name}</span>
                      <span className="property-detail-sidebar__document-type">
                        {doc.type === 'pdf' ? 'PDF' : 'Изображение'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно истории ставок для всех объектов */}
      <BiddingHistoryModal
        isOpen={isBidHistoryOpen}
        onClose={() => setIsBidHistoryOpen(false)}
        property={{
          id: displayProperty.id,
          title: propertyInfo,
          start_date: displayProperty.auction_start_date,
          end_date: displayProperty.auction_end_date,
          auction_starting_price: displayProperty.auction_starting_price,
          price: displayProperty.price,
          currentBid: currentBid || displayProperty.currentBid || (isAuctionProperty ? displayProperty.auction_starting_price : displayProperty.price) || 0
        }}
      />

      {/* Модальное окно с инструкциями по покупке */}
      {(() => {
        const minimumSalePriceForCheckout =
          Number(displayProperty.price) ||
          Number(displayProperty.auction_starting_price) ||
          Number(displayProperty.currentBid) ||
          Number(currentBid) ||
          0
        return (
      <BuyNowModal
        isOpen={isBuyNowModalOpen}
        onClose={() => {
          setIsBuyNowModalOpen(false)
          setBuyNowModalVariant('buyNow')
        }}
        variant={buyNowModalVariant}
        winningBidAmount={
          buyNowModalVariant === 'auctionWinner'
            ? (currentBid !== null
                ? currentBid
                : (displayProperty.currentBid ??
                  displayProperty.auction_starting_price ??
                  displayProperty.price ??
                  0))
            : undefined
        }
        stripeReturnPath={displayProperty?.id != null ? `/property/${displayProperty.id}` : '/'}
        property={{
          id: displayProperty.id,
          title: propertyInfo,
          name: propertyInfo,
          price: minimumSalePriceForCheckout,
          minimumSalePrice: minimumSalePriceForCheckout,
          currency: displayProperty.currency,
          property_type: displayProperty.property_type,
          isAuction: isAuctionProperty,
          currentBid: currentBid || displayProperty.currentBid || displayProperty.auction_starting_price || displayProperty.price
        }}
      />
        )
      })()}

      <AuctionReminderModal
        property={displayProperty}
        open={auctionReminderOpen}
        onClose={() => setAuctionReminderOpen(false)}
      />

      <AuctionBidCeilingModal
        open={bidCeilingOpen}
        onClose={() => setBidCeilingOpen(false)}
        property={displayProperty}
        propertyTable={propertySourceTable}
        userId={getStoredNumericUserId()}
        currentBid={currentBid}
        startingPrice={displayProperty?.auction_starting_price || 0}
        currencySymbol={currencyView.baseSymbol}
        fmtPrice={fmtBidPrice}
        onSaved={(data) => {
          setUserBidCeiling(data)
          showToast(t('auctionBidCeilingSaved'), 'success')
          void fetchUserBidCeiling()
        }}
        onError={(msg) => showToast(msg, 'error')}
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

      <TestDrivePromoDrawer
        isOpen={isTestDrivePromoOpen && shouldShowTestDrivePromo}
        onClose={dismissTestDrivePromo}
        onGoToSection={scrollToTestDriveSection}
      />

      {isAuctionProperty && (
        <div
          className={`property-detail-mobile-bottom-bar${
            isMobileBidBarNearFooter ? ' property-detail-mobile-bottom-bar--footer-near' : ''
          }`}
        >
          <div className="property-detail-mobile-bottom-bar__price">
            <span className="property-detail-mobile-bottom-bar__label">{auctionStickyPriceLabel}</span>
            <span className="property-detail-mobile-bottom-bar__value">{auctionStickyPriceValue}</span>
          </div>
          <button
            type="button"
            className="property-detail-mobile-bottom-bar__cta"
            onClick={() => setIsBidDrawerOpen(true)}
            disabled={auctionEndedForSidebar || isReservedActive}
          >
            {t('placeBid')}
          </button>
        </div>
      )}

      <AuctionBidDrawer
        isOpen={isBidDrawerOpen && isAuctionProperty}
        onClose={() => setIsBidDrawerOpen(false)}
        title={t('placeBid')}
      >
        <PropertyDetailAuctionBiddingForm
          {...auctionBiddingFormProps}
          showCurrencySelector
          alwaysShowCurrentBid
        />
      </AuctionBidDrawer>

      {/* Lightbox галереи (десктоп) */}
      {renderDesktopGalleryLightbox()}

      {/* Модальное окно для просмотра документа */}
      {selectedDocument && (
        <div
          className="property-detail-document-modal"
          onClick={() => setSelectedDocument(null)}
        >
          <div className="property-detail-document-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="property-detail-document-modal-close"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedDocument(null)
              }}
            >
              <FiXCircle size={32} strokeWidth={2} />
            </button>
            {selectedDocument.type === 'pdf' ? (
              <iframe
                src={`${selectedDocument.url}#toolbar=0`}
                className="property-detail-document-pdf"
                title={selectedDocument.name}
              />
            ) : (
              <img src={selectedDocument.url} alt={selectedDocument.name} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertyDetailClassic


