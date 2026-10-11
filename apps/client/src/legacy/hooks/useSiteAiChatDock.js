import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { getUserData, isAuthenticated, getStoredNumericUserId } from '../services/authService'
import { syncAssistantLead } from '../services/assistantLeadService'
import { askPropertyAssistant, detectManagerContactIntent } from '../services/aiService'
import {
  invalidateAssistantUserContext,
  loadAssistantUserContext,
} from '../services/assistantUserContext'
import { getManagerContactButtons } from '../services/liveChatApi'
import { fetchAuctionList, getCachedList } from '../services/auctionListCache'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { refreshAssistantMessageCopy } from '../utils/siteAssistantHelpers'
import {
  createAssistantCacheEnvelope,
  createAssistantGuestLimitMessage,
  createAssistantIntroMessage,
  detectAssistantInputLanguage,
  GUEST_ASSISTANT_REPLY_LIMIT,
  incrementGuestAssistantReplyCount,
  isGuestAssistantLimitReached,
  normalizeAssistantLanguage,
  prepareAssistantFiles,
  readAssistantCache,
  readGuestAssistantReplyCount,
} from '../utils/assistantExperience'
import {
  archiveAssistantChatSession,
  deleteAssistantChatSession,
  getAssistantChatSession,
  readAssistantChatSessions,
} from '../utils/assistantChatSessions'

const EMPTY_RECOMMENDATION_PROPERTIES = Object.freeze([])

const EMPTY_ASSISTANT_PREFERENCES = {
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
}

