import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  ShoppingBag,
  Car,
  CreditCard,
  BarChart3,
  MessageSquare,
  Settings,
  Bell,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Menu,
  X,
} from 'lucide-react'
import { OTD_IMAGES } from './ownerTestDriveImages'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerTestDriveDetailModal from '../components/OwnerTestDriveDetailModal'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import {
  CLERK_DB_USER_SYNCED,
  countOwnerTestDriveByTab,
  fetchOwnerTestDriveBookings,
  filterOwnerTestDriveRows,
  getOwnerTestDriveUserId,
} from '../utils/ownerTestDriveList'
import './OwnerTestDrivePage.css'
import './OwnerTestDrivePage.mobile.css'

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard, href: '/main-owner-test' },
  { id: 'properties', label: 'Мои объекты', icon: Building2, href: '/owner-properties-test' },
  { id: 'bookings', label: 'Брони', icon: CalendarCheck },
  { id: 'sales', label: 'Продажи', icon: ShoppingBag, href: '/owner-sales-test' },
  { id: 'testdrive', label: 'Тест-драйв', icon: Car, active: true },
  { id: 'subscriptions', label: 'Подписки', icon: CreditCard, href: '/owner-subscriptions-test' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: 3 },
  { id: 'settings', label: 'Настройки', icon: Settings, href: '/owner-profile-test' },
]

const FILTER_TAB_DEFS = [
  { id: 'all', label: 'Все' },
  { id: 'pending', label: 'Ожидает подтверждения' },
  { id: 'confirmed', label: 'Подтвержденные' },
  { id: 'cancelled', label: 'Отмененные' },
]

