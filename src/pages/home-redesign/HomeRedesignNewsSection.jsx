import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiArrowUpRight } from 'react-icons/fi'
import { scrollMainTo } from '../../utils/mainScroll'
import './HomeRedesignNewsSection.css'

const NEWS_ITEMS = [
  {
    image: '/images/external/photo-1600585154340-be6161a56a0c-08c1b1d59d.jpg',
    titleKey: 'sybLandingNews1Title',
    excerptKey: 'sybLandingNews1Excerpt',
  },
  {
    image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
    titleKey: 'sybLandingNews2Title',
    excerptKey: 'sybLandingNews2Excerpt',
  },
  {
    image: '/images/external/photo-1507525428034-b723cf961d3e-ae413f8ef9.jpg',
    titleKey: 'sybLandingNews3Title',
    excerptKey: 'sybLandingNews3Excerpt',
  },
  {
    image: '/images/external/photo-1560518883-ce09059eeffa-95dd949987.jpg',
    titleKey: 'sybLandingNews4Title',
    excerptKey: 'sybLandingNews4Excerpt',
  },
]

function splitTitleAccent(title, accentLabel) {
  const value = String(title || '')
  const candidates = [accentLabel, 'News'].filter(Boolean)

  for (const candidate of candidates) {
    const index = value.toLocaleLowerCase().indexOf(String(candidate).toLocaleLowerCase())
    if (index >= 0) {
      return {
        before: value.slice(0, index),
        accent: value.slice(index, index + String(candidate).length),
        after: value.slice(index + String(candidate).length),
      }
    }
  }

  const firstWord = value.match(/\S+/)?.[0] || value
  return {
    before: '',
    accent: firstWord,
    after: value.slice(firstWord.length),
  }
}

export default function HomeRedesignNewsSection() {
  const { t } = useTranslation()
  const newsHeading = splitTitleAccent(t('sybLandingNewsTitle'), t('news'))
  const articles = useMemo(
    () =>
      NEWS_ITEMS.map((item, index) => ({
        ...item,
        number: String(index + 1).padStart(2, '0'),
        title: t(item.titleKey),
        excerpt: t(item.excerptKey),
      })),
    [t],
  )

  const resetNewsScroll = () => scrollMainTo(0, 0, 'instant')

  return (
    <section className="hr-news hr-editorial-news" aria-labelledby="hr-editorial-news-title">
      <div className="hr-container hr-news__inner hr-editorial-news__inner">
        <header className="hr-editorial-news__header">
          <div className="hr-editorial-news__intro">
            <h2 id="hr-editorial-news-title" className="hr-editorial-news__title">
              {newsHeading.before}
              <span className="hr-editorial-news__title-accent">{newsHeading.accent}</span>
              {newsHeading.after}
            </h2>
            <p className="hr-editorial-news__subtitle">{t('sybLandingNewsSubtitle')}</p>
          </div>

          <Link
            to="/news"
            className="hr-editorial-news__all hr-editorial-news__all--desktop"
            onClick={resetNewsScroll}
          >
            <span>{t('sybLandingNewsViewAll')}</span>
            <FiArrowRight aria-hidden="true" />
          </Link>
        </header>

        <div className="hr-editorial-news__rail" role="list" aria-label={t('sybLandingNewsTitle')}>
          {articles.map((item) => (
            <article className="hr-editorial-news__card" role="listitem" key={item.titleKey}>
              <Link
                to="/news"
                className="hr-editorial-news__card-link"
                aria-label={item.title}
                onClick={resetNewsScroll}
              >
                <div className="hr-editorial-news__media">
                  <img src={item.image} alt="" loading="lazy" decoding="async" />
                  <div className="hr-editorial-news__media-shade" aria-hidden="true" />
                  <span className="hr-editorial-news__number" aria-hidden="true">
                    {item.number}
                  </span>
                  <span className="hr-editorial-news__arrow" aria-hidden="true">
                    <FiArrowUpRight />
                  </span>
                </div>

                <div className="hr-editorial-news__body">
                  <h3 className="hr-editorial-news__card-title">{item.title}</h3>
                  <p className="hr-editorial-news__excerpt">{item.excerpt}</p>
                  <span className="hr-editorial-news__read" aria-hidden="true">
                    {t('sybLandingNewsCta')}
                    <FiArrowRight />
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <Link
          to="/news"
          className="hr-editorial-news__all hr-editorial-news__all--mobile"
          onClick={resetNewsScroll}
        >
          <span>{t('sybLandingNewsViewAll')}</span>
          <FiArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
