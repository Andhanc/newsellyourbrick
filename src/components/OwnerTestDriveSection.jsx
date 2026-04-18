import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiCalendar, FiArrowRight, FiInbox } from 'react-icons/fi'
import './OwnerTestDriveSection.css'

function formatDateRange(start, end, locale) {
  try {
    const s = new Date(`${start}T12:00:00`)
    const e = new Date(`${end}T12:00:00`)
    const opts = { day: 'numeric', month: 'long', year: 'numeric' }
    return `${s.toLocaleDateString(locale, opts)} — ${e.toLocaleDateString(locale, opts)}`
  } catch {
    return `${start} — ${end}`
  }
}

export default function OwnerTestDriveSection({ userId, apiBaseUrl, embedded = false }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const locale =
    i18n.language === 'ru'
      ? 'ru-RU'
      : i18n.language === 'de'
        ? 'de-DE'
        : i18n.language === 'es'
          ? 'es-ES'
          : i18n.language === 'fr'
            ? 'fr-FR'
            : i18n.language === 'sv'
              ? 'sv-SE'
              : 'en-US'

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const base = (apiBaseUrl || '/api').replace(/\/$/, '')
      const res = await fetch(`${base}/test-drive-bookings/owner/${userId}`)
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'load_failed')
      }
      setBookings(Array.isArray(json.data) ? json.data : [])
    } catch (e) {
      setError(e?.message || 'error')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [userId, apiBaseUrl])

  useEffect(() => {
    void load()
  }, [load])

  const statusLabel = (statusKey) => {
    const k = `buyerBookings_status_${statusKey}`
    const tr = t(k)
    return tr !== k ? tr : statusKey
  }

  return (
    <section
      id={embedded ? 'owner-analytics-test-drive' : 'owner-dashboard-test-drive'}
      className={`owner-test-drive${embedded ? ' owner-test-drive--embedded' : ''}`}
    >
      <div className="owner-test-drive__surface">
        <header className="owner-test-drive__hero">
          <div className="owner-test-drive__hero-main">
            <div className="owner-test-drive__icon-ring" aria-hidden>
              <FiCalendar size={22} strokeWidth={2} />
            </div>
            <div className="owner-test-drive__hero-text">
              <h2 className="owner-test-drive__page-title">{t('ownerTabTestDrive')}</h2>
              <p className="owner-test-drive__page-desc">{t('ownerTestDriveHeroHint')}</p>
            </div>
          </div>
          {!loading && !error && bookings.length > 0 ? (
            <span className="owner-test-drive__total-pill">{bookings.length}</span>
          ) : null}
        </header>

        {loading ? (
          <div className="owner-test-drive__loading" role="status" aria-live="polite">
            <span className="owner-test-drive__spinner" aria-hidden />
            <span>{t('buyerBookings_loading')}</span>
          </div>
        ) : null}
        {error && !loading ? (
          <div className="owner-test-drive__notice owner-test-drive__notice--error">{t('buyerBookings_loadFailed')}</div>
        ) : null}

        {!loading && !error && bookings.length === 0 ? (
          <div className="owner-test-drive__empty-state">
            <div className="owner-test-drive__empty-icon">
              <FiInbox size={40} strokeWidth={1.25} aria-hidden />
            </div>
            <p className="owner-test-drive__empty-title">{t('ownerTestDriveEmptyTitle')}</p>
            <p className="owner-test-drive__empty-text">{t('ownerTestDriveEmptyText')}</p>
          </div>
        ) : null}

        {!loading && !error && bookings.length > 0 ? (
          <ul className="owner-test-drive__list">
            {bookings.map((b) => {
              const statusKey = (b.status || 'pending').toLowerCase()
              const label = statusLabel(statusKey)
              const cardVariant = ['pending', 'approved', 'rejected'].includes(statusKey) ? statusKey : 'pending'
              const title =
                b.property_title || t('buyerBookings_propertyFallback', { id: b.property_id })
              const table = b.property_table || 'properties_apartments'
              return (
                <li key={b.id} className={`owner-test-drive-card owner-test-drive-card--${cardVariant}`}>
                  <div className="owner-test-drive-card__inner">
                    <div className="owner-test-drive-card__head">
                      <span className={`owner-test-drive-badge owner-test-drive-badge--${cardVariant}`}>{label}</span>
                      <h3 className="owner-test-drive-card__title">{title}</h3>
                      {b.buyer_display ? (
                        <p className="owner-test-drive-card__buyer">{t('ownerTestDriveBuyer')}: {b.buyer_display}</p>
                      ) : null}
                    </div>
                    <div className="owner-test-drive-card__dates-row">
                      <FiCalendar size={20} strokeWidth={1.75} aria-hidden />
                      <span>{formatDateRange(b.start_date, b.end_date, locale)}</span>
                    </div>
                    <div className="owner-test-drive-card__footer">
                      <button
                        type="button"
                        className="owner-test-drive-card__cta"
                        onClick={() =>
                          navigate(`/property/${b.property_id}/test-drive?table=${encodeURIComponent(table)}`)
                        }
                      >
                        <span>{t('ownerTestDriveOpenCalendar')}</span>
                        <FiArrowRight size={18} aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
