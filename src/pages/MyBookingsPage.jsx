import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/clerk-react'
import { getApiBaseUrlSync } from '../utils/apiConfig'
import { logout } from '../services/authService'
import { FiArrowRight, FiCalendar } from 'react-icons/fi'
import './Profile.css'
import './MyBookingsPage.css'

let API_BASE_URL = getApiBaseUrlSync()

const STATUS_LABEL = {
  pending: 'Ожидает ответа владельца',
  approved: 'Подтверждено',
  rejected: 'Отклонено',
}

function formatDateRangeRu(start, end) {
  try {
    const s = new Date(`${start}T12:00:00`)
    const e = new Date(`${end}T12:00:00`)
    const opts = { day: 'numeric', month: 'long', year: 'numeric' }
    return `${s.toLocaleDateString('ru-RU', opts)} — ${e.toLocaleDateString('ru-RU', opts)}`
  } catch {
    return `${start} — ${end}`
  }
}

export default function MyBookingsPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const highlightBookingId = searchParams.get('booking')
  const { user } = useUser()
  const { signOut } = useClerk()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const cardRefs = useRef({})

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
          setError('Войдите в аккаунт, чтобы видеть бронирования.')
          setLoading(false)
          return
        }
        const res = await fetch(`${API_BASE_URL}/test-drive-bookings/user/${uid}`)
        const data = await res.json()
        if (!res.ok || !data.success) {
          setError(data.error || 'Не удалось загрузить бронирования')
          setBookings([])
        } else {
          setBookings(Array.isArray(data.data) ? data.data : [])
          setError(null)
        }
      } catch (e) {
        setError(e.message || 'Ошибка сети')
        setBookings([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const handleLogout = async () => {
    if (!window.confirm('Вы уверены, что хотите выйти?')) {
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
    <div className="profile-page">
      <div className="profile-container">
        <aside className="profile-sidebar">
          <div className="sidebar-header" style={{ marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="back-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#0ABAB5',
                fontSize: '18px',
                fontWeight: '600',
                transition: 'opacity 0.2s',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Назад</span>
            </button>
            <button type="button" className="header-logout-button" onClick={handleLogout}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Выйти</span>
            </button>
          </div>
          <nav className="sidebar-nav">
            <Link to="/profile" className={pathname === '/profile' ? 'nav-item active' : 'nav-item'}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z"
                  fill="currentColor"
                />
                <path
                  d="M10 12C5.58172 12 2 13.7909 2 16V20H18V16C18 13.7909 14.4183 12 10 12Z"
                  fill="currentColor"
                />
              </svg>
              <span>Профиль</span>
            </Link>
            <Link
              to="/profile/bookings"
              className={pathname === '/profile/bookings' ? 'nav-item active' : 'nav-item'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 8H17" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 2V5M13 2V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Мои бронирования</span>
            </Link>
            <Link to="/data" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 8H14M6 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Данные</span>
            </Link>
            <Link to="/subscriptions" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z"
                  fill="currentColor"
                />
              </svg>
              <span>Подписки</span>
            </Link>
            <Link to="/history" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M6 8H14M6 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>История</span>
            </Link>
            <Link to="/chat" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M7 8H13M7 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>Чат</span>
            </Link>
            <Link to="/favorites" className="nav-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z"
                  fill="currentColor"
                />
              </svg>
              <span>Понравилось</span>
            </Link>
          </nav>
        </aside>

        <main className="profile-main my-bookings-main">
          <div className="my-bookings-header">
            <h1 className="my-bookings-title">Мои бронирования</h1>
            <p className="my-bookings-subtitle">Тест-драйв объектов: даты и статус заявки</p>
          </div>

          {loading && (
            <div className="my-bookings-state my-bookings-state--muted">
              <span className="my-bookings-state__loader" aria-hidden />
              Загрузка…
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
              <p className="my-bookings-empty__title">Пока нет заявок</p>
              <p className="my-bookings-empty__text">
                Заявки на тест-драйв появятся здесь после выбора дат в карточке объекта.
              </p>
            </div>
          )}
          {!loading && !error && bookings.length > 0 && (
            <ul className="my-bookings-list">
              {bookings.map((b) => {
                const idKey = String(b.id)
                const isHi = highlightBookingId === idKey
                const statusKey = (b.status || 'pending').toLowerCase()
                const statusLabel = STATUS_LABEL[statusKey] || b.status
                const cardVariant = ['pending', 'approved', 'rejected'].includes(
                  statusKey
                )
                  ? statusKey
                  : 'pending'
                const title = b.property_title || `Объект #${b.property_id}`
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
                          {statusLabel}
                        </span>
                        <h2 className="my-bookings-card__title">{title}</h2>
                      </div>
                      <div className="my-bookings-card__dates-row">
                        <span className="my-bookings-card__dates-icon" aria-hidden>
                          <FiCalendar size={20} strokeWidth={1.75} />
                        </span>
                        <span className="my-bookings-card__dates-text">
                          {formatDateRangeRu(b.start_date, b.end_date)}
                        </span>
                      </div>
                      <p className="my-bookings-card__hint">
                        Заезд с 15:00 в первый день, выезд до 12:00 в последний (после
                        подтверждения владельца).
                      </p>
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
                          <span>Календарь и детали</span>
                          <FiArrowRight size={18} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </main>
      </div>
    </div>
  )
}
