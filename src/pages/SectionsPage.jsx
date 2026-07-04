import { useCallback, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { FiChevronDown, FiHeart } from 'react-icons/fi'
import { SiteBrandIcon } from '@/components/SiteBrandLogo'
import { scrollMainTo } from '@/utils/mainScroll'
import { isSiteUserSignedIn } from '@/utils/siteAuthGate'
import { requestOpenLoginModal } from '@/utils/requestOpenLoginModal'
import { navigateToWallet } from '@/utils/walletNavigation'
import { getCabinetDataPath, getCabinetProfilePath } from '@/utils/cabinetRoutes'
import { CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from '@/utils/sectionRoutes'
import './SectionsPage.css'

/** @typedef {{ titleKey: string, path: string, requiresAuth?: boolean, wallet?: boolean }} SectionLink */

/** @typedef {{ sectionTitleKey: string, items: SectionLink[] }} SectionGroup */

/** @type {SectionGroup[]} */
const MAIN_SECTIONS = [
  {
    sectionTitleKey: 'footerColSite',
    items: [
      { titleKey: 'home', path: '/' },
      { titleKey: 'sybLandingFooterLink', path: '/sellyourbrick' },
      { titleKey: 'sectionsBuyerPageLink', path: '/buyer' },
      { titleKey: 'sellerPageFooterLink', path: '/seller' },
      { titleKey: 'news', path: '/news' },
      { titleKey: 'aboutUs', path: '/about' },
      { titleKey: 'footerAllSections', path: '/sections' },
    ],
  },
  {
    sectionTitleKey: 'footerColListings',
    items: [
      { titleKey: 'auction', path: '/auction' },
      { titleKey: 'auctionFilterPreAuction', path: '/auction/pre-auction' },
      { titleKey: 'buyNowSectionTitle', path: '/auction/buy-now' },
      { titleKey: 'sectionsAuctionBidding', path: '/auction/bidding' },
      { titleKey: 'auctionFilterEnded', path: '/auction/ended' },
      { titleKey: 'coInvestment', path: CO_INVESTMENT_PATH },
      { titleKey: 'debtsTitle', path: '/debts' },
      { titleKey: 'testDrive', path: TEST_DRIVE_PATH },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupDiscovery',
    items: [
      { titleKey: 'mapLink', path: '/map', requiresAuth: true },
      { titleKey: 'search', path: '/search-results' },
      { titleKey: 'footerCompareObjects', path: '/compare', requiresAuth: true },
      { titleKey: 'footerLiked', path: '/favorites', requiresAuth: true },
      { titleKey: 'calculator', path: '/calculator', requiresAuth: true },
      { titleKey: 'privateClubPageTitle', path: '/private-club' },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupInvestorSubscriptions',
    items: [
      { titleKey: 'subscriptions', path: '/subscriptions', requiresAuth: true },
      { titleKey: 'bonuses', path: '/bonuses', requiresAuth: true },
      { titleKey: 'privateClubPageTitle', path: '/private-club' },
      { titleKey: 'tariffs', path: '/subscriptions#subscriptions-pricing-section', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'footerColProfile',
    items: [
      { titleKey: 'profile', path: '/profile', requiresAuth: true },
      { titleKey: 'history', path: '/history', requiresAuth: true },
      { titleKey: 'wallet', path: '/wallet', requiresAuth: true, wallet: true },
      { titleKey: 'buyerCabinet_tileDepositTitle', path: '/deposit', requiresAuth: true, wallet: true },
      { titleKey: 'footerPersonalData', path: '/data', requiresAuth: true },
      { titleKey: 'buyerCabinet_myBookings', path: '/profile/bookings', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'footerColServices',
    items: [
      { titleKey: 'calculator', path: '/calculator', requiresAuth: true },
      { titleKey: 'chat', path: '/chat?manager=1', requiresAuth: true },
      { titleKey: 'aiAssistant', path: '/chat', requiresAuth: true },
      { titleKey: 'footerTechSupport', path: '/chat?manager=1', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'footerColCompany',
    items: [
      { titleKey: 'aboutUs', path: '/about#about-intro' },
      { titleKey: 'footerOurTeam', path: '/about' },
      { titleKey: 'footerForInvestors', path: '/about#about-intro' },
      { titleKey: 'sectionsForBanks', path: '/about' },
      { titleKey: 'footerDocumentsSection', path: '/data', requiresAuth: true },
      { titleKey: 'becomeSeller', path: '/seller' },
    ],
  },
]

/** @type {SectionGroup[]} */
const SELLER_SECTIONS = [
  {
    sectionTitleKey: 'sectionsGroupSellerObjects',
    items: [
      { titleKey: 'sellerPageFooterLink', path: '/seller' },
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
    items: [
      { titleKey: 'bonuses', path: '/bonuses?tab=seller', requiresAuth: true },
      { titleKey: 'subscriptions', path: '/subscriptions', requiresAuth: true },
      { titleKey: 'privateClubPageTitle', path: '/private-club' },
      { titleKey: 'wallet', path: '/wallet', requiresAuth: true, wallet: true },
      { titleKey: 'tariffs', path: '/subscriptions#subscriptions-pricing-section', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupSellerAccount',
    items: [
      { titleKey: 'profile', path: '/profile', requiresAuth: true },
      { titleKey: 'history', path: '/history', requiresAuth: true },
      { titleKey: 'footerPersonalData', path: '/data', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupSellerSupport',
    items: [
      { titleKey: 'chat', path: '/chat?manager=1', requiresAuth: true },
      { titleKey: 'aiAssistant', path: '/chat', requiresAuth: true },
      { titleKey: 'footerTechSupport', path: '/chat?manager=1', requiresAuth: true },
    ],
  },
]

const SOCIAL_LINKS = [
  { titleKey: 'sectionsSocialTelegram', href: 'https://t.me/' },
  { titleKey: 'sectionsSocialYoutube', href: 'https://youtube.com/' },
  { titleKey: 'sectionsSocialWhatsapp', href: 'https://wa.me/447700183959' },
  { titleKey: 'sectionsSocialInstagram', href: 'https://instagram.com/' },
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
      if (item.titleKey === 'footerPersonalData' || item.titleKey === 'footerDocumentsSection') {
        p = getCabinetDataPath()
      }
      navigate(p)
    },
    [location.pathname, navigate, signedIn],
  )

  const renderSection = useCallback(
    (group) => (
      <section
        key={group.sectionTitleKey}
        className="sections-page__section"
        aria-label={t(group.sectionTitleKey)}
      >
        <h2 className="sections-page__section-title">{t(group.sectionTitleKey)}</h2>
        <ul className="sections-page__btn-list">
          {group.items.map((item) => (
            <li key={`${group.sectionTitleKey}-${item.path}-${item.titleKey}`}>
              <button type="button" className="sections-page__btn" onClick={() => goTo(item)}>
                {t(item.titleKey)}
              </button>
            </li>
          ))}
        </ul>
      </section>
    ),
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
          <button
            type="button"
            className="sections-page__heart"
            aria-label={t('favorites')}
            onClick={() => navigate('/favorites')}
          >
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
          <p className="sections-page__eyebrow">{t('sectionsHeroScript')}</p>
          <h1 className="sections-page__title">{t('sectionsSitemapTitle')}</h1>
          <p className="sections-page__lead">{t('sectionsSitemapLead')}</p>
        </header>

        <div className="sections-page__grid">{MAIN_SECTIONS.map(renderSection)}</div>

        <div className="sections-page__seller-band">
          <h2 className="sections-page__seller-heading">{t('sectionsSellerAreaTitle')}</h2>
          <div className="sections-page__grid sections-page__grid--seller">
            {SELLER_SECTIONS.map(renderSection)}
          </div>
        </div>

        <section className="sections-page__section sections-page__social" aria-labelledby="sections-social-heading">
          <h2 id="sections-social-heading" className="sections-page__section-title">
            {t('sectionsSocialTitle')}
          </h2>
          <div className="sections-page__section-content">
            <p className="sections-page__social-lead">{t('sectionsSocialLead')}</p>
            <ul className="sections-page__btn-list" aria-label={t('sectionsSocialAria')}>
            {SOCIAL_LINKS.map((social) => (
              <li key={social.titleKey}>
                <a
                  className="sections-page__btn sections-page__btn--social"
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(social.titleKey)}
                </a>
              </li>
            ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
