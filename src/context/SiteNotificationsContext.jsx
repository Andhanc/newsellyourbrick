import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { getUserData } from '../services/authService'
import { showToast } from '../components/ToastContainer'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'

const SiteNotificationsPanelLazy = lazy(() => import('./SiteNotificationsPanel'))

const SiteNotificationsContext = createContext(null)

const CLERK_DB_USER_SYNCED = 'app:clerk-db-user-synced'

const LIST_FALLBACK_IMG =
  '/images/external/photo-1560448204-e02f11c3d0e2-1ff5809f2f.jpg'

function parseNotificationData(data) {
  if (data == null) return null
  if (typeof data === 'object') return data
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  return null
}

function ensureSuccessfulNotificationResponse(response) {
  if (!response.ok) throw new Error(`Notification update failed: ${response.status}`)
  return response
}

function hasStoredDbUserId() {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null
  return raw != null && /^\d+$/.test(String(raw).trim())
}

async function resolveDbUserIdFromSession(API_BASE_URL) {
  const userData = getUserData()
  if (!userData) return null

  let dbUserId = null
  const storedDbId = localStorage.getItem('userId')
  if (storedDbId && /^\d+$/.test(String(storedDbId).trim())) {
    dbUserId = String(storedDbId).trim()
  } else if (userData.id && /^\d+$/.test(String(userData.id).trim())) {
    dbUserId = String(userData.id).trim()
  }

  if (!dbUserId && (userData.email || userData.phone)) {
    try {
      const searchUrl = userData.email
        ? `${API_BASE_URL}/users/email/${encodeURIComponent(userData.email)}`
        : `${API_BASE_URL}/users/phone/${encodeURIComponent(userData.phone)}`
      const userResponse = await fetch(searchUrl)
      if (userResponse.ok) {
        const userResult = await userResponse.json()
        if (userResult.success && userResult.data?.id != null)
          dbUserId = String(userResult.data.id)
      }
    } catch (e) {
      console.warn('SiteNotifications: resolve user id:', e.message)
    }
  }

  return dbUserId
}

function showPropertyAuthRequiredToast(t) {
  showToast(
    <span style={{ whiteSpace: 'normal' }}>
      {t('toastOpenListingLoginPrefix')}{' '}
      <button
        type="button"
        className="auth-toast-link"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          requestOpenLoginModal({ wizard: true })
        }}
      >
        {t('toastOpenListingLoginLink')}{' '}
        <span className="auth-toast-link__arrow">→</span>
      </button>
    </span>,
    'warning',
    7000,
  )
}

