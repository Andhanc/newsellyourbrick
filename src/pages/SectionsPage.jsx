import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { FiArrowRight } from 'react-icons/fi'
import Header from '@/components/Header'
import { scrollMainTo } from '@/utils/mainScroll'
import { isSiteUserSignedIn } from '@/utils/siteAuthGate'
import { requestOpenLoginModal } from '@/utils/requestOpenLoginModal'
import { navigateToWallet } from '@/utils/walletNavigation'
import LeadGenCta from '@/components/LeadGenCta'
import './MainPage.css'
import './SectionsPage.css'

/** @typedef {{ titleKey: string, path: string, requiresAuth?: boolean, wallet?: boolean }} SectionLink */

/** @typedef {{ sectionTitleKey: string, items: SectionLink[] }} SectionGroup */

/** @type {SectionGroup[]} */
const INVESTOR_SECTIONS = [
  {
    sectionTitleKey: 'sectionsGroupInvestorPurchase',
    items: [
      { titleKey: 'auction', path: '/auction' },
      { titleKey: 'shares', path: '/shares' },
      { titleKey: 'debtsTitle', path: '/debts' },
      { titleKey: 'mapLink', path: '/map', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupInvestorTools',
    items: [
      { titleKey: 'favorites', path: '/favorites', requiresAuth: true },
      { titleKey: 'buyerCabinet_compare', path: '/compare', requiresAuth: true },
      { titleKey: 'calculator', path: '/calculator', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupInvestorSubscriptions',
    items: [
      { titleKey: 'subscriptions', path: '/subscriptions', requiresAuth: true },
      { titleKey: 'bonuses', path: '/bonuses', requiresAuth: true },
      { titleKey: 'privateClubPageTitle', path: '/private-club', requiresAuth: false },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupInvestorProfile',
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
    items: [
      { titleKey: 'chat', path: '/chat?manager=1', requiresAuth: true },
      { titleKey: 'aiAssistant', path: '/chat', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupInvestorOther',
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
    items: [
      { titleKey: 'ownerDashboard', path: '/owner', requiresAuth: true },
      { titleKey: 'addProperty', path: '/owner/property/new', requiresAuth: true },
      { titleKey: 'auction', path: '/auction' },
      { titleKey: 'shares', path: '/shares' },
      { titleKey: 'debtsTitle', path: '/debts' },
      { titleKey: 'mapLink', path: '/map', requiresAuth: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupSellerFinance',
    items: [
      { titleKey: 'bonuses', path: '/bonuses?tab=seller', requiresAuth: true },
      { titleKey: 'subscriptions', path: '/subscriptions', requiresAuth: true },
      { titleKey: 'privateClubPageTitle', path: '/private-club', requiresAuth: false },
      { titleKey: 'wallet', path: '/wallet', requiresAuth: true, wallet: true },
    ],
  },
  {
    sectionTitleKey: 'sectionsGroupSellerAccount',
    items: [{ titleKey: 'history', path: '/history', requiresAuth: true }],
  },
  {
    sectionTitleKey: 'sectionsGroupSellerSupport',
    items: [
      { titleKey: 'chat', path: '/chat?manager=1', requiresAuth: true },
      { titleKey: 'aiAssistant', path: '/chat', requiresAuth: true },
    ],
  },
]

export default function SectionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoaded: userLoaded } = useUser()
  const [roleTab, setRoleTab] = useState('investor')

  useEffect(() => {
    scrollMainTo(0, 0, 'instant')
  }, [])

  const signedIn = isSiteUserSignedIn(user, userLoaded)
  const sectionGroups = useMemo(
    () => (roleTab === 'seller' ? SELLER_SECTIONS : INVESTOR_SECTIONS),
    [roleTab],
  )

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
      const p = item.path.startsWith('/') ? item.path : `/${item.path}`
      navigate(p)
    },
    [location.pathname, navigate, signedIn],
  )

  return (
    <div className="sections-page">
      <Header />
      <main className="sections-page__main">
        <header className="sections-page__hero">
          <div className="sections-page__hero-inner">
            <h1 className="sections-page__title">
              <span className="sections-page__title-script">{t('sectionsHeroScript')}</span>
              <span className="sections-page__title-sans">{t('sectionsHeroSans')}</span>
            </h1>
            <Link className="sections-page__about-link" to="/about">
              <span className="sections-page__about-link-text">{t('sectionsAboutLink')}</span>
              <span className="sections-page__about-link-icon" aria-hidden>
                <FiArrowRight size={14} strokeWidth={2} />
              </span>
            </Link>
          </div>
        </header>

        <div className="sections-page__body">
          <p className="sections-page__lead">
            {roleTab === 'investor' ? t('sectionsLeadInvestor') : t('sectionsLeadSeller')}
          </p>

          <div className="sections-page__segment-wrap">
            <div
              className="sections-page__segment"
              role="tablist"
              aria-label={t('sectionsSegmentAria')}
            >
              <div
                className="sections-page__segment-thumb"
                data-active={roleTab === 'seller' ? 'seller' : 'investor'}
                aria-hidden
              />
              <button
                type="button"
                role="tab"
                id="sections-tab-investor"
                aria-selected={roleTab === 'investor'}
                aria-controls="sections-panel"
                className={`sections-page__segment-btn${roleTab === 'investor' ? ' sections-page__segment-btn--active' : ''}`}
                onClick={() => setRoleTab('investor')}
              >
                {t('sectionsToggleInvestor')}
              </button>
              <button
                type="button"
                role="tab"
                id="sections-tab-seller"
                aria-selected={roleTab === 'seller'}
                aria-controls="sections-panel"
                className={`sections-page__segment-btn${roleTab === 'seller' ? ' sections-page__segment-btn--active' : ''}`}
                onClick={() => setRoleTab('seller')}
              >
                {t('sectionsToggleSeller')}
              </button>
            </div>
          </div>

          <div
            className="sections-page__panels"
            id="sections-panel"
            role="tabpanel"
            aria-labelledby={roleTab === 'seller' ? 'sections-tab-seller' : 'sections-tab-investor'}
          >
            {sectionGroups.map((group) => (
              <section
                key={group.sectionTitleKey}
                className="sections-page__block"
                aria-label={t(group.sectionTitleKey)}
              >
                <h2 className="sections-page__block-title">{t(group.sectionTitleKey)}</h2>
                <ul className="sections-page__grid">
                  {group.items.map((item) => (
                    <li
                      key={`${roleTab}-${group.sectionTitleKey}-${item.path}-${item.titleKey}`}
                      className="sections-page__grid-cell"
                    >
                      <button
                        type="button"
                        className="sections-page__card"
                        onClick={() => goTo(item)}
                      >
                        <span className="sections-page__card-title">{t(item.titleKey)}</span>
                        <span className="sections-page__card-footer" aria-hidden>
                          <span className="sections-page__card-arrow">
                            <FiArrowRight size={14} strokeWidth={2.25} />
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="sections-page__lead-gen-slot">
            <LeadGenCta />
          </div>
        </div>
      </main>
    </div>
  )
}
