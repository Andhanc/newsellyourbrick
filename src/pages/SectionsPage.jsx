import { useCallback, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import {
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiChevronDown,
  FiCreditCard,
  FiGrid,
  FiHeart,
  FiHeadphones,
  FiHome,
  FiShoppingBag,
  FiUser,
} from 'react-icons/fi'
import { FaInstagram, FaTelegramPlane, FaWhatsapp, FaYoutube } from 'react-icons/fa'
import { SiteBrandIcon } from '@/components/SiteBrandLogo'
import { scrollMainTo } from '@/utils/mainScroll'
import { isSiteUserSignedIn } from '@/utils/siteAuthGate'
import { requestOpenLoginModal } from '@/utils/requestOpenLoginModal'
import { navigateToWallet } from '@/utils/walletNavigation'
import { getCabinetDataPath, getCabinetProfilePath } from '@/utils/cabinetRoutes'
import { CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from '@/utils/sectionRoutes'
import './MainPage.css'
import './SectionsPage.css'

/** @typedef {{ titleKey: string, path: string, requiresAuth?: boolean, wallet?: boolean }} SectionLink */

/** @typedef {{ sectionTitleKey: string, icon: import('react').ComponentType<{ size?: number, strokeWidth?: number }>, items: SectionLink[] }} SectionGroup */

/** @type {SectionGroup[]} */
const INVESTOR_SECTIONS = [
  {
    sectionTitleKey: 'sectionsGroupInvestorPurchase',
    icon: FiShoppingBag,
    items: [
      { titleKey: 'auction', path: '/auction' },
      { titleKey: 'coInvestment', path: CO_INVESTMENT_PATH },
      { titleKey: 'debtsTitle', path: '/debts' },
      { titleKey: 'testDrive', path: TEST_DRIVE_PATH },
      { titleKey: 'mapLink', path: '/map', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupInvestorTools',
    icon: FiBarChart2,
    items: [
      { titleKey: 'favorites', path: '/favorites', requiresAuth: true },
      { titleKey: 'buyerCabinet_compare', path: '/compare', requiresAuth: true },
      { titleKey: 'calculator', path: '/calculator', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupInvestorSubscriptions',
    icon: FiBriefcase,
    items: [
      { titleKey: 'subscriptions', path: '/subscriptions', requiresAuth: true },
      { titleKey: 'bonuses', path: '/bonuses', requiresAuth: true },
      { titleKey: 'privateClubPageTitle', path: '/private-club', requiresAuth: false },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupInvestorProfile',
    icon: FiUser,
    items: [
      { titleKey: 'profile', path: '/profile', requiresAuth: true },
      { titleKey: 'history', path: '/history', requiresAuth: true },
      { titleKey: 'buyerCabinet_tileDepositTitle', path: '/deposit', requiresAuth: true, wallet: true },
      { titleKey: 'data', path: '/data', requiresAuth: true },
      { titleKey: 'buyerCabinet_myBookings', path: '/profile/bookings', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupInvestorSupport',
    icon: FiHeadphones,
    items: [
      { titleKey: 'chat', path: '/chat?manager=1', requiresAuth: true },
      { titleKey: 'aiAssistant', path: '/chat', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupInvestorOther',
    icon: FiGrid,
    items: [
      { titleKey: 'tariffs', path: '/subscriptions#subscriptions-pricing-section', requiresAuth: true },
      { titleKey: 'sectionsForBanks', path: '/about', requiresAuth: false },
      { titleKey: 'footerOurTeam', path: '/about', requiresAuth: false },
      { titleKey: 'aboutUs', path: '/about#about-intro', requiresAuth: false },
    ],
  },
]

/** @type {SectionGroup[]} */
const SELLER_SECTIONS = [
  {
    sectionTitleKey: 'sectionsGroupSellerObjects',
    icon: FiHome,
    items: [
      { titleKey: 'ownerDashboard', path: '/owner-test', requiresAuth: true },
      { titleKey: 'addProperty', path: '/owner/property/new', requiresAuth: true },
      { titleKey: 'auction', path: '/auction' },
      { titleKey: 'coInvestment', path: CO_INVESTMENT_PATH },
      { titleKey: 'debtsTitle', path: '/debts' },
      { titleKey: 'testDrive', path: TEST_DRIVE_PATH },
      { titleKey: 'mapLink', path: '/map', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupSellerFinance',
    icon: FiCreditCard,
    items: [
      { titleKey: 'bonuses', path: '/bonuses?tab=seller', requiresAuth: true },
      { titleKey: 'subscriptions', path: '/subscriptions', requiresAuth: true },
      { titleKey: 'privateClubPageTitle', path: '/private-club', requiresAuth: false },
      { titleKey: 'wallet', path: '/wallet', requiresAuth: true, wallet: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupSellerAccount',
    icon: FiUser,
    items: [{ titleKey: 'history', path: '/history', requiresAuth: true }],
  },
  {
    sectionTitleKey: 'sectionsGroupSellerSupport',
    icon: FiHeadphones,
    items: [
      { titleKey: 'chat', path: '/chat?manager=1', requiresAuth: true },
      { titleKey: 'aiAssistant', path: '/chat', requiresAuth: true },
    ],
  },
]

const SOCIAL_LINKS = [
  {
    title: 'Telegram',
    href: 'https://t.me/',
    icon: FaTelegramPlane,
    className: 'sections-page__social-link--telegram',
  },
  {
    title: 'YouTube',
    href: 'https://youtube.com/',
    icon: FaYoutube,
    className: 'sections-page__social-link--youtube',
  },
  {
    title: 'WhatsApp',
    href: 'https://wa.me/79991234567',
    icon: FaWhatsapp,
    className: 'sections-page__social-link--whatsapp',
  },
  {
    title: 'Instagram',
    href: 'https://instagram.com/',
    icon: FaInstagram,
    className: 'sections-page__social-link--instagram',
  },
]

const TOP_NAV_LINKS = [
  { titleKey: 'auction', path: '/auction' },
  { titleKey: 'coInvestment', path: CO_INVESTMENT_PATH },
  { titleKey: 'debtsTitle', path: '/debts' },
  { titleKey: 'mapLink', path: '/map' },
  { titleKey: 'testDrive', path: TEST_DRIVE_PATH },
]

export default function SectionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoaded: userLoaded } = useUser()

  useEffect(() => {
    scrollMainTo(0, 0, 'instant')
  }, [])

  const signedIn = isSiteUserSignedIn(user, userLoaded)

  const openAuth = useCallback(() => {
    requestOpenLoginModal({ wizard: true })
  }, [])

  const goTo = useCallback(
    (item) => {
      if (item.requiresAuth && !signedIn) {
        requestOpenLoginModal({ wizard: true })
        return
      }
      if (item.wallet) {
        navigateToWallet(navigate, location.pathname)
        return
      }
      let p = item.path.startsWith('/') ? item.path : `/${item.path}`
      if (item.titleKey === 'profile') p = getCabinetProfilePath()
      if (item.titleKey === 'data') p = getCabinetDataPath()
      navigate(p)
    },
    [location.pathname, navigate, signedIn],
  )

  const renderGroup = useCallback(
    (group) => {
      const Icon = group.icon
      return (
        <section
          key={group.sectionTitleKey}
          className="sections-page__card"
          aria-label={t(group.sectionTitleKey)}
        >
          <header className="sections-page__card-head">
            <span className="sections-page__card-icon" aria-hidden>
              <Icon size={22} strokeWidth={2.15} />
            </span>
            <h2 className="sections-page__card-title">{t(group.sectionTitleKey)}</h2>
          </header>
          <ul className="sections-page__link-list">
            {group.items.map((item) => (
              <li key={`${group.sectionTitleKey}-${item.path}-${item.titleKey}`}>
                <button
                  type="button"
                  className="sections-page__link"
                  onClick={() => goTo(item)}
                >
                  <span>{t(item.titleKey)}</span>
                  <FiArrowRight size={14} strokeWidth={2.25} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )
    },
    [goTo, t],
  )

  return (
    <div className="sections-page">
      <header className="sections-page__topbar">
        <Link className="sections-page__brand" to="/">
          <SiteBrandIcon className="sections-page__brand-icon" />
          <span>Sell You Brick</span>
        </Link>
        <nav className="sections-page__nav" aria-label={t('sectionsNavTitle')}>
          {TOP_NAV_LINKS.map((item) => (
            <Link key={item.path} to={item.path}>
              {t(item.titleKey)}
            </Link>
          ))}
          <button type="button" className="sections-page__nav-tools">
            <span>{t('sectionsGroupInvestorTools')}</span>
            <FiChevronDown size={13} strokeWidth={2.2} aria-hidden />
          </button>
          <Link className="sections-page__nav-active" to="/sections" aria-current="page">
            {t('sectionsSitemapTitle')}
          </Link>
        </nav>
        <div className="sections-page__top-actions">
          <button type="button" className="sections-page__heart" aria-label={t('favorites')} onClick={() => navigate('/favorites')}>
            <FiHeart size={19} strokeWidth={2} aria-hidden />
          </button>
          <button type="button" className="sections-page__login" onClick={openAuth}>
            {t('sectionsLogin')}
          </button>
          <button type="button" className="sections-page__register" onClick={openAuth}>
            {t('sectionsRegister')}
          </button>
        </div>
      </header>
      <main className="sections-page__main">
        <header className="sections-page__hero">
          <div className="sections-page__hero-inner">
            <div className="sections-page__hero-copy">
              <h1 className="sections-page__title">{t('sectionsSitemapTitle')}</h1>
              <p className="sections-page__lead">{t('sectionsSitemapLead')}</p>
            </div>
            <Link className="sections-page__about-link" to="/about">
              <span>{t('sectionsAboutLink')}</span>
              <FiArrowRight size={15} strokeWidth={2.2} aria-hidden />
            </Link>
          </div>
        </header>

        <div className="sections-page__body">
          <div className="sections-page__groups sections-page__groups--investor">
            {INVESTOR_SECTIONS.map(renderGroup)}
          </div>

          <section className="sections-page__seller" aria-labelledby="sections-seller-heading">
            <h2 id="sections-seller-heading" className="sections-page__seller-title">
              {t('sectionsSellerAreaTitle')}
            </h2>
            <div className="sections-page__groups sections-page__groups--seller">
              {SELLER_SECTIONS.map(renderGroup)}
            </div>
          </section>

          <section className="sections-page__social" aria-labelledby="sections-social-heading">
            <div className="sections-page__social-copy">
              <h2 id="sections-social-heading">{t('sectionsSocialTitle')}</h2>
              <p>{t('sectionsSocialLead')}</p>
              <a className="sections-page__social-cta" href="https://t.me/" target="_blank" rel="noreferrer">
                {t('sectionsSocialCta')}
              </a>
            </div>
            <div className="sections-page__social-links" aria-label={t('sectionsSocialAria')}>
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.title}
                    className={`sections-page__social-link ${social.className}`}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="sections-page__social-icon" aria-hidden>
                      <Icon size={28} />
                    </span>
                    <span>{social.title}</span>
                  </a>
                )
              })}
            </div>
            <img
              className="sections-page__social-art"
              src="/images/sections/sitemap-social-art.png"
              alt=""
              loading="eager"
              aria-hidden
            />
          </section>
        </div>
      </main>
    </div>
  )
}
