import { createPortal } from 'react-dom'
import { FiArrowRight, FiBell, FiCheck, FiClock, FiX } from 'react-icons/fi'
import { groupBuyerNotifications, safeNotificationRoute } from '../utils/groupBuyerNotifications'
import { getNotificationItemClass } from '../utils/notificationItemClass'
import './SiteNotificationsPanel.css'

const LIST_FALLBACK_IMG =
  '/images/external/photo-1560448204-e02f11c3d0e2-1ff5809f2f.jpg'

function getNotificationThumbSrc(image) {
  if (!image || typeof image !== 'string') return LIST_FALLBACK_IMG
  const trimmed = image.trim()
  if (!trimmed) return LIST_FALLBACK_IMG
  if (trimmed.startsWith('/api/uploads/')) return trimmed.replace(/^\/api/, '')
  return trimmed
}

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

function notificationTime(notification) {
  const value = notification?.created_at ?? notification?.createdAt
  const date = value ? new Date(value) : null
  if (!date || !Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function notificationNextStep(notification, dataObj) {
  const explicit = dataObj?.next_step ?? dataObj?.nextStep
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim()

  switch (String(notification?.type || '').toLowerCase()) {
    case 'test_drive_request':
      return 'Подтвердите или отклоните даты — покупатель сразу получит ответ.'
    case 'test_drive_result':
    case 'test_drive_approved':
      return 'Откройте бронь и проверьте даты, анкету и инструкции к визиту.'
    case 'test_drive_cancelled':
      return 'Откройте бронирования, чтобы выбрать другой объект или новые даты.'
    case 'buy_now_approved':
      return 'Проверьте покупку и срок следующего платежа в истории.'
    case 'outbid':
    case 'bid_outbid':
      return 'Откройте объект и решите, повышать ли ставку до завершения торгов.'
    case 'payment_succeeded':
    case 'deposit_paid':
      return 'Средства зачислены. Проверьте, какой шаг сделки теперь доступен.'
    default:
      return null
  }
}

function NotificationItem({
  notification,
  t,
  navigate,
  closePanel,
  getNotificationPropertyMeta,
  respondTestDriveRequest,
  handleNotificationView,
  goToPropertyListing,
}) {
  const propertyMeta = getNotificationPropertyMeta(notification)
  const dataObj = parseNotificationData(notification?.data)
  const propertyThumbSrc = getNotificationThumbSrc(propertyMeta.image)
  const route = safeNotificationRoute(
    dataObj?.action_path ?? dataObj?.route ?? dataObj?.url ?? notification?.action_path,
  )
  const unread = notification.view_count === 0
  const nextStep = notificationNextStep(notification, dataObj)

  const openRoute = (target) => {
    closePanel()
    handleNotificationView(notification.id)
    navigate(target)
  }

  return (
    <article
      className={`notification-item ${getNotificationItemClass(notification)}${unread ? ' notification-item--unread' : ''}`}
      onClick={() => {
        if (notification.type !== 'test_drive_request' && unread) handleNotificationView(notification.id)
      }}
    >
      <div className="notification-item__meta">
        {unread ? <span className="notification-item__unread-dot" aria-label="Новое уведомление" /> : null}
        <time className="notification-item__time"><FiClock aria-hidden />{notificationTime(notification)}</time>
      </div>
      <div className="notification-item__content">
        <h4 className="notification-item__title">{notification.title || t('notifications')}</h4>
        {notification.message ? <p className="notification-item__message">{notification.message}</p> : null}
        {nextStep ? (
          <p className="notification-item__next-step"><span>Следующий шаг</span>{nextStep}</p>
        ) : null}

        {notification.type === 'test_drive_request' && dataObj?.booking_id ? (
          <div className="notification-item__test-drive-actions" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="notification-item__button notification-item__button--approve"
              onClick={() => respondTestDriveRequest(notification, 'approve')}
            >
              <FiCheck aria-hidden />{t('approve', 'Подтвердить')}
            </button>
            <button
              type="button"
              className="notification-item__button notification-item__button--secondary"
              onClick={() => respondTestDriveRequest(notification, 'reject')}
            >
              {t('reject', 'Отклонить')}
            </button>
          </div>
        ) : notification.type === 'test_drive_result' && dataObj?.booking_id != null ? (
          <button
            type="button"
            className="notification-item__button"
            onClick={(event) => {
              event.stopPropagation()
              openRoute(`/profile/bookings?booking=${dataObj.booking_id}`)
            }}
          >
            {t('goTo')}<FiArrowRight aria-hidden />
          </button>
        ) : propertyMeta.id != null ? (
          <div className="notification-item__property">
            <div className="notification-item__image">
              <img
                src={propertyThumbSrc}
                alt={propertyMeta.name || 'Property'}
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.onerror = null
                  event.currentTarget.src = LIST_FALLBACK_IMG
                }}
              />
            </div>
            <div className="notification-item__info">
              <p className="notification-item__property-name">{propertyMeta.name}</p>
              {propertyMeta.location ? <p className="notification-item__property-location">{propertyMeta.location}</p> : null}
              <button
                type="button"
                className="notification-item__button"
                onClick={(event) => {
                  event.stopPropagation()
                  goToPropertyListing(notification.id, propertyMeta.id)
                }}
              >
                {t('goTo')}<FiArrowRight aria-hidden />
              </button>
            </div>
          </div>
        ) : notification.type === 'buy_now_approved' ? (
          <button type="button" className="notification-item__button" onClick={() => openRoute('/history')}>
            Открыть покупки<FiArrowRight aria-hidden />
          </button>
        ) : route ? (
          <button type="button" className="notification-item__button" onClick={() => openRoute(route)}>
            {dataObj?.action_label || t('goTo')}<FiArrowRight aria-hidden />
          </button>
        ) : unread ? (
          <button
            type="button"
            className="notification-item__mark-read"
            onClick={(event) => {
              event.stopPropagation()
              handleNotificationView(notification.id)
            }}
          >
            Отметить прочитанным
          </button>
        ) : null}
      </div>
    </article>
  )
}

