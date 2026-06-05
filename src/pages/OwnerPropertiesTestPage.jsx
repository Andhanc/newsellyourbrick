import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Search,
  SlidersHorizontal,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Eye,
  Home,
  Plus,
  ClipboardList,
  Briefcase,
} from 'lucide-react'
import { OWNER_PROP_IMAGES } from './ownerPropertiesTestImages'
import {
  OWNER_LISTING_TYPE_LABELS,
  getOwnerPropertyAmount,
  getOwnerPropertyAnalyticsPath,
} from './ownerPropertiesTestData'
import {
  CLERK_DB_USER_SYNCED,
  countOwnerPropertiesByTab,
  fetchOwnerProperties,
  filterOwnerProperties,
  getOwnerPropertiesUserId,
} from '../utils/ownerPropertiesList'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import './OwnerPropertiesTestPage.css'
import './OwnerPropertiesTestPage.mobile.css'

const MOT_TIFFANY = '#0abab5'

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard, href: '/main-owner-test' },
  { id: 'properties', label: 'Мои объекты', icon: Building2, active: true },
  { id: 'bookings', label: 'Брони', icon: CalendarCheck },
  { id: 'sales', label: 'Продажи', icon: ShoppingBag, href: '/owner-sales-test' },
  { id: 'testdrive', label: 'Тест-драйв', icon: Car, href: '/owner-test-drive' },
  { id: 'subscriptions', label: 'Подписки', icon: CreditCard, href: '/owner-subscriptions-test' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: 3 },
  { id: 'settings', label: 'Настройки', icon: Settings, href: '/owner-profile-test' },
]

const PAGE_SIZE = 10

const FILTER_TAB_DEFS = [
  { id: 'all', label: 'Все объекты', shortLabel: 'Все' },
  { id: 'active', label: 'Активные', shortLabel: 'Активные' },
  { id: 'booked', label: 'Забронированные', shortLabel: 'Забронированные' },
  { id: 'sold', label: 'Проданные', shortLabel: 'Проданные' },
  { id: 'draft', label: 'Черновики', shortLabel: 'Черновики' },
]

const TAB_ITEMS = [
  { id: 'home', label: 'Главная', icon: Home, href: '/main-owner-test' },
  { id: 'properties', label: 'Объекты', icon: Briefcase, active: true },
  { id: 'fab', fab: true },
  { id: 'bookings', label: 'Брони', icon: ClipboardList },
  { id: 'more', label: 'Ещё', icon: SlidersHorizontal },
]

const QUICK_ANALYTICS = [
  { label: 'Общие просмотры', value: '12 450', delta: '+12.5%', up: true, spark: 'tiffany' },
  { label: 'Общее количество броней', value: '834', delta: '+8.2%', up: true, spark: 'green' },
  { label: 'Конверсия в бронь', value: '6.7%', delta: '+1.2%', up: true, spark: 'orange' },
]

