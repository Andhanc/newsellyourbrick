import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi'
import { fetchPublishedArticles } from '@/services/newsApi'
import { scrollMainTo } from '@/utils/mainScroll'

const NEWS_CARD_COUNT = 4

const STATIC_NEWS_KEYS = [
  {
    id: 'syb-static-news-1',
    featured: true,
    image: '/images/external/photo-1600585154340-be6161a56a0c-08c1b1d59d.jpg',
    titleKey: 'sybLandingNews1Title',
    excerptKey: 'sybLandingNews1Excerpt',
    tagKeys: ['sybLandingNews1Tag1', 'sybLandingNews1Tag2'],
  },
  {
    id: 'syb-static-news-2',
    image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
    titleKey: 'sybLandingNews2Title',
    excerptKey: 'sybLandingNews2Excerpt',
  },
  {
    id: 'syb-static-news-3',
    image: '/images/external/photo-1507525428034-b723cf961d3e-ae413f8ef9.jpg',
    titleKey: 'sybLandingNews3Title',
    excerptKey: 'sybLandingNews3Excerpt',
  },
  {
    id: 'syb-static-news-4',
    image: '/images/external/photo-1560518883-ce09059eeffa-95dd949987.jpg',
    titleKey: 'sybLandingNews4Title',
    excerptKey: 'sybLandingNews4Excerpt',
  },
]

function mapPublishedArticle(article, index) {
  const tags = []
  if (article.badge) tags.push(article.badge)
  if (article.category && article.category !== article.badge) tags.push(article.category)

  return {
    id: article.id,
    slug: article.slug,
    featured: index === 0,
    image: article.image,
    title: article.title,
    excerpt: article.excerpt,
    tags: tags.slice(0, 2),
  }
}

function SybNewsCard({ item, ctaLabel, onOpen }) {
  const isFeatured = Boolean(item.featured)

  return (
    <article className={`syb-news-card${isFeatured ? ' syb-news-card--featured' : ''}`}>
      <div className="syb-news-card__media">
        <img src={item.image} alt="" loading="lazy" decoding="async" />
        <div className="syb-news-card__shade" aria-hidden />
      </div>

      {isFeatured && item.tags?.length > 0 ? (
        <div className="syb-news-card__tags" aria-hidden>
          {item.tags.map((tag) => (
            <span key={tag} className="syb-news-card__tag">
              <span className="syb-news-card__tag-dot" />
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className={`syb-news-card__icon-btn${isFeatured ? ' syb-news-card__icon-btn--featured' : ''}`}
        onClick={() => onOpen(item)}
        aria-label={item.title}
      >
        {isFeatured ? <FiArrowRight size={18} aria-hidden /> : <FiArrowUpRight size={17} aria-hidden />}
      </button>

      <div className="syb-news-card__body">
        <h3 className="syb-news-card__title">{item.title}</h3>
        <p className="syb-news-card__excerpt">{item.excerpt}</p>
        <button type="button" className="syb-news-card__cta" onClick={() => onOpen(item)}>
          <span>{ctaLabel}</span>
          <FiArrowRight size={16} aria-hidden />
        </button>
      </div>
    </article>
  )
}

export default function SybLandingNewsShowcase() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [published, setPublished] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchPublishedArticles()
      .then((articles) => {
        if (!cancelled) setPublished(Array.isArray(articles) ? articles : [])
      })
      .catch(() => {
        if (!cancelled) setPublished([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const articles = useMemo(() => {
    if (published.length > 0) {
      const seen = new Set()
      const unique = published.filter((article) => {
        const key = article.id ?? article.slug
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      return unique.slice(0, NEWS_CARD_COUNT).map(mapPublishedArticle)
    }

    return STATIC_NEWS_KEYS.map((item) => ({
      id: item.id,
      slug: null,
      featured: item.featured,
      image: item.image,
      title: t(item.titleKey),
      excerpt: t(item.excerptKey),
      tags: (item.tagKeys || []).map((key) => t(key)),
    }))
  }, [published, t])

  const handleOpen = useCallback(
    (item) => {
      if (item.slug) {
        navigate(`/news/${item.slug}`)
        return
      }
      navigate('/news')
    },
    [navigate],
  )

  return (
    <section className="syb-news" aria-labelledby="syb-news-title">
      <div className="syb-news__head">
        <div className="syb-news__intro">
          <h2 id="syb-news-title" className="syb-news__title">
            {t('sybLandingNewsTitle')}
          </h2>
          <p className="syb-news__subtitle">{t('sybLandingNewsSubtitle')}</p>
        </div>
        <Link
          to="/news"
          className="syb-news__all"
          onClick={() => scrollMainTo(0, 0, 'instant')}
        >
          {t('sybLandingNewsViewAll')}
          <FiArrowRight size={16} aria-hidden />
        </Link>
      </div>

      <div className="syb-news__grid">
        {articles.map((item) => (
          <SybNewsCard
            key={item.id}
            item={item}
            ctaLabel={t('sybLandingNewsCta')}
            onOpen={handleOpen}
          />
        ))}
      </div>
    </section>
  )
}
