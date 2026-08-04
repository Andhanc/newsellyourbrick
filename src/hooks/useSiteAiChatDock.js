import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { getUserData, isAuthenticated, getStoredNumericUserId } from '../services/authService'
import { syncAssistantLead } from '../services/assistantLeadService'
import { askPropertyAssistant, detectManagerContactIntent } from '../services/aiService'
import { getManagerContactButtons } from '../services/liveChatApi'
import { useManagerLiveChat } from './useManagerLiveChat'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'

export function useSiteAiChatDock({ recommendationProperties = [] } = {}) {
  const { t } = useTranslation()
  const { user, isLoaded: userLoaded } = useUser()
  const dbUserId = getStoredNumericUserId()

  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isManagerChatOpen, setIsManagerChatOpen] = useState(false)
  const [managerChatInput, setManagerChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [isSlowAIResponse, setIsSlowAIResponse] = useState(false)
  const [userPreferences, setUserPreferences] = useState({
    purpose: null,
    budget: null,
    location: null,
    propertyType: null,
    rooms: null,
    area: null,
    other: null,
    managerContactRequested: false,
    managerContactPendingChoice: false,
    preferredContact: null,
  })

  const slowResponseTimerRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const lastMessageRef = useRef(null)
  const chatHistoryLoadedRef = useRef(false)
  const lastChatUserIdRef = useRef(null)

  const isLoggedIn = isAuthenticated() || (user && userLoaded)

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
  }, [isLoggedIn, dbUserId, user, userLoaded])

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
    if (!isSiteUserSignedIn(user, userLoaded)) {
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
  }, [enterLiveManagerChat, user, userLoaded])

  const closeManagerChatDock = useCallback(() => {
    setIsManagerChatOpen(false)
    setManagerChatInput('')
    pauseManagerPolling()
  }, [pauseManagerPolling])

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      const next = !prev
      if (next) {
        setIsManagerChatOpen(false)
        pauseManagerPolling()
      }
      return next
    })
  }, [pauseManagerPolling])

  const closeChatDock = useCallback(() => {
    setIsChatOpen(false)
  }, [])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('managerChatStateChange', { detail: { isOpen: isManagerChatOpen } }),
    )
  }, [isManagerChatOpen])

  useEffect(() => {
    const onOpenManager = () => {
      void openManagerChatDock()
    }
    window.addEventListener('openManagerChat', onOpenManager)
    return () => window.removeEventListener('openManagerChat', onOpenManager)
  }, [openManagerChatDock])

  useEffect(() => {
    const onOpenAI = () => {
      setIsManagerChatOpen(false)
      pauseManagerPolling()
      setIsChatOpen(true)
    }
    window.addEventListener('openAIChat', onOpenAI)
    return () => window.removeEventListener('openAIChat', onOpenAI)
  }, [pauseManagerPolling])

  useEffect(() => {
    const chatUserId = getChatUserId
    if (lastChatUserIdRef.current !== chatUserId) {
      try {
        const historyKey = `aiChatHistory_${chatUserId}`
        const preferencesKey = `aiChatPreferences_${chatUserId}`
        const savedChatHistory = localStorage.getItem(historyKey)

        if (savedChatHistory) {
          const parsed = JSON.parse(savedChatHistory)
          setChatMessages(
            parsed.map((msg) => ({
              ...msg,
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            })),
          )
        } else {
          setChatMessages([
            {
              id: 1,
              text: t('chatWelcomeMessage'),
              sender: 'bot',
              timestamp: new Date(),
              buttons: [t('chatPurposeSelf'), t('chatPurposeRent'), t('chatPurposeInvest')],
            },
          ])
        }

        const savedPreferences = localStorage.getItem(preferencesKey)
        if (savedPreferences) {
          setUserPreferences(JSON.parse(savedPreferences))
        }

        lastChatUserIdRef.current = chatUserId
        chatHistoryLoadedRef.current = true
      } catch (error) {
        console.error('Ошибка при загрузке истории чата:', error)
        lastChatUserIdRef.current = chatUserId
        chatHistoryLoadedRef.current = true
      }
    }
  }, [getChatUserId, t])

  useEffect(() => {
    if (chatHistoryLoadedRef.current && chatMessages.length > 0) {
      try {
        const historyKey = `aiChatHistory_${getChatUserId}`
        localStorage.setItem(historyKey, JSON.stringify(chatMessages))
        const userData = getUserData()
        syncAssistantLead(getChatUserId, chatMessages, userPreferences, userData?.isLoggedIn ? userData : null)
      } catch (error) {
        console.error('Ошибка при сохранении истории чата:', error)
      }
    }
  }, [chatMessages, userPreferences, getChatUserId])

  useEffect(() => {
    if (chatHistoryLoadedRef.current) {
      try {
        const preferencesKey = `aiChatPreferences_${getChatUserId}`
        localStorage.setItem(preferencesKey, JSON.stringify(userPreferences))
      } catch (error) {
        console.error('Ошибка при сохранении предпочтений:', error)
      }
    }
  }, [userPreferences, getChatUserId])

  useEffect(() => {
    if (!chatMessagesRef.current || !isChatOpen) return
    const last = chatMessages[chatMessages.length - 1]
    if (last?.sender === 'bot' && lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' })
    } else {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages, isChatOpen])

  useEffect(() => {
    window.isChatOpen = isChatOpen
    window.dispatchEvent(new CustomEvent('aiChatStateChange', { detail: { isOpen: isChatOpen } }))
  }, [isChatOpen])

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
        managerContactPendingChoice: false,
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
        if (!isSiteUserSignedIn(user, userLoaded)) {
          requestOpenLoginModal({ wizard: true })
          return
        }
        void openManagerChatDock()
        return
      }
      if (contactPref === 'telegram') {
        const tgUrl = (import.meta.env?.VITE_MANAGER_TELEGRAM_URL || '').trim()
        const botMessage = {
          id: Date.now() + 1,
          text: tgUrl ? t('managerContactThanksTelegram') : t('liveChatTelegramNotConfigured'),
          sender: 'bot',
          timestamp: new Date(),
          buttons: null,
          recommendations: null,
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
        recommendations: null,
      }
      setChatMessages((prev) => [...prev, botMessage])
      return
    }

    const lowerMessage = userMessage.toLowerCase()

    if (
      lowerMessage.includes('для себя') ||
      lowerMessage === 'для себя' ||
      lowerMessage.includes('сам') ||
      lowerMessage.includes('личн')
    ) {
      setUserPreferences((prev) => ({ ...prev, purpose: 'для себя' }))
    } else if (
      lowerMessage.includes('под сдачу') ||
      lowerMessage === 'под сдачу' ||
      lowerMessage.includes('сдачу') ||
      lowerMessage.includes('аренд')
    ) {
      setUserPreferences((prev) => ({ ...prev, purpose: 'под сдачу' }))
    } else if (
      lowerMessage.includes('инвестиц') ||
      lowerMessage === 'инвестиции' ||
      lowerMessage.includes('инвест')
    ) {
      setUserPreferences((prev) => ({ ...prev, purpose: 'инвестиции' }))
    }

    if (
      lowerMessage.includes('испания') ||
      lowerMessage.includes('spain') ||
      lowerMessage.includes('españa') ||
      lowerMessage.includes('tenerife') ||
      lowerMessage.includes('тенерифе') ||
      lowerMessage.includes('коста') ||
      lowerMessage.includes('barcelona') ||
      lowerMessage.includes('madrid')
    ) {
      setUserPreferences((prev) => ({ ...prev, location: 'Испания' }))
    } else if (
      lowerMessage.includes('дубай') ||
      lowerMessage.includes('dubai') ||
      lowerMessage.includes('uae') ||
      lowerMessage.includes('оаэ') ||
      lowerMessage.includes('emirates')
    ) {
      setUserPreferences((prev) => ({ ...prev, location: 'Дубай' }))
    }

    const budgetMatch = userMessage.match(/(\d+[\s,.]?\d*)\s*(тыс|млн|k|m|€|\$|eur|usd|евро|доллар|рубл|₽|rub)/i)
    if (budgetMatch) {
      let budget = parseFloat(budgetMatch[1].replace(/\s/g, '').replace(',', '.'))
      const unit = budgetMatch[2].toLowerCase()
      const eurToRubRate = 100

      if (unit.includes('млн') || unit === 'm') {
        budget *= 1000000
      } else if (unit.includes('тыс') || unit === 'k') {
        budget *= 1000
      }

      if (unit.includes('рубл') || unit.includes('₽') || unit.includes('rub')) {
        budget /= eurToRubRate
      }

      setUserPreferences((prev) => ({ ...prev, budget }))
    }

    if (
      lowerMessage.includes('квартир') ||
      lowerMessage.includes('апартамент') ||
      lowerMessage.includes('apartment')
    ) {
      setUserPreferences((prev) => ({ ...prev, propertyType: 'квартира' }))
    } else if (lowerMessage.includes('вилл') || lowerMessage.includes('villa')) {
      setUserPreferences((prev) => ({ ...prev, propertyType: 'вилла' }))
    } else if (
      lowerMessage.includes('дом') ||
      lowerMessage.includes('таунхаус') ||
      lowerMessage.includes('townhouse') ||
      lowerMessage.includes('house')
    ) {
      setUserPreferences((prev) => ({ ...prev, propertyType: 'дом' }))
    }

    const roomsMatch = userMessage.match(/(\d+)\s*(комнат|room|bed)/i)
    if (roomsMatch) {
      setUserPreferences((prev) => ({ ...prev, rooms: parseInt(roomsMatch[1], 10) }))
    }

    let wantsManager = false
    try {
      wantsManager = await detectManagerContactIntent(userMessage)
    } catch {
      wantsManager = false
    }

    if (wantsManager) {
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
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: t('managerRequestAlready', { method: methodLabel }),
            sender: 'bot',
            timestamp: new Date(),
            buttons: null,
            recommendations: null,
          },
        ])
        return
      }
      if (userPreferences.managerContactPendingChoice) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: t('managerContactPickHint'),
            sender: 'bot',
            timestamp: new Date(),
            buttons: getManagerContactButtons(t),
            recommendations: null,
          },
        ])
        return
      }

      setUserPreferences((prev) => ({
        ...prev,
        managerContactRequested: true,
        managerContactPendingChoice: true,
      }))
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: t('managerRequestAck'),
          sender: 'bot',
          timestamp: new Date(),
          buttons: getManagerContactButtons(t),
          recommendations: null,
        },
      ])
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
      const response = await askPropertyAssistant(
        [...chatMessages, userMessageObj],
        userPreferences,
        recommendationProperties,
      )

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: response.text,
          sender: 'bot',
          timestamp: new Date(),
          buttons: response.buttons,
          recommendations: response.recommendations,
        },
      ])
    } catch (error) {
      console.error('Ошибка при обращении к AI:', error)
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: t('chatError'),
          sender: 'bot',
          timestamp: new Date(),
          buttons: null,
          recommendations: null,
        },
      ])
    } finally {
      if (slowResponseTimerRef.current) {
        clearTimeout(slowResponseTimerRef.current)
        slowResponseTimerRef.current = null
      }
      setIsLoadingAI(false)
      setIsSlowAIResponse(false)
    }
  }

  const submitManagerMessage = (e) => {
    e.preventDefault()
    if (!managerChatInput.trim() || managerConnecting || !liveChatToken) return
    const text = managerChatInput.trim()
    setManagerChatInput('')
    void sendManagerMessage(text)
  }

  return {
    isChatOpen,
    isManagerChatOpen,
    toggleChat,
    closeChatDock,
    closeManagerChatDock,
    chatMessages,
    chatInput,
    isLoadingAI,
    isSlowAIResponse,
    chatMessagesRef,
    lastMessageRef,
    handleChatInputChange,
    handleChatSubmit,
    handleButtonClick,
    managerChatInput,
    setManagerChatInput,
    managerConnecting,
    managerMessagesRef,
    managerThreadUi,
    liveChatToken,
    submitManagerMessage,
  }
}
