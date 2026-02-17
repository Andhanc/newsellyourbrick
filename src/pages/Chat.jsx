import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { FiX, FiSend } from 'react-icons/fi'
import { getUserData, isAuthenticated } from '../services/authService'
import { askPropertyAssistant } from '../services/aiService'
import { getApiBaseUrl } from '../utils/apiConfig'
import './Chat.css'

const Chat = () => {
  const navigate = useNavigate()
  const { user, isLoaded: userLoaded } = useUser()
  const userData = getUserData()
  const [dbUserId, setDbUserId] = useState(null)
  
  const [chatType, setChatType] = useState('ai') // 'ai' или 'manager'
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [currentChatId, setCurrentChatId] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const chatMessagesRef = useRef(null)
  
  const [userPreferences, setUserPreferences] = useState({
    purpose: null,
    budget: null,
    location: null,
    propertyType: null,
    rooms: null,
    area: null,
    other: null
  })

  // Получаем числовой ID из БД для Clerk пользователей
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId')
    if (savedUserId && /^\d+$/.test(savedUserId)) {
      setDbUserId(parseInt(savedUserId))
      return
    }
    
    if (!userLoaded) return
    
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    
    if (isClerkAuth && user) {
      const fetchDbUserId = async () => {
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
      }
      fetchDbUserId()
    } else if (isOldAuth) {
      const currentUserData = getUserData()
      const userId = currentUserData?.id
      if (userId && /^\d+$/.test(userId.toString())) {
        setDbUserId(parseInt(userId))
      }
    }
  }, [userLoaded, user?.id, user?.primaryEmailAddress?.emailAddress])

  // Форматирование даты сообщения
  const formatMessageDate = (date) => {
    const today = new Date()
    const messageDate = new Date(date)
    const diff = today - messageDate
    
    if (diff < 86400000) {
      return 'Сегодня'
    } else if (diff < 172800000) {
      return 'Вчера'
    } else {
      return messageDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
  }

  // Загрузка чата из БД
  const loadChat = useCallback(async () => {
    if (!dbUserId) {
      console.log('⚠️ loadChat: dbUserId не установлен')
      return
    }

    try {
      const API_BASE_URL = await getApiBaseUrl()
      console.log(`📥 Загрузка чата для userId: ${dbUserId}, type: ${chatType}`)
      const response = await fetch(`${API_BASE_URL}/chat/${dbUserId}?type=${chatType}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Получены данные чата:', data)
        if (data.success && data.data) {
          setCurrentChatId(data.data.chat.id)
          const messages = data.data.messages || []
          console.log(`✅ Чат загружен, chatId: ${data.data.chat.id}, сообщений: ${messages.length}`)
          
          const formattedMessages = messages.map(msg => ({
            id: msg.id,
            text: msg.message_text,
            sender: msg.sender_type === 'user' ? 'user' : (msg.sender_type === 'ai' ? 'bot' : 'manager'),
            timestamp: new Date(msg.created_at),
            time: new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            date: formatMessageDate(new Date(msg.created_at))
          }))
          
          // ВСЕГДА устанавливаем сообщения из БД - это источник истины
          // НЕ показываем приветственное, если есть сообщения в БД
          console.log(`✅ Устанавливаем ${formattedMessages.length} сообщений из БД`)
          if (formattedMessages.length > 0) {
            // Есть сообщения в БД - используем их
            setChatMessages(formattedMessages)
          } else {
            // Нет сообщений - показываем приветственное (только для отображения, не сохраняем в БД)
            console.log('ℹ️ Нет сообщений в БД, показываем приветственное')
            const welcomeMessage = chatType === 'ai' 
              ? {
                  id: 1,
                  text: 'Здравствуйте! Я ваш AI-консультант по недвижимости. Помогу подобрать идеальный вариант в Испании или Дубае. Чем могу помочь?',
                  sender: 'bot',
                  timestamp: new Date(),
                  time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                  date: 'Сегодня'
                }
              : {
                  id: 1,
                  text: 'Здравствуйте! Я ваш менеджер. Готов помочь с любыми вопросами по недвижимости. Напишите мне, и я отвечу в ближайшее время.',
                  sender: 'manager',
                  timestamp: new Date(),
                  time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                  date: 'Сегодня'
                }
            setChatMessages([welcomeMessage])
          }
        } else {
          console.error('❌ Ошибка в ответе API:', data)
        }
      } else {
        console.error(`❌ Ошибка HTTP при загрузке чата: ${response.status} ${response.statusText}`)
        try {
          const errorText = await response.text()
          console.error('Текст ошибки:', errorText)
        } catch (e) {
          console.error('Не удалось прочитать текст ошибки')
        }
      }
    } catch (error) {
      console.error('❌ Ошибка при загрузке чата:', error)
    }
  }, [dbUserId, chatType])

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
      console.log(`🔄 Загрузка чата: userId=${dbUserId}, type=${chatType}`)
      // Загружаем чат сразу при монтировании или изменении типа
      loadChat()
      loadUnreadCount()
      
      // Обновляем счетчик каждые 30 секунд
      const interval = setInterval(() => {
        loadUnreadCount()
        // Также обновляем чат, чтобы получить новые сообщения
        if (currentChatId) {
          loadChat()
        }
      }, 30000)
      return () => clearInterval(interval)
    } else {
      console.log('⚠️ dbUserId не установлен, чат не загружается')
    }
  }, [dbUserId, chatType, loadChat, loadUnreadCount, currentChatId])

  // Отметка сообщений как прочитанных
  const markMessagesAsRead = useCallback(async () => {
    if (!currentChatId || !dbUserId) {
      console.log('⚠️ markMessagesAsRead: нет currentChatId или dbUserId')
      return
    }

    try {
      console.log(`📖 Отмечаем сообщения как прочитанные: chatId=${currentChatId}, userId=${dbUserId}`)
      const API_BASE_URL = await getApiBaseUrl()
      const response = await fetch(`${API_BASE_URL}/chat/${currentChatId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: dbUserId, isAdmin: false })
      })
      
      if (response.ok) {
        console.log('✅ Сообщения отмечены как прочитанные')
        loadUnreadCount()
      } else {
        console.error(`❌ Ошибка при отметке сообщений: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Ошибка при отметке сообщений:', error)
    }
  }, [currentChatId, dbUserId, loadUnreadCount])

  // Отмечаем сообщения как прочитанные при открытии или изменении чата
  useEffect(() => {
    if (currentChatId && dbUserId && chatMessages.length > 0) {
      // Небольшая задержка, чтобы убедиться что сообщения загружены
      const timer = setTimeout(() => {
        markMessagesAsRead()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [currentChatId, chatMessages.length, dbUserId, markMessagesAsRead])

  // Автоскролл к последнему сообщению
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages])

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
            time: new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            date: formatMessageDate(new Date(msg.created_at))
          }))
          
          // ВСЕГДА устанавливаем сообщения из БД
          if (formattedMessages.length > 0) {
            setChatMessages(formattedMessages)
          } else {
            // Если нет сообщений, показываем приветственное
            const welcomeMessage = newType === 'ai' 
              ? {
                  id: 1,
                  text: 'Здравствуйте! Я ваш AI-консультант по недвижимости. Помогу подобрать идеальный вариант в Испании или Дубае. Чем могу помочь?',
                  sender: 'bot',
                  timestamp: new Date(),
                  time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                  date: 'Сегодня'
                }
              : {
                  id: 1,
                  text: 'Здравствуйте! Я ваш менеджер. Готов помочь с любыми вопросами по недвижимости. Напишите мне, и я отвечу в ближайшее время.',
                  sender: 'manager',
                  timestamp: new Date(),
                  time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                  date: 'Сегодня'
                }
            setChatMessages([welcomeMessage])
          }
          
          // Отмечаем сообщения как прочитанные после загрузки
          setTimeout(() => {
            markMessagesAsRead()
          }, 500)
        }
      }
    } catch (error) {
      console.error('Ошибка при переключении чата:', error)
    }
  }

  // Отправка сообщения
  const handleSendMessage = async (e) => {
    e.preventDefault()
    const userMessage = chatInput.trim()
    if (!userMessage || !currentChatId || !dbUserId) return

    setChatInput('')

    // НЕ добавляем сообщение локально - ждем ответа от сервера с сохраненным сообщением из БД
    // Это гарантирует, что мы всегда работаем с данными из БД

    // Обновляем предпочтения на основе сообщения
    const lowerMessage = userMessage.toLowerCase()
    if (lowerMessage.includes('для себя') || lowerMessage.includes('сам') || lowerMessage.includes('личн')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'для себя' }))
    } else if (lowerMessage.includes('под сдачу') || lowerMessage.includes('сдачу') || lowerMessage.includes('аренд')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'под сдачу' }))
    } else if (lowerMessage.includes('инвестиц') || lowerMessage.includes('инвест')) {
      setUserPreferences(prev => ({ ...prev, purpose: 'инвестиции' }))
    }

    // Сохраняем в БД
    try {
      const API_BASE_URL = await getApiBaseUrl()
      console.log(`📤 Отправка сообщения: chatId=${currentChatId}, userId=${dbUserId}, text="${userMessage}"`)
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
        console.log('📤 Ответ на отправку сообщения:', data)
        if (data.success && data.data && data.data.messages) {
          // ВСЕГДА обновляем сообщения из БД - это источник истины
          const formattedMessages = data.data.messages.map(msg => ({
            id: msg.id,
            text: msg.message_text,
            sender: msg.sender_type === 'user' ? 'user' : (msg.sender_type === 'ai' ? 'bot' : 'manager'),
            timestamp: new Date(msg.created_at),
            time: new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            date: formatMessageDate(new Date(msg.created_at))
          }))
          console.log(`✅ Обновляем сообщения из БД: ${formattedMessages.length} сообщений`)
          setChatMessages(formattedMessages)

          // Если чат с AI, получаем ответ от AI
          if (chatType === 'ai') {
            setIsLoadingAI(true)
            try {
              // Загружаем объявления для AI (можно кэшировать)
              const propertiesResponse = await fetch(`${API_BASE_URL}/properties/test-timers`)
              let auctionProperties = []
              if (propertiesResponse.ok) {
                const propsData = await propertiesResponse.json()
                if (propsData.success && propsData.data) {
                  auctionProperties = propsData.data
                }
              }

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
                if (aiData.success && aiData.data && aiData.data.messages) {
                  // ВСЕГДА обновляем сообщения из БД после ответа AI
                  const updatedMessages = aiData.data.messages.map(msg => ({
                    id: msg.id,
                    text: msg.message_text,
                    sender: msg.sender_type === 'user' ? 'user' : (msg.sender_type === 'ai' ? 'bot' : 'manager'),
                    timestamp: new Date(msg.created_at),
                    time: new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                    date: formatMessageDate(new Date(msg.created_at))
                  }))
                  console.log(`✅ Обновляем сообщения после ответа AI: ${updatedMessages.length} сообщений`)
                  setChatMessages(updatedMessages)
                } else {
                  console.error('❌ Ошибка в ответе API при сохранении ответа AI:', aiData)
                  loadChat() // Перезагружаем чат
                }
              } else {
                console.error(`❌ Ошибка HTTP при сохранении ответа AI: ${aiResponseRes.status}`)
                loadChat() // Перезагружаем чат
              }
            } catch (aiError) {
              console.error('❌ Ошибка при получении ответа от AI:', aiError)
              loadChat() // Перезагружаем чат при ошибке
            } finally {
              setIsLoadingAI(false)
            }
          }
        } else {
          console.error('❌ Ошибка в ответе API при отправке сообщения:', data)
          // При ошибке перезагружаем чат, чтобы получить актуальное состояние
          loadChat()
        }
      } else {
        console.error(`❌ Ошибка HTTP при отправке сообщения: ${response.status} ${response.statusText}`)
        // При ошибке перезагружаем чат
        loadChat()
      }
    } catch (error) {
      console.error('❌ Ошибка при отправке сообщения:', error)
      // При ошибке перезагружаем чат
      loadChat()
    }
  }

  const handleToggleNotifications = () => {
    const newState = !notificationsEnabled
    setNotificationsEnabled(newState)
    setShowNotificationModal(true)
    
    setTimeout(() => {
      setShowNotificationModal(false)
    }, 3000)
  }

  return (
    <div className="chat-overlay" onClick={() => navigate(-1)}>
      {showNotificationModal && (
        <div className={`notification-modal ${notificationsEnabled ? 'success' : 'error'}`}>
          <div className="notification-content">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              {notificationsEnabled ? (
                <path d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4ZM20 32L10 22L13 19L20 26L35 11L38 14L20 32Z" fill="currentColor"/>
              ) : (
                <path d="M24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4ZM30 18L28 16L24 20L20 16L18 18L22 22L18 26L20 28L24 24L28 28L30 26L26 22L30 18Z" fill="currentColor"/>
              )}
            </svg>
            <p>
              {notificationsEnabled 
                ? 'Теперь сообщения будут отображаться в уведомлениях' 
                : 'Уведомления отключены'}
            </p>
          </div>
        </div>
      )}
      
      <div className="chat-container" onClick={(e) => e.stopPropagation()}>
        <div className="chat-sidebar">
          <div className="chat-header">
            <h2>Сообщения</h2>
            <button className="close-button" onClick={() => navigate(-1)}>
              <FiX size={20} />
            </button>
          </div>

          <button 
            className={`notifications-button ${notificationsEnabled ? 'enabled' : ''}`}
            onClick={handleToggleNotifications}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C8.89543 2 8 2.89543 8 4V5.5C6.34315 5.5 5 6.84315 5 8.5V13.5C5 14.3284 4.32843 15 3.5 15H2V16.5H18V15H16.5C15.6716 15 15 14.3284 15 13.5V8.5C15 6.84315 13.6569 5.5 12 5.5V4C12 2.89543 11.1046 2 10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M7.5 15C7.5 16.3807 8.61929 17.5 10 17.5C11.3807 17.5 12.5 16.3807 12.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>{notificationsEnabled ? 'Отключить уведомления' : 'Включить уведомления'}</span>
          </button>

          {unreadCount > 0 && (
            <div className="unread-badge">
              Непрочитанных: {unreadCount}
            </div>
          )}
        </div>

        <div className="chat-main">
          <div className="chat-main-header">
            <div className="chat-main-info">
              <div className="chat-main-avatar">
                {chatType === 'ai' ? (
                  <div className="bot-avatar">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="16" fill="#4A90E2"/>
                      <circle cx="16" cy="16" r="12" fill="white"/>
                      <circle cx="11" cy="14" r="1.5" fill="#4A90E2"/>
                      <circle cx="21" cy="14" r="1.5" fill="#4A90E2"/>
                      <path d="M11 19C11 19 13 21 16 21C19 21 21 19 21 19" stroke="#4A90E2" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                ) : (
                  <div className="expert-avatar">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="16" fill="#4A90E2"/>
                      <circle cx="16" cy="13" r="5" fill="white"/>
                      <path d="M8 26C8 23 12 21 16 21C20 21 24 23 24 26" fill="white"/>
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <h3>{chatType === 'ai' ? 'AI Консультант' : 'Менеджер'}</h3>
                <p>{chatType === 'ai' ? 'Для вопросов по сервису' : 'Найдёт, подскажет, позвонит'}</p>
              </div>
            </div>
            <div className="chat-switch-buttons">
              <button
                type="button"
                className={`chat-switch-btn ${chatType === 'ai' ? 'active' : ''}`}
                onClick={() => switchChatType('ai')}
                disabled={chatType === 'ai'}
              >
                AI
              </button>
              <button
                type="button"
                className={`chat-switch-btn ${chatType === 'manager' ? 'active' : ''}`}
                onClick={() => switchChatType('manager')}
                disabled={chatType === 'manager'}
              >
                Менеджер
              </button>
            </div>
          </div>

          <div className="chat-messages" ref={chatMessagesRef}>
            {chatMessages.map((message, index) => {
              const showDate = index === 0 || 
                (index > 0 && chatMessages[index - 1].date !== message.date)
              
              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="message-date">{message.date}</div>
                  )}
                  <div className={`message ${message.sender === 'user' ? 'message-user' : 'message-bot'}`}>
                    <div className="message-content">
                      <p>{message.text}</p>
                      <span className="message-time">{message.time}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {isLoadingAI && (
              <div className="message message-bot">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chat-input"
              placeholder={isLoadingAI ? (chatType === 'ai' ? "AI думает..." : "Отправка...") : "Напишите сообщение..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isLoadingAI || !currentChatId}
            />
            <button type="submit" className="send-button" disabled={!chatInput.trim() || isLoadingAI || !currentChatId}>
              <FiSend size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Chat
