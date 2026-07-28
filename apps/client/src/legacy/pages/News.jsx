import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import { SiInstagram, SiTelegram, SiWhatsapp } from 'react-icons/si'
import Header from '@/components/Header'
import NewsArticleCard from '@/components/news/NewsArticleCard'
import NewsArticleMeta from '@/components/news/NewsArticleMeta'
import { fetchPublishedArticles } from '@/services/newsApi'
import { scrollMainTo } from '@/utils/mainScroll'
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
            <h2 className="news-hero__title">{slide.title}</h2>
            <NewsArticleMeta
              className="news-meta--hero"
              date={slide.date}
              views={slide.views}
            />
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
            Новости, подборки и советы по недвижимости — в мессенджерах и соцсетях
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

  return (
    <div className="news-page">
      <Header />
      <main className="news-page__main">
        <div className="news-page__container">
          <NewsHero
            slides={heroSlides}
            activeIndex={heroIndex}
            onPrev={() => goHero(-1)}
            onNext={() => goHero(1)}
            onDot={setHeroIndex}
            onOpen={handleArticleOpen}
          />

          <section className="news-section" aria-label="Статьи">
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

          <NewsSocialBanner />
        </div>
      </main>
    </div>
  )
}

export default News
