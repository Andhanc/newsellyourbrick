import { useTranslation } from 'react-i18next'
import { FiArrowUpRight } from 'react-icons/fi'
import NewsArticleMeta from './NewsArticleMeta'

export default function NewsArticleCard({ article, onOpen }) {
  const { t } = useTranslation()
  const sizeClass =
    article.size === 'large'
      ? 'news-card--large'
      : article.size === 'small'
        ? 'news-card--small'
        : 'news-card--medium'

  const handleOpen = () => {
    if (onOpen) onOpen(article)
  }

  return (
    <article className={`news-card ${sizeClass}`}>
      <button
        type="button"
        className="news-card__hit"
        onClick={handleOpen}
        disabled={!article.slug}
      >
        <div className="news-card__media">
          <img src={article.image} alt="" loading="lazy" decoding="async" />
          {article.badge ? <span className="news-card__badge">{article.badge}</span> : null}
          <span className="news-card__index" aria-hidden>SYB</span>
        </div>
        <div className="news-card__body">
          <NewsArticleMeta date={article.date} views={article.views} />
          <h3 className="news-card__title">{article.title}</h3>
          <p className="news-card__excerpt">{article.excerpt}</p>
          {article.slug ? (
            <span className="news-card__read">
              {t('newsPage_cardRead')} <FiArrowUpRight size={17} aria-hidden />
            </span>
          ) : null}
        </div>
      </button>
    </article>
  )
}
