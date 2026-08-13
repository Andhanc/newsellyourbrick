import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  Gavel,
  Gift,
  Globe2,
  Heart,
  History,
  Home,
  Info,
  Landmark,
  LayoutGrid,
  Lock,
  Map,
  MessageSquare,
  Newspaper,
  PieChart,
  Search,
  Smartphone,
  Store,
  User,
  Users,
  Wallet,
  Zap,
  Bot,
  ExternalLink,
} from 'lucide-react'
import Header from '@/components/Header'
import { scrollMainTo } from '@/utils/mainScroll'
import { isSiteUserSignedIn } from '@/utils/siteAuthGate'
import { requestOpenLoginModal } from '@/utils/requestOpenLoginModal'
import { navigateToWallet } from '@/utils/walletNavigation'
import { getCabinetDataPath, getCabinetProfilePath } from '@/utils/cabinetRoutes'
import { CO_INVESTMENT_PATH, TEST_DRIVE_PATH } from '@/utils/sectionRoutes'
import './SectionsPage.css'

/** @typedef {{ titleKey: string, path: string, requiresAuth?: boolean, wallet?: boolean }} SectionLink */

/** @typedef {{ sectionTitleKey: string, items: SectionLink[] }} SectionGroup */

const SOCIAL_SECTION_KEY = 'sectionsSocialTitle'

const SECTION_LINK_ICONS = {
  home: Home,
  sybLandingFooterLink: Globe2,
  sectionsBuyerPageLink: Users,
  sellerPageFooterLink: Store,
  news: Newspaper,
  aboutUs: Info,
  footerAllSections: LayoutGrid,
  auction: Gavel,
  auctionFilterPreAuction: Gavel,
  buyNowSectionTitle: Zap,
  sectionsAuctionBidding: Gavel,
  auctionFilterEnded: History,
  coInvestment: PieChart,
  debtsTitle: Landmark,
  testDrive: Car,
  mapLink: Map,
  search: Search,
  footerCompareObjects: BarChart3,
  footerLiked: Heart,
  calculator: BarChart3,
  privateClubPageTitle: Lock,
  subscriptions: CreditCard,
  bonuses: Gift,
  tariffs: CreditCard,
  profile: User,
  history: History,
  wallet: Wallet,
  buyerCabinet_tileDepositTitle: Wallet,
  footerPersonalData: FileText,
  buyerCabinet_myBookings: CalendarDays,
  chat: MessageSquare,
  aiAssistant: Bot,
  footerTechSupport: MessageSquare,
  appDownloadPage: Smartphone,
  footerForInvestors: Briefcase,
  sectionsForBanks: Landmark,
  footerDocumentsSection: FileText,
  becomeSeller: Store,
  ownerDashboard: Building2,
  addProperty: Building2,
}

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
      { titleKey: 'appDownloadPage', path: '/app' },
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

/** @type {SectionGroup[]} */
const ALL_ACCORDION_GROUPS = [...MAIN_SECTIONS, ...SELLER_SECTIONS]

const SOCIAL_LINKS = [
  { titleKey: 'sectionsSocialTelegram', href: 'https://t.me/' },
  { titleKey: 'sectionsSocialYoutube', href: 'https://youtube.com/' },
  { titleKey: 'sectionsSocialWhatsapp', href: 'https://wa.me/447700183959' },
  { titleKey: 'sectionsSocialInstagram', href: 'https://instagram.com/' },
]

function resolveItemPath(item) {
  let path = item.path.startsWith('/') ? item.path : `/${item.path}`
  if (item.titleKey === 'profile') return getCabinetProfilePath()
  if (item.titleKey === 'footerPersonalData' || item.titleKey === 'footerDocumentsSection') {
    return getCabinetDataPath()
  }
  return path
}

