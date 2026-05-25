import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import { SiTelegram } from 'react-icons/si'
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
      'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=900&h=520&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1596484552834-065fdc8dc103?w=900&h=520&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=700&h=420&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&h=420&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=380&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1520106212296-df2701f1c794?w=600&h=380&fit=crop&q=80',
    badge: 'Идеи для поездок',
    title: 'Казань или Нижний Новгород — куда лучше поехать в 2026 году',
    excerpt: 'Сравниваем атмосферу, достопримечательности и бюджет поездки на 3–4 дня.',
    date: '20 апр 2026',
    views: 871,
    comments: 2,
    likes: 11,
  },
]

const SOCIAL_LINKS = [
  { id: 'telegram', label: 'Telegram', href: 'https://t.me/', Icon: SiTelegram },
  { id: 'vk', label: 'VK', href: 'https://vk.com/', iconLetter: 'VK' },
  { id: 'dzen', label: 'Dzen', href: 'https://dzen.ru/', iconLetter: 'Д' },
  { id: 'pinterest', label: 'Pinterest', href: 'https://pinterest.com/', iconLetter: 'P' },
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

function NewsHero({ slides, activeIndex, onPrev, onNext, onDot, onOpen }) {
  const slide = slides[activeIndex]

  return (
    <section className="news-hero" aria-label="Главная новость">
      <div className="news-hero__frame">
        <button
          type="button"
          className="news-hero__hit"
          onClick={() => slide.slug && onOpen(slide)}
          disabled={!slide.slug}
        >
          <img className="news-hero__bg" src={slide.image} alt="" />
        </button>
        <div className="news-hero__overlay" aria-hidden />
        <button
          type="button"
          className="news-hero__nav news-hero__nav--prev"
          onClick={onPrev}
          aria-label="Предыдущая новость"
        >
          <FiChevronLeft size={28} />
        </button>
        <button
          type="button"
          className="news-hero__nav news-hero__nav--next"
          onClick={onNext}
          aria-label="Следующая новость"
        >
          <FiChevronRight size={28} />
        </button>
        <div className="news-hero__content">
          <span className="news-hero__badge">{slide.badge}</span>
          <h2 className="news-hero__title">{slide.title}</h2>
          <NewsArticleMeta
            className="news-meta--hero"
            date={slide.date}
            views={slide.views}
            comments={slide.comments}
            likes={slide.likes}
          />
        </div>
        <div className="news-hero__dots" role="tablist" aria-label="Слайды">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Слайд ${i + 1}`}
              className={`news-hero__dot${i === activeIndex ? ' news-hero__dot--active' : ''}`}
              onClick={() => onDot(i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function NewsSocialBanner() {
  return (
    <section className="news-social" aria-label="Мы в соцсетях">
      <div className="news-social__inner">
        <div className="news-social__brand">
          <span className="news-social__mascot" aria-hidden>
            <span className="news-social__mascot-head" />
            <span className="news-social__mascot-glasses" />
          </span>
          <p className="news-social__title">МЫ В СОЦСЕТЯХ</p>
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
                  {Icon ? (
                    <Icon size={22} />
                  ) : (
                    <span className="news-social__link-letter">{item.iconLetter}</span>
                  )}
                </span>
                <span className="news-social__link-label">
                  {item.label}
                  <span className="news-social__link-arrow" aria-hidden>
                    ›
                  </span>
                </span>
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
    if (published.length) {
      return published.map((a) => ({
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
      }))
    }
    return STATIC_PORA_ARTICLES
  }, [published])

  const heroSlides = useMemo(() => {
    const fromPublished = published
      .filter((a) => a.featured || published.indexOf(a) < 3)
      .slice(0, 5)
      .map(publishedToHeroSlide)
    if (fromPublished.length) return fromPublished
    return STATIC_HERO_SLIDES
  }, [published])

  const heroCount = heroSlides.length
  const goHero = useCallback(
    (delta) => {
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

  const largeArticles = gridArticles.filter((a) => a.size === 'large')
  const mediumArticles = gridArticles.filter((a) => a.size === 'medium')
  const smallArticles = gridArticles.filter((a) => a.size === 'small')
  const restArticles = gridArticles.filter(
    (a) => !['large', 'medium', 'small'].includes(a.size),
  )

  const duoRow1 = largeArticles.length ? largeArticles : gridArticles.slice(0, 2)
  const duoRow2 =
    mediumArticles.length > 0
      ? mediumArticles
      : gridArticles.slice(duoRow1.length, duoRow1.length + 2)
  const trioRow1 = smallArticles.slice(0, 3)
  const trioRow2 = [...smallArticles.slice(3), ...restArticles].slice(0, 3)

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

          <section className="news-section" aria-labelledby="news-pora-heading">
            <h2 id="news-pora-heading" className="news-section__title">
              П
              <span className="news-section__title-sun" aria-hidden>
                ☀️
              </span>
              РА
              <span className="news-section__title-chevron" aria-hidden>
                ›
              </span>
            </h2>

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