export default function SiteNotificationsPanel({
  visible,
  isClosing,
  panelRef,
  closePanel,
  t,
  navigate,
  notifications,
  notificationsLoading,
  unreadCount,
  markAllNotificationsRead,
  getNotificationPropertyMeta,
  respondTestDriveRequest,
  handleNotificationView,
  goToPropertyListing,
}) {
  if (!visible || typeof document === 'undefined') return null

  const groups = groupBuyerNotifications(notifications)
  const closingPanel = isClosing ? ' notification-panel--closing' : ''
  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''

  return createPortal(
    <div className="notification-layer">
      <div role="presentation" className={`notification-backdrop${closingBackdrop}`} onClick={closePanel} />
      <section
        className={`notification-panel${closingPanel}`}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-panel-title"
      >
        <div className="notification-panel__handle" aria-hidden><span /></div>
        <header className="notification-panel__header">
          <div className="notification-panel__heading">
            <span className="notification-panel__eyebrow"><FiBell aria-hidden />Центр событий</span>
            <div className="notification-panel__title-row">
              <h2 id="notification-panel-title" className="notification-panel__title">{t('notifications')}</h2>
              {unreadCount > 0 ? <span className="notification-panel__unread">{unreadCount} новых</span> : null}
            </div>
          </div>
          <button type="button" className="notification-panel__close" onClick={closePanel} aria-label={t('closeNotifications')}>
            <FiX aria-hidden />
          </button>
        </header>

        {unreadCount > 0 ? (
          <button type="button" className="notification-panel__mark-all" onClick={markAllNotificationsRead}>
            <FiCheck aria-hidden />Отметить всё прочитанным
          </button>
        ) : null}

        <div className="notification-panel__list">
          {notificationsLoading ? (
            <div className="notification-panel__skeleton" role="status" aria-label={t('loading')}>
              <span /><span /><span />
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-panel__empty">
              <span className="notification-panel__empty-icon"><FiBell aria-hidden /></span>
              <h3>Здесь пока спокойно</h3>
              <p>Важные шаги по сделке появятся здесь — ставки, бронирования, оплаты и документы.</p>
            </div>
          ) : (
            groups.map((group) => (
              <section className="notification-panel__group" key={group.key} aria-labelledby={`notification-group-${group.key}`}>
                <div className="notification-panel__group-head">
                  <h3 id={`notification-group-${group.key}`}>{group.label}</h3>
                  <span>{group.items.length}</span>
                </div>
                <div className="notification-panel__group-items">
                  {group.items.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      t={t}
                      navigate={navigate}
                      closePanel={closePanel}
                      getNotificationPropertyMeta={getNotificationPropertyMeta}
                      respondTestDriveRequest={respondTestDriveRequest}
                      handleNotificationView={handleNotificationView}
                      goToPropertyListing={goToPropertyListing}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}
