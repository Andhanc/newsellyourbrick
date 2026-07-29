import NewsArticleMeta from './NewsArticleMeta'

export default function NewsArticleCard({ article, onOpen }) {
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
      <button type="button" className="news-card__hit" onClick={handleOpen}>
        <div className="news-card__media">
          <img src={article.image} alt="" loading="lazy" decoding="async" />
        </div>
        <div className="news-card__body">
          <NewsArticleMeta date={article.date} views={article.views} />
          <h3 className="news-card__title">{article.title}</h3>
          <p className="news-card__excerpt">{article.excerpt}</p>
        </div>
      </button>
    </article>
  )
}
