import { useCallback, useEffect, useRef, useState } from 'react'
import VerificationSuccessNotification from './VerificationSuccessNotification'
import { getApiBaseUrl } from '../utils/apiConfig'
import { CLERK_DB_USER_SYNCED } from '../services/authService'
import { fetchUserNotifications } from '../utils/notificationsApi'

const shownKeyFor = (userId, notificationId) =>
  `verification_success_shown_${userId}_${notificationId}`

const readNumericDbUserId = () => {
  const raw = localStorage.getItem('userId')
  if (!raw) return null
  const value = String(raw).trim()
  if (!/^\d+$/.test(value)) return null
  return value
}

export default function GlobalVerificationSuccessGate() {
  const [verificationNotification, setVerificationNotification] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const loadingRef = useRef(false)

  const loadVerificationNotification = useCallback(async (options = {}) => {
    const { force = false } = options
    if (loadingRef.current) return
    const dbUserId = readNumericDbUserId()
    if (!dbUserId) return

    loadingRef.current = true
    try {
      const notifications = await fetchUserNotifications(dbUserId, {
        ttlMs: force ? 0 : 15000,
        force,
      })

      const verificationNotif = notifications.find(
        (n) => n.type === 'verification_success' && n.view_count === 0
      )
      if (!verificationNotif) return

      const shownKey = shownKeyFor(dbUserId, verificationNotif.id)
      if (localStorage.getItem(shownKey) === '1') return

      setVerificationNotification(verificationNotif)
      setIsOpen(true)
    } catch (error) {
      console.warn('GlobalVerificationSuccessGate: failed to load notifications', error)
    } finally {
      loadingRef.current = false
    }
  }, [])

  const handleClose = useCallback(async () => {
    const dbUserId = readNumericDbUserId()
    if (verificationNotification?.id != null && dbUserId) {
      localStorage.setItem(shownKeyFor(dbUserId, verificationNotification.id), '1')
      try {
        const apiBaseUrl = await getApiBaseUrl()
        await fetch(`${apiBaseUrl}/notifications/${verificationNotification.id}/view`, {
          method: 'PUT',
        })
      } catch (error) {
        console.warn('GlobalVerificationSuccessGate: failed to mark as viewed', error)
      }
    }
    setIsOpen(false)
    setVerificationNotification(null)
  }, [verificationNotification])

  useEffect(() => {
    loadVerificationNotification()
    const onFocus = () => {
      loadVerificationNotification()
    }
    const onVerificationPush = () => loadVerificationNotification({ force: true })
    const onOwnerNotificationsPush = () => loadVerificationNotification({ force: true })
    const onClerkSynced = () => {
      loadVerificationNotification()
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('verification-status-update', onVerificationPush)
    window.addEventListener('owner-notifications-refresh', onOwnerNotificationsPush)
    window.addEventListener(CLERK_DB_USER_SYNCED, onClerkSynced)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('verification-status-update', onVerificationPush)
      window.removeEventListener('owner-notifications-refresh', onOwnerNotificationsPush)
      window.removeEventListener(CLERK_DB_USER_SYNCED, onClerkSynced)
    }
  }, [loadVerificationNotification])

  if (!isOpen || !verificationNotification) return null

  return (
    <VerificationSuccessNotification
      notification={verificationNotification}
      onClose={handleClose}
      onView={() => {}}
    />
  )
}
