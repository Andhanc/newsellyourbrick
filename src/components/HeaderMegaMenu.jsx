import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Compass,
  Gavel,
  Gift,
  Handshake,
  Heart,
  History,
  Home,
  Info,
  Landmark,
  Lock,
  LogIn,
  LogOut,
  Map,
  MessageSquare,
  PieChart,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Store,
  User,
  Users,
  Wallet,
  Zap,
  Bot,
  Car,
} from 'lucide-react'
import { SiteBrandIcon } from './SiteBrandLogo'
import './SiteBrandLogo.css'
import { FiX } from 'react-icons/fi'
import { CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from '../utils/sectionRoutes'
import { getUserData, logout } from '../services/authService'
import {
  getCabinetProfilePath,
  getCabinetWalletPath,
  isSellerCabinetRole,
  readStoredUserRole,
} from '../utils/cabinetRoutes'
import { APP_VERSION } from '../utils/appVersion'
import {
  isSoftLaunchFeatureBlocked,
  isSoftLaunchHrefBlocked,
} from '../utils/softLaunchAccess'
import './HeaderMegaMenu.css'

const MOBILE_MEGA_MENU_BREAKPOINT = 1023

const LINK_ICONS = {
  home: Home,
  auction: Gavel,
  coInvestment: PieChart,
  debtsTitle: Landmark,
  headerMegaBuyNow: Zap,
  testDrive: Car,
  aiAssistant: Bot,
  calculator: BarChart3,
  chat: MessageSquare,
  favorites: Heart,
  mapLink: Map,
  profile: User,
  listProperty: PlusCircle,
  ownerTest_tabBookings: CalendarDays,
  ownerTest_navMyProperties: Briefcase,
  bonuses: Gift,
  buyerCabinet_tileDepositTitle: Wallet,
  history: History,
  aboutUs: Info,
  headerMegaForSellerPage: Store,
  headerMegaForBuyerPage: ShoppingBag,
  footerBecomePartner: Handshake,
  footerOurTeam: Users,
  privateClubPageTitle: Lock,
}

const TRADES_COLUMN = {
  id: 'trades',
  titleKey: 'headerMegaTrades',
  icon: Gavel,
  links: [
    { labelKey: 'home', path: '/' },
    { labelKey: 'auction', path: '/auction' },
    { labelKey: 'coInvestment', path: CO_INVESTMENT_PATH },
    { labelKey: 'debtsTitle', path: '/debts' },
    { labelKey: 'headerMegaBuyNow', path: '/auction?filter=buy_now' },
  ],
}

const SERVICES_COLUMN = {
  id: 'services',
  titleKey: 'headerMegaServices',
  icon: Sparkles,
  links: [
    { labelKey: 'testDrive', path: TEST_DRIVE_PATH },
    { labelKey: 'aiAssistant', path: null, action: 'ai' },
    { labelKey: 'calculator', path: '/calculator', requiresAuth: true },
    { labelKey: 'chat', path: '/chat?manager=1', requiresAuth: true },
    { labelKey: 'favorites', path: '/favorites' },
    { labelKey: 'mapLink', path: '/map', requiresAuth: true },
  ],
}

const FOR_YOU_COLUMN = {
  id: 'for-you',
  titleKey: 'headerMegaForYou',
  icon: Compass,
  links: [
    { labelKey: 'aboutUs', path: '/about' },
    { labelKey: 'headerMegaForSellerPage', path: '/seller' },
    { labelKey: 'headerMegaForBuyerPage', path: '/buyer' },
    { labelKey: 'footerBecomePartner', path: '/about#partner-title' },
    { labelKey: 'footerOurTeam', path: '/about' },
    { labelKey: 'privateClubPageTitle', path: '/private-club' },
  ],
}

function buildRoleColumn(role) {
  if (isSellerCabinetRole(role)) {
    return {
      id: 'cabinet-role',
      titleKey: 'headerMegaForSeller',
      icon: Store,
      links: [
        { labelKey: 'profile', path: '/owner-test/profile', requiresAuth: true },
        { labelKey: 'listProperty', path: '/owner-test/add-property', requiresAuth: true },
        { labelKey: 'ownerTest_tabBookings', path: '/owner-test/test-drive', requiresAuth: true },
        { labelKey: 'ownerTest_navMyProperties', path: '/owner-test/properties', requiresAuth: true },
        { labelKey: 'bonuses', path: '/bonuses', requiresAuth: true },
      ],
    }
  }

  return {
    id: 'cabinet-role',
    titleKey: 'headerMegaForBuyer',
    icon: ShoppingBag,
    links: [
      { labelKey: 'profile', path: getCabinetProfilePath(role), requiresAuth: true },
      { labelKey: 'ownerTest_tabBookings', path: '/profile/bookings', requiresAuth: true },
      { labelKey: 'buyerCabinet_tileDepositTitle', path: getCabinetWalletPath(role), requiresAuth: true },
      { labelKey: 'history', path: '/history', requiresAuth: true },
      { labelKey: 'bonuses', path: '/bonuses', requiresAuth: true },
    ],
  }
}

function matchesMenuPath(pathname, search, linkPath) {
  if (!linkPath) return false

  const [base, queryString] = linkPath.split('?')

  let pathMatch = false
  if (base === '/') {
    pathMatch = pathname === '/' || pathname === '/main'
  } else if (base === CO_INVESTMENT_PATH) {
    pathMatch =
      pathname === CO_INVESTMENT_PATH ||
      pathname.startsWith(`${CO_INVESTMENT_PATH}/`) ||
      pathname === '/shares' ||
      pathname.startsWith('/shares/')
  } else if (base === '/about') {
    pathMatch = pathname === '/about' || pathname.startsWith('/about/')
  } else if (base === '/owner-test/profile') {
    pathMatch = pathname === '/owner-test/profile' || pathname === '/owner-test'
  } else {
    pathMatch = pathname === base || pathname.startsWith(`${base}/`)
  }

  if (!pathMatch) return false
  if (!queryString) return true

  const expected = new URLSearchParams(queryString)
  const actual = new URLSearchParams(search)
  for (const [key, value] of expected.entries()) {
    if (actual.get(key) !== value) return false
  }
  return true
}

function getInitialOpenSections(columns, pathname, search) {
  const open = {}
  let hasActive = false

  for (const column of columns) {
    const active = column.links.some((link) => matchesMenuPath(pathname, search, link.path))
    if (active) {
      open[column.id] = true
      hasActive = true
    }
  }

  if (!hasActive) {
    open.trades = true
  }

  return open
}

function splitFullName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function buildMegaMenuUserSnapshot(clerkUser) {
  const userData = getUserData()
  const role = readStoredUserRole()

  let firstName = String(
    userData.first_name || userData.firstName || clerkUser?.firstName || '',
  ).trim()
  let lastName = String(
    userData.last_name || userData.lastName || clerkUser?.lastName || '',
  ).trim()

  if (!firstName && !lastName) {
    const fromName = splitFullName(userData.name || clerkUser?.fullName || '')
    firstName = fromName.firstName
    lastName = fromName.lastName
  }

  const email = String(
    userData.email ||
      localStorage.getItem('userEmail') ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      '',
  ).trim()

  const picture = userData.picture || clerkUser?.imageUrl || null
  const isLoggedIn = Boolean(userData.isLoggedIn || clerkUser)

  return {
    firstName,
    lastName,
    email,
    role,
    picture,
    isLoggedIn,
  }
}

function getUserInitials(firstName, lastName, email) {
  const first = firstName?.[0] || ''
  const last = lastName?.[0] || ''
  if (first || last) return `${first}${last}`.toUpperCase()
  if (email) return email[0].toUpperCase()
  return '?'
}

function getMegaMenuRoleLabel(role, t) {
  if (role === 'admin') return t('headerMegaMenuRoleAdmin')
  if (isSellerCabinetRole(role)) return t('roleSeller')
  if (role === 'buyer' || role === 'client') return t('roleBuyer')
  return t('headerMegaMenuRoleGuest')
}

function useMegaMenuMobile(breakpoint = MOBILE_MEGA_MENU_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint,
  )

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [breakpoint])

  return isMobile
}

