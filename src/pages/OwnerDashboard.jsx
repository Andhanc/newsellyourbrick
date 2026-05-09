import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'
import { 
  FiHome, 
  FiDollarSign, 
  FiList, 
  FiTrendingUp,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiLogOut,
  FiUser,
  FiUsers,
  FiBarChart2,
  FiX,
  FiDownload,
  FiCalendar,
  FiDollarSign as FiDollar,
  FiClock,
  FiAlertCircle,
  FiLayers,
  FiZap,
  FiCheck,
  FiTag,
  FiMenu,
  FiBell,
  FiArrowRight,
  FiArrowUp,
  FiHeart,
  FiActivity,
  FiShoppingBag,
} from 'react-icons/fi'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import WelcomeModal from '../components/WelcomeModal'
import QuickAddCard from '../components/QuickAddCard'
import FileUploadModal from '../components/FileUploadModal'
import PropertyCalculatorModal from '../components/PropertyCalculatorModal'
import OwnerPurchasedAssets from '../components/OwnerPurchasedAssets'
import BiddingHistoryModal from '../components/BiddingHistoryModal'
import OwnerModerationNoticeModal from '../components/OwnerModerationNoticeModal'
import OwnerPropertyBidAnalyticsModal from '../components/OwnerPropertyBidAnalyticsModal'
import OwnerTestDriveSection from '../components/OwnerTestDriveSection'
import OwnerMySalesSection from '../components/OwnerMySalesSection'
import OwnerSaleCelebrationModal from '../components/OwnerSaleCelebrationModal'
import { getDismissedCelebrationIds, dismissCelebration } from '../utils/ownerSaleCelebrationStorage'
import CountrySelect, { countries as countryList } from '../components/CountrySelect'
import { getUserData, saveUserData, logout, clearUserData, CLERK_DB_USER_SYNCED } from '../services/authService'
import { getNotificationItemClass } from '../utils/notificationItemClass'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { showToast } from '../components/ToastContainer'
import { fetchVerificationStatus } from '../utils/verificationStatusApi'
import { fetchUserById } from '../utils/usersApi'
import { getPropertyListingKind } from '../utils/propertyListingKind'
import { getPropertyCardImage } from '../utils/propertyImage'
import '../components/PropertyList.css'
import './MainPage.css'
import './OwnerDashboard.css'
import { useTranslation } from 'react-i18next'
import {
  exportOwnerAnalyticsExcel,
  downloadXlsxBuffer,
} from '../utils/ownerAnalyticsExcelExport'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const formatDateSafe = (value) => {
  if (!value) return 'Не указано'
  const raw = String(value).trim()
  if (!raw) return 'Не указано'

  // 1) ISO / стандартные форматы
  let date = new Date(raw)

  // 2) Частый серверный формат: "YYYY-MM-DD HH:mm:ss"
  if (Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    date = new Date(raw.replace(' ', 'T'))
  }

  // 3) Формат "DD.MM.YYYY" (и с временем)
  if (Number.isNaN(date.getTime()) && /^\d{2}\.\d{2}\.\d{4}/.test(raw)) {
    const [datePart, timePart] = raw.split(' ')
    const [dd, mm, yyyy] = datePart.split('.')
    const normalized = `${yyyy}-${mm}-${dd}${timePart ? `T${timePart}` : ''}`
    date = new Date(normalized)
  }

  if (Number.isNaN(date.getTime())) return 'Не указано'
  return date.toLocaleDateString('ru-RU')
}

const ruCountWithNoun = (n, one, few, many) => {
  const abs = Math.abs(Number(n)) || 0
  const n100 = abs % 100
  const n10 = abs % 10
  let word = many
  if (n100 > 10 && n100 < 20) word = many
  else if (n10 === 1) word = one
  else if (n10 >= 2 && n10 <= 4) word = few
  else word = many
  return `${abs} ${word}`
}

// Демонстрационные данные объявлений владельца
const mockOwnerProperties = [
  {
    id: 1,
    title: 'Lakeshore Blvd West',
    location: 'Costa Adeje, Tenerife',
    price: 797500,
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    beds: 2,
    baths: 2,
    sqft: 2000,
    status: 'active',
    views: 1245,
    inquiries: 23,
    publishedDate: '2024-01-15'
  },
  {
    id: 2,
    title: 'Eleanor Pena Property',
    location: 'Playa de las Américas, Tenerife',
    price: 1200000,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    beds: 3,
    baths: 2,
    sqft: 1800,
    status: 'sold',
    views: 2156,
    inquiries: 45,
    publishedDate: '2023-11-20',
    soldDate: '2024-02-10',
    buyer: {
      name: 'Мария Иванова',
      email: 'maria.ivanova@example.com',
      phone: '+7 (999) 123-45-67',
      purchasePrice: 1200000
    }
  },
  {
    id: 3,
    title: 'Bessie Cooper Property',
    location: 'Los Cristianos, Tenerife',
    price: 950000,
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    beds: 2,
    baths: 1,
    sqft: 1500,
    status: 'active',
    views: 892,
    inquiries: 12,
    publishedDate: '2024-02-01'
  },
  {
    id: 4,
    title: 'Darrell Steward Property',
    location: 'Puerto de la Cruz, Tenerife',
    price: 680000,
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80',
    beds: 1,
    baths: 1,
    sqft: 1200,
    status: 'pending',
    views: 567,
    inquiries: 8,
    publishedDate: '2024-02-20'
  }
]

