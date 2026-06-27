import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiX, FiSend, FiPhone, FiMail, FiMessageCircle } from 'react-icons/fi'
import { WhatsAppIcon, TelegramIcon } from '../components/icons/ContactChannelIcons'
import Header from '../components/Header'
import PageBreadcrumbs from '../components/PageBreadcrumbs'
import Hero from '../components/Hero'
import PropertyList from '../components/PropertyList'
import DepositButton from '../components/DepositButton'
import DepositButtonSkeleton from '../components/DepositButtonSkeleton'
import {
  getUserData,
  isAuthenticated,
  CLERK_DB_USER_SYNCED,
  fetchNumericDbUserIdForApi,
  getStoredNumericUserId,
} from '../services/authService'
import {
  getCachedList,
  hasCachedList,
  fetchAuctionList,
  setCachedList,
  resolveAuctionCurrentBidValue,
  patchCachedAuctionPropertyBid,
} from '../services/auctionListCache'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import './Home.css'

import { getApiBaseUrl } from '../utils/apiConfig'
import { fetchUserDeposit } from '../utils/depositApi'
import { getEffectiveAuctionEndTime } from '../utils/auctionReminderBounds'
import { useManagerLiveChat } from '../hooks/useManagerLiveChat'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { isAuctionRoute as checkAuctionRoute } from '../utils/auctionFilterUrl'
import { useViewerVipAccess } from '../hooks/useViewerVipAccess'

const FAQLazy = lazy(() => import('../components/FAQ'))

const MOBILE_BREAKPOINT = 768

function formatPropertyForList(prop, isAuction) {
  return {
    ...prop,
    title: prop.title || prop.name || '',
    location: prop.location || '',
    price: prop.price || (isAuction ? prop.auction_starting_price : 0) || 0,
    currentBid: isAuction ? resolveAuctionCurrentBidValue(prop) : null,
    endTime: isAuction ? getEffectiveAuctionEndTime(prop) : null,
    isAuction,
    test_timer_end_date: prop.test_timer_end_date || null,
    images: prop.images || (prop.image ? [prop.image] : []),
    image: prop.image || (prop.images && prop.images[0] ? prop.images[0] : null),
    rooms: prop.rooms || prop.beds || 0,
    beds: prop.bedrooms || prop.rooms || prop.beds || 0,
    bedrooms: prop.bedrooms || prop.rooms || 0,
    bathrooms: prop.bathrooms || 0,
    area: prop.area || prop.sqft || 0,
    sqft: prop.area || prop.sqft || 0,
    floor: prop.floor || null,
    total_floors: prop.total_floors || prop.totalFloors || null,
    year_built: prop.year_built || null,
    land_area: prop.land_area || null,
    renovation: prop.renovation || null,
    condition: prop.condition || null,
    heating: prop.heating || null,
    water_supply: prop.water_supply || null,
    sewerage: prop.sewerage || null
  }
}

