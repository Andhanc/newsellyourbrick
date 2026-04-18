import { createPortal } from 'react-dom'
import { FiCalendar, FiX } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './OwnerTestDriveRequestModal.css'

function parseData(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return null
}

export default function OwnerTestDriveRequestModal({
  notification,
  onClose,
  onLater,
  onRespond,
  responding,
}) {
  const { t } = useTranslation()
  if (!notification || typeof document === 'undefined') return null

  const data = parseData(notification.data)
  const hasBooking = data?.booking_id != null

  return createPortal(
    <div
      className="owner-td-request-modal-overlay"
      onClick={onLater}
      role="presentation"
    >
      <div
        className="owner-td-request-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-td-request-modal-title"
      >
        <button
          type="button"
          className="owner-td-request-modal__close"
          onClick={onLater}
          aria-label={t('ownerTestDriveModalCloseAria')}
        >
          <FiX size={22} />
        </button>
        <div className="owner-td-request-modal__badge" aria-hidden>
          <FiCalendar size={26} strokeWidth={1.75} />
        </div>
        <h2 id="owner-td-request-modal-title" className="owner-td-request-modal__title">
          {notification.title || t('ownerTestDriveModalTitle')}
        </h2>
        {notification.message ? (
          <p className="owner-td-request-modal__message">{notification.message}</p>
        ) : null}
        {data?.start_date && data?.end_date ? (
          <p className="owner-td-request-modal__dates">
            <FiCalendar size={16} aria-hidden />
            <span>
              {t('ownerTestDriveModalDates', {
                start: data.start_date,
                end: data.end_date,
              })}
            </span>
          </p>
        ) : null}
        <div className="owner-td-request-modal__actions">
          <button
            type="button"
            className="owner-td-request-modal__btn owner-td-request-modal__btn--ghost"
            onClick={onLater}
            disabled={responding}
          >
            {t('ownerTestDriveModalLater')}
          </button>
          {hasBooking ? (
            <>
              <button
                type="button"
                className="owner-td-request-modal__btn owner-td-request-modal__btn--reject"
                onClick={() => onRespond('reject')}
                disabled={responding}
              >
                {responding ? '…' : t('ownerTestDriveModalReject')}
              </button>
              <button
                type="button"
                className="owner-td-request-modal__btn owner-td-request-modal__btn--approve"
                onClick={() => onRespond('approve')}
                disabled={responding}
              >
                {responding ? '…' : t('ownerTestDriveModalApprove')}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
