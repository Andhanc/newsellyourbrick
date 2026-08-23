import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiHome,
  FiMapPin,
  FiMessageCircle,
  FiShield,
  FiX,
} from 'react-icons/fi'
import { formatMoneyFromMinorUnits, formatMoneyMajorUnits } from '../utils/formatStripeMoney'
import { sheetHandleDragProps, useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import { buildBookingTicket } from '../utils/profileCabinetPresentation'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import './ProfileBookingsExperience.css'

const STATUS_LABEL_KEYS = {
  pending: 'profileBookings_status_pending',
  approved: 'profileBookings_status_approved',
  paid: 'profileBookings_status_paid',
  rejected: 'profileBookings_status_rejected',
  cancelled: 'profileBookings_status_cancelled',
}

function getStatusLabel(statusKey, t) {
  const key = STATUS_LABEL_KEYS[statusKey]
  return key ? t(key) : t('profileBookings_status_fallback')
}

function formatDaysLabel(days, t) {
  if (days === 1) return `${days} ${t('profileBookings_day')}`
  if (Number.isFinite(Number(days)) && Number(days) > 0) {
    return t('profileBookings_daysCount', { count: days })
  }
  return `— ${t('profileBookings_days')}`
}

function BookingDetailsDrawer({ ticket, moneyLocale, onClose, onCheckIn, onCancel }) {
  const { t } = useTranslation()
  const sheetDrag = useBottomSheetDrag({
    isOpen: true,
    visible: true,
    isClosing: false,
    requestClose: onClose,
    dismissOnly: true,
  })

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const paidCents = Number(ticket.paid_amount_cents)
  const paid = Number.isFinite(paidCents) && paidCents > 0
    ? formatMoneyFromMinorUnits(paidCents, ticket.paid_currency || 'eur', moneyLocale)
    : t('profileBookings_paymentNotRecorded')
  const insuranceAmount = Number(ticket.insurance_deposit_amount)
  const insurance = Number.isFinite(insuranceAmount) && insuranceAmount > 0
    ? formatMoneyMajorUnits(insuranceAmount, ticket.paid_currency || 'eur', moneyLocale)
    : t('profileBookings_insuranceNotRequired')
  const canCancel = ['pending', 'paid', 'approved'].includes(ticket.statusKey)
  const canCheckIn =
    ticket.statusKey === 'approved' &&
    (Boolean(String(ticket.owner_comment || '').trim()) || Number(ticket.check_in_enabled) === 1)
  const propertyType = String(ticket.property_table || '').includes('houses') ? 'house' : 'apartment'
  const propertyHref = getPropertyDetailPath(ticket.property_id, {
    property: { id: ticket.property_id, property_type: propertyType },
  })

  return createPortal(
    <div className="profile-booking-drawer" role="dialog" aria-modal="true" aria-labelledby="profile-booking-drawer-title">
      <button type="button" className="profile-booking-drawer__backdrop" aria-label={t('profileBookings_close')} onClick={onClose} />
      <div
        ref={sheetDrag.panelRef}
        className="profile-booking-drawer__panel"
        style={sheetDrag.panelDragStyle}
      >
        <div className="profile-booking-drawer__handle" aria-hidden {...sheetHandleDragProps(sheetDrag)} />
        <div className="profile-booking-drawer__head">
          <div>
            <span className="profile-booking-drawer__eyebrow">
              {t('profileBookings_bookingNumber', { id: ticket.id })}
            </span>
            <h4 id="profile-booking-drawer-title">{t('profileBookings_tripDetails')}</h4>
          </div>
          <button type="button" className="profile-booking-drawer__close" onClick={onClose} aria-label={t('profileBookings_close')}>
            <FiX size={20} aria-hidden />
          </button>
        </div>

        <div className="profile-booking-drawer__hero">
          {ticket.property_cover_url ? (
            <img src={ticket.property_cover_url} alt="" />
          ) : (
            <span className="profile-booking-drawer__hero-fallback" aria-hidden><FiHome size={30} /></span>
          )}
          <span className={`profile-booking-status profile-booking-status--${ticket.statusKey}`}>
            {getStatusLabel(ticket.statusKey, t)}
          </span>
        </div>

        <div className="profile-booking-drawer__body">
          <div className="profile-booking-drawer__property">
            <h5>{ticket.title}</h5>
            {ticket.property_location ? (
              <p><FiMapPin size={15} aria-hidden />{ticket.property_location}</p>
            ) : null}
          </div>

          <div className="profile-booking-drawer__facts">
            <div><FiCalendar size={17} aria-hidden /><span>{t('profileBookings_period')}<strong>{ticket.dateRange}</strong></span></div>
            <div><FiClock size={17} aria-hidden /><span>{t('profileBookings_duration')}<strong>{formatDaysLabel(ticket.days, t)}</strong></span></div>
            <div><FiCreditCard size={17} aria-hidden /><span>{t('profileBookings_paid')}<strong>{paid}</strong></span></div>
            <div><FiShield size={17} aria-hidden /><span>{t('profileBookings_insuranceDeposit')}<strong>{insurance}</strong></span></div>
          </div>

          {ticket.owner_comment ? (
            <div className="profile-booking-drawer__note">
              <FiMessageCircle size={18} aria-hidden />
              <div><span>{t('profileBookings_ownerComment')}</span><p>{ticket.owner_comment}</p></div>
            </div>
          ) : null}

          <div className="profile-booking-drawer__actions">
            <Link to={propertyHref} className="profile-booking-drawer__primary" onClick={onClose}>
              {t('profileBookings_openProperty')} <FiArrowRight size={17} aria-hidden />
            </Link>
            {canCheckIn ? (
              <button type="button" className="profile-booking-drawer__secondary" onClick={() => onCheckIn(ticket)}>
                <FiCheckCircle size={17} aria-hidden /> {t('profileBookings_checkIn')}
              </button>
            ) : null}
            {canCancel ? (
              <button type="button" className="profile-booking-drawer__danger" onClick={() => onCancel(ticket)}>
                {t('profileBookings_cancelBooking')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function BookingTicket({ booking, locale, onOpen }) {
  const { t } = useTranslation()
  const ticket = useMemo(() => buildBookingTicket(booking, locale), [booking, locale])
  return (
    <article className={`profile-booking-pass profile-booking-pass--${ticket.statusKey}`}>
      <div className="profile-booking-pass__top">
        <span>SELLYOURBRICK · STAY PASS</span>
        <span className={`profile-booking-status profile-booking-status--${ticket.statusKey}`}>
          {getStatusLabel(ticket.statusKey, t)}
        </span>
      </div>
      <div className="profile-booking-pass__paper">
        <div className="profile-booking-pass__object">
          <div className="profile-booking-pass__visual">
            {ticket.property_cover_url ? (
              <img src={ticket.property_cover_url} alt="" />
            ) : (
              <span className="profile-booking-pass__visual-fallback" aria-hidden>
                <FiHome size={26} />
              </span>
            )}
          </div>
          <div className="profile-booking-pass__property">
            <span className="profile-booking-pass__booking-id">
              {t('profileBookings_bookingNumber', { id: ticket.id })}
            </span>
            <h4>{ticket.title}</h4>
            {ticket.property_location ? (
              <p><FiMapPin size={13} aria-hidden />{ticket.property_location}</p>
            ) : null}
            <span className="profile-booking-pass__dates">{ticket.dateRange}</span>
          </div>
        </div>
        <div className="profile-booking-pass__tear" aria-hidden><span /><span /></div>
        <div className="profile-booking-pass__facts">
          <div><span>{t('profileBookings_checkInLabel')}</span><strong>{ticket.day} {ticket.month}</strong></div>
          <div><span>{t('profileBookings_year')}</span><strong>{ticket.year}</strong></div>
          <div><span>{t('profileBookings_periodShort')}</span><strong>{formatDaysLabel(ticket.days, t)}</strong></div>
          <div><span>{t('profileBookings_status')}</span><strong>{getStatusLabel(ticket.statusKey, t)}</strong></div>
        </div>
        <div className="profile-booking-pass__footer">
          <span className="profile-booking-pass__barcode" aria-hidden />
          <button type="button" onClick={() => onOpen(ticket)}>
            {t('profileBookings_learnMore')} <FiArrowRight size={15} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  )
}

export default function ProfileBookingsExperience({
  rows,
  loading,
  locale = 'ru-RU',
  moneyLocale = 'ru-RU',
  onClose,
  onCheckIn,
  onCancel,
  embedded = false,
}) {
  const { t } = useTranslation()
  const [selectedTicket, setSelectedTicket] = useState(null)
  const upcoming = useMemo(
    () => [...rows].sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || ''))),
    [rows],
  )
  const confirmedCount = useMemo(
    () => upcoming.filter((item) => ['approved', 'paid'].includes(String(item.status).toLowerCase())).length,
    [upcoming],
  )
  const isEmpty = !loading && upcoming.length === 0

  return (
    <div
      className={`profile-bookings-experience profile-bookings-experience--fullscreen${
        embedded ? ' profile-bookings-experience--embedded' : ''
      }`}
    >
      <div className="profile-bookings-hero">
        <img
          className="profile-bookings-hero__image"
          src="/images/profile/bookings-hero-travel.png"
          alt=""
          decoding="async"
        />
      </div>

      <div className="profile-bookings-panel">
        <div className="profile-bookings-panel__intro">
          <h2 id="profile-bookings-sheet-title" className="profile-bookings-panel__title">
            {t('profileBookings_title')}
          </h2>
          <p className="profile-bookings-panel__lead">{t('profileBookings_lead')}</p>
        </div>

        {!embedded ? (
          <div className="profile-bookings-experience__toolbar">
            <button type="button" className="profile-bookings-experience__back" onClick={onClose}>
              <FiArrowLeft size={18} aria-hidden />
              <span>{t('profileBookings_back')}</span>
            </button>
          </div>
        ) : null}

        {!isEmpty ? (
          <div className="profile-bookings-summary">
            <div>
              <FiCalendar size={19} aria-hidden />
              <span>
                {t('profileBookings_totalBookings')}
                <strong>{upcoming.length}</strong>
              </span>
            </div>
            <div>
              <FiCheckCircle size={19} aria-hidden />
              <span>
                {t('profileBookings_confirmed')}
                <strong>{confirmedCount}</strong>
              </span>
            </div>
          </div>
        ) : null}

        {loading ? (
          <p className="profile-bookings-experience__state">{t('profileBookings_loading')}</p>
        ) : isEmpty ? (
          <div className="profile-bookings-empty">
            <p className="profile-bookings-empty__text">{t('profileBookings_empty')}</p>
            <Link to="/map" className="profile-bookings-empty__cta" onClick={onClose}>
              {t('profileBookings_browseProperties')}
              <FiArrowRight size={16} aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="profile-bookings-list">
            {upcoming.map((booking) => (
              <BookingTicket key={booking.id} booking={booking} locale={locale} onOpen={setSelectedTicket} />
            ))}
          </div>
        )}
      </div>

      {selectedTicket ? (
        <BookingDetailsDrawer
          ticket={selectedTicket}
          moneyLocale={moneyLocale}
          onClose={() => setSelectedTicket(null)}
          onCheckIn={(ticket) => {
            setSelectedTicket(null)
            onCheckIn(ticket)
          }}
          onCancel={(ticket) => {
            setSelectedTicket(null)
            onCancel(ticket)
          }}
        />
      ) : null}
    </div>
  )
}
