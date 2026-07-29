import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX, FiSend } from 'react-icons/fi'
import { useManagerLiveChat } from '../hooks/useManagerLiveChat'
import { getUserData } from '../services/authService'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import './ManagerChatModal.css'

/**
 * Модальное окно live-чата с менеджером (как в кабинете покупателя / TestPage).
 */
export default function ManagerChatModal({ open, onClose, chatUserId }) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const enterStartedRef = useRef(false)
  const {
    liveChatToken,
    managerConnecting,
    managerMessagesRef,
    managerThreadUi,
    enterLiveManagerChat,
    pauseManagerPolling,
    sendManagerMessage,
  } = useManagerLiveChat(chatUserId, t)

  const handleClose = useCallback(() => {
    setInput('')
    pauseManagerPolling()
    onClose()
  }, [onClose, pauseManagerPolling])

  useEffect(() => {
    if (!open) {
      enterStartedRef.current = false
      pauseManagerPolling()
      return undefined
    }
    if (!chatUserId || enterStartedRef.current) return undefined
    enterStartedRef.current = true
    let cancelled = false
    ;(async () => {
      try {
        await enterLiveManagerChat()
      } catch {
        if (!cancelled) {
          enterStartedRef.current = false
          handleClose()
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, chatUserId, enterLiveManagerChat, handleClose, pauseManagerPolling])

  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, handleClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="manager-chat-modal-root"
      role="dialog"
      aria-modal="true"
      aria-label={t('chatManagerTitle')}
    >
      <button
        type="button"
        className="manager-chat-modal-root__backdrop"
        onClick={handleClose}
        aria-label={t('closeChat')}
      />
      <div className="chat-widget chat-widget--manager-dock">
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
            onClick={handleClose}
            aria-label={t('closeChat')}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="chat-widget__messages" ref={managerMessagesRef}>
          {managerConnecting ? (
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
          ) : (
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
            ))
          )}
        </div>

        <form
          className="chat-widget__input-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!input.trim() || managerConnecting || !liveChatToken) return
            const text = input.trim()
            setInput('')
            void sendManagerMessage(text)
          }}
        >
          <input
            type="text"
            className="chat-widget__input"
            placeholder={t('chatPlaceholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
    </div>,
    document.body,
  )
}

/** Идентификатор сессии чата (как в TestPage / Home). */
export function useManagerChatUserId(clerkUser, clerkLoaded) {
  return useMemo(() => {
    if (isSiteUserSignedIn(clerkUser, clerkLoaded)) {
      const freshUserData = getUserData()
      const storedUserId = freshUserData?.id || localStorage.getItem('userId')
      if (storedUserId) return `user_${storedUserId}`
    }
    let sessionId = localStorage.getItem('chatSessionId')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('chatSessionId', sessionId)
    }
    return sessionId
  }, [clerkUser, clerkLoaded])
}
