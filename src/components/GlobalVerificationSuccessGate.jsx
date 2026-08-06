import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiBaseUrl } from '../utils/apiConfig'
import { CLERK_DB_USER_SYNCED } from '../services/authService'
import BuyerCelebrationModal from './BuyerCelebrationModal'

const shownKeyFor = (userId, notificationId) =>
  `verification_success_shown_${userId}_${notificationId}`

const sseShownKeyFor = (userId) => `verification_approved_celebration_${userId}`

const readNumericDbUserId = () => {
  const raw = localStorage.getItem('userId')
  if (!raw) return null
  const value = String(raw).trim()
  if (!/^\d+$/.test(value)) return null
  return value
}

export default function GlobalVerificationSuccessGate() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [verificationNotification, setVerificationNotification] = useState(null)
  const loadingRef = useRef(false)

  const openCelebration = useCallback((notification = null) => {
    setVerificationNotification(notification)
    setIsOpen(true)
  }, [])

  const loadVerificationNotification = useCallback(
    async (options = {}) => {
      const { force = false } = options
      if (loadingRef.current) return
      const dbUserId = readNumericDbUserId()
      if (!dbUserId) return

      loadingRef.current = true
      try {
        const { fetchUserNotifications } = await import('../utils/notificationsApi')
        const notifications = await fetchUserNotifications(dbUserId, {
          ttlMs: force ? 0 : 15000,
          force,
        })

        const verificationNotif = notifications.find(
          (n) => n.type === 'verification_success' && n.view_count === 0,
        )
        if (!verificationNotif) return

        const shownKey = shownKeyFor(dbUserId, verificationNotif.id)
        if (localStorage.getItem(shownKey) === '1') return
        if (localStorage.getItem(sseShownKeyFor(dbUserId)) === '1') {
          // Уже показали live-celebration — только пометить уведомление просмотренным
          localStorage.setItem(shownKey, '1')
          try {
            const apiBaseUrl = await getApiBaseUrl()
            await fetch(`${apiBaseUrl}/notifications/${verificationNotif.id}/view`, {
              method: 'PUT',
            })
          } catch {
            /* ignore */
          }
          return
        }

        openCelebration(verificationNotif)
      } catch (error) {
        console.warn('GlobalVerificationSuccessGate: failed to load notifications', error)
      } finally {
        loadingRef.current = false
      }
    },
    [openCelebration],
  )

  const handleSseApproved = useCallback(() => {
    const dbUserId = readNumericDbUserId()
    if (!dbUserId) return
    if (localStorage.getItem(sseShownKeyFor(dbUserId)) === '1') {
      void loadVerificationNotification({ force: true })
      return
    }
    openCelebration(null)
    void loadVerificationNotification({ force: true })
  }, [loadVerificationNotification, openCelebration])

  const handleClose = useCallback(async () => {
    const dbUserId = readNumericDbUserId()
    if (dbUserId) {
      let notifId = verificationNotification?.id ?? null
      if (notifId == null) {
        try {
          const { fetchUserNotifications } = await import('../utils/notificationsApi')
          const notifications = await fetchUserNotifications(dbUserId, { ttlMs: 0, force: true })
          const pending = notifications.find(
            (n) => n.type === 'verification_success' && n.view_count === 0,
          )
          if (pending?.id != null) notifId = pending.id
        } catch {
          /* ignore */
        }
      }
      if (notifId != null) {
        localStorage.setItem(shownKeyFor(dbUserId, notifId), '1')
        try {
          const apiBaseUrl = await getApiBaseUrl()
          await fetch(`${apiBaseUrl}/notifications/${notifId}/view`, {
            method: 'PUT',
          })
        } catch (error) {
          console.warn('GlobalVerificationSuccessGate: failed to mark as viewed', error)
        }
      }
      localStorage.setItem(sseShownKeyFor(dbUserId), '1')
    }
    setIsOpen(false)
    setVerificationNotification(null)
  }, [verificationNotification])

  const handleCta = useCallback(async () => {
    await handleClose()
    navigate('/profile')
  }, [handleClose, navigate])

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
    const onApprovedLive = () => handleSseApproved()
    window.addEventListener('focus', onFocus)
    window.addEventListener('verification-status-update', onVerificationPush)
    window.addEventListener('owner-notifications-refresh', onOwnerNotificationsPush)
    window.addEventListener(CLERK_DB_USER_SYNCED, onClerkSynced)
    window.addEventListener('verification-approved-celebration', onApprovedLive)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('verification-status-update', onVerificationPush)
      window.removeEventListener('owner-notifications-refresh', onOwnerNotificationsPush)
      window.removeEventListener(CLERK_DB_USER_SYNCED, onClerkSynced)
      window.removeEventListener('verification-approved-celebration', onApprovedLive)
    }
  }, [handleSseApproved, loadVerificationNotification])

  const title =
    verificationNotification?.title || 'Поздравляем!'
  const text =
    verificationNotification?.message ||
    'Ваши документы одобрены. Теперь вы можете полноценно пользоваться сервисом.'

  return (
    <BuyerCelebrationModal
      open={isOpen}
      title={title}
      text={text}
      ctaLabel="Перейти в профиль"
      onCta={handleCta}
      titleId="verification-approved-celebration-title"
    />
  )
}
