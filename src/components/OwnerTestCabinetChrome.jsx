import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { X, Plus } from 'lucide-react'
import OwnerTestProfileMenu from './OwnerTestProfileMenu'
import SiteBrandLogo from './SiteBrandLogo'
import OwnerNotificationsButton from './OwnerNotificationsButton'
import OwnerProfileCompletionBanner from './OwnerProfileCompletionBanner'
import OwnerSupportButton from './OwnerSupportButton'
import SiteChatDock from './SiteChatDock'
import OwnerAiTabIcon from './OwnerAiTabIcon'
import { useOwnerTestNav } from '../context/OwnerTestNavigationContext'
import { useOwnerTestNavItems, useOwnerTestTabItems } from '../hooks/useOwnerTestNavItems'
import { openOwnerAiChat, openOwnerManagerChat } from '../utils/ownerCabinetChat'
import {
  isNavItemActive,
  isTabItemActive,
  isTabbarView,
  NAV_ID_TO_VIEW,
  OWNER_VIEWS,
} from '../utils/ownerTestNav'
import './OwnerTestCabinetChrome.css'

function BrandLogo({ className = '' }) {
  return <SiteBrandLogo className={className} textClassName="otc-logo__text" />
}

export default function OwnerTestCabinetChrome({ children }) {
  const { t } = useTranslation()
  const { view, goTo } = useOwnerTestNav()
  const navItems = useOwnerTestNavItems()
  const tabItems = useOwnerTestTabItems()
  const [menuOpen, setMenuOpen] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [managerChatOpen, setManagerChatOpen] = useState(false)
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

  useEffect(() => {
    const onAi = (event) => setAiChatOpen(Boolean(event.detail?.isOpen))
    const onManager = (event) => setManagerChatOpen(Boolean(event.detail?.isOpen))
    window.addEventListener('aiChatStateChange', onAi)
    window.addEventListener('managerChatStateChange', onManager)
    return () => {
      window.removeEventListener('aiChatStateChange', onAi)
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

  return (
    <SiteChatDock hideFab wrapperClassName="owner-cabinet-chat-dock">
      <div className={`otc${menuOpen ? ' otc--menu-open' : ''}${showTabbar ? ' otc--tabbar' : ''}`}>
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
        <nav className="otc-nav otc-nav--drawer">
          {navItems.map(renderNavItem)}
          <OwnerProfileCompletionBanner onNavigate={closeMenu} />
        </nav>
      </aside>

      <aside className="otc-sidebar otc-desktop-only">
        <div className="otc-sidebar__brand">
          <BrandLogo />
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
            const active = item.action === 'aiChat' ? aiChatOpen : isTabItemActive(item.id, view)
            const target = NAV_ID_TO_VIEW[item.id]
            const isAiTab = item.action === 'aiChat'
            return (
              <button
                key={item.id}
                type="button"
                className={`otc-tabbar__item${active ? ' otc-tabbar__item--active' : ''}${isAiTab ? ' otc-tabbar__item--ai' : ''}`}
                onClick={() => {
                  if (item.id === 'more') {
                    setMenuOpen(true)
                    return
                  }
                  if (item.action === 'aiChat') {
                    openOwnerAiChat()
                    return
                  }
                  if (target) goTo(target)
                }}
              >
                {isAiTab ? (
                  <OwnerAiTabIcon size={22} active={active} />
                ) : (
                  <Icon size={22} strokeWidth={active ? 2.25 : 2} aria-hidden />
                )}
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      )}

      </div>
    </SiteChatDock>
  )
}
