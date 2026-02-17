import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
  
  // Состояния для чата
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [chatType, setChatType] = useState('ai') // 'ai' или 'manager'
  const [currentChatId, setCurrentChatId] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const chatMessagesRef = useRef(null)
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

  // Функции для чата
  const toggleChat = () => {
    setIsChatOpen((prev) => {
      const newState = !prev
      if (newState && currentChatId) {
        // Отмечаем сообщения как прочитанные при открытии
        markMessagesAsRead()
      }
      return newState
    })
  }

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value)
  }

  // Загрузка чата из БД
  const loadChat = useCallback(async () => {
    if (!dbUserId) return

    try {
      const API_BASE_URL = await getApiBaseUrl()
      const response = await fetch(`${API_BASE_URL}/chat/${dbUserId}?type=${chatType}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCurrentChatId(data.data.chat.id)
          const formattedMessages = data.data.messages.map(msg => ({
            id: msg.id,
            text: msg.message_text,
            sender: msg.sender_type === 'user' ? 'user' : (msg.sender_type === 'ai' ? 'bot' : 'manager'),
            timestamp: new Date(msg.created_at),
            recommendations: null // Можно добавить парсинг из message_text если нужно
          }))
          setChatMessages(formattedMessages)
          
          // Если нет сообщений, показываем приветственное
          if (formattedMessages.length === 0 && chatType === 'ai') {
            setChatMessages([{
              id: 1,
              text: 'Здравствуйте! Я ваш AI-консультант по недвижимости. Помогу подобрать идеальный вариант в Испании или Дубае. Чем могу помочь?',
              sender: 'bot',
              timestamp: new Date(),
            }])
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке чата:', error)
    }
  }, [dbUserId, chatType])

  // Отправка сообщения
  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault()
    
    const userMessage = chatInput.trim()
    if (!userMessage || !currentChatId) return

    setChatInput('')

    // Добавляем сообщение пользователя локально
    const userMessageObj = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessageObj])

    // Сохраняем в БД
    try {
      const API_BASE_URL = await getApiBaseUrl()
      const response = await fetch(`${API_BASE_URL}/chat/${currentChatId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderType: 'user',
          senderId: dbUserId,
          messageText: userMessage
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Обновляем сообщения из ответа
          const formattedMessages = data.data.messages.map(msg => ({
            id: msg.id,
            text: msg.message_text,
            sender: msg.sender_type === 'user' ? 'user' : (msg.sender_type === 'ai' ? 'bot' : 'manager'),
            timestamp: new Date(msg.created_at),
          }))
          setChatMessages(formattedMessages)

          // Если чат с AI, получаем ответ от AI на фронтенде
          if (chatType === 'ai') {
            setIsLoadingAI(true)
            try {
              const aiResponse = await askPropertyAssistant(
                formattedMessages,
                userPreferences,
                auctionProperties
              )

              // Сохраняем ответ AI в БД
              const aiResponseRes = await fetch(`${API_BASE_URL}/chat/${currentChatId}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  senderType: 'ai',
                  senderId: null,
                  messageText: aiResponse.text
                })
              })

              if (aiResponseRes.ok) {
                const aiData = await aiResponseRes.json()
                if (aiData.success) {
                  const updatedMessages = aiData.data.messages.map(msg => ({
                    id: msg.id,
                    text: msg.message_text,
                    sender: msg.sender_type === 'user' ? 'user' : (msg.sender_type === 'ai' ? 'bot' : 'manager'),
                    timestamp: new Date(msg.created_at),
                    recommendations: msg.sender_type === 'ai' && aiResponse.recommendations ? aiResponse.recommendations : null
                  }))
                  setChatMessages(updatedMessages)
                }
              }
            } catch (aiError) {
              console.error('Ошибка при получении ответа от AI:', aiError)
            } finally {
              setIsLoadingAI(false)
            }
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error)
    }
  }

  // Переключение типа чата
  const switchChatType = async (newType) => {
    if (!dbUserId || newType === chatType) return

    try {
      const API_BASE_URL = await getApiBaseUrl()
      const response = await fetch(`${API_BASE_URL}/chat/${dbUserId}/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatType: newType })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setChatType(newType)
          setCurrentChatId(data.data.chat.id)
          const formattedMessages = data.data.messages.map(msg => ({
            id: msg.id,
            text: msg.message_text,
            sender: msg.sender_type === 'user' ? 'user' : (msg.sender_type === 'ai' ? 'bot' : 'manager'),
            timestamp: new Date(msg.created_at),
          }))
          setChatMessages(formattedMessages)
        }
      }
    } catch (error) {
      console.error('Ошибка при переключении чата:', error)
    }
  }

  // Отметка сообщений как прочитанных
  const markMessagesAsRead = async () => {
    if (!currentChatId || !dbUserId) return

    try {
      const API_BASE_URL = await getApiBaseUrl()
      await fetch(`${API_BASE_URL}/chat/${currentChatId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: dbUserId, isAdmin: false })
      })
      
      // Обновляем счетчик непрочитанных
      loadUnreadCount()
    } catch (error) {
      console.error('Ошибка при отметке сообщений:', error)
    }
  }

  // Загрузка количества непрочитанных сообщений
  const loadUnreadCount = useCallback(async () => {
    if (!dbUserId) return

    try {
      const API_BASE_URL = await getApiBaseUrl()
      const response = await fetch(`${API_BASE_URL}/chat/${dbUserId}/unread`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUnreadCount(data.data.count)
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке непрочитанных сообщений:', error)
    }
  }, [dbUserId])

  // Загружаем чат при изменении dbUserId или chatType
  useEffect(() => {
    if (dbUserId) {
      loadChat()
      loadUnreadCount()
      
      // Обновляем счетчик каждые 30 секунд
      const interval = setInterval(loadUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [dbUserId, chatType, loadChat, loadUnreadCount])

  // Отмечаем сообщения как прочитанные при открытии чата
  useEffect(() => {
    if (isChatOpen && currentChatId) {
      markMessagesAsRead()
    }
  }, [isChatOpen, currentChatId])

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (chatMessagesRef.current && isChatOpen) {
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


  return (
    <div className="home-page">
      <DepositButton amount={userDeposit} />
      <Header />
      <Hero />
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <p>Загрузка аукционных объявлений...</p>
        </div>
      ) : (
        <PropertyList auctionProperties={auctionProperties} />
      )}
      <FAQ />

      {/* Кнопка чата */}
      <button
        type="button"
        className="ai-button"
        onClick={toggleChat}
        aria-label="Chat"
        aria-expanded={isChatOpen}
      >
        {unreadCount > 0 && (
          <span className="ai-button__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
        Чат
      </button>

      {/* Модальное окно чата */}
      {isChatOpen && (
        <div className="chat-widget">
          <div className="chat-widget__header">
            <div className="chat-widget__header-info">
              <div className="chat-widget__avatar">{chatType === 'ai' ? 'AI' : 'М'}</div>
              <div className="chat-widget__header-text">
                <h3 className="chat-widget__title">
                  {chatType === 'ai' ? 'AI Консультант' : 'Менеджер'}
                </h3>
                <span className="chat-widget__status">Онлайн</span>
              </div>
            </div>
            <div className="chat-widget__header-actions">
              <button
                type="button"
                className={`chat-widget__switch-btn ${chatType === 'ai' ? 'active' : ''}`}
                onClick={() => switchChatType('ai')}
                disabled={chatType === 'ai'}
              >
                AI
              </button>
              <button
                type="button"
                className={`chat-widget__switch-btn ${chatType === 'manager' ? 'active' : ''}`}
                onClick={() => switchChatType('manager')}
                disabled={chatType === 'manager'}
              >
                Менеджер
              </button>
              <button
                type="button"
                className="chat-widget__close"
                onClick={toggleChat}
                aria-label="Закрыть чат"
              >
                <FiX size={20} />
              </button>
            </div>
          </div>

          <div className="chat-widget__messages" ref={chatMessagesRef}>
            {chatMessages.map((message) => (
              <div
                key={message.id}
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
                </div>
              </div>
            )}
          </div>

          <form className="chat-widget__input-form" onSubmit={handleChatSubmit}>
            <input
              type="text"
              className="chat-widget__input"
              placeholder={isLoadingAI ? (chatType === 'ai' ? "AI думает..." : "Отправка...") : "Введите ваше сообщение..."}
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
