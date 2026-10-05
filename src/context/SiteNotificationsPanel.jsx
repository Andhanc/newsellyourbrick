import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  assignSheetPanelRef,
  sheetHandleDragProps,
  useBottomSheetDrag,
} from '../hooks/useBottomSheetDrag'
import {
  FiArrowRight,
  FiBell,
  FiCheck,
  FiX,
} from 'react-icons/fi'
import {
  sortBuyerNotifications,
  safeNotificationRoute,
} from '../utils/groupBuyerNotifications'
import {
  formatBuyerNotificationMessage,
} from '../utils/formatBuyerNotificationMessage'
import {
  getBuyerNotificationTitle,
  localizeNotificationLocation,
} from '../utils/localizeBuyerNotification'
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

function notificationRelativeTime(notification, t, locale) {
  const created = createdTimeMs(notification)
  if (!created) return ''
  const diffMs = Math.max(0, Date.now() - created)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return t('notificationsTimeJustNow', { defaultValue: 'just now' })
  if (minutes < 60) {
    return t('notificationsTimeMinutes', { count: minutes, defaultValue: '{{count}}m ago' })
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return t('notificationsTimeHours', { count: hours, defaultValue: '{{count}}h ago' })
  }
  const days = Math.floor(hours / 24)
  if (days < 7) {
    return t('notificationsTimeDays', { count: days, defaultValue: '{{count}}d ago' })
  }
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      day: 'numeric',
      month: 'short',
    }).format(new Date(created))
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
    }).format(new Date(created))
  }
}

