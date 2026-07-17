import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser, useClerk } from '@clerk/clerk-react'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { logout } from '../services/authService'
import { FiArrowRight, FiCalendar, FiCheckCircle, FiClock, FiMapPin } from 'react-icons/fi'
import TestDriveBuyerCancelModal from '../components/TestDriveBuyerCancelModal'
import TestDriveCheckInModal from '../components/TestDriveCheckInModal'
import BuyerCabinetSidebar from '../components/BuyerCabinetSidebar'
import BuyerSheetShell from '../components/buyer-mobile/BuyerSheetShell'
import { formatMoneyFromMinorUnits, formatMoneyMajorUnits } from '../utils/formatStripeMoney'
import { useChainedAppLayoutScroll } from '../hooks/useChainedAppLayoutScroll'
import i18n from '../i18n/config'
import './Profile.css'
import './MyBookingsPage.css'

let API_BASE_URL = getApiBaseUrlSync()

function billingLocaleFromLang() {
  const code = (i18n.language || 'ru').split('-')[0]
  const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }
  return map[code] || 'en-US'
}

function formatDateRange(start, end) {
  try {
    const loc = billingLocaleFromLang()
    const s = new Date(`${start}T12:00:00`)
    const e = new Date(`${end}T12:00:00`)
    const opts = { day: 'numeric', month: 'long', year: 'numeric' }
    return `${s.toLocaleDateString(loc, opts)} — ${e.toLocaleDateString(loc, opts)}`
  } catch {
    return `${start} — ${end}`
  }
}

function bookingNextStep(statusKey) {
  switch (statusKey) {
    case 'pending':
      return 'Заявка отправлена. Владелец проверит даты — ответ появится в уведомлениях.'
    case 'paid':
      return 'Оплата подтверждена. Дождитесь финального подтверждения владельца.'
    case 'approved':
      return 'Проверьте детали визита и заполните анкету до заселения, если она доступна.'
    case 'completed':
      return 'Визит завершён. Объект можно снова открыть и перейти к решению о покупке.'
    case 'rejected':
      return 'Эти даты недоступны. Вернитесь к объекту и выберите другой период.'
    case 'cancelled':
      return 'Бронь закрыта. Можно открыть объект и создать новую заявку.'
    default:
      return 'Откройте детали брони — там собраны актуальный статус и следующий шаг.'
  }
}

