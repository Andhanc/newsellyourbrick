import { useCallback, useEffect, useMemo, useState } from 'react'
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

const STATIC_HERO_SLIDES = [
  {
    id: 'turkey-resorts',
    slug: null,
    image: '/news/hero-turkey.png',
    badge: 'Идеи для поездок',
    title: '8 небанальных курортов Турции без «всё включено»',
    date: '5 апр 2026',
    views: 994,
    comments: 4,
    likes: 24,
  },
]

const STATIC_PORA_ARTICLES = [
  {
    id: 'crimea-top',
    slug: null,
    size: 'large',
    image:
      '/images/external/photo-1565008576549-57569a49371d-2725bbeba2.jpg',
    badge: '🌊 К морю!',
    title: 'Топ-10 курортных городов и посёлков южного берега Крыма',
    excerpt:
      'Южный берег Крыма — это не только Ялта и Алушта. Рассказываем о посёлках и городах, куда стоит поехать за морем, природой и спокойным отдыхом.',
    date: '25 мар 2026',
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
    badge: 'Идеи для поездок',
    title: 'Малые города Калининградской области, в которые стоит заехать',
    excerpt:
      'Зеленоградск, Светлогорск, Балтийск и другие уютные точки региона — маршрут на выходные без толп и сюрпризов для глаз.',
    date: '22 мар 2026',
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
    badge: 'Идеи для поездок',
    title: 'Города с необычной архитектурой: куда поехать в 2026',
    excerpt: 'От модерна до авангарда — подборка городов, где прогулки превращаются в экскурсию.',
    date: '15 мар 2026',
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
    badge: '🌊 К морю!',
    title: 'Пляжи России: 7 мест с чистой водой и инфраструктурой',
    excerpt: 'Собрали побережья, куда удобно добраться из крупных городов и где комфортно отдыхать с детьми.',
    date: '10 мар 2026',
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
    badge: 'Идеи для поездок',
    title: 'Винные маршруты Краснодарского края на выходные',
    excerpt: 'Дегустации, винодельни и гастрономия — план поездки на 2–3 дня.',
    date: '5 мар 2026',
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
    badge: 'Идеи для поездок',
    title: 'Казань или Нижний Новгород — куда лучше поехать в 2026 году',
    excerpt: 'Сравниваем атмосферу, достопримечательности и бюджет поездки на 3–4 дня.',
    date: '20 апр 2026',
    views: 871,
    comments: 2,
    likes: 11,
  },
]

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
  if (!slides.length) return null

  const safeIndex =
    ((activeIndex % slides.length) + slides.length) % slides.length
  const slide = slides[safeIndex]
  const canNavigate = slides.length > 1

  const openSlide = (target) => {
    if (target?.slug) onOpen(target)
  }

  return (
    <section className="news-hero" aria-label="Главная новость">
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
              aria-label="Предыдущая новость"
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
              aria-label="Следующая новость"
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
            <span className="news-hero__kicker">Главный материал</span>
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
                  Читать <FiArrowUpRight size={18} aria-hidden />
                </span>
              ) : null}
            </div>
          </button>
        </div>

        {canNavigate ? (
          <div className="news-hero__dots" role="tablist" aria-label="Слайды">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={`Слайд ${i + 1}`}
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
  if (!articles.length) return null

  const lead = articles[0]
  const left = articles[1] || lead
  const right = articles[2] || left

  const renderCard = (article, position, label) => (
    <button
      type="button"
      className={`news-mobile-feature__card news-mobile-feature__card--${position}`}
      onClick={onExplore}
      aria-label={`Показать новости. ${label}: ${article.title}`}
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
          {position === 'center' ? 'Главное' : article.badge || 'Новости'}
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
        <p className="news-mobile-feature__eyebrow">SellYourBrick Journal</p>
        <h1 id="news-mobile-title">Новости, которые помогают видеть рынок яснее</h1>

        <div className="news-mobile-feature__cards" aria-label="Главные материалы">
          {renderCard(left, 'left', 'Материал редакции')}
          {renderCard(lead, 'center', 'Главный материал')}
          {renderCard(right, 'right', 'Материал редакции')}
        </div>

        <p className="news-mobile-feature__lead">
          Рынок, города и инвестиции — коротко и по делу.
        </p>
        <button
          type="button"
          className="news-mobile-feature__subscribe"
          onClick={onSubscribe}
        >
          <FiBell size={17} aria-hidden />
          Подписаться на новости
        </button>
      </div>
    </section>
  )
}

function NewsSocialBanner() {
  return (
    <section className="news-social" aria-label="SellYourBrick в соцсетях">
      <div className="news-social__inner">
        <div className="news-social__copy">
          <p className="news-social__eyebrow">Следите за нами</p>
          <h2 className="news-social__brand" aria-label="SellYourBrick">
            <span className="news-social__brand-word">Sell</span>
            <span className="news-social__brand-word news-social__brand-word--accent">
              Your
            </span>
            <span className="news-social__brand-word">Brick</span>
          </h2>
          <p className="news-social__tagline">
            Новости рынка, закрытые подборки и советы экспертов — в наших
            мессенджерах и соцсетях.
          </p>
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
  const navigate = useNavigate()
  const [heroIndex, setHeroIndex] = useState(0)
  const [published, setPublished] = useState([])
  const [subscriptionOpen, setSubscriptionOpen] = useState(false)

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
    return STATIC_PORA_ARTICLES
  }, [published])

  const heroSlides = useMemo(() => {
    const fromPublished = dedupeArticlesById(published)
      .filter((a, i) => a.featured || i < 3)
      .slice(0, 5)
      .map(publishedToHeroSlide)
    if (fromPublished.length) return fromPublished
    return STATIC_HERO_SLIDES
  }, [published])

  const { duoRow1, duoRow2, trioRow1, trioRow2 } = useMemo(
    () => buildNewsGridRows(gridArticles),
    [gridArticles],
  )

  const heroCount = heroSlides.length

  const mobileArticles = useMemo(
    () => dedupeArticlesById([...heroSlides, ...gridArticles, ...STATIC_PORA_ARTICLES]),
    [heroSlides, gridArticles],
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
              <p className="news-masthead__eyebrow">
                <span aria-hidden /> SellYourBrick Journal
              </p>
              <h1 className="news-masthead__title">Новости</h1>
              <p className="news-masthead__lead">
                Недвижимость, инвестиции и города — спокойно, ясно и по делу.
              </p>
            </div>
            <div className="news-masthead__edition" aria-label="Выпуск 1, 2026 год">
              <span className="news-masthead__edition-label">Выпуск</span>
              <strong>01</strong>
              <span>2026</span>
            </div>
            <ul className="news-masthead__topics" aria-label="Темы журнала">
              <li>Рынок</li>
              <li>Инвестиции</li>
              <li>Города</li>
              <li>Стиль жизни</li>
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

          <section className="news-section" aria-label="Статьи">
            <div className="news-section__heading">
              <div>
                <p className="news-section__eyebrow">Редакционная подборка</p>
                <h2>Свежие материалы</h2>
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
                  <span className="news-mobile-feed__title-line">Новости</span>
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
