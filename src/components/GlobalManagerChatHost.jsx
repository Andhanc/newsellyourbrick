import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import ManagerChatModal, { useManagerChatUserId } from './ManagerChatModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { useViewerVipAccess } from '../hooks/useViewerVipAccess'
import { showNotification } from '../utils/toastHelper'

/**
 * App-wide host for manager live-chat (Header «Чат», owner nav, deep links).
 * Desktop → modal, mobile → buyer drawer (via ManagerChatModal).
 */
export default function GlobalManagerChatHost() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isLoaded } = useUser()
  const [open, setOpen] = useState(false)
  const chatUserId = useManagerChatUserId(user, isLoaded)
  const { canAccess, resolved } = useViewerVipAccess()

  const openChat = useCallback(() => {
    if (!isSiteUserSignedIn(user, isLoaded)) {
      requestOpenLoginModal({ wizard: true })
      return
    }
    if (resolved && !canAccess('personalManager')) {
      showNotification(t('subscriptionLockManagerToast'), 'info')
      navigate({ pathname: '/subscriptions', hash: 'subscriptions-pricing-section' })
      return
    }
    setOpen(true)
  }, [user, isLoaded, resolved, canAccess, navigate, t])

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
