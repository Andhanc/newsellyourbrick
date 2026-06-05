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
  SlidersHorizontal,
  Menu,
  X,
} from 'lucide-react'
import { OSL_IMAGES } from './ownerSalesTestImages'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import {
  CLERK_DB_USER_SYNCED,
  OWNER_SALE_TYPE_LABELS,
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

function KeyVisual() {
  return (
    <svg className="osl-buyer-banner__key" viewBox="0 0 80 80" aria-hidden>
      <defs>
        <linearGradient id="osl-key-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94e8e4" />
          <stop offset="50%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <circle cx="28" cy="28" r="16" fill="url(#osl-key-grad)" />
      <circle cx="28" cy="28" r="8" fill="#f0fdfa" />
      <rect x="40" y="24" width="32" height="8" rx="4" fill="url(#osl-key-grad)" />
      <rect x="62" y="20" width="6" height="6" rx="2" fill="url(#osl-key-grad)" />
      <rect x="54" y="30" width="6" height="6" rx="2" fill="url(#osl-key-grad)" />
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

  const tabCounts = useMemo(() => countOwnerSalesByTab(sales), [sales])

  const filterTabs = useMemo(
    () => FILTER_TAB_DEFS.map((tab) => ({ ...tab, count: tabCounts[tab.id] ?? 0 })),
    [tabCounts]
  )

  const filteredRows = useMemo(
    () => filterOwnerSalesRows(sales, activeTab),
    [sales, activeTab]
  )

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
            <button type="button" className="osl-icon-btn" aria-label="Уведомления">
              <Bell size={20} strokeWidth={2} />
              <span className="osl-icon-btn__badge">3</span>
            </button>
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
              <button type="button" className="osl-filter-btn osl-desktop-only">
                <SlidersHorizontal size={16} strokeWidth={2} aria-hidden />
                Фильтр
                <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
              </button>
            </div>

            {salesLoading ? (
              <div className="osl-table-state">Загрузка продаж…</div>
            ) : filteredRows.length === 0 ? (
              <div className="osl-table-state">
                {sales.length === 0
                  ? 'Пока нет продаж с оплаченным резервом или завершённой покупкой.'
                  : 'Нет продаж по выбранному фильтру.'}
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
                      <th>Резерв 10%</th>
                      <th>Тип продажи</th>
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
                          <div className="osl-deal-cell">
                            <span className="osl-deal-cell__label">{row.dealLabel}</span>
                            <span className="osl-deal-cell__amount">{row.dealAmount}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`osl-reserve osl-reserve--${row.reservePaid ? 'paid' : 'unpaid'}`}
                          >
                            {row.reservePaid ? 'Оплачен' : 'Не оплачен'}
                          </span>
                        </td>
                        <td>
                          <span className={`osl-sale-type osl-sale-type--${row.saleType}`}>
                            {OWNER_SALE_TYPE_LABELS[row.saleType]}
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
                      <span className="osl-mob-list__deal-label">{row.dealLabel}</span>
                      <span className="osl-mob-list__deal-amount">{row.dealAmount}</span>
                    </p>
                    <div className="osl-mob-list__tags">
                      <span
                        className={`osl-reserve osl-reserve--${row.reservePaid ? 'paid' : 'unpaid'}`}
                      >
                        Резерв 10%: {row.reservePaid ? 'оплачен' : 'не оплачен'}
                      </span>
                      <span className={`osl-sale-type osl-sale-type--${row.saleType}`}>
                        {OWNER_SALE_TYPE_LABELS[row.saleType]}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
              </>
            )}

            <div className="osl-promo-grid">
              <article className="osl-promo-card osl-promo-card--light">
                <h3>Продвигайте объекты</h3>
                <p>Выделите объекты в каталоге и получайте больше заявок на покупку</p>
                <div className="osl-promo-card__actions">
                  <button type="button" className="osl-btn osl-btn--primary osl-btn--sm">
                    Выбрать тариф
                  </button>
                  <div className="osl-promo-card__visual" aria-hidden>
                    <img src={OSL_IMAGES.promoPremium} alt="" loading="lazy" decoding="async" />
                  </div>
                </div>
              </article>
              <article className="osl-promo-card osl-promo-card--dark">
                <h3>Ищете покупателей?</h3>
                <p>Откройте доступ к проверенной аудитории инвесторов по всему миру</p>
                <div className="osl-promo-card__actions osl-promo-card__actions--dark">
                  <button type="button" className="osl-btn osl-btn--white osl-btn--sm">
                    Узнать больше
                  </button>
                  <div className="osl-promo-card__visual osl-promo-card__visual--photo" aria-hidden>
                    <img src={OSL_IMAGES.promoSidebarBuyer} alt="" loading="lazy" decoding="async" />
                  </div>
                </div>
              </article>
            </div>

            <section className="osl-buyer-banner" aria-label="Стать покупателем">
              <div className="osl-buyer-banner__copy">
                <h2 className="osl-buyer-banner__title">Ищете недвижимость для себя?</h2>
                <p className="osl-buyer-banner__text">
                  Находите лучшие предложения на нашей платформе
                </p>
              </div>
              <div className="osl-buyer-banner__actions">
                <button type="button" className="osl-btn osl-btn--primary">
                  Стать покупателем
                </button>
                <KeyVisual />
              </div>
            </section>
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
          <button type="button" className="osl-mob-topbar__bell" aria-label="Уведомления">
            <Bell size={22} strokeWidth={2} />
            <span className="osl-icon-btn__badge">3</span>
          </button>
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
