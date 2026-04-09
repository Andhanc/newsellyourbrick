import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getInterfaceLanguageNativeName } from '../utils/interfaceLanguages'

const headerBtnStyle = {
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
}

/**
 * Общее боковое меню кабинета покупателя (профиль, данные, история, подписки и т.д.).
 * @param {string} asideClassName — CSS-класс сайдбара (например profile-sidebar или data-sidebar)
 * @param {boolean} compact — без футера (язык, соглашение, бренд); только нижняя кнопка «Выйти», как на странице «Данные»
 * @param {boolean} showProfileIndicator — красная точка у «Профиль»
 * @param {boolean} showDataIndicator — красная точка у «Данные»
 * @param {() => void} onLogout
 * @param {boolean} [headerSpaceBetween] — выравнивание «Назад» и «Выйти» по краям (страница Data)
 */
export default function BuyerCabinetSidebar({
  asideClassName = 'profile-sidebar',
  compact = false,
  showProfileIndicator = false,
  showDataIndicator = false,
  onLogout,
  headerSpaceBetween = false,
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const langName = getInterfaceLanguageNativeName(i18n.language)

  const goBackFromCabinet = () => {
    // React Router (History API) кладёт в state.idx индекс записи; на первой странице сессии idx === 0
    const idx = window.history.state?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const navClass = (path, options = {}) => {
    const { activePaths } = options
    const paths = activePaths || [path]
    const isActive = paths.some((p) => pathname === p)
    return isActive ? 'nav-item active' : 'nav-item'
  }

  return (
    <aside className={asideClassName}>
      <div
        className="sidebar-header"
        style={{
          marginTop: '24px',
          ...(headerSpaceBetween
            ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
            : {}),
        }}
      >
        <button
          type="button"
          onClick={goBackFromCabinet}
          className="back-button"
          style={headerBtnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t('buyerCabinet_back')}</span>
        </button>
        <button
          type="button"
          className="header-logout-button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onLogout()
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t('logOutLabel')}</span>
        </button>
      </div>
      <nav className="sidebar-nav">
        <Link to="/profile" className={navClass('/profile')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z"
              fill="currentColor"
            />
            <path
              d="M10 12C5.58172 12 2 13.7909 2 16V20H18V16C18 13.7909 14.4183 12 10 12Z"
              fill="currentColor"
            />
          </svg>
          <span>{t('profile')}</span>
          {showProfileIndicator ? <span className="nav-item-indicator" /> : null}
        </Link>
        <Link to="/data" className={navClass('/data')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 8H14M6 12H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{t('data')}</span>
          {showDataIndicator ? <span className="nav-item-indicator" /> : null}
        </Link>
        <Link to="/profile/bookings" className={navClass('/profile/bookings')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 8H17" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 2V5M13 2V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{t('buyerCabinet_myBookings')}</span>
        </Link>
        <Link to="/subscriptions" className={navClass('/subscriptions')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z" fill="currentColor" />
          </svg>
          <span>{t('subscriptions')}</span>
        </Link>
        <Link to="/history" className={navClass('/history')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 8H14M6 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{t('history')}</span>
        </Link>
        <Link to="/chat?manager=1" className={navClass('/chat')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M7 8H13M7 12H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>{t('chat')}</span>
        </Link>
        <Link to="/favorites" className={navClass('/favorites')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M10 2L12.5 7.5L19 10L12.5 12.5L10 19L7.5 12.5L1 10L7.5 7.5L10 2Z" fill="currentColor" />
          </svg>
          <span>{t('favorites')}</span>
        </Link>
        <Link to="/compare" className={navClass('/compare')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M3 4h6v6H3V4zm8 0h6v6h-6V4zM3 12h6v6H3v-6zm8 0h6v6h-6v-6z" fill="currentColor" />
          </svg>
          <span>{t('buyerCabinet_compare')}</span>
        </Link>
      </nav>

      {compact ? (
        <button
          type="button"
          className="logout-button"
          onClick={onLogout}
          style={{ marginTop: 'auto', marginBottom: '24px', marginLeft: '16px', marginRight: '16px' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
            <path
              d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t('logOutLabel')}</span>
        </button>
      ) : (
        <div className="sidebar-footer">
          <div className="language-selector">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 1C9.5 3 10.5 5.5 10.5 8C10.5 10.5 9.5 13 8 15M8 1C6.5 3 5.5 5.5 5.5 8C5.5 10.5 6.5 13 8 15M1 8H15"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span>{langName}</span>
          </div>
          <a href="#" className="help-link" onClick={(e) => e.preventDefault()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5V8M8 11H8.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{t('buyerCabinet_userAgreement')}</span>
          </a>
          <a href="#" className="help-link" onClick={(e) => e.preventDefault()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 6H10M6 10H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>{t('buyerCabinet_brandLine')}</span>
          </a>
          <div className="copyright">
            {t('buyerCabinet_copyright', { year: new Date().getFullYear() })}
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onLogout()
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7M12 13L15 10M15 10L12 7M15 10H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{t('logOutLabel')}</span>
          </button>
        </div>
      )}
    </aside>
  )
}
