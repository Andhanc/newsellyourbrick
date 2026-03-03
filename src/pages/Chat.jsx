import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Chat.css'
import { askPropertyAssistant } from '../services/aiService'

// Получаем идентификатор чата, общий с виджетом AI на главной
function getChatUserId() {
  try {
    const savedUserDataRaw = localStorage.getItem('userData')
    const savedUserData = savedUserDataRaw ? JSON.parse(savedUserDataRaw) : null
    const numericId = savedUserData?.id || localStorage.getItem('userId')

    if (numericId) {
      return `user_${numericId}`
    }

    let sessionId = localStorage.getItem('chatSessionId')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('chatSessionId', sessionId)
    }
    return sessionId
  } catch (e) {
    console.warn('Не удалось получить chatUserId, используем сессию по умолчанию:', e)
    let sessionId = localStorage.getItem('chatSessionId')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('chatSessionId', sessionId)
    }
    return sessionId
  }
}

const Chat = () => {
  const navigate = useNavigate()
  const [chatUserId] = useState(() => getChatUserId())
  const [activeChat, setActiveChat] = useState('tech-support')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [messages, setMessages] = useState({
    'tech-support': [
      {
        id: 1,
        text: 'Здравствуйте! С вами бот 😊 Уточните ваш вопрос. Попробую помочь.',
        sender: 'bot',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        date: 'Сегодня',
        timestamp: new Date()
      }
    ],
    'expert': [
      {
        id: 1,
        text: 'Напишите в чат или выберите нужный вопрос:',
        sender: 'bot',
        time: '23:05',
        date: 'Сегодня'
      }
    ]
  })
  const [inputMessage, setInputMessage] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  // Загружаем историю AI-чата из того же ключа, что и виджет умного помощника
  useEffect(() => {
    try {
      const historyKey = `aiChatHistory_${chatUserId}`
      const savedChatHistory = localStorage.getItem(historyKey)
      if (savedChatHistory) {
        const parsed = JSON.parse(savedChatHistory)
        const mapped = parsed.map((msg, index) => {
          const dateObj = msg.timestamp ? new Date(msg.timestamp) : new Date()
          return {
            id: msg.id || index + 1,
            text: msg.text || '',
            sender: msg.sender === 'user' ? 'user' : 'bot',
            time: dateObj.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            date: 'Сегодня',
            timestamp: dateObj
          }
        })

        if (mapped.length > 0) {
          setMessages(prev => ({
            ...prev,
            'tech-support': mapped
          }))
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки истории AI-чата в Chat.jsx:', e)
    }
  }, [chatUserId])

  // Сохраняем историю AI-чата в общий ключ, чтобы виджет и /chat делили одну историю
  useEffect(() => {
    try {
      const techMessages = messages['tech-support'] || []
      if (!techMessages.length) return

      const historyKey = `aiChatHistory_${chatUserId}`
      const serializable = techMessages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp ? msg.timestamp.toISOString() : new Date().toISOString()
      }))

      localStorage.setItem(historyKey, JSON.stringify(serializable))
    } catch (e) {
      console.error('Ошибка сохранения истории AI-чата в Chat.jsx:', e)
    }
  }, [messages, chatUserId])

  const chats = [
    {
      id: 'tech-support',
      name: 'AI',
      description: 'Для вопросов по сервису',
      avatar: 'ai',
      unread: false
    },
    {
      id: 'expert',
      name: 'Эксперт по подбору',
      description: 'Найдёт, подскажет, позвонит',
      avatar: 'expert',
      unread: true,
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face'
    }
  ]

  const handleToggleNotifications = () => {
    const newState = !notificationsEnabled
    setNotificationsEnabled(newState)
    setShowNotificationModal(true)
    
    setTimeout(() => {
      setShowNotificationModal(false)
    }, 3000)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim()) return

    const now = new Date()
    const userMessage = {
      id: messages[activeChat].length + 1,
      text: inputMessage,
      sender: 'user',
      time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      date: 'Сегодня',
      timestamp: now
    }

    setMessages(prev => ({
      ...prev,
      [activeChat]: [...prev[activeChat], userMessage]
    }))

    const previousMessages = messages[activeChat] || []
    setInputMessage('')

    if (activeChat === 'tech-support') {
      try {
        setIsLoadingAI(true)
        const aiResponse = await askPropertyAssistant(
          [...previousMessages, userMessage],
          {
            purpose: null,
            budget: null,
            location: null,
            propertyType: null,
            rooms: null,
            area: null,
            other: null
          },
          []
        )

        const botMessage = {
          id: (messages[activeChat]?.length || 0) + 2,
          text: aiResponse?.text || 'Извините, не удалось получить ответ от AI. Попробуйте ещё раз.',
          sender: 'bot',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          date: 'Сегодня',
          timestamp: new Date()
        }

        setMessages(prev => ({
          ...prev,
          [activeChat]: [...prev[activeChat], botMessage]
        }))
      } catch (error) {
        console.error('Ошибка AI-чата:', error)
        const errorMessage = {
          id: (messages[activeChat]?.length || 0) + 2,
          text: 'Произошла ошибка при обращении к AI. Попробуйте ещё раз позже.',
          sender: 'bot',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          date: 'Сегодня',
          timestamp: new Date()
        }
        setMessages(prev => ({
          ...prev,
          [activeChat]: [...prev[activeChat], errorMessage]
        }))
      } finally {
        setIsLoadingAI(false)
      }
    } else {
      // Для остальных чатов оставляем простой автоответ
      setTimeout(() => {
        const botResponse = {
          id: messages[activeChat].length + 2,
          text: 'Спасибо за ваше сообщение! Мы обработаем ваш запрос и ответим в ближайшее время.',
          sender: 'bot',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          date: 'Сегодня',
          timestamp: new Date()
        }
        setMessages(prev => ({
          ...prev,
          [activeChat]: [...prev[activeChat], botResponse]
        }))
      }, 1000)
    }
  }

  const currentChat = chats.find(chat => chat.id === activeChat)
  const currentMessages = messages[activeChat] || []

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
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
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

          <div className="chats-list">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${activeChat === chat.id ? 'active' : ''}`}
                onClick={() => setActiveChat(chat.id)}
              >
                <div className="chat-avatar">
                  {chat.avatar === 'ai' ? (
                    <div className="bot-avatar">
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <circle cx="20" cy="20" r="20" fill="#4A90E2"/>
                        <circle cx="20" cy="20" r="15" fill="white"/>
                        <circle cx="14" cy="18" r="2" fill="#4A90E2"/>
                        <circle cx="26" cy="18" r="2" fill="#4A90E2"/>
                        <path d="M14 24C14 24 16 26 20 26C24 26 26 24 26 24" stroke="#4A90E2" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="expert-avatar">
                      {chat.photo ? (
                        <img src={chat.photo} alt={chat.name} className="expert-photo" />
                      ) : (
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                          <circle cx="20" cy="20" r="20" fill="#4A90E2"/>
                          <circle cx="20" cy="16" r="6" fill="white"/>
                          <path d="M10 32C10 28 15 26 20 26C25 26 30 28 30 32" fill="white"/>
                        </svg>
                      )}
                    </div>
                  )}
                </div>
                <div className="chat-info">
                  <div className="chat-name-row">
                    <h3>{chat.name}</h3>
                    {chat.unread && <div className="unread-dot"></div>}
                  </div>
                  <p className="chat-description">{chat.description}</p>
                  {currentMessages.length > 0 && (
                    <p className="chat-preview">
                      {currentMessages[currentMessages.length - 1].text.substring(0, 40)}...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-main">
          {currentChat && (
            <>
              <div className="chat-main-header">
                <div className="chat-main-info">
                  <div className="chat-main-avatar">
                    {currentChat.avatar === 'ai' ? (
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
                        {currentChat.photo ? (
                          <img src={currentChat.photo} alt={currentChat.name} className="expert-photo" />
                        ) : (
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="16" fill="#4A90E2"/>
                            <circle cx="16" cy="13" r="5" fill="white"/>
                            <path d="M8 26C8 23 12 21 16 21C20 21 24 23 24 26" fill="white"/>
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3>{currentChat.name}</h3>
                    <p>{currentChat.description}</p>
                  </div>
                </div>
                <button className="menu-button">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
                    <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                    <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
                  </svg>
                </button>
              </div>

              <div className="chat-messages">
                {currentMessages.map((message, index) => {
                  const showDate = index === 0 || 
                    (index > 0 && currentMessages[index - 1].date !== message.date)
                  
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
              </div>

              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <button type="button" className="input-button">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 6L10 10L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </button>
                <button type="button" className="input-button">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2C6.68629 2 4 4.68629 4 8C4 11.3137 6.68629 14 10 14C13.3137 14 16 11.3137 16 8C16 4.68629 13.3137 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M10 6V10M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Напишите сообщение..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                />
                <button type="submit" className="send-button">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M2 10L18 2L12 18L10 10L2 10Z" fill="currentColor"/>
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat

