import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowUpRight,
  FiBell,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import { SiInstagram, SiTelegram, SiWhatsapp } from 'react-icons/si'
import Header from '@/components/Header'
import NewsArticleCard from '@/components/news/NewsArticleCard'
import NewsArticleMeta from '@/components/news/NewsArticleMeta'
import NewsSubscriptionDrawer from '@/components/news/NewsSubscriptionDrawer'
import { fetchPublishedArticles } from '@/services/newsApi'
import { scrollMainElementIntoView, scrollMainTo } from '@/utils/mainScroll'
import './News.css'

function getStaticHeroSlides(t) {
  return [
    {
      id: 'turkey-resorts',
      slug: null,
      image: '/news/hero-turkey.png',
      badge: t('newsPage_static_heroBadge'),
      title: t('newsPage_static_heroTitle'),
      date: t('newsPage_static_heroDate'),
      views: 994,
      comments: 4,
      likes: 24,
    },
  ]
}

function getStaticPoraArticles(t) {
  return [
    {
      id: 'crimea-top',
      slug: null,
      size: 'large',
      image:
        '/images/external/photo-1565008576549-57569a49371d-2725bbeba2.jpg',
      badge: t('newsPage_static_crimeaBadge'),
      title: t('newsPage_static_crimeaTitle'),
      excerpt: t('newsPage_static_crimeaExcerpt'),
      date: t('newsPage_static_crimeaDate'),
      views: 960,
      comments: 2,
      likes: 38,
    },
    {
      id: 'kaliningrad-small',
      slug: null,
      size: 'large',
      image:
        '/images/external/photo-1449824913935-59a10b8d2000-e6bb6de958.jpg',
      badge: t('newsPage_static_kaliningradBadge'),
      title: t('newsPage_static_kaliningradTitle'),
      excerpt: t('newsPage_static_kaliningradExcerpt'),
      date: t('newsPage_static_kaliningradDate'),
      views: 743,
      comments: 3,
      likes: 21,
    },
    {
      id: 'architecture',
      slug: null,
      size: 'medium',
      image:
        '/images/external/photo-1449824913935-59a10b8d2000-e6bb6de958.jpg',
      badge: t('newsPage_static_architectureBadge'),
      title: t('newsPage_static_architectureTitle'),
      excerpt: t('newsPage_static_architectureExcerpt'),
      date: t('newsPage_static_architectureDate'),
      views: 654,
      comments: 1,
      likes: 17,
    },
    {
      id: 'beach-aerial',
      slug: null,
      size: 'medium',
      image:
        '/images/external/photo-1507525428034-b723cf961d3e-ae413f8ef9.jpg',
      badge: t('newsPage_static_beachBadge'),
      title: t('newsPage_static_beachTitle'),
      excerpt: t('newsPage_static_beachExcerpt'),
      date: t('newsPage_static_beachDate'),
      views: 1204,
      comments: 8,
      likes: 56,
    },
    {
      id: 'wine-route',
      slug: null,
      size: 'small',
      image:
        '/images/external/photo-1510812431401-41d2bd2722f3-b97a9ab704.jpg',
      badge: t('newsPage_static_wineBadge'),
      title: t('newsPage_static_wineTitle'),
      excerpt: t('newsPage_static_wineExcerpt'),
      date: t('newsPage_static_wineDate'),
      views: 489,
      comments: 0,
      likes: 12,
    },
    {
      id: 'kazan-nn',
      slug: null,
      size: 'small',
      image:
        '/images/external/photo-1469854523086-cc02fe5d8800-5a351c34bc.jpg',
      badge: t('newsPage_static_kazanBadge'),
      title: t('newsPage_static_kazanTitle'),
      excerpt: t('newsPage_static_kazanExcerpt'),
      date: t('newsPage_static_kazanDate'),
      views: 871,
      comments: 2,
      likes: 11,
    },
  ]
}

const TELEGRAM_HREF =
  (import.meta.env?.VITE_MANAGER_TELEGRAM_URL || '').trim() || 'https://t.me/'

const MOBILE_FEATURE_IMAGES = {
  left: '/images/test-drive/property-santorini.png',
  center: '/images/new-home/new-home-hero-villa.jpg',
  right: '/images/test-drive/property-sorrento.png',
}

const SOCIAL_LINKS = [
  { id: 'telegram', label: 'Telegram', href: TELEGRAM_HREF, Icon: SiTelegram },
  {
    id: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/',
    Icon: SiInstagram,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: 'https://wa.me/447700183959',
    Icon: SiWhatsapp,
  },
]

function publishedToHeroSlide(article) {
  return {
    id: article.id,
    slug: article.slug,
    image: article.image,
    badge: article.badge,
    title: article.title,
    date: article.date,
    views: article.views,
    comments: article.comments,
    likes: article.likes,
  }
}

function dedupeArticlesById(articles) {
  const seen = new Set()
  return articles.filter((a) => {
    if (!a?.id || seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })
}

/** Каждая статья — максимум в одном ряду сетки (без повторов между рядами). */
function buildNewsGridRows(articles) {
  const pool = articles
  const used = new Set()

  const pick = (limit, size) => {
    const out = []
    for (const article of pool) {
      if (used.has(article.id)) continue
      if (size && article.size !== size) continue
      out.push(article)
      used.add(article.id)
      if (out.length >= limit) break
    }
    return out
  }

  const pickAny = (limit) => {
    const out = []
    for (const article of pool) {
      if (used.has(article.id)) continue
      out.push(article)
      used.add(article.id)
      if (out.length >= limit) break
    }
    return out
  }

  const fillRow = (limit, size) => {
    const row = pick(limit, size)
    while (row.length < limit) {
      const more = pickAny(1)
      if (!more.length) break
      row.push(...more)
    }
    return row
  }

  return {
    duoRow1: fillRow(2, 'large'),
    duoRow2: fillRow(2, 'medium'),
    trioRow1: fillRow(3, 'small'),
    trioRow2: pickAny(3),
  }
}

function NewsHero({ slides, activeIndex, onPrev, onNext, onDot, onOpen }) {
  const { t } = useTranslation()
  if (!slides.length) return null

  const safeIndex =
    ((activeIndex % slides.length) + slides.length) % slides.length
  const slide = slides[safeIndex]
  const canNavigate = slides.length > 1

  const openSlide = (target) => {
    if (target?.slug) onOpen(target)
  }

  return (
    <section className="news-hero" aria-label={t('newsPage_heroAria')}>
      <div className="news-hero__frame">
        <div
          className="news-hero__track"
          style={{ transform: `translate3d(-${safeIndex * 100}%, 0, 0)` }}
        >
          {slides.map((item) => (
            <article key={item.id} className="news-hero__slide" aria-hidden={item.id !== slide.id}>
              <img className="news-hero__bg" src={item.image} alt="" loading="lazy" decoding="async" />
            </article>
          ))}
        </div>

        <div className="news-hero__overlay" aria-hidden />

        {canNavigate ? (
          <>
            <button
              type="button"
              className="news-hero__nav news-hero__nav--prev"
              onClick={(e) => {
                e.stopPropagation()
                onPrev()
              }}
              aria-label={t('newsPage_heroPrev')}
            >
              <FiChevronLeft size={28} />
            </button>
            <button
              type="button"
              className="news-hero__nav news-hero__nav--next"
              onClick={(e) => {
                e.stopPropagation()
                onNext()
              }}
              aria-label={t('newsPage_heroNext')}
            >
              <FiChevronRight size={28} />
            </button>
          </>
        ) : null}

        <div className="news-hero__content">
          <button
            type="button"
            className="news-hero__content-hit"
            onClick={() => openSlide(slide)}
            disabled={!slide.slug}
          >
            <span className="news-hero__kicker">{t('newsPage_heroKicker')}</span>
            {slide.badge ? <span className="news-hero__badge">{slide.badge}</span> : null}
            <h2 className="news-hero__title">{slide.title}</h2>
            <div className="news-hero__footer">
              <NewsArticleMeta
                className="news-meta--hero"
                date={slide.date}
                views={slide.views}
              />
              {slide.slug ? (
                <span className="news-hero__read">
                  {t('newsPage_heroRead')} <FiArrowUpRight size={18} aria-hidden />
                </span>
              ) : null}
            </div>
          </button>
        </div>

        {canNavigate ? (
          <div className="news-hero__dots" role="tablist" aria-label={t('newsPage_heroSlidesAria')}>
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={t('newsPage_heroSlideAria', { n: i + 1 })}
                className={`news-hero__dot${i === safeIndex ? ' news-hero__dot--active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDot(i)
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function NewsMobileHero({ articles, onExplore, onSubscribe }) {
  const { t } = useTranslation()
  if (!articles.length) return null

  const lead = articles[0]
  const left = articles[1] || lead
  const right = articles[2] || left

  const renderCard = (article, position, label) => (
    <button
      type="button"
      className={`news-mobile-feature__card news-mobile-feature__card--${position}`}
      onClick={onExplore}
      aria-label={t('newsPage_mobileShowAria', { label, title: article.title })}
    >
      <span className="news-mobile-feature__image">
        <img
          src={MOBILE_FEATURE_IMAGES[position]}
          alt=""
          loading={position === 'center' ? 'eager' : 'lazy'}
        />
      </span>
      <span className="news-mobile-feature__card-copy">
        <span className="news-mobile-feature__badge">
          {position === 'center'
            ? t('newsPage_mobileBadgeMain')
            : article.badge || t('newsPage_mobileBadgeFallback')}
        </span>
        <strong>{article.title}</strong>
        <span className="news-mobile-feature__date">{article.date}</span>
      </span>
    </button>
  )

  return (
    <section className="news-mobile-feature" aria-labelledby="news-mobile-title">
      <div className="news-mobile-feature__veil" aria-hidden />
      <div className="news-mobile-feature__content">
        <div className="news-mobile-feature__brand" aria-label="SellYourBrick">
          <span className="news-mobile-feature__brand-text">
            <span className="news-mobile-feature__brand-word">Sell</span>
            <span className="news-mobile-feature__brand-word news-mobile-feature__brand-word--accent">
              Your
            </span>
            <span className="news-mobile-feature__brand-word">Brick</span>
          </span>
        </div>
        <h1 id="news-mobile-title">{t('newsPage_mobileFeedTitle')}</h1>

        <div className="news-mobile-feature__cards" aria-label={t('newsPage_mobileCardsAria')}>
          {renderCard(left, 'left', t('newsPage_mobileCardLabelEditor'))}
          {renderCard(lead, 'center', t('newsPage_mobileCardLabelFeatured'))}
          {renderCard(right, 'right', t('newsPage_mobileCardLabelEditor'))}
        </div>

        <p className="news-mobile-feature__lead">{t('newsPage_mobileLead')}</p>
        <button
          type="button"
          className="news-mobile-feature__subscribe"
          onClick={onSubscribe}
        >
          <FiBell size={17} aria-hidden />
          {t('newsPage_mobileSubscribe')}
        </button>
      </div>
    </section>
  )
}

function NewsSocialBanner() {
  const { t } = useTranslation()
  return (
    <section className="news-social" aria-label={t('newsPage_socialAria')}>
      <div className="news-social__inner">
        <div className="news-social__copy">
          <p className="news-social__eyebrow">{t('newsPage_socialEyebrow')}</p>
          <h2 className="news-social__brand" aria-label="SellYourBrick">
            <span className="news-social__brand-word">Sell</span>
            <span className="news-social__brand-word news-social__brand-word--accent">
              Your
            </span>
            <span className="news-social__brand-word">Brick</span>
          </h2>
          <p className="news-social__tagline">{t('newsPage_socialTagline')}</p>
        </div>
        <ul className="news-social__links">
          {SOCIAL_LINKS.map((item) => {
            const Icon = item.Icon
            return (
              <li key={item.id}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="news-social__link"
                >
                  <span className="news-social__link-icon" aria-hidden>
                    <Icon size={22} />
                  </span>
                  <span className="news-social__link-label">{item.label}</span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

const News = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [heroIndex, setHeroIndex] = useState(0)
  const [published, setPublished] = useState([])
  const [subscriptionOpen, setSubscriptionOpen] = useState(false)

  const staticPoraArticles = useMemo(
    () => getStaticPoraArticles(t),
    [t, i18n.language],
  )
  const staticHeroSlides = useMemo(
    () => getStaticHeroSlides(t),
    [t, i18n.language],
  )

  useEffect(() => {
    scrollMainTo(0, 0)
    fetchPublishedArticles()
      .then(setPublished)
      .catch(() => setPublished([]))
  }, [])

  const gridArticles = useMemo(() => {
    const mapArticle = (a) => ({
      id: a.id,
      slug: a.slug,
      size: a.size || 'medium',
      image: a.image,
      badge: a.badge,
      title: a.title,
      excerpt: a.excerpt,
      date: a.date,
      views: a.views,
      comments: a.comments,
      likes: a.likes,
    })

    if (published.length) {
      return dedupeArticlesById(published).map(mapArticle)
    }
    return staticPoraArticles
  }, [published, staticPoraArticles])

  const heroSlides = useMemo(() => {
    const fromPublished = dedupeArticlesById(published)
      .filter((a, i) => a.featured || i < 3)
      .slice(0, 5)
      .map(publishedToHeroSlide)
    if (fromPublished.length) return fromPublished
    return staticHeroSlides
  }, [published, staticHeroSlides])

  const { duoRow1, duoRow2, trioRow1, trioRow2 } = useMemo(
    () => buildNewsGridRows(gridArticles),
    [gridArticles],
  )

  const heroCount = heroSlides.length

  const mobileArticles = useMemo(
    () => dedupeArticlesById([...heroSlides, ...gridArticles, ...staticPoraArticles]),
    [heroSlides, gridArticles, staticPoraArticles],
  )
  const mobileFeaturedArticles = mobileArticles.slice(0, 3)
  const mobileFeedArticles = gridArticles

  useEffect(() => {
    if (!heroCount) {
      setHeroIndex(0)
      return
    }
    setHeroIndex((i) => (i >= heroCount ? 0 : i))
  }, [heroCount, heroSlides.map((s) => s.id).join('|')])

  const goHero = useCallback(
    (delta) => {
      if (heroCount < 1) return
      setHeroIndex((i) => (i + delta + heroCount) % heroCount)
    },
    [heroCount],
  )

  const handleArticleOpen = useCallback(
    (article) => {
      if (article.slug) {
        navigate(`/news/${article.slug}`)
      }
    },
    [navigate],
  )

  const handleMobileExplore = useCallback(() => {
    const feed = document.getElementById('news-mobile-feed')
    scrollMainElementIntoView(feed, { offset: 82, behavior: 'smooth' })
  }, [])

  return (
    <div className="news-page">
      <Header />
      <main className="news-page__main">
        <NewsMobileHero
          articles={mobileFeaturedArticles}
          onExplore={handleMobileExplore}
          onSubscribe={() => setSubscriptionOpen(true)}
        />
        <div className="news-page__container">
          <header className="news-masthead">
            <div className="news-masthead__copy">
              <div className="news-masthead__brand" aria-label="SellYourBrick">
                <span className="news-masthead__brand-word">Sell</span>
                <span className="news-masthead__brand-word news-masthead__brand-word--accent">
                  Your
                </span>
                <span className="news-masthead__brand-word">Brick</span>
              </div>
              <h1 className="news-masthead__title">{t('newsPage_mastheadTitle')}</h1>
              <p className="news-masthead__lead">{t('newsPage_mastheadLead')}</p>
            </div>
            <div className="news-masthead__edition" aria-label={t('newsPage_editionAria')}>
              <span className="news-masthead__edition-label">{t('newsPage_editionLabel')}</span>
              <strong>01</strong>
              <span>2026</span>
            </div>
            <ul className="news-masthead__topics" aria-label={t('newsPage_topicsAria')}>
              <li>{t('newsPage_topicMarket')}</li>
              <li>{t('newsPage_topicInvest')}</li>
              <li>{t('newsPage_topicCities')}</li>
              <li>{t('newsPage_topicLifestyle')}</li>
            </ul>
          </header>

          <NewsHero
            slides={heroSlides}
            activeIndex={heroIndex}
            onPrev={() => goHero(-1)}
            onNext={() => goHero(1)}
            onDot={setHeroIndex}
            onOpen={handleArticleOpen}
          />

          <section className="news-section" aria-label={t('newsPage_sectionAria')}>
            <div className="news-section__heading">
              <div>
                <p className="news-section__eyebrow">{t('newsPage_sectionEyebrow')}</p>
                <h2>{t('newsPage_sectionTitle')}</h2>
              </div>
              <span className="news-section__count">
                {String(gridArticles.length).padStart(2, '0')}
              </span>
            </div>

            {duoRow1.length > 0 ? (
              <div className="news-grid news-grid--duo">
                {duoRow1.map((article) => (
                  <NewsArticleCard key={article.id} article={article} onOpen={handleArticleOpen} />
                ))}
              </div>
            ) : null}

            {duoRow2.length > 0 ? (
              <div className="news-grid news-grid--duo news-grid--spaced">
                {duoRow2.map((article) => (
                  <NewsArticleCard key={article.id} article={article} onOpen={handleArticleOpen} />
                ))}
              </div>
            ) : null}

            {trioRow1.length > 0 ? (
              <div className="news-grid news-grid--trio news-grid--spaced">
                {trioRow1.map((article) => (
                  <NewsArticleCard key={article.id} article={article} onOpen={handleArticleOpen} />
                ))}
              </div>
            ) : null}

            {trioRow2.length > 0 ? (
              <div className="news-grid news-grid--trio news-grid--spaced">
                {trioRow2.map((article) => (
                  <NewsArticleCard key={article.id} article={article} onOpen={handleArticleOpen} />
                ))}
              </div>
            ) : null}
          </section>

          {mobileFeedArticles.length ? (
            <section
              id="news-mobile-feed"
              className="news-mobile-feed"
              aria-labelledby="news-mobile-feed-title"
            >
              <div className="news-mobile-feed__heading">
                <h2 id="news-mobile-feed-title">
                  <span className="news-mobile-feed__brand" aria-label="SellYourBrick">
                    <span>Sell</span>
                    <span className="news-mobile-feed__brand-accent">Your</span>
                    <span>Brick</span>
                  </span>
                  <span className="news-mobile-feed__title-line">{t('newsPage_mobileFeedTitle')}</span>
                </h2>
              </div>
              <div className="news-mobile-feed__list">
                {mobileFeedArticles.map((article) => (
                  <NewsArticleCard key={`mobile-${article.id}`} article={article} onOpen={handleArticleOpen} />
                ))}
              </div>
            </section>
          ) : null}

          <NewsSocialBanner />
        </div>
      </main>
      <NewsSubscriptionDrawer
        isOpen={subscriptionOpen}
        onClose={() => setSubscriptionOpen(false)}
      />
    </div>
  )
}

export default News
