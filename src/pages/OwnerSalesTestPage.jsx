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
  DollarSign,
  SlidersHorizontal,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react'
import { OSL_IMAGES } from './ownerSalesTestImages'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import { OwnerBuyerAd } from '../components/OwnerAds'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import {
  CLERK_DB_USER_SYNCED,
  countOwnerSalesByTab,
  fetchOwnerSales,
  filterOwnerSalesRows,
  getOwnerSalesUserId,
} from '../utils/ownerSalesList'
import './OwnerSalesTestPage.css'
import './OwnerSalesTestPage.mobile.css'

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard, href: '/main-owner-test' },
  { id: 'properties', label: 'Мои объекты', icon: Building2, href: '/owner-properties-test' },
  { id: 'bookings', label: 'Брони', icon: CalendarCheck },
  { id: 'sales', label: 'Продажи', icon: ShoppingBag, active: true },
  { id: 'testdrive', label: 'Тест-драйв', icon: Car, href: '/owner-test-drive' },
  { id: 'subscriptions', label: 'Подписки', icon: CreditCard, href: '/owner-subscriptions-test' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: 3 },
  { id: 'settings', label: 'Настройки', icon: Settings, href: '/owner-profile-test' },
]

const FILTER_TAB_DEFS = [
  { id: 'all', label: 'Все', shortLabel: 'Все' },
  { id: 'completed', label: 'Завершенные', shortLabel: 'Подтвержденные' },
  { id: 'in_progress', label: 'В процессе', shortLabel: 'В процессе' },
  { id: 'cancelled', label: 'Отмененные', shortLabel: 'Отмененные' },
]

const DESIGN_SALES_ROWS = [
  {
    id: 'demo-sale-1',
    title: 'Апартаменты в центре',
    location: 'Лос-Анджелес, США',
    image: OSL_IMAGES.thumbVilla,
    buyer: 'John Smith',
    dealAmount: '$850 000',
    saleDate: '12 мая 2024',
    statusLabel: 'Завершено',
    statusTone: 'completed',
    tab: 'completed',
  },
  {
    id: 'demo-sale-2',
    title: 'Вилла в пригороде',
    location: 'Лос-Анджелес, США',
    image: OSL_IMAGES.thumbApartment,
    buyer: 'Michael Brown',
    dealAmount: '$1 250 000',
    saleDate: '8 мая 2024',
    statusLabel: 'В процессе',
    statusTone: 'in-progress',
    tab: 'in_progress',
  },
  {
    id: 'demo-sale-3',
    title: 'Коммерческая недвижимость',
    location: 'Москва, Россия',
    image: OSL_IMAGES.thumbLoft,
    buyer: 'Robert Johnson',
    dealAmount: '$950 000',
    saleDate: '5 мая 2024',
    statusLabel: 'Завершено',
    statusTone: 'completed',
    tab: 'completed',
  },
  {
    id: 'demo-sale-4',
    title: 'Вилла у моря',
    location: 'Малибу, США',
    image: OSL_IMAGES.thumbPenthouse,
    buyer: 'Emily Johnson',
    dealAmount: '$2 450 000',
    saleDate: '2 мая 2024',
    statusLabel: 'В ожидании',
    statusTone: 'pending',
    tab: 'pending',
  },
  {
    id: 'demo-sale-5',
    title: 'Пентхаус у моря',
    location: 'Майами, США',
    image: OSL_IMAGES.thumbVilla,
    buyer: 'James Wilson',
    dealAmount: '$780 000',
    saleDate: '30 апр 2024',
    statusLabel: 'Отменено',
    statusTone: 'cancelled',
    tab: 'cancelled',
  },
]

function formatSaleDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getRowStatus(row) {
  if (row.statusLabel && row.statusTone) return row
  if (row.tab === 'completed') {
    return { ...row, statusLabel: 'Завершено', statusTone: 'completed' }
  }
  if (row.tab === 'cancelled') {
    return { ...row, statusLabel: 'Отменено', statusTone: 'cancelled' }
  }
  return { ...row, statusLabel: 'В процессе', statusTone: 'in-progress' }
}

function parseSaleAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value || '').replace(/[^\d.,-]/g, '').replace(',', '.')
  const amount = Number.parseFloat(normalized.replace(/\.(?=.*\.)/g, ''))
  return Number.isFinite(amount) ? amount : 0
}

