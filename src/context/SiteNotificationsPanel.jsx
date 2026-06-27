import { createPortal } from 'react-dom'
import { FiArrowRight, FiX } from 'react-icons/fi'
import { getNotificationItemClass } from '../utils/notificationItemClass'
import { buildResponsiveImageProps } from '../utils/responsiveImage'

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

export default function SiteNotificationsPanel({
  visible,
  isClosing,
  panelRef,
  closePanel,
  t,
  navigate,
  notifications,
  notificationsLoading,
  getNotificationPropertyMeta,
  respondTestDriveRequest,
  handleNotificationView,
  goToPropertyListing,
}) {
  if (!visible || typeof document === 'undefined') return null

  const closingTop = isClosing ? ' drawer-dismiss-from-top--closing' : ''
  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''

  return createPortal(
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
              <div style={{ padding: '20px', textAlign: 'center' }}>{t('loading')}</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
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
                        <p className="notification-item__message">{notification.message}</p>
                      )}
                      {notification.type === 'test_drive_request' && dataObj?.booking_id ? (
                        <div
                          className="notification-item__test-drive-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="notification-item__button notification-item__button--approve"
                            onClick={() => respondTestDriveRequest(notification, 'approve')}
                          >
                            {t('approve', 'Approve')}
                          </button>
                          <button
                            type="button"
                            className="notification-item__button notification-item__button--reject"
                            onClick={() => respondTestDriveRequest(notification, 'reject')}
                          >
                            {t('reject', 'Reject')}
                          </button>
                        </div>
                      ) : notification.type === 'test_drive_result' && dataObj?.booking_id != null ? (
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
                              navigate(`/profile/bookings${bid != null ? `?booking=${bid}` : ''}`)
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
                            <p className="notification-item__property-name">{propertyMeta.name}</p>
                            <p className="notification-item__property-location">
                              {propertyMeta.location || ' '}
                            </p>
                            <button
                              type="button"
                              className="notification-item__button"
                              onClick={(e) => {
                                e.stopPropagation()
                                goToPropertyListing(notification.id, propertyMeta.id)
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
                          {t('close', 'Close')}
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
    document.body,
  )
}