function Home() {
  const { t } = useTranslation()
  const [auctionProperties, setAuctionProperties] = useState(() => getCachedList())
  const [loading, setLoading] = useState(() => !hasCachedList())
  const [userDeposit, setUserDeposit] = useState(0)
  const [depositLoading, setDepositLoading] = useState(() => Boolean(getStoredNumericUserId()))
  const userData = getUserData()
  const [dbUserId, setDbUserId] = useState(() => getStoredNumericUserId())
  const navigate = useNavigate()
  const location = useLocation()
  const isAuctionRoute = checkAuctionRoute(location.pathname)
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  )
  const { cabinetVipActive, numericUserId } = useViewerVipAccess()
  const cabinetVipRef = useRef(false)
  const viewerUserIdRef = useRef(null)
  const [showFaq, setShowFaq] = useState(false)
  const faqSentinelRef = useRef(null)
  
  // Состояния для чата AI
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isManagerChatOpen, setIsManagerChatOpen] = useState(false)
  const [managerChatInput, setManagerChatInput] = useState('')
  const [floatWidgetsHiddenByFooter, setFloatWidgetsHiddenByFooter] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [isSlowAIResponse, setIsSlowAIResponse] = useState(false)
  const slowResponseTimerRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const lastMessageRef = useRef(null)
  const [userPreferences, setUserPreferences] = useState({
    purpose: null, // 'для себя', 'под сдачу', 'инвестиции'
    budget: null,
    location: null, // 'Испания', 'Дубай'
    propertyType: null, // 'квартира', 'вилла', 'апартаменты', 'дом'
    rooms: null,
    area: null,
    other: null,
    managerContactRequested: false,
    managerContactPendingChoice: false,
    preferredContact: null
  })

  useEffect(() => {
    const check = () => setIsMobileViewport(window.innerWidth <= MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    cabinetVipRef.current = cabinetVipActive
  }, [cabinetVipActive])

  useEffect(() => {
    viewerUserIdRef.current =
      Number.isFinite(Number(numericUserId)) && Number(numericUserId) >= 1 ? Number(numericUserId) : null
  }, [numericUserId])

  // Загрузка объявлений: при наличии кэша — только фоновое обновление (без "Загрузка объявлений...")
  const loadProperties = useCallback(async (backgroundRefresh = false) => {
    if (!backgroundRefresh) setLoading(true)
    try {
      const viewerId = numericUserId ?? getStoredNumericUserId()
      const list = await fetchAuctionList(viewerId ?? undefined)
      setAuctionProperties(list)
    } catch (error) {
      console.error('❌ Ошибка загрузки объявлений:', error)
    } finally {
      setLoading(false)
    }
  }, [numericUserId])

  const homeListRef = useRef(null)

  // Сразу запрашиваем данные при монтировании (кэш уже может быть от prefetch в App)
  useEffect(() => {
    loadProperties(hasCachedList())
  }, [loadProperties])

  // Подписка на новые объекты аукциона по SSE — без polling, только push от сервера при одобрении админом
  useEffect(() => {
    let eventSource = null
    let reconnectTimer = null
    let cancelled = false

    const connect = async () => {
      const base = await getApiBaseUrl()
      if (cancelled) return // cleanup уже запущен — не создавать новое соединение
      const url = base.startsWith('http') ? `${base}/events/auction-updates` : `${window.location.origin}${base}/events/auction-updates`
      eventSource = new EventSource(url)
      eventSource.onopen = () => {
        if (reconnectTimer) clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      eventSource.onmessage = (event) => {
        try {
          if (event.data.startsWith(':')) return
          const data = JSON.parse(event.data)
          if (data.type === 'test_timer_update' && data.property) {
            const patch = data.property
            const idNum = Number(patch.id)
            if (!Number.isFinite(idNum)) return
            const cleared = patch.test_timer_end_date == null || patch.test_timer_end_date === ''
            setAuctionProperties((prev) => {
              let found = false
              const mapped = prev.map((item) => {
                if (Number(item.id) !== idNum) return item
                found = true
                const merged = { ...item }
                if (cleared) {
                  merged.test_timer_end_date = null
                  merged.test_timer_duration = null
                } else {
                  merged.test_timer_end_date = patch.test_timer_end_date
                  merged.test_timer_duration =
                    patch.test_timer_duration != null ? patch.test_timer_duration : item.test_timer_duration
                }
                const hasTT = merged.test_timer_end_date != null && merged.test_timer_end_date !== ''
                const isAuction =
                  item.isAuction === true ||
                  hasTT ||
                  item.is_auction === true ||
                  item.is_auction === 1
                return formatPropertyForList(merged, isAuction)
              })
              if (!found && !cleared) {
                fetchAuctionList().then(setAuctionProperties).catch(() => {})
              } else {
                setCachedList(mapped)
              }
              return mapped
            })
            return
          }
          if (data.type !== 'new_auction_objects' || !Array.isArray(data.properties) || data.properties.length === 0) return
          const newFormatted = data.properties.map(p => formatPropertyForList(p, true))
          setAuctionProperties((prev) => {
            const prevIds = new Set(prev.map((x) => Number(x.id)))
            const toAdd = newFormatted.filter((p) => {
              if (p.id == null || prevIds.has(Number(p.id))) return false
              const pc = p.private_club_only === 1 || p.private_club_only === true || p.private_club_only === '1'
              const ownerId = Number(p.user_id)
              const isOwnLot =
                Number.isFinite(ownerId) &&
                Number.isFinite(viewerUserIdRef.current) &&
                ownerId === viewerUserIdRef.current
              if (pc && !cabinetVipRef.current && !isOwnLot) return false
              return true
            })
            if (toAdd.length === 0) return prev
            const rankPc = (p) =>
              p.private_club_only === 1 || p.private_club_only === true || p.private_club_only === '1' ? 1 : 0
            const endKey = (p) => {
              const raw = p.endTime || p.auction_end_date || p.test_timer_end_date || ''
              const t = raw ? new Date(raw).getTime() : 0
              return Number.isFinite(t) ? t : 0
            }
            const merged = [...toAdd, ...prev]
            merged.sort((a, b) => {
              const d = rankPc(b) - rankPc(a)
              if (d !== 0) return d
              return endKey(a) - endKey(b)
            })
            return merged
          })
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
          connect()
        }, 2000)
      }
    }
    connect()
    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (eventSource) eventSource.close()
    }
  }, [])

  useEffect(() => {
    const applyBidToState = (propertyId, bid, sourceTable) => {
      if (!Number.isFinite(propertyId) || !Number.isFinite(bid)) return
      setAuctionProperties((prev) =>
        prev.map((item) => {
          if (Number(item?.id) !== propertyId) return item
          return {
            ...item,
            currentBid: Math.max(resolveAuctionCurrentBidValue(item), bid),
          }
        })
      )
      patchCachedAuctionPropertyBid(propertyId, bid, sourceTable)
    }

    const syncActualBidFromApi = async (propertyId, sourceTable) => {
      try {
        const apiBase = await getApiBaseUrl()
        const table =
          sourceTable ??
          auctionProperties.find((p) => Number(p?.id) === propertyId)?.source_table ??
          auctionProperties.find((p) => Number(p?.id) === propertyId)?.sourceTable
        const q =
          table != null
            ? `?property_table=${encodeURIComponent(String(table))}`
            : ''
        const response = await fetch(`${apiBase}/bids/property/${propertyId}${q}`)
        if (!response.ok) return
        const payload = await response.json()
        const bids = payload?.success && Array.isArray(payload?.data) ? payload.data : []
        if (bids.length === 0) return
        const maxBid = Math.max(
          ...bids
            .map((b) => Number(b?.bid_amount))
            .filter((n) => Number.isFinite(n))
        )
        if (Number.isFinite(maxBid)) {
          applyBidToState(propertyId, maxBid, table)
        }
      } catch {
        // ignore network sync errors
      }
    }

    const handleBidSync = (event) => {
      const propertyId = Number(event?.detail?.propertyId)
      const bid = Number(event?.detail?.currentBid)
      const propertyTable = event?.detail?.property_table
      if (!Number.isFinite(propertyId)) return
      if (Number.isFinite(bid)) applyBidToState(propertyId, bid, propertyTable)
      void syncActualBidFromApi(propertyId, propertyTable)
    }

    window.addEventListener('syb-auction-current-bid-updated', handleBidSync)
    return () => window.removeEventListener('syb-auction-current-bid-updated', handleBidSync)
  }, [])

  // Синхронизация числового userId после Clerk→БД (депозит не должен «обнуляться» из‑за user_xxx в storage)
  useEffect(() => {
    const applyNumericUserIdFromStorage = () => {
      const savedUserId = localStorage.getItem('userId')
      if (savedUserId && /^\d+$/.test(savedUserId)) {
        const n = parseInt(savedUserId, 10)
        setDbUserId((prev) => (prev === n ? prev : n))
      }
    }
    applyNumericUserIdFromStorage()
    window.addEventListener(CLERK_DB_USER_SYNCED, applyNumericUserIdFromStorage)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, applyNumericUserIdFromStorage)
  }, [])

  // Числовой id БД — после idle, без ожидания Clerk
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const id = await fetchNumericDbUserIdForApi({ clerkUser: null, clerkUserLoaded: false })
      if (!cancelled && id != null) {
        setDbUserId((prev) => (prev === id ? prev : id))
      }
    }
    const schedule =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? () => window.requestIdleCallback(() => void run(), { timeout: 5000 })
        : () => window.setTimeout(() => void run(), 1200)
    const handle = schedule()
    return () => {
      cancelled = true
      if (typeof handle === 'number') {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          window.cancelIdleCallback(handle)
        } else if (typeof window !== 'undefined') {
          window.clearTimeout(handle)
        }
      }
    }
  }, [])

  // Загружаем депозит пользователя (после idle — не конкурирует с листингом)
  useEffect(() => {
    let cancelled = false

    const loadUserDeposit = async () => {
      if (!dbUserId) {
        if (!localStorage.getItem('isLoggedIn') || localStorage.getItem('isLoggedIn') !== 'true') {
          setUserDeposit(0)
        }
        setDepositLoading(false)
        return
      }

      setDepositLoading(true)
      try {
        const API_BASE_URL = await getApiBaseUrl()
        const deposit = await fetchUserDeposit(API_BASE_URL, dbUserId, { ttlMs: 15000 })
        if (
          !cancelled &&
          deposit &&
          typeof deposit.depositAmount === 'number'
        ) {
          setUserDeposit(deposit.depositAmount || 0)
        }
      } catch (error) {
        console.error('Ошибка загрузки депозита:', error)
        if (!cancelled) setUserDeposit(0)
      } finally {
        if (!cancelled) setDepositLoading(false)
      }
    }

    const schedule =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? () => window.requestIdleCallback(() => void loadUserDeposit(), { timeout: 6000 })
        : () => window.setTimeout(() => void loadUserDeposit(), 1500)

    const handle = schedule()
    const onFocus = () => void loadUserDeposit()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      if (typeof handle === 'number') {
        if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
          window.cancelIdleCallback(handle)
        } else if (typeof window !== 'undefined') {
          window.clearTimeout(handle)
        }
      }
    }
  }, [dbUserId])

  const isLoggedIn = isAuthenticated() || Boolean(getUserData()?.isLoggedIn)
  const getChatUserId = useMemo(() => {
    if (isLoggedIn) {
      const currentUserData = getUserData()
      const userId = currentUserData.id || localStorage.getItem('userId') || dbUserId
      if (userId) {
        return `user_${userId}`
      }
    }

    let sessionId = localStorage.getItem('chatSessionId')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('chatSessionId', sessionId)
    }
    return sessionId
  }, [isLoggedIn, dbUserId])

  const {
    liveChatToken,
    managerConnecting,
    managerMessagesRef,
    managerThreadUi,
    enterLiveManagerChat,
    pauseManagerPolling,
    sendManagerMessage,
  } = useManagerLiveChat(getChatUserId, t)

  const openManagerChatDock = useCallback(async () => {
    if (!isSiteUserSignedIn(null, false)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setIsChatOpen(false)
    setIsManagerChatOpen(true)
    try {
      await enterLiveManagerChat()
    } catch {
      setIsManagerChatOpen(false)
    }
  }, [enterLiveManagerChat])

  const closeManagerChatDock = useCallback(() => {
    setIsManagerChatOpen(false)
    setManagerChatInput('')
    pauseManagerPolling()
  }, [pauseManagerPolling])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('managerChatStateChange', { detail: { isOpen: isManagerChatOpen } })
    )
  }, [isManagerChatOpen])

  useEffect(() => {
    const onOpenManager = () => {
      void openManagerChatDock()
    }
    window.addEventListener('openManagerChat', onOpenManager)
    return () => window.removeEventListener('openManagerChat', onOpenManager)
  }, [openManagerChatDock])

  // Функции для чата AI
  const toggleChat = () => {
    setIsChatOpen((prev) => {
      const next = !prev
      if (next) {
        setIsManagerChatOpen(false)
        pauseManagerPolling()
      }
      return next
    })
  }

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value)
  }

  const handleButtonClick = async (buttonText, meta = null) => {
    if (meta?.contactPref) {
      await handleChatSubmit(null, null, { contactPref: meta.contactPref })
      return
    }
    await handleChatSubmit(null, buttonText)
  }

  const handleChatSubmit = async (e, buttonText = null, options = {}) => {
    if (e) e.preventDefault()

    const { contactPref } = options || {}
    let userMessage = buttonText || chatInput.trim()
    if (contactPref) {
      const labelMap = {
        phone: t('managerContactPrefPhone'),
        email: t('managerContactPrefEmail'),
        whatsapp: t('managerContactPrefWhatsapp'),
        telegram: t('managerContactPrefTelegram'),
        live_chat: t('managerContactPrefLiveChat'),
      }
      userMessage = labelMap[contactPref] || contactPref
    }
    if (!userMessage) return

    if (!buttonText && !contactPref) {
      setChatInput('')
    }

    // Добавляем сообщение пользователя
    const userMessageObj = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessageObj])

    if (contactPref) {
      setUserPreferences((prev) => ({
        ...prev,
        preferredContact: contactPref,
        managerContactRequested: true,
        managerContactPendingChoice: false
      }))
      if (contactPref === 'live_chat') {
        const botMessage = {
          id: Date.now() + 1,
          text: t('liveChatWaitNotice'),
          sender: 'bot',
          timestamp: new Date(),
          buttons: null,
          recommendations: null,
        }
        setChatMessages((prev) => [...prev, botMessage])
        setIsChatOpen(false)
        if (!isSiteUserSignedIn(null, false)) {
          requestOpenLoginModal({ wizard: true })
          return
        }
        void openManagerChatDock()
        return
      }
      if (contactPref === 'telegram') {
        const tgUrl = (import.meta.env.VITE_MANAGER_TELEGRAM_URL || '').trim()
        const botMessage = {
          id: Date.now() + 1,
          text: tgUrl ? t('managerContactThanksTelegram') : t('liveChatTelegramNotConfigured'),
          sender: 'bot',
          timestamp: new Date(),
          buttons: null,
          recommendations: null
        }
        setChatMessages((prev) => [...prev, botMessage])
        if (tgUrl) window.open(tgUrl, '_blank', 'noopener,noreferrer')
        return
      }
      const thanksText =
        contactPref === 'phone'
          ? t('managerContactThanksPhone')
          : contactPref === 'email'
            ? t('managerContactThanksEmail')
            : t('managerContactThanksWhatsapp')
      const botMessage = {
        id: Date.now() + 1,
        text: thanksText,
        sender: 'bot',
        timestamp: new Date(),
        buttons: null,
        recommendations: null
      }
      setChatMessages((prev) => [...prev, botMessage])
      return
    }

    // Обновляем предпочтения на основе сообщения
    const lowerMessage = userMessage.toLowerCase()
    
    // Определяем цель
    if (lowerMessage.includes('для себя') || lowerMessage === 'для себя' || lowerMessage.includes('сам') || lowerMessage.includes('личн')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'для себя' }))
    } else if (lowerMessage.includes('под сдачу') || lowerMessage === 'под сдачу' || lowerMessage.includes('сдачу') || lowerMessage.includes('аренд')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'под сдачу' }))
    } else if (lowerMessage.includes('инвестиц') || lowerMessage === 'инвестиции' || lowerMessage.includes('инвест')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'инвестиции' }))
    }
    
    // Определяем локацию
    if (lowerMessage.includes('испания') || lowerMessage.includes('spain') || lowerMessage.includes('españa') || 
        lowerMessage.includes('tenerife') || lowerMessage.includes('тенерифе') || lowerMessage.includes('коста') ||
        lowerMessage.includes('barcelona') || lowerMessage.includes('madrid')) {
      setUserPreferences(prev => ({ ...prev, location: 'Испания' }))
    } else if (lowerMessage.includes('дубай') || lowerMessage.includes('dubai') || lowerMessage.includes('uae') || 
               lowerMessage.includes('оаэ') || lowerMessage.includes('emirates')) {
      setUserPreferences(prev => ({ ...prev, location: 'Дубай' }))
    }

    // Извлекаем бюджет из сообщения (конвертируем рубли в евро, если указаны)
    const budgetMatch = userMessage.match(/(\d+[\s,.]?\d*)\s*(тыс|млн|k|m|€|\$|eur|usd|евро|доллар|рубл|₽|rub)/i)
    if (budgetMatch) {
      let budget = parseFloat(budgetMatch[1].replace(/\s/g, '').replace(',', '.'))
      const unit = budgetMatch[2].toLowerCase()
      
      // Конвертируем в евро (примерный курс: 1 EUR = 100 RUB)
      const eurToRubRate = 100
      
      if (unit.includes('млн') || unit === 'm') {
        budget = budget * 1000000
      } else if (unit.includes('тыс') || unit === 'k') {
        budget = budget * 1000
      }
      
      // Если указаны рубли, конвертируем в евро
      if (unit.includes('рубл') || unit.includes('₽') || unit.includes('rub')) {
        budget = budget / eurToRubRate
      }
      
      setUserPreferences(prev => ({ ...prev, budget }))
    }
    
    // Определяем тип недвижимости
    if (lowerMessage.includes('квартир') || lowerMessage.includes('апартамент') || lowerMessage.includes('apartment')) {
      setUserPreferences(prev => ({ ...prev, propertyType: 'квартира' }))
    } else if (lowerMessage.includes('вилл') || lowerMessage.includes('villa')) {
      setUserPreferences(prev => ({ ...prev, propertyType: 'вилла' }))
    } else if (lowerMessage.includes('дом') || lowerMessage.includes('таунхаус') || lowerMessage.includes('townhouse') || lowerMessage.includes('house')) {
      setUserPreferences(prev => ({ ...prev, propertyType: 'дом' }))
    }
    
    // Извлекаем количество комнат
    const roomsMatch = userMessage.match(/(\d+)\s*(комнат|room|bed)/i)
    if (roomsMatch) {
      setUserPreferences(prev => ({ ...prev, rooms: parseInt(roomsMatch[1]) }))
    }

    let wantsManager = false
    try {
      const { detectManagerContactIntent } = await import('../services/aiService')
      wantsManager = await detectManagerContactIntent(userMessage)
    } catch {
      wantsManager = false
    }

    if (wantsManager) {
      const { getManagerContactButtons } = await import('../services/liveChatApi')
      const alreadyDone = userPreferences.preferredContact
      if (alreadyDone) {
        const methodLabel =
          alreadyDone === 'phone'
            ? t('managerContactPrefPhone')
            : alreadyDone === 'email'
              ? t('managerContactPrefEmail')
              : alreadyDone === 'whatsapp'
                ? t('managerContactPrefWhatsapp')
                : alreadyDone === 'telegram'
                  ? t('managerContactPrefTelegram')
                  : alreadyDone === 'live_chat'
                    ? t('managerContactPrefLiveChat')
                    : String(alreadyDone)
        const botMessage = {
          id: Date.now() + 1,
          text: t('managerRequestAlready', { method: methodLabel }),
          sender: 'bot',
          timestamp: new Date(),
          buttons: null,
          recommendations: null
        }
        setChatMessages((prev) => [...prev, botMessage])
        return
      }
      if (userPreferences.managerContactPendingChoice) {
        const botMessage = {
          id: Date.now() + 1,
          text: t('managerContactPickHint'),
          sender: 'bot',
          timestamp: new Date(),
          buttons: getManagerContactButtons(t),
          recommendations: null
        }
        setChatMessages((prev) => [...prev, botMessage])
        return
      }

      setUserPreferences((prev) => ({
        ...prev,
        managerContactRequested: true,
        managerContactPendingChoice: true
      }))
      const botMessage = {
        id: Date.now() + 1,
        text: t('managerRequestAck'),
        sender: 'bot',
        timestamp: new Date(),
        buttons: getManagerContactButtons(t),
        recommendations: null
      }
      setChatMessages((prev) => [...prev, botMessage])
      return
    }

    setIsLoadingAI(true)
    setIsSlowAIResponse(false)
    if (slowResponseTimerRef.current) {
      clearTimeout(slowResponseTimerRef.current)
      slowResponseTimerRef.current = null
    }
    slowResponseTimerRef.current = setTimeout(() => setIsSlowAIResponse(true), 6000)

    try {
      const { askPropertyAssistant } = await import('../services/aiService')
      const response = await askPropertyAssistant(
        [...chatMessages, userMessageObj],
        userPreferences,
        auctionProperties
      )

      // Добавляем ответ бота
      const botMessage = {
        id: Date.now() + 1,
        text: response.text,
        sender: 'bot',
        timestamp: new Date(),
        buttons: response.buttons,
        recommendations: response.recommendations
      }

      setChatMessages((prev) => [...prev, botMessage])
    } catch (error) {
      console.error('Ошибка при обращении к AI:', error)
      const errorMessage = {
        id: Date.now() + 1,
        text: t('chatError'),
        sender: 'bot',
        timestamp: new Date(),
        buttons: null,
        recommendations: null
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      if (slowResponseTimerRef.current) {
        clearTimeout(slowResponseTimerRef.current)
        slowResponseTimerRef.current = null
      }
      setIsLoadingAI(false)
      setIsSlowAIResponse(false)
    }
  }

  const canShowDeposit = () => {
    if (!isAuthenticated() && !getUserData()?.isLoggedIn) return false

    const roleRaw = getUserData()?.role || localStorage.getItem('userRole') || 'buyer'
    const userRole = String(roleRaw || 'buyer').toLowerCase()
    if (userRole === 'seller' || userRole === 'owner' || userRole === 'admin') return false
    return userRole === 'buyer' || userRole === 'client'
  }

  // Загружаем историю чата из localStorage при монтировании компонента или изменении пользователя
  const chatHistoryLoadedRef = useRef(false)
  const lastChatUserIdRef = useRef(null)
  
  useEffect(() => {
    const chatUserId = getChatUserId
    // Загружаем историю только если изменился идентификатор пользователя
    if (lastChatUserIdRef.current !== chatUserId) {
      try {
        const historyKey = `aiChatHistory_${chatUserId}`
        const preferencesKey = `aiChatPreferences_${chatUserId}`
        
        // Загружаем историю сообщений
        const savedChatHistory = localStorage.getItem(historyKey)
        if (savedChatHistory) {
          const parsed = JSON.parse(savedChatHistory)
          // Преобразуем timestamp из строк в Date объекты
          const messagesWithDates = parsed.map(msg => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }))
          setChatMessages(messagesWithDates)
        } else {
          // Если нет сохраненной истории, показываем приветственное сообщение
          setChatMessages([{
            id: 1,
            text: t('chatWelcomeMessage'),
            sender: 'bot',
            timestamp: new Date(),
            buttons: [t('chatPurposeSelf'), t('chatPurposeRent'), t('chatPurposeInvest')],
          }])
        }
        
        // Загружаем предпочтения пользователя
        const savedPreferences = localStorage.getItem(preferencesKey)
        if (savedPreferences) {
          const parsed = JSON.parse(savedPreferences)
          setUserPreferences(parsed)
        }
        
        lastChatUserIdRef.current = chatUserId
        chatHistoryLoadedRef.current = true
      } catch (error) {
        console.error('Ошибка при загрузке истории чата:', error)
        lastChatUserIdRef.current = chatUserId
        chatHistoryLoadedRef.current = true
      }
    }
  }, [getChatUserId]) // Загружаем при изменении идентификатора пользователя

  // Сохраняем историю чата в localStorage при каждом изменении
  useEffect(() => {
    if (!chatHistoryLoadedRef.current || chatMessages.length === 0) return
    try {
      const historyKey = `aiChatHistory_${getChatUserId}`
      localStorage.setItem(historyKey, JSON.stringify(chatMessages))
    } catch (error) {
      console.error('Ошибка при сохранении истории чата:', error)
    }
  }, [chatMessages, getChatUserId])

  // Синхронизация с сервером — только когда чат открыт
  useEffect(() => {
    if (!isChatOpen) return undefined
    if (!chatHistoryLoadedRef.current || chatMessages.length === 0) return undefined

    const timer = window.setTimeout(() => {
      try {
        const chatUserId = getChatUserId
        const currentUserData = getUserData()
        import('../services/assistantLeadService').then(({ syncAssistantLead }) => {
          syncAssistantLead(
            chatUserId,
            chatMessages,
            userPreferences,
            currentUserData?.isLoggedIn ? currentUserData : null,
          )
        })
      } catch (error) {
        console.error('Ошибка при синхронизации умного помощника:', error)
      }
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [isChatOpen, chatMessages, userPreferences, getChatUserId])

  // Сохраняем предпочтения пользователя в localStorage
  useEffect(() => {
    if (chatHistoryLoadedRef.current) {
      try {
        const chatUserId = getChatUserId
        const preferencesKey = `aiChatPreferences_${chatUserId}`
        localStorage.setItem(preferencesKey, JSON.stringify(userPreferences))
      } catch (error) {
        console.error('Ошибка при сохранении предпочтений:', error)
      }
    }
  }, [userPreferences, getChatUserId])

  // При ответе бота — скролл к началу ответа; при своём сообщении — вниз
  useEffect(() => {
    if (!chatMessagesRef.current || !isChatOpen) return
    const last = chatMessages[chatMessages.length - 1]
    if (last?.sender === 'bot' && lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
    } else {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages, isChatOpen])

  // Обновляем window.isChatOpen и отправляем событие для синхронизации с хедером
  useEffect(() => {
    window.isChatOpen = isChatOpen
    // Отправляем событие для обновления состояния в Header
    window.dispatchEvent(new CustomEvent('aiChatStateChange', { 
      detail: { isOpen: isChatOpen } 
    }))
  }, [isChatOpen])

  // Обработчик события для открытия AI чата из хедера
  useEffect(() => {
    const handleOpenAIChat = () => {
      setIsManagerChatOpen(false)
      pauseManagerPolling()
      setIsChatOpen(true)
    }

    window.addEventListener('openAIChat', handleOpenAIChat)

    return () => {
      window.removeEventListener('openAIChat', handleOpenAIChat)
    }
  }, [pauseManagerPolling])

  useEffect(() => {
    const footer = document.getElementById('site-footer')
    if (!footer) return

    const getScrollRoot = () => document.querySelector('.app-layout') || null

    let observer = null
    const connect = () => {
      if (observer) {
        observer.disconnect()
        observer = null
      }
      observer = new IntersectionObserver(
        ([entry]) => {
          setFloatWidgetsHiddenByFooter(Boolean(entry?.isIntersecting))
        },
        {
          root: getScrollRoot(),
          rootMargin: '0px 0px -12% 0px',
          threshold: [0, 0.02, 0.5],
        }
      )
      observer.observe(footer)
    }

    connect()
    const raf = requestAnimationFrame(() => connect())
    return () => {
      cancelAnimationFrame(raf)
      if (observer) observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const node = faqSentinelRef.current
    if (!node || showFaq) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShowFaq(true)
          observer.disconnect()
        }
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [showFaq])

  // История чата сохраняется в localStorage и не очищается при закрытии страницы
  // Каждый пользователь видит только свою переписку

  return (
    <div className={isAuctionRoute ? 'home-page home-page--auction' : 'home-page'}>
      <div
        className={`home-auction-floats${floatWidgetsHiddenByFooter ? ' home-auction-floats--footer-near' : ''}`}
        aria-hidden={floatWidgetsHiddenByFooter && !isChatOpen && !isManagerChatOpen}
      >
        {canShowDeposit() &&
          (depositLoading ? (
            <DepositButtonSkeleton />
          ) : (
            <DepositButton amount={userDeposit} />
          ))}
        <button
          type="button"
          className="ai-button"
          onClick={toggleChat}
          aria-label="AI Assistant"
          aria-expanded={isChatOpen}
        >
          AI
        </button>

        {isChatOpen && (
        <div className="chat-widget">
          <div className="chat-widget__header">
            <div className="chat-widget__header-info">
              <div className="chat-widget__avatar">AI</div>
              <div className="chat-widget__header-text">
                <h3 className="chat-widget__title">{t('chatTitle')}</h3>
                <span className="chat-widget__status">{t('chatOnline')}</span>
              </div>
            </div>
            <button
              type="button"
              className="chat-widget__close"
              onClick={toggleChat}
              aria-label={t('closeChat')}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="chat-widget__messages" ref={chatMessagesRef}>
            {chatMessages.map((message, idx) => (
              <div
                key={message.id}
                ref={idx === chatMessages.length - 1 ? lastMessageRef : null}
                className={`chat-widget__message ${
                  message.sender === 'user'
                    ? 'chat-widget__message--user'
                    : 'chat-widget__message--bot'
                }`}
              >
                <div className="chat-widget__message-content">
                  {message.text}
                  {message.recommendations && message.recommendations.length > 0 && (
                    <div className="chat-widget__recommendations">
                      <div className="chat-widget__recommendations-title">{t('chatRecommendationsTitle')}</div>
                      {message.recommendations.map((recId) => {
                        const property = auctionProperties.find(p => p.id === recId)
                        if (!property) return null
                        const propertyName = property.name || property.title || t('listingDefault')
                        const propertyPrice = property.price ? `${property.price.toLocaleString('ru-RU')} €` : t('priceNotSpecified')
                        const propertyArea = property.area || property.sqft
                        const propertyRooms = property.rooms || property.beds
                        
                        return (
                          <a
                            key={recId}
                            href={getPropertyDetailPath(recId, { property })}
                            className="chat-widget__recommendation-link"
                            onClick={(e) => {
                              e.preventDefault()
                              if (!ensureCanOpenProperty()) return
                              navigate(getPropertyDetailPath(recId, { property }), {
                                state: { property: property },
                              })
                              setIsChatOpen(false)
                            }}
                          >
                            <div className="chat-widget__recommendation-item">
                              <div className="chat-widget__recommendation-title">{propertyName}</div>
                              <div className="chat-widget__recommendation-location">{property.location}</div>
                              <div className="chat-widget__recommendation-details">
                                {propertyRooms && <span>{t('roomCount', { count: propertyRooms })}</span>}
                                {propertyArea && <span>{propertyArea} {t('squareMeters')}</span>}
                              </div>
                              <div className="chat-widget__recommendation-price">{propertyPrice}</div>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
                {message.buttons && message.buttons.length > 0 && (
                  <div
                    className={`chat-widget__buttons${
                      message.buttons.some((b) => typeof b === 'object' && b?.type === 'contact_pref')
                        ? ' chat-widget__buttons--contact'
                        : ''
                    }`}
                  >
                    {message.buttons.map((button, index) => {
                      if (typeof button === 'object' && button?.type === 'contact_pref') {
                        const IconCmp =
                          button.value === 'phone'
                            ? FiPhone
                            : button.value === 'email'
                              ? FiMail
                              : button.value === 'whatsapp'
                                ? WhatsAppIcon
                                : button.value === 'telegram'
                                  ? TelegramIcon
                                  : FiMessageCircle
                        return (
                          <button
                            key={index}
                            type="button"
                            className="chat-widget__button chat-widget__button--contact"
                            onClick={() =>
                              !isLoadingAI && handleButtonClick(null, { contactPref: button.value })
                            }
                            disabled={isLoadingAI}
                          >
                            <IconCmp size={18} aria-hidden />
                            <span>{button.label}</span>
                          </button>
                        )
                      }
                      return (
                        <button
                          key={index}
                          className="chat-widget__button"
                          onClick={() => !isLoadingAI && handleButtonClick(button)}
                          disabled={isLoadingAI}
                        >
                          {button}
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="chat-widget__message-time">
                  {message.timestamp.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
            {isLoadingAI && (
              <div className="chat-widget__message chat-widget__message--bot">
                <div className="chat-widget__message-content">
                  <div className="chat-widget__typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  {isSlowAIResponse && (
                    <div className="chat-widget__slow-hint">{t('chatSlowHint')}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <form className="chat-widget__input-form" onSubmit={handleChatSubmit}>
            <input
              type="text"
              className="chat-widget__input"
              placeholder={
                isLoadingAI ? t('aiThinking') : t('chatPlaceholder')
              }
              value={chatInput}
              onChange={handleChatInputChange}
              disabled={isLoadingAI}
              autoFocus
            />
            <button
              type="submit"
              className="chat-widget__send"
              aria-label={t('sendMessage')}
              disabled={isLoadingAI}
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
        )}

        {isManagerChatOpen && (
          <div
            className={`chat-widget chat-widget--manager-dock${
              isChatOpen ? ' chat-widget--stacked-above-ai' : ''
            }`}
            role="dialog"
            aria-label={t('chatManagerTitle')}
          >
            <div className="chat-widget__header">
              <div className="chat-widget__header-info">
                <div className="chat-widget__avatar chat-widget__avatar--manager">M</div>
                <div className="chat-widget__header-text">
                  <h3 className="chat-widget__title">{t('chatManagerTitle')}</h3>
                  <span className="chat-widget__status">{t('chatManagerOnline')}</span>
                </div>
              </div>
              <button
                type="button"
                className="chat-widget__close"
                onClick={closeManagerChatDock}
                aria-label={t('closeChat')}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="chat-widget__messages" ref={managerMessagesRef}>
              {managerConnecting && (
                <div className="chat-widget__message chat-widget__message--bot">
                  <div className="chat-widget__message-content">
                    <div className="chat-widget__typing" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </div>
                    <p className="chat-widget__manager-connect-hint">{t('liveChatWaitNotice')}</p>
                  </div>
                </div>
              )}
              {!managerConnecting &&
                managerThreadUi.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-widget__message ${
                      message.sender === 'user'
                        ? 'chat-widget__message--user'
                        : message.sender === 'manager'
                          ? 'chat-widget__message--manager'
                          : 'chat-widget__message--system'
                    }`}
                  >
                    <div className="chat-widget__message-content">{message.text}</div>
                    <div className="chat-widget__message-time">{message.time}</div>
                  </div>
                ))}
            </div>

            <form
              className="chat-widget__input-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (!managerChatInput.trim() || managerConnecting || !liveChatToken) return
                const text = managerChatInput.trim()
                setManagerChatInput('')
                void sendManagerMessage(text)
              }}
            >
              <input
                type="text"
                className="chat-widget__input"
                placeholder={t('chatPlaceholder')}
                value={managerChatInput}
                onChange={(e) => setManagerChatInput(e.target.value)}
                autoComplete="off"
                disabled={managerConnecting || !liveChatToken}
              />
              <button
                type="submit"
                className="chat-widget__send"
                aria-label={t('sendMessage')}
                disabled={managerConnecting || !liveChatToken}
              >
                <FiSend size={18} />
              </button>
            </form>
          </div>
        )}
      </div>

      <Header />
      <Hero staticMobileCards={isAuctionRoute} />
      {isAuctionRoute && isMobileViewport && (
        <div className="page-context-heading page-context-heading--home-auction">
          <div className="page-context-heading--home-auction-inner">
            <h1 className="page-context-heading__title page-context-heading__title--auction-script">
              {t('auction')}
            </h1>
            <PageBreadcrumbs className="page-breadcrumbs--flat-club" separator=">" />
          </div>
        </div>
      )}
      <div ref={homeListRef} className="home-list-wrap">
        <PropertyList
          auctionProperties={auctionProperties}
          onOpenAIChat={toggleChat}
          loading={loading}
          floatWidgetsHiddenByFooter={floatWidgetsHiddenByFooter}
          viewerHasVip={cabinetVipActive}
        />
      </div>
      <div ref={faqSentinelRef} aria-hidden="true" />
      {showFaq ? (
        <Suspense fallback={null}>
          <FAQLazy />
        </Suspense>
      ) : null}
    </div>
  )
}

export default Home
