import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FiArrowLeft,
  FiShare2,
  FiHeart,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiUser,
  FiClock,
  FiArrowUp,
  FiXCircle,
  FiLock,
} from 'react-icons/fi'
import { FaHeart as FaHeartSolid } from 'react-icons/fa'
import { IoLocationOutline } from 'react-icons/io5'
import { isAuthenticated, getUserData, getStoredNumericUserId } from '../services/authService'
import PropertyTimer from '../components/PropertyTimer'
import CircularTimer from '../components/CircularTimer'
import BiddingHistoryModal from '../components/BiddingHistoryModal'
import BuyNowModal from '../components/BuyNowModal'
import AuctionReminderModal from '../components/AuctionReminderModal'
import LocationMap from '../components/LocationMap'
import { showToast } from '../components/ToastContainer'
import { showNotification } from '../utils/toastHelper'
import BidOutbidNotification from '../components/BidOutbidNotification'
import Confetti from 'react-confetti'
import './PropertyDetailClassic.css'

import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import { flagEmojiForStoredCountry } from '../utils/countryFlagFromStored'
import FlipCard from '../components/ui/FlipCard'
import TestDriveSection from '../components/TestDriveSection'
import { getAuctionMinBidStep } from '../utils/auctionBidStep'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import {
  getEffectiveAuctionEndTime,
  hasTestTimerDateString,
  shouldShowCircularAuctionTimer,
} from '../utils/auctionReminderBounds'
import { roleSkipsAuctionKyc } from '../utils/buyerAuctionKyc'
import { confirmPropertyReservationSession } from '../utils/subscriptionCheckout'
import { hasEmailForBuyNowFlow } from '../utils/buyNowEmailGate'
import { ShieldQuestionMark, ShieldAlert, ShieldCheck, Bell } from 'lucide-react'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const userData = getUserData()
  const [property, setProperty] = useState(initialProperty)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const thumbnailScrollRef = useRef(null)
  const [isBidHistoryOpen, setIsBidHistoryOpen] = useState(false)
  const [isBuyNowModalOpen, setIsBuyNowModalOpen] = useState(false)
  const [auctionReminderOpen, setAuctionReminderOpen] = useState(false)
  const [mapCoordinates, setMapCoordinates] = useState(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [currentBid, setCurrentBid] = useState(null)
  const [recentBids, setRecentBids] = useState([])
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
  const [showConfetti, setShowConfetti] = useState(false) // Флаг показа конфетти для победителя
  const confettiShownRef = useRef(false) // Ref для отслеживания, было ли показано конфетти
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })
  const [selectedDocument, setSelectedDocument] = useState(null) // Выбранный документ для просмотра
  const [processedDocuments, setProcessedDocuments] = useState([]) // Обработанные документы
  const [timerBidInfo, setTimerBidInfo] = useState(null) // Информация о ставке для отображения в таймере (флаг и номер)
  /** Объект хотя бы раз показывался с круговым таймером — не переключаемся на линейный после его окончания */
  const [hadCircularTimerAuction, setHadCircularTimerAuction] = useState(false)
  const shownLeaderInfoRef = useRef(null) // Ref для отслеживания, какому лидеру уже показывали информацию
  const reservationCheckoutHandledRef = useRef(null)
  /** После окончания аукциона не даём сбросить timerExpired, если сервер подставил другую дату окончания */
  const auctionFinishedLatchRef = useRef(false)
  /** Последняя известная дата кругового таймера (если API убрал test_timer_end_date) */
  const lastTestTimerEndRef = useRef(null)

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
        showNotification('Для просмотра страницы объекта необходимо авторизоваться')
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
      setShowConfetti(true);
      confettiShownRef.current = true;
      // Скрываем конфетти через 7 секунд
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [timerExpired, isUserLeader])


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
      if (!onBack && !showDocuments) {
        setProcessedDocuments([])
        return
      }

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
      
      // Справка об отсутствии долгов (не показываем для объектов с долгами)
      if (
        !isDebtProperty &&
        (displayProperty.no_debts_document || property.no_debts_document || property.noDebtsDocument)
      ) {
        const docUrl = displayProperty.no_debts_document || property.no_debts_document || property.noDebtsDocument
        if (docUrl) {
          const processedUrl = await processDocumentUrl(docUrl)
          console.log('📄 Справка об отсутствии долгов:', { original: docUrl, processed: processedUrl })
          docs.push({
            name: 'Справка об отсутствии долгов',
            url: processedUrl,
            type: getDocumentType(docUrl, 'Справка об отсутствии долгов')
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
  }

  useEffect(() => {
    if (thumbnailScrollRef.current) {
      const thumbnail = thumbnailScrollRef.current.children[currentImageIndex]
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [currentImageIndex])

  const propertyInfo = displayProperty.title || displayProperty.name

  const [isFavorite, setIsFavorite] = useState(false)
  const [auctionUserDeposit, setAuctionUserDeposit] = useState(0)
  const [auctionKycVerified, setAuctionKycVerified] = useState(null)

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

  const auctionEndTime = getEffectiveAuctionEndTime(displayProperty)

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
    auctionKycRequired && auctionUserDeposit > 0 && auctionKycVerified === false
  const disableAuctionBidFields = isReservedActive || kycBidBlocked

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
        showNotification('Войдите в аккаунт, чтобы завершить подтверждение резерва.')
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
              const propResponse = await fetch(`${base}/properties/${pid}?lang=${currentLang}`)
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

        const response = await fetch(`${API_BASE_URL}/bids/property/${displayProperty.id}`)
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
            
            // Сохраняем информацию о лидере
            setCurrentLeader({
              id: leaderBid.user_id,
              userId: leaderBid.user_id,
              userIdNumber: leaderBid.user_id_number,
              bidAmount: maxBid,
              bidDate: leaderBid.created_at
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
            
            setCurrentBid(prev => {
              if (prev !== maxBid) {
                setPrevBid(prev !== null ? prev : maxBid)
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
            const newRecentBids = sortedByDate.slice(0, 2)
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
  }, [displayProperty.id])

  // Периодически обновляем данные объекта с сервера для синхронизации таймера
  useEffect(() => {
    if (!displayProperty.id || !displayProperty.test_timer_end_date) return;

    const updatePropertyData = async () => {
      try {
        const propResponse = await fetch(`${API_BASE_URL}/properties/${displayProperty.id}?lang=${currentLang}`);
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
            const propResponse = await fetch(`${API_BASE_URL}/properties/${displayProperty.id}?lang=${currentLang}`);
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

  const handleToggleFavorite = () => {
    // Проверяем авторизацию через Clerk или старую систему
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    
    // Разрешаем удаление из избранного без авторизации, но добавление требует авторизации
    if (!isFavorite && !isClerkAuth && !isOldAuth) {
      showToast('Пожалуйста, войдите в систему, чтобы добавлять объявления в избранное', 'warning')
      return
    }
    
    setIsFavorite((prev) => !prev)
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

  const handleBookNow = () => {
    // Проверяем резервацию перед открытием модального окна
    if (isReservedActive) {
      showNotification('Объект временно забронирован. Покупка недоступна.')
      return
    }
    
    // Проверяем авторизацию
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    
    if (!isClerkAuth && !isOldAuth) {
      showToast('Пожалуйста, войдите в систему, чтобы купить объект', 'warning')
      return
    }
    
    // Проверяем, что пользователь не является продавцом
    const userRole = userData?.role || 'buyer'
    if (userRole === 'seller' || userRole === 'owner') {
      showNotification('Продавцы не могут покупать объекты')
      return
    }

    if (!buyNowEmailOk) {
      showToast(t('buyNowEmailRequired'), 'warning')
      return
    }
    
    // Открываем модальное окно с инструкциями
    setIsBuyNowModalOpen(true)
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
    // Проверяем авторизацию
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    
    if (!isClerkAuth && !isOldAuth) {
      showToast('Пожалуйста, войдите в систему, чтобы сделать ставку', 'warning')
      return
    }

    // Проверяем, что пользователь не является продавцом
    const userRole = userData?.role || 'buyer'
    if (userRole === 'seller' || userRole === 'owner') {
      showNotification('Продавцы не могут делать ставки на объекты')
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
      if (auctionUserDeposit <= 0) {
        showToast(t('propertyDetailBidDepositRequired'), 'error')
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
    const currentInput = parseFloat(bidAmount) || 0
    
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
    // Проверяем авторизацию
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    
    if (!isClerkAuth && !isOldAuth) {
      showToast('Пожалуйста, войдите в систему, чтобы сделать ставку', 'warning')
      return
    }

    // Проверяем, что пользователь не является продавцом
    const userRole = userData?.role || 'buyer'
    if (userRole === 'seller' || userRole === 'owner') {
      showNotification('Продавцы не могут делать ставки на объекты')
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
      if (auctionUserDeposit <= 0) {
        showToast(t('propertyDetailBidDepositRequired'), 'error')
        return
      }
      if (auctionKycVerified === false) {
        showToast(t('propertyDetailBidVerificationPending'), 'error')
        return
      }
    }

    const amount = parseFloat(bidAmount)
    if (!amount || isNaN(amount) || amount <= 0) {
      showToast('Пожалуйста, введите корректную сумму ставки', 'error')
      return
    }

    // Используем текущую максимальную ставку для проверки
    const startingPrice = isAuctionProperty 
      ? (displayProperty.auction_starting_price || 0)
      : (displayProperty.price || 0)
    const effectiveCurrentBid = currentBid !== null ? currentBid : (displayProperty.currentBid || startingPrice)
    
    // Получаем минимальный шаг из текущих значений кнопок
    const quickBidAmounts = getQuickBidAmounts()
    const minBidStep = quickBidAmounts[0] // Минимальный шаг - это первая кнопка
    const minimumBid = effectiveCurrentBid + minBidStep
    
    console.log('📤 handleBidSubmit:', {
      bidAmount,
      amount,
      currentBid,
      effectiveCurrentBid,
      startingPrice,
      minBidStep,
      minimumBid
    })
    
    if (amount < minimumBid) {
      showToast(`Минимальная ставка: ${minimumBid.toLocaleString('ru-RU')} (текущая ставка + ${minBidStep.toLocaleString('ru-RU')})`, 'error')
      return
    }

    setIsSubmittingBid(true)
    
    try {
      // Получаем user_id
      let userId = null
      
      if (isClerkAuth && user) {
        // Для Clerk - получаем внутренний user_id из БД
        // Сначала проверяем localStorage
        const savedUserId = localStorage.getItem('userId')
        if (savedUserId && /^\d+$/.test(savedUserId)) {
          userId = parseInt(savedUserId)
          console.log('📋 Используем user_id из localStorage:', userId)
        } else {
          // Пытаемся получить из БД по email или phone
          try {
            const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
            if (userEmail) {
              const userResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail)}`)
              if (userResponse.ok) {
                const userData = await userResponse.json()
                if (userData.success && userData.data && userData.data.id) {
                  userId = userData.data.id
                  localStorage.setItem('userId', String(userId))
                  console.log('✅ Найден user_id по email:', userId)
                }
              }
            }
            
            // Если не нашли по email, пробуем по телефону
            if (!userId) {
              const userPhone = user.primaryPhoneNumber?.phoneNumber || user.phoneNumbers?.[0]?.phoneNumber
              if (userPhone) {
                const phoneResponse = await fetch(`${API_BASE_URL}/users/phone/${encodeURIComponent(userPhone)}`)
                if (phoneResponse.ok) {
                  const phoneData = await phoneResponse.json()
                  if (phoneData.success && phoneData.data && phoneData.data.id) {
                    userId = phoneData.data.id
                    localStorage.setItem('userId', String(userId))
                    console.log('✅ Найден user_id по телефону:', userId)
                  }
                }
              }
            }
          } catch (e) {
            console.warn('⚠️ Не удалось получить user_id из БД:', e)
          }
        }
      } else if (isOldAuth) {
        // Для старой системы авторизации
        const { getUserData } = await import('../services/authService')
        const userData = getUserData()
        userId = userData?.id
        console.log('📋 Используем user_id из старой системы:', userId)
      }
      
      if (!userId) {
        console.error('❌ Не удалось определить user_id')
        showToast('Не удалось определить пользователя. Пожалуйста, войдите в систему.', 'error')
        setIsSubmittingBid(false)
        return
      }
      
      console.log('✅ Используем user_id:', userId)

      const requestBody = {
        user_id: parseInt(userId),
        property_id: parseInt(displayProperty.id),
        bid_amount: parseFloat(amount)
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
        console.log('✅ Ставка успешно создана на сервере:', data)
        // Сразу снимаем «Отправка…»: дальше могут быть долгие/зависшие запросы (тест-таймер, профиль).
        setIsSubmittingBid(false)

        window.dispatchEvent(
          new CustomEvent('syb-testdrive-refresh', { detail: { propertyId: displayProperty.id } })
        )
        setBidAmount('')

        const pid = displayProperty.id
        const lang = currentLang
        const timerDuration = originalTestTimerDuration
        const hasTestTimer = !!(displayProperty.test_timer_end_date && timerDuration !== null)

        void (async () => {
          if (!hasTestTimer) return
          console.log('🔄 Сброс тестового таймера до исходного значения (фон)')
          try {
            const now = new Date()
            const newEndDate = new Date(now.getTime() + timerDuration)
            const resetResponse = await fetch(`${API_BASE_URL}/properties/${pid}/test-timer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                test_timer_end_date: newEndDate.toISOString(),
                test_timer_duration: timerDuration,
              }),
            })
            if (!resetResponse.ok) {
              const errorData = await resetResponse.json().catch(() => ({}))
              console.error('❌ Ошибка при сбросе таймера на сервере:', errorData)
              return
            }
            const resetData = await resetResponse.json()
            if (!resetData.success) return
            console.log('✅ Тестовый таймер сброшен на сервере до исходного значения')
            setTimerExpired(false)
            try {
              const propResponse = await fetch(`${API_BASE_URL}/properties/${pid}?lang=${lang}`)
              if (!propResponse.ok) return
              const propData = await propResponse.json()
              if (propData.success && propData.data) {
                const updatedProp = propData.data
                setProperty((prev) => ({
                  ...prev,
                  test_timer_end_date:
                    updatedProp.test_timer_end_date && String(updatedProp.test_timer_end_date).trim() !== ''
                      ? updatedProp.test_timer_end_date
                      : prev.test_timer_end_date,
                  test_timer_duration: updatedProp.test_timer_duration || prev.test_timer_duration,
                }))
              }
            } catch (propError) {
              console.error('❌ Ошибка при обновлении данных объекта:', propError)
            }
          } catch (resetError) {
            console.error('❌ Ошибка при сбросе таймера:', resetError)
          }
        })()
        
        // Сохраняем ставку пользователя для проверки перебития
        setUserLastBid(amount)
        setBidOutbidShown(false) // Сбрасываем флаг при новой ставке
        
        // После создания ставки пользователь становится лидером (временно, до обновления с сервера)
        if (userId) {
          const userIdNum = parseInt(userId)
          // Временно устанавливаем пользователя как лидера
          setIsUserLeader(true)
          wasUserLeaderRef.current = true
          
          // Если пользователь стал новым лидером, показываем его информацию в таймере один раз
          if (currentLeaderId !== userIdNum && shownLeaderInfoRef.current !== userIdNum) {
            shownLeaderInfoRef.current = userIdNum // Помечаем, что показали информацию
            
            setCurrentLeaderId(userIdNum)
            console.log('✅ После создания ставки пользователь временно установлен как лидер:', userIdNum)
            
            void (async () => {
              try {
                const userResponse = await fetch(`${API_BASE_URL}/users/${userId}`)
                if (!userResponse.ok) return
                const userData = await userResponse.json()
                if (userData.success && userData.data) {
                  const u = userData.data
                  setTimerBidInfo({
                    country: u.country || '',
                    userIdNumber: u.user_id_number || userId,
                  })
                  setTimeout(() => setTimerBidInfo(null), 3000)
                }
              } catch (userError) {
                console.warn('⚠️ Не удалось получить данные пользователя для таймера:', userError)
              }
            })()
          } else {
            setCurrentLeaderId(userIdNum)
          }
        }
        // После новой ставки пользователь становится лидером
        wasUserLeaderRef.current = true
        // После успешной ставки пользователь становится лидером
        setPreviousLeaderId(userId)
        
        setPrevBid(currentBid !== null ? currentBid : amount)
        setCurrentBid(amount)
        console.log(`✅ Обновлена текущая ставка на: ${amount}`)
        
        // Перезагружаем данные через небольшую задержку для синхронизации с сервером
        setTimeout(async () => {
          try {
            const bidsResponse = await fetch(`${API_BASE_URL}/bids/property/${displayProperty.id}`)
            if (bidsResponse.ok) {
              const bidsData = await bidsResponse.json()
              if (bidsData.success && bidsData.data && bidsData.data.length > 0) {
                // Сортируем по дате для получения последних ставок
                const sortedByDate = [...bidsData.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                setRecentBids(sortedByDate.slice(0, 2))
                
                // Сортируем ставки для определения лидера
                const sortedBids = [...bidsData.data].sort((a, b) => {
                  if (b.bid_amount !== a.bid_amount) {
                    return b.bid_amount - a.bid_amount
                  }
                  return new Date(b.created_at) - new Date(a.created_at)
                })
                
                const maxBid = sortedBids[0].bid_amount
                const leaderBid = sortedBids[0]
                const newCurrentLeaderId = leaderBid.user_id
                
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
                
                // Обновляем информацию о лидере
                const previousLeaderIdSync = currentLeaderId
                setCurrentLeader({
                  id: leaderBid.user_id,
                  userId: leaderBid.user_id,
                  userIdNumber: leaderBid.user_id_number,
                  bidAmount: maxBid,
                  bidDate: leaderBid.created_at
                })
                setCurrentLeaderId(newCurrentLeaderId)
                
                // Если лидер изменился и мы еще не показывали информацию об этом лидере, получаем данные и показываем
                if (previousLeaderIdSync !== newCurrentLeaderId && leaderBid.user_id && shownLeaderInfoRef.current !== newCurrentLeaderId) {
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
                        
                        console.log('🏳️ Показан новый лидер в таймере (после синхронизации):', {
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
                
                setCurrentBid(prev => {
                  if (prev !== maxBid) {
                    setPrevBid(prev !== null ? prev : maxBid)
                    return maxBid
                  }
                  return prev
                })
                console.log(`✅ Обновлена текущая ставка после синхронизации: ${maxBid}`)
                
                // Обновляем userLastBid, если пользователь сделал ставку
                if (userId) {
                  const userBids = bidsData.data.filter(b => Number(b.user_id) === Number(userId))
                  if (userBids.length > 0) {
                    const userMaxBid = Math.max(...userBids.map(b => b.bid_amount))
                    setUserLastBid(userMaxBid)
                    setBidOutbidShown(false)
                    // Приводим к числу для корректного сравнения
                    const userIdNum = userId ? parseInt(userId) : null
                    const leaderIdNum = leaderBid.user_id ? parseInt(leaderBid.user_id) : null
                    const isUserLeaderNow = userIdNum && leaderIdNum && userIdNum === leaderIdNum
                    setIsUserLeader(isUserLeaderNow)
                    wasUserLeaderRef.current = isUserLeaderNow
                    if (isUserLeaderNow) {
                      console.log('✅ Пользователь является лидером после синхронизации:', { userId: userIdNum, leaderId: leaderIdNum })
                    }
                    console.log('✅ Обновлена userLastBid после синхронизации:', userMaxBid)
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Ошибка обновления ставок после создания:', err)
          }
        }, 1000)
        
        showToast(`Ставка ${amount.toLocaleString('ru-RU')} ${displayProperty.currency || 'USD'} успешно отправлена!`, 'success', 4000)
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
    const value = e.target.value.replace(/[^\d.]/g, '')
    setBidAmount(value)
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

  return (
    <div className="property-detail-page-new">
      {showConfetti && (
        <>
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={400}
            gravity={0.3}
            wind={0.05}
            colors={['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#fbbf24']}
            confettiSource={{
              x: windowSize.width / 2,
              y: windowSize.height / 2,
              w: 0,
              h: 0
            }}
            initialVelocityX={15}
            initialVelocityY={30}
            tweenDuration={7000}
          />
          <div className="winner-celebration">
            <div className="winner-celebration__balloons">
              <div className="balloon balloon--1">🎈</div>
              <div className="balloon balloon--2">🎈</div>
              <div className="balloon balloon--3">🎈</div>
              <div className="balloon balloon--4">🎈</div>
              <div className="balloon balloon--5">🎈</div>
              <div className="balloon balloon--6">🎈</div>
            </div>
            <div className="winner-celebration__emojis">
              <div className="celebration-emoji celebration-emoji--1">🎉</div>
              <div className="celebration-emoji celebration-emoji--2">🏆</div>
              <div className="celebration-emoji celebration-emoji--3">✨</div>
              <div className="celebration-emoji celebration-emoji--4">🎊</div>
              <div className="celebration-emoji celebration-emoji--5">🌟</div>
              <div className="celebration-emoji celebration-emoji--6">💫</div>
              <div className="celebration-emoji celebration-emoji--7">🎁</div>
              <div className="celebration-emoji celebration-emoji--8">🥳</div>
            </div>
            <div className="winner-celebration__message">
              <h2 className="winner-celebration__title">Объект Ваш!</h2>
              <p className="winner-celebration__subtitle">Вы выиграли аукцион! 🎉</p>
            </div>
          </div>
        </>
      )}
      {outbidNotification && (
        <BidOutbidNotification
          notification={outbidNotification}
          onClose={handleCloseOutbidNotification}
          onGoToProperty={handleGoToPropertyFromNotification}
        />
      )}
      {/* Заголовок */}
      <div className="property-detail-header">
        <div className="property-detail-header__container">
          <button
            type="button"
            className="property-detail-header__back"
            onClick={onBack || (() => window.history.back())}
          >
            <FiArrowLeft size={20} />
            <span>{t('back') || 'Назад'}</span>
          </button>
          <div className="property-detail-header__info">
            <span className="property-detail-header__path">
              {t('searchResults') || 'Результаты поиска'}
            </span>
            <span className="property-detail-header__separator">/</span>
            <span className="property-detail-header__property">{propertyInfo}</span>
          </div>
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
          <div className="property-detail-left-column">
            {/* Галерея */}
            <div
              className={`property-detail-gallery${isReservedActive ? ' property-detail-gallery--reserved' : ''}`}
            >
              <div className="property-detail-gallery__main">
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
                        <span className="price-overlay__value">
                          {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                          {currentBid.toLocaleString('ru-RU')}
                        </span>
                        <FiArrowUp className="price-overlay__arrow" size={24} />
                      </div>
                    </div>
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

            {/* Блок с подробной информацией об объекте - под галереей */}
            <div className="property-detail-info-section">
              {/* Подробная информация - показываем всегда */}
              <div className="property-detail-info-block">
                <h3 className="property-detail-info-block__title">{t('addPropertyDetailsTitle')}</h3>
                <div className="property-detail-info-block__content property-detail-info-block__content--horizontal">
                  {/* Для домов и вилл показываем специфичные поля */}
                  {(displayProperty.property_type === 'house' || displayProperty.property_type === 'villa') ? (
                    <>
                      {(displayProperty.land_area !== null && displayProperty.land_area !== undefined && displayProperty.land_area !== '' && Number(displayProperty.land_area) > 0) && (
                        <div className="property-detail-info-item property-detail-info-item--horizontal">
                          <span className="property-detail-info-label">{t('addPropertyDetailsLandAreaLabel')}:</span>
                          <span className="property-detail-info-value">
                            {displayProperty.land_area} м²
                          </span>
                        </div>
                      )}
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('addPropertyDetailsAreaLabel')}:</span>
                        <span className="property-detail-info-value">
                          {(displayProperty.area || displayProperty.sqft) ? `${displayProperty.area || displayProperty.sqft} м²` : '—'}
                        </span>
                      </div>
                      {(displayProperty.living_area !== null && displayProperty.living_area !== undefined && displayProperty.living_area !== '' && Number(displayProperty.living_area) > 0) && (
                        <div className="property-detail-info-item property-detail-info-item--horizontal">
                          <span className="property-detail-info-label">{t('addPropertyDetailsLivingAreaLabel')}:</span>
                          <span className="property-detail-info-value">
                            {displayProperty.living_area} м²
                          </span>
                        </div>
                      )}
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('addPropertyDetailsBedroomsLabel')}:</span>
                        <span className="property-detail-info-value">
                          {(displayProperty.bedrooms !== undefined && displayProperty.bedrooms !== null && displayProperty.bedrooms !== '') ? displayProperty.bedrooms : '—'}
                        </span>
                      </div>
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('addPropertyDetailsBathroomsShortLabel')}:</span>
                        <span className="property-detail-info-value">{displayProperty.bathrooms || '—'}</span>
                      </div>
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('addPropertyDetailsFloorsCountLabel')}:</span>
                        <span className="property-detail-info-value">
                          {(displayProperty.total_floors !== undefined && displayProperty.total_floors !== null) ? displayProperty.total_floors : '—'}
                        </span>
                      </div>
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('addPropertyDetailsBuildingMaterialLabel')}:</span>
                        <span className="property-detail-info-value">
                          {displayProperty.building_type ? (
                            displayProperty.building_type === 'monolithic' ? t('addPropertyDetailsBuildingMonolithic') :
                            displayProperty.building_type === 'brick' ? t('addPropertyDetailsBuildingBrick') :
                            displayProperty.building_type === 'panel' ? t('addPropertyDetailsBuildingPanel') :
                            displayProperty.building_type === 'block' ? t('addPropertyDetailsBuildingBlock') :
                            displayProperty.building_type === 'wood' ? t('addPropertyDetailsBuildingWood') :
                            displayProperty.building_type === 'frame' ? t('addPropertyDetailsBuildingFrame') :
                            displayProperty.building_type === 'aerated_concrete' ? t('addPropertyDetailsBuildingAerated') :
                            displayProperty.building_type === 'foam_concrete' ? t('addPropertyDetailsBuildingFoam') :
                            displayProperty.building_type === 'other' ? t('addPropertyDetailsBuildingOther') :
                            displayProperty.building_type
                          ) : '—'}
                        </span>
                      </div>
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('addPropertyDetailsYearBuiltLabel')}:</span>
                        <span className="property-detail-info-value">
                          {(displayProperty.year_built !== undefined && displayProperty.year_built !== null) ? displayProperty.year_built : '—'}
                        </span>
                      </div>
                      {!isDebtProperty && (
                        <div className="property-detail-info-item property-detail-info-item--horizontal">
                          <span className="property-detail-info-label">{t('propertyDetailTestDriveLabel')}:</span>
                          <span className="property-detail-info-value">
                            {(() => {
                              const testDriveValue = displayProperty.test_drive;
                              const isTestDrive = testDriveValue === 1 || testDriveValue === true || displayProperty.testDrive === true;
                              return isTestDrive ? t('propertyDetailYes') : t('propertyDetailNo');
                            })()}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Для квартир и апартаментов показываем стандартные поля */
                    <>
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('propertyDetailRoomsLabel')}:</span>
                        <span className="property-detail-info-value">
                          {displayProperty.rooms || displayProperty.beds || displayProperty.bedrooms || '—'}
                        </span>
                      </div>
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('addPropertyDetailsAreaLabel')}:</span>
                        <span className="property-detail-info-value">
                          {(displayProperty.area || displayProperty.sqft) ? `${displayProperty.area || displayProperty.sqft} м²` : '—'}
                        </span>
                      </div>
                      {(displayProperty.living_area !== null && displayProperty.living_area !== undefined && displayProperty.living_area !== '' && Number(displayProperty.living_area) > 0) && (
                        <div className="property-detail-info-item property-detail-info-item--horizontal">
                          <span className="property-detail-info-label">{t('addPropertyDetailsLivingAreaLabel')}:</span>
                          <span className="property-detail-info-value">
                            {displayProperty.living_area} м²
                          </span>
                        </div>
                      )}
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('addPropertyDetailsBathroomsShortLabel')}:</span>
                        <span className="property-detail-info-value">{displayProperty.bathrooms || '—'}</span>
                      </div>
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('propertyDetailFloorLabel')}:</span>
                        <span className="property-detail-info-value">
                          {(displayProperty.floor !== undefined && displayProperty.floor !== null) ? displayProperty.floor : '—'}
                        </span>
                      </div>
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('propertyDetailTotalFloorsShort')}:</span>
                        <span className="property-detail-info-value">
                          {(displayProperty.total_floors !== undefined && displayProperty.total_floors !== null) ? displayProperty.total_floors : '—'}
                        </span>
                      </div>
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('propertyDetailBuildingTypeShort')}:</span>
                        <span className="property-detail-info-value">
                          {displayProperty.building_type ? (
                            displayProperty.building_type === 'monolithic' ? t('addPropertyDetailsBuildingMonolithic') :
                            displayProperty.building_type === 'brick' ? t('addPropertyDetailsBuildingBrick') :
                            displayProperty.building_type === 'panel' ? t('addPropertyDetailsBuildingPanel') :
                            displayProperty.building_type === 'block' ? t('addPropertyDetailsBuildingBlock') :
                            displayProperty.building_type === 'wood' ? t('addPropertyDetailsBuildingWood') :
                            displayProperty.building_type === 'frame' ? t('addPropertyDetailsBuildingFrame') :
                            displayProperty.building_type === 'aerated_concrete' ? t('addPropertyDetailsBuildingAerated') :
                            displayProperty.building_type === 'foam_concrete' ? t('addPropertyDetailsBuildingFoam') :
                            displayProperty.building_type === 'other' ? t('addPropertyDetailsBuildingOther') :
                            displayProperty.building_type
                          ) : '—'}
                        </span>
                      </div>
                      <div className="property-detail-info-item property-detail-info-item--horizontal">
                        <span className="property-detail-info-label">{t('addPropertyDetailsYearBuiltLabel')}:</span>
                        <span className="property-detail-info-value">
                          {(displayProperty.year_built !== undefined && displayProperty.year_built !== null) ? displayProperty.year_built : '—'}
                        </span>
                      </div>
                      {!isDebtProperty && (
                        <div className="property-detail-info-item property-detail-info-item--horizontal">
                          <span className="property-detail-info-label">{t('propertyDetailTestDriveLabel')}:</span>
                          <span className="property-detail-info-value">
                            {(() => {
                              const testDriveValue = displayProperty.test_drive;
                              const isTestDrive = testDriveValue === 1 || testDriveValue === true || displayProperty.testDrive === true;
                              return isTestDrive ? t('propertyDetailYes') : t('propertyDetailNo');
                            })()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Дополнительная информация - показываем если есть данные */}
              {((displayProperty.renovation !== undefined && displayProperty.renovation !== null && displayProperty.renovation !== '') || 
                (displayProperty.condition !== undefined && displayProperty.condition !== null && displayProperty.condition !== '') || 
                (displayProperty.heating !== undefined && displayProperty.heating !== null && displayProperty.heating !== '') || 
                (displayProperty.water_supply !== undefined && displayProperty.water_supply !== null && displayProperty.water_supply !== '') || 
                (displayProperty.sewerage !== undefined && displayProperty.sewerage !== null && displayProperty.sewerage !== '') || 
                (displayProperty.commercial_type !== undefined && displayProperty.commercial_type !== null && displayProperty.commercial_type !== '') || 
                (displayProperty.business_hours !== undefined && displayProperty.business_hours !== null && displayProperty.business_hours !== '')) && (
                <div className="property-detail-info-block">
                  <h3 className="property-detail-info-block__title">{t('propertyDetailAdditionalInfoTitle')}</h3>
                  <div className="property-detail-info-block__content property-detail-info-block__content--grid">
                    {displayProperty.renovation && (
                      <div className="property-detail-info-item">
                        <span className="property-detail-info-label">{t('propertyDetailRenovation')}:</span>
                        <span className="property-detail-info-value">{displayProperty.renovation}</span>
                      </div>
                    )}
                    {displayProperty.condition && (
                      <div className="property-detail-info-item">
                        <span className="property-detail-info-label">{t('propertyDetailCondition')}:</span>
                        <span className="property-detail-info-value">{displayProperty.condition}</span>
                      </div>
                    )}
                    {displayProperty.heating && (
                      <div className="property-detail-info-item">
                        <span className="property-detail-info-label">{t('propertyDetailHeating')}:</span>
                        <span className="property-detail-info-value">{displayProperty.heating}</span>
                      </div>
                    )}
                    {displayProperty.water_supply && (
                      <div className="property-detail-info-item">
                        <span className="property-detail-info-label">{t('propertyDetailWaterSupply')}:</span>
                        <span className="property-detail-info-value">{displayProperty.water_supply}</span>
                      </div>
                    )}
                    {displayProperty.sewerage && (
                      <div className="property-detail-info-item">
                        <span className="property-detail-info-label">{t('propertyDetailSewerage')}:</span>
                        <span className="property-detail-info-value">{displayProperty.sewerage}</span>
                      </div>
                    )}
                    {displayProperty.commercial_type && (
                      <div className="property-detail-info-item">
                        <span className="property-detail-info-label">{t('propertyDetailCommercialType')}:</span>
                        <span className="property-detail-info-value">{displayProperty.commercial_type}</span>
                      </div>
                    )}
                    {displayProperty.business_hours && (
                      <div className="property-detail-info-item">
                        <span className="property-detail-info-label">{t('propertyDetailBusinessHours')}:</span>
                        <span className="property-detail-info-value">{displayProperty.business_hours}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Удобства - красивый горизонтальный блок (для обычных объектов, не долгов) */}
              {!isDebtProperty && (
                <div className="property-detail-info-block">
                  <h3 className="property-detail-info-block__title">{t('propertyDetailAmenitiesTitle')}</h3>
                  <div className="property-detail-info-block__content property-detail-info-block__content--amenities">
                    {(() => {
                    // Маппинг ключей i18n для feature полей
                    const featureLabelKeys = {
                      feature1: 'addPropertyAmenitiesUndergroundParking',
                      feature2: 'addPropertyAmenitiesKitchenFurniture',
                      feature3: 'addPropertyAmenitiesWashingMachine',
                      feature4: 'addPropertyAmenitiesDishwasher',
                      feature5: 'addPropertyAmenitiesIntercom',
                      feature6: 'addPropertyAmenitiesCctv',
                      feature7: 'addPropertyAmenitiesLoggia',
                      feature8: 'addPropertyAmenitiesStorage',
                      feature9: 'propertyDetailFeature9',
                      feature10: 'propertyDetailFeature10',
                      feature11: 'propertyDetailFeature11',
                      feature12: 'addPropertyAmenitiesBikeParking',
                      feature13: 'propertyDetailFeature13',
                      feature14: 'propertyDetailFeature14',
                      feature15: 'propertyDetailFeature15',
                      feature16: 'addPropertyAmenitiesVideoIntercom',
                      feature17: 'addPropertyAmenitiesConcierge',
                      feature18: 'addPropertyAmenitiesWardrobe',
                      feature19: 'propertyDetailFeature19',
                      feature20: 'propertyDetailFeature20',
                      feature21: 'propertyDetailFeature21',
                      feature22: 'propertyDetailFeature22',
                      feature23: 'propertyDetailFeature23',
                      feature24: 'propertyDetailFeature24',
                      feature25: 'propertyDetailFeature25',
                      feature26: 'propertyDetailFeature26'
                    }
                    const mainAmenityKeys = {
                      balcony: 'addPropertyAmenitiesBalcony',
                      parking: 'addPropertyAmenitiesCategoryParking',
                      elevator: 'addPropertyAmenitiesElevator',
                      garage: 'propertyDetailAmenityGarage',
                      pool: 'propertyDetailAmenityPool',
                      garden: 'propertyDetailAmenityGarden',
                      electricity: 'propertyDetailAmenityElectricity',
                      internet: 'addPropertyAmenitiesInternet',
                      security: 'addPropertyAmenitiesSecurity',
                      furniture: 'addPropertyAmenitiesCategoryFurniture'
                    }
                    const amenities = []
                    const amenitiesArray = property.amenities || displayProperty.amenities || []
                    const isAmenitiesArray = Array.isArray(amenitiesArray)
                    if (isAmenitiesArray && amenitiesArray.length > 0) {
                      Object.entries(mainAmenityKeys).forEach(([key, labelKey]) => {
                        if (amenitiesArray.includes(key)) amenities.push(t(labelKey))
                      })
                      for (let i = 1; i <= 26; i++) {
                        const featureKey = `feature${i}`
                        if (amenitiesArray.includes(featureKey) && featureLabelKeys[featureKey]) {
                          amenities.push(t(featureLabelKeys[featureKey]))
                        }
                      }
                    } else {
                      // Fallback: если массив amenities не приходит из API — собираем по булевым полям (как в модерации)
                      Object.entries(mainAmenityKeys).forEach(([key, labelKey]) => {
                        if (displayProperty[key] === true) amenities.push(t(labelKey))
                      })
                      for (let i = 1; i <= 26; i++) {
                        const featureKey = `feature${i}`
                        if (displayProperty[featureKey] === true && featureLabelKeys[featureKey]) {
                          amenities.push(t(featureLabelKeys[featureKey]))
                        }
                      }
                    }
                      if (amenities.length === 0) {
                        return (
                          <span className="amenity-tag amenity-tag--empty">
                            {t('propertyDetailAmenitiesNone')}
                          </span>
                        )
                      }
                      return amenities.map((amenity, index) => (
                        <span key={index} className="amenity-tag">
                          {amenity}
                        </span>
                      ))
                    })()}
                  </div>
                </div>
              )}

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
                    <h3 className="property-detail-info-block__title">Дополнительные удобства</h3>
                    <div className="property-detail-info-block__content property-detail-info-block__content--text">
                      <p>{String(additionalInfo)}</p>
                    </div>
                  </div>
                ) : null
              })()}

              {!isDebtProperty &&
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

            {/* Карта для мобильной версии — под описанием и адресом */}
            <div className="property-detail-map-mobile">
              <div className="property-detail-sidebar__map">
                <h2 className="property-detail-sidebar__map-title">
                  {displayProperty.location || t('locationTitle') || 'Местоположение'}
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
          </div>

          {/* Правая колонка */}
          <div className="property-detail-sidebar">
            <div className="property-detail-sidebar__content">
              {/* Название */}
              <h1 className="property-detail-sidebar__title">{propertyInfo}</h1>

              {/* Минимальная цена продажи для аукционных объектов */}
              {(() => {
                const buyNowPrice = displayProperty.price ? Number(displayProperty.price) : 0;
                const startingPrice = displayProperty.auction_starting_price ? Number(displayProperty.auction_starting_price) : 0;
                // Получаем текущую максимальную ставку
                const effectiveCurrentBid = currentBid !== null ? currentBid : (displayProperty.currentBid || startingPrice);
                
                // Показываем блок только если:
                // 1. Это аукцион
                // 2. Указана цена "Купить сейчас" (price > 0)
                // 3. Цена "Купить сейчас" больше стартовой цены аукциона (логическая проверка)
                // 4. Таймер не истек
                // 5. Текущая ставка меньше минимальной цены продажи (если ставка >= цены, блок скрывается)
                const shouldShowBuyNow = isAuctionProperty &&
                                         buyNowPrice > 0 && 
                                         buyNowPrice > startingPrice && 
                                         !timerExpired &&
                                         !isBuyNowSaleCompleted &&
                                         effectiveCurrentBid < buyNowPrice;
                
                return shouldShowBuyNow ? (
                  <>
                    <div className="property-detail-sidebar__current-bid">
                      <span className="current-bid-label">{t('propertyDetailMinSellingPrice')}</span>
                      <span className="current-bid-value">
                        {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                        {displayProperty.price.toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="property-detail-sidebar__buy-now-btn"
                      onClick={handleBookNow}
                      disabled={isReservedActive || !buyNowEmailOk}
                      title={!buyNowEmailOk ? t('buyNowEmailRequired') : undefined}
                      style={{
                        opacity: isReservedActive || !buyNowEmailOk ? 0.5 : 1,
                        cursor: isReservedActive || !buyNowEmailOk ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isReservedActive ? t('objectReserved') : t('buyNowSectionTitle')}
                    </button>
                  </>
                ) : null;
              })()}
              {/* Кнопка для победителя аукциона */}
              {isAuctionProperty && timerExpired && isUserLeader && !isBuyNowSaleCompleted && (
                <button
                  className="property-detail-sidebar__buy-btn property-detail-sidebar__buy-btn--winner"
                  onClick={handleBookNow}
                  disabled={isReservedActive || !buyNowEmailOk}
                  title={!buyNowEmailOk ? t('buyNowEmailRequired') : undefined}
                  style={{
                    opacity: isReservedActive || !buyNowEmailOk ? 0.5 : 1,
                    cursor: isReservedActive || !buyNowEmailOk ? 'not-allowed' : 'pointer'
                  }}
                >
                  {t('propertyDetailGoToPurchase')}
                </button>
              )}

              {/* Цена для неаукционных объектов */}
              {!isAuctionProperty && displayProperty.price && Number(displayProperty.price) > 0 && (
                <>
                  <div className="property-detail-sidebar__price-block">
                    <span className="price-label">{t('propertyDetailPrice')}</span>
                    <span
                      className="price-value"
                    >
                      {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                      {displayProperty.price.toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="property-detail-sidebar__buy-now-btn"
                    onClick={handleBookNow}
                    disabled={isReservedActive || !buyNowEmailOk}
                    title={!buyNowEmailOk ? t('buyNowEmailRequired') : undefined}
                    style={{
                      opacity: isReservedActive || !buyNowEmailOk ? 0.5 : 1,
                      cursor: isReservedActive || !buyNowEmailOk ? 'not-allowed' : 'pointer'
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
                  sev === 'red' ? '🔥 Высокий шанс заработать' :
                  sev === 'yellow' ? '📈 Средний шанс заработать' :
                  '✅ Стабильный шанс заработать'

                const debtFeatures = [
                  displayProperty.debt_utilities && 'Долги по коммунальным услугам',
                  displayProperty.debt_mortgage_pledge && 'Залог у банка',
                  displayProperty.debt_property_taxes && 'Неоплаченные налоги на имущество',
                  displayProperty.debt_arrest && 'Арест / ограничения',
                  displayProperty.debt_inherited && 'Долги наследодателя',
                  displayProperty.debt_third_party && 'Долги перед третьими лицами',
                  displayProperty.debt_other && displayProperty.debt_other,
                  displayProperty.debt_amount
                    ? `Сумма долга: $${Number(displayProperty.debt_amount).toLocaleString('en-US')}`
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
              <div className="property-detail-sidebar__location">
                <span>{displayProperty.location}</span>
              </div>

              {/* Блок таймера аукциона, текущей ставки и истории ставок.
                  Для долгов тоже показываем, чтобы UX был как у аукциона. */}
              {isAuctionProperty && auctionEndTime ? (
                <div
                  className={`property-detail-sidebar__auction-block${auctionEndedForSidebar ? ' property-detail-sidebar__auction-block--ended' : ''}`}
                >
                  {/* Для долгов: показываем сумму долга отдельно */}
                  {isDebtProperty && displayProperty.debt_amount != null && displayProperty.debt_amount !== '' && !Number.isNaN(Number(displayProperty.debt_amount)) && (
                    <div className="property-detail-sidebar__current-bid" style={{ marginBottom: 12 }}>
                      <span className="current-bid-label">{t('debtsDebtAmount')}</span>
                      <span className="current-bid-value">
                        {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                        {Number(displayProperty.debt_amount).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  )}

                  {/* Проверяем резервацию объекта */}
                  {isReservedActive ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
                      <div className="property-reservation-block" style={{ minWidth: '250px' }}>
                        <div className="reservation-icon">🔒</div>
                        <div className="reservation-text">
                          <div className="reservation-title">{t('propertyDetailBidsPaused')}</div>
                          <div className="reservation-subtitle">
                            {t('propertyDetailReservationUntil', {
                              date: new Date(displayProperty.reserved_until).toLocaleString(undefined, {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }),
                              hours: Math.ceil((new Date(displayProperty.reserved_until) - new Date()) / (1000 * 60 * 60))
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : auctionEndedForSidebar ? (
                    <div
                      className="property-detail-auction-ended"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem', width: '100%' }}
                    >
                      <div className="auction-completed-banner auction-completed-banner--page" role="status">
                        {isBuyNowSaleCompleted
                          ? t('propertyDetailBuyNowPurchaseCompleted')
                          : t('propertyDetailAuctionCompleted')}
                      </div>
                      {isBuyNowSaleCompleted && displayProperty.buy_now_winner_user_id != null && (
                        <div className="auction-winner-card auction-winner-card--settled" style={{ marginTop: 14, width: '100%', maxWidth: 320 }}>
                          <div className="auction-winner-name" style={{ textAlign: 'center' }}>
                            {t('propertyCardBuyNowWinner', { id: displayProperty.buy_now_winner_user_id })}
                          </div>
                        </div>
                      )}
                      {!isBuyNowSaleCompleted && showAuctionCompletedWinner && (
                        <div className="auction-winner-card auction-winner-card--settled" style={{ marginTop: 14, width: '100%', maxWidth: 320 }}>
                          <div className="auction-winner-label">🏆 {t('propertyDetailAuctionWinner')}</div>
                          <div className="auction-winner-name">
                            {t('propertyDetailWinnerUserId', { id: displayEndedAuctionPlayerId ?? resolvedWinnerUserId })}
                          </div>
                          <div className="auction-winner-bid">
                            {t('propertyDetailWinningBid')}{' '}
                            {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                            {resolvedWinningBid.toLocaleString('ru-RU')}
                          </div>
                        </div>
                      )}
                      {!isBuyNowSaleCompleted && showAuctionCompletedNoBids && (
                        <div className="auction-completed-no-bids" role="status" style={{ marginTop: 12 }}>
                          {t('propertyDetailAuctionNoBids')}
                        </div>
                      )}
                    </div>
                  ) : showCircularTimerAuctionBlock ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
                      {circularTimerEndTime ? (
                        <CircularTimer
                          endTime={circularTimerEndTime}
                          size={150}
                          strokeWidth={8}
                          originalDuration={displayProperty.test_timer_duration || originalTestTimerDuration}
                          isUserLeader={isUserLeader && !auctionEndedForSidebar}
                          bidInfo={timerBidInfo}
                          auctionEndedLabel={t('propertyDetailAuctionCompleted')}
                        />
                      ) : null}
                      {previousLeader && !auctionEndedForSidebar && isLeaderChanging && (
                        <div className="auction-leader-card auction-leader-card--exiting">
                          <div className="auction-leader-label">{t('propertyDetailAuctionLeader')}</div>
                          <div className="auction-leader-name">
                            {previousLeader.countryFlag && (
                              <span className="auction-leader-country-flag">{previousLeader.countryFlag}</span>
                            )}
                            <span className="auction-leader-id">
                              {previousLeader.userIdNumber || previousLeader.userId || previousLeader.id || t('propertyDetailUnknown')}
                            </span>
                          </div>
                          <div className="auction-leader-bid">
                            {t('propertyDetailBid')} {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                            {previousLeader.bidAmount.toLocaleString('ru-RU')}
                          </div>
                        </div>
                      )}
                      {currentLeader && !auctionEndedForSidebar && (
                        <div className={`auction-leader-card ${isLeaderChanging ? 'auction-leader-card--entering' : ''}`}>
                          <div className="auction-leader-label">{t('propertyDetailAuctionLeader')}</div>
                          <div className="auction-leader-name">
                            {currentLeader.countryFlag && (
                              <span className="auction-leader-country-flag">{currentLeader.countryFlag}</span>
                            )}
                            <span className="auction-leader-id">
                              {currentLeader.userIdNumber || currentLeader.userId || currentLeader.id}
                            </span>
                          </div>
                          <div className="auction-leader-bid">
                            {t('propertyDetailBid')} {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                            {currentLeader.bidAmount.toLocaleString('ru-RU')}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <PropertyTimer endTime={auctionEndTime} auctionEndedLabel={t('propertyDetailAuctionCompleted')} />
                      {previousLeader && !auctionEndedForSidebar && isLeaderChanging && (
                        <div className="auction-leader-card auction-leader-card--exiting">
                          <div className="auction-leader-label">{t('propertyDetailAuctionLeader')}</div>
                          <div className="auction-leader-name">
                            {previousLeader.countryFlag && (
                              <span className="auction-leader-country-flag">{previousLeader.countryFlag}</span>
                            )}
                            <span className="auction-leader-id">
                              {previousLeader.userIdNumber || previousLeader.userId || previousLeader.id || t('propertyDetailUnknown')}
                            </span>
                          </div>
                          <div className="auction-leader-bid">
                            {t('propertyDetailBid')} {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                            {previousLeader.bidAmount.toLocaleString('ru-RU')}
                          </div>
                        </div>
                      )}
                      {currentLeader && !auctionEndedForSidebar && (
                        <div className={`auction-leader-card ${isLeaderChanging ? 'auction-leader-card--entering' : ''}`}>
                          <div className="auction-leader-label">{t('propertyDetailAuctionLeader')}</div>
                          <div className="auction-leader-name">
                            {currentLeader.countryFlag && (
                              <span className="auction-leader-country-flag">{currentLeader.countryFlag}</span>
                            )}
                            <span className="auction-leader-id">
                              {currentLeader.userIdNumber || currentLeader.userId || currentLeader.id}
                            </span>
                          </div>
                          <div className="auction-leader-bid">
                            {t('propertyDetailBid')} {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                            {currentLeader.bidAmount.toLocaleString('ru-RU')}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {/* Показываем лидера для обычных объектов (без таймера) */}
                  {!isAuctionProperty && currentLeader && (
                    <div className="auction-leader-card">
                      <div className="auction-leader-label">{t('propertyDetailCurrentLeader')}</div>
                      <div className="auction-leader-name">
                        {currentLeader.countryFlag && (
                          <span className="auction-leader-country-flag">{currentLeader.countryFlag}</span>
                        )}
                        <span className="auction-leader-id">
                          {currentLeader.userIdNumber || currentLeader.userId || currentLeader.id}
                        </span>
                      </div>
                      <div className="auction-leader-bid">
                        {t('propertyDetailBid')} {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                        {currentLeader.bidAmount.toLocaleString('ru-RU')}
                      </div>
                    </div>
                  )}

                  {/* Стартовая сумма → форма ставок → последние ставки → история (светло-серый фон) */}
                  <div className="property-detail-sidebar__auction-bid-stack">
                  {/* Блок с текущей/стартовой ценой.
                      Для аукционных объектов, когда уже есть ставка и показывается карточка лидера,
                      скрываем этот блок, чтобы не дублировать сумму. */}
                  {!(
                    isAuctionProperty &&
                    currentBid !== null &&
                    currentBid !== (displayProperty.auction_starting_price || 0)
                  ) && (
                    <div className="property-detail-sidebar__current-bid">
                      <span className="current-bid-label">
                        {currentBid !== null && currentBid !== (isAuctionProperty ? displayProperty.auction_starting_price : displayProperty.price)
                          ? t('propertyDetailCurrentMaxBid')
                          : isAuctionProperty 
                            ? t('propertyDetailStartingBidLabel')
                            : t('propertyDetailObjectPrice')}
                      </span>
                      <div className={`current-bid-value-wrapper ${priceAnimation ? 'current-bid-value-wrapper--animated' : ''}`}>
                        <span className="current-bid-value">
                          {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : ''}
                          {(currentBid !== null ? currentBid : (isAuctionProperty ? (displayProperty.auction_starting_price || 0) : (displayProperty.price || 0))).toLocaleString('ru-RU')}
                        </span>
                        {priceAnimation && (
                          <span className="current-bid-arrow">
                            <FiArrowUp size={20} />
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Функционал ставки - скрываем когда таймер истек или сделка «купить сейчас» завершена */}
                  {(!isAuctionProperty || !auctionEndedForSidebar) && (
                  <div className="property-detail-sidebar__bidding-section">
                    {isReservedActive && (
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
                        <span>{t('propertyDetailBidsUnavailableReserved')}</span>
                      </div>
                    )}
                    {!isReservedActive && kycBidBlocked && (
                      <div className="auction-verification-pending-banner" role="status">
                        {t('propertyDetailBidVerificationPending')}
                      </div>
                    )}
                    <div className="bidding-section__quick-buttons">
                      {(() => {
                        const quickBidAmounts = getQuickBidAmounts()
                        const formatAmount = (amount) => {
                          if (amount >= 1000) {
                            return `+${(amount / 1000).toFixed(0)}K`
                          }
                          return `+${amount}`
                        }
                        
                        return quickBidAmounts.map((amount, index) => (
                          <button
                            key={index}
                            type="button"
                            className="bidding-section__quick-btn"
                            onClick={() => handleQuickBid(amount)}
                            disabled={isSubmittingBid || isUserLeader || disableAuctionBidFields}
                            style={{
                              opacity: disableAuctionBidFields ? 0.5 : 1,
                              cursor: disableAuctionBidFields ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {formatAmount(amount)}
                          </button>
                        ))
                      })()}
                    </div>

                    {isAuctionProperty &&
                      !isUserLeader &&
                      !(isReservedActive) &&
                      (() => {
                        const startingPrice = displayProperty.auction_starting_price || 0
                        const effectiveCurrentBid =
                          currentBid !== null ? currentBid : (displayProperty.currentBid || startingPrice)
                        const step = getAuctionMinBidStep(effectiveCurrentBid)
                        const minBid = effectiveCurrentBid + step
                        const curSym =
                          displayProperty.currency === 'USD'
                            ? '$'
                            : displayProperty.currency === 'EUR'
                              ? '€'
                              : displayProperty.currency === 'BYN'
                                ? 'Br'
                                : '$'
                        const locale = currentLang === 'ru' ? 'ru-RU' : 'en-US'
                        return (
                          <p
                            className="bidding-section__min-hint"
                            style={{ fontSize: '12px', opacity: 0.88, margin: '6px 0 10px', lineHeight: 1.35 }}
                          >
                            {t('propertyDetailMinBidHint', {
                              min: `${curSym}${minBid.toLocaleString(locale)}`,
                              step: `${curSym}${step.toLocaleString(locale)}`,
                            })}
                          </p>
                        )
                      })()}
                    
                    <div className="bidding-section__input-wrapper">
                      <span className="bidding-section__currency">
                        {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : '$'}
                      </span>
                      <input
                        type="text"
                        className="bidding-section__input"
                        placeholder={isUserLeader ? t('propertyDetailYouAreLeading') : (isReservedActive) ? t('objectReserved') : t('propertyDetailEnterBidAmount')}
                        value={bidAmount}
                        onChange={handleBidAmountChange}
                        disabled={isSubmittingBid || isUserLeader || disableAuctionBidFields}
                        style={{
                          opacity: disableAuctionBidFields ? 0.5 : 1,
                          cursor: disableAuctionBidFields ? 'not-allowed' : 'text'
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      className={`bidding-section__submit-btn ${isUserLeader ? 'bidding-section__submit-btn--winner' : ''}`}
                      onClick={handleBidSubmit}
                      disabled={isSubmittingBid || !bidAmount || isUserLeader || disableAuctionBidFields}
                      style={{
                        opacity: disableAuctionBidFields ? 0.5 : 1,
                        cursor: disableAuctionBidFields ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isSubmittingBid ? t('propertyDetailSubmitting') : isUserLeader ? t('propertyDetailYouAreWinning') : (isReservedActive) ? t('objectReserved') : t('placeBid')}
                    </button>
                  </div>
                  )}

                  {/* Последние две ставки */}
                  {recentBids.length > 0 && (() => {
                    // Находим максимальную ставку для определения лидера
                    const maxBidAmount = Math.max(...recentBids.map(b => b.bid_amount))
                    return (
                      <div className="property-detail-sidebar__recent-bids">
                        <div className="recent-bids__title">{t('propertyDetailRecentBids')}</div>
                        <div className="recent-bids__list">
                          {recentBids.map((bid, index) => {
                            const isHighest = bid.bid_amount === maxBidAmount
                            const countryFlag = flagEmojiForStoredCountry(bid.bidder_country)
                            return (
                              <div key={bid.id || index} className={`recent-bid-item ${isHighest ? 'recent-bid-item--highest' : ''}`}>
                                <div className="recent-bid-item__user">
                                  <FiUser size={14} />
                                  {countryFlag && (
                                    <span
                                      className="recent-bid-item__country-flag"
                                      title={bid.bidder_country}
                                      aria-hidden
                                    >
                                      {countryFlag}
                                    </span>
                                  )}
                                  <span className="recent-bid-item__user-name">
                                    {bid.user_id_number || bid.user_id || t('propertyDetailUnknown')}
                                  </span>
                                  {isHighest && (
                                    <span className="recent-bid-item__badge">{t('propertyDetailLeader')}</span>
                                  )}
                                </div>
                                <div className="recent-bid-item__info">
                                  <div className="recent-bid-item__amount">
                                    {displayProperty.currency === 'USD' ? '$' : displayProperty.currency === 'EUR' ? '€' : displayProperty.currency === 'BYN' ? 'Br' : '$'}
                                    {bid.bid_amount.toLocaleString('ru-RU')}
                                  </div>
                                  <div className="recent-bid-item__time">
                                    <FiClock size={12} />
                                    {new Date(bid.created_at).toLocaleString('ru-RU', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  <button
                    type="button"
                    className="property-detail-sidebar__history-btn"
                    onClick={() => setIsBidHistoryOpen(true)}
                  >
                    {t('propertyDetailBidHistory')}
                  </button>
                  </div>
                </div>
              ) : null}

              {/* Карта */}
              <div className="property-detail-sidebar__map">
                <h2 className="property-detail-sidebar__map-title">
                  {displayProperty.location || t('locationTitle') || 'Местоположение'}
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
      <BuyNowModal
        isOpen={isBuyNowModalOpen}
        onClose={() => setIsBuyNowModalOpen(false)}
        stripeReturnPath={displayProperty?.id != null ? `/property/${displayProperty.id}` : '/'}
        property={{
          id: displayProperty.id,
          title: propertyInfo,
          name: propertyInfo,
          price: displayProperty.price,
          currency: displayProperty.currency,
          property_type: displayProperty.property_type,
          isAuction: isAuctionProperty,
          currentBid: currentBid || displayProperty.currentBid || displayProperty.auction_starting_price || displayProperty.price
        }}
      />

      <AuctionReminderModal
        property={displayProperty}
        open={auctionReminderOpen}
        onClose={() => setAuctionReminderOpen(false)}
      />

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


