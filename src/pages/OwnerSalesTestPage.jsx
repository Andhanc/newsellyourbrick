import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DollarSign,
  SlidersHorizontal,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react'
import { OSL_IMAGES } from './ownerSalesTestImages'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import { AD_IMAGES, OwnerBuyerAd } from '../components/OwnerAds'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import { getOwnerTestIntlLocale } from '../utils/ownerTestI18n'
import { OWNER_TEST_STANDALONE_HREF_MAP } from '../utils/ownerTestNav'
import {
  CLERK_DB_USER_SYNCED,
  countOwnerSalesByTab,
  fetchOwnerSales,
  filterOwnerSalesRows,
  getOwnerSalesUserId,
} from '../utils/ownerSalesList'
import './OwnerSalesTestPage.css'
import './OwnerSalesTestPage.mobile.css'

const DESIGN_SALES_ROWS = [
  {
    id: 'demo-sale-1',
    title: 'Апартаменты в центре',
    location: 'Лос-Анджелес, США',
    image: OSL_IMAGES.thumbVilla,
    buyer: 'John Smith',
    dealAmount: '850 000 €',
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
    dealAmount: '1 250 000 €',
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
    dealAmount: '950 000 €',
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
    dealAmount: '2 450 000 €',
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
    dealAmount: '780 000 €',
    saleDate: '30 апр 2024',
    statusLabel: 'Отменено',
    statusTone: 'cancelled',
    tab: 'cancelled',
  },
]

function formatSaleDate(value, locale) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getRowStatus(row, t) {
  if (row.tab === 'completed') {
    return { ...row, statusLabel: t('ownerTest_salesStatusCompleted'), statusTone: 'completed' }
  }
  if (row.tab === 'cancelled') {
    return { ...row, statusLabel: t('ownerTest_salesStatusCancelled'), statusTone: 'cancelled' }
  }
  if (row.tab === 'pending') {
    return { ...row, statusLabel: t('ownerTest_salesStatusPending'), statusTone: 'pending' }
  }
  if (row.statusLabel && row.statusTone) return row
  return { ...row, statusLabel: t('ownerTest_salesStatusInProgress'), statusTone: 'in-progress' }
}

function parseSaleAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const normalized = String(value || '').replace(/[^\d.,-]/g, '').replace(',', '.')
  const amount = Number.parseFloat(normalized.replace(/\.(?=.*\.)/g, ''))
  return Number.isFinite(amount) ? amount : 0
}

