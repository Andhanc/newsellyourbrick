import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser, useClerk } from '@clerk/clerk-react'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { logout } from '../services/authService'
import { FiArrowRight, FiCalendar } from 'react-icons/fi'
import BuyerCabinetSidebar from '../components/BuyerCabinetSidebar'
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

  useEffect(() => {
    const load = async () => {
      try {
        const { getApiBaseUrl } = await import('../utils/apiConfig')
        API_BASE_URL = await getApiBaseUrl()
        const uid = localStorage.getItem('userId')
        if (!uid || !/^\d+$/.test(uid)) {
          setError(i18n.t('buyerBookings_loginRequired'))
          setLoading(false)
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
        setLoading(false)
      }
    }
    load()
  }, [user?.id, i18n.language])

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

  return (
    <div className="profile-page" ref={buyerCabinetPageRef}>
      <div className="profile-container buyer-cabinet-layout-container">
        <BuyerCabinetSidebar
          asideClassName="profile-sidebar"
          headerSpaceBetween
          onLogout={handleLogout}
        />

        <main className="profile-main my-bookings-main buyer-cabinet-layout-main">
          <div className="buyer-cabinet-main-scroll" ref={buyerCabinetMainScrollRef}>
          <div className="my-bookings-header">
            <h1 className="my-bookings-title">{t('buyerBookings_title')}</h1>
            <p className="my-bookings-subtitle">{t('buyerBookings_subtitle')}</p>
          </div>

          {loading && (
            <div className="my-bookings-state my-bookings-state--muted">
              <span className="my-bookings-state__loader" aria-hidden />
              {t('buyerBookings_loading')}
            </div>
          )}
          {!loading && error && (
            <div className="my-bookings-state my-bookings-state--error">{error}</div>
          )}
          {!loading && !error && bookings.length === 0 && (
            <div className="my-bookings-empty">
              <div className="my-bookings-empty__icon" aria-hidden>
                <FiCalendar size={40} strokeWidth={1.25} />
              </div>
              <p className="my-bookings-empty__title">{t('buyerBookings_emptyTitle')}</p>
              <p className="my-bookings-empty__text">{t('buyerBookings_emptyText')}</p>
            </div>
          )}
          {!loading && !error && bookings.length > 0 && (
            <ul className="my-bookings-list">
              {bookings.map((b) => {
                const idKey = String(b.id)
                const isHi = highlightBookingId === idKey
                const statusKey = (b.status || 'pending').toLowerCase()
                const label = statusLabel(statusKey)
                const cardVariant = ['pending', 'approved', 'rejected'].includes(statusKey)
                  ? statusKey
                  : 'pending'
                const title =
                  b.property_title || t('buyerBookings_propertyFallback', { id: b.property_id })
                const table = b.property_table || 'properties_apartments'
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
                      <p className="my-bookings-card__hint">{t('buyerBookings_hint')}</p>
                      <div className="my-bookings-card__footer">
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
