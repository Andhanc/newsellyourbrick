import { FiArrowRight, FiCalendar, FiClock, FiMessageCircle, FiStar } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import './TestDriveSuccessDrawer.css'

function formatBookingDate(value, t, locale) {
  if (!value) return t('testDriveSuccess_dateTbd')
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(locale || 'en', { day: 'numeric', month: 'short' }).format(parsed)
}

export default function TestDriveSuccessDrawer({
  isOpen,
  onClose,
  booking,
  propertyTitle,
  onOpenBookings,
  onBackToProperty,
}) {
  const { t, i18n } = useTranslation()
  const startLabel = formatBookingDate(booking?.start_date, t, i18n.language)
  const endLabel = formatBookingDate(booking?.end_date, t, i18n.language)
  const channelKey = booking?.buyer_contact_channel
  const channelLabel =
    channelKey === 'telegram'
      ? 'Telegram'
      : channelKey === 'whatsapp'
        ? 'WhatsApp'
        : channelKey === 'email'
          ? t('testDriveSuccess_channelEmail')
          : t('testDriveSuccess_channelFallback')

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={onClose}
      tone="detail"
      titleId="test-drive-success-title"
      describedBy="test-drive-success-description"
      closeLabel={t('testDriveSuccess_closeAria')}
      className="test-drive-success"
      footer={(
        <div className="test-drive-success__actions">
          <button type="button" className="test-drive-success__primary" onClick={onOpenBookings}>
            <span>{t('testDriveSuccess_openBookings')}</span>
            <FiArrowRight size={18} aria-hidden />
          </button>
          <button type="button" className="test-drive-success__secondary" onClick={onBackToProperty}>
            {t('testDriveSuccess_backToProperty')}
          </button>
        </div>
      )}
    >
      <div className="test-drive-success__content">
        <p className="test-drive-success__eyebrow">
          <FiCalendar size={14} aria-hidden />
          {t('testDriveSuccess_eyebrow')}
        </p>
        <h2 id="test-drive-success-title" className="test-drive-success__title">
          {t('testDriveSuccess_title')}
        </h2>
        <p id="test-drive-success-description" className="test-drive-success__lead">
          {t('testDriveSuccess_lead')}
        </p>

        <article className="test-drive-success__ticket">
          <div className="test-drive-success__date">
            <strong>{startLabel}</strong>
            <span aria-hidden>—</span>
            <strong>{endLabel}</strong>
          </div>
          <h3>{propertyTitle || t('testDriveSuccess_defaultProperty')}</h3>
          {booking?.booking_id ? <p>{t('testDriveSuccess_bookingId', { id: booking.booking_id })}</p> : null}
        </article>

        <div className="test-drive-success__steps" aria-label={t('testDriveSuccess_stepsAria')}>
          <article>
            <span aria-hidden>
              <FiMessageCircle size={18} />
            </span>
            <div>
              <strong>{t('testDriveSuccess_step1Title')}</strong>
              <p>{t('testDriveSuccess_step1Text', { channel: channelLabel })}</p>
            </div>
          </article>
          <article>
            <span aria-hidden>
              <FiClock size={18} />
            </span>
            <div>
              <strong>{t('testDriveSuccess_step2Title')}</strong>
              <p>{t('testDriveSuccess_step2Text')}</p>
            </div>
          </article>
          <article>
            <span aria-hidden>
              <FiStar size={18} />
            </span>
            <div>
              <strong>{t('testDriveSuccess_step3Title')}</strong>
              <p>{t('testDriveSuccess_step3Text')}</p>
            </div>
          </article>
        </div>
      </div>
    </BuyerSheetShell>
  )
}

export { formatBookingDate }