function MiniSpark({ variant }) {
  const colors = { tiffany: MOT_TIFFANY, green: '#22c55e', orange: '#f59e0b' }
  const stroke = colors[variant] || MOT_TIFFANY
  return (
    <svg className="op-mini-spark" viewBox="0 0 64 28" aria-hidden>
      <path
        d="M2 20 C12 14, 18 18, 28 12 S42 8, 52 10 S58 6, 62 8"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`op-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="op-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#op-logo-grad)" />
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

function DeltaText({ value, up }) {
  if (!value) return null
  const cls = up === false ? 'op-delta op-delta--down' : up === true ? 'op-delta op-delta--up' : 'op-delta op-delta--muted'
  return <span className={cls}>{value}</span>
}

function ListingTypeBadge({ type }) {
  const label = OWNER_LISTING_TYPE_LABELS[type] || type
  return <span className={`op-type op-type--${type}`}>{label}</span>
}

function AmountCell({ row }) {
  const { label, value } = getOwnerPropertyAmount(row)
  return (
    <div className="op-amount-cell">
      <span className="op-amount-cell__label">{label}</span>
      <span className="op-amount-cell__value">{value}</span>
    </div>
  )
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({ type: 'page', value: index + 1 }))
  }

  const items = [{ type: 'page', value: 1 }]
  if (currentPage > 3) items.push({ type: 'ellipsis' })

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  for (let page = start; page <= end; page += 1) {
    items.push({ type: 'page', value: page })
  }

  if (currentPage < totalPages - 2) items.push({ type: 'ellipsis' })
  if (totalPages > 1) items.push({ type: 'page', value: totalPages })
  return items
}

function PropertiesPagination({ currentPage, totalPages, totalItems, onPageChange }) {
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalItems)
  const pageItems = getVisiblePages(currentPage, totalPages)

  return (
    <footer className="op-pagination">
      <p className="op-pagination__info">
        {totalItems === 0
          ? 'Нет объектов'
          : `Показано ${pageStart}–${pageEnd} из ${totalItems} объектов`}
      </p>
      {totalPages > 1 && (
        <div className="op-pagination__controls">
          <button
            type="button"
            className="op-page-btn"
            aria-label="Предыдущая страница"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          {pageItems.map((item, index) =>
            item.type === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="op-page-ellipsis" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item.value}
                type="button"
                className={`op-page-btn${item.value === currentPage ? ' op-page-btn--active' : ''}`}
                aria-label={`Страница ${item.value}`}
                aria-current={item.value === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(item.value)}
              >
                {item.value}
              </button>
            )
          )}
          <button
            type="button"
            className="op-page-btn"
            aria-label="Следующая страница"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </footer>
  )
}

export default function OwnerPropertiesTestPage() {
  const { fullName, roleLabel } = useOwnerTestProfile()
  const { isEmbedded, goTo } = useOwnerTestEmbeddedNav()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [properties, setProperties] = useState([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const loadProperties = useCallback(async () => {
    const userId = getOwnerPropertiesUserId()
    if (!userId) {
      setProperties([])
      setPropertiesLoading(false)
      return
    }

    setPropertiesLoading(true)
    try {
      const rows = await fetchOwnerProperties(userId)
      setProperties(rows)
    } catch (error) {
      console.warn('OwnerPropertiesTestPage: не удалось загрузить объекты', error)
      setProperties([])
    } finally {
      setPropertiesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProperties()
  }, [loadProperties])

  useEffect(() => {
    const onUserSynced = () => loadProperties()
    const onPropertiesUpdate = () => loadProperties()
    window.addEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
    window.addEventListener('owner-properties-update', onPropertiesUpdate)
    return () => {
      window.removeEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
      window.removeEventListener('owner-properties-update', onPropertiesUpdate)
    }
  }, [loadProperties])

  const tabCounts = useMemo(() => countOwnerPropertiesByTab(properties), [properties])

  const filterTabs = useMemo(
    () => FILTER_TAB_DEFS.map((tab) => ({ ...tab, count: tabCounts[tab.id] ?? 0 })),
    [tabCounts]
  )

  const mobSummaryStats = useMemo(
    () => [
      { label: 'Всего', value: String(tabCounts.all), delta: '', up: null },
      { label: 'Активные', value: String(tabCounts.active), delta: '', up: null },
      { label: 'Забронированные', value: String(tabCounts.booked), delta: '', up: null },
      { label: 'Проданные', value: String(tabCounts.sold), delta: '', up: null },
      { label: 'Черновики', value: String(tabCounts.draft), delta: '', up: null },
    ],
    [tabCounts]
  )

  const visibleProperties = useMemo(
    () => filterOwnerProperties(properties, { tab: activeTab, query: searchQuery }),
    [properties, activeTab, searchQuery]
  )

  const totalPages = Math.max(1, Math.ceil(visibleProperties.length / PAGE_SIZE))

  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedProperties = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE
    return visibleProperties.slice(start, start + PAGE_SIZE)
  }, [visibleProperties, safeCurrentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const openPropertyAnalytics = useCallback(
    (id) => {
      if (isEmbedded && goTo) {
        goTo(OWNER_VIEWS.PROPERTY_ANALYTICS, { propertyId: id })
      } else {
        navigate(getOwnerPropertyAnalyticsPath(id))
      }
    },
    [isEmbedded, goTo, navigate]
  )

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `op-nav__item${active ? ' op-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="op-nav__badge">{badge}</span>}
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
    document.documentElement.classList.add('op-page-active')
    return () => document.documentElement.classList.remove('op-page-active')
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
      <div className="op-body">
        <header className="op-header op-desktop-only">
          <h1 className="op-header__title">Мои объекты</h1>
          <div className="op-header__actions">
            {isEmbedded ? (
              <button
                type="button"
                className="op-btn op-btn--primary op-header__add-btn"
                onClick={() => goTo(OWNER_VIEWS.ADD_PROPERTY)}
              >
                <Plus size={18} strokeWidth={2.5} aria-hidden />
                Добавить объект
              </button>
            ) : (
              <Link to="/owner-add-property-test" className="op-btn op-btn--primary op-header__add-btn">
                <Plus size={18} strokeWidth={2.5} aria-hidden />
                Добавить объект
              </Link>
            )}
            <button type="button" className="op-icon-btn" aria-label="Уведомления">
              <Bell size={20} strokeWidth={2} />
              <span className="op-icon-btn__badge">3</span>
            </button>
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div className="op-workspace">
          <div className="op-mob-pagehead op-mobile-only">
            <h1 className="op-mob-pagehead__title">Мои объекты</h1>
            {isEmbedded ? (
              <button
                type="button"
                className="op-mob-add-btn"
                aria-label="Добавить объект"
                onClick={() => goTo(OWNER_VIEWS.ADD_PROPERTY)}
              >
                <Plus size={22} strokeWidth={2.5} aria-hidden />
              </button>
            ) : (
              <Link to="/owner-add-property-test" className="op-mob-add-btn" aria-label="Добавить объект">
                <Plus size={22} strokeWidth={2.5} aria-hidden />
              </Link>
            )}
          </div>

          <section className="op-mob-metrics op-mobile-only" aria-label="Сводка по объектам">
            {mobSummaryStats.map((stat) => (
              <article key={stat.label} className="op-mob-metric">
                <span className="op-mob-metric__label">{stat.label}</span>
                <span className="op-mob-metric__value">{stat.value}</span>
                <DeltaText value={stat.delta} up={stat.up} />
              </article>
            ))}
          </section>

          <div className="op-main-panel">
            <div className="op-tabs" role="tablist">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`op-tabs__item${activeTab === tab.id ? ' op-tabs__item--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="op-tabs__label op-tabs__label--full">
                    {tab.label} ({tab.count})
                  </span>
                  <span className="op-tabs__label op-tabs__label--short">
                    {tab.shortLabel} ({tab.count})
                  </span>
                </button>
              ))}
            </div>

            <div className="op-toolbar">
              <label className="op-search">
                <Search size={18} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  className="op-search__input"
                  placeholder="Поиск"
                  aria-label="Поиск по объектам"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
              <button type="button" className="op-filter-btn">
                <SlidersHorizontal size={18} strokeWidth={2} aria-hidden />
                Фильтр
              </button>
            </div>

            <div className="op-table-card">
              {propertiesLoading ? (
                <div className="op-table-state">Загрузка объектов…</div>
              ) : visibleProperties.length === 0 ? (
                <div className="op-table-state">
                  {properties.length === 0
                    ? 'У вас пока нет объектов. Добавьте первый объект.'
                    : 'Нет объектов по выбранному фильтру.'}
                </div>
              ) : (
              <>
              <div className="op-table-wrap op-desktop-only">
                <table className="op-table">
                  <thead>
                    <tr>
                      <th>Объект</th>
                      <th>Статус</th>
                      <th>Тип</th>
                      <th>Просмотры</th>
                      <th>Стоимость</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProperties.map((row) => (
                      <tr
                        key={row.id}
                        className="op-table__row--clickable"
                        onClick={() => openPropertyAnalytics(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openPropertyAnalytics(row.id)
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`Аналитика: ${row.title}`}
                      >
                        <td>
                          <div className="op-object-cell">
                            <img src={row.image} alt="" className="op-object-cell__thumb" loading="lazy" />
                            <div className="op-object-cell__text">
                              <p className="op-object-cell__title">{row.title}</p>
                              <p className="op-object-cell__meta">{row.location}</p>
                              <p className="op-object-cell__id">{row.displayId || row.id}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`op-status op-status--${row.statusKey}`}>{row.status}</span>
                        </td>
                        <td>
                          <ListingTypeBadge type={row.listingType} />
                        </td>
                        <td>
                          <div className="op-stat-cell">
                            <span className="op-stat-cell__value">{row.views}</span>
                            <DeltaText value={row.viewsDelta} up={row.viewsUp} />
                          </div>
                        </td>
                        <td>
                          <AmountCell row={row} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="op-mob-list op-mobile-only">
                {paginatedProperties.map((row) => (
                  <li
                    key={row.id}
                    className="op-mob-list__item op-mob-list__item--clickable"
                    onClick={() => openPropertyAnalytics(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openPropertyAnalytics(row.id)
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Аналитика: ${row.title}`}
                  >
                    <img src={row.image} alt="" className="op-mob-list__thumb" loading="lazy" />
                    <div className="op-mob-list__body">
                      <div className="op-mob-list__head">
                        <p className="op-mob-list__title">{row.title}</p>
                        <span className={`op-status op-status--${row.statusKey}`}>{row.status}</span>
                      </div>
                      <p className="op-mob-list__location">{row.location}</p>
                      <div className="op-mob-list__meta-row">
                        <ListingTypeBadge type={row.listingType} />
                      </div>
                      <div className="op-mob-list__amount">
                        <AmountCell row={row} />
                      </div>
                      <div className="op-mob-list__stats">
                        <span className="op-mob-list__stat">
                          <Eye size={14} strokeWidth={2} aria-hidden />
                          {row.views}
                          <DeltaText value={row.viewsDelta} up={row.viewsUp} />
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <PropertiesPagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                totalItems={visibleProperties.length}
                onPageChange={setCurrentPage}
              />
              </>
              )}
            </div>
          </div>

          <aside className="op-rail op-desktop-only">
            <section className="op-rail-card op-quick-analytics">
              <div className="op-rail-card__head">
                <h2>Быстрая аналитика</h2>
                <button type="button" className="op-select-pill">
                  Последние 30 дней
                  <ChevronDown size={14} />
                </button>
              </div>
              <ul className="op-quick-list">
                {QUICK_ANALYTICS.map((item) => (
                  <li key={item.label}>
                    <div className="op-quick-list__text">
                      <span className="op-quick-list__label">{item.label}</span>
                      <span className="op-quick-list__value">{item.value}</span>
                      <DeltaText value={item.delta} up={item.up} />
                    </div>
                    <MiniSpark variant={item.spark} />
                  </li>
                ))}
              </ul>
              <button type="button" className="op-link-btn">
                Перейти к аналитике
              </button>
            </section>

            <section className="op-rail-card op-rail-promo op-rail-promo--light">
              <div className="op-rail-promo__copy">
                <h2>Продвигайте свои объекты</h2>
                <p>Увеличьте просмотры и получайте больше броней с тарифами продвижения</p>
                <div className="op-rail-promo__actions">
                  <button type="button" className="op-btn op-btn--primary op-btn--sm op-rail-promo__cta">
                    Выбрать тариф
                  </button>
                  <div className="op-rail-promo__visual" aria-hidden>
                    <img src={OWNER_PROP_IMAGES.promoPromote} alt="" loading="lazy" decoding="async" />
                  </div>
                </div>
              </div>
            </section>

            <section className="op-rail-card op-rail-promo op-rail-promo--dark">
              <div className="op-rail-promo__copy">
                <h2>Ищете недвижимость для себя?</h2>
                <p>Переключитесь в режим покупателя и находите объекты по всему миру</p>
                <div className="op-rail-promo__actions op-rail-promo__actions--dark">
                  <button type="button" className="op-btn op-btn--white op-btn--sm op-rail-promo__cta">
                    Стать покупателем
                  </button>
                  <div className="op-rail-promo__visual op-rail-promo__visual--dark" aria-hidden>
                    <img
                      src={OWNER_PROP_IMAGES.promoBannerDark}
                      alt=""
                      className="op-rail-promo__img--house"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
  )

  if (isEmbedded) return mainColumn

  return (
    <div className={`op${menuOpen ? ' op--menu-open' : ''}`}>
      <header className="op-mob-topbar op-mobile-only" aria-label="Мобильная шапка">
        <div className="op-mob-topbar__slot op-mob-topbar__slot--left">
          <button
            type="button"
            className="op-mob-topbar__menu"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="op-mob-topbar__brand">
          <LogoMark />
          <span className="op-logo__text">SellYourBrick</span>
        </div>
        <div className="op-mob-topbar__slot op-mob-topbar__slot--right">
          <button type="button" className="op-mob-topbar__bell" aria-label="Уведомления">
            <Bell size={22} strokeWidth={2} />
            <span className="op-icon-btn__badge">2</span>
          </button>
        </div>
      </header>

      <div
        className="op-drawer-backdrop op-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`op-drawer op-mobile-only${menuOpen ? ' op-drawer--open' : ''}`}
        aria-label="Меню кабинета"
        aria-hidden={!menuOpen}
      >
        <div className="op-drawer__head">
          <div className="op-mob-topbar__brand">
            <LogoMark />
            <span className="op-logo__text">SellYourBrick</span>
          </div>
          <button type="button" className="op-drawer__close" aria-label="Закрыть меню" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="op-sidebar__divider op-sidebar__divider--drawer" aria-hidden />
        <nav className="op-nav op-nav--drawer">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>
      </aside>

      <aside className="op-sidebar op-desktop-only">
        <div className="op-sidebar__brand">
          <span className="op-logo__mark-slot" aria-hidden />
          <span className="op-logo__text">SellYourBrick</span>
        </div>
        <div className="op-sidebar__divider" aria-hidden />

        <nav className="op-nav" aria-label="Кабинет продавца">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>

        <div className="op-sidebar-promo">
          <p className="op-sidebar-promo__title">Станьте покупателем</p>
          <p className="op-sidebar-promo__text">Ищите и бронируйте недвижимость на платформе</p>
          <button type="button" className="op-btn op-btn--primary op-btn--sm">
            Стать покупателем
          </button>
          <img
            className="op-sidebar-promo__img"
            src={OWNER_PROP_IMAGES.promoSidebarBuyer}
            alt=""
            loading="lazy"
          />
        </div>

        <div className="op-sidebar-user">
          <span className="op-sidebar-user__avatar" aria-hidden>
            <svg viewBox="0 0 40 40">
              <defs>
                <linearGradient id="op-user-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#53d8d3" />
                  <stop offset="100%" stopColor="#089a95" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="20" fill="url(#op-user-grad)" />
              <circle cx="20" cy="16" r="7" fill="#f8fafc" />
              <ellipse cx="20" cy="34" rx="11" ry="8" fill="#f8fafc" />
            </svg>
          </span>
          <span className="op-sidebar-user__info">
            <span className="op-sidebar-user__name">{fullName}</span>
            <span className="op-sidebar-user__role">{roleLabel}</span>
          </span>
          <button type="button" className="op-sidebar-user__menu" aria-label="Меню профиля">
            <MoreVertical size={18} />
          </button>
        </div>
      </aside>

      {mainColumn}

      <nav className="op-tabbar op-mobile-only" aria-label="Нижняя навигация">
        {TAB_ITEMS.map((item) => {
          if (item.fab) {
            return (
              <div key="fab" className="op-tabbar__fab-slot">
                <Link to="/owner-add-property-test" className="op-tabbar__fab" aria-label="Добавить объект">
                  <Plus size={28} strokeWidth={2.5} />
                </Link>
              </div>
            )
          }
          const Icon = item.icon
          const className = `op-tabbar__item${item.active ? ' op-tabbar__item--active' : ''}`
          if (item.href) {
            return (
              <Link key={item.id} to={item.href} className={className}>
                <Icon size={22} strokeWidth={2} aria-hidden />
                <span>{item.label}</span>
              </Link>
            )
          }
          return (
            <button key={item.id} type="button" className={className}>
              <Icon size={22} strokeWidth={item.active ? 2.25 : 2} aria-hidden />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
