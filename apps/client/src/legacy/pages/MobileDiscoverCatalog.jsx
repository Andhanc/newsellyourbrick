import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi'
import Footer from '../components/Footer'
import MobileDiscoverFaq from '../components/MobileDiscoverFaq'
import InvestorPropertyShowcaseSection from '../components/InvestorPropertyShowcaseSection'
import { usePropertyFavorites, PROPERTY_FAVORITES_NEEDED } from '../context/PropertyFavoritesContext'
import { useInvestorHomeShowcases } from '../hooks/useInvestorHomeShowcases'
import { fetchPublishedArticles } from '../services/newsApi'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { showNotification } from '../utils/toastHelper'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { publicAsset } from '../utils/publicAsset'
import { AppleIcon, GooglePlayIcon } from '../components/icons/ContactChannelIcons'
import PropertyDetailAppBannerPhone from '../components/PropertyDetailAppBannerPhone'
import './InvestorHomePage.css'
import '../styles/discoverAuctionCards.css'

const BUY_NOW_PHOTO = publicAsset(
  'images/home-sale-formats/summer-2026/sale-format-auction-summer.webp',
)
const DEBTS_PHOTO = publicAsset(
  'images/home-sale-formats/summer-2026/sale-format-shares-summer.webp',
)
const ANDROID_URL = 'https://play.google.com/store/apps'
const IOS_URL = 'https://apps.apple.com/'

const FORMAT_CARD_META = {
  auction: { tone: 'sheet' },
  buy_now: { tone: 'photo', photo: BUY_NOW_PHOTO },
  shares: { tone: 'sheet' },
}

function getFallbackNews(t) {
  return [
    {
      id: 'crimea-top',
      slug: null,
      image: '/images/external/photo-1565008576549-57569a49371d-2725bbeba2.jpg',
      badge: t('newsPage_static_crimeaBadge'),
      title: t('newsPage_static_crimeaTitle'),
      excerpt: t('newsPage_static_crimeaExcerpt'),
      date: t('newsPage_static_crimeaDate'),
    },
    {
      id: 'kaliningrad-small',
      slug: null,
      image: '/images/external/photo-1449824913935-59a10b8d2000-e6bb6de958.jpg',
      badge: t('newsPage_static_kaliningradBadge'),
      title: t('newsPage_static_kaliningradTitle'),
      excerpt: t('newsPage_static_kaliningradExcerpt'),
      date: t('newsPage_static_kaliningradDate'),
    },
    {
      id: 'architecture',
      slug: null,
      image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
      badge: t('newsPage_static_architectureBadge'),
      title: t('newsPage_static_architectureTitle'),
      excerpt: t('newsPage_static_architectureExcerpt'),
      date: t('newsPage_static_architectureDate'),
    },
    {
      id: 'beach-aerial',
      slug: null,
      image: '/images/external/photo-1507525428034-b723cf961d3e-ae413f8ef9.jpg',
      badge: t('newsPage_static_beachBadge'),
      title: t('newsPage_static_beachTitle'),
      excerpt: t('newsPage_static_beachExcerpt'),
      date: t('newsPage_static_beachDate'),
    },
  ]
}

function getShowcaseSections(t) {
  return [
    {
      id: 'auction',
      sectionId: 'invest-objects-auction',
      variant: 'auction',
      title: t('auction'),
      subtitle: t('discoverPage_showcaseAuctionSubtitle'),
      ctaLabel: t('goTo'),
      to: '/auction?filter=auction',
      itemsKey: 'auctionSection',
    },
    {
      id: 'buy_now',
      sectionId: 'invest-objects-buy-now',
      variant: 'buyNow',
      title: t('buyNowSectionTitle'),
      subtitle: t('discoverPage_showcaseBuyNowSubtitle'),
      ctaLabel: t('goTo'),
      to: '/auction/buy-now',
      itemsKey: 'buyNowSection',
    },
    {
      id: 'shares',
      sectionId: 'invest-objects-shares',
      variant: 'shares',
      title: t('coInvestment'),
      subtitle: t('discoverPage_showcaseSharesSubtitle'),
      ctaLabel: t('goTo'),
      to: '/shares',
      itemsKey: 'sharesSection',
    },
    {
      id: 'debts',
      sectionId: 'invest-objects-debts',
      variant: 'debts',
      title: t('debtsTitle'),
      subtitle: t('discoverPage_showcaseDebtsSubtitle'),
      ctaLabel: t('goTo'),
      to: '/debts',
      itemsKey: 'debtsSection',
    },
  ]
}