function formatTotalSalesAmount(value) {
  return `$${value.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}`
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`osl-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="osl-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#osl-logo-grad)" />
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

export default function OwnerSalesTestPage() {
  const { isEmbedded } = useOwnerTestEmbeddedNav()
  const [activeTab, setActiveTab] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [sales, setSales] = useState([])
  const [salesLoading, setSalesLoading] = useState(true)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const loadSales = useCallback(async () => {
    const userId = getOwnerSalesUserId()
    if (!userId) {
      setSales([])
      setSalesLoading(false)
      return
    }

    setSalesLoading(true)
    try {
      const rows = await fetchOwnerSales(userId)
      setSales(rows)
    } catch (error) {
      console.warn('OwnerSalesTestPage: не удалось загрузить продажи', error)
      setSales([])
    } finally {
      setSalesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSales()
  }, [loadSales])

  useEffect(() => {
    const onUserSynced = () => loadSales()
    window.addEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
    return () => window.removeEventListener(CLERK_DB_USER_SYNCED, onUserSynced)
  }, [loadSales])

  const displayRows = useMemo(() => {
    const sourceRows = sales.length > 0 ? sales : DESIGN_SALES_ROWS
    return sourceRows.map((row) =>
      getRowStatus({
        ...row,
        saleDate: row.saleDate || formatSaleDate(row.raw?.sold_at || row.raw?.created_at),
      })
    )
  }, [sales])

  const tabCounts = useMemo(() => countOwnerSalesByTab(displayRows), [displayRows])

  const filterTabs = useMemo(
    () => FILTER_TAB_DEFS.map((tab) => ({ ...tab, count: tabCounts[tab.id] ?? 0 })),
    [tabCounts]
  )

  const filteredRows = useMemo(
    () => filterOwnerSalesRows(displayRows, activeTab),
    [displayRows, activeTab]
  )

  const salesSummary = useMemo(() => {
    const total = displayRows.reduce((sum, row) => sum + parseSaleAmount(row.dealAmount), 0)
    const completed = displayRows.filter((row) => row.statusTone === 'completed').length
    return {
      total: formatTotalSalesAmount(total),
      deals: displayRows.length,
      completed,
    }
  }, [displayRows])

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `osl-nav__item${active ? ' osl-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="osl-nav__badge">{badge}</span>}
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
    document.documentElement.classList.add('osl-page-active')
    return () => document.documentElement.classList.remove('osl-page-active')
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
      <div className="osl-body">
        <header className="osl-header osl-desktop-only">
          <h1 className="osl-header__title">Продажи</h1>
          <div className="osl-header__actions">
            <OwnerNotificationsButton className="osl-icon-btn" badgeClassName="osl-icon-btn__badge" />
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div className="osl-workspace">
          <div className="osl-mob-pagehead osl-mobile-only">
            <h1 className="osl-mob-pagehead__title">Продажи</h1>
            <button type="button" className="osl-mob-filter-btn" aria-label="Фильтр">
              <SlidersHorizontal size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="osl-content">
            <div className="osl-tabs-row">
              <div className="osl-tabs" role="tablist" aria-label="Фильтр продаж">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={[
                      'osl-tabs__item',
                      activeTab === tab.id && 'osl-tabs__item--active',
                      tab.id === 'cancelled' && 'osl-tabs__item--desktop-only',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="osl-tabs__label--full">
                      {tab.label} ({tab.count})
                    </span>
                    <span className="osl-tabs__label--short">
                      {tab.shortLabel} ({tab.count})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <section className="osl-sales-summary" aria-label="Общая сумма продаж">
              <div className="osl-sales-summary__icon" aria-hidden>
                <DollarSign size={22} strokeWidth={2.3} />
              </div>
              <div className="osl-sales-summary__copy">
                <span className="osl-sales-summary__label">Общая сумма продаж</span>
                <strong className="osl-sales-summary__value">{salesSummary.total}</strong>
              </div>
              <div className="osl-sales-summary__meta">
                <span className="osl-sales-summary__pill">
                  <TrendingUp size={14} strokeWidth={2.3} aria-hidden />
                  {salesSummary.deals} сделок
                </span>
                <span className="osl-sales-summary__hint">{salesSummary.completed} завершено</span>
              </div>
            </section>

            {filteredRows.length === 0 ? (
              <div className="osl-table-state">
                {salesLoading ? 'Загрузка продаж…' : 'Нет продаж по выбранному фильтру.'}
              </div>
            ) : (
              <>
            <div className="osl-table-card osl-desktop-only">
              <div className="osl-table-wrap">
                <table className="osl-table">
                  <thead>
                    <tr>
                      <th>Объект</th>
                      <th>Покупатель</th>
                      <th>Сумма</th>
                      <th>Дата продажи</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="osl-object-cell">
                            <img
                              src={row.image}
                              alt=""
                              className="osl-object-cell__thumb"
                              loading="lazy"
                            />
                            <div className="osl-object-cell__text">
                              <p className="osl-object-cell__title">{row.title}</p>
                              <p className="osl-object-cell__meta">{row.location}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="osl-buyer">{row.buyer}</span>
                        </td>
                        <td>
                          <span className="osl-amount">{row.dealAmount}</span>
                        </td>
                        <td>
                          <span className="osl-sale-date">{row.saleDate}</span>
                        </td>
                        <td>
                          <span className={`osl-status osl-status--${row.statusTone}`}>
                            {row.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <ul className="osl-mob-list osl-mobile-only">
              {filteredRows.map((row) => (
                <li key={row.id} className="osl-mob-list__item">
                  <img src={row.image} alt="" className="osl-mob-list__thumb" loading="lazy" />
                  <div className="osl-mob-list__body">
                    <p className="osl-mob-list__title">{row.title}</p>
                    <p className="osl-mob-list__meta">{row.buyer}</p>
                    <p className="osl-mob-list__deal">
                      <span className="osl-mob-list__deal-label">{row.saleDate}</span>
                      <span className="osl-mob-list__deal-amount">{row.dealAmount}</span>
                    </p>
                    <div className="osl-mob-list__tags">
                      <span className={`osl-status osl-status--${row.statusTone}`}>
                        {row.statusLabel}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
              </>
            )}

            <OwnerBuyerAd className="osl-owner-buyer-ad" />
          </div>
        </div>
      </div>
  )

  if (isEmbedded) return mainColumn

  return (
    <div className={`osl${menuOpen ? ' osl--menu-open' : ''}`}>
      <header className="osl-mob-topbar osl-mobile-only" aria-label="Мобильная шапка">
        <div className="osl-mob-topbar__slot osl-mob-topbar__slot--left">
          <button
            type="button"
            className="osl-mob-topbar__menu"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="osl-mob-topbar__brand">
          <LogoMark />
          <span className="osl-logo__text">SellYourBrick</span>
        </div>
        <div className="osl-mob-topbar__slot osl-mob-topbar__slot--right">
          <OwnerNotificationsButton
            className="osl-mob-topbar__bell"
            badgeClassName="osl-icon-btn__badge"
            iconSize={22}
          />
        </div>
      </header>

      <div
        className="osl-drawer-backdrop osl-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`osl-drawer osl-mobile-only${menuOpen ? ' osl-drawer--open' : ''}`}
        aria-label="Меню кабинета"
        aria-hidden={!menuOpen}
      >
        <div className="osl-drawer__head">
          <div className="osl-mob-topbar__brand">
            <LogoMark />
            <span className="osl-logo__text">SellYourBrick</span>
          </div>
          <button type="button" className="osl-drawer__close" aria-label="Закрыть меню" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="osl-sidebar__divider osl-sidebar__divider--drawer" aria-hidden />
        <nav className="osl-nav osl-nav--drawer">{NAV_ITEMS.map(renderNavItem)}</nav>
      </aside>

      <aside className="osl-sidebar osl-desktop-only">
        <div className="osl-sidebar__brand">
          <span className="osl-logo__mark-slot" aria-hidden />
          <span className="osl-logo__text">SellYourBrick</span>
        </div>
        <div className="osl-sidebar__divider" aria-hidden />

        <nav className="osl-nav" aria-label="Кабинет продавца">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>

        <div className="osl-sidebar-promo">
          <p className="osl-sidebar-promo__title">Станьте покупателем</p>
          <p className="osl-sidebar-promo__text">Ищите и бронируйте недвижимость на платформе</p>
          <button type="button" className="osl-btn osl-btn--primary osl-btn--sm">
            Стать покупателем
          </button>
          <img
            className="osl-sidebar-promo__img"
            src={OSL_IMAGES.promoSidebarBuyer}
            alt=""
            loading="lazy"
          />
        </div>
      </aside>

      {mainColumn}
    </div>
  )
}
