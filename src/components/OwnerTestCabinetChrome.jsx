import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, Plus } from 'lucide-react'
import OwnerTestProfileMenu from './OwnerTestProfileMenu'
import OwnerCabinetLogoMark from './OwnerCabinetLogoMark'
import OwnerNotificationsButton from './OwnerNotificationsButton'
import OwnerProfileCompletionBanner from './OwnerProfileCompletionBanner'
import OwnerSupportButton from './OwnerSupportButton'
import { useOwnerTestNav } from '../context/OwnerTestNavigationContext'
import { useOwnerTestNavItems, useOwnerTestTabItems } from '../hooks/useOwnerTestNavItems'
import {
  isNavItemActive,
  isTabItemActive,
  isTabbarView,
  NAV_ID_TO_VIEW,
  OWNER_VIEWS,
} from '../utils/ownerTestNav'
import './OwnerTestCabinetChrome.css'

function LogoMark({ className = '' }) {
  return <OwnerCabinetLogoMark className={`otc-logo__mark ${className}`.trim()} />
}

export default function OwnerTestCabinetChrome({ children }) {
  const { t } = useTranslation()
  const { view, goTo } = useOwnerTestNav()
  const navItems = useOwnerTestNavItems()
  const tabItems = useOwnerTestTabItems()
  const [menuOpen, setMenuOpen] = useState(false)
  const showTabbar = isTabbarView(view)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const handleNavClick = useCallback(
    (navId) => {
      const target = NAV_ID_TO_VIEW[navId]
      if (target) goTo(target)
      closeMenu()
    },
    [goTo, closeMenu]
  )

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, badge, href }) => {
      const active = isNavItemActive(id, view)
      const className = `otc-nav__item${active ? ' otc-nav__item--active' : ''}`
      const target = NAV_ID_TO_VIEW[id]
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="otc-nav__badge">{badge}</span>}
        </>
      )

      if (href) {
        return (
          <Link key={id} to={href} className={className} onClick={closeMenu}>
            {inner}
          </Link>
        )
      }

      if (target) {
        return (
          <button key={id} type="button" className={className} onClick={() => handleNavClick(id)}>
            {inner}
          </button>
        )
      }

      return (
        <button key={id} type="button" className={className} onClick={closeMenu}>
          {inner}
        </button>
      )
    },
    [view, handleNavClick, closeMenu]
  )

  return (
    <div className={`otc${menuOpen ? ' otc--menu-open' : ''}${showTabbar ? ' otc--tabbar' : ''}`}>
      <header className="otc-mob-topbar otc-mobile-only" aria-label={t('ownerTest_ariaMobileHeader')}>
        <div className="otc-mob-topbar__brand">
          <LogoMark />
          <span className="otc-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="otc-mob-topbar__slot otc-mob-topbar__slot--right">
          <OwnerSupportButton className="otc-mob-topbar__bell" iconSize={22} />
          <OwnerNotificationsButton
            className="otc-mob-topbar__bell"
            badgeClassName="otc-icon-btn__badge"
            iconSize={22}
          />
          <OwnerTestProfileMenu className="otpm--topbar-compact" />
        </div>
      </header>

      <div
        className="otc-drawer-backdrop otc-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`otc-drawer otc-mobile-only${menuOpen ? ' otc-drawer--open' : ''}`}
        aria-label={t('ownerTest_ariaCabinetMenu')}
        aria-hidden={!menuOpen}
      >
        <div className="otc-drawer__head">
          <div className="otc-sidebar__brand otc-sidebar__brand--drawer">
            <LogoMark />
            <span className="otc-logo__text">{t('ownerTest_brandName')}</span>
          </div>
          <button type="button" className="otc-drawer__close" aria-label={t('ownerTest_ariaCloseMenu')} onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="otc-sidebar__divider otc-sidebar__divider--drawer" aria-hidden />
        <nav className="otc-nav otc-nav--drawer">
          {navItems.map(renderNavItem)}
          <OwnerProfileCompletionBanner onNavigate={closeMenu} />
        </nav>
      </aside>

      <aside className="otc-sidebar otc-desktop-only">
        <div className="otc-sidebar__brand">
          <LogoMark />
          <span className="otc-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="otc-sidebar__divider" aria-hidden />
        <nav className="otc-nav" aria-label={t('ownerTest_ariaSellerCabinet')}>
          {navItems.map(renderNavItem)}
          <OwnerProfileCompletionBanner />
        </nav>
      </aside>

      <div className="otc-stage">{children}</div>

      {showTabbar && (
        <nav className="otc-tabbar otc-mobile-only" aria-label={t('ownerTest_ariaBottomNav')}>
          {tabItems.map((item) => {
            if (item.fab) {
              return (
                <div key="fab" className="otc-tabbar__fab-slot">
                  <button
                    type="button"
                    className="otc-tabbar__fab"
                    aria-label={t('ownerTest_ariaAddProperty')}
                    onClick={() => goTo(OWNER_VIEWS.ADD_PROPERTY)}
                  >
                    <Plus size={28} strokeWidth={2.5} />
                  </button>
                </div>
              )
            }
            const Icon = item.icon
            const active = isTabItemActive(item.id, view)
            const target = NAV_ID_TO_VIEW[item.id]
            return (
              <button
                key={item.id}
                type="button"
                className={`otc-tabbar__item${active ? ' otc-tabbar__item--active' : ''}`}
                onClick={() => {
                  if (item.id === 'more') {
                    setMenuOpen(true)
                    return
                  }
                  if (target) goTo(target)
                }}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 2} aria-hidden />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      )}

    </div>
  )
}