function FormatCard({ id, index, tone = 'sheet', photo, children }) {
  return (
    <section
      className={`md-format-card md-format-card--${tone}`}
      data-md-format-card=""
      data-md-format={id}
      style={{ zIndex: index + 1 }}
    >
      {tone === 'photo' && photo ? (
        <>
          <img
            className="md-format-card__photo"
            src={photo}
            alt=""
            width={1080}
            height={1920}
            loading="lazy"
            decoding="async"
          />
          <div className="md-format-card__shade" aria-hidden="true" />
        </>
      ) : null}
      <div className="md-format-card__body">{children}</div>
    </section>
  )
}

/**
 * Debts use one sticky panel with the same park point as other format cards.
 * A short park tail keeps the panel locked; then the rest of the page scrolls normally.
 */
function DebtsFlow({ index, children }) {
  return (
    <div className="md-debts-scene" style={{ zIndex: index + 1 }}>
      {/* The debts photo and property cards move together with page scroll. */}
      <div className="md-debts-pin">
        <div className="md-debts-pin__media" aria-hidden="true">
          <img
            className="md-debts-pin__photo"
            src={DEBTS_PHOTO}
            alt=""
            width={1080}
            height={1920}
            loading="lazy"
            decoding="async"
          />
          <div className="md-debts-pin__shade" />
        </div>

        <div
          className="md-debts-pin__showcase"
          data-md-format-card=""
          data-md-format="debts"
        >
          {children}
        </div>

      </div>

      <div className="md-debts-pin__park" aria-hidden="true" />
    </div>
  )
}