export function useSiteAiChatDock({
  recommendationProperties = EMPTY_RECOMMENDATION_PROPERTIES,
  initialOpen = false,
} = {}) {
  const { t, i18n } = useTranslation()
  const { user, isLoaded: userLoaded } = useUser()
  const dbUserId = getStoredNumericUserId()

  const [isChatOpen, setIsChatOpen] = useState(() => Boolean(initialOpen))
  const [isManagerChatOpen, setIsManagerChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [isSlowAIResponse, setIsSlowAIResponse] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState([])
  const [attachmentError, setAttachmentError] = useState('')
  const [catalogProperties, setCatalogProperties] = useState(() => {
    if (Array.isArray(recommendationProperties) && recommendationProperties.length > 0) {
      return recommendationProperties
    }
    return getCachedList() || []
  })
  const [userPreferences, setUserPreferences] = useState(EMPTY_ASSISTANT_PREFERENCES)
  const [guestReplyCount, setGuestReplyCount] = useState(0)
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false)
  const [chatSessions, setChatSessions] = useState([])

  const slowResponseTimerRef = useRef(null)
  const chatMessagesRef = useRef(null)
  const lastMessageRef = useRef(null)
  const chatHistoryLoadedRef = useRef(false)
  const lastChatUserIdRef = useRef(null)

  const isLoggedIn = isAuthenticated() || (user && userLoaded)

  useEffect(() => {
    if (Array.isArray(recommendationProperties) && recommendationProperties.length > 0) {
      setCatalogProperties(recommendationProperties)
    }
  }, [recommendationProperties])

  useEffect(() => {
    if (!isChatOpen) return undefined
    if (Array.isArray(recommendationProperties) && recommendationProperties.length > 0) return undefined
    const cached = getCachedList()
    if (cached?.length) setCatalogProperties(cached)
    return undefined
  }, [isChatOpen, recommendationProperties])

  const catalogPropertiesRef = useRef(catalogProperties)
  catalogPropertiesRef.current = catalogProperties

  const ensureCatalogForAi = useCallback(async () => {
    if (Array.isArray(recommendationProperties) && recommendationProperties.length > 0) {
      return recommendationProperties
    }
    const cached = getCachedList()
    if (cached?.length) {
      setCatalogProperties(cached)
      return cached
    }
    if (catalogPropertiesRef.current.length) return catalogPropertiesRef.current
    try {
      const list = await fetchAuctionList(dbUserId ?? undefined, {
        catalogs: 'all',
        includeTestTimers: false,
      })
      if (Array.isArray(list) && list.length) {
        setCatalogProperties(list)
        return list
      }
    } catch {
      /* keep empty catalog */
    }
    return catalogPropertiesRef.current
  }, [recommendationProperties, dbUserId])

  const propertiesForAi = useMemo(() => {
    if (Array.isArray(recommendationProperties) && recommendationProperties.length > 0) {
      return recommendationProperties
    }
    return catalogProperties
  }, [recommendationProperties, catalogProperties])

  const assistantUserIdentity = useMemo(() => {
    const stored = getUserData()
    const storedName = String(stored?.name || '').trim()
    const [storedFirstName = '', ...storedLastNameParts] = storedName.split(/\s+/)
    return {
      firstName: user?.firstName || stored?.firstName || stored?.first_name || storedFirstName,
      lastName:
        user?.lastName || stored?.lastName || stored?.last_name || storedLastNameParts.join(' '),
      displayName: user?.fullName || storedName,
      country: stored?.country,
      city: stored?.city,
      role: stored?.role,
      verified: stored?.is_verified === true || stored?.is_verified === 1,
    }
  }, [user, userLoaded])

  const assistantDbUserId = useMemo(() => {
    const storedId = getUserData()?.id || dbUserId
    return /^\d+$/.test(String(storedId || '')) ? String(storedId) : null
  }, [dbUserId, user, userLoaded])

  useEffect(() => {
    const invalidate = () => invalidateAssistantUserContext(assistantDbUserId)
    window.addEventListener('propertyFavoritesChanged', invalidate)
    window.addEventListener('subscription-billing-updated', invalidate)
    window.addEventListener('owner-properties-update', invalidate)
    window.addEventListener('verification-status-update', invalidate)
    window.addEventListener('property-bid-sse', invalidate)
    return () => {
      window.removeEventListener('propertyFavoritesChanged', invalidate)
      window.removeEventListener('subscription-billing-updated', invalidate)
      window.removeEventListener('owner-properties-update', invalidate)
      window.removeEventListener('verification-status-update', invalidate)
      window.removeEventListener('property-bid-sse', invalidate)
    }
  }, [assistantDbUserId])

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

  const openManagerChatDock = useCallback(() => {
    if (!isSiteUserSignedIn(user, userLoaded)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    // GlobalManagerChatHost owns manager modal/drawer UI.
    window.dispatchEvent(new CustomEvent('openManagerChat'))
  }, [user, userLoaded])

  const closeManagerChatDock = useCallback(() => {
    window.dispatchEvent(new CustomEvent('closeManagerChat'))
  }, [])

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      const next = !prev
      if (next) {
        window.dispatchEvent(new CustomEvent('closeManagerChat'))
      }
      return next
    })
  }, [])

  const closeChatDock = useCallback(() => {
    setIsChatOpen(false)
  }, [])

  useEffect(() => {
    const onManagerState = (event) => {
      setIsManagerChatOpen(Boolean(event.detail?.isOpen))
    }
    window.addEventListener('managerChatStateChange', onManagerState)
    return () => window.removeEventListener('managerChatStateChange', onManagerState)
  }, [])

  useEffect(() => {
    const onOpenAI = () => {
      window.dispatchEvent(new CustomEvent('closeManagerChat'))
      setIsChatOpen(true)
    }
    const onCloseAI = () => setIsChatOpen(false)
    window.addEventListener('openAIChat', onOpenAI)
    window.addEventListener('closeAIChat', onCloseAI)
    return () => {
      window.removeEventListener('openAIChat', onOpenAI)
      window.removeEventListener('closeAIChat', onCloseAI)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      setGuestReplyCount(0)
      return
    }
    setGuestReplyCount(readGuestAssistantReplyCount(getChatUserId))
  }, [isLoggedIn, getChatUserId])

  useEffect(() => {
    const chatUserId = getChatUserId
    const introText = t('assistantIntroMessage')
    const guestLimitText = t('assistantGuestLimitMessage')
    const userChanged = lastChatUserIdRef.current !== chatUserId

    if (userChanged) {
      try {
        const historyKey = `aiChatHistory_${chatUserId}`
        const preferencesKey = `aiChatPreferences_${chatUserId}`
        const savedChatHistory = localStorage.getItem(historyKey)

        if (savedChatHistory) {
          const parsed = readAssistantCache(savedChatHistory)
          const hasUserMessage = parsed.some((msg) => msg?.sender === 'user')
          if (hasUserMessage) {
            setChatMessages(
              parsed.map((msg) => {
                const refreshed = refreshAssistantMessageCopy(
                  {
                    ...msg,
                    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                  },
                  introText,
                )
                if (refreshed?.isIntro) return { ...refreshed, text: introText }
                if (refreshed?.authPrompt) return { ...refreshed, text: guestLimitText }
                return refreshed
              }),
            )
          } else {
            setChatMessages([createAssistantIntroMessage(introText)])
          }
        } else {
          setChatMessages([createAssistantIntroMessage(introText)])
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
        setChatMessages([createAssistantIntroMessage(introText)])
      }
      return
    }

    // Смена языка UI: обновляем локализованные системные реплики помощника.
    setChatMessages((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) {
        return [createAssistantIntroMessage(introText)]
      }
      let changed = false
      const next = prev.map((msg) => {
        if (msg?.isIntro && msg.text !== introText) {
          changed = true
          return { ...msg, text: introText }
        }
        if (msg?.authPrompt && msg.text !== guestLimitText) {
          changed = true
          return { ...msg, text: guestLimitText }
        }
        return msg
      })
      return changed ? next : prev
    })
  }, [getChatUserId, t])

  useEffect(() => {
    if (chatHistoryLoadedRef.current && chatMessages.length > 0) {
      try {
        const historyKey = `aiChatHistory_${getChatUserId}`
        localStorage.setItem(historyKey, JSON.stringify(createAssistantCacheEnvelope(chatMessages)))
      } catch (error) {
        console.error('Ошибка при сохранении истории чата:', error)
      }
    }
  }, [chatMessages, getChatUserId])

  useEffect(() => {
    if (!isChatOpen || !chatHistoryLoadedRef.current || chatMessages.length === 0) return
    const userData = getUserData()
    syncAssistantLead(getChatUserId, chatMessages, userPreferences, userData?.isLoggedIn ? userData : null)
  }, [isChatOpen, chatMessages, userPreferences, getChatUserId])

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

  const refreshChatSessions = useCallback(() => {
    setChatSessions(readAssistantChatSessions(getChatUserId))
  }, [getChatUserId])

  const openChatHistory = useCallback(() => {
    refreshChatSessions()
    setIsChatHistoryOpen(true)
  }, [refreshChatSessions])

  const closeChatHistory = useCallback(() => {
    setIsChatHistoryOpen(false)
  }, [])

  const hydrateMessages = useCallback((messages, introText) => (
    (Array.isArray(messages) ? messages : []).map((msg) => ({
      ...msg,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    })).map((msg) => {
      const refreshed = refreshAssistantMessageCopy(msg, introText)
      return refreshed || msg
    })
  ), [])

  const clearChatHistory = useCallback(() => {
    if (typeof window !== 'undefined' && !window.confirm(t('clearChatConfirm'))) return
    try {
      archiveAssistantChatSession(getChatUserId, chatMessages, userPreferences)
      localStorage.removeItem(`aiChatHistory_${getChatUserId}`)
      localStorage.removeItem(`aiChatPreferences_${getChatUserId}`)
    } catch (error) {
      console.error('Ошибка при очистке истории чата:', error)
    }
    setUserPreferences({ ...EMPTY_ASSISTANT_PREFERENCES })
    setChatInput('')
    setPendingAttachments([])
    setAttachmentError('')
    setIsSlowAIResponse(false)
    setIsChatHistoryOpen(false)
    setChatMessages([createAssistantIntroMessage(t('assistantIntroMessage'))])
    refreshChatSessions()
  }, [chatMessages, getChatUserId, refreshChatSessions, t, userPreferences])

  const restoreChatSession = useCallback((sessionId) => {
    const session = getAssistantChatSession(getChatUserId, sessionId)
    if (!session?.messages?.length) return
    try {
      // Текущий диалог тоже сохраняем, чтобы его можно было вернуть.
      archiveAssistantChatSession(getChatUserId, chatMessages, userPreferences)
      const introText = t('assistantIntroMessage')
      const restored = hydrateMessages(session.messages, introText)
      setChatMessages(restored.length ? restored : [createAssistantIntroMessage(introText)])
      setUserPreferences({
        ...EMPTY_ASSISTANT_PREFERENCES,
        ...(session.preferences && typeof session.preferences === 'object' ? session.preferences : {}),
      })
      setChatInput('')
      setPendingAttachments([])
      setAttachmentError('')
      setIsSlowAIResponse(false)
      setIsChatHistoryOpen(false)
      localStorage.setItem(
        `aiChatHistory_${getChatUserId}`,
        JSON.stringify(createAssistantCacheEnvelope(restored)),
      )
      if (session.preferences) {
        localStorage.setItem(
          `aiChatPreferences_${getChatUserId}`,
          JSON.stringify(session.preferences),
        )
      }
    } catch (error) {
      console.error('Ошибка при восстановлении истории чата:', error)
    }
    refreshChatSessions()
  }, [chatMessages, getChatUserId, hydrateMessages, refreshChatSessions, t, userPreferences])

  const removeChatSession = useCallback((sessionId) => {
    const next = deleteAssistantChatSession(getChatUserId, sessionId)
    setChatSessions(next)
  }, [getChatUserId])

  const openGuestAuthPrompt = useCallback(() => {
    closeChatDock()
    window.setTimeout(() => requestOpenLoginModal({ wizard: true }), 180)
  }, [closeChatDock])

  const handleChatInputChange = (e) => {
    setChatInput(e.target.value)
  }

  const handleFilesSelected = async (fileList) => {
    setAttachmentError('')
    try {
      setPendingAttachments(await prepareAssistantFiles(fileList, pendingAttachments))
    } catch (error) {
      setAttachmentError(String(error?.message || 'FILE_READ_FAILED'))
    }
  }

  const removePendingAttachment = (attachmentId) => {
    setPendingAttachments((current) => current.filter((item) => item.id !== attachmentId))
    setAttachmentError('')
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
    const requestAttachments = pendingAttachments
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
    if (!userMessage && requestAttachments.length) userMessage = t('assistantAttachmentOnlyPrompt')
    if (!userMessage) return

    if (!buttonText && !contactPref) {
      setChatInput('')
      setPendingAttachments([])
      setAttachmentError('')
    }

    const userMessageObj = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
      attachments: requestAttachments.map(({ name, mimeType, size }) => ({ name, mimeType, size })),
    }

    if (!isLoggedIn && !contactPref && isGuestAssistantLimitReached(getChatUserId)) {
      setChatMessages((prev) => {
        const alreadyPrompted = prev.some((msg) => msg?.authPrompt)
        const next = [...prev, userMessageObj]
        if (alreadyPrompted) return next
        return [...next, createAssistantGuestLimitMessage(t('assistantGuestLimitMessage'))]
      })
      setGuestReplyCount(GUEST_ASSISTANT_REPLY_LIMIT)
      return
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
    const nextPreferences = { ...userPreferences }

    if (
      lowerMessage.includes('для себя') ||
      lowerMessage === 'для себя' ||
      lowerMessage.includes('сам') ||
      lowerMessage.includes('личн')
    ) {
      nextPreferences.purpose = 'для себя'
    } else if (
      lowerMessage.includes('под сдачу') ||
      lowerMessage === 'под сдачу' ||
      lowerMessage.includes('сдачу') ||
      lowerMessage.includes('аренд')
    ) {
      nextPreferences.purpose = 'под сдачу'
    } else if (
      lowerMessage.includes('инвестиц') ||
      lowerMessage === 'инвестиции' ||
      lowerMessage.includes('инвест')
    ) {
      nextPreferences.purpose = 'инвестиции'
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

      nextPreferences.budget = budget
    }

    if (
      lowerMessage.includes('квартир') ||
      lowerMessage.includes('апартамент') ||
      lowerMessage.includes('apartment')
    ) {
      nextPreferences.propertyType = 'квартира'
    } else if (lowerMessage.includes('вилл') || lowerMessage.includes('villa')) {
      nextPreferences.propertyType = 'вилла'
    } else if (
      lowerMessage.includes('дом') ||
      lowerMessage.includes('таунхаус') ||
      lowerMessage.includes('townhouse') ||
      lowerMessage.includes('house')
    ) {
      nextPreferences.propertyType = 'дом'
    }

    const roomsMatch = userMessage.match(/(\d+)\s*(комнат|room|bed)/i)
    if (roomsMatch) {
      nextPreferences.rooms = parseInt(roomsMatch[1], 10)
    }

    setUserPreferences(nextPreferences)

    let wantsManager = false
    try {
      wantsManager = await detectManagerContactIntent(userMessage)
    } catch {
      wantsManager = false
    }

    if (wantsManager) {
      const alreadyDone = nextPreferences.preferredContact
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
      if (nextPreferences.managerContactPendingChoice) {
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

      setUserPreferences({
        ...nextPreferences,
        managerContactRequested: true,
        managerContactPendingChoice: true,
      })
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
      const catalog = await ensureCatalogForAi()
      const userContext = isLoggedIn && assistantDbUserId
        ? await loadAssistantUserContext({
            userId: assistantDbUserId,
            identity: assistantUserIdentity,
            catalog,
          })
        : { authenticated: false }
      const response = await askPropertyAssistant(
        [...chatMessages, userMessageObj],
        nextPreferences,
        catalog,
        {
          selectedLanguage: normalizeAssistantLanguage(i18n.resolvedLanguage || i18n.language),
          detectedLanguage: detectAssistantInputLanguage(userMessage),
          attachments: requestAttachments,
          assistantSessionId: getChatUserId,
          userContext,
        },
      )

      if (response?.preferences && typeof response.preferences === 'object') {
        setUserPreferences((prev) => ({
          ...prev,
          ...response.preferences,
          managerContactRequested: prev.managerContactRequested,
          managerContactPendingChoice: prev.managerContactPendingChoice,
          preferredContact: prev.preferredContact,
        }))
      }

      const botReply = {
        id: Date.now() + 1,
        text: response.text,
        sender: 'bot',
        timestamp: new Date(),
        buttons: response.buttons,
        recommendations: response.recommendations,
        navigation: response.navigation,
        actions: response.actions,
        languageSuggestion: response.languageSuggestion,
        sources: response.sources,
        yieldEstimate: response.yieldEstimate,
      }

      if (!isLoggedIn) {
        const used = incrementGuestAssistantReplyCount(getChatUserId)
        setGuestReplyCount(used)
        if (used >= GUEST_ASSISTANT_REPLY_LIMIT) {
          setChatMessages((prev) => [
            ...prev,
            botReply,
            createAssistantGuestLimitMessage(t('assistantGuestLimitMessage'), Date.now() + 2),
          ])
          return
        }
      }

      setChatMessages((prev) => [...prev, botReply])
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
          navigation: null,
          yieldEstimate: null,
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

  const guestLimitReached =
    !isLoggedIn && guestReplyCount >= GUEST_ASSISTANT_REPLY_LIMIT

  return {
    isChatOpen,
    isManagerChatOpen,
    toggleChat,
    closeChatDock,
    closeManagerChatDock,
    openManagerChatDock,
    openGuestAuthPrompt,
    userDisplayName: user?.firstName || user?.fullName || '',
    chatMessages,
    chatInput,
    isLoadingAI,
    isSlowAIResponse,
    pendingAttachments,
    attachmentError,
    guestLimitReached,
    guestRepliesRemaining: isLoggedIn
      ? null
      : Math.max(0, GUEST_ASSISTANT_REPLY_LIMIT - guestReplyCount),
    chatMessagesRef,
    lastMessageRef,
    handleChatInputChange,
    handleChatSubmit,
    handleButtonClick,
    handleFilesSelected,
    removePendingAttachment,
    clearChatHistory,
    isChatHistoryOpen,
    chatSessions,
    openChatHistory,
    closeChatHistory,
    restoreChatSession,
    removeChatSession,
    catalogProperties: propertiesForAi,
  }
}
