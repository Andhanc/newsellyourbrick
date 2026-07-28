import { useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi'
import { scrollMainTo } from '@/utils/mainScroll'

const MOSAIC_IMAGE_FALLBACK = '/images/external/photo-1600585154340-be6161a56a0c-753fb8cc27.jpg'

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

function SybMosaicFeaturedCell({ item, onOpen }) {
  return (
    <article className="syb-news-mosaic__cell syb-news-mosaic__cell--split syb-news-mosaic__cell--featured">
      <button
        type="button"
        className="syb-news-mosaic__split-hit syb-news-mosaic__split-hit--featured"
        onClick={() => onOpen(item)}
      >
        <div className="syb-news-mosaic__media">
          <img
            src={item.image}
            alt=""
            loading="eager"
            decoding="async"
            aria-hidden
            onError={(event) => {
              event.currentTarget.src = MOSAIC_IMAGE_FALLBACK
            }}
          />
        </div>
        <div className="syb-news-mosaic__copy">
          <h3 className="syb-news-mosaic__title">{item.title}</h3>
          <p className="syb-news-mosaic__excerpt">{item.excerpt}</p>
          <span className="syb-news-mosaic__read" aria-hidden>
            <FiArrowRight size={18} />
          </span>
        </div>
      </button>
    </article>
  )
}

function SybMosaicCardCell({ item, onOpen }) {
  return (
    <article className="syb-news-mosaic__cell syb-news-mosaic__cell--split syb-news-mosaic__cell--card">
      <button type="button" className="syb-news-mosaic__split-hit" onClick={() => onOpen(item)}>
        <div className="syb-news-mosaic__media">
          <img
            src={item.image}
            alt=""
            loading="lazy"
            decoding="async"
            aria-hidden
            onError={(event) => {
              event.currentTarget.src = MOSAIC_IMAGE_FALLBACK
            }}
          />
        </div>
        <div className="syb-news-mosaic__copy">
          <h3 className="syb-news-mosaic__title">{item.title}</h3>
          <p className="syb-news-mosaic__excerpt">{item.excerpt}</p>
        </div>
      </button>
    </article>
  )
}

function SybFeatureCard({ item, ctaLabel, onOpen }) {
  return (
    <article className="syb-news-card syb-news-card--feature">
      <div className="syb-news-card__copy">
        {item.tags?.length > 0 ? (
          <div className="syb-news-card__tag-row" aria-hidden>
            {item.tags.map((tag) => (
              <span key={tag} className="syb-news-card__tag">
                <span className="syb-news-card__tag-dot" />
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <h3 className="syb-news-card__title">{item.title}</h3>
        <p className="syb-news-card__excerpt">{item.excerpt}</p>
        <button type="button" className="syb-news-card__cta" onClick={() => onOpen(item)}>
          <span>{ctaLabel}</span>
          <FiArrowRight size={14} aria-hidden />
        </button>
      </div>
      <div className="syb-news-card__stage" aria-hidden>
        <div className="syb-news-card__visual">
          <img src={item.image} alt="" loading="lazy" decoding="async" />
        </div>
      </div>
    </article>
  )
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

export default function SybLandingNewsShowcase({ maxItems, layout = 'default' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isMosaic = layout === 'mosaic'
  const isFeatures = layout === 'features' || layout === 'bento'

  const articles = useMemo(() => {
    const items = STATIC_NEWS_KEYS.map((item) => ({
      id: item.id,
      slug: null,
      featured: item.featured,
      image: item.image,
      title: t(item.titleKey),
      excerpt: t(item.excerptKey),
      tags: (item.tagKeys || []).map((key) => t(key)),
    }))

    if (typeof maxItems === 'number' && maxItems > 0) {
      return items.slice(0, maxItems)
    }

    return items
  }, [maxItems, t])


  const mosaicArticles = useMemo(() => {
    if (articles.length < 4) return null
    return {
      featured: articles[0],
      cards: articles.slice(1, 4),
    }
  }, [articles])

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
    <section
      className={`syb-news${isMosaic ? ' syb-news--mosaic' : ''}${isFeatures ? ' syb-news--features' : ''}`}
      aria-labelledby="syb-news-title"
    >
      <div className={`syb-news__head${isMosaic ? ' syb-news__head--mosaic' : ''}`}>
        {isMosaic ? (
          <h2 id="syb-news-title" className="syb-news__title">
            {t('sybLandingNewsTitle')}
          </h2>
        ) : (
          <>
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
          </>
        )}
      </div>

      {isMosaic && mosaicArticles ? (
        <>
          <div className="syb-news__mosaic syb-news__mosaic--editorial">
            <SybMosaicFeaturedCell item={mosaicArticles.featured} onOpen={handleOpen} />
            {mosaicArticles.cards.map((item) => (
              <SybMosaicCardCell key={item.id} item={item} onOpen={handleOpen} />
            ))}
          </div>
          <div className="syb-news__mosaic-foot">
            <Link
              to="/news"
              className="syb-news__mosaic-more"
              onClick={() => scrollMainTo(0, 0, 'instant')}
            >
              {t('sybLandingNewsViewAll')}
            </Link>
          </div>
        </>
      ) : (
        <div className="syb-news__grid">
          {isFeatures
            ? articles.map((item) => (
                <SybFeatureCard
                  key={item.id}
                  item={item}
                  ctaLabel={t('sybLandingNewsCta')}
                  onOpen={handleOpen}
                />
              ))
            : articles.map((item) => (
                <SybNewsCard
                  key={item.id}
                  item={item}
                  ctaLabel={t('sybLandingNewsCta')}
                  onOpen={handleOpen}
                />
              ))}
        </div>
      )}
    </section>
  )
}
