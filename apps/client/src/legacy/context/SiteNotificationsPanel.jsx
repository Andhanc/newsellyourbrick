import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FiAlertCircle,
  FiArrowRight,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClipboard,
  FiCreditCard,
  FiHome,
  FiTool,
  FiTrendingUp,
  FiX,
} from 'react-icons/fi'
import {
  BUYER_NOTIFICATION_PERIOD_GROUPS,
  groupBuyerNotifications,
  safeNotificationRoute,
} from '../utils/groupBuyerNotifications'
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

function createdTimeMs(notification) {
  const value = notification?.created_at ?? notification?.createdAt
  const date = value ? new Date(value) : null
  if (!date || !Number.isFinite(date.getTime())) return 0
  return date.getTime()
}

function notificationRelativeTime(notification, t) {
  const created = createdTimeMs(notification)
  if (!created) return ''
  const diffMs = Math.max(0, Date.now() - created)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return t('notificationsTimeJustNow', 'только что')
  if (minutes < 60) return t('notificationsTimeMinutes', { count: minutes, defaultValue: '{{count}} мин' })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('notificationsTimeHours', { count: hours, defaultValue: '{{count}} ч' })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('notificationsTimeDays', { count: days, defaultValue: '{{count}} дн' })
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(created))
}

function notificationNextStep(notification, dataObj) {
  const explicit = dataObj?.next_step ?? dataObj?.nextStep
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim()

  switch (String(notification?.type || '').toLowerCase()) {
    case 'test_drive_request':
      return 'Подтвердите или отклоните даты — покупатель сразу получит ответ.'
    case 'test_drive_survey':
      return 'Пройдите короткий опрос: что понравилось, намерение купить и оценка звёздами.'
    case 'test_drive_result':
    case 'test_drive_approved':
      return 'Откройте бронь и проверьте даты, анкету и инструкции к визиту.'
    case 'test_drive_cancelled':
      return 'Откройте бронирования, чтобы выбрать другой объект или новые даты.'
    case 'buy_now_approved':
      return 'Проверьте покупку и срок следующего платежа в истории.'
    case 'property_reservation_paid':
      return 'Следите за оформлением сделки в профиле — сейчас оплачен только резерв.'
    case 'buy_now_completed':
      return 'Сделка завершена. Теперь объект можно выставить на продажу.'
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

function NotificationIcon({ type, unread }) {
  const key = String(type || '').toLowerCase()
  let Icon = FiBell
  if (/test_drive_survey|test_drive_request/.test(key)) Icon = FiClipboard
  else if (/test_drive|booking|reservation|visit/.test(key)) Icon = FiCalendar
  else if (/bid|auction|outbid/.test(key)) Icon = FiTrendingUp
  else if (/payment|deposit|refund|withdraw|buy_now|transaction/.test(key)) Icon = FiCreditCard
  else if (key === 'verification_success') Icon = FiCheckCircle
  else if (key === 'verification_rejected') Icon = FiAlertCircle
  else if (/property|listing/.test(key)) Icon = FiHome
  else if (/analysis|data|report/.test(key)) Icon = FiBarChart2
  else if (/system|maintenance|update/.test(key)) Icon = FiTool

  return (
    <span className={`notification-item__icon${unread ? ' notification-item__icon--unread' : ''}`} aria-hidden>
      <Icon />
      {unread ? <i className="notification-item__unread-dot" /> : null}
    </span>
  )
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
      <NotificationIcon type={notification.type} unread={unread} />
      <div className="notification-item__body">
        <div className="notification-item__head">
          <h4 className="notification-item__title">
            {unread ? <span className="visually-hidden">Новое уведомление. </span> : null}
            {notification.title || t('notifications')}
          </h4>
          <time className="notification-item__time">{notificationRelativeTime(notification, t)}</time>
        </div>
        {notification.message ? <p className="notification-item__message">{notification.message}</p> : null}
        {nextStep ? (
          <div className="notification-item__next-step">
            <span className="notification-item__next-label">Следующий шаг</span>
            <p className="notification-item__next-copy">{nextStep}</p>
          </div>
        ) : null}

        {notification.type === 'test_drive_request' && dataObj?.booking_id ? (
          <div className="notification-item__actions" onClick={(event) => event.stopPropagation()}>
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
        ) : notification.type === 'test_drive_survey' && (route || dataObj?.survey_token) ? (
          <div className="notification-item__actions" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="notification-item__button"
              onClick={() => {
                openRoute(
                  route ||
                    `/test-drive/survey/${encodeURIComponent(String(dataObj.survey_token))}`,
                )
              }}
            >
              {dataObj?.action_label || t('tdSurvey_openFromNotification', 'Пройти опрос')}
              <FiArrowRight aria-hidden />
            </button>
          </div>
        ) : notification.type === 'test_drive_result' && dataObj?.booking_id != null ? (
          <div className="notification-item__actions" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="notification-item__button"
              onClick={() => openRoute(`/profile/bookings?booking=${dataObj.booking_id}`)}
            >
              {t('goTo')}<FiArrowRight aria-hidden />
            </button>
          </div>
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
          <div className="notification-item__actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="notification-item__button" onClick={() => openRoute('/history')}>
              Открыть покупки<FiArrowRight aria-hidden />
            </button>
          </div>
        ) : route ? (
          <div className="notification-item__actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="notification-item__button" onClick={() => openRoute(route)}>
              {dataObj?.action_label || t('goTo')}<FiArrowRight aria-hidden />
            </button>
          </div>
        ) : unread ? (
          <div className="notification-item__actions" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="notification-item__mark-read"
              onClick={() => handleNotificationView(notification.id)}
            >
              Отметить прочитанным
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function pickDefaultPeriod(groups) {
  const withItems = groups.find((group) => group.items.length > 0)
  return withItems?.key || 'today'
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
  const groups = groupBuyerNotifications(notifications)
  const [activePeriod, setActivePeriod] = useState(() => pickDefaultPeriod(groups))

  useEffect(() => {
    if (!visible) return
    setActivePeriod(pickDefaultPeriod(groupBuyerNotifications(notifications)))
    // Reset period only when the drawer opens, not on every list refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only reset
  }, [visible])

  if (!visible || typeof document === 'undefined') return null

  const activeGroup = groups.find((group) => group.key === activePeriod) || groups[0]
  const activeItems = activeGroup?.items || []
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
            <div className="notification-panel__title-row">
              <h2 id="notification-panel-title" className="notification-panel__title">{t('notifications')}</h2>
              {unreadCount > 0 ? (
                <span className="notification-panel__unread">
                  {t('notificationsNewCount', { count: unreadCount, defaultValue: '{{count}} новых' })}
                </span>
              ) : null}
            </div>
            {unreadCount > 0 ? (
              <button type="button" className="notification-panel__mark-all" onClick={markAllNotificationsRead}>
                <FiCheck aria-hidden />{t('notificationsMarkAllRead', 'Отметить всё прочитанным')}
              </button>
            ) : null}
          </div>
          <button type="button" className="notification-panel__close" onClick={closePanel} aria-label={t('closeNotifications')}>
            <FiX aria-hidden />
          </button>
        </header>

        <div className="notification-panel__tabs" role="tablist" aria-label={t('notifications')}>
          {BUYER_NOTIFICATION_PERIOD_GROUPS.map((period) => {
            const group = groups.find((entry) => entry.key === period.key)
            const count = group?.items.length || 0
            const selected = activePeriod === period.key
            return (
              <button
                key={period.key}
                type="button"
                role="tab"
                id={`notification-tab-${period.key}`}
                aria-selected={selected}
                aria-controls="notification-panel-tabpanel"
                className={`notification-panel__tab${selected ? ' notification-panel__tab--active' : ''}`}
                onClick={() => setActivePeriod(period.key)}
              >
                <span>{t(period.labelKey, period.label)}</span>
                {count > 0 ? <em>{count}</em> : null}
              </button>
            )
          })}
        </div>

        <div
          className="notification-panel__list"
          id="notification-panel-tabpanel"
          role="tabpanel"
          aria-labelledby={`notification-tab-${activePeriod}`}
        >
          {notificationsLoading ? (
            <div className="notification-panel__skeleton" role="status" aria-label={t('loading')}>
              <span /><span /><span />
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-panel__empty">
              <span className="notification-panel__empty-icon"><FiBell aria-hidden /></span>
              <h3>{t('notificationsEmptyTitle', 'Здесь пока спокойно')}</h3>
              <p>{t('notificationsEmptyDesc', 'Важные шаги по сделке появятся здесь — ставки, бронирования, оплаты и документы.')}</p>
            </div>
          ) : activeItems.length === 0 ? (
            <div className="notification-panel__empty notification-panel__empty--compact">
              <h3>{t('notificationsPeriodEmptyTitle', 'Нет событий за этот период')}</h3>
              <p>{t('notificationsPeriodEmptyDesc', 'Переключите вкладку — возможно, есть уведомления раньше.')}</p>
            </div>
          ) : (
            <section className="notification-panel__group" aria-labelledby={`notification-tab-${activePeriod}`}>
              <div className="notification-panel__group-items">
                {activeItems.map((notification) => (
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
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}
