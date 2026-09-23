import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { getUserData } from '../services/authService'

const ManagerChatModal = lazy(() => import('./ManagerChatModal'))

function resolveManagerChatUserId(clerkUser, clerkLoaded) {
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
}

/**
 * App-wide host for in-app support (Header «Поддержка», owner nav, deep links).
 * Available to every signed-in user. VIP chats/groups stay in WhatsApp.
 * Desktop → modal, mobile → buyer drawer (via ManagerChatModal).
 */
export default function GlobalManagerChatHost() {
  const { user, isLoaded } = useUser()
  const [open, setOpen] = useState(false)
  const chatUserId = useMemo(() => resolveManagerChatUserId(user, isLoaded), [user, isLoaded])

  const openChat = useCallback(() => {
    if (!isSiteUserSignedIn(user, isLoaded)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    setOpen(true)
  }, [user, isLoaded])

  const closeChat = useCallback(() => {
    setOpen(false)
  }, [])

  useEffect(() => {
    const onOpen = () => {
      openChat()
    }
    const onClose = () => {
      closeChat()
    }
    window.addEventListener('openManagerChat', onOpen)
    window.addEventListener('closeManagerChat', onClose)
    return () => {
      window.removeEventListener('openManagerChat', onOpen)
      window.removeEventListener('closeManagerChat', onClose)
    }
  }, [openChat, closeChat])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('managerChatStateChange', { detail: { isOpen: open } }),
    )
  }, [open])

  if (!open) return null

  return (
    <Suspense fallback={null}>
      <ManagerChatModal open={open} onClose={closeChat} chatUserId={chatUserId} />
    </Suspense>
  )
}