export default function MyBookingsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const highlightBookingId = searchParams.get('booking')
  const { user } = useUser()
  const { signOut } = useClerk()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelNotice, setCancelNotice] = useState(null)
  const [buyerCancelBooking, setBuyerCancelBooking] = useState(null)
  const [checkInBookingId, setCheckInBookingId] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [bookingStatusFilter, setBookingStatusFilter] = useState('active')
  const cardRefs = useRef({})
  const buyerCabinetPageRef = useRef(null)
  const buyerCabinetMainScrollRef = useRef(null)

  useChainedAppLayoutScroll(buyerCabinetPageRef, buyerCabinetMainScrollRef, { active: true })

  useEffect(() => {
    const el = highlightBookingId ? cardRefs.current[highlightBookingId] : null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightBookingId, bookings])

  const loadBookings = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true)
        const { getApiBaseUrl } = await import('../utils/apiConfig')
        API_BASE_URL = await getApiBaseUrl()
        const uid = localStorage.getItem('userId')
        if (!uid || !/^\d+$/.test(uid)) {
          setError(i18n.t('buyerBookings_loginRequired'))
          if (!silent) setLoading(false)
          return
        }
        const res = await fetch(`${API_BASE_URL}/test-drive-bookings/user/${uid}`)
        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || i18n.t('buyerBookings_loadFailed'))
          setBookings([])
        } else {
          setBookings(Array.isArray(data.data) ? data.data : [])
          setError(null)
        }
      } catch (e) {
        setError(e.message || i18n.t('buyerBookings_networkError'))
        setBookings([])
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [i18n.language]
  )

  useEffect(() => {
    loadBookings(false)
  }, [loadBookings, user?.id, i18n.language])

  useEffect(() => {
    const onSseNotifications = () => {
      void loadBookings(true)
    }
    window.addEventListener('owner-notifications-refresh', onSseNotifications)
    return () => window.removeEventListener('owner-notifications-refresh', onSseNotifications)
  }, [loadBookings])

  useEffect(() => {
    const loadCancelNotice = async () => {
      try {
        const uid = localStorage.getItem('userId')
        if (!uid || !/^\d+$/.test(uid)) return
        const res = await fetch(`${API_BASE_URL}/notifications/user/${uid}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.success || !Array.isArray(data.data)) return
        const hit = data.data.find(
          (n) =>
            n.type === 'test_drive_cancelled' &&
            Number(n.view_count || 0) === 0 &&
            n.data?.reason
        )
        if (hit) {
          setCancelNotice({
            id: hit.id,
            reason: String(hit.data.reason || ''),
            title: hit.title || 'Бронь отменена продавцом',
          })
        }
      } catch {
        /* ignore */
      }
    }
    loadCancelNotice()
  }, [user?.id])

  const closeCancelNotice = async () => {
    if (cancelNotice?.id) {
      try {
        await fetch(`${API_BASE_URL}/notifications/${cancelNotice.id}/view`, { method: 'PUT' })
      } catch {
        /* ignore */
      }
    }
    setCancelNotice(null)
  }

  const statusLabel = (statusKey) => {
    const k = `buyerBookings_status_${statusKey}`
    const tr = t(k)
    return tr !== k ? tr : statusKey
  }

  const handleLogout = async () => {
    if (!window.confirm(t('buyerCabinet_logoutConfirm'))) {
      return
    }
    try {
      if (user && signOut) {
        await signOut()
      }
    } catch (err) {
      console.warn('Clerk signOut:', err)
    }
    try {
      await logout()
    } catch (err) {
      console.warn('logout:', err)
    }
    navigate('/')
    setTimeout(() => window.location.reload(), 0)
  }

  const visibleBookings = bookings.filter((b) => {
    const statusKey = String(b.status || '').toLowerCase()
    const cancelledBy = String(b.cancelled_by || '').toLowerCase()
    // В новом кабинете скрываем брони, которые покупатель отменил сам.
    return !(statusKey === 'cancelled' && cancelledBy === 'buyer')
  })
  const activeStatuses = new Set(['pending', 'paid', 'approved'])
  const activeBookings = visibleBookings.filter((booking) =>
    activeStatuses.has(String(booking.status || '').toLowerCase()),
  )
  const filteredBookings = visibleBookings.filter((booking) => {
    const status = String(booking.status || '').toLowerCase()
    if (bookingStatusFilter === 'active') return activeStatuses.has(status)
    if (bookingStatusFilter === 'closed') return !activeStatuses.has(status)
    return true
  })
  const spotlightBooking = activeBookings[0] || visibleBookings[0] || null

  return (
    <div className="profile-page" ref={buyerCabinetPageRef}>
      <TestDriveCheckInModal
        open={checkInBookingId != null}
        bookingId={checkInBookingId}
        onClose={() => setCheckInBookingId(null)}
        onSuccess={() => {
          void loadBookings(true)
          window.dispatchEvent(new CustomEvent('owner-notifications-refresh'))
        }}
      />

      <TestDriveBuyerCancelModal
        open={!!buyerCancelBooking}
        booking={buyerCancelBooking}
        hasOnlinePayment={Boolean(
          buyerCancelBooking &&
            buyerCancelBooking.paid_amount_cents != null &&
            Number(buyerCancelBooking.paid_amount_cents) > 0,
        )}
        onClose={() => setBuyerCancelBooking(null)}
        onSuccess={() => {
          void loadBookings(true)
          window.dispatchEvent(new CustomEvent('owner-notifications-refresh'))
        }}
      />
      <BuyerSheetShell
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        titleId="booking-next-step-title"
        tone="detail"
        className="my-bookings-next-sheet"
        footer={
          selectedBooking ? (
            <button
              type="button"
              className="my-bookings-next-sheet__primary"
              onClick={() => {
                const table = selectedBooking.property_table || 'properties_apartments'
                navigate(
                  `/property/${selectedBooking.property_id}/test-drive?table=${encodeURIComponent(table)}`,
                )
                setSelectedBooking(null)
              }}
            >
              Открыть объект <FiArrowRight aria-hidden />
            </button>
          ) : null
        }
      >
        {selectedBooking ? (
          <div className="my-bookings-next-sheet__content">
            <span className="my-bookings-next-sheet__eyebrow">План визита</span>
            <h2 id="booking-next-step-title">Что делать дальше</h2>
            <p className="my-bookings-next-sheet__property">
              {selectedBooking.property_title ||
                t('buyerBookings_propertyFallback', { id: selectedBooking.property_id })}
            </p>
            <div className="my-bookings-next-sheet__date">
              <FiCalendar aria-hidden />
              <span>{formatDateRange(selectedBooking.start_date, selectedBooking.end_date)}</span>
            </div>
            <ol className="my-bookings-next-sheet__steps">
              <li><FiCheckCircle aria-hidden /><span>Мы сохраняем актуальный статус брони в этом разделе.</span></li>
              <li><FiClock aria-hidden /><span>{bookingNextStep(String(selectedBooking.status || '').toLowerCase())}</span></li>
              <li><FiMapPin aria-hidden /><span>Адрес и инструкции владельца появятся в деталях заявки.</span></li>
            </ol>
          </div>
        ) : null}
      </BuyerSheetShell>
      {cancelNotice ? (
        <div className="my-bookings-cancel-modal__overlay" role="presentation">
          <div className="my-bookings-cancel-modal" role="dialog" aria-modal="true">
            <h3 className="my-bookings-cancel-modal__title">{cancelNotice.title}</h3>
            <p className="my-bookings-cancel-modal__text">
              Причина от продавца: <strong>{cancelNotice.reason}</strong>
            </p>
            <button
              type="button"
              className="my-bookings-card__cta"
              onClick={closeCancelNotice}
            >
              Понятно
            </button>
          </div>
        </div>
      ) : null}
      <div className="profile-container buyer-cabinet-layout-container">
        <BuyerCabinetSidebar
          asideClassName="profile-sidebar"
          headerSpaceBetween
          onLogout={handleLogout}
        />

        <main className="profile-main my-bookings-main buyer-cabinet-layout-main">
          <div className="buyer-cabinet-main-scroll" ref={buyerCabinetMainScrollRef}>
          <div className="my-bookings-header">
            <span className="my-bookings-header__eyebrow">Личный кабинет</span>
            <h1 className="my-bookings-title">{t('buyerBookings_title')}</h1>
            <p className="my-bookings-subtitle">{t('buyerBookings_subtitle')}</p>
          </div>

          {!loading && !error && spotlightBooking ? (
            <section className="my-bookings-spotlight" aria-label="Ближайший визит">
              <div className="my-bookings-spotlight__top">
                <span className="my-bookings-spotlight__eyebrow">Ближайший шаг</span>
                <span className="my-bookings-spotlight__count">{activeBookings.length} активных</span>
              </div>
              <h2>{spotlightBooking.property_title || t('buyerBookings_propertyFallback', { id: spotlightBooking.property_id })}</h2>
              <p>{formatDateRange(spotlightBooking.start_date, spotlightBooking.end_date)}</p>
              <button type="button" onClick={() => setSelectedBooking(spotlightBooking)}>
                Посмотреть план <FiArrowRight aria-hidden />
              </button>
            </section>
          ) : null}

          {!loading && !error && visibleBookings.length > 0 ? (
            <div className="my-bookings-filters" role="group" aria-label="Фильтр бронирований">
              {[
                ['active', 'Активные'],
                ['all', 'Все'],
                ['closed', 'Завершённые'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`my-bookings-filter${bookingStatusFilter === value ? ' is-active' : ''}`}
                  aria-pressed={bookingStatusFilter === value}
                  onClick={() => setBookingStatusFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {loading && (
            <div className="my-bookings-state my-bookings-state--muted">
              <span className="my-bookings-state__loader" aria-hidden />
              {t('buyerBookings_loading')}
            </div>
          )}
          {!loading && error && (
            <div className="my-bookings-state my-bookings-state--error" role="alert">
              <strong>Не удалось загрузить бронирования</strong>
              <span>{error}</span>
              <button type="button" className="my-bookings-state__retry" onClick={() => loadBookings(false)}>
                Попробовать снова
              </button>
            </div>
          )}
          {!loading && !error && visibleBookings.length === 0 && (
            <div className="my-bookings-empty">
              <div className="my-bookings-empty__icon" aria-hidden>
                <FiCalendar size={40} strokeWidth={1.25} />
              </div>
              <p className="my-bookings-empty__title">{t('buyerBookings_emptyTitle')}</p>
              <p className="my-bookings-empty__text">{t('buyerBookings_emptyText')}</p>
              <button type="button" className="my-bookings-empty__action" onClick={() => navigate('/test-drive')}>
                Выбрать объект для тест-драйва <FiArrowRight aria-hidden />
              </button>
            </div>
          )}
          {!loading && !error && visibleBookings.length > 0 && filteredBookings.length === 0 ? (
            <div className="my-bookings-empty my-bookings-empty--filter">
              <p className="my-bookings-empty__title">В этом разделе пока пусто</p>
              <p className="my-bookings-empty__text">Переключите фильтр, чтобы увидеть остальные бронирования.</p>
            </div>
          ) : null}
          {!loading && !error && filteredBookings.length > 0 && (
            <ul className="my-bookings-list">
              {filteredBookings.map((b) => {
                const idKey = String(b.id)
                const isHi = highlightBookingId === idKey
                const statusKey = (b.status || 'pending').toLowerCase()
                const label = statusLabel(statusKey)
                const cardVariant = ['pending', 'paid', 'approved', 'completed', 'rejected', 'cancelled'].includes(statusKey)
                  ? statusKey
                  : 'pending'
                const title =
                  b.property_title || t('buyerBookings_propertyFallback', { id: b.property_id })
                const table = b.property_table || 'properties_apartments'
                const paidCents =
                  b.paid_amount_cents != null && Number.isFinite(Number(b.paid_amount_cents))
                    ? Number(b.paid_amount_cents)
                    : null
                const paidLine =
                  paidCents != null && paidCents > 0
                    ? t('buyerBookings_paidLine', {
                        amount: formatMoneyFromMinorUnits(
                          paidCents,
                          b.paid_currency || 'eur',
                          billingLocaleFromLang(),
                        ),
                      })
                    : null
                const insAmt = b.insurance_deposit_amount
                const insLine =
                  insAmt != null && Number.isFinite(Number(insAmt))
                    ? t('buyerBookings_insuranceLine', {
                        amount: formatMoneyMajorUnits(
                          Number(insAmt),
                          b.paid_currency || 'eur',
                          billingLocaleFromLang(),
                        ),
                      })
                    : null
                const surveyToken = b.survey_token ? String(b.survey_token).trim() : ''
                const showSurveyCta =
                  Boolean(surveyToken) && ['paid', 'approved'].includes(statusKey)
                const showLegacyCheckIn =
                  String(b.status || '').toLowerCase() === 'approved' &&
                  (b.owner_comment || Number(b.check_in_enabled) === 1) &&
                  !surveyToken
                const canBuyerCancel = ['pending', 'paid', 'approved'].includes(statusKey)
                const cancelReason =
                  b.cancellation_reason ||
                  (b.cancellation_reason_code ? String(b.cancellation_reason_code) : '') ||
                  ''
                const cancelledByOwner = String(b.cancelled_by || '').toLowerCase() === 'owner'
                const cancelledByBuyer = String(b.cancelled_by || '').toLowerCase() === 'buyer'
                return (
                  <li
                    key={b.id}
                    ref={(node) => {
                      if (node) cardRefs.current[idKey] = node
                    }}
                    className={`my-bookings-card my-bookings-card--${cardVariant}${isHi ? ' my-bookings-card--highlight' : ''}`}
                  >
                    <div className="my-bookings-card__inner">
                      <div className="my-bookings-card__head">
                        <span className={`my-bookings-badge my-bookings-badge--${cardVariant}`}>
                          {label}
                        </span>
                        <h2 className="my-bookings-card__title">{title}</h2>
                      </div>
                      <div className="my-bookings-card__dates-row">
                        <span className="my-bookings-card__dates-icon" aria-hidden>
                          <FiCalendar size={20} strokeWidth={1.75} />
                        </span>
                        <span className="my-bookings-card__dates-text">
                          {formatDateRange(b.start_date, b.end_date)}
                        </span>
                      </div>
                      {paidLine ? <p className="my-bookings-card__money">{paidLine}</p> : null}
                      {insLine ? (
                        <p className="my-bookings-card__money my-bookings-card__money--muted">{insLine}</p>
                      ) : null}
                      {statusKey === 'cancelled' ? (
                        <div className="my-bookings-card__cancel-info">
                          {cancelledByOwner ? (
                            <p className="my-bookings-card__cancel-line">
                              <strong>{t('buyerBookings_cancelledByOwner')}</strong>
                            </p>
                          ) : null}
                          {cancelledByBuyer ? (
                            <p className="my-bookings-card__cancel-line">
                              <strong>{t('buyerBookings_cancelledByYou')}</strong>
                            </p>
                          ) : null}
                          {!cancelledByOwner && !cancelledByBuyer ? (
                            <p className="my-bookings-card__cancel-line">
                              <strong>{t('buyerBookings_cancelledGeneric')}</strong>
                            </p>
                          ) : null}
                          {cancelReason ? (
                            <p className="my-bookings-card__cancel-line">
                              {t('buyerBookings_cancelledReason')} <strong>{cancelReason}</strong>
                            </p>
                          ) : (
                            <p className="my-bookings-card__cancel-line my-bookings-card__cancel-line--muted">
                              {t('buyerBookings_cancelledNoReason')}
                            </p>
                          )}
                          {b.cancelled_at ? (
                            <p className="my-bookings-card__cancel-meta">{b.cancelled_at}</p>
                          ) : null}
                        </div>
                      ) : null}
                      <p className="my-bookings-card__hint">{t('buyerBookings_hint')}</p>
                      <div className="my-bookings-card__next-copy">
                        <span>Следующий шаг</span>
                        <p>{bookingNextStep(statusKey)}</p>
                      </div>
                      {b.owner_comment ? (
                        <div className="my-bookings-card__hint" style={{ marginTop: 8 }}>
                          <strong>Комментарий владельца:</strong> {b.owner_comment}
                        </div>
                      ) : null}
                      <div className="my-bookings-card__footer">
                        <button
                          type="button"
                          className="my-bookings-card__next"
                          onClick={() => setSelectedBooking(b)}
                        >
                          Что дальше <FiArrowRight size={18} aria-hidden />
                        </button>
                        {showSurveyCta ? (
                          <button
                            type="button"
                            className="my-bookings-card__cta"
                            onClick={() =>
                              navigate(`/test-drive/survey/${encodeURIComponent(surveyToken)}`)
                            }
                          >
                            <span>{t('buyerBookings_surveyCta')}</span>
                            <FiArrowRight size={18} aria-hidden />
                          </button>
                        ) : null}
                        {showLegacyCheckIn ? (
                          <button
                            type="button"
                            className="my-bookings-card__cta"
                            onClick={() => setCheckInBookingId(b.id)}
                          >
                            <span>{t('buyerBookings_checkInCta')}</span>
                            <FiArrowRight size={18} aria-hidden />
                          </button>
                        ) : null}
                        {canBuyerCancel ? (
                          <button
                            type="button"
                            className="my-bookings-card__cta my-bookings-card__cta--danger"
                            onClick={() => setBuyerCancelBooking(b)}
                          >
                            <span>{t('buyerBookings_cancel')}</span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="my-bookings-card__cta"
                          onClick={() =>
                            navigate(
                              `/property/${b.property_id}/test-drive?table=${encodeURIComponent(table)}`
                            )
                          }
                        >
                          <span>{t('buyerBookings_cta')}</span>
                          <FiArrowRight size={18} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          </div>
        </main>
      </div>
    </div>
  )
}
