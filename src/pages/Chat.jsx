import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiPhone, FiMail, FiArrowLeft, FiMessageCircle, FiX, FiSend } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { FaTelegram } from 'react-icons/fa6'
import './Chat.css'
import '../pages/Home.css'
import { askPropertyAssistant, detectManagerContactIntent } from '../services/aiService'
import { getUserData } from '../services/authService'
import { syncAssistantLead } from '../services/assistantLeadService'
import { showNotification } from '../utils/toastHelper'
import {
  ensureLiveChatSession,
  fetchLiveChatMessagesSince,
  getManagerContactButtons,
  liveChatStorageKey,
  normalizeLiveChatRows,
  sendLiveChatUserMessage,
} from '../services/liveChatApi'

/** Те же эвристики, что на главной: цель, локация, бюджет, тип, комнаты */
function mergeAssistantPrefsFromText(prev, userMessage) {
  const next = { ...prev }
  const lowerMessage = userMessage.toLowerCase()

  if (lowerMessage.includes('для себя') || lowerMessage === 'для себя' || lowerMessage.includes('сам') || lowerMessage.includes('личн')) {
    next.purpose = 'для себя'
  } else if (lowerMessage.includes('под сдачу') || lowerMessage === 'под сдачу' || lowerMessage.includes('сдачу') || lowerMessage.includes('аренд')) {
    next.purpose = 'под сдачу'
  } else if (lowerMessage.includes('инвестиц') || lowerMessage === 'инвестиции' || lowerMessage.includes('инвест')) {
    next.purpose = 'инвестиции'
  }

  if (lowerMessage.includes('испания') || lowerMessage.includes('spain') || lowerMessage.includes('españa') ||
      lowerMessage.includes('tenerife') || lowerMessage.includes('тенерифе') || lowerMessage.includes('коста') ||
      lowerMessage.includes('barcelona') || lowerMessage.includes('madrid')) {
    next.location = 'Испания'
  } else if (lowerMessage.includes('дубай') || lowerMessage.includes('dubai') || lowerMessage.includes('uae') ||
             lowerMessage.includes('оаэ') || lowerMessage.includes('emirates')) {
    next.location = 'Дубай'
  }

  const budgetMatch = userMessage.match(/(\d+[\s,.]?\d*)\s*(тыс|млн|k|m|€|\$|eur|usd|евро|доллар|рубл|₽|rub)/i)
  if (budgetMatch) {
    let budget = parseFloat(budgetMatch[1].replace(/\s/g, '').replace(',', '.'))
    const unit = budgetMatch[2].toLowerCase()
    const eurToRubRate = 100
    if (unit.includes('млн') || unit === 'm') budget *= 1000000
    else if (unit.includes('тыс') || unit === 'k') budget *= 1000
    if (unit.includes('рубл') || unit.includes('₽') || unit.includes('rub')) budget /= eurToRubRate
    next.budget = budget
  }

  if (lowerMessage.includes('квартир') || lowerMessage.includes('апартамент') || lowerMessage.includes('apartment')) {
    next.propertyType = 'квартира'
  } else if (lowerMessage.includes('вилл') || lowerMessage.includes('villa')) {
    next.propertyType = 'вилла'
  } else if (lowerMessage.includes('дом') || lowerMessage.includes('таунхаус') || lowerMessage.includes('townhouse') || lowerMessage.includes('house')) {
    next.propertyType = 'дом'
  }

  const roomsMatch = userMessage.match(/(\d+)\s*(комнат|room|bed)/i)
  if (roomsMatch) next.rooms = parseInt(roomsMatch[1], 10)

  return next
}

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

const defaultAssistantPreferences = () => ({
  purpose: null,
  budget: null,
  location: null,
  propertyType: null,
  rooms: null,
  area: null,
  other: null,
  managerContactRequested: false,
  managerContactPendingChoice: false,
  preferredContact: null
})