function LogoMark({ className = '' }) {
  return (
    <svg className={`otd-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="otd-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#otd-logo-grad)" />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        $
      </text>
    </svg>
  )
}

export default function OwnerTestDrivePage() {
  const { isEmbedded } = useOwnerTestEmbeddedNav()
  const [activeTab, setActiveTab] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [selectedRow, setSelectedRow] = useState(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const closeDetailModal = useCallback(() => setSelectedRow(null), [])
  const userId = useMemo(() => getOwnerTestDriveUserId(), [])

  const loadBookings = useCallback(async () => {
    const userId = getOwnerTestDriveUserId()
    if (!userId) {
      setBookings([])
      setBookingsLoading(false)
      return
    }

    setBookingsLoading(true)
    try {
      const rows = await fetchOwnerTestDriveBookings(userId)
      setBookings(rows)
    } catch (error) {
      console.warn('OwnerTestDrivePage: не удалось загрузить заявки', error)
      setBookings([])
    } finally {
      setBookingsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  useEffect(() => {
    const onUserSynced = () => loadBookings()
    window.addEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
  }, [loadBookings])

  const tabCounts = useMemo(() => countOwnerTestDriveByTab(bookings), [bookings])

  const filterTabs = useMemo(
    () => FILTER_TAB_DEFS.map((tab) => ({ ...tab, count: tabCounts[tab.id] ?? 0 })),
    [tabCounts]
  )

  const filteredRows = useMemo(
    () => filterOwnerTestDriveRows(bookings, activeTab),
    [bookings, activeTab]
  )

  const handleRowOpen = useCallback((row) => {
    setSelectedRow(row)
  }, [])

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `otd-nav__item${active ? ' otd-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="otd-nav__badge">{badge}</span>}
        </>
      )

      if (href) {
        return (
          <Link key={id} to={href} className={className} onClick={closeMenu}>
            {inner}
          </Link>
        )
      }

      return (
        <button key={id} type="button" className={className} onClick={closeMenu}>
          {inner}
        </button>
      )
    },
    [closeMenu]
  )

  useEffect(() => {
    if (isEmbedded) return undefined
    document.documentElement.classList.add('otd-page-active')
    return () => document.documentElement.classList.remove('otd-page-active')
  }, [isEmbedded])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const mainColumn = (
      <div className="otd-body">
        <header className="otd-header otd-desktop-only">
          <h1 className="otd-header__title">Тест-драйв</h1>
          <div className="otd-header__actions">
            <button type="button" className="otd-icon-btn" aria-label="Уведомления">
              <Bell size={20} strokeWidth={2} />
              <span className="otd-icon-btn__badge">3</span>
            </button>
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div className="otd-workspace">
          <div className="otd-mob-pagehead otd-mobile-only">
            <h1 className="otd-mob-pagehead__title">Тест-драйв</h1>
          </div>

          <div className="otd-content">
          <div className="otd-tabs-row">
            <div className="otd-tabs" role="tablist" aria-label="Фильтр тест-драйвов">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`otd-tabs__item${activeTab === tab.id ? ' otd-tabs__item--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
            <button type="button" className="otd-filter-btn">
              <SlidersHorizontal size={16} strokeWidth={2} aria-hidden />
              Фильтр
              <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          <div className="otd-table-card">
            {bookingsLoading ? (
              <div className="otd-table-state">Загрузка заявок…</div>
            ) : filteredRows.length === 0 ? (
              <div className="otd-table-state">
                {bookings.length === 0
                  ? 'Пока нет заявок на тест-драйв по вашим объектам.'
                  : 'Нет заявок по выбранному фильтру.'}
              </div>
            ) : (
            <div className="otd-table-wrap">
              <table className="otd-table">
                <thead>
                  <tr>
                    <th>Объект</th>
                    <th>Арендатор</th>
                    <th>Даты</th>
                    <th>Залог</th>
                    <th>Статус</th>
                    <th aria-label="Открыть" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="otd-table__row--clickable"
                      onClick={() => handleRowOpen(row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRowOpen(row)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Открыть заявку ${row.displayId}`}
                    >
                      <td>
                        <div className="otd-object-cell">
                          <img
                            src={row.image}
                            alt=""
                            className="otd-object-cell__thumb"
                            loading="lazy"
                          />
                          <div className="otd-object-cell__text">
                            <p className="otd-object-cell__title">{row.title}</p>
                            <p className="otd-object-cell__meta">{row.location}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="otd-buyer">{row.buyer}</span>
                      </td>
                      <td>
                        <span className="otd-dates">{row.dates}</span>
                      </td>
                      <td>
                        <span className="otd-amount">{row.amount}</span>
                      </td>
                      <td>
                        <div className="otd-status-cell">
                          <span className={`otd-status otd-status--${row.statusKey}`}>{row.status}</span>
                          {row.checkInStatus === 'checked_in' ? (
                            <span className="otd-status otd-status--checked-in">Заселился</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span className="otd-row-open" aria-hidden>
                          <ChevronRight size={18} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>

          <OwnerTestDriveDetailModal
            row={selectedRow}
            userId={userId}
            onClose={closeDetailModal}
            onUpdated={loadBookings}
          />

          <div className="otd-promo-grid">
            <article className="otd-promo-card otd-promo-card--light">
              <h3>Продвигайте тест-драйв</h3>
              <p>Выделите объекты в каталоге и получайте больше заявок на просмотр</p>
              <div className="otd-promo-card__actions">
                <button type="button" className="otd-btn otd-btn--primary otd-btn--sm">
                  Выбрать тариф
                </button>
                <div className="otd-promo-card__visual" aria-hidden>
                  <img src={OTD_IMAGES.promoPremium} alt="" loading="lazy" decoding="async" />
                </div>
              </div>
            </article>
            <article className="otd-promo-card otd-promo-card--dark">
              <h3>Ищете покупателей?</h3>
              <p>Откройте доступ к проверенной аудитории инвесторов по всему миру</p>
              <div className="otd-promo-card__actions otd-promo-card__actions--dark">
                <button type="button" className="otd-btn otd-btn--white otd-btn--sm">
                  Узнать больше
                </button>
                <div className="otd-promo-card__visual otd-promo-card__visual--photo" aria-hidden>
                  <img src={OTD_IMAGES.promoSidebarBuyer} alt="" loading="lazy" decoding="async" />
                </div>
              </div>
            </article>
          </div>
        </div>
        </div>
      </div>
  )

  if (isEmbedded) return mainColumn

  return (
    <div className={`otd${menuOpen ? ' otd--menu-open' : ''}`}>
      <header className="otd-mob-topbar otd-mobile-only" aria-label="Мобильная шапка">
        <div className="otd-mob-topbar__slot otd-mob-topbar__slot--left">
          <button
            type="button"
            className="otd-mob-topbar__menu"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="otd-mob-topbar__brand">
          <LogoMark />
          <span className="otd-logo__text">SellYourBrick</span>
        </div>
        <div className="otd-mob-topbar__slot otd-mob-topbar__slot--right">
          <button type="button" className="otd-mob-topbar__bell" aria-label="Уведомления">
            <Bell size={22} strokeWidth={2} />
            <span className="otd-icon-btn__badge">3</span>
          </button>
        </div>
      </header>

      <div
        className="otd-drawer-backdrop otd-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`otd-drawer otd-mobile-only${menuOpen ? ' otd-drawer--open' : ''}`}
        aria-label="Меню кабинета"
        aria-hidden={!menuOpen}
      >
        <div className="otd-drawer__head">
          <div className="otd-mob-topbar__brand">
            <LogoMark />
            <span className="otd-logo__text">SellYourBrick</span>
          </div>
          <button type="button" className="otd-drawer__close" aria-label="Закрыть меню" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="otd-sidebar__divider otd-sidebar__divider--drawer" aria-hidden />
        <nav className="otd-nav otd-nav--drawer">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>
      </aside>

      <aside className="otd-sidebar otd-desktop-only">
        <div className="otd-sidebar__brand">
          <span className="otd-logo__mark-slot" aria-hidden />
          <span className="otd-logo__text">SellYourBrick</span>
        </div>
        <div className="otd-sidebar__divider" aria-hidden />

        <nav className="otd-nav" aria-label="Кабинет продавца">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>

        <div className="otd-sidebar-promo">
          <p className="otd-sidebar-promo__title">Станьте покупателем</p>
          <p className="otd-sidebar-promo__text">Ищите и бронируйте недвижимость на платформе</p>
          <button type="button" className="otd-btn otd-btn--primary otd-btn--sm">
            Стать покупателем
          </button>
          <img
            className="otd-sidebar-promo__img"
            src={OTD_IMAGES.promoSidebarBuyer}
            alt=""
            loading="lazy"
          />
        </div>
      </aside>

      {mainColumn}
    </div>
  )
}