export function SiteNotificationsProvider({ children }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationProperties, setNotificationProperties] = useState({})
  const [isOpen, setIsOpen] = useState(false)
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, () => setIsOpen(false))

  const panelRef = useRef(null)
  const isFirstNotificationsLoadRef = useRef(true)
  const previousNotificationIds = useRef(new Set())
  const propertyMetaInflightRef = useRef(new Set())
  const propertyMetaLoadedKeysRef = useRef(new Set())

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.view_count === 0).length,
    [notifications],
  )

  const API_BASE_URL = getApiBaseUrlSync()

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  const closePanel = useCallback(() => requestClose(), [requestClose])

  const getNotificationPropertyMeta = useCallback(
    (notification) => {
      const payload = parseNotificationData(notification?.data)
      const propertyId = payload?.property_id != null ? Number(payload.property_id) : null
      const cached = propertyId != null ? notificationProperties[propertyId] : null

      return {
        id: propertyId,
        name:
          cached?.name ||
          payload?.property_title ||
          payload?.property_name ||
          notification?.property_title ||
          t('listingDefault'),
        location:
          cached?.location ||
          payload?.property_location ||
          payload?.location ||
          payload?.address ||
          notification?.property_location ||
          '',
        image:
          cached?.image ||
          payload?.property_image ||
          payload?.image ||
          payload?.photo ||
          LIST_FALLBACK_IMG,
      }
    },
    [notificationProperties, t],
  )

  useEffect(() => {
    let cancelled = false

    const loadNotifications = async (options = {}) => {
      if (cancelled) return
      const { force = false } = options
      const dbUserId = await resolveDbUserIdFromSession(API_BASE_URL)
      if (!dbUserId) return

      setNotificationsLoading(true)
      try {
        const { fetchUserNotifications } = await import('../utils/notificationsApi')
        const notificationsList = await fetchUserNotifications(dbUserId, {
          ttlMs: force ? 0 : 15000,
          force,
        })
        if (cancelled) return
        const currentNotificationIds = new Set(notificationsList.map((n) => n.id))
        if (!isFirstNotificationsLoadRef.current) {
          const newBidOutbidNotifications = notificationsList.filter(
            (n) =>
              n.type === 'bid_outbid' &&
              !previousNotificationIds.current.has(n.id) &&
              n.view_count === 0,
          )
          if (newBidOutbidNotifications.length > 0) {
            newBidOutbidNotifications.forEach((notif) => {
              const payload = parseNotificationData(notif.data)
              const propertyId = payload?.property_id
              const message =
                notif.message ||
                t('toastBidOutbidFallback', 'Your bid has been outbid!')
              showToast({
                type: 'warning',
                title: notif.title || 'Вашу ставку перебили',
                message,
                duration: 6500,
                dedupeKey: `bid_outbid:${propertyId ?? notif.id}`,
                action: {
                  label: propertyId != null ? 'Вернуться к торгам' : 'Открыть уведомления',
                  onClick: () => {
                    if (propertyId != null) navigate(getPropertyDetailPath(propertyId, { classic: false }))
                    else setIsOpen(true)
                  },
                },
              })
            })
          }
          const newTestDriveResult = notificationsList.filter(
            (n) =>
              n.type === 'test_drive_result' &&
              !previousNotificationIds.current.has(n.id) &&
              n.view_count === 0,
          )
          if (newTestDriveResult.length > 0) {
            newTestDriveResult.forEach((notif) => {
              const payload = parseNotificationData(notif.data)
              const message =
                notif.message || t('toastTestDriveUpdate', 'Test-drive update')
              showToast({
                type: notif.title?.includes('отклон') ? 'warning' : 'success',
                title: notif.title || 'Статус просмотра обновлён',
                message,
                duration: 6500,
                dedupeKey: `test_drive_result:${payload?.booking_id ?? notif.id}`,
                action: {
                  label: 'Открыть бронирование',
                  onClick: () => navigate(
                    `/profile/bookings${payload?.booking_id != null ? `?booking=${payload.booking_id}` : ''}`,
                  ),
                },
              })
            })
          }
        } else {
          isFirstNotificationsLoadRef.current = false
        }
        previousNotificationIds.current = currentNotificationIds
        setNotifications(notificationsList)
      } catch (e) {
        console.error('SiteNotifications: ошибка загрузки', e)
        setNotifications([])
      } finally {
        if (!cancelled) setNotificationsLoading(false)
      }
    }

    const startListeners = () => {
      loadNotifications()
      const onFocus = () => loadNotifications()
      const handleSse = () => loadNotifications({ force: true })
      window.addEventListener('focus', onFocus)
      window.addEventListener('owner-notifications-refresh', handleSse)
      window.addEventListener('verification-status-update', handleSse)
      return () => {
        window.removeEventListener('focus', onFocus)
        window.removeEventListener('owner-notifications-refresh', handleSse)
        window.removeEventListener('verification-status-update', handleSse)
      }
    }

    let stopListeners = null
    const onClerkSynced = () => {
      stopListeners?.()
      stopListeners = startListeners()
    }

    if (hasStoredDbUserId()) {
      const schedule = () => {
        if (cancelled) return
        stopListeners = startListeners()
      }
      if (typeof window.requestIdleCallback === 'function') {
        const ricId = window.requestIdleCallback(schedule, { timeout: 5000 })
        return () => {
          cancelled = true
          window.cancelIdleCallback(ricId)
          stopListeners?.()
        }
      }
      const tId = window.setTimeout(schedule, 1200)
      return () => {
        cancelled = true
        window.clearTimeout(tId)
        stopListeners?.()
      }
    }

    window.addEventListener(CLERK_DB_USER_SYNCED, onClerkSynced)
    return () => {
      cancelled = true
      window.removeEventListener(CLERK_DB_USER_SYNCED, onClerkSynced)
      stopListeners?.()
    }
  }, [API_BASE_URL, navigate, t])

  useEffect(() => {
    if (!isOpen) return undefined

    const lang = i18n.language || 'ru'
    const ids = Array.from(
      new Set(
        notifications
          .map((n) => {
            const payload = parseNotificationData(n?.data)
            const id = payload?.property_id
            return id != null ? Number(id) : null
          })
          .filter((id) => Number.isFinite(id)),
      ),
    )

    let cancelled = false

    ids.forEach((propertyId) => {
      const dedupeKey = `${propertyId}:${lang}`
      if (propertyMetaLoadedKeysRef.current.has(dedupeKey)) return
      if (propertyMetaInflightRef.current.has(dedupeKey)) return
      propertyMetaInflightRef.current.add(dedupeKey)

      ;(async () => {
        try {
          const { getPropertyCardImage } = await import('../utils/propertyImage')
          const response = await fetch(
            `${API_BASE_URL}/properties/${propertyId}?lang=${encodeURIComponent(lang)}`,
          )
          if (cancelled) return
          if (!response.ok) {
            propertyMetaLoadedKeysRef.current.add(dedupeKey)
            return
          }
          const json = await response.json().catch(() => null)
          const data = json?.data
          if (!data?.id || cancelled) {
            propertyMetaLoadedKeysRef.current.add(dedupeKey)
            return
          }
          const firstPhoto = getPropertyCardImage(data, null)
          propertyMetaLoadedKeysRef.current.add(dedupeKey)
          setNotificationProperties((prev) => ({
            ...prev,
            [propertyId]: {
              id: Number(data.id),
              name: data.title || data.name || null,
              location: data.location || data.address || null,
              image: firstPhoto || null,
            },
          }))
        } catch {
          propertyMetaLoadedKeysRef.current.add(dedupeKey)
        } finally {
          propertyMetaInflightRef.current.delete(dedupeKey)
        }
      })()
    })

    return () => {
      cancelled = true
    }
  }, [isOpen, notifications, i18n.language, API_BASE_URL])

  const respondTestDriveRequest = useCallback(
    async (notification, action) => {
      const payload = parseNotificationData(notification?.data)
      if (!payload?.booking_id) {
        showToast(
          t('notificationsBookingReadError', 'Could not read the request. Refresh the page.'),
          'error',
        )
        return
      }
      const storedDbId = localStorage.getItem('userId')
      const dbUserId =
        storedDbId && /^\d+$/.test(String(storedDbId).trim()) ? String(storedDbId).trim() : null
      if (!dbUserId) {
        requestOpenLoginModal({ wizard: true })
        return
      }
      try {
        let ownerComment = ''
        if (action === 'approve') {
          ownerComment =
            window.prompt(
              t(
                'notificationsOwnerCommentPrompt',
                'Add a comment for the buyer: check-in time, key pickup, etc.',
              ),
            ) || ''
          if (!ownerComment.trim()) {
            showToast(
              t(
                'notificationsOwnerCommentRequired',
                'A comment is required to confirm the request.',
              ),
              'warning',
            )
            return
          }
        }
        const res = await fetch(`${API_BASE_URL}/test-drive-bookings/${payload.booking_id}/respond`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: parseInt(dbUserId, 10),
            action,
            owner_comment: action === 'approve' ? ownerComment : undefined,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.success) {
          showToast(
            json.error || t('notificationsActionFailed', 'Failed to complete this action.'),
            'error',
          )
          return
        }
        showToast(
          action === 'approve'
            ? t('notificationsTestDriveApproved', 'Test-drive request approved.')
            : t('notificationsRequestRejected', 'Request declined.'),
          'success',
          4000,
        )
        const { fetchUserNotifications, invalidateUserNotificationsCache } = await import(
          '../utils/notificationsApi'
        )
        invalidateUserNotificationsCache(dbUserId)
        const refreshed = await fetchUserNotifications(dbUserId, { force: true, ttlMs: 0 })
        setNotifications(refreshed || [])
      } catch (e) {
        console.error('test-drive respond', e)
        showToast(t('networkErrorShort', 'Network error'), 'error')
      }
    },
    [API_BASE_URL, t],
  )

  const handleNotificationView = useCallback(
    async (notificationId) => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/view`, { method: 'PUT' })
        ensureSuccessfulNotificationResponse(response)
        const dbUserId = localStorage.getItem('userId')
        if (dbUserId && /^\d+$/.test(dbUserId)) {
          const { fetchUserNotifications, invalidateUserNotificationsCache } = await import(
            '../utils/notificationsApi'
          )
          invalidateUserNotificationsCache(dbUserId)
          const refreshed = await fetchUserNotifications(dbUserId, { force: true, ttlMs: 0 })
          setNotifications(refreshed || [])
        }
      } catch (error) {
        console.error('Ошибка при просмотре уведомления:', error)
      }
    },
    [API_BASE_URL],
  )

  const markAllNotificationsRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((notification) => notification.view_count === 0)
      .map((notification) => notification.id)
    if (unreadIds.length === 0) return

    try {
      const responses = await Promise.all(
        unreadIds.map((notificationId) =>
          fetch(`${API_BASE_URL}/notifications/${notificationId}/view`, { method: 'PUT' }),
        ),
      )
      responses.forEach(ensureSuccessfulNotificationResponse)
      setNotifications((previous) =>
        previous.map((notification) =>
          unreadIds.includes(notification.id)
            ? { ...notification, view_count: Math.max(1, Number(notification.view_count) || 0) }
            : notification,
        ),
      )
    } catch (error) {
      console.error('SiteNotifications: mark all read', error)
      showToast({
        type: 'error',
        title: 'Не удалось обновить уведомления',
        message: t('networkErrorShort', 'Проверьте подключение и попробуйте снова.'),
        dedupeKey: 'notifications:mark-all-error',
      })
    }
  }, [API_BASE_URL, notifications, t])

  const goToPropertyListing = useCallback(
    async (notificationId, propertyId) => {
      const { ensureCanOpenProperty } = await import('../utils/propertyAccessGuard')
      if (!ensureCanOpenProperty()) {
        showPropertyAuthRequiredToast(t)
        return
      }
      closePanel()
      await handleNotificationView(notificationId)
      navigate(getPropertyDetailPath(propertyId, { classic: false }))
    },
    [closePanel, handleNotificationView, navigate, t],
  )

  useEffect(() => {
    if (!isOpen) return undefined
    const onDoc = (e) => {
      if (panelRef.current?.contains(e.target)) return
      if (e.target?.closest?.('[data-site-notifications-bell]')) return
      requestClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [isOpen, requestClose])

  useEffect(() => {
    if (!isOpen) return undefined
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
    return undefined
  }, [isOpen])

  const ctxValue = useMemo(
    () => ({
      unreadCount,
      isOpen,
      toggle,
      closePanel,
    }),
    [unreadCount, isOpen, toggle, closePanel],
  )

  return (
    <SiteNotificationsContext.Provider value={ctxValue}>
      {children}
      {visible ? (
        <Suspense fallback={null}>
          <SiteNotificationsPanelLazy
            visible={visible}
            isClosing={isClosing}
            panelRef={panelRef}
            closePanel={closePanel}
            t={t}
            navigate={navigate}
            notifications={notifications}
            notificationsLoading={notificationsLoading}
            unreadCount={unreadCount}
            markAllNotificationsRead={markAllNotificationsRead}
            getNotificationPropertyMeta={getNotificationPropertyMeta}
            respondTestDriveRequest={respondTestDriveRequest}
            handleNotificationView={handleNotificationView}
            goToPropertyListing={goToPropertyListing}
          />
        </Suspense>
      ) : null}
    </SiteNotificationsContext.Provider>
  )
}

export function NotificationsBell({ variant = 'desktop' }) {
  const { t } = useTranslation()
  const { isSignedIn } = useAuth()
  const ctx = useContext(SiteNotificationsContext)
  const { unreadCount = 0, isOpen = false, toggle } = ctx || {}

  const ud = typeof window !== 'undefined' ? getUserData() : null
  const uid = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
  const numericIdOk = uid != null && /^\d+$/.test(String(uid).trim())
  const userReady =
    numericIdOk &&
    !!(ud?.isLoggedIn || isSignedIn === true)

  if (!userReady) return null

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        className="header__action-btn"
        data-site-notifications-bell
        aria-label={t('notifications')}
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation()
          toggle?.()
        }}
      >
        <FiBell size={18} />
        {unreadCount > 0 && <span className="header__action-indicator" />}
      </button>
    )
  }

  return (
    <button
      type="button"
      className="new-header__notification-btn"
      data-site-notifications-bell
      aria-label={t('notifications')}
      aria-expanded={isOpen}
      onClick={(e) => {
        e.stopPropagation()
        toggle?.()
      }}
    >
      <FiBell size={20} />
      {unreadCount > 0 && <span className="new-header__notification-indicator" />}
    </button>
  )
}

export default SiteNotificationsProvider