const MANAGER_QUERY_VALUES = new Set(['1', 'true', 'yes', 'manager'])

const Chat = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useTranslation()
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
  const [userPreferences, setUserPreferences] = useState(defaultAssistantPreferences)
  const [techSupportMode, setTechSupportMode] = useState('ai')
  const [managerChatMessages, setManagerChatMessages] = useState([])
  const [liveChatToken, setLiveChatToken] = useState(null)
  const managerPollRef = useRef(null)
  const lastManagerMsgIdRef = useRef(0)
  const chatHistoryLoadedRef = useRef(false)
  const managerMessagesRef = useRef(null)

  // Загружаем историю и предпочтения (общие с виджетом на главной)
  useEffect(() => {
    try {
      const historyKey = `aiChatHistory_${chatUserId}`
      const preferencesKey = `aiChatPreferences_${chatUserId}`
      const savedPreferences = localStorage.getItem(preferencesKey)
      if (savedPreferences) {
        try {
          setUserPreferences({ ...defaultAssistantPreferences(), ...JSON.parse(savedPreferences) })
        } catch (_) {}
      }
      const savedChatHistory = localStorage.getItem(historyKey)
      if (savedChatHistory) {
        const parsed = JSON.parse(savedChatHistory)
        const mapped = parsed.map((msg, index) => {
          const dateObj = msg.timestamp ? new Date(msg.timestamp) : new Date()
          return {
            ...msg,
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
    } finally {
      chatHistoryLoadedRef.current = true
    }
  }, [chatUserId])

  // Сохраняем историю, предпочтения и синхронизируем лид для админки
  useEffect(() => {
    if (!chatHistoryLoadedRef.current) return
    try {
      const techMessages = messages['tech-support'] || []
      if (!techMessages.length) return

      const historyKey = `aiChatHistory_${chatUserId}`
      const preferencesKey = `aiChatPreferences_${chatUserId}`
      const serializable = techMessages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      }))

      localStorage.setItem(historyKey, JSON.stringify(serializable))
      localStorage.setItem(preferencesKey, JSON.stringify(userPreferences))
      const userData = getUserData()
      syncAssistantLead(chatUserId, serializable, userPreferences, userData?.isLoggedIn ? userData : null)
    } catch (e) {
      console.error('Ошибка сохранения истории AI-чата в Chat.jsx:', e)
    }
  }, [messages, chatUserId, userPreferences])

  const scheduleManagerPoll = useCallback((token) => {
    if (managerPollRef.current) {
      clearInterval(managerPollRef.current)
      managerPollRef.current = null
    }
    managerPollRef.current = setInterval(async () => {
      try {
        const chunk = await fetchLiveChatMessagesSince(token, lastManagerMsgIdRef.current)
        if (chunk.length) {
          lastManagerMsgIdRef.current = Math.max(...chunk.map((r) => r.id))
          setManagerChatMessages((p) => [...p, ...normalizeLiveChatRows(chunk)])
        }
      } catch {
        /* ignore */
      }
    }, 2500)
  }, [])

  const enterLiveManagerChat = useCallback(async () => {
    const userData = getUserData()
    const uid = userData?.isLoggedIn && userData?.id ? Number(userData.id) : null
    const { token, messages: rows } = await ensureLiveChatSession({
      assistantSessionId: chatUserId,
      userId: Number.isFinite(uid) ? uid : null,
      waitMessage: t('liveChatWaitNotice'),
    })
    const list = rows || []
    lastManagerMsgIdRef.current = list.reduce((m, r) => Math.max(m, r.id), 0)
    setManagerChatMessages(normalizeLiveChatRows(list))
    setLiveChatToken(token)
    setTechSupportMode('manager')
    localStorage.setItem(`aiChatLiveManagerMode_${chatUserId}`, '1')
    scheduleManagerPoll(token)
  }, [chatUserId, t, scheduleManagerPoll])

  const resumeLiveManagerIfNeeded = useCallback(async () => {
    const modeKey = `aiChatLiveManagerMode_${chatUserId}`
    if (localStorage.getItem(modeKey) !== '1') return
    const token = localStorage.getItem(liveChatStorageKey(chatUserId))
    if (!token) return
    try {
      const rows = await fetchLiveChatMessagesSince(token, 0)
      lastManagerMsgIdRef.current = rows.reduce((m, r) => Math.max(m, r.id), 0)
      setLiveChatToken(token)
      setManagerChatMessages(normalizeLiveChatRows(rows))
      setTechSupportMode('manager')
      scheduleManagerPoll(token)
    } catch {
      localStorage.removeItem(modeKey)
    }
  }, [chatUserId, scheduleManagerPoll])

  useEffect(() => {
    resumeLiveManagerIfNeeded()
    return () => {
      if (managerPollRef.current) {
        clearInterval(managerPollRef.current)
        managerPollRef.current = null
      }
    }
  }, [resumeLiveManagerIfNeeded])

  // Открытие чата с менеджером по ссылке из хедера: /chat?manager=1
  useEffect(() => {
    const raw = searchParams.get('manager')
    if (raw == null || raw === '') return
    if (!MANAGER_QUERY_VALUES.has(String(raw).toLowerCase())) return

    let cancelled = false
    setActiveChat('tech-support')
    ;(async () => {
      try {
        await enterLiveManagerChat()
        if (!cancelled) setSearchParams({}, { replace: true })
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          const msg = err?.message || t('liveChatError')
          showNotification(msg)
          // Убираем ?manager=1, чтобы не застрять в пустом экране менеджера
          setSearchParams({}, { replace: true })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, enterLiveManagerChat, setSearchParams, t])

  const backToTechSupportAi = useCallback(() => {
    if (managerPollRef.current) {
      clearInterval(managerPollRef.current)
      managerPollRef.current = null
    }
    setTechSupportMode('ai')
    localStorage.setItem(`aiChatLiveManagerMode_${chatUserId}`, '0')
  }, [chatUserId])

  const managerThreadUi = useMemo(
    () =>
      managerChatMessages.map((m) => ({
        id: m.id,
        text: m.text,
        sender: m.sender,
        time: m.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        date: 'Сегодня',
        timestamp: m.timestamp,
      })),
    [managerChatMessages]
  )

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

  const contactPrefButtons = () => getManagerContactButtons(t)

  const handleTechSupportAction = async ({ buttonText = null, contactPref = null, inputText = null } = {}) => {
    let userMessage = ''
    if (contactPref) {
      const labelMap = {
        phone: t('managerContactPrefPhone'),
        email: t('managerContactPrefEmail'),
        whatsapp: t('managerContactPrefWhatsapp'),
        telegram: t('managerContactPrefTelegram'),
        live_chat: t('managerContactPrefLiveChat'),
      }
      userMessage = labelMap[contactPref] || contactPref
    } else if (buttonText != null) {
      userMessage = String(buttonText).trim()
    } else if (inputText != null) {
      userMessage = inputText.trim()
    }
    if (!userMessage) return

    const tsPrev = messages['tech-support'] || []
    const now = new Date()
    const userMessageObj = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      date: 'Сегодня',
      timestamp: now
    }

    setMessages(prev => ({
      ...prev,
      'tech-support': [...(prev['tech-support'] || []), userMessageObj]
    }))

    if (!buttonText && !contactPref) {
      setInputMessage('')
    }

    if (contactPref) {
      setUserPreferences(prev => ({
        ...prev,
        preferredContact: contactPref,
        managerContactRequested: true,
        managerContactPendingChoice: false
      }))
      if (contactPref === 'live_chat') {
        try {
          await enterLiveManagerChat()
        } catch (err) {
          console.error(err)
          showNotification(err?.message || t('liveChatError'))
        }
        return
      }
      if (contactPref === 'telegram') {
        const tgUrl = (import.meta.env.VITE_MANAGER_TELEGRAM_URL || '').trim()
        const botMessage = {
          id: Date.now() + 1,
          text: tgUrl ? t('managerContactThanksTelegram') : t('liveChatTelegramNotConfigured'),
          sender: 'bot',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          date: 'Сегодня',
          timestamp: new Date(),
          buttons: null,
          recommendations: null
        }
        setMessages(prev => ({
          ...prev,
          'tech-support': [...(prev['tech-support'] || []), botMessage]
        }))
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
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        date: 'Сегодня',
        timestamp: new Date(),
        buttons: null,
        recommendations: null
      }
      setMessages(prev => ({
        ...prev,
        'tech-support': [...(prev['tech-support'] || []), botMessage]
      }))
      return
    }

    const mergedPrefs = mergeAssistantPrefsFromText({ ...userPreferences }, userMessage)
    setUserPreferences(mergedPrefs)

    let wantsManager = false
    try {
      wantsManager = await detectManagerContactIntent(userMessage)
    } catch {
      wantsManager = false
    }

    if (wantsManager) {
      if (mergedPrefs.preferredContact) {
        const pc = mergedPrefs.preferredContact
        const methodLabel =
          pc === 'phone'
            ? t('managerContactPrefPhone')
            : pc === 'email'
              ? t('managerContactPrefEmail')
              : pc === 'whatsapp'
                ? t('managerContactPrefWhatsapp')
                : pc === 'telegram'
                  ? t('managerContactPrefTelegram')
                  : pc === 'live_chat'
                    ? t('managerContactPrefLiveChat')
                    : String(pc || '')
        const botMessage = {
          id: Date.now() + 1,
          text: t('managerRequestAlready', { method: methodLabel }),
          sender: 'bot',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          date: 'Сегодня',
          timestamp: new Date(),
          buttons: null,
          recommendations: null
        }
        setMessages(prev => ({
          ...prev,
          'tech-support': [...(prev['tech-support'] || []), botMessage]
        }))
        return
      }
      if (mergedPrefs.managerContactPendingChoice) {
        const botMessage = {
          id: Date.now() + 1,
          text: t('managerContactPickHint'),
          sender: 'bot',
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          date: 'Сегодня',
          timestamp: new Date(),
          buttons: contactPrefButtons(),
          recommendations: null
        }
        setMessages(prev => ({
          ...prev,
          'tech-support': [...(prev['tech-support'] || []), botMessage]
        }))
        return
      }

      setUserPreferences(prev => ({
        ...prev,
        managerContactRequested: true,
        managerContactPendingChoice: true
      }))
      const botMessage = {
        id: Date.now() + 1,
        text: t('managerRequestAck'),
        sender: 'bot',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        date: 'Сегодня',
        timestamp: new Date(),
        buttons: contactPrefButtons(),
        recommendations: null
      }
      setMessages(prev => ({
        ...prev,
        'tech-support': [...(prev['tech-support'] || []), botMessage]
      }))
      return
    }

    try {
      setIsLoadingAI(true)
      const aiResponse = await askPropertyAssistant(
        [...tsPrev, userMessageObj],
        mergedPrefs,
        []
      )

      const botMessage = {
        id: Date.now() + 1,
        text: aiResponse?.text || 'Извините, не удалось получить ответ от AI. Попробуйте ещё раз.',
        sender: 'bot',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        date: 'Сегодня',
        timestamp: new Date(),
        buttons: aiResponse?.buttons ?? null,
        recommendations: aiResponse?.recommendations ?? null
      }

      setMessages(prev => ({
        ...prev,
        'tech-support': [...(prev['tech-support'] || []), botMessage]
      }))
    } catch (error) {
      console.error('Ошибка AI-чата:', error)
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Произошла ошибка при обращении к AI. Попробуйте ещё раз позже.',
        sender: 'bot',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        date: 'Сегодня',
        timestamp: new Date()
      }
      setMessages(prev => ({
        ...prev,
        'tech-support': [...(prev['tech-support'] || []), errorMessage]
      }))
    } finally {
      setIsLoadingAI(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (activeChat === 'tech-support' && techSupportMode === 'manager') {
      if (!inputMessage.trim() || !liveChatToken) return
      const text = inputMessage.trim()
      setInputMessage('')
      try {
        const row = await sendLiveChatUserMessage(liveChatToken, text)
        lastManagerMsgIdRef.current = Math.max(lastManagerMsgIdRef.current, row.id)
        setManagerChatMessages((prev) => [...prev, ...normalizeLiveChatRows([row])])
      } catch (err) {
        showNotification(err?.message || t('liveChatError'))
      }
      return
    }
    if (activeChat !== 'tech-support') {
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
      setInputMessage('')
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
      return
    }

    if (!inputMessage.trim() || isLoadingAI) return
    await handleTechSupportAction({ inputText: inputMessage })
  }

  const wantManagerFromUrl = useMemo(() => {
    const raw = searchParams.get('manager')
    if (raw == null || raw === '') return false
    return MANAGER_QUERY_VALUES.has(String(raw).toLowerCase())
  }, [searchParams])

  /** Пока идёт ensureLiveChatSession, без этого показывался старый двухколоночный чат */
  const managerUiConnecting = wantManagerFromUrl && techSupportMode === 'ai'

  const handleManagerHeaderBack = useCallback(() => {
    if (wantManagerFromUrl && techSupportMode === 'ai') {
      navigate('/chat', { replace: true })
      return
    }
    backToTechSupportAi()
  }, [wantManagerFromUrl, techSupportMode, navigate, backToTechSupportAi])

  useLayoutEffect(() => {
    if (wantManagerFromUrl) setActiveChat('tech-support')
  }, [wantManagerFromUrl])

  useEffect(() => {
    if (!managerMessagesRef.current) return
    if (techSupportMode !== 'manager' && !wantManagerFromUrl) return
    managerMessagesRef.current.scrollTop = managerMessagesRef.current.scrollHeight
  }, [managerChatMessages, techSupportMode, wantManagerFromUrl, managerUiConnecting])

  const currentChat = chats.find(chat => chat.id === activeChat)
  const currentMessages =
    activeChat === 'tech-support' && techSupportMode === 'manager'
      ? managerThreadUi
      : messages[activeChat] || []

  const isManagerSmartView =
    activeChat === 'tech-support' && (techSupportMode === 'manager' || wantManagerFromUrl)

  if (isManagerSmartView) {
    return (
      <div
        className="chat-overlay chat-overlay--smart-manager"
        onClick={() => navigate(-1)}
        role="presentation"
      >
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

        <div
          className="chat-smart-manager-page"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={t('chatManagerTitle')}
        >
          <div className="chat-widget chat-widget--page">
            <div className="chat-widget__header">
              <div className="chat-widget__header-info">
                <button
                  type="button"
                  className="chat-widget__back"
                  onClick={handleManagerHeaderBack}
                  aria-label={t('backToAiAssistant')}
                >
                  <FiArrowLeft size={20} />
                </button>
                <div className="chat-widget__avatar chat-widget__avatar--manager">M</div>
                <div className="chat-widget__header-text">
                  <h3 className="chat-widget__title">{t('chatManagerTitle')}</h3>
                  <span className="chat-widget__status">{t('chatManagerOnline')}</span>
                </div>
              </div>
              <button
                type="button"
                className="chat-widget__close"
                onClick={() => navigate(-1)}
                aria-label={t('closeChat')}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="chat-widget__messages" ref={managerMessagesRef}>
              {managerUiConnecting && (
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
              {!managerUiConnecting &&
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

            <form className="chat-widget__input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-widget__input"
                placeholder={t('chatPlaceholder')}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                autoComplete="off"
                disabled={managerUiConnecting || !liveChatToken}
              />
              <button
                type="submit"
                className="chat-widget__send"
                aria-label={t('sendMessage')}
                disabled={managerUiConnecting || !liveChatToken}
              >
                <FiSend size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    )
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
                  {activeChat === chat.id && currentMessages.length > 0 && (
                    <p className="chat-preview">
                      {String(currentMessages[currentMessages.length - 1].text || '').substring(0, 40)}
                      ...
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
                  {activeChat === 'tech-support' && techSupportMode === 'manager' && (
                    <button
                      type="button"
                      className="chat-main-back"
                      onClick={backToTechSupportAi}
                      aria-label={t('backToAiAssistant')}
                    >
                      <FiArrowLeft size={22} />
                    </button>
                  )}
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
                    <h3>
                      {activeChat === 'tech-support' && techSupportMode === 'manager'
                        ? t('chatManagerTitle')
                        : currentChat.name}
                    </h3>
                    <p>
                      {activeChat === 'tech-support' && techSupportMode === 'manager'
                        ? t('chatManagerOnline')
                        : currentChat.description}
                    </p>
                  </div>
                </div>
                <button type="button" className="menu-button">
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
                      <div
                        className={`message ${
                          message.sender === 'user'
                            ? 'message-user'
                            : message.sender === 'system'
                              ? 'message-system'
                              : message.sender === 'manager'
                                ? 'message-manager'
                                : 'message-bot'
                        }`}
                      >
                        <div className="message-content">
                          <p>{message.text}</p>
                          {message.sender === 'bot' && message.buttons && message.buttons.length > 0 && (
                            <div
                              className={`chat-msg-buttons${
                                message.buttons.some((b) => typeof b === 'object' && b?.type === 'contact_pref')
                                  ? ' chat-msg-buttons--contact'
                                  : ''
                              }`}
                            >
                              {message.buttons.map((button, btnIdx) => {
                                if (typeof button === 'object' && button?.type === 'contact_pref') {
                                  const IconCmp =
                                    button.value === 'phone'
                                      ? FiPhone
                                      : button.value === 'email'
                                        ? FiMail
                                        : button.value === 'whatsapp'
                                          ? FaWhatsapp
                                          : button.value === 'telegram'
                                            ? FaTelegram
                                            : FiMessageCircle
                                  return (
                                    <button
                                      key={btnIdx}
                                      type="button"
                                      className="chat-msg-button chat-msg-button--contact"
                                      disabled={activeChat === 'tech-support' && isLoadingAI}
                                      onClick={() =>
                                        activeChat === 'tech-support' &&
                                        !isLoadingAI &&
                                        handleTechSupportAction({ contactPref: button.value })
                                      }
                                    >
                                      <IconCmp size={18} aria-hidden />
                                      <span>{button.label}</span>
                                    </button>
                                  )
                                }
                                return (
                                  <button
                                    key={btnIdx}
                                    type="button"
                                    className="chat-msg-button"
                                    disabled={activeChat === 'tech-support' && isLoadingAI}
                                    onClick={() =>
                                      activeChat === 'tech-support' &&
                                      !isLoadingAI &&
                                      handleTechSupportAction({ buttonText: button })
                                    }
                                  >
                                    {button}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          <span className="message-time">{message.time}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {activeChat === 'tech-support' && techSupportMode === 'ai' && isLoadingAI && (
                  <div className="message message-bot">
                    <div className="message-content chat-msg-loading">
                      <span>Печатает…</span>
                    </div>
                  </div>
                )}
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
                  disabled={activeChat === 'tech-support' && techSupportMode === 'ai' && isLoadingAI}
                />
                <button
                  type="submit"
                  className="send-button"
                  disabled={activeChat === 'tech-support' && techSupportMode === 'ai' && isLoadingAI}
                >
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