export default function HeaderMegaMenu({
  onClose,
  openLoginOrNavigate,
  closeAfterNav,
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const isMobile = useMegaMenuMobile()

  const menuUser = useMemo(() => buildMegaMenuUserSnapshot(clerkUser), [clerkUser])
  const emptyValue = t('buyerData_notSpecified')
  const roleLabel = getMegaMenuRoleLabel(menuUser.role, t)
  const profilePath = isSellerCabinetRole(menuUser.role)
    ? '/owner-test/profile'
    : getCabinetProfilePath(menuUser.role)

  const role = menuUser.role
  const megaColumns = [
    TRADES_COLUMN,
    SERVICES_COLUMN,
    buildRoleColumn(role),
    FOR_YOU_COLUMN,
  ]

  const [openSections, setOpenSections] = useState(() =>
    getInitialOpenSections(megaColumns, pathname, search),
  )

  const toggleSection = useCallback((sectionId) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }, [])

  const handleLink = (link) => {
    if (link.action === 'ai') {
      if (isSoftLaunchFeatureBlocked('aiAssistant')) {
        navigate('/chat?assistant=1')
        closeAfterNav?.()
        return
      }
      window.dispatchEvent(new CustomEvent('openAIChat'))
      closeAfterNav?.()
      return
    }

    if (link.path && isSoftLaunchHrefBlocked(link.path)) {
      navigate(link.path)
      closeAfterNav?.()
      return
    }

    if (link.requiresAuth) {
      openLoginOrNavigate(link.path, true)
      return
    }

    navigate(link.path)
    closeAfterNav?.()
  }

  const renderLinkIcon = (labelKey, size = 16) => {
    const Icon = LINK_ICONS[labelKey] || ChevronRight
    return <Icon size={size} strokeWidth={1.75} aria-hidden />
  }

  const renderDesktopColumn = (column) => {
    const Icon = column.icon
    return (
      <section
        key={column.id}
        id={`mega-${column.id}`}
        className="header-mega-menu__column"
        aria-labelledby={`mega-title-${column.id}`}
      >
        <div className="header-mega-menu__column-head">
          <span className="header-mega-menu__column-icon" aria-hidden>
            <Icon size={18} strokeWidth={2} />
          </span>
          <h3 id={`mega-title-${column.id}`} className="header-mega-menu__column-title">
            {t(column.titleKey)}
          </h3>
        </div>
        <ul id={`mega-links-${column.id}`} className="header-mega-menu__links">
          {column.links.map((link) => {
            const locked =
              link.action === 'ai'
                ? isSoftLaunchFeatureBlocked('aiAssistant')
                : Boolean(link.path && isSoftLaunchHrefBlocked(link.path))
            return (
              <li key={`${column.id}-${link.labelKey}`}>
                <button
                  type="button"
                  className={`header-mega-menu__link${locked ? ' header-mega-menu__link--locked' : ''}`}
                  onClick={() => handleLink(link)}
                  aria-disabled={locked || undefined}
                >
                  <span className="header-mega-menu__link-icon">{renderLinkIcon(link.labelKey, 15)}</span>
                  <span className="header-mega-menu__link-label">{t(link.labelKey)}</span>
                  {locked ? (
                    <span className="header-mega-menu__link-lock">
                      {t('softLaunchUnavailableBadge', { defaultValue: 'Пока недоступно' })}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  const handleUserCardClick = () => {
    openLoginOrNavigate(profilePath, true)
  }

  const handleLogout = useCallback(async () => {
    if (!menuUser.isLoggedIn) return

    if (!window.confirm(t('buyerCabinet_logoutConfirm'))) {
      return
    }

    closeAfterNav?.()
    onClose?.()

    sessionStorage.setItem('clerk_logout_in_progress', 'true')
    try {
      if (clerkUser && signOut) {
        await signOut({ redirectUrl: `${window.location.origin}/` })
      }
    } catch (error) {
      console.warn('HeaderMegaMenu: Clerk signOut', error)
    }

    try {
      await logout()
    } catch (error) {
      console.warn('HeaderMegaMenu: logout()', error)
    } finally {
      sessionStorage.removeItem('clerk_logout_in_progress')
    }

    window.location.assign('/')
  }, [clerkUser, closeAfterNav, menuUser.isLoggedIn, onClose, signOut, t])

  const renderMobileFooter = () => {
    if (!menuUser.isLoggedIn) {
      return (
        <div className="header-mega-menu__footer">
          <button
            type="button"
            className="header-mega-menu__login-btn"
            onClick={() => openLoginOrNavigate(profilePath, true)}
          >
            <LogIn size={18} strokeWidth={2} aria-hidden />
            <span>{t('logIn')}</span>
          </button>
          <p className="header-mega-menu__version" aria-label={`SellYourBrick ${APP_VERSION}`}>
            v{APP_VERSION}
          </p>
        </div>
      )
    }

    const initials = getUserInitials(menuUser.firstName, menuUser.lastName, menuUser.email)
    const fullName = [menuUser.firstName, menuUser.lastName].filter(Boolean).join(' ') || emptyValue

    return (
      <div className="header-mega-menu__footer">
        <div className="header-mega-menu__user-plate">
          <button
            type="button"
            className="header-mega-menu__user-plate-main"
            onClick={handleUserCardClick}
            aria-label={t('profile')}
          >
            <span className="header-mega-menu__user-avatar" aria-hidden>
              {menuUser.picture ? (
                <img src={menuUser.picture} alt="" className="header-mega-menu__user-avatar-img" />
              ) : (
                <span className="header-mega-menu__user-avatar-fallback">{initials}</span>
              )}
            </span>

            <span className="header-mega-menu__user-card-info">
              <span className="header-mega-menu__user-card-name">{fullName}</span>
              <span className="header-mega-menu__user-card-email">{menuUser.email || emptyValue}</span>
              <span className={`header-mega-menu__user-card-role header-mega-menu__user-card-role--${menuUser.role}`}>
                {roleLabel}
              </span>
            </span>
          </button>

          <button
            type="button"
            className="header-mega-menu__user-logout"
            onClick={handleLogout}
            aria-label={t('logOutLabel')}
            title={t('logOutLabel')}
          >
            <LogOut size={20} strokeWidth={1.85} aria-hidden />
          </button>
        </div>
        <p className="header-mega-menu__version" aria-label={`SellYourBrick ${APP_VERSION}`}>
          v{APP_VERSION}
        </p>
      </div>
    )
  }

  const renderMobileSection = (column) => {
    const SectionIcon = column.icon
    const isOpen = Boolean(openSections[column.id])

    return (
      <section
        key={column.id}
        className={`header-mega-menu__section${isOpen ? ' is-open' : ''}`}
      >
        <button
          type="button"
          className="header-mega-menu__section-toggle"
          onClick={() => toggleSection(column.id)}
          aria-expanded={isOpen}
          aria-controls={`mega-mobile-${column.id}`}
        >
          <span className="header-mega-menu__section-icon" aria-hidden>
            <SectionIcon size={18} strokeWidth={1.85} />
          </span>
          <span className="header-mega-menu__section-label">{t(column.titleKey)}</span>
          <ChevronDown
            size={18}
            strokeWidth={1.85}
            className="header-mega-menu__section-chevron"
            aria-hidden
          />
        </button>

        <div
          id={`mega-mobile-${column.id}`}
          className="header-mega-menu__section-panel"
          aria-hidden={!isOpen}
        >
          <ul className="header-mega-menu__section-children">
            {column.links.map((link, index) => {
              const isActive = matchesMenuPath(pathname, search, link.path)
              const isLast = index === column.links.length - 1

              return (
                <li
                  key={`${column.id}-${link.labelKey}`}
                  className={`header-mega-menu__child-row${isLast ? ' is-last' : ''}`}
                >
                  <button
                    type="button"
                    className={`header-mega-menu__child-link${isActive ? ' is-active' : ''}`}
                    onClick={() => handleLink(link)}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    <span className="header-mega-menu__child-link-icon">
                      {renderLinkIcon(link.labelKey, 15)}
                    </span>
                    <span className="header-mega-menu__child-link-text">{t(link.labelKey)}</span>
                    {isActive ? (
                      <ChevronRight size={16} strokeWidth={1.85} className="header-mega-menu__child-link-arrow" aria-hidden />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    )
  }

  return (
    <div className="header-mega-menu">
      <div className="header-mega-menu__mobile-top">
        <button
          type="button"
          className="header-mega-menu__brand site-brand site-brand--header"
          onClick={() => {
            navigate('/')
            closeAfterNav?.()
          }}
        >
          <SiteBrandIcon />
          <span className="site-brand__text">sellyourbrick</span>
        </button>
        <button
          type="button"
          className="header-mega-menu__close"
          onClick={onClose}
          aria-label={t('closeMenu')}
        >
          <FiX size={20} />
        </button>
      </div>

      <div className="header-mega-menu__body">
        <div className="header-mega-menu__scroll">
          {isMobile ? (
            <nav className="header-mega-menu__mobile-list" aria-label={t('menu')}>
              {megaColumns.map((column) => renderMobileSection(column))}
            </nav>
          ) : (
            <div className="header-mega-menu__grid">
              {megaColumns.map((column) => renderDesktopColumn(column))}
            </div>
          )}
        </div>

        {isMobile ? renderMobileFooter() : null}
      </div>
    </div>
  )
}
