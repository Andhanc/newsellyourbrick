import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import { OTD_IMAGES } from './ownerTestDriveImages'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import OwnerTestDriveSplitView from '../components/OwnerTestDriveSplitView'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import { OWNER_TEST_STANDALONE_HREF_MAP } from '../utils/ownerTestNav'
import { getOwnerTestDriveUserId } from '../utils/ownerTestDriveList'
import './OwnerTestDrivePage.css'
import './OwnerTestDrivePage.mobile.css'

function useOtdMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

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
  const isMobile = useOtdMobile()
  const navItems = useOwnerTestNavItems({
    activeId: 'testdrive',
    hrefMap: isEmbedded ? undefined : OWNER_TEST_STANDALONE_HREF_MAP,
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const userId = getOwnerTestDriveUserId()

  const closeMenu = useCallback(() => setMenuOpen(false), [])

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
        <div className="otd-content otd-content--split">
          <p className="otd-split-lead otd-desktop-only">{t('ownerTestDriveAnalyticsHeroHint')}</p>
          <OwnerTestDriveSplitView userId={userId} isMobile={isMobile} />
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
