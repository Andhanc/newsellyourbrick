import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Menu, X } from 'lucide-react'
import { OTD_IMAGES } from './ownerTestDriveImages'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import OwnerTestDriveDetailModal from '../components/OwnerTestDriveDetailModal'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import { OWNER_TEST_STANDALONE_HREF_MAP } from '../utils/ownerTestNav'
import {
  CLERK_DB_USER_SYNCED,
  countOwnerTestDriveByTab,
  fetchOwnerTestDriveBookings,
  filterOwnerTestDriveRows,
  getOwnerTestDriveUserId,
} from '../utils/ownerTestDriveList'
import './OwnerTestDrivePage.css'
import './OwnerTestDrivePage.mobile.css'

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
  const { t } = useTranslation()
  const { isEmbedded } = useOwnerTestEmbeddedNav()
  const navItems = useOwnerTestNavItems({
    activeId: 'testdrive',
    hrefMap: isEmbedded ? undefined : OWNER_TEST_STANDALONE_HREF_MAP,
  })
  const filterTabDefs = useMemo(
    () => [
      { id: 'all', label: t('ownerTest_testDriveTabAll') },
      { id: 'pending', label: t('ownerTest_testDriveTabPending') },
      { id: 'confirmed', label: t('ownerTest_testDriveTabConfirmed') },
      { id: 'cancelled', label: t('ownerTest_testDriveTabCancelled') },
    ],
    [t]
  )
  const datesColumnLabel = useMemo(
    () => t('ownerTestDriveModalDates', { start: '', end: '' }).replace(/\s*[:\u2014-].*$/, '').trim(),
    [t]
  )
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
    () => filterTabDefs.map((tab) => ({ ...tab, count: tabCounts[tab.id] ?? 0 })),
    [filterTabDefs, tabCounts]
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
          <h1 className="otd-header__title">{t('ownerTest_navTestDrive')}</h1>
          <div className="otd-header__actions">
            <OwnerSupportButton className="otd-icon-btn" />
            <OwnerNotificationsButton className="otd-icon-btn" badgeClassName="otd-icon-btn__badge" />
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div className="otd-workspace">
          <div className="otd-mob-pagehead otd-mobile-only">
            <h1 className="otd-mob-pagehead__title">{t('ownerTest_navTestDrive')}</h1>
          </div>

          <div className="otd-content">
          <div className="otd-tabs-row">
            <div className="otd-tabs" role="tablist" aria-label={t('ownerTest_chartFilterTestDrives')}>
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
          </div>

          <div className="otd-table-card">
            {bookingsLoading ? (
              <div className="otd-table-state">{t('ownerSalesLoading')}</div>
            ) : filteredRows.length === 0 ? (
              <div className="otd-table-state">
                {bookings.length === 0
                  ? t('ownerTestDriveEmptyText')
                  : t('ownerTest_propertiesEmptyFilter')}
              </div>
            ) : (
            <div className="otd-table-wrap">
              <table className="otd-table">
                <thead>
                  <tr>
                    <th>{t('oap_wizardStepObject')}</th>
                    <th>{t('ownerTestDriveBuyer')}</th>
                    <th>{datesColumnLabel}</th>
                    <th>{t('depositButton_label')}</th>
                    <th>{t('buyerCabinet_billingStatus')}</th>
                    <th aria-label={t('ownerTest_notificationsOpen')} />
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
                      aria-label={`${t('ownerTest_notificationsOpen')} ${row.displayId}`}
                    >
                      <td>
                        <div className="otd-object-cell">
                          <img
                            src={row.image}
                            alt=""
                            className="otd-object-cell__thumb"
                            loading="lazy"
                          />
                          <span className="otd-object-cell__text">
                            <span className="otd-object-cell__title">{row.title}</span>
                            <span className="otd-object-cell__meta">
                              {row.propertyId ? `ID: ${row.propertyId}` : row.location}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="otd-buyer">{row.buyer}</span>
                      </td>
                      <td>
                        <span className="otd-dates">{row.dates}</span>
                      </td>
                      <td>
                        <span
                          className={`otd-amount${row.statusKey === 'confirmed' ? ' otd-amount--positive' : ''}`}
                        >
                          {row.amount}
                        </span>
                      </td>
                      <td>
                        <div className="otd-status-cell">
                          <span className={`otd-status otd-status--${row.statusKey}`}>{row.status}</span>
                          {row.checkInStatus === 'checked_in' ? (
                            <span className="otd-status otd-status--checked-in">{row.checkInStatusLabel}</span>
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
        </div>
        </div>
      </div>
  )

  if (isEmbedded) {
    return <div className="otd otd--embedded">{mainColumn}</div>
  }

  return (
    <div className={`otd${menuOpen ? ' otd--menu-open' : ''}`}>
      <header className="otd-mob-topbar otd-mobile-only" aria-label={t('ownerTest_ariaMobileHeader')}>
        <div className="otd-mob-topbar__slot otd-mob-topbar__slot--left">
          <button
            type="button"
            className="otd-mob-topbar__menu"
            aria-label={t('ownerTest_ariaOpenMenu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="otd-mob-topbar__brand">
          <LogoMark />
          <span className="otd-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="otd-mob-topbar__slot otd-mob-topbar__slot--right">
          <OwnerSupportButton className="otd-mob-topbar__bell" iconSize={22} />
          <OwnerNotificationsButton
            className="otd-mob-topbar__bell"
            badgeClassName="otd-icon-btn__badge"
            iconSize={22}
          />
        </div>
      </header>

      <div
        className="otd-drawer-backdrop otd-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`otd-drawer otd-mobile-only${menuOpen ? ' otd-drawer--open' : ''}`}
        aria-label={t('ownerTest_ariaCabinetMenu')}
        aria-hidden={!menuOpen}
      >
        <div className="otd-drawer__head">
          <div className="otd-mob-topbar__brand">
            <LogoMark />
            <span className="otd-logo__text">{t('ownerTest_brandName')}</span>
          </div>
          <button type="button" className="otd-drawer__close" aria-label={t('ownerTest_ariaCloseMenu')} onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="otd-sidebar__divider otd-sidebar__divider--drawer" aria-hidden />
        <nav className="otd-nav otd-nav--drawer">
          {navItems.map(renderNavItem)}
        </nav>
      </aside>

      <aside className="otd-sidebar otd-desktop-only">
        <div className="otd-sidebar__brand">
          <LogoMark />
          <span className="otd-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="otd-sidebar__divider" aria-hidden />

        <nav className="otd-nav" aria-label={t('ownerTest_ariaSellerCabinet')}>
          {navItems.map(renderNavItem)}
        </nav>

        <div className="otd-sidebar-promo">
          <p className="otd-sidebar-promo__title">{t('heroPitchBecomeBuyerCta')}</p>
          <p className="otd-sidebar-promo__text">{t('heroPitchBecomeBuyerBody')}</p>
          <button type="button" className="otd-btn otd-btn--primary otd-btn--sm">
            {t('heroPitchBecomeBuyerCta')}
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