function formatTotalSalesAmount(value, locale) {
  return `${value.toLocaleString(locale, { maximumFractionDigits: 0 })} €`
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`osl-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="osl-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#33adbb" />
          <stop offset="100%" stopColor="#007d8a" />
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
        fontFamily="Montserrat, sans-serif"
      >
        $
      </text>
    </svg>
  )
}

export default function OwnerSalesTestPage() {
  const { t, i18n } = useTranslation()
  const intlLocale = useMemo(() => getOwnerTestIntlLocale(i18n.language), [i18n.language])
  const { isEmbedded } = useOwnerTestEmbeddedNav()
  const navItems = useOwnerTestNavItems({
    activeId: 'sales',
    hrefMap: isEmbedded ? undefined : OWNER_TEST_STANDALONE_HREF_MAP,
  })
  const filterTabDefs = useMemo(
    () => [
      { id: 'all', label: t('ownerTest_salesTabAll'), shortLabel: t('ownerTest_salesTabAll') },
      {
        id: 'completed',
        label: t('ownerTest_salesTabCompleted'),
        shortLabel: t('ownerTest_salesTabCompletedShort'),
      },
      {
        id: 'in_progress',
        label: t('ownerTest_salesTabInProgress'),
        shortLabel: t('ownerTest_salesTabInProgress'),
      },
      {
        id: 'cancelled',
        label: t('ownerTest_salesTabCancelled'),
        shortLabel: t('ownerTest_salesTabCancelled'),
      },
    ],
    [t]
  )
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
      getRowStatus(
        {
          ...row,
          saleDate: row.saleDate || formatSaleDate(row.raw?.sold_at || row.raw?.created_at, intlLocale),
        },
        t
      )
    )
  }, [sales, intlLocale, t])

  const tabCounts = useMemo(() => countOwnerSalesByTab(displayRows), [displayRows])

  const filterTabs = useMemo(
    () => filterTabDefs.map((tab) => ({ ...tab, count: tabCounts[tab.id] ?? 0 })),
    [filterTabDefs, tabCounts]
  )

  const filteredRows = useMemo(
    () => filterOwnerSalesRows(displayRows, activeTab),
    [displayRows, activeTab]
  )

  const salesSummary = useMemo(() => {
    const total = displayRows.reduce((sum, row) => sum + parseSaleAmount(row.dealAmount), 0)
    const completed = displayRows.filter((row) => row.statusTone === 'completed').length
    return {
      total: formatTotalSalesAmount(total, intlLocale),
      deals: displayRows.length,
      completed,
    }
  }, [displayRows, intlLocale])

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
          <h1 className="osl-header__title">{t('ownerTest_navSales')}</h1>
          <div className="osl-header__actions">
            <OwnerSupportButton className="osl-icon-btn" />
            <OwnerNotificationsButton className="osl-icon-btn" badgeClassName="osl-icon-btn__badge" />
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div className="osl-workspace">
          {isEmbedded ? (
            <div className="osl-mob-pagehead osl-mobile-only">
              <h1 className="osl-mob-pagehead__title">{t('ownerTest_navSales')}</h1>
              <button type="button" className="osl-mob-filter-btn" aria-label={t('ownerTest_salesFilterAria')}>
                <SlidersHorizontal size={20} strokeWidth={2} />
              </button>
            </div>
          ) : null}

          <div className="osl-content">
            <div className="osl-tabs-row">
              <div className="osl-tabs" role="tablist" aria-label={t('ownerTest_ariaSalesFilter')}>
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

            <section className="osl-sales-summary osl-desktop-only" aria-label={t('ownerTest_ariaSalesTotal')}>
              <div className="osl-sales-summary__icon" aria-hidden>
                <DollarSign size={22} strokeWidth={2.3} />
              </div>
              <div className="osl-sales-summary__copy">
                <span className="osl-sales-summary__label">{t('ownerTest_ariaSalesTotal')}</span>
                <strong className="osl-sales-summary__value">{salesSummary.total}</strong>
              </div>
              <div className="osl-sales-summary__meta">
                <span className="osl-sales-summary__pill">
                  <TrendingUp size={14} strokeWidth={2.3} aria-hidden />
                  {salesSummary.deals} {t('ownerTest_profileStatSales').toLowerCase()}
                </span>
                <span className="osl-sales-summary__hint">
                  {salesSummary.completed} {t('ownerTest_profileStatDeals')}
                </span>
              </div>
            </section>

            <div className="osl-table-card osl-desktop-only">
              {salesLoading || filteredRows.length === 0 ? (
                <div className="osl-table-state">
                  {salesLoading ? t('ownerSalesLoading') : t('ownerTest_salesEmptyFilter')}
                </div>
              ) : (
                <div className="osl-table-wrap">
                  <table className="osl-table">
                    <thead>
                      <tr>
                        <th>{t('oap_wizardStepObject')}</th>
                        <th>{t('ownerTestDriveBuyer')}</th>
                        <th>{t('ownerSaleCelebrationSumLabel')}</th>
                        <th>{t('ownerAnalyticsSaleDateLabel').replace(':', '').trim()}</th>
                        <th>{t('buyerCabinet_billingStatus')}</th>
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
                              <span className="osl-object-cell__text">
                                <span className="osl-object-cell__title">{row.title}</span>
                                <span className="osl-object-cell__meta">
                                  {row.propertyId ? `ID: ${row.propertyId}` : row.location}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="osl-buyer">{row.buyer}</span>
                          </td>
                          <td>
                            <span
                              className={`osl-amount${row.statusTone === 'completed' ? ' osl-amount--positive' : ''}`}
                            >
                              {row.dealAmount}
                            </span>
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
              )}
            </div>

            <div className="osl-table-card osl-mobile-only">
              {salesLoading || filteredRows.length === 0 ? (
                <div className="osl-table-state">
                  {salesLoading ? t('ownerSalesLoading') : t('ownerTest_salesEmptyFilter')}
                </div>
              ) : (
                <ul className="osl-mob-list">
                  {filteredRows.map((row) => (
                    <li key={row.id} className="osl-mob-list__item">
                      <img src={row.image} alt="" className="osl-mob-list__thumb" loading="lazy" />
                      <div className="osl-mob-list__body">
                        <p className="osl-mob-list__title">{row.title}</p>
                        <p className="osl-mob-list__meta">{row.buyer}</p>
                        <p className="osl-mob-list__date">{row.saleDate}</p>
                      </div>
                      <span
                        className={`osl-mob-list__amount${row.statusTone === 'completed' ? ' osl-mob-list__amount--positive' : ''}`}
                      >
                        {row.dealAmount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <OwnerBuyerAd className="osl-owner-buyer-ad" imageSrc={AD_IMAGES.buyerMobile} />
          </div>
        </div>
      </div>
  )

  if (isEmbedded) {
    return <div className="osl osl--embedded">{mainColumn}</div>
  }

  return (
    <div className={`osl${menuOpen ? ' osl--menu-open' : ''}`}>
      <header className="osl-mob-topbar osl-mobile-only" aria-label={t('ownerTest_ariaMobileHeader')}>
        <div className="osl-mob-topbar__slot osl-mob-topbar__slot--left">
          <button
            type="button"
            className="osl-mob-topbar__menu"
            aria-label={t('ownerTest_ariaOpenMenu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <h1 className="osl-mob-topbar__title">{t('ownerTest_navSales')}</h1>
        <div className="osl-mob-topbar__slot osl-mob-topbar__slot--right">
          <button type="button" className="osl-mob-filter-btn osl-mob-filter-btn--topbar" aria-label={t('ownerTest_salesFilterAria')}>
            <SlidersHorizontal size={20} strokeWidth={2} />
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
        aria-label={t('ownerTest_ariaCabinetMenu')}
        aria-hidden={!menuOpen}
      >
        <div className="osl-drawer__head">
          <div className="osl-mob-topbar__brand">
            <LogoMark />
            <span className="osl-logo__text">{t('ownerTest_brandName')}</span>
          </div>
          <button type="button" className="osl-drawer__close" aria-label={t('ownerTest_ariaCloseMenu')} onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="osl-sidebar__divider osl-sidebar__divider--drawer" aria-hidden />
        <nav className="osl-nav osl-nav--drawer">{navItems.map(renderNavItem)}</nav>
      </aside>

      <aside className="osl-sidebar osl-desktop-only">
        <div className="osl-sidebar__brand">
          <LogoMark />
          <span className="osl-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="osl-sidebar__divider" aria-hidden />

        <nav className="osl-nav" aria-label={t('ownerTest_ariaSellerCabinet')}>
          {navItems.map(renderNavItem)}
        </nav>

        <div className="osl-sidebar-promo">
          <p className="osl-sidebar-promo__title">{t('heroPitchBecomeBuyerCta')}</p>
          <p className="osl-sidebar-promo__text">{t('heroPitchBecomeBuyerBody')}</p>
          <button type="button" className="osl-btn osl-btn--primary osl-btn--sm">
            {t('heroPitchBecomeBuyerCta')}
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