function notificationNextStep(notification, dataObj, t) {
  const explicit = dataObj?.next_step ?? dataObj?.nextStep
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim()

  switch (String(notification?.type || '').toLowerCase()) {
    case 'test_drive_request':
      return t('notificationsNext_testDriveRequest', {
        defaultValue: 'Confirm or decline the dates — the buyer will get a reply right away.',
      })
    case 'test_drive_survey':
      return t('notificationsNext_testDriveSurvey', {
        defaultValue: 'Take a short survey: what you liked, purchase intent, and a star rating.',
      })
    case 'test_drive_result':
    case 'test_drive_approved':
      return t('notificationsNext_testDriveApproved', {
        defaultValue: 'Open the booking to check dates, the form, and visit instructions.',
      })
    case 'test_drive_cancelled':
      return t('notificationsNext_testDriveCancelled', {
        defaultValue: 'Open bookings to choose another property or new dates.',
      })
    case 'buy_now_approved':
      return t('notificationsNext_buyNowApproved', {
        defaultValue: 'Check the purchase and the next payment deadline in your history.',
      })
    case 'property_reservation_paid':
      return t('notificationsNext_reservationPaid', {
        defaultValue: 'Follow the deal in your profile — only the reservation is paid so far.',
      })
    case 'buy_now_completed':
      return t('notificationsNext_buyNowCompleted', {
        defaultValue: 'The deal is complete. You can now list the property for sale.',
      })
    case 'outbid':
    case 'bid_outbid':
      return t('notificationsOutbidNextStep', {
        defaultValue: 'Open the listing and decide whether to raise your bid before the auction ends.',
      })
    case 'payment_deadline':
      return t('notificationsNext_paymentDeadline', {
        defaultValue: 'Pay the deposit on time to keep your purchase right.',
      })
    case 'auction_won':
      return t('notificationsNext_auctionWon', {
        defaultValue: 'Open the listing and complete the deposit payment.',
      })
    case 'payment_succeeded':
    case 'deposit_paid':
      return t('notificationsNext_depositPaid', {
        defaultValue: 'Funds are credited. Check which deal step is available now.',
      })
    case 'no_bids_45_days':
      return t('notificationsNext_noBids45Days', {
        defaultValue: 'Open the listing in your seller cabinet and lower the price if needed.',
      })
    case 'property_approved': {
      const isEdit =
        dataObj?.approval_kind === 'edit' ||
        dataObj?.is_edit === true ||
        /изменения в (?:объекте|объявлении)|changes (?:to|in)|modifications? (?:to|in)|Änderungen|cambios (?:en|del)|zmiany|ändringar/i.test(
          `${notification?.title || ''} ${notification?.message || ''}`,
        )
      if (isEdit) {
        return t('notificationsNext_propertyEditApproved', {
          defaultValue: 'Open the listing to review the applied changes.',
        })
      }
      return t('notificationsNext_propertyApproved', {
        defaultValue: 'Open the published listing and check how it looks to buyers.',
      })
    }
    case 'property_rejected':
      return t('notificationsNext_propertyRejected', {
        defaultValue: 'Check the reason and resubmit the listing after fixes.',
      })
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
  const { i18n } = useTranslation()
  const locale = i18n?.language || 'en'
  const propertyMeta = getNotificationPropertyMeta(notification)
  const dataObj = parseNotificationData(notification?.data)
  const propertyThumbSrc = getNotificationThumbSrc(propertyMeta.image)
  const route = safeNotificationRoute(
    dataObj?.action_path ?? dataObj?.route ?? dataObj?.url ?? notification?.action_path,
  )
  const unread = Number(notification.view_count) <= 0 || !Number.isFinite(Number(notification.view_count))
  const nextStep = notificationNextStep(notification, dataObj, t)
  const type = String(notification?.type || '').toLowerCase()
  const isOutbid = type === 'bid_outbid' || type === 'outbid'
  const hasPropertyCard = propertyMeta.id != null
  const displayTitle = getBuyerNotificationTitle(notification, t)
  const displayLocation = localizeNotificationLocation(
    propertyMeta.location,
    t,
    locale,
  )
  const displayMessage = formatBuyerNotificationMessage({
    notification,
    data: dataObj,
    propertyName: propertyMeta.name,
    hasPropertyCard,
    locale,
    t,
  })

  const openRoute = (target) => {
    closePanel()
    handleNotificationView(notification.id)
    navigate(target)
  }

  return (
    <article
      className={`notification-item ${getNotificationItemClass(notification)}${unread ? ' notification-item--unread' : ''}${
        isOutbid ? ' notification-item--outbid' : ''
      }`}
      onClick={() => {
        if (notification.type !== 'test_drive_request' && unread) handleNotificationView(notification.id)
      }}
    >
      {unread ? (
        <button
          type="button"
          className="notification-item__dismiss"
          aria-label={t('notificationsMarkRead', 'Отметить прочитанным')}
          onClick={(event) => {
            event.stopPropagation()
            handleNotificationView(notification.id)
          }}
        >
          <FiX aria-hidden />
        </button>
      ) : null}
      <span className={`notification-item__dot${unread ? ' is-unread' : ''}`} aria-hidden />
      <div className="notification-item__body">
        <div className="notification-item__head">
          <h4 className="notification-item__title">
            {unread ? <span className="visually-hidden">{t('notificationsNewHidden', 'New notification. ')}</span> : null}
            {displayTitle}
          </h4>
          <time className="notification-item__time">{notificationRelativeTime(notification, t, locale)}</time>
        </div>
        {displayMessage ? (
          <p
            className={`notification-item__message${
              isOutbid && hasPropertyCard ? ' notification-item__message--fact' : ''
            }`}
          >
            {displayMessage}
          </p>
        ) : null}
        {nextStep ? (
          <div className="notification-item__next-step">
            <span className="notification-item__next-label">{t('notificationsNextStep', 'Что сделать')}</span>
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
              onClick={() => openRoute(`/profile?bookings=1&booking=${dataObj.booking_id}`)}
            >
              {t('goTo')}<FiArrowRight aria-hidden />
            </button>
          </div>
        ) : hasPropertyCard ? (
          isOutbid ? (
            <button
              type="button"
              className="notification-item__property notification-item__property--compact"
              onClick={(event) => {
                event.stopPropagation()
                goToPropertyListing(notification.id, propertyMeta.id)
              }}
            >
              <span className="notification-item__image">
                <img
                  src={propertyThumbSrc}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.onerror = null
                    event.currentTarget.src = LIST_FALLBACK_IMG
                  }}
                />
              </span>
              <span className="notification-item__property-location">
                {displayLocation || propertyMeta.name}
              </span>
              <FiArrowRight className="notification-item__property-chevron" aria-hidden />
              <span className="visually-hidden">{t('notificationsOutbidCta', 'К торгам')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="notification-item__property notification-item__property--linked"
              onClick={(event) => {
                event.stopPropagation()
                goToPropertyListing(notification.id, propertyMeta.id)
              }}
            >
              <span className="notification-item__image">
                <img
                  src={propertyThumbSrc}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.onerror = null
                    event.currentTarget.src = LIST_FALLBACK_IMG
                  }}
                />
              </span>
              <span className="notification-item__info">
                <span className="notification-item__property-name">{propertyMeta.name}</span>
                {displayLocation ? (
                  <span className="notification-item__property-location">{displayLocation}</span>
                ) : null}
              </span>
              <span className="notification-item__property-arrow" aria-hidden="true">
                <FiArrowRight />
              </span>
            </button>
          )
        ) : notification.type === 'buy_now_approved' ? (
          <div className="notification-item__actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="notification-item__button" onClick={() => openRoute('/profile?history=1')}>
              {t('notificationsOpenPurchases', { defaultValue: 'Open purchases' })}
              <FiArrowRight aria-hidden />
            </button>
          </div>
        ) : route ? (
          <div className="notification-item__actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="notification-item__button" onClick={() => openRoute(route)}>
              {dataObj?.action_label || t('goTo')}<FiArrowRight aria-hidden />
            </button>
          </div>
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
  getNotificationPropertyMeta,
  respondTestDriveRequest,
  handleNotificationView,
  goToPropertyListing,
}) {
  const sortedNotifications = sortBuyerNotifications(notifications)
  const sheetDrag = useBottomSheetDrag({
    isOpen: visible && !isClosing,
    visible,
    isClosing,
    requestClose: closePanel,
    dismissOnly: true,
  })
  const setPanelRef = (node) => assignSheetPanelRef(sheetDrag.panelRef, panelRef)(node)

  if (!visible || typeof document === 'undefined') return null

  const closingPanel = isClosing ? ' notification-panel--closing' : ''
  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''

  return createPortal(
    <div className="notification-layer">
      <div role="presentation" className={`notification-backdrop${closingBackdrop}`} onClick={closePanel} />
      <section
        className={`notification-panel${closingPanel}`}
        ref={setPanelRef}
        style={sheetDrag.panelDragStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-panel-title"
      >
        <div className="notification-panel__handle" aria-hidden {...sheetHandleDragProps(sheetDrag)}>
          <span />
        </div>
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
          </div>
        </header>

        <div className="notification-panel__list">
          {notificationsLoading ? (
            <div className="notification-panel__skeleton" role="status" aria-label={t('loading')}>
              <span /><span /><span />
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="notification-panel__empty">
              <span className="notification-panel__empty-icon"><FiBell aria-hidden /></span>
              <h3>{t('notificationsEmptyTitle', 'Пока нет уведомлений')}</h3>
              <p>{t('notificationsEmptyDesc', 'Здесь появятся ставки, бронирования, оплаты и важные шаги по сделке.')}</p>
            </div>
          ) : (
            <section className="notification-panel__group" aria-label={t('notifications')}>
              <div className="notification-panel__group-items">
                {sortedNotifications.map((notification) => (
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
