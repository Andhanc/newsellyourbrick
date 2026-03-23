import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiX, FiSend } from 'react-icons/fi'
import Header from '../components/Header'
import Hero from '../components/Hero'
import PropertyList from '../components/PropertyList'
import FAQ from '../components/FAQ'
import DepositButton from '../components/DepositButton'
import { getUserData, isAuthenticated } from '../services/authService'
import { syncAssistantLead } from '../services/assistantLeadService'
import { askPropertyAssistant } from '../services/aiService'
import { getCachedList, hasCachedList, fetchAuctionList } from '../services/auctionListCache'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import './Home.css'

import { getApiBaseUrl } from '../utils/apiConfig'

function formatPropertyForList(prop, isAuction) {
  return {
    ...prop,
    title: prop.title || prop.name || '',
    location: prop.location || '',
    price: prop.price || (isAuction ? prop.auction_starting_price : 0) || 0,
    currentBid: isAuction ? (prop.currentBid || prop.auction_starting_price || prop.price || 0) : null,
    endTime: isAuction ? (prop.test_timer_end_date || prop.endTime || prop.auction_end_date || null) : null,
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
  const { user, isLoaded: userLoaded } = useUser()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const userData = getUserData()
  const [dbUserId, setDbUserId] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const isAuctionRoute = location.pathname === '/auction'
  
  // Состояния для чата AI
  const [isChatOpen, setIsChatOpen] = useState(false)
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
    other: null
  })

  // Загрузка объявлений: при наличии кэша — только фоновое обновление (без "Загрузка объявлений...")
  const loadProperties = useCallback(async (backgroundRefresh = false) => {
    if (!backgroundRefresh) setLoading(true)
    try {
      const list = await fetchAuctionList()
      setAuctionProperties(list)
    } catch (error) {
      console.error('❌ Ошибка загрузки объявлений:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const homeListRef = useRef(null)

  // Сразу запрашиваем данные при монтировании (кэш уже может быть от prefetch в App)
  useEffect(() => {
    loadProperties(hasCachedList())
  }, [loadProperties])

  // Подписка на новые объекты аукциона по SSE — без polling, только push от сервера при одобрении админом
  useEffect(() => {
    let eventSource = null
    let reconnectTimer = null
    const baseUrlRef = { current: null }

    const connect = async () => {
      const base = await getApiBaseUrl()
      baseUrlRef.current = base
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
          if (data.type !== 'new_auction_objects' || !Array.isArray(data.properties) || data.properties.length === 0) return
          const newFormatted = data.properties.map(p => formatPropertyForList(p, true))
          setAuctionProperties((prev) => {
            const prevIds = new Set(prev.map((x) => Number(x.id)))
            const toAdd = newFormatted.filter((p) => p.id != null && !prevIds.has(Number(p.id)))
            if (toAdd.length === 0) return prev
            return [...toAdd, ...prev]
          })
        } catch (_) {}
      }
      eventSource.onerror = () => {
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
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (eventSource) eventSource.close()
    }
  }, [])

  // Получаем числовой ID из БД для Clerk пользователей
  useEffect(() => {
    // Если dbUserId уже установлен, не делаем ничего
    if (dbUserId) {
      return
    }
    
    const fetchDbUserId = async () => {
      // Проверяем localStorage сначала
      const savedUserId = localStorage.getItem('userId')
      if (savedUserId && /^\d+$/.test(savedUserId)) {
        setDbUserId(parseInt(savedUserId))
        return
      }
      
      // Если userLoaded еще не загружен, ждем
      if (!userLoaded) {
        return
      }
      
      const isClerkAuth = user && userLoaded
      const isOldAuth = isAuthenticated()
      
      // Для Clerk пользователей получаем ID из БД
      if (isClerkAuth && user) {
        try {
          const API_BASE_URL = await getApiBaseUrl()
          
          const userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
          if (userEmail) {
            const userResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(userEmail)}`)
            if (userResponse.ok) {
              const userData = await userResponse.json()
              if (userData.success && userData.data && userData.data.id) {
                const numericId = userData.data.id
                setDbUserId(numericId)
                localStorage.setItem('userId', String(numericId))
              }
            }
          }
        } catch (e) {
          console.warn('Не удалось получить userId из БД:', e)
        }
      } else if (isOldAuth) {
        // Для старой системы авторизации используем ID из getUserData
        const currentUserData = getUserData()
        const userId = currentUserData?.id
        if (userId && /^\d+$/.test(userId.toString())) {
          setDbUserId(parseInt(userId))
        }
      }
    }
    
    fetchDbUserId()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoaded, user?.id, user?.primaryEmailAddress?.emailAddress])

  // Загружаем депозит пользователя
  useEffect(() => {
    const loadUserDeposit = async () => {
      if (!dbUserId) {
        setUserDeposit(0)
        return
      }
      
      try {
        const API_BASE_URL = await getApiBaseUrl()
        const response = await fetch(`${API_BASE_URL}/users/${dbUserId}/deposit`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUserDeposit(data.data.depositAmount || 0)
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки депозита:', error)
        setUserDeposit(0)
      }
    }
    
    loadUserDeposit()
    const onFocus = () => loadUserDeposit()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [dbUserId])

  // Функции для чата AI
  const toggleChat = () => {
    setIsChatOpen((prev) => !prev)
  }

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value)
  }

  const handleButtonClick = async (buttonText) => {
    // Отправляем текст кнопки как сообщение пользователя
    await handleChatSubmit(null, buttonText)
  }

  const handleChatSubmit = async (e, buttonText = null) => {
    if (e) e.preventDefault()
    
    const userMessage = buttonText || chatInput.trim()
    if (!userMessage) return

    if (!buttonText) {
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

    setIsLoadingAI(true)
    setIsSlowAIResponse(false)
    if (slowResponseTimerRef.current) {
      clearTimeout(slowResponseTimerRef.current)
      slowResponseTimerRef.current = null
    }
    slowResponseTimerRef.current = setTimeout(() => setIsSlowAIResponse(true), 6000)

    try {
      // Получаем ответ от AI
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
    const legacyIn = isAuthenticated() && userData?.isLoggedIn
    const clerkIn = authLoaded && Boolean(isSignedIn)
    if (!legacyIn && !clerkIn) return false

    const roleRaw = legacyIn
      ? (userData.role || localStorage.getItem('userRole') || 'buyer')
      : (localStorage.getItem('userRole') || user?.publicMetadata?.role || 'buyer')
    const userRole = String(roleRaw || 'buyer').toLowerCase()
    if (userRole === 'seller' || userRole === 'owner' || userRole === 'admin') return false
    return userRole === 'buyer' || userRole === 'client'
  }

  // Функция для получения уникального идентификатора пользователя/сессии
  const isLoggedIn = isAuthenticated() || (user && userLoaded)
  const getChatUserId = useMemo(() => {
    // Если пользователь авторизован, используем его ID
    if (isLoggedIn) {
      const currentUserData = getUserData()
      const userId = currentUserData.id || localStorage.getItem('userId') || dbUserId
      if (userId) {
        return `user_${userId}`
      }
    }
    
    // Если пользователь не авторизован, создаем/используем уникальный ID сессии
    let sessionId = localStorage.getItem('chatSessionId')
    if (!sessionId) {
      // Генерируем уникальный ID сессии
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('chatSessionId', sessionId)
    }
    return sessionId
  }, [isLoggedIn, dbUserId])

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

  // Сохраняем историю чата в localStorage при каждом изменении и синхронизируем с сервером для раздела «Умный помощник»
  useEffect(() => {
    if (chatHistoryLoadedRef.current && chatMessages.length > 0) {
      try {
        const chatUserId = getChatUserId
        const historyKey = `aiChatHistory_${chatUserId}`
        // Сохраняем историю в localStorage с привязкой к пользователю
        localStorage.setItem(historyKey, JSON.stringify(chatMessages))
        // Синхронизация с сервером для админки «Умный помощник»
        const userData = getUserData()
        syncAssistantLead(chatUserId, chatMessages, userPreferences, userData?.isLoggedIn ? userData : null)
      } catch (error) {
        console.error('Ошибка при сохранении истории чата:', error)
      }
    }
  }, [chatMessages, userPreferences, getChatUserId])

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
      if (!isChatOpen) {
        setIsChatOpen(true)
      }
    }

    window.addEventListener('openAIChat', handleOpenAIChat)
    
    return () => {
      window.removeEventListener('openAIChat', handleOpenAIChat)
    }
  }, [isChatOpen])

  useEffect(() => {
    const footer = document.getElementById('site-footer')
    if (!footer) return

    const mq = window.matchMedia('(max-width: 768px)')
    let disconnectObserver = null

    const apply = () => {
      if (disconnectObserver) {
        disconnectObserver()
        disconnectObserver = null
      }
      if (!mq.matches) {
        setFloatWidgetsHiddenByFooter(false)
        return
      }
      const observer = new IntersectionObserver(
        ([entry]) => {
          setFloatWidgetsHiddenByFooter(Boolean(entry?.isIntersecting))
        },
        {
          root: null,
          rootMargin: '0px 0px -12% 0px',
          threshold: [0, 0.02, 0.5],
        }
      )
      observer.observe(footer)
      disconnectObserver = () => observer.disconnect()
    }

    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      if (disconnectObserver) disconnectObserver()
    }
  }, [])

  // История чата сохраняется в localStorage и не очищается при закрытии страницы
  // Каждый пользователь видит только свою переписку

  return (
    <div className={isAuctionRoute ? 'home-page home-page--auction' : 'home-page'}>
      <div
        className={`home-auction-floats${floatWidgetsHiddenByFooter ? ' home-auction-floats--footer-near' : ''}`}
        aria-hidden={floatWidgetsHiddenByFooter}
      >
        {canShowDeposit() && <DepositButton amount={userDeposit} />}
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
                            href={`/property/${recId}`}
                            className="chat-widget__recommendation-link"
                            onClick={(e) => {
                              e.preventDefault()
                              if (!ensureCanOpenProperty()) return
                              navigate(`/property/${recId}`, { 
                                state: { property: property }
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
                  <div className="chat-widget__buttons">
                    {message.buttons.map((button, index) => (
                      <button
                        key={index}
                        className="chat-widget__button"
                        onClick={() => !isLoadingAI && handleButtonClick(button)}
                        disabled={isLoadingAI}
                      >
                        {button}
                      </button>
                    ))}
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
              placeholder={isLoadingAI ? t('aiThinking') : t('chatPlaceholder')}
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
      </div>

      <Header />
      <Hero />
      <div ref={homeListRef} className="home-list-wrap">
        <PropertyList
          auctionProperties={auctionProperties}
          onOpenAIChat={toggleChat}
          loading={loading}
          floatWidgetsHiddenByFooter={floatWidgetsHiddenByFooter}
        />
      </div>
      <FAQ />
    </div>
  )
}

export default Home
