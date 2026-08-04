import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser, useClerk } from '@clerk/clerk-react'
import { ArrowRight, Building2, LogOut, Plus, X } from 'lucide-react'
import OwnerTestProfileMenu, { performOwnerTestLogout } from './OwnerTestProfileMenu'
import OwnerNotificationsButton from './OwnerNotificationsButton'
import OwnerProfileCompletionBanner from './OwnerProfileCompletionBanner'
import OwnerSupportButton from './OwnerSupportButton'
import SiteChatDock from './SiteChatDock'
import { useOwnerTestNav } from '../context/OwnerTestNavigationContext'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import { openOwnerManagerChat } from '../utils/ownerCabinetChat'
import {
  isNavItemActive,
  NAV_ID_TO_VIEW,
  OWNER_VIEWS,
} from '../utils/ownerTestNav'
import {
  readPendingSellPurchasedProperty,
} from '../utils/purchasedPropertyListingPrefill'
import './OwnerTestCabinetChrome.css'

function BrandLogo({ className = '' }) {
  return (
    <div className={`otc-wordmark${className ? ` ${className}` : ''}`} aria-label="Sell Your Brick">
      <span>Sell</span>
      <span className="otc-wordmark__accent">Your</span>
      <span>Brick</span>
    </div>
  )
}

export default function OwnerTestCabinetChrome({ children }) {
  const { t } = useTranslation()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { view, goTo } = useOwnerTestNav()
  const navItems = useOwnerTestNavItems()
  const [menuOpen, setMenuOpen] = useState(false)
  const [managerChatOpen, setManagerChatOpen] = useState(false)
  const [pendingPurchasedListing] = useState(() => readPendingSellPurchasedProperty())
  const showPurchasedDraftHint =
    Boolean(pendingPurchasedListing?.id || pendingPurchasedListing?.propertyId) &&
    (view === OWNER_VIEWS.HOME || view === OWNER_VIEWS.PROPERTIES)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const handleLogout = useCallback(async () => {
    closeMenu()
    await performOwnerTestLogout({ t, user, signOut })
  }, [closeMenu, signOut, t, user])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  useEffect(() => {
    const openMenu = () => setMenuOpen(true)
    window.addEventListener('owner-test:open-menu', openMenu)
    return () => window.removeEventListener('owner-test:open-menu', openMenu)
  }, [])

  useEffect(() => {
    const onManager = (event) => setManagerChatOpen(Boolean(event.detail?.isOpen))
    window.addEventListener('managerChatStateChange', onManager)
    return () => {
      window.removeEventListener('managerChatStateChange', onManager)
    }
  }, [])

  const handleNavClick = useCallback(
    (navId) => {
      const target = NAV_ID_TO_VIEW[navId]
      if (target) goTo(target)
      closeMenu()
    },
    [goTo, closeMenu]
  )

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, badge, href, action }) => {
      const active =
        action === 'managerChat' ? managerChatOpen : isNavItemActive(id, view)
      const className = `otc-nav__item${active ? ' otc-nav__item--active' : ''}`
      const target = NAV_ID_TO_VIEW[id]
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="otc-nav__badge">{badge}</span>}
        </>
      )

      if (action === 'managerChat') {
        return (
          <button
            key={id}
            type="button"
            className={className}
            onClick={() => {
              openOwnerManagerChat()
              closeMenu()
            }}
          >
            {inner}
          </button>
        )
      }

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
    [view, handleNavClick, closeMenu, managerChatOpen]
  )

  const renderAddPropertyCta = (className = '') => (
    <button
      type="button"
      className={`otc-add-property${className ? ` ${className}` : ''}`}
      onClick={() => {
        goTo(OWNER_VIEWS.ADD_PROPERTY)
        closeMenu()
      }}
    >
      <span className="otc-add-property__icon">
        <Plus size={18} strokeWidth={2.4} aria-hidden />
      </span>
      <span>{t('ownerTest_ariaAddProperty')}</span>
    </button>
  )

  return (
    <SiteChatDock hideFab wrapperClassName="owner-cabinet-chat-dock">
      <div
        className={`otc${menuOpen ? ' otc--menu-open' : ''}${
          view === OWNER_VIEWS.HOME ? ' otc--home' : ''
        }${view === OWNER_VIEWS.PROPERTIES ? ' otc--properties' : ''}${
          view === OWNER_VIEWS.PROPERTY_ANALYTICS ? ' otc--property-analytics' : ''
        }${view === OWNER_VIEWS.TEST_DRIVE ? ' otc--testdrive' : ''}${
          view === OWNER_VIEWS.SUBSCRIPTIONS ? ' otc--subscriptions' : ''
        }`}
      >
      <header className="otc-mob-topbar otc-mobile-only" aria-label={t('ownerTest_ariaMobileHeader')}>
        <div className="otc-mob-topbar__brand">
          <BrandLogo />
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
            <BrandLogo />
          </div>
          <button type="button" className="otc-drawer__close" aria-label={t('ownerTest_ariaCloseMenu')} onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="otc-sidebar__divider otc-sidebar__divider--drawer" aria-hidden />
        {renderAddPropertyCta('otc-add-property--drawer')}
        <nav className="otc-nav otc-nav--drawer">
          {navItems.map(renderNavItem)}
          <OwnerProfileCompletionBanner onNavigate={closeMenu} />
          <div className="otc-drawer__logout-foot">
            <OwnerTestProfileMenu
              current={view === OWNER_VIEWS.PROFILE}
              className="otpm--nav-foot"
              onNavigate={closeMenu}
            />
            <div className="otc-drawer__logout-divider" aria-hidden />
            <button
              type="button"
              className="otc-nav__item otc-nav__item--logout"
              onClick={handleLogout}
            >
              <LogOut size={20} strokeWidth={2} aria-hidden />
              <span>{t('ownerTest_logout')}</span>
            </button>
          </div>
        </nav>
      </aside>

      <aside className="otc-sidebar otc-desktop-only">
        <div className="otc-sidebar__brand">
          <BrandLogo />
        </div>
        <div className="otc-sidebar__divider" aria-hidden />
        {renderAddPropertyCta()}
        <nav className="otc-nav" aria-label={t('ownerTest_ariaSellerCabinet')}>
          {navItems.map(renderNavItem)}
          <OwnerProfileCompletionBanner />
        </nav>

        <div className="otc-sidebar__profile-foot">
          <OwnerTestProfileMenu
            current={view === OWNER_VIEWS.PROFILE}
            className="otpm--nav-foot"
          />
        </div>
      </aside>

      <div className="otc-stage">
        {showPurchasedDraftHint ? (
          <aside className="otc-purchased-draft-hint" aria-label="Незавершённый объект">
            <span className="otc-purchased-draft-hint__icon" aria-hidden>
              <Building2 size={20} strokeWidth={2.1} />
            </span>
            <span className="otc-purchased-draft-hint__copy">
              <strong>У вас есть незаполненный объект</strong>
              <small>
                {pendingPurchasedListing.title
                  ? `Продолжите оформление «${pendingPurchasedListing.title}»`
                  : 'Данные покупки уже перенесены в черновик'}
              </small>
            </span>
            <button type="button" onClick={() => goTo(OWNER_VIEWS.ADD_PROPERTY)}>
              <span>Перейти</span>
              <ArrowRight size={17} aria-hidden />
            </button>
          </aside>
        ) : null}
        {children}
      </div>

      </div>
    </SiteChatDock>
  )
}
