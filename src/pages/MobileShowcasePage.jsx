import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiArrowUpRight, FiSearch } from 'react-icons/fi'
import { AppleIcon, GooglePlayIcon } from '../components/icons/ContactChannelIcons'
import Header from '../components/Header'
import InvestorPropertyShowcaseSection from '../components/InvestorPropertyShowcaseSection'
import { useInvestorHomeShowcases } from '../hooks/useInvestorHomeShowcases'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { showNotification } from '../utils/toastHelper'
import { publicAsset } from '../utils/publicAsset'
import { CO_INVESTMENT_PATH } from '../utils/sectionPaths'
import './InvestorHomePage.css'
import '../styles/discoverAuctionCards.css'
import './MobileShowcasePage.css'

const strategies = [
  { id: 'auction', path: '/auction' },
  { id: 'buy-now', path: '/auction/buy-now' },
  { id: 'shares', path: CO_INVESTMENT_PATH },
  { id: 'debts', path: '/debts' },
  { id: 'test-drive', path: '/test-drive' },
]
const shortcuts = [
  { id: 'map', path: '/map' },
  { id: 'deposit', path: '/deposit' },
  { id: 'favorites', path: '/favorites' },
]
const asset = (id) => publicAsset(`images/mobile-showcase/${id}.webp`)

export default function MobileShowcasePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const showcases = useInvestorHomeShowcases({ includeBuyNowAuctions: true })
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const label = (key) => t(`mobileShowcase.${key}`)
  const listings = [
    { id: 'auction', variant: 'auction', items: showcases.auctionSection, path: '/auction' },
    { id: 'buy-now', variant: 'buyNow', items: showcases.buyNowSection, path: '/auction/buy-now' },
    { id: 'shares', variant: 'shares', items: showcases.sharesSection, path: CO_INVESTMENT_PATH },
    { id: 'debts', variant: 'debts', items: showcases.debtsSection, path: '/debts' },
  ]

  const search = (event) => {
    event.preventDefault()
    navigate('/search-results', { state: { fromPropertySearchBlock: true, searchQuery: query.trim() } })
  }

  return (
    <main className="ms-page">
      <div className="ms-site-nav">
        <Header />
      </div>
      <div className="ms-hero">
        <header className="ms-header">
          <Link className="ms-brand" to="/" aria-label="Sell Your Brick">
            <img src={asset('wordmark')} alt="Sell Your Brick" width="660" height="220" />
          </Link>
        </header>
        <div className="ms-intro"><h1>{label('headline')}</h1><span>{label('intro')}</span></div>
        <div className="ms-rail" aria-label={label('strategies')}>
          {strategies.map((item, index) => (
            <Link className={`ms-banner ms-banner--${item.id}`} key={item.id} to={item.path}>
              <img src={asset(item.id)} alt="" width="600" height="800" fetchPriority={index < 2 ? 'high' : 'auto'} decoding="async" />
              <div className="ms-banner-copy"><span className="ms-eyebrow">{label(`${item.id}.eyebrow`)}</span><h2>{label(`${item.id}.title`)}</h2></div>
              <span className="ms-banner-cta">{label('explore')}<FiArrowUpRight /></span>
            </Link>
          ))}
        </div>
      </div>
      <div className="ms-content">
        <nav className="ms-shortcuts" aria-label={label('quickActions')}>
          {shortcuts.map((item) => <Link key={item.id} className={`ms-shortcut ms-shortcut--${item.id}`} to={item.path}>
            <img src={asset(item.id)} width="360" height="360" alt="" />
            <h2>{label(`${item.id}.title`)}</h2><FiArrowUpRight className="ms-shortcut-arrow" />
          </Link>)}
        </nav>
        <form className="ms-search" role="search" onSubmit={search}>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('discoverPage_searchPlaceholder')} aria-label={t('search')} />
          <button type="submit" aria-label={t('search')}><FiSearch aria-hidden="true" /></button>
        </form>
        <div className="ms-listings invest-home-page discover-auction-cards">
          {listings.map((section) => showcases.loading || section.items.length > 0 ? (
            <InvestorPropertyShowcaseSection
              key={section.id}
              sectionId={`ms-listings-${section.id}`}
              title={label(`${section.id}.title`)}
              ctaLabel={label('all')}
              onCtaClick={() => navigate(section.path)}
              loading={showcases.loading}
              items={section.items}
              variant={section.variant}
              navigate={navigate}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
              ensureCanOpenProperty={ensureCanOpenProperty}
              showPropertyAuthRequiredToast={() => requestOpenLoginModal({ wizard: true })}
            />
          ) : (
            <section className="ms-listings-empty" key={section.id}>
              <div className="ms-section-heading"><h2>{label(`${section.id}.title`)}</h2><Link to={section.path}>{label('all')}<FiArrowUpRight /></Link></div>
              <p>{t('buyNowPageEmptyTitle')}</p>
            </section>
          ))}
        </div>
        <section className="ms-editorial">
          <div className="ms-section-heading"><h2>{label('possibilities')}</h2><Link to="/auction">{label('all')}<FiArrowUpRight /></Link></div>
          <div className="ms-feature-grid">
            <Link to="/test-drive" className="ms-feature ms-feature--travel">
              <img src={asset('test-drive')} alt="" width="600" height="800" loading="lazy" />
              <div><span className="ms-eyebrow">{label('test-drive.title')}</span><h3>{label('tryHome')}</h3><span className="ms-feature-link">{label('howItWorks')}<FiArrowRight /></span></div>
            </Link>
            <Link to={CO_INVESTMENT_PATH} className="ms-feature ms-feature--shares">
              <img src={asset('shares')} alt="" width="600" height="800" loading="lazy" />
              <div><span className="ms-eyebrow">{label('shares.title')}</span><h3>{label('shareHome')}</h3><span className="ms-feature-link">{label('explore')}<FiArrowRight /></span></div>
            </Link>
          </div>
        </section>
        <Link className="ms-catalog-link" to="/auction"><span>{label('findHome')}</span><FiArrowUpRight /></Link>
        <section className="ms-app-promo" aria-labelledby="ms-app-title">
          <div className="ms-app-promo__copy">
            <span className="ms-eyebrow">Sell Your Brick · App</span>
            <h2 id="ms-app-title">{label('appTitle')}</h2>
            <Link className="ms-app-promo__details" to="/app">{label('explore')}<FiArrowUpRight /></Link>
          </div>
            <div className="ms-app-promo__stores">
              {[{ name: 'App Store', Icon: AppleIcon }, { name: 'Google Play', Icon: GooglePlayIcon }].map(({ name, Icon }) => (
                <button type="button" key={name} onClick={() => showNotification(t('footerComingSoon'))}>
                  <Icon aria-hidden="true" /><span>{name}</span>
                </button>
              ))}
            </div>
        </section>
        <p className="ms-signoff">Sell Your Brick · {label('signoff')}</p>
      </div>
    </main>
  )
}
