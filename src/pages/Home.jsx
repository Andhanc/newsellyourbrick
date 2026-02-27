import { useState, useEffect, useMemo, useRef } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { FiX, FiSend } from 'react-icons/fi'
import Header from '../components/Header'
import Hero from '../components/Hero'
import PropertyList from '../components/PropertyList'
import FAQ from '../components/FAQ'
import DepositButton from '../components/DepositButton'
import { getUserData, isAuthenticated } from '../services/authService'
import { askPropertyAssistant } from '../services/aiService'
import './Home.css'

import { getApiBaseUrl } from '../utils/apiConfig'

function Home() {
  const [auctionProperties, setAuctionProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [userDeposit, setUserDeposit] = useState(0)
  const { user, isLoaded: userLoaded } = useUser()
  const userData = getUserData()
  const [dbUserId, setDbUserId] = useState(null)
  const navigate = useNavigate()
  
  // Состояния для чата AI
  const [isChatOpen, setIsChatOpen] = useState(false)
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

  // Загрузка аукционных и не аукционных объявлений из API
  useEffect(() => {
    const loadProperties = async () => {
      try {
        // Убеждаемся, что API URL инициализирован ПЕРЕД загрузкой
        const API_BASE_URL = await getApiBaseUrl()
        
        setLoading(true)
        // Загружаем объявления по типам
        const types = [
          { apiType: 'commercial', stateKey: 'apartments' },
          { apiType: 'villa', stateKey: 'villas' },
          { apiType: 'apartment', stateKey: 'flats' },
          { apiType: 'house', stateKey: 'houses' }
        ]

        const allAuctionProperties = []
        const allNonAuctionProperties = []
        const allTestProperties = []

        // Загружаем тестовые объявления (они уже включают все типы)
        try {
          const testUrl = `${API_BASE_URL}/properties/test-timers`
          console.log('📡 Запрос тестовых объявлений:', testUrl)
          const testResponse = await fetch(testUrl)
          if (testResponse.ok) {
            const data = await testResponse.json()
            if (data.success && data.data) {
              allTestProperties.push(...data.data)
            }
          } else {
            console.warn('⚠️ Ошибка загрузки тестовых объявлений:', testResponse.status)
          }
        } catch (error) {
          console.error('Ошибка загрузки тестовых объявлений:', error)
        }

        for (const { apiType } of types) {
          try {
            // Загружаем аукционные объявления
            const auctionUrl = `${API_BASE_URL}/properties/auctions?type=${apiType}`
            console.log('📡 Запрос аукционных:', auctionUrl)
            const auctionResponse = await fetch(auctionUrl)
            if (auctionResponse.ok) {
              const data = await auctionResponse.json()
              if (data.success && data.data) {
                // Исключаем тестовые объявления, чтобы не дублировать
                const nonTestAuction = data.data.filter(prop => 
                  !prop.test_timer_end_date
                )
                allAuctionProperties.push(...nonTestAuction)
              }
            } else {
              console.warn(`⚠️ Ошибка загрузки аукционных объявлений типа ${apiType}:`, auctionResponse.status)
            }

            // Загружаем не аукционные объявления (одобренные)
            const approvedUrl = `${API_BASE_URL}/properties/approved?type=${apiType}`
            console.log('📡 Запрос одобренных:', approvedUrl)
            const approvedResponse = await fetch(approvedUrl)
            if (approvedResponse.ok) {
              const data = await approvedResponse.json()
              if (data.success && data.data) {
                // Фильтруем только не аукционные объекты
                const nonAuction = data.data.filter(prop => 
                  !prop.is_auction || prop.is_auction === 0 || prop.is_auction === false
                )
                allNonAuctionProperties.push(...nonAuction)
              }
            }
          } catch (error) {
            console.error(`Ошибка загрузки объявлений типа ${apiType}:`, error)
          }
        }

        // Форматируем данные для PropertyList
        const formatProperty = (prop, isAuction) => ({
          ...prop,
          // Убеждаемся, что все необходимые поля присутствуют
          title: prop.title || prop.name || '',
          location: prop.location || '',
          price: prop.price || (isAuction ? prop.auction_starting_price : 0) || 0,
          currentBid: isAuction ? (prop.currentBid || prop.auction_starting_price || prop.price || 0) : null,
          endTime: isAuction ? (prop.test_timer_end_date || prop.endTime || prop.auction_end_date || null) : null,
          isAuction: isAuction,
          test_timer_end_date: prop.test_timer_end_date || null,
          images: prop.images || (prop.image ? [prop.image] : []),
          image: prop.image || (prop.images && prop.images[0] ? prop.images[0] : null),
          // Основные характеристики
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
          // Дополнительная информация
          renovation: prop.renovation || null,
          condition: prop.condition || null,
          heating: prop.heating || null,
          water_supply: prop.water_supply || null,
          sewerage: prop.sewerage || null
        })

        const formattedAuction = allAuctionProperties.map(prop => formatProperty(prop, true))
        const formattedTest = allTestProperties.map(prop => formatProperty(prop, true))
        const formattedNonAuction = allNonAuctionProperties.map(prop => formatProperty(prop, false))
        
        // Объединяем тестовые, аукционные и не аукционные объекты (тестовые первыми)
        const allProperties = [...formattedTest, ...formattedAuction, ...formattedNonAuction]

        setAuctionProperties(allProperties)
        console.log('✅ Загружено тестовых объявлений:', formattedTest.length)
        console.log('✅ Загружено аукционных объявлений:', formattedAuction.length)
        console.log('✅ Загружено не аукционных объявлений:', formattedNonAuction.length)
      } catch (error) {
        console.error('❌ Ошибка загрузки объявлений:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProperties()
    
    // Обновляем каждые 5 минут для получения новых объявлений
    const interval = setInterval(loadProperties, 300000)
    return () => clearInterval(interval)
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
    // Обновляем каждые 5 секунд для актуальности данных
    const interval = setInterval(loadUserDeposit, 5000)
    return () => clearInterval(interval)
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
        text: 'Извините, произошла ошибка. Попробуйте еще раз.',
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
            text: 'Здравствуйте! Я ваш AI-консультант по недвижимости. Помогу подобрать идеальный вариант в Испании или Дубае. Для начала, скажите, для какой цели вы ищете недвижимость?',
            sender: 'bot',
            timestamp: new Date(),
            buttons: ['Для себя', 'Под сдачу', 'Инвестиции'],
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
    if (chatHistoryLoadedRef.current && chatMessages.length > 0) {
      try {
        const chatUserId = getChatUserId
        const historyKey = `aiChatHistory_${chatUserId}`
        // Сохраняем историю в localStorage с привязкой к пользователю
        localStorage.setItem(historyKey, JSON.stringify(chatMessages))
      } catch (error) {
        console.error('Ошибка при сохранении истории чата:', error)
      }
    }
  }, [chatMessages, getChatUserId])

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

  // История чата сохраняется в localStorage и не очищается при закрытии страницы
  // Каждый пользователь видит только свою переписку

  return (
    <div className="home-page">
      {canShowDeposit() && <DepositButton amount={userDeposit} />}
      <Header />
      <Hero />
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <p>Загрузка аукционных объявлений...</p>
        </div>
      ) : (
        <PropertyList 
          auctionProperties={auctionProperties} 
          onOpenAIChat={toggleChat}
        />
      )}
      <FAQ />

      {/* Модальное окно чата */}
      {isChatOpen && (
        <div className="chat-widget">
          <div className="chat-widget__header">
            <div className="chat-widget__header-info">
              <div className="chat-widget__avatar">AI</div>
              <div className="chat-widget__header-text">
                <h3 className="chat-widget__title">AI Консультант</h3>
                <span className="chat-widget__status">Онлайн</span>
              </div>
            </div>
            <button
              type="button"
              className="chat-widget__close"
              onClick={toggleChat}
              aria-label="Закрыть чат"
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
                      <div className="chat-widget__recommendations-title">Рекомендуемые объявления:</div>
                      {message.recommendations.map((recId) => {
                        const property = auctionProperties.find(p => p.id === recId)
                        if (!property) return null
                        const propertyName = property.name || property.title || 'Объявление'
                        const propertyPrice = property.price ? `${property.price.toLocaleString('ru-RU')} €` : 'Цена не указана'
                        const propertyArea = property.area || property.sqft
                        const propertyRooms = property.rooms || property.beds
                        
                        return (
                          <a
                            key={recId}
                            href={`/property/${recId}`}
                            className="chat-widget__recommendation-link"
                            onClick={(e) => {
                              e.preventDefault()
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
                                {propertyRooms && <span>{propertyRooms} {propertyRooms === 1 ? 'комната' : propertyRooms < 5 ? 'комнаты' : 'комнат'}</span>}
                                {propertyArea && <span>{propertyArea} м²</span>}
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
                    <div className="chat-widget__slow-hint">Ищем ответ, подождите.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <form className="chat-widget__input-form" onSubmit={handleChatSubmit}>
            <input
              type="text"
              className="chat-widget__input"
              placeholder={isLoadingAI ? "AI думает..." : "Введите ваше сообщение..."}
              value={chatInput}
              onChange={handleChatInputChange}
              disabled={isLoadingAI}
              autoFocus
            />
            <button
              type="submit"
              className="chat-widget__send"
              aria-label="Отправить сообщение"
              disabled={isLoadingAI}
            >
              <FiSend size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default Home
