import { useCallback, useEffect, useRef, useState } from 'react'
import VerificationSuccessNotification from './VerificationSuccessNotification'
import { getApiBaseUrl } from '../utils/apiConfig'

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

  const loadVerificationNotification = useCallback(async () => {
    if (loadingRef.current) return
    const dbUserId = readNumericDbUserId()
    if (!dbUserId) return

    loadingRef.current = true
    try {
      const apiBaseUrl = await getApiBaseUrl()
      const response = await fetch(`${apiBaseUrl}/notifications/user/${dbUserId}`)
      if (!response.ok) return

      const data = await response.json()
      if (!data?.success || !Array.isArray(data.data)) return

      const notifications = data.data.map((n) => {
        if (n.data && typeof n.data === 'string') {
          try {
            return { ...n, data: JSON.parse(n.data) }
          } catch {
            return n
          }
        }
        return n
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
    window.addEventListener('focus', onFocus)
    const pollId = setInterval(loadVerificationNotification, 45000)
    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(pollId)
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