function matchesSectionLink(pathname, search, linkPath) {
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
  } else if (base === '/app') {
    pathMatch = pathname === '/app'
  } else if (base === '/sections') {
    pathMatch = pathname === '/sections'
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

function getInitialOpenSections(groups, pathname, search) {
  const open = {}
  let hasActive = false

  for (const group of groups) {
    const active = group.items.some((item) =>
      matchesSectionLink(pathname, search, resolveItemPath(item)),
    )
    if (active) {
      open[group.sectionTitleKey] = true
      hasActive = true
    }
  }

  if (!hasActive && groups[0]) {
    open[groups[0].sectionTitleKey] = true
  }

  return open
}

export default function SectionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoaded: userLoaded } = useUser()

  useEffect(() => {
    scrollMainTo(0, 0, 'instant')
  }, [])

  const signedIn = isSiteUserSignedIn(user, userLoaded)

  const [openSections, setOpenSections] = useState(() =>
    getInitialOpenSections(ALL_ACCORDION_GROUPS, location.pathname, location.search),
  )

  const toggleSection = useCallback((sectionKey) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))
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
      navigate(resolveItemPath(item))
    },
    [location.pathname, navigate, signedIn],
  )

  const renderLinkIcon = (titleKey, size = 17) => {
    const Icon = SECTION_LINK_ICONS[titleKey] || ChevronRight
    return <Icon size={size} strokeWidth={1.75} aria-hidden />
  }

  const renderSectionToggleLabel = (sectionTitleKey) => (
    <>
      <h2 className="sections-page__block-head-title">{t(sectionTitleKey)}</h2>
      <ChevronDown className="sections-page__block-chevron" size={18} strokeWidth={1.85} aria-hidden />
    </>
  )

  const renderSection = useCallback(
    (group) => {
      const isOpen = Boolean(openSections[group.sectionTitleKey])
      const panelId = `sections-panel-${group.sectionTitleKey}`

      return (
        <section
          key={group.sectionTitleKey}
          className={`sections-page__block${isOpen ? ' is-open' : ''}`}
          aria-label={t(group.sectionTitleKey)}
        >
          <button
            type="button"
            className="sections-page__block-toggle"
            onClick={() => toggleSection(group.sectionTitleKey)}
            aria-expanded={isOpen}
            aria-controls={panelId}
          >
            {renderSectionToggleLabel(group.sectionTitleKey)}
          </button>

          <div id={panelId} className="sections-page__block-panel" aria-hidden={!isOpen}>
            <ul className="sections-page__link-tree">
              {group.items.map((item, index) => {
                const resolvedPath = resolveItemPath(item)
                const isActive = matchesSectionLink(location.pathname, location.search, resolvedPath)
                const isHubLink = item.titleKey === 'footerAllSections'
                const isLast = index === group.items.length - 1

                return (
                  <li
                    key={`${group.sectionTitleKey}-${item.path}-${item.titleKey}`}
                    className={`sections-page__link-row${isLast ? ' sections-page__link-row--last' : ''}`}
                  >
                    <button
                      type="button"
                      className={`sections-page__link${isActive ? ' is-active' : ''}${
                        isHubLink ? ' sections-page__link--hub' : ''
                      }`}
                      onClick={() => goTo(item)}
                    >
                      <span className="sections-page__link-icon">{renderLinkIcon(item.titleKey)}</span>
                      <span className="sections-page__link-text">{t(item.titleKey)}</span>
                      {isActive || isHubLink ? (
                        <ChevronRight
                          className="sections-page__link-arrow"
                          size={16}
                          strokeWidth={1.85}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )
    },
    [goTo, location.pathname, location.search, openSections, t, toggleSection],
  )

  return (
    <div className="sections-page">
      <Header />

      <main className="sections-page__main">
        <header className="sections-page__hero">
          <p className="sections-page__eyebrow">{t('sectionsHeroScript')}</p>
          <h1 className="sections-page__title">{t('sectionsSitemapTitle')}</h1>
          <p className="sections-page__lead">{t('sectionsSitemapLead')}</p>
        </header>

        <div className="sections-page__stack">
          {MAIN_SECTIONS.map(renderSection)}
          {SELLER_SECTIONS.map(renderSection)}
        </div>

        <section
          className={`sections-page__block sections-page__block--social${
            openSections[SOCIAL_SECTION_KEY] ? ' is-open' : ''
          }`}
          aria-labelledby="sections-social-heading"
        >
          <button
            type="button"
            id="sections-social-heading"
            className="sections-page__block-toggle"
            onClick={() => toggleSection(SOCIAL_SECTION_KEY)}
            aria-expanded={Boolean(openSections[SOCIAL_SECTION_KEY])}
            aria-controls="sections-panel-social"
          >
            {renderSectionToggleLabel(SOCIAL_SECTION_KEY)}
          </button>
          <div
            id="sections-panel-social"
            className="sections-page__block-panel"
            aria-hidden={!openSections[SOCIAL_SECTION_KEY]}
          >
            <div className="sections-page__block-panel-inner">
              <div className="sections-page__social-copy">
                <p>{t('sectionsSocialLead')}</p>
              </div>
              <ul className="sections-page__link-tree" aria-label={t('sectionsSocialAria')}>
                {SOCIAL_LINKS.map((social, index) => (
                  <li
                    key={social.titleKey}
                    className={`sections-page__link-row${
                      index === SOCIAL_LINKS.length - 1 ? ' sections-page__link-row--last' : ''
                    }`}
                  >
                    <a
                      className="sections-page__link sections-page__link--external"
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="sections-page__link-icon">
                        <ExternalLink size={17} strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="sections-page__link-text">{t(social.titleKey)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