function AppDownloadSection() {
  const { t } = useTranslation()
  return (
    <section className="md-app-download" aria-labelledby="md-app-download-title">
      <div className="md-app-download__inner">
        <img
          className="md-app-download__art"
          src={publicAsset('images/app-download/tiffany-phone-banner.webp')}
          alt=""
          loading="lazy"
          width="1280"
          height="720"
        />
        <div className="md-app-download__phone">
          <PropertyDetailAppBannerPhone />
        </div>
        <div className="md-app-download__copy">
          <p className="md-app-download__kicker">{t('discoverPage_appKicker')}</p>
          <h2 id="md-app-download-title" className="md-app-download__title" aria-label="SellYourBrick">
            <span>Sell</span>
            <span className="md-app-download__brand-accent">Your</span>
            <span>Brick</span>
          </h2>
          <p className="md-app-download__lead">{t('discoverPage_appTitleRest')}</p>
          <div className="md-app-download__stores">
            <a href={IOS_URL} target="_blank" rel="noopener noreferrer" className="md-app-download__store">
              <AppleIcon aria-hidden="true" />
              <span>App Store</span>
            </a>
            <a href={ANDROID_URL} target="_blank" rel="noopener noreferrer" className="md-app-download__store">
              <GooglePlayIcon aria-hidden="true" />
              <span>Google Play</span>
            </a>
          </div>
          <Link to="/app" className="md-app-download__download">
            <span>{t('discoverPage_appDownload')}</span>
            <FiArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function NewsSection({ articles }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [featured, ...rest] = articles

  const openArticle = (article) => {
    if (article?.slug) navigate(`/news/${article.slug}`)
    else navigate('/news')
  }

  return (
    <section className="md-news" aria-labelledby="md-news-title">
      <div className="md-news__inner">
        <header className="md-news__header">
          <div className="md-news__title-row">
            <h2 id="md-news-title" className="md-news__title">
              {t('news')}
            </h2>
            <Link to="/news" className="md-news__all">
              <span>{t('sybLandingNewsViewAll')}</span>
              <FiArrowRight aria-hidden />
            </Link>
          </div>
          <p className="md-news__subtitle">{t('discoverPage_newsSubtitle')}</p>
        </header>

        {featured ? (
          <article className="md-news-feature">
            <button
              type="button"
              className="md-news-feature__hit"
              onClick={() => openArticle(featured)}
              aria-label={featured.title}
            >
              <div className="md-news-feature__media">
                <img
                  src={featured.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={720}
                  height={480}
                />
              </div>
              <div className="md-news-feature__overlay">
                <div className="md-news-feature__meta">
                  {featured.badge ? (
                    <span className="md-news-feature__badge">{featured.badge}</span>
                  ) : null}
                  {featured.date ? (
                    <time className="md-news-feature__date">{featured.date}</time>
                  ) : null}
                </div>
                <h3 className="md-news-feature__title">{featured.title}</h3>
                {featured.excerpt ? (
                  <p className="md-news-feature__excerpt">{featured.excerpt}</p>
                ) : null}
                <span className="md-news-feature__cta" aria-hidden>
                  {t('newsPage_heroRead')}
                  <FiArrowUpRight />
                </span>
              </div>
            </button>
          </article>
        ) : null}

        {rest.length > 0 ? (
          <ul className="md-news__list">
            {rest.map((article, index) => (
              <li key={article.id || article.slug || index}>
                <article className="md-news-card">
                  <button
                    type="button"
                    className="md-news-card__hit"
                    onClick={() => openArticle(article)}
                    aria-label={article.title}
                  >
                    <div className="md-news-card__media">
                      <img
                        src={article.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={160}
                        height={160}
                      />
                    </div>
                    <div className="md-news-card__body">
                      <div className="md-news-card__meta">
                        {article.badge ? (
                          <span className="md-news-card__badge">{article.badge}</span>
                        ) : null}
                        {article.date ? (
                          <time className="md-news-card__date">{article.date}</time>
                        ) : null}
                      </div>
                      <h3 className="md-news-card__title">{article.title}</h3>
                      <span className="md-news-card__cta" aria-hidden>
                        {t('newsPage_heroRead')}
                        <FiArrowUpRight />
                      </span>
                    </div>
                  </button>
                </article>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

/**
 * Property catalog on Mobile Discover — one full screen per sale format.
 */
export default function MobileDiscoverCatalog() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [newsArticles, setNewsArticles] = useState(() => getFallbackNews(t))
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const {
    loading,
    auctionSection,
    buyNowSection,
    debtsSection,
    sharesSection,
  } = useInvestorHomeShowcases()

  useEffect(() => {
    window.dispatchEvent(new Event(PROPERTY_FAVORITES_NEEDED))
  }, [])

  const itemsByKey = {
    auctionSection,
    buyNowSection,
    sharesSection,
    debtsSection,
  }

  const showcaseSections = getShowcaseSections(t)

  useEffect(() => {
    let cancelled = false
    const fallback = getFallbackNews(t)
    setNewsArticles(fallback)
    fetchPublishedArticles()
      .then((articles) => {
        if (cancelled || !Array.isArray(articles) || articles.length === 0) return
        const fromApi = articles.slice(0, 4).map((article) => ({
          id: article.id,
          slug: article.slug,
          image: article.image,
          badge: article.badge || t('newsPage_mobileBadgeFallback'),
          title: article.title,
          excerpt: article.excerpt,
          date: article.date,
        }))
        const filled = [...fromApi]
        for (const item of fallback) {
          if (filled.length >= 4) break
          if (filled.some((a) => a.id === item.id || a.title === item.title)) continue
          filled.push(item)
        }
        setNewsArticles(filled.slice(0, 4))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [t, i18n.language])

  const showPropertyAuthRequiredToast = useCallback(() => {
    showNotification(t('discoverPage_authToOpenProperty'), 'warning', 7000)
    requestOpenLoginModal({ wizard: true })
  }, [t])

  const renderSection = (section) => {
    const items = itemsByKey[section.itemsKey]
    if (!loading && (!items || items.length === 0)) return null

    return (
      <InvestorPropertyShowcaseSection
        key={section.id}
        sectionId={section.sectionId}
        title={section.title}
        subtitle={section.subtitle}
        ctaLabel={section.ctaLabel}
        onCtaClick={() => navigate(section.to)}
        loading={loading}
        items={items || []}
        variant={section.variant}
        navigate={navigate}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        ensureCanOpenProperty={ensureCanOpenProperty}
        showPropertyAuthRequiredToast={showPropertyAuthRequiredToast}
      />
    )
  }

  // The sticky stack follows native stage scrolling. Do not write scrollTop or
  // intercept touch/wheel here: that fights momentum and horizontal card swipes.

  const auction = showcaseSections.find((s) => s.id === 'auction')
  const buyNow = showcaseSections.find((s) => s.id === 'buy_now')
  const shares = showcaseSections.find((s) => s.id === 'shares')
  const debts = showcaseSections.find((s) => s.id === 'debts')

  const formatCards = [
    auction ? { id: 'auction', node: renderSection(auction) } : null,
    buyNow ? { id: 'buy_now', node: renderSection(buyNow) } : null,
    shares ? { id: 'shares', node: renderSection(shares) } : null,
    debts ? { id: 'debts', node: renderSection(debts) } : null,
  ]
    .filter((item) => item?.node)
    .map((item) => ({
      ...item,
      ...(FORMAT_CARD_META[item.id] || { tone: 'sheet' }),
    }))

  return (
    <div className="md-catalog invest-home-page discover-auction-cards">
      <div className="md-format-stack">
        <div className="md-format-stack__origin" data-md-format-origin="" aria-hidden="true" />

        {formatCards.map((card, index) =>
          card.id === 'debts' ? (
            <DebtsFlow key={card.id} index={index}>
              {card.node}
            </DebtsFlow>
          ) : (
            <FormatCard
              key={card.id}
              id={card.id}
              index={index}
              tone={card.tone}
              photo={card.photo}
            >
              {card.node}
            </FormatCard>
          ),
        )}
      </div>

      <div className="md-free-tail" data-md-free-tail="">
        <AppDownloadSection />
        <NewsSection articles={newsArticles} />
        <MobileDiscoverFaq />
        <div className="md-footer-wrap">
          <Footer />
        </div>
      </div>
    </div>
  )
}