const OwnerDashboard = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useClerk()
  const { user: clerkUser } = useUser()
  const [properties, setProperties] = useState([])
  const [activeTab, setActiveTab] = useState('properties') // 'properties' | 'analytics' | 'sales'
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showFileUploadModal, setShowFileUploadModal] = useState(false)
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false)
  const [analyticsSalesData, setAnalyticsSalesData] = useState(null)
  const [analyticsSalesLoading, setAnalyticsSalesLoading] = useState(false)
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false)
  const [selectedPropertyForHistory, setSelectedPropertyForHistory] = useState(null)
  const [propertyForBidAnalytics, setPropertyForBidAnalytics] = useState(null)
  const [moderationNotice, setModerationNotice] = useState({
    open: false,
    title: '',
    message: '',
  })
  const [activeFilter, setActiveFilter] = useState('all') // 'all', 'active', 'pending', 'rejected'
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  /** id объекта → подсветка роста текущей ставки (SSE) */
  const [ownerBidPulseIds, setOwnerBidPulseIds] = useState({})
  const [ownerProfile, setOwnerProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    countryFlag: ''
  })
  const headerContentRef = useRef(null)
  const titleRef = useRef(null)
  const [isMobileTitleStacked, setIsMobileTitleStacked] = useState(false) // на мобиле сворачиваем иконки в бургер-меню, когда имени не хватает места
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  )
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileEditing, setIsProfileEditing] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [originalProfile, setOriginalProfile] = useState(null) // Сохраняем исходные данные профиля
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false)
  const [userId, setUserId] = useState(null)
  const [saleCelebration, setSaleCelebration] = useState(null)
  const saleCelebrationRef = useRef(null)
  const [ownerNotifOpen, setOwnerNotifOpen] = useState(false)
  const [ownerNotifications, setOwnerNotifications] = useState([])
  const [ownerNotifLoading, setOwnerNotifLoading] = useState(false)
  const [userDocuments, setUserDocuments] = useState({ passport: null, passportWithFace: null })
  const [uploading, setUploading] = useState({ passport: false, passportWithFace: false })
  const passportInputRef = useRef(null)
  const passportWithFaceInputRef = useRef(null)
  const ownerBidPulseTimersRef = useRef({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [propertyToDelete, setPropertyToDelete] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)
  const [interestCount, setInterestCount] = useState(0) // Количество уникальных заинтересованных пользователей
  const [showProfileFieldsModal, setShowProfileFieldsModal] = useState(false)
  const [missingFields, setMissingFields] = useState([])

  useEffect(() => {
    if (!ownerNotifOpen) return
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 768px)').matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [ownerNotifOpen])

  useEffect(() => {
    // Проверяем, авторизован ли владелец
    const isOwnerLoggedIn = localStorage.getItem('isOwnerLoggedIn')
    if (!isOwnerLoggedIn) {
      navigate('/')
    } else {
      // Подтягиваем данные пользователя из локального хранилища
      const userData = getUserData()
          if (userData && userData.isLoggedIn) {
        // Парсим имя из полного имени
        const fullName = userData.name || 'Пользователь'
        const nameParts = fullName.split(' ').filter(Boolean)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        setOwnerProfile(prev => ({
          ...prev,
          firstName: firstName,
          lastName: lastName,
          email: userData.email || '',
          phone: userData.phoneFormatted || userData.phone || '',
          country: userData.country || '',
          countryFlag: userData.countryFlag || ''
        }))

        // Дополнительно загружаем актуальные данные из БД (если есть ID)
        const loadFromDb = async () => {
          // Используем числовой ID из БД (из localStorage), а не Clerk ID
          const dbUserId = localStorage.getItem('userId')
          if (!dbUserId || !/^\d+$/.test(dbUserId)) return
          try {
            const dbUser = await fetchUserById(API_BASE_URL, dbUserId)
            if (!dbUser) return
            // Находим флаг страны
            const selectedCountry = countryList.find(c => c.name === dbUser.country)
            setOwnerProfile(prev => ({
              ...prev,
              firstName: prev.firstName || dbUser.first_name || '',
              lastName: prev.lastName || dbUser.last_name || '',
              email: prev.email || dbUser.email || '',
              phone: prev.phone || dbUser.phone_number || '',
              country: prev.country || dbUser.country || '',
              countryFlag: selectedCountry ? selectedCountry.flag : prev.countryFlag || ''
            }))
          } catch (error) {
            console.warn('⚠️ Не удалось загрузить данные владельца из БД:', error)
          }
        }

        loadFromDb()
        
        // Загружаем статус верификации и документы
        // Используем числовой ID из БД (из localStorage), если доступен, иначе userData.id
        const dbUserId = localStorage.getItem('userId')
        let effectiveUserId = null
        
        // Проверяем dbUserId из localStorage
        if (dbUserId && dbUserId !== 'null' && dbUserId !== 'undefined' && /^\d+$/.test(dbUserId)) {
          effectiveUserId = parseInt(dbUserId, 10)
        } else if (userData.id) {
          // Проверяем userData.id
          const userDataId = typeof userData.id === 'string' ? parseInt(userData.id, 10) : Number(userData.id)
          if (!isNaN(userDataId) && userDataId > 0) {
            effectiveUserId = userDataId
          }
        }
        
        if (effectiveUserId && !isNaN(effectiveUserId) && effectiveUserId > 0) {
          setUserId(effectiveUserId)
          // При первой загрузке проверяем непросмотренное уведомление о верификации
          checkVerificationNotification(effectiveUserId)
          // При первой загрузке не показываем уведомление (isStatusUpdate = false)
          loadVerificationStatus(effectiveUserId, false)
          loadUserDocuments(effectiveUserId)
          // Загружаем объявления пользователя
          loadUserProperties(effectiveUserId)
          // Загружаем количество заинтересованных пользователей
          loadInterestCount(effectiveUserId)
        }
      }

      // Показываем модальное окно приветствия при первом входе
      // Для тестирования можно временно убрать проверку hasSeenWelcome
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
      if (!hasSeenWelcome) {
        // Небольшая задержка для корректного рендеринга
        setTimeout(() => {
          setShowWelcomeModal(true)
        }, 100)
      }
    }
  }, [navigate])

  // На мобиле следим, хватает ли места имени рядом с полным набором иконок.
  // Как только места не хватает, сворачиваем иконки в бургер-меню, а имя оставляем в полном размере.
  useEffect(() => {
    const updateHeaderLayout = () => {
      if (!headerContentRef.current || !titleRef.current) return

      const isMobile = window.innerWidth <= 768
      if (!isMobile) {
        setIsMobileTitleStacked(false)
        return
      }

      const containerWidth = headerContentRef.current.clientWidth
      const reservedForIcons = 190 // px под блок иконок
      const gap = 16
      const availableForTitle = Math.max(containerWidth - reservedForIcons - gap, 0)
      const titleWidth = titleRef.current.scrollWidth

      // Если имени не хватает места рядом с полным набором иконок,
      // включаем компактный режим (бургер-меню вместо 4 иконок)
      setIsMobileTitleStacked(titleWidth > availableForTitle)
    }

    updateHeaderLayout()
    const handleResize = () => {
      updateHeaderLayout()
      if (typeof window !== 'undefined') {
        setIsMobileViewport(window.innerWidth <= 768)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [ownerProfile.firstName, ownerProfile.lastName])

  const loadOwnerNotifications = useCallback(
    async (options = {}) => {
      const { silent = false } = options
      if (!userId) return
      if (!silent) setOwnerNotifLoading(true)
      try {
        const r = await fetch(`${API_BASE_URL}/notifications/user/${userId}`)
        const d = await r.json()
        if (d.success) {
          const list = (d.data || []).map((n) => {
            if (n.data && typeof n.data === 'string') {
              try {
                return { ...n, data: JSON.parse(n.data) }
              } catch {
                return n
              }
            }
            return n
          })
          setOwnerNotifications(list)
        }
      } catch (e) {
        console.warn('owner notifications', e)
      } finally {
        if (!silent) setOwnerNotifLoading(false)
      }
    },
    [userId]
  )

  useEffect(() => {
    if (!userId) return
    void loadOwnerNotifications({ silent: false })
    const poll = setInterval(() => void loadOwnerNotifications({ silent: true }), 60000)
    return () => clearInterval(poll)
  }, [userId, loadOwnerNotifications])

  useEffect(() => {
    const onSseNotifications = () => {
      void loadOwnerNotifications({ silent: true })
    }
    window.addEventListener('owner-notifications-refresh', onSseNotifications)
    return () => window.removeEventListener('owner-notifications-refresh', onSseNotifications)
  }, [loadOwnerNotifications])

  const fetchOwnerSaleCelebrations = useCallback(async () => {
    if (!userId) return
    if (saleCelebrationRef.current) return
    try {
      const base = (API_BASE_URL || '/api').replace(/\/$/, '')
      const res = await fetch(`${base}/owner/${userId}/sale-celebrations`)
      const json = await res.json()
      if (!json.success) return
      const items = Array.isArray(json.data?.items) ? json.data.items : []
      const dismissed = getDismissedCelebrationIds()
      const next = items.find((it) => it.event_id && !dismissed.has(it.event_id)) || null
      if (next) {
        saleCelebrationRef.current = next
        setSaleCelebration(next)
      }
    } catch {
      /* ignore */
    }
  }, [userId])

  const finishSaleCelebrationAndPoll = useCallback(() => {
    const cur = saleCelebrationRef.current
    if (cur?.event_id) dismissCelebration(cur.event_id)
    saleCelebrationRef.current = null
    setSaleCelebration(null)
    queueMicrotask(() => {
      void fetchOwnerSaleCelebrations()
    })
  }, [fetchOwnerSaleCelebrations])

  const handleSaleCelebrationGoToSales = useCallback(() => {
    flushSync(() => {
      setActiveTab('sales')
    })
    finishSaleCelebrationAndPoll()
    requestAnimationFrame(() => {
      document.getElementById('owner-dashboard-my-sales')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [finishSaleCelebrationAndPoll])

  useEffect(() => {
    if (!userId) return
    void fetchOwnerSaleCelebrations()
    const id = setInterval(() => void fetchOwnerSaleCelebrations(), 12000)
    const onVis = () => {
      if (document.visibilityState === 'visible') void fetchOwnerSaleCelebrations()
    }
    document.addEventListener('visibilitychange', onVis)
    const onFocus = () => void fetchOwnerSaleCelebrations()
    const onSseRefresh = () => void fetchOwnerSaleCelebrations()
    window.addEventListener('focus', onFocus)
    window.addEventListener('owner-notifications-refresh', onSseRefresh)
    window.addEventListener('owner-properties-update', onSseRefresh)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('owner-notifications-refresh', onSseRefresh)
      window.removeEventListener('owner-properties-update', onSseRefresh)
    }
  }, [userId, fetchOwnerSaleCelebrations])

  // Загружаем объявления пользователя
  const loadUserProperties = async (userId) => {
    if (!userId) return
    setPropertiesLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/properties/user/${userId}`)
      if (response.ok) {
        const result = await response.json()
        console.log('📥 Загружены объявления:', result.data?.length || 0)
        console.log('📥 Первое объявление (для отладки):', result.data?.[0])
        if (result.success && result.data) {
          // Преобразуем данные из базы в формат для отображения
          const formattedProperties = result.data.map(prop => {
            // Обрабатываем фотографии
            let imageUrl = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80'
            
            // Проверяем и парсим photos, если это строка
            let photosArray = prop.photos
            if (typeof photosArray === 'string') {
              try {
                photosArray = JSON.parse(photosArray)
              } catch (e) {
                console.warn('Ошибка парсинга photos:', e)
                photosArray = []
              }
            }
            
            // Если photos - массив и не пустой
            if (Array.isArray(photosArray) && photosArray.length > 0) {
              const firstPhoto = photosArray[0]
              
              // Получаем базовый URL без /api
              const baseUrl = API_BASE_URL.replace('/api', '').replace(/\/$/, '')
              
              // Обрабатываем строку (URL)
              if (typeof firstPhoto === 'string') {
                const photoStr = firstPhoto.trim()
                
                // Data URL (base64) - используем как есть
                if (photoStr.startsWith('data:')) {
                  imageUrl = photoStr
                }
                // Полный HTTP/HTTPS URL - используем как есть
                else if (photoStr.startsWith('http://') || photoStr.startsWith('https://')) {
                  imageUrl = photoStr
                }
                // Путь начинается с /uploads/ - добавляем базовый URL
                else if (photoStr.startsWith('/uploads/')) {
                  imageUrl = `${baseUrl}${photoStr}`
                }
                // Путь начинается с uploads/ без слеша - добавляем / и базовый URL
                else if (photoStr.startsWith('uploads/')) {
                  imageUrl = `${baseUrl}/${photoStr}`
                }
                // Относительный путь - добавляем /uploads/
                else {
                  imageUrl = `${baseUrl}/uploads/${photoStr}`
                }
              } 
              // Обрабатываем объект с полем url
              else if (firstPhoto && typeof firstPhoto === 'object' && firstPhoto.url) {
                const photoUrl = String(firstPhoto.url).trim()
                
                // Data URL (base64) - используем как есть
                if (photoUrl.startsWith('data:')) {
                  imageUrl = photoUrl
                }
                // Полный HTTP/HTTPS URL - используем как есть
                else if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
                  imageUrl = photoUrl
                }
                // Путь начинается с /uploads/ - добавляем базовый URL
                else if (photoUrl.startsWith('/uploads/')) {
                  imageUrl = `${baseUrl}${photoUrl}`
                }
                // Путь начинается с uploads/ без слеша - добавляем / и базовый URL
                else if (photoUrl.startsWith('uploads/')) {
                  imageUrl = `${baseUrl}/${photoUrl}`
                }
                // Относительный путь - добавляем /uploads/
                else {
                  imageUrl = `${baseUrl}/uploads/${photoUrl}`
                }
              }
              
              console.log('🖼️ Обработано фото для объявления:', prop.id, 'URL длина:', imageUrl.length, 'начинается с:', imageUrl.substring(0, 50))
            } else {
              console.warn('⚠️ Нет фотографий для объявления:', prop.id, 'photos:', prop.photos, 'photosArray:', photosArray)
            }
            
            // Для домов/вилл используем bedrooms, для квартир/апартаментов - rooms
            const isHouseOrVilla = prop.property_type === 'house' || prop.property_type === 'villa'
            const beds = isHouseOrVilla 
              ? (prop.bedrooms || 0)
              : (prop.bedrooms || prop.rooms || 0)
            
            // Подсчитываем количество фотографий
            const photosCount = Array.isArray(photosArray) ? photosArray.length : 0
            
            return {
              id: prop.id,
              title: prop.title || 'Без названия',
              location: prop.location || 'Не указано',
              price: prop.price || 0,
              image: imageUrl,
              beds: beds,
              baths: prop.bathrooms || 0,
              sqft: prop.area || 0,
              property_type: prop.property_type || 'apartment',
              created_by_admin:
                prop.created_by_admin ?? prop.added_by_admin ?? prop.admin_created ?? prop.is_admin_created ?? null,
              land_area: prop.land_area || null,
              bedrooms: prop.bedrooms || null,
              floors: prop.floors || prop.total_floors || null,
              status: (prop.moderation_status === 'approved' && prop.has_pending_edit) ? 'pending' :
                     prop.moderation_status === 'approved' ? 'active' : 
                     prop.moderation_status === 'pending' ? 'pending' : 
                     prop.moderation_status === 'rejected' ? 'rejected' : 'pending',
              moderationStatus: (prop.moderation_status === 'approved' && prop.has_pending_edit)
                ? 'pending_edit'
                : prop.moderation_status, // Сохраняем оригинальный статус
              views: 0,
              inquiries: 0,
              likesCount: Number(prop.likes_count ?? prop.likesCount) || 0,
              bidsCount: Number(prop.bids_count ?? prop.bidsCount) || 0,
              publishedDate: prop.created_at || prop.updated_at || null,
              rejectionReason: prop.rejection_reason || null,
              hasPendingEdit: Boolean(prop.has_pending_edit),
              pendingEditRequestedAt: prop.pending_edit_requested_at || null,
              isAuction: prop.is_auction === 1 || prop.is_auction === true || prop.is_auction === '1' || prop.is_auction === 'true',
              photosCount: photosCount,
              sale_type: prop.sale_type || null,
              is_share: prop.is_share,
              is_shared_ownership: prop.is_shared_ownership,
              is_debt: prop.is_debt,
              has_debt: prop.has_debt,
              currentBid: prop.current_bid ?? prop.currentBid ?? null,
              endTime: prop.end_time ?? prop.endTime ?? prop.auction_end_date ?? null,
              test_timer_end_date: prop.test_timer_end_date ?? null,
              // Поля аукциона для отображения стартовой суммы ставки
              auction_starting_price: prop.auction_starting_price || prop.auctionStartingPrice || null,
              auction_start_date: prop.auction_start_date || prop.auctionStartDate || prop.start_date || null,
              auction_end_date: prop.auction_end_date || prop.auctionEndDate || null,
              starting_price: prop.starting_price || prop.startingPrice || null,
              currency: prop.currency || 'USD',
              shares_sold: Number(prop.shares_sold) || 0,
              total_shares: Number(prop.total_shares) || 0,
              test_drive: prop.test_drive === 1 || prop.test_drive === true || prop.test_drive === '1',
              source_table:
                prop.source_table === 'houses'
                  ? 'properties_houses'
                  : prop.source_table === 'properties_houses'
                    ? 'properties_houses'
                    : prop.source_table === 'properties_apartments'
                      ? 'properties_apartments'
                      : 'properties_apartments',
            }
          })
          setProperties(formattedProperties)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки объявлений:', error)
    } finally {
      setPropertiesLoading(false)
    }
  }

  // Загружаем количество уникальных заинтересованных пользователей
  const loadInterestCount = async (userId) => {
    if (!userId) return
    try {
      const response = await fetch(`${API_BASE_URL}/owner/${userId}/interest-count`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setInterestCount(result.data.uniqueUsersCount || 0)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки заинтересованности:', error)
      // Устанавливаем 0 в случае ошибки
      setInterestCount(0)
    }
  }

  // Сохраняем предыдущий статус верификации для отслеживания изменений
  const previousVerificationStatus = useRef(false)
  const hasCheckedNotification = useRef(false)

  // Проверяем непросмотренное уведомление о верификации
  const checkVerificationNotification = async (userId) => {
    if (!userId || hasCheckedNotification.current) return
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/user/${userId}/unread`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Ищем непросмотренное уведомление о верификации
          const verificationNotif = result.data.find(
            n => n.type === 'verification_success' && n.view_count === 0
          )
          if (verificationNotif) {
            // Показываем уведомление только если есть непросмотренное уведомление
            setShowVerificationSuccess(true)
            // Автоматически скрываем уведомление через 5 секунд
            setTimeout(() => {
              setShowVerificationSuccess(false)
            }, 5000)
            // Отмечаем уведомление как просмотренное
            try {
              await fetch(`${API_BASE_URL}/notifications/${verificationNotif.id}/view`, {
                method: 'PUT'
              })
            } catch (err) {
              console.warn('Не удалось отметить уведомление как просмотренное:', err)
            }
          }
          hasCheckedNotification.current = true
        }
      }
    } catch (error) {
      console.error('Ошибка проверки уведомлений:', error)
    }
  }

  // Загружаем статус верификации
  const loadVerificationStatus = async (userId, isStatusUpdate = false) => {
    if (!userId) return
    try {
      const status = await fetchVerificationStatus(API_BASE_URL, userId, {
        ttlMs: 20000,
        force: isStatusUpdate,
      })
      if (!status) return

      const wasVerified = previousVerificationStatus.current
      const isNowVerified = status.isVerified

      setVerificationStatus(status)

      // Показываем уведомление только если:
      // 1. Статус изменился с неверифицированного на верифицированный (при событии обновления)
      // 2. Это означает, что администратор только что одобрил пользователя
      if (isStatusUpdate && isNowVerified && !wasVerified) {
        setShowVerificationSuccess(true)
        // Автоматически скрываем уведомление через 5 секунд
        setTimeout(() => {
          setShowVerificationSuccess(false)
        }, 5000)
      }

      // Обновляем предыдущий статус
      previousVerificationStatus.current = isNowVerified
    } catch (error) {
      console.error('Ошибка загрузки статуса верификации:', error)
    }
  }

  // Слушаем событие обновления статуса верификации (только при одобрении администратором)
  useEffect(() => {
    const handleStatusUpdate = () => {
      if (userId) {
        loadVerificationStatus(userId, true)
        loadUserDocuments(userId)
      }
    }
    
    window.addEventListener('verification-status-update', handleStatusUpdate)
    return () => window.removeEventListener('verification-status-update', handleStatusUpdate)
  }, [userId])

  // Push из админки (SSE) — обновить список объявлений без перезагрузки и без polling
  useEffect(() => {
    const handlePropertiesPush = () => {
      if (userId) loadUserProperties(userId)
    }
    window.addEventListener('owner-properties-update', handlePropertiesPush)
    return () => window.removeEventListener('owner-properties-update', handlePropertiesPush)
  }, [userId])

  useEffect(() => {
    if (activeTab !== 'analytics' || !userId) return
    let cancelled = false
    setAnalyticsSalesLoading(true)
    fetch(`${API_BASE_URL}/owner/${userId}/my-sales`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.success && json.data) {
          setAnalyticsSalesData(json.data)
        } else {
          setAnalyticsSalesData({ auction: [], shares: [], debts: [], test_drive: [], buy_now: [] })
        }
      })
      .catch(() => {
        if (!cancelled) setAnalyticsSalesData({ auction: [], shares: [], debts: [], test_drive: [], buy_now: [] })
      })
      .finally(() => {
        if (!cancelled) setAnalyticsSalesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeTab, userId])

  // SSE: лайки, ставки и (для аукциона) текущая ставка — патчим state без полного reload и без polling
  useEffect(() => {
    const handleEngagement = (e) => {
      const d = e.detail
      if (!d || d.property_id == null) return
      const pid = Number(d.property_id)
      const likes = Number(d.likes_count)
      const bids = Number(d.bids_count)
      const cbRaw = d.current_bid
      const nb =
        cbRaw !== undefined && cbRaw !== null && String(cbRaw).trim() !== ''
          ? Number(cbRaw)
          : NaN
      if (!Number.isFinite(pid)) return
      setProperties((prev) =>
        prev.map((p) => {
          if (Number(p.id) !== pid) return p
          const next = {
            ...p,
            likesCount: Number.isFinite(likes) ? likes : p.likesCount ?? 0,
            bidsCount: Number.isFinite(bids) ? bids : p.bidsCount ?? 0,
          }
          if (!Number.isFinite(nb)) return next
          const prevCb = Number(p.currentBid ?? p.current_bid)
          const prevOk = Number.isFinite(prevCb) && prevCb > 0
          const baseline = prevOk
            ? prevCb
            : Number(p.auction_starting_price ?? p.starting_price ?? 0) || 0
          if (nb > baseline) {
            queueMicrotask(() => {
              if (ownerBidPulseTimersRef.current[pid]) {
                clearTimeout(ownerBidPulseTimersRef.current[pid])
              }
              setOwnerBidPulseIds((s) => ({ ...s, [pid]: true }))
              ownerBidPulseTimersRef.current[pid] = setTimeout(() => {
                setOwnerBidPulseIds((s) => {
                  const copy = { ...s }
                  delete copy[pid]
                  return copy
                })
                delete ownerBidPulseTimersRef.current[pid]
              }, 2000)
            })
          }
          return { ...next, currentBid: nb, current_bid: nb }
        })
      )
    }
    window.addEventListener('owner-property-engagement', handleEngagement)
    return () => {
      window.removeEventListener('owner-property-engagement', handleEngagement)
      Object.values(ownerBidPulseTimersRef.current).forEach((tid) => clearTimeout(tid))
      ownerBidPulseTimersRef.current = {}
    }
  }, [])

  // Проверяем, все ли поля заполнены
  const isAllFieldsFilled = () => {
    if (!verificationStatus) return false
    // Считаем профиль "завершенным", если либо все поля заполнены и есть документы,
    // либо пользователь уже верифицирован администратором
    return (
      verificationStatus.isVerified === true ||
      (verificationStatus.isReady && verificationStatus.hasDocuments)
    )
  }

  // Плашка «Заполните данные для верификации»: скрываем, когда в БД заполнены все поля панели «Профиль»
  // (имя, фамилия, страна, почта, логин, WhatsApp). Смена пароля в кабинете не предлагается.
  const shouldHideOwnerVerificationBanner = (status) => {
    if (!status) return false
    if (status.isVerified === true) return true
    if (typeof status.ownerCabinetProfileComplete === 'boolean') {
      if (!status.ownerCabinetProfileComplete) return false
      return true
    }
    const m = status.missingFields
    if (!m) return false
    return !m.firstName && !m.lastName && !m.emailOrPhone && !m.country
  }

  // Обработчик кнопки "Пройти верификацию"
  const handleStartVerification = () => {
    // Закрываем панель профиля и переходим на страницу профиля покупателя
    setIsProfilePanelOpen(false)
    // Здесь можно добавить навигацию на страницу профиля, если нужно
    // navigate('/profile')
  }

  // Загружаем документы пользователя
  const loadUserDocuments = async (userId) => {
    if (!userId) return
    try {
      const response = await fetch(`${API_BASE_URL}/documents/user/${userId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const docs = result.data
          const passport = docs.find(d => d.document_type === 'passport')
          const passportWithFace = docs.find(d => d.document_type === 'passport_with_face')
          setUserDocuments({
            passport: passport || null,
            passportWithFace: passportWithFace || null
          })
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки документов пользователя:', error)
    }
  }

  // После OAuth числовой userId приходит асинхронно; без этого объявления и данные не подгружаются до F5.
  useEffect(() => {
    const onClerkDbSynced = (e) => {
      const raw = e.detail?.userId
      const uid =
        typeof raw === 'number' && !Number.isNaN(raw)
          ? raw
          : parseInt(String(raw || ''), 10)
      if (!uid || uid <= 0 || Number.isNaN(uid)) return
      if (localStorage.getItem('isOwnerLoggedIn') !== 'true') return

      localStorage.setItem('userId', String(uid))
      setUserId(uid)
      checkVerificationNotification(uid)
      loadVerificationStatus(uid, false)
      loadUserDocuments(uid)
      loadUserProperties(uid)
      loadInterestCount(uid)
    }
    window.addEventListener(CLERK_DB_USER_SYNCED, onClerkDbSynced)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, onClerkDbSynced)
  }, [])

  // Загружаем документ
  const handleDocumentUpload = async (type, file) => {
    if (!userId) {
      requestOpenLoginModal({ wizard: true })
      return
    }

    // Преобразуем userId в число и проверяем валидность
    const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId)
    if (isNaN(numericUserId) || numericUserId <= 0) {
      console.error('❌ Неверный формат userId:', userId)
      showNotification('Ошибка: Неверный формат ID пользователя. Ожидается положительное число')
      return
    }

    setUploading(prev => ({ ...prev, [type]: true }))

    try {
      const formData = new FormData()
      formData.append('document_photo', file)
      formData.append('user_id', String(numericUserId))
      formData.append('document_type', type === 'passport' ? 'passport' : 'passport_with_face')

      console.log('📤 Загрузка документа:', {
        type,
        userId,
        fileName: file.name,
        fileSize: file.size
      })

      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          showNotification('Документ успешно загружен и отправлен на верификацию')
          // Обновляем состояние
          const newDoc = {
            id: data.data.id,
            document_type: data.data.document_type,
            document_photo: data.data.document_photo,
            verification_status: data.data.verification_status || 'pending',
            created_at: data.data.created_at
          }
          setUserDocuments(prev => ({
            ...prev,
            [type === 'passport' ? 'passport' : 'passportWithFace']: newDoc
          }))
          // Перезагружаем документы
          await loadUserDocuments(userId)
          // Загружаем статус верификации
          await loadVerificationStatus(userId)
          // Отправляем событие для обновления
          window.dispatchEvent(new Event('verification-status-update'))
        } else {
          showNotification(data.error || 'Ошибка загрузки документа')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }))
        showNotification(errorData.error || 'Ошибка загрузки документа')
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки документа:', error)
      showNotification(`Ошибка: ${error.message || 'Неизвестная ошибка'}`)
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  // Сохраняем флаг после закрытия модального окна
  const handleWelcomeClose = () => {
    setShowWelcomeModal(false)
    localStorage.setItem('hasSeenWelcome', 'true')
  }

  const handleProfileFieldChange = (field, value) => {
    setOwnerProfile(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Проверяем, есть ли несохраненные изменения
  const hasUnsavedChanges = () => {
    if (!isProfileEditing || !originalProfile) return false
    
    const fieldsToCompare = ['firstName', 'lastName', 'email', 'phone', 'country', 'countryFlag']

    return fieldsToCompare.some(field => {
      return ownerProfile[field] !== originalProfile[field]
    })
  }

  // Обработчик закрытия панели профиля с проверкой изменений
  const handleCloseProfilePanel = () => {
    if (hasUnsavedChanges()) {
      const shouldClose = window.confirm(
        'У вас есть несохраненные изменения. Вы уверены, что хотите закрыть панель? Все несохраненные изменения будут потеряны.\n\n' +
        'Для сохранения изменений нажмите "Сохранить".\n' +
        'Для отмены изменений нажмите "Отмена".'
      )
      
      if (!shouldClose) {
        return // Не закрываем панель
      }
      
      // Восстанавливаем исходные данные
      if (originalProfile) {
        setOwnerProfile({ ...originalProfile })
      }
      setIsProfileEditing(false)
      setOriginalProfile(null)
    }
    
    setIsProfilePanelOpen(false)
  }


  const handleProfileSave = async () => {
    try {
      setIsSavingProfile(true)
      const userData = getUserData()

      if (!userData.id) {
        requestOpenLoginModal({ wizard: true })
        return
      }

      // Подготавливаем данные для отправки в БД
      const updateData = {
        first_name: ownerProfile.firstName || null,
        last_name: ownerProfile.lastName || null,
        email: ownerProfile.email || null,
        phone_number: ownerProfile.phone || null,
        country: ownerProfile.country || null
      }

      // Используем числовой ID из БД (из localStorage), а не Clerk ID
      const dbUserId = localStorage.getItem('userId')
      if (!dbUserId) {
        requestOpenLoginModal({ wizard: true })
        console.error('userId не установлен в localStorage')
        return
      }

      // Преобразуем userId в число и проверяем валидность
      const numericUserId = parseInt(dbUserId, 10)
      if (isNaN(numericUserId) || numericUserId <= 0) {
        showNotification('Ошибка: Неверный формат ID пользователя. Ожидается положительное число')
        console.error('Неверный формат userId:', dbUserId)
        return
      }

      console.log('💾 Сохранение данных профиля в БД:', {
        userId: numericUserId,
        updateData
      })

      // Обновляем данные в БД
      const response = await fetch(`${API_BASE_URL}/users/${numericUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Неизвестная ошибка' }))
        console.error('❌ Ошибка при сохранении в БД:', errorData)
        showNotification(`Ошибка при сохранении данных: ${errorData.error || 'Неизвестная ошибка'}`)
        return
      }

      const result = await response.json()
      
      if (!result.success) {
        console.error('❌ Сервер вернул ошибку:', result.error)
        showNotification(`Ошибка при сохранении данных: ${result.error || 'Неизвестная ошибка'}`)
        return
      }

      console.log('✅ Данные успешно сохранены в БД:', result.data)

      // Обновляем данные в localStorage
      const fullName = `${ownerProfile.firstName || ''} ${ownerProfile.lastName || ''}`.trim() || userData.name
      const updatedUserData = {
        ...userData,
        name: fullName,
        firstName: ownerProfile.firstName || userData.firstName,
        lastName: ownerProfile.lastName || userData.lastName,
        email: ownerProfile.email || userData.email,
        phone: ownerProfile.phone || userData.phone,
        phoneFormatted: ownerProfile.phone || userData.phoneFormatted,
        country: ownerProfile.country || userData.country,
        countryFlag: ownerProfile.countryFlag || userData.countryFlag
      }
      
      saveUserData(updatedUserData, userData.loginMethod || 'whatsapp')
      
      // Перезагружаем статус верификации после сохранения
      await loadVerificationStatus(dbUserId)
      
      // Отправляем событие для обновления статуса верификации
      window.dispatchEvent(new Event('verification-status-update'))
      
      setOriginalProfile({ ...ownerProfile })

      // Выходим из режима редактирования после успешного сохранения
      setIsProfileEditing(false)
      
      showNotification('✅ Данные профиля успешно сохранены!')
    } catch (error) {
      console.error('❌ Ошибка при сохранении профиля владельца:', error)
      showNotification(`Ошибка при сохранении данных: ${error.message || 'Неизвестная ошибка'}`)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      try {
        // Иначе сессия Clerk остаётся активной: ClerkAuthSync снова заполнит localStorage и шапка ведёт в /owner
        if (clerkUser && signOut) {
          await signOut()
        }
      } catch (error) {
        console.warn('Ошибка при выходе из Clerk:', error)
      }

      try {
        await logout()
        navigate('/')
        setTimeout(() => {
          window.location.reload()
        }, 100)
      } catch (error) {
        console.error('Ошибка при выходе:', error)
        clearUserData()
        localStorage.removeItem('userRole')
        localStorage.removeItem('isLoggedIn')
        localStorage.removeItem('userData')
        navigate('/')
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }
    }
  }

  // Статистика
  const totalProperties = properties.length
  const soldProperties = properties.filter(p => p.status === 'sold').length
  const activeProperties = properties.filter(p => p.status === 'active').length
  const pendingProperties = properties.filter(p => p.status === 'pending').length
  const rejectedProperties = properties.filter(p => p.status === 'rejected').length
  const totalRevenue = properties
    .filter(p => p.status === 'sold')
    .reduce((sum, p) => sum + (p.price || 0), 0)
  const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0)
  const totalInquiries = properties.reduce((sum, p) => sum + (p.inquiries || 0), 0)
  const totalLikes = properties.reduce((sum, p) => sum + (p.likesCount || 0), 0)
  const totalBids = properties.reduce((sum, p) => sum + (p.bidsCount || 0), 0)
  const totalSharesSoldAgg = properties.reduce((sum, p) => sum + (Number(p.shares_sold) || 0), 0)
  const convLikesToBidsPct = totalLikes > 0 ? ((totalBids / totalLikes) * 100).toFixed(1) : '0'
  const interestPerListing =
    totalProperties > 0 ? (interestCount / totalProperties).toFixed(1) : '0'

  const topListingsByEngagement = useMemo(() => {
    const score = (p) => {
      const likes = p.likesCount ?? 0
      const bids = p.bidsCount ?? 0
      const sold = Number(p.shares_sold) || 0
      const kind = getPropertyListingKind(p).key
      if (kind === 'shares') return likes * 2 + sold * 12
      return likes * 2 + bids * 6
    }
    return [...properties].sort((a, b) => score(b) - score(a)).slice(0, 3)
  }, [properties])

  const salesDynamicsSeries = useMemo(() => {
    if (!analyticsSalesData) return { months: [], max: 1 }
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', { month: 'short' }),
        count: 0,
      })
    }
    const buckets = Object.fromEntries(months.map((m) => [m.key, 0]))
    const addDate = (raw) => {
      if (!raw) return
      const dt = new Date(raw)
      if (Number.isNaN(dt.getTime())) return
      const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      if (Object.prototype.hasOwnProperty.call(buckets, k)) buckets[k] += 1
    }
    ;['auction', 'debts', 'buy_now', 'test_drive'].forEach((section) => {
      for (const item of analyticsSalesData[section] || []) addDate(item.sold_at)
    })
    for (const item of analyticsSalesData.shares || []) addDate(item.sold_at)
    const series = months.map((m) => ({ ...m, count: buckets[m.key] || 0 }))
    const max = Math.max(1, ...series.map((s) => s.count))
    return { months: series, max }
  }, [analyticsSalesData, i18n.language])

  const sellerTestDriveProperties = useMemo(
    () =>
      properties
        .filter((p) => p.test_drive)
        .map((p) => ({
          id: p.id,
          title: p.title,
          image: p.image,
          property_table: p.source_table || 'properties_apartments',
        })),
    [properties]
  )

  const handleDeleteProperty = (id) => {
    const property = properties.find(p => p.id === id)
    if (property) {
      setPropertyToDelete(property)
      setDeleteReason('')
      setShowDeleteModal(true)
    }
  }

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return
    
    if (!deleteReason.trim()) {
      showNotification('Пожалуйста, укажите причину удаления')
      return
    }

    setIsSubmittingDelete(true)
    try {
      const response = await fetch(`${API_BASE_URL}/properties/${propertyToDelete.id}/delete-request`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: deleteReason.trim()
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        showNotification('Запрос на удаление отправлен на модерацию')
        // Обновляем список объявлений
        if (userId) {
          await loadUserProperties(userId)
          // Обновляем заинтересованность
          await loadInterestCount(userId)
        }
        setShowDeleteModal(false)
        setPropertyToDelete(null)
        setDeleteReason('')
      } else {
        showNotification(result.error || 'Ошибка при отправке запроса на удаление')
      }
    } catch (error) {
      console.error('Ошибка при отправке запроса на удаление:', error)
      showNotification('Ошибка при отправке запроса на удаление')
    } finally {
      setIsSubmittingDelete(false)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteModal(false)
    setPropertyToDelete(null)
    setDeleteReason('')
  }

  const handleEditProperty = (property) => {
    if (!property?.id) return
    navigate(`/property/${property.id}/edit`, {
      state: {
        property_type: property.property_type,
        admin_added:
          property.created_by_admin === true ||
          property.created_by_admin === 1 ||
          property.added_by_admin === true ||
          property.added_by_admin === 1 ||
          property.admin_created === true ||
          property.admin_created === 1
      }
    })
  }

  const handleViewProperty = (id) => {
    navigate(`/property/${id}`, { state: { fromOwnerDashboard: true } })
  }

  const handleOpenBidAnalytics = (property) => {
    if (!property) return
    if (property.status === 'pending') {
      setModerationNotice({
        open: true,
        title: 'Объект на модерации',
        message:
          'Объект на модерации. Раздел аналитики по ставкам откроется после того, как модератор одобрит публикацию.',
      })
      return
    }
    if (property.status === 'rejected') {
      setModerationNotice({
        open: true,
        title: 'Аналитика недоступна',
        message: 'Для отклонённых объявлений график по ставкам не отображается.',
      })
      return
    }
    setPropertyForBidAnalytics(property)
  }

  // Проверка заполненности обязательных полей профиля
  const checkProfileFields = async () => {
    const dbUserId = localStorage.getItem('userId')
    const effectiveUserId = (dbUserId && /^\d+$/.test(dbUserId)) ? dbUserId : userId
    
    if (!effectiveUserId) {
      requestOpenLoginModal({ wizard: true })
      return false
    }

    try {
      const userData = await fetchUserById(API_BASE_URL, effectiveUserId)
      if (userData) {
          const fields = []
          
          if (!userData.first_name || userData.first_name.trim() === '') {
            fields.push(t('ownerProfileFirstName'))
          }
          if (!userData.last_name || userData.last_name.trim() === '') {
            fields.push(t('ownerProfileLastName'))
          }
          if (!userData.country || userData.country.trim() === '') {
            fields.push(t('ownerProfileCountry'))
          }
          if (!userData.email || userData.email.trim() === '') {
            fields.push(t('ownerProfileEmail'))
          }
          if (!userData.phone_number || userData.phone_number.trim() === '') {
            fields.push(t('ownerProfileWhatsApp'))
          }
          
          if (fields.length > 0) {
            setMissingFields(fields)
            setShowProfileFieldsModal(true)
            return false
          }
          
          return true
      }
    } catch (error) {
      console.error('Ошибка при проверке полей профиля:', error)
      // Если не удалось проверить через API, проверяем через localStorage
      const userData = getUserData()
        if (userData) {
        const fields = []
        
        if (!userData.firstName || !userData.firstName.trim()) {
          fields.push(t('ownerProfileFirstName'))
        }
        if (!userData.lastName || !userData.lastName.trim()) {
          fields.push(t('ownerProfileLastName'))
        }
        if (!userData.country || !userData.country.trim()) {
          fields.push(t('ownerProfileCountry'))
        }
        if (!userData.email || !userData.email.trim()) {
          fields.push(t('ownerProfileEmail'))
        }
        if (!userData.phone && !userData.phoneFormatted) {
          fields.push(t('ownerProfileWhatsApp'))
        }
        
        if (fields.length > 0) {
          setMissingFields(fields)
          setShowProfileFieldsModal(true)
          return false
        }
      }
      return true
    }
    
    return true
  }

  // Обработчик нажатия на кнопку "Добавить объявление"
  const handleAddProperty = async () => {
    const canProceed = await checkProfileFields()
    if (canProceed) {
      navigate('/owner/property/new')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { text: 'Активно', class: 'status-badge--active' },
      sold: { text: 'Продано', class: 'status-badge--sold' },
      pending: { text: 'На модерации', class: 'status-badge--pending' },
      rejected: { text: 'Отклонено', class: 'status-badge--rejected' }
    }
    const config = statusConfig[status] || statusConfig.pending
    return <span className={`status-badge ${config.class}`}>{config.text}</span>
  }

  // Фильтрация объявлений по статусу
  const getFilteredProperties = () => {
    if (activeFilter === 'all') {
      return properties
    } else if (activeFilter === 'active') {
      return properties.filter(p => p.status === 'active')
    } else if (activeFilter === 'pending') {
      return properties.filter(p => p.status === 'pending')
    } else if (activeFilter === 'rejected') {
      return properties.filter(p => p.status === 'rejected')
    }
    return properties
  }

  const handleExportToExcel = async () => {
    if (!userId) {
      showToast('Войдите в аккаунт, чтобы скачать отчёт', 'error')
      return
    }
    try {
      const res = await fetch(`${API_BASE_URL}/owner/${userId}/my-sales`)
      const json = await res.json().catch(() => ({}))
      const mySalesData =
        res.ok && json.success && json.data
          ? json.data
          : { auction: [], shares: [], debts: [], test_drive: [], buy_now: [] }

      const buffer = await exportOwnerAnalyticsExcel({
        formatDateSafe,
        properties,
        mySalesData,
        stats: {
          totalProperties,
          activeProperties,
          soldProperties,
          totalLikes,
          totalBids,
          totalSharesSoldAgg,
          interestCount,
          convLikesToBidsPct,
          interestPerListing,
        },
      })
      downloadXlsxBuffer(
        buffer,
        `analytics_report_${new Date().toISOString().split('T')[0]}.xlsx`
      )
    } catch (e) {
      console.error('export excel', e)
      showToast('Не удалось сформировать Excel-отчёт', 'error')
    }
  }

  const handleOwnerNotificationView = async (notificationId) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${notificationId}/view`, { method: 'PUT' })
      await loadOwnerNotifications({ silent: true })
    } catch (e) {
      console.warn('owner notif view', e)
    }
  }

  const respondOwnerTestDrive = async (notification, action, ownerComment = '') => {
    let payload = notification?.data
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch {
        payload = null
      }
    }
    if (!payload?.booking_id) {
      showToast('Не удалось прочитать заявку. Обновите страницу.', 'error')
      return
    }
    if (!userId) {
      showToast('Не найден пользователь', 'error')
      return
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/test-drive-bookings/${payload.booking_id}/respond`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            action,
            owner_comment: action === 'approve' ? ownerComment : undefined,
          }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        showToast(json.error || 'Не удалось выполнить действие', 'error')
        return
      }
      showToast(
        action === 'approve' ? 'Тест-драйв подтверждён' : 'Заявка отклонена',
        'success',
        4000
      )
      await loadOwnerNotifications({ silent: true })
    } catch (e) {
      console.error('owner test-drive respond', e)
      showToast('Ошибка сети', 'error')
    }
  }

  return (
    <div className="owner-dashboard">
      <header className="owner-dashboard__header">
        <div
          className="owner-dashboard__header-content"
          ref={headerContentRef}
        >
          <div className="owner-dashboard__header-left">
            <h1 className="owner-dashboard__title" ref={titleRef}>
              {`${ownerProfile.firstName || ''} ${ownerProfile.lastName || ''}`.trim() || t('ownerDashboardTitleFallback')}
            </h1>
            <p className="owner-dashboard__subtitle">{t('ownerDashboardSubtitle')}</p>
          </div>
          <div className="owner-dashboard__header-right">
            {isMobileViewport || isMobileTitleStacked ? (
              <div className="owner-dashboard__burger-wrapper">
                <button
                  className="owner-dashboard__icon-btn owner-dashboard__burger-btn"
                  aria-label={t('menu')}
                  onClick={() => setIsMobileMenuOpen(prev => !prev)}
                  aria-expanded={isMobileMenuOpen}
                >
                  <FiMenu size={20} />
                </button>
                {isMobileMenuOpen && (
                  <div className="owner-dashboard__mobile-menu">
                    <button
                      className="owner-dashboard__mobile-menu-item owner-dashboard__mobile-menu-item--notifications"
                      onClick={() => {
                        setOwnerNotifOpen(true)
                        setIsMobileMenuOpen(false)
                      }}
                      aria-label={t('notifications')}
                    >
                      <FiBell size={18} />
                    </button>
                    <button
                      className="owner-dashboard__mobile-menu-item owner-dashboard__mobile-menu-item--profile"
                      onClick={() => {
                        setIsProfilePanelOpen(true)
                        setIsMobileMenuOpen(false)
                      }}
                      aria-label={t('profile')}
                    >
                      <FiUser size={18} />
                    </button>
                    <button
                      className="owner-dashboard__mobile-menu-item owner-dashboard__mobile-menu-item--add"
                      onClick={() => {
                        handleAddProperty()
                        setIsMobileMenuOpen(false)
                      }}
                      aria-label={t('addProperty')}
                    >
                      <FiPlus size={18} />
                    </button>
                    <button
                      className="owner-dashboard__mobile-menu-item owner-dashboard__mobile-menu-item--logout"
                      onClick={() => {
                        handleLogout()
                        setIsMobileMenuOpen(false)
                      }}
                      aria-label={t('logOutLabel') || 'Выйти'}
                    >
                      <FiLogOut size={18} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="owner-dashboard__icon-btn"
                  onClick={() => {
                    setOwnerNotifOpen((open) => !open)
                    setIsProfilePanelOpen(false)
                  }}
                  aria-label={t('notifications')}
                >
                  <FiBell size={20} />
                </button>
                <button 
                  className="owner-dashboard__icon-btn"
                  onClick={() => {
                    setIsProfilePanelOpen(true)
                  }}
                  aria-label={t('profile')}
                >
                  <FiUser size={20} />
                </button>
                <button 
                  className="owner-dashboard__add-btn"
                  onClick={handleAddProperty}
                >
                  <FiPlus size={20} />
                  <span>{t('addProperty')}</span>
                </button>
                <button 
                  className="owner-dashboard__logout-btn"
                  onClick={handleLogout}
                >
                  <FiLogOut size={20} />
                  <span>{t('logOutLabel') || 'Выйти'}</span>
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Переключатель вкладок */}
        <div className="owner-dashboard__tabs">
          <button
            className={`owner-dashboard__tab ${activeTab === 'properties' ? 'owner-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            <FiList size={20} />
            <span>{t('ownerTabListings')}</span>
          </button>
          <button
            className={`owner-dashboard__tab ${activeTab === 'analytics' ? 'owner-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <FiBarChart2 size={20} />
            <span>{t('ownerTabAnalytics')}</span>
          </button>
          <button
            className={`owner-dashboard__tab ${activeTab === 'sales' ? 'owner-dashboard__tab--active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            <FiShoppingBag size={20} />
            <span>{t('ownerTabMySales')}</span>
          </button>
        </div>
      </header>

      {ownerNotifOpen && (
        <>
          <div
            className="notification-backdrop"
            onClick={() => setOwnerNotifOpen(false)}
            role="presentation"
          />
          <div className="notification-panel">
            <div className="notification-panel__content">
              <div className="notification-panel__header">
                <h3 className="notification-panel__title">{t('notifications')}</h3>
                <button
                  type="button"
                  className="notification-panel__close"
                  onClick={() => setOwnerNotifOpen(false)}
                  aria-label={t('closeNotifications') || 'Закрыть'}
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="notification-panel__list">
                {ownerNotifLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>{t('loading')}</div>
                ) : ownerNotifications.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    {t('noNotifications')}
                  </div>
                ) : (
                  ownerNotifications.map((notification) => {
                    return (
                      <div
                        key={notification.id}
                        className={`notification-item ${getNotificationItemClass(notification)}`}
                        onClick={() => {
                          if (notification.type === 'test_drive_request') return
                          handleOwnerNotificationView(notification.id)
                        }}
                      >
                        <div className="notification-item__content">
                          <h4 className="notification-item__title">{notification.title}</h4>
                          {notification.message && (
                            <p className="notification-item__message">{notification.message}</p>
                          )}
                          {notification.type === 'test_drive_request' && notification.data?.booking_id ? (
                            <div
                              className="notification-item__test-drive-actions"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="notification-item__button notification-item__button--approve"
                                onClick={() => respondOwnerTestDrive(notification, 'approve')}
                              >
                                Подтвердить
                              </button>
                              <button
                                type="button"
                                className="notification-item__button notification-item__button--reject"
                                onClick={() => respondOwnerTestDrive(notification, 'reject')}
                              >
                                Отклонить
                              </button>
                            </div>
                          ) : notification.data && notification.data.property_id ? (
                            <div className="notification-item__property">
                              <div className="notification-item__info">
                                <button
                                  type="button"
                                  className="notification-item__button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOwnerNotifOpen(false)
                                    navigate(`/property/${notification.data.property_id}`)
                                  }}
                                >
                                  {t('goTo')}
                                  <FiArrowRight size={18} />
                                </button>
                              </div>
                            </div>
                          ) : null}
                          {!notification.data && (
                            <button
                              type="button"
                              className="notification-item__button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOwnerNotifOpen(false)
                              }}
                            >
                              {t('close')}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="notification-panel__sheet-handle" aria-hidden="true">
                <span className="notification-panel__sheet-pill" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Уведомление о необходимости заполнить данные — пока не заполнены все поля вкладки «Профиль» */}
      {verificationStatus && !shouldHideOwnerVerificationBanner(verificationStatus) && (
        <div className="owner-verification-notification">
          <div className="owner-verification-notification__content">
            <div className="owner-verification-notification__icon">
              <FiAlertCircle size={24} />
            </div>
            <div className="owner-verification-notification__text">
              <h4 className="owner-verification-notification__title">{t('ownerVerificationBannerTitle')}</h4>
              <p className="owner-verification-notification__message">
                {t('ownerVerificationBannerText')}
              </p>
            </div>
            <button
              className="owner-verification-notification__button"
              onClick={() => setIsProfilePanelOpen(true)}
            >
              {t('ownerVerificationBannerBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Уведомление об успешной верификации */}
      {showVerificationSuccess && (
        <div className="owner-verification-success">
          <div className="owner-verification-success__content">
            <div className="owner-verification-success__icon">
              <FiCheck size={24} />
            </div>
            <div className="owner-verification-success__text">
              <h4 className="owner-verification-success__title">{t('verificationSuccessTitle') || 'Поздравляем!'}</h4>
              <p className="owner-verification-success__message">
                {t('verificationSuccessText') || 'Ваша верификация успешно одобрена администратором. Теперь вы можете использовать все возможности платформы.'}
              </p>
            </div>
            <button
              className="owner-verification-success__close"
              onClick={() => setShowVerificationSuccess(false)}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="owner-dashboard__content">
        {/* Статистика - показывается всегда */}
        <section className="owner-dashboard__stats">
          <QuickAddCard onClick={() => setShowFileUploadModal(true)} />

          <div className="stat-card stat-card--properties">
            <div className="stat-card__icon">
              <FiHome size={32} />
            </div>
            <div className="stat-card__content">
              <h3 className="stat-card__label">{t('ownerStatsTotalListingsLabel')}</h3>
              <p className="stat-card__value">{totalProperties}</p>
              <p className="stat-card__subtext">{t('ownerStatsTotalListingsActive', { count: activeProperties })}</p>
            </div>
          </div>

          <div className="stat-card stat-card--views">
            <div className="stat-card__icon">
              <FiUsers size={32} />
            </div>
            <div className="stat-card__content">
              <h3 className="stat-card__label">{t('ownerStatsInterestLabel')}</h3>
              <p className="stat-card__value">{interestCount.toLocaleString('ru-RU')}</p>
              <p className="stat-card__subtext">{t('ownerStatsInterestSubtitle')}</p>
            </div>
          </div>

          <div className="stat-card stat-card--trending">
            <div className="stat-card__icon">
              <FiTrendingUp size={32} />
            </div>
            <div className="stat-card__content">
              <h3 className="stat-card__label">{t('ownerStatsAveragePriceLabel')}</h3>
              <p className="stat-card__value">
                ${totalProperties > 0 ? Math.round(properties.reduce((sum, p) => sum + (p.price || 0), 0) / totalProperties).toLocaleString('ru-RU') : '0'}
              </p>
              <p className="stat-card__subtext">{t('ownerStatsAveragePriceSubtitle')}</p>
            </div>
          </div>
        </section>

        {/* Блок «Мои продажи» */}
        {activeTab === 'sales' && userId ? (
          <OwnerMySalesSection userId={userId} apiBaseUrl={API_BASE_URL} />
        ) : null}

        {/* Блок "Рассчитать стоимость объекта" */}

        {activeTab === 'properties' && (
          <div className="property-calculator-card">
            <div className="property-calculator-card__image">
              <img 
                src="https://t4.ftcdn.net/jpg/18/28/02/25/360_F_1828022572_oAUGr6FsgeCSUty8xFbtsj2pOwXdthho.jpg" 
                alt={t('ownerCalcTitle')} 
              />
            </div>
            <div className="property-calculator-card__content">
              <h2 className="property-calculator-card__title">{t('ownerCalcTitle')}</h2>
              <p className="property-calculator-card__description">
                {t('ownerCalcSubtitle')}
              </p>
              <button 
                className="property-calculator-card__button"
                onClick={() => setIsCalculatorModalOpen(true)}
              >
                {t('ownerCalcButton')}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'properties' && userId ? (
          <OwnerPurchasedAssets userId={userId} />
        ) : null}

        {/* Контент вкладок */}
        {activeTab === 'properties' && (
          <section className="owner-dashboard__properties">
          <div className="owner-dashboard__section-header">
            <h2 className="owner-dashboard__section-title">
              <FiList size={24} />
              Мои объявления
            </h2>
            <div className="owner-dashboard__filters">
              <button 
                className={`filter-btn ${activeFilter === 'all' ? 'filter-btn--active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                Все
              </button>
              <button 
                className={`filter-btn ${activeFilter === 'active' ? 'filter-btn--active' : ''}`}
                onClick={() => setActiveFilter('active')}
              >
                Активные
              </button>
              <button 
                className={`filter-btn ${activeFilter === 'pending' ? 'filter-btn--active' : ''}`}
                onClick={() => setActiveFilter('pending')}
              >
                На модерации
              </button>
              <button 
                className={`filter-btn ${activeFilter === 'rejected' ? 'filter-btn--active' : ''}`}
                onClick={() => setActiveFilter('rejected')}
              >
                Отклонено
              </button>
            </div>
          </div>

          <div className="properties-grid owner-properties-grid">
            {propertiesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Загрузка объявлений...</p>
              </div>
            ) : getFilteredProperties().length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>У вас пока нет объявлений</p>
              </div>
            ) : (
              getFilteredProperties().map((property) => {
                const kind = getPropertyListingKind(property)
                const startingPriceRaw =
                  property.auction_starting_price ??
                  property.auctionStartingPrice ??
                  property.starting_price ??
                  property.startingPrice ??
                  null

                const formatPrice = (price) => {
                  const num = Number(price)
                  if (!num || Number.isNaN(num)) return '—'
                  return num.toLocaleString('ru-RU')
                }

                const getCurrencySymbol = () => {
                  const currency = property.currency || 'USD'
                  if (currency === 'EUR') return '€'
                  if (currency === 'BYN') return 'Br'
                  if (currency === 'USD') return '$'
                  return '$'
                }

                const minSalePriceNum = Number(property.price) || 0
                const hasMinSalePrice = property.isAuction && minSalePriceNum > 0

                const startNum = Number(startingPriceRaw)
                const apiCurrent = Number(property.currentBid ?? property.current_bid)
                const showAuctionCurrentBid = kind.key === 'auction' || kind.key === 'auction_buy_now'
                const currentBidValue =
                  showAuctionCurrentBid &&
                  (Number.isFinite(apiCurrent) && apiCurrent > 0
                    ? apiCurrent
                    : Number.isFinite(startNum) && startNum > 0
                      ? startNum
                      : null)

                return (
                  <div key={property.id} className="property-card property-card-owner">
                    <div className="property-image-container property-card-owner__image">
                      <img 
                        src={property.image} 
                        alt={property.title}
                        className="property-image"
                        onError={(e) => {
                          // Если изображение не загрузилось, используем дефолтное
                          e.target.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80'
                        }}
                      />
                      {getStatusBadge(property.status)}
                    </div>

                    <div className="property-content property-card-owner__content">
                      <div className="property-card-owner__header">
                        <div className="property-card-owner__title-wrapper">
                          <h3 className="property-card-owner__title">{property.title}</h3>
                          {(() => {
                            const icon =
                              kind.key === 'shares' ? (
                                <FiLayers size={14} aria-hidden />
                              ) : kind.key === 'debt' ? (
                                <FiAlertCircle size={14} aria-hidden />
                              ) : kind.key === 'auction' ? (
                                <FiClock size={14} aria-hidden />
                              ) : kind.key === 'auction_buy_now' ? (
                                <FiZap size={14} aria-hidden />
                              ) : (
                                <FiTag size={14} aria-hidden />
                              )
                            return (
                              <span
                                className={`property-listing-kind property-listing-kind--${kind.classSuffix}`}
                                title={kind.label}
                              >
                                {icon}
                                <span className="property-listing-kind__text">{kind.label}</span>
                              </span>
                            )
                          })()}
                        </div>
                        {/* Цена «купить сейчас» / фикс. + под ней текущая ставка для аукциона */}
                        {(() => {
                          const priceNum = Number(property.price) || 0
                          const shouldShowPrice =
                            (!property.isAuction || (property.isAuction && priceNum > 0)) && priceNum > 0
                          const showBidUnderPrice =
                            showAuctionCurrentBid && currentBidValue != null
                          if (!shouldShowPrice && !showBidUnderPrice) return null
                          return (
                            <div className="property-card-owner__price-column">
                              {shouldShowPrice ? (
                                <div className="property-card-owner__price">
                                  ${priceNum.toLocaleString('ru-RU')}
                                </div>
                              ) : null}
                              {showBidUnderPrice ? (
                                <div
                                  className={`property-card-owner__current-bid ${
                                    ownerBidPulseIds[property.id] ? 'property-card-owner__current-bid--pulse' : ''
                                  }`}
                                >
                                  <span className="property-card-owner__current-bid-label">Текущая ставка</span>
                                  <span className="property-card-owner__current-bid-value-row">
                                    <span className="property-card-owner__current-bid-value">
                                      {getCurrencySymbol()}
                                      {formatPrice(currentBidValue)}
                                    </span>
                                    {ownerBidPulseIds[property.id] ? (
                                      <FiArrowUp
                                        className="property-card-owner__current-bid-arrow"
                                        size={18}
                                        aria-hidden
                                      />
                                    ) : null}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          )
                        })()}
                      </div>

                      <p className="property-card-owner__location">{property.location}</p>

                      <div className="property-card-owner__info">
                        <div className="property-card-owner__info-item">
                          <MdBed size={16} />
                          <span>{property.beds}</span>
                        </div>
                        <div className="property-card-owner__info-item">
                          <MdOutlineBathtub size={16} />
                          <span>{property.baths}</span>
                        </div>
                        <div className="property-card-owner__info-item">
                          <BiArea size={16} />
                          <span>{property.sqft} м²</span>
                        </div>
                      </div>

                      {/* Дублируем статус специально для мобильной версии под данными объекта */}
                      <div className={`property-status-indicator property-status-indicator--${property.status} property-status-indicator--mobile`}>
                        {property.status === 'active' && <span>Активно</span>}
                        {property.status === 'pending' && <span>На модерации</span>}
                        {property.status === 'rejected' && <span>Отклонено</span>}
                        {property.status === 'sold' && <span>Продано</span>}
                      </div>

                      <div className="property-content-bottom">
                      <div className="property-card-owner__stats">
                        <div className="property-card-owner__stat">
                          <FiHeart size={14} aria-hidden />
                          <span>
                            {ruCountWithNoun(property.likesCount ?? 0, 'лайк', 'лайка', 'лайков')}
                          </span>
                        </div>
                        <div className="property-card-owner__stat">
                          <FiActivity size={14} aria-hidden />
                          <span>
                            {ruCountWithNoun(property.bidsCount ?? 0, 'ставка', 'ставки', 'ставок')}
                          </span>
                        </div>
                        <div className="property-card-owner__stat property-card-owner__stat--status">
                          <span>
                            Статус:{' '}
                            {property.status === 'active'
                              ? 'Опубликован'
                              : property.status === 'pending'
                                ? 'На модерации'
                                : property.status === 'rejected'
                                  ? 'Отклонено'
                                  : property.status === 'sold'
                                    ? 'Продано'
                                    : 'Не указано'}
                          </span>
                        </div>
                        {property.rejectionReason && !property.rejectionReason.startsWith('EDIT:') && (
                          <div className="property-card-owner__stat" style={{ color: '#ef4444', fontWeight: 500 }}>
                            <FiAlertCircle size={14} />
                            <span>Причина отклонения: {property.rejectionReason}</span>
                          </div>
                        )}
                        {(property.rejectionReason && property.rejectionReason.startsWith('EDIT:')) || property.hasPendingEdit ? (
                          <div className="property-card-owner__stat property-card-owner__stat--pending-edit">
                            <FiClock size={14} className="property-card-owner__pending-edit-icon" />
                            <span className="property-card-owner__pending-edit-text">
                              <span className="property-card-owner__pending-edit-text-line">Изменения отправлены</span>
                              <span className="property-card-owner__pending-edit-text-line">и ожидают проверки</span>
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="property-card-owner__actions">
                        {property.status === 'active' && (
                          <button
                            className="action-btn action-btn--history"
                            onClick={() => setSelectedPropertyForHistory(property)}
                          >
                            История
                          </button>
                        )}
                        <button
                          type="button"
                          className="action-btn action-btn--analytics"
                          onClick={() => handleOpenBidAnalytics(property)}
                        >
                          <FiBarChart2 size={14} aria-hidden />
                          Аналитика
                        </button>
                        <button
                          className="action-btn action-btn--view"
                          onClick={() => handleViewProperty(property.id)}
                        >
                          Просмотр
                        </button>
                        <button
                          className="action-btn action-btn--edit"
                          onClick={() => handleEditProperty(property)}
                        >
                          Изменить
                        </button>
                        <button
                          className="action-btn action-btn--delete"
                          onClick={() => handleDeleteProperty(property.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
        )}

        {activeTab === 'analytics' && (
          <section className="owner-dashboard__analytics">
            <div className="analytics-section">
              <div className="analytics-section__header">
                <h2 className="analytics-section__title">{t('ownerAnalyticsTitle')}</h2>
                <button 
                  className="analytics-section__export-btn"
                  onClick={handleExportToExcel}
                  aria-label={t('ownerAnalyticsExportExcel')}
                >
                  <FiDownload size={18} />
                  <span>{t('ownerAnalyticsExportExcel')}</span>
                </button>
              </div>
              
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3 className="analytics-card__title">{t('ownerAnalyticsSalesDynamics')}</h3>
                  <div className="analytics-chart analytics-chart--sales">
                    {analyticsSalesLoading || !analyticsSalesData ? (
                      <div className="analytics-chart__loading">{t('ownerAnalyticsChartLoading')}</div>
                    ) : salesDynamicsSeries.months.length === 0 ? (
                      <div className="chart-placeholder chart-placeholder--compact">
                        <p>{t('ownerAnalyticsChartEmpty')}</p>
                      </div>
                    ) : (
                      <>
                        <svg
                          className="owner-sales-dynamics-svg"
                          viewBox="0 0 360 150"
                          preserveAspectRatio="xMidYMid meet"
                          role="img"
                          aria-label={t('ownerAnalyticsSalesDynamics')}
                        >
                          <defs>
                            <linearGradient id="ownerSalesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
                            </linearGradient>
                            <linearGradient id="ownerSalesLineGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#4f46e5" />
                              <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                          </defs>
                          {(() => {
                            const months = salesDynamicsSeries.months
                            const max = salesDynamicsSeries.max
                            const w = 320
                            const h = 88
                            const padX = 16
                            const padY = 8
                            const n = months.length
                            const pts = months.map((m, i) => {
                              const x =
                                n <= 1
                                  ? padX + w / 2
                                  : padX + (i / (n - 1)) * (w - 2 * padX)
                              const ratio = max > 0 ? m.count / max : 0
                              const y = padY + (1 - ratio) * (h - 2 * padY)
                              return { x, y, ...m }
                            })
                            const baseline = padY + h - 2 * padY
                            const lineD = pts
                              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                              .join(' ')
                            const areaD = `${lineD} L ${pts[pts.length - 1].x.toFixed(1)} ${baseline} L ${pts[0].x.toFixed(1)} ${baseline} Z`
                            return (
                              <>
                                <path d={areaD} fill="url(#ownerSalesAreaGrad)" />
                                <path
                                  d={lineD}
                                  fill="none"
                                  stroke="url(#ownerSalesLineGrad)"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                {pts.map((p) => (
                                  <circle key={p.key} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#4f46e5" strokeWidth="2" />
                                ))}
                              </>
                            )
                          })()}
                        </svg>
                        <div className="owner-sales-dynamics-labels">
                          {salesDynamicsSeries.months.map((m) => (
                            <span key={m.key} className="owner-sales-dynamics-labels__item">
                              {m.label}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="analytics-card">
                  <h3 className="analytics-card__title">{t('ownerAnalyticsTopListings')}</h3>
                  <div className="top-properties">
                    {topListingsByEngagement.length === 0 ? (
                      <p className="top-properties__empty">{t('ownerAnalyticsTopEmpty')}</p>
                    ) : null}
                    {topListingsByEngagement.map((property, index) => {
                      const kind = getPropertyListingKind(property).key
                      const likes = property.likesCount ?? 0
                      const bids = property.bidsCount ?? 0
                      const purchases = Number(property.shares_sold) || 0
                      const statsText =
                        kind === 'shares'
                          ? t('ownerAnalyticsTopStatsShares', { likes, purchases })
                          : t('ownerAnalyticsTopStatsBids', { likes, bids })
                      return (
                        <div key={property.id} className="top-property-item">
                          <div className="top-property-item__rank">#{index + 1}</div>
                          <div className="top-property-item__content">
                            <h4 className="top-property-item__title">{property.title}</h4>
                            <p className="top-property-item__stats">{statsText}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="analytics-card">
                  <h3 className="analytics-card__title">{t('ownerAnalyticsConversion')}</h3>
                  <div className="conversion-stats">
                    <div className="conversion-item">
                      <span className="conversion-item__label">{t('ownerAnalyticsConvLikesToBids')}</span>
                      <span className="conversion-item__value">{convLikesToBidsPct}%</span>
                    </div>
                    <div className="conversion-item">
                      <span className="conversion-item__label">{t('ownerAnalyticsConvInterestPerListing')}</span>
                      <span className="conversion-item__value">{interestPerListing}</span>
                    </div>
                    <div className="conversion-item">
                      <span className="conversion-item__label">{t('ownerAnalyticsConvSharesSold')}</span>
                      <span className="conversion-item__value">{totalSharesSoldAgg}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="analytics-bottom-row analytics-bottom-row--single">
                <div className="analytics-card analytics-card--half">
                  <h3 className="analytics-card__title">{t('ownerAnalyticsStatsByStatus')}</h3>
                  <div className="status-stats">
                    <div className="status-stat-item">
                      <div className="status-stat-item__indicator status-stat-item__indicator--active"></div>
                      <div className="status-stat-item__content">
                        <span className="status-stat-item__label">{t('ownerAnalyticsStatusActive')}</span>
                        <span className="status-stat-item__value">{activeProperties}</span>
                      </div>
                    </div>
                    <div className="status-stat-item">
                      <div className="status-stat-item__indicator status-stat-item__indicator--sold"></div>
                      <div className="status-stat-item__content">
                        <span className="status-stat-item__label">{t('ownerAnalyticsStatusSold')}</span>
                        <span className="status-stat-item__value">{soldProperties}</span>
                      </div>
                    </div>
                    <div className="status-stat-item">
                      <div className="status-stat-item__indicator status-stat-item__indicator--pending"></div>
                      <div className="status-stat-item__content">
                        <span className="status-stat-item__label">{t('ownerAnalyticsStatusPending')}</span>
                        <span className="status-stat-item__value">{pendingProperties}</span>
                      </div>
                    </div>
                    <div className="status-stat-item">
                      <div className="status-stat-item__indicator status-stat-item__indicator--rejected"></div>
                      <div className="status-stat-item__content">
                        <span className="status-stat-item__label">{t('ownerAnalyticsStatusRejected')}</span>
                        <span className="status-stat-item__value">{rejectedProperties}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {userId ? (
                <OwnerTestDriveSection
                  embedded
                  userId={userId}
                  apiBaseUrl={API_BASE_URL}
                  sellerTestDriveProperties={sellerTestDriveProperties}
                />
              ) : null}
            </div>
          </section>
        )}
      </div>

      {/* Модальное окно приветствия */}
      <WelcomeModal 
        isOpen={showWelcomeModal}
        onClose={handleWelcomeClose}
        userName={`${ownerProfile.firstName || ''} ${ownerProfile.lastName || ''}`.trim() || 'Ваш кабинет продавца'}
      />

      <OwnerSaleCelebrationModal
        celebration={saleCelebration}
        onClose={finishSaleCelebrationAndPoll}
        onGoToSales={handleSaleCelebrationGoToSales}
      />

      {/* Модальное окно загрузки файла */}
      <FileUploadModal
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        userId={userId}
        onSuccess={() => {
          if (userId) loadUserProperties(userId)
        }}
      />

      {/* Модальное окно калькулятора стоимости */}
      <PropertyCalculatorModal
        isOpen={isCalculatorModalOpen}
        onClose={() => setIsCalculatorModalOpen(false)}
      />

      {/* Модальное окно истории ставок */}
      <BiddingHistoryModal
        isOpen={!!selectedPropertyForHistory}
        onClose={() => setSelectedPropertyForHistory(null)}
        property={selectedPropertyForHistory}
      />

      <OwnerModerationNoticeModal
        isOpen={moderationNotice.open}
        onClose={() => setModerationNotice((s) => ({ ...s, open: false }))}
        title={moderationNotice.title}
        message={moderationNotice.message}
      />

      <OwnerPropertyBidAnalyticsModal
        isOpen={!!propertyForBidAnalytics}
        onClose={() => setPropertyForBidAnalytics(null)}
        property={propertyForBidAnalytics}
      />

      {/* Модальное окно о необходимости заполнить поля профиля */}
      {showProfileFieldsModal && (
        <div 
          className="profile-fields-modal-overlay"
          onClick={() => setShowProfileFieldsModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            className="profile-fields-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0ABAB5 0%, #089C97 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FiAlertCircle size={24} color="#ffffff" />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                    {t('profileFieldsModalTitle')}
                  </h2>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                    {t('profileFieldsModalSubtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileFieldsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginLeft: '12px'
                }}
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '15px', fontWeight: '500' }}>
                {t('profileFieldsModalMissingTitle')}
              </p>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px',
                listStyle: 'none'
              }}>
                {missingFields.map((field, index) => (
                  <li key={index} style={{
                    marginBottom: '8px',
                    color: '#6b7280',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#0ABAB5',
                      flexShrink: 0
                    }}></span>
                    {field}
                  </li>
                ))}
              </ul>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowProfileFieldsModal(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
              >
                {t('profileFieldsModalCancel')}
              </button>
              <button
                onClick={() => {
                  setShowProfileFieldsModal(false)
                  setIsProfilePanelOpen(true)
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#333';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#000';
                }}
              >
                <FiUser size={16} />
                {t('profileFieldsModalGoToProfile')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно удаления объявления */}
      {showDeleteModal && propertyToDelete && (
        <div 
          className="delete-modal-overlay"
          onClick={handleCancelDelete}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            className="delete-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
                Удаление объявления
              </h2>
              <button
                onClick={handleCancelDelete}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 1rem 0', color: '#4b5563', fontSize: '0.95rem' }}>
                Вы собираетесь отправить запрос на удаление объявления <strong>"{propertyToDelete.title || 'Без названия'}"</strong>.
              </p>
              <p style={{ margin: '0 0 1rem 0', color: '#4b5563', fontSize: '0.95rem' }}>
                Пожалуйста, укажите причину удаления. Запрос будет отправлен на модерацию администратору.
              </p>
              <label 
                htmlFor="delete-reason"
                style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#111827',
                  fontSize: '0.95rem'
                }}
              >
                Причина удаления <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Например: Объект уже продан, ошибка в данных, передумал продавать..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                disabled={isSubmittingDelete}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelDelete}
                disabled={isSubmittingDelete}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmittingDelete ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  opacity: isSubmittingDelete ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isSubmittingDelete) {
                    e.target.style.backgroundColor = '#e5e7eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmittingDelete) {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete || !deleteReason.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isSubmittingDelete || !deleteReason.trim() ? '#9ca3af' : '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmittingDelete || !deleteReason.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmittingDelete && deleteReason.trim()) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmittingDelete && deleteReason.trim()) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
              >
                {isSubmittingDelete ? (
                  <>
                    <span>Отправка...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 size={16} />
                    Отправить на модерацию
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Панель профиля */}
      {isProfilePanelOpen && (
        <>
          <div 
            className="owner-sidebar-backdrop"
            onClick={handleCloseProfilePanel}
          />
          <div className="owner-sidebar-panel owner-sidebar-panel--profile">
            <div className="owner-sidebar-panel__content">
              <div className="owner-sidebar-panel__header">
                <h3 className="owner-sidebar-panel__title">{t('ownerProfileTitle')}</h3>
                <button 
                  type="button" 
                  className="owner-sidebar-panel__close"
                  onClick={handleCloseProfilePanel}
                  aria-label={t('ownerProfileCloseAria')}
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="owner-sidebar-panel__body">
                {/* Кнопки редактирования профиля */}
                <div className="owner-profile-section owner-profile-section--actions">
                  <div className="owner-profile-actions">
                    {isProfileEditing ? (
                      <>
                        <button
                          className="owner-profile-section__button owner-profile-section__button--primary"
                          onClick={handleProfileSave}
                          disabled={isSavingProfile}
                        >
                          {isSavingProfile ? t('ownerProfileSaving') : t('ownerProfileSave')}
                        </button>
                        <button
                        type="button"
                        className="owner-profile-section__button"
                        onClick={() => {
                          // Восстанавливаем исходные данные при отмене
                          if (originalProfile) {
                            setOwnerProfile({ ...originalProfile })
                          }
                          setIsProfileEditing(false)
                          setOriginalProfile(null)
                        }}
                        disabled={isSavingProfile}
                        style={{ marginLeft: 8 }}
                      >
                        {t('ownerProfileCancel')}
                      </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="owner-profile-section__button"
                        onClick={() => {
                          // Сохраняем исходные данные перед началом редактирования
                          setOriginalProfile({ ...ownerProfile })
                          setIsProfileEditing(true)
                        }}
                      >
                        {t('ownerProfileEdit')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">{t('ownerProfileFirstName')}</h4>
                  <input
                    type="text"
                    className="owner-profile-section__value-input"
                    value={ownerProfile.firstName}
                    onChange={(e) => handleProfileFieldChange('firstName', e.target.value)}
                    placeholder={t('ownerProfilePlaceholderFirstName')}
                    disabled={!isProfileEditing}
                  />
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">{t('ownerProfileLastName')}</h4>
                  <input
                    type="text"
                    className="owner-profile-section__value-input"
                    value={ownerProfile.lastName}
                    onChange={(e) => handleProfileFieldChange('lastName', e.target.value)}
                    placeholder={t('ownerProfilePlaceholderLastName')}
                    disabled={!isProfileEditing}
                  />
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">{t('ownerProfileCountry')}</h4>
                  {isProfileEditing ? (
                    <CountrySelect
                      value={ownerProfile.country}
                      onChange={(countryName) => {
                        // Находим страну в списке для получения флага
                        const selectedCountry = countryList.find(c => c.name === countryName)
                        handleProfileFieldChange('country', countryName)
                        if (selectedCountry) {
                          handleProfileFieldChange('countryFlag', selectedCountry.flag)
                        }
                      }}
                      placeholder={t('ownerProfilePlaceholderCountry')}
                    />
                  ) : (
                    <div className="owner-profile-section__value">
                      {(() => {
                        const selectedCountry = countryList.find(c => c.name === ownerProfile.country || c.code === ownerProfile.country)
                        if (!ownerProfile.country) return t('ownerProfileCountryNotSpecified')
                        const code = selectedCountry?.code ?? (ownerProfile.country?.length === 2 ? ownerProfile.country : null)
                        const displayName = code
                          ? (() => {
                              try {
                                return new Intl.DisplayNames([i18n.language?.split('-')[0] || 'ru'], { type: 'region' }).of(code)
                              } catch {
                                return selectedCountry?.name ?? ownerProfile.country
                              }
                            })()
                          : ownerProfile.country
                        return (
                          <>
                            {selectedCountry && <span style={{ marginRight: '6px' }}>{selectedCountry.flag}</span>}
                            {displayName}
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">{t('ownerProfileSubscription')}</h4>
                  <p className="owner-profile-section__value">{t('ownerProfileSubscriptionBasic')}</p>
                  <button className="owner-profile-section__button">{t('ownerProfileChangeSubscription')}</button>
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">{t('ownerProfileEmail')}</h4>
                  <input
                    type="email"
                    className="owner-profile-section__value-input"
                    value={ownerProfile.email}
                    onChange={(e) => handleProfileFieldChange('email', e.target.value)}
                    placeholder={t('ownerProfilePlaceholderEmail')}
                    disabled={!isProfileEditing}
                  />
                </div>
                <div className="owner-profile-section">
                  <h4 className="owner-profile-section__title">{t('ownerProfileWhatsApp')}</h4>
                  <input
                    type="tel"
                    className="owner-profile-section__value-input"
                    value={ownerProfile.phone}
                    onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                    placeholder={t('ownerProfilePlaceholderPhone')}
                    disabled={!isProfileEditing}
                  />
                </div>
                {isProfileEditing && (
                  <div className="owner-profile-section owner-profile-section--save-below-whatsapp">
                    <button
                      type="button"
                      className="owner-profile-section__button owner-profile-section__button--primary owner-profile-section__button--save-below"
                      onClick={handleProfileSave}
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? t('ownerProfileSaving') : t('ownerProfileSave')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default OwnerDashboard
