import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { getUserData } from '../services/authService'
import {
  ensureLiveChatSession,
  fetchLiveChatMessagesSince,
  normalizeLiveChatRows,
  sendLiveChatUserMessage,
} from '../services/liveChatApi'
import { showNotification } from '../utils/toastHelper'

function appendUniqueManagerMessages(prev, incoming) {
  const nextList = Array.isArray(incoming) ? incoming.filter(Boolean) : []
  if (!nextList.length) return prev
  const existingIds = new Set((prev || []).map((m) => m?.id).filter((id) => id != null))
  const uniqueToAdd = nextList.filter((m) => m?.id != null && !existingIds.has(m.id))
  return uniqueToAdd.length ? [...(prev || []), ...uniqueToAdd] : prev
}

/**
 * Сессия live-chat с менеджером (как в Chat.jsx), для док-панели справа без перехода на /chat.
 */
export function useManagerLiveChat(chatUserId, t) {
  const [managerChatMessages, setManagerChatMessages] = useState([])
  const [liveChatToken, setLiveChatToken] = useState(null)
  const [managerConnecting, setManagerConnecting] = useState(false)
  const managerPollRef = useRef(null)
  const lastManagerMsgIdRef = useRef(0)
  const managerMessagesRef = useRef(null)

  const clearPoll = useCallback(() => {
    if (managerPollRef.current) {
      clearInterval(managerPollRef.current)
      managerPollRef.current = null
    }
  }, [])

  const scheduleManagerPoll = useCallback(
    (token) => {
      clearPoll()
      managerPollRef.current = setInterval(async () => {
        try {
          const chunk = await fetchLiveChatMessagesSince(token, lastManagerMsgIdRef.current)
          if (chunk.length) {
            lastManagerMsgIdRef.current = Math.max(...chunk.map((r) => r.id))
            setManagerChatMessages((p) => appendUniqueManagerMessages(p, normalizeLiveChatRows(chunk)))
          }
        } catch {
          /* ignore */
        }
      }, 2500)
    },
    [clearPoll]
  )

  /** Остановить опрос; токен и история сохраняются — при следующем открытии панели enterLiveManagerChat подхватит сессию. */
  const pauseManagerPolling = useCallback(() => clearPoll(), [clearPoll])

  const disconnectManagerChat = useCallback(() => {
    clearPoll()
    setLiveChatToken(null)
    setManagerChatMessages([])
    if (chatUserId) {
      localStorage.setItem(`aiChatLiveManagerMode_${chatUserId}`, '0')
    }
  }, [chatUserId, clearPoll])

  const enterLiveManagerChat = useCallback(async () => {
    const userData = getUserData()
    const uid = userData?.isLoggedIn && userData?.id ? Number(userData.id) : null
    setManagerConnecting(true)
    try {
      const { token, messages: rows } = await ensureLiveChatSession({
        assistantSessionId: chatUserId,
        userId: Number.isFinite(uid) ? uid : null,
        waitMessage: t('liveChatWaitNotice'),
      })
      const list = rows || []
      lastManagerMsgIdRef.current = list.reduce((m, r) => Math.max(m, r.id), 0)
      setManagerChatMessages(normalizeLiveChatRows(list))
      setLiveChatToken(token)
      localStorage.setItem(`aiChatLiveManagerMode_${chatUserId}`, '1')
      scheduleManagerPoll(token)
    } catch (err) {
      console.error(err)
      showNotification(err?.message || t('liveChatError'))
      throw err
    } finally {
      setManagerConnecting(false)
    }
  }, [chatUserId, t, scheduleManagerPoll])

  const sendManagerMessage = useCallback(
    async (text) => {
      const trimmed = (text || '').trim()
      if (!trimmed || !liveChatToken) return
      try {
        const row = await sendLiveChatUserMessage(liveChatToken, trimmed)
        lastManagerMsgIdRef.current = Math.max(lastManagerMsgIdRef.current, row.id)
        setManagerChatMessages((prev) => appendUniqueManagerMessages(prev, normalizeLiveChatRows([row])))
      } catch (err) {
        showNotification(err?.message || t('liveChatError'))
      }
    },
    [liveChatToken, t]
  )

  const managerThreadUi = useMemo(
    () =>
      managerChatMessages.map((m) => ({
        id: m.id,
        text: m.text,
        sender: m.sender,
        time: m.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        timestamp: m.timestamp,
      })),
    [managerChatMessages]
  )

  useEffect(() => {
    return () => clearPoll()
  }, [clearPoll])

  useEffect(() => {
    if (!managerMessagesRef.current) return
    managerMessagesRef.current.scrollTop = managerMessagesRef.current.scrollHeight
  }, [managerThreadUi, managerConnecting])

  return {
    managerMessagesRef,
    managerThreadUi,
    managerConnecting,
    liveChatToken,
    enterLiveManagerChat,
    pauseManagerPolling,
    disconnectManagerChat,
    sendManagerMessage,
  }
}
