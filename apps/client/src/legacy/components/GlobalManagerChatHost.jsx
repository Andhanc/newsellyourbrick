import { useCallback, useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import ManagerChatModal, { useManagerChatUserId } from './ManagerChatModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'

/**
 * App-wide host for in-app support (Header «Поддержка», owner nav, deep links).
 * Available to every signed-in user. VIP chats/groups stay in WhatsApp.
 * Desktop → modal, mobile → buyer drawer (via ManagerChatModal).
 */
export default function GlobalManagerChatHost() {
  const { user, isLoaded } = useUser()
  const [open, setOpen] = useState(false)
  const chatUserId = useManagerChatUserId(user, isLoaded)

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

  return <ManagerChatModal open={open} onClose={closeChat} chatUserId={chatUserId} />
}
