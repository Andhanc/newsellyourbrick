import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@clerk/clerk-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FiArrowRight, FiBell, FiX } from 'react-icons/fi'
import '../pages/MainPage.css'
import {
  fetchUserNotifications,
  invalidateUserNotificationsCache,
} from '../utils/notificationsApi'
import { getNotificationItemClass } from '../utils/notificationItemClass'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { getPropertyCardImage } from '../utils/propertyImage'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { getUserData } from '../services/authService'
import { showToast } from '../components/ToastContainer'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'

const SiteNotificationsContext = createContext(null)

const LIST_FALLBACK_IMG =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=80'

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
      {t('toastOpenListingLoginPrefix', 'Чтобы открыть страницу объекта, войдите в систему.')}{' '}
      <button
        type="button"
        className="auth-toast-link"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          requestOpenLoginModal({ wizard: true })
        }}
      >
        {t('toastOpenListingLoginLink', 'Войти / Регистрация')}{' '}
        <span className="auth-toast-link__arrow">→</span>
      </button>
    </span>,
    'warning',
    7000
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
    [notifications]
  )

  const API_BASE_URL = getApiBaseUrlSync()

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  const closePanel = requestClose

  const getNotificationPropertyMeta = useCallback(
    (notification) => {
      const payload = parseNotificationData(notification?.data)
      const propertyId =
        payload?.property_id != null ? Number(payload.property_id) : null
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
    [notificationProperties, t]
  )

  useEffect(() => {
    const loadNotifications = async (options = {}) => {
      const { force = false } = options
      const dbUserId = await resolveDbUserIdFromSession(API_BASE_URL)
      if (!dbUserId) return

      setNotificationsLoading(true)
      try {
        const notificationsList = await fetchUserNotifications(dbUserId, {
          ttlMs: force ? 0 : 15000,
          force,
        })
        const currentNotificationIds = new Set(notificationsList.map((n) => n.id))
        if (!isFirstNotificationsLoadRef.current) {
          const newBidOutbidNotifications = notificationsList.filter(
            (n) =>
              n.type === 'bid_outbid' &&
              !previousNotificationIds.current.has(n.id) &&
              n.view_count === 0
          )
          if (newBidOutbidNotifications.length > 0) {
            newBidOutbidNotifications.forEach((notif) => {
              const message =
                notif.message || notif.title || 'Вашу ставку перебили!'
              showToast(message, 'warning', 5000)
            })
          }
          const newTestDriveResult = notificationsList.filter(
            (n) =>
              n.type === 'test_drive_result' &&
              !previousNotificationIds.current.has(n.id) &&
              n.view_count === 0
          )
          if (newTestDriveResult.length > 0) {
            newTestDriveResult.forEach((notif) => {
              const message =
                notif.message ||
                notif.title ||
                t('toastTestDriveUpdate', 'Обновление по тест-драйву')
              showToast(
                message,
                notif.title?.includes('отклон') ? 'warning' : 'success',
                6000
              )
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
        setNotificationsLoading(false)
      }
    }

    loadNotifications()

    const onFocus = () => loadNotifications()
    const handleSse = () => loadNotifications({ force: true })

    window.addEventListener('focus', onFocus)
    window.addEventListener('owner-notifications-refresh', handleSse)
    window.addEventListener('verification-status-update', handleSse)
    const pollId = setInterval(() => {
      if (document.visibilityState === 'visible') loadNotifications()
    }, 120000)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('owner-notifications-refresh', handleSse)
      window.removeEventListener('verification-status-update', handleSse)
      clearInterval(pollId)
    }
  }, [API_BASE_URL, t])

  useEffect(() => {
    const lang = i18n.language || 'ru'
    const ids = Array.from(
      new Set(
        notifications
          .map((n) => {
            const payload = parseNotificationData(n?.data)
            const id = payload?.property_id
            return id != null ? Number(id) : null
          })
          .filter((id) => Number.isFinite(id))
      )
    )

    ids.forEach((propertyId) => {
      const dedupeKey = `${propertyId}:${lang}`
      if (propertyMetaLoadedKeysRef.current.has(dedupeKey)) return
      if (propertyMetaInflightRef.current.has(dedupeKey)) return
      propertyMetaInflightRef.current.add(dedupeKey)

      ;(async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/properties/${propertyId}?lang=${encodeURIComponent(lang)}`
          )
          if (!response.ok) return
          const json = await response.json().catch(() => null)
          const data = json?.data
          if (!data?.id) return
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
          /* ignore */
        } finally {
          propertyMetaInflightRef.current.delete(dedupeKey)
        }
      })()
    })
  }, [notifications, i18n.language, API_BASE_URL])

  const respondTestDriveRequest = useCallback(
    async (notification, action) => {
      const payload = parseNotificationData(notification?.data)
      if (!payload?.booking_id) {
        showToast('Не удалось прочитать заявку. Обновите страницу.', 'error')
        return
      }
      const storedDbId = localStorage.getItem('userId')
      const dbUserId =
        storedDbId && /^\d+$/.test(String(storedDbId).trim())
          ? String(storedDbId).trim()
          : null
      if (!dbUserId) {
        requestOpenLoginModal({ wizard: true })
        return
      }
      try {
        let ownerComment = ''
        if (action === 'approve') {
          ownerComment =
            window.prompt(
              'Добавьте комментарий для покупателя: время заезда, получение ключей и т.д.'
            ) || ''
          if (!ownerComment.trim()) {
            showToast('Комментарий обязателен при подтверждении', 'warning')
            return
          }
        }
        const res = await fetch(
          `${API_BASE_URL}/test-drive-bookings/${payload.booking_id}/respond`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: parseInt(dbUserId, 10),
              action,
              owner_comment:
                action === 'approve' ? ownerComment : undefined,
            }),
          }
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.success) {
          showToast(json.error || 'Не удалось выполнить действие', 'error')
          return
        }
        showToast(
          action === 'approve'
            ? 'Тест-драйв подтверждён'
            : 'Заявка отклонена',
          'success',
          4000
        )
        invalidateUserNotificationsCache(dbUserId)
        const refreshed = await fetchUserNotifications(dbUserId, {
          force: true,
          ttlMs: 0,
        })
        setNotifications(refreshed || [])
      } catch (e) {
        console.error('test-drive respond', e)
        showToast('Ошибка сети', 'error')
      }
    },
    [API_BASE_URL]
  )

  const handleNotificationView = useCallback(
    async (notificationId) => {
      try {
        await fetch(`${API_BASE_URL}/notifications/${notificationId}/view`, {
          method: 'PUT',
        })
        const dbUserId = localStorage.getItem('userId')
        if (dbUserId && /^\d+$/.test(dbUserId)) {
          invalidateUserNotificationsCache(dbUserId)
        }
        if (dbUserId && /^\d+$/.test(dbUserId)) {
          const refreshed = await fetchUserNotifications(dbUserId, {
            force: true,
            ttlMs: 0,
          })
          setNotifications(refreshed || [])
        }
      } catch (error) {
        console.error('Ошибка при просмотре уведомления:', error)
      }
    },
    [API_BASE_URL]
  )

  const goToPropertyListing = useCallback(
    async (notificationId, propertyId) => {
      if (!ensureCanOpenProperty()) {
        showPropertyAuthRequiredToast(t)
        return
      }
      closePanel()
      await handleNotificationView(notificationId)
      navigate(getPropertyDetailPath(propertyId, { classic: false }))
    },
    [closePanel, handleNotificationView, navigate, t]
  )

  useEffect(() => {
    if (!isOpen) return
    const onDoc = (e) => {
      if (panelRef.current?.contains(e.target)) return
      if (e.target?.closest?.('[data-site-notifications-bell]')) return
      requestClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [isOpen, requestClose])

  useEffect(() => {
    if (!isOpen) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches
    ) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isOpen])

  const ctxValue = useMemo(
    () => ({
      unreadCount,
      isOpen,
      toggle,
      closePanel,
    }),
    [unreadCount, isOpen, toggle, closePanel]
  )

  const closingTop = isClosing ? ' drawer-dismiss-from-top--closing' : ''
  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''

  const portal =
    visible &&
    typeof document !== 'undefined' &&
    createPortal(
      <>
        <div
          role="presentation"
          className={`notification-backdrop${closingBackdrop}`}
          onClick={closePanel}
        />
        <div className={`notification-panel${closingTop}`} ref={panelRef}>
          <div className="notification-panel__content">
            <div className="notification-panel__header">
              <h3 className="notification-panel__title">{t('notifications')}</h3>
              <button
                type="button"
                className="notification-panel__close"
                onClick={closePanel}
                aria-label={t('closeNotifications')}
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="notification-panel__list">
              {notificationsLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  {t('loading')}
                </div>
              ) : notifications.length === 0 ? (
                <div
                  style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}
                >
                  {t('noNotifications')}
                </div>
              ) : (
                notifications.map((notification) => {
                  const propertyMeta = getNotificationPropertyMeta(notification)
                  const dataObj = parseNotificationData(notification?.data)
                  const propertyImageProps = buildResponsiveImageProps(propertyMeta.image, {
                    widths: [120, 180, 240],
                    sizes: '72px',
                    fit: 'cover',
                    quality: 70,
                    format: 'webp',
                  })

                  return (
                    <div
                      key={notification.id}
                      className={`notification-item ${getNotificationItemClass(notification)}`}
                      role="presentation"
                      onClick={() => {
                        if (notification.type === 'test_drive_request') return
                        handleNotificationView(notification.id)
                      }}
                    >
                      <div className="notification-item__content">
                        <h4 className="notification-item__title">{notification.title}</h4>
                        {notification.message && (
                          <p className="notification-item__message">
                            {notification.message}
                          </p>
                        )}
                        {notification.type === 'test_drive_request' &&
                        dataObj?.booking_id ? (
                          <div
                            className="notification-item__test-drive-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="notification-item__button notification-item__button--approve"
                              onClick={() =>
                                respondTestDriveRequest(notification, 'approve')
                              }
                            >
                              Подтвердить
                            </button>
                            <button
                              type="button"
                              className="notification-item__button notification-item__button--reject"
                              onClick={() =>
                                respondTestDriveRequest(notification, 'reject')
                              }
                            >
                              Отклонить
                            </button>
                          </div>
                        ) : notification.type === 'test_drive_result' &&
                          dataObj?.booking_id != null ? (
                          <div
                            className="notification-item__test-drive-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="notification-item__button"
                              onClick={(e) => {
                                e.stopPropagation()
                                closePanel()
                                handleNotificationView(notification.id)
                                const bid = dataObj.booking_id
                                navigate(
                                  `/profile/bookings${
                                    bid != null ? `?booking=${bid}` : ''
                                  }`
                                )
                              }}
                            >
                              {t('goTo')}
                              <FiArrowRight size={18} />
                            </button>
                          </div>
                        ) : propertyMeta.id != null ? (
                          <div className="notification-item__property">
                            <div className="notification-item__image">
                              <img
                                {...propertyImageProps}
                                alt={propertyMeta.name || 'Property'}
                                onError={(e) => {
                                  e.target.src = LIST_FALLBACK_IMG
                                }}
                              />
                            </div>
                            <div className="notification-item__info">
                              <p className="notification-item__property-name">
                                {propertyMeta.name}
                              </p>
                              <p className="notification-item__property-location">
                                {propertyMeta.location || ' '}
                              </p>
                              <button
                                type="button"
                                className="notification-item__button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  goToPropertyListing(
                                    notification.id,
                                    propertyMeta.id
                                  )
                                }}
                              >
                                {t('goTo')}
                                <FiArrowRight size={18} />
                              </button>
                            </div>
                          </div>
                        ) : notification.type === 'buy_now_approved' ? (
                          <div className="notification-item__property">
                            <div className="notification-item__info">
                              <button
                                type="button"
                                className="notification-item__button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  closePanel()
                                  handleNotificationView(notification.id)
                                  navigate('/history')
                                }}
                              >
                                {t('goTo')}
                                <FiArrowRight size={18} />
                              </button>
                            </div>
                          </div>
                        ) : null}
                        {!dataObj && (
                          <button
                            type="button"
                            className="notification-item__button"
                            onClick={(e) => {
                              e.stopPropagation()
                              closePanel()
                            }}
                          >
                            Закрыть
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="notification-panel__sheet-handle" aria-hidden="true">
              <span className="notification-panel__sheet-pill" />
            </div>
          </div>
        </div>
      </>,
      document.body
    )

  return (
    <SiteNotificationsContext.Provider value={ctxValue}>
      {children}
      {portal}
    </SiteNotificationsContext.Provider>
  )
}

export function NotificationsBell({ variant = 'desktop' }) {
  const { isSignedIn } = useAuth()
  const ctx = useContext(SiteNotificationsContext)
  const { unreadCount = 0, isOpen = false, toggle } = ctx || {}

  const ud = typeof window !== 'undefined' ? getUserData() : null
  const uid = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
  const numericIdOk = uid != null && /^\d+$/.test(String(uid).trim())
  const userReady =
    numericIdOk &&
    !!(ud?.isLoggedIn ||
      // Clerk-сессия до синхронизации userData из БД — как в Header
      isSignedIn === true)

  if (!userReady) return null

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        className="header__action-btn"
        data-site-notifications-bell
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
