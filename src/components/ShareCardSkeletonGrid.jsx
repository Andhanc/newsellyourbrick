/**
 * Скелетон карточек долей — повторяет структуру .share-card (Shares.css).
 */
export function ShareCardSkeletonGrid({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <article
          key={`share-skeleton-${i}`}
          className="share-card share-card--skeleton"
          aria-hidden="true"
        >
          <div className="share-card-skeleton__badge" />
          <div className="share-card__image-wrap">
            <div className="share-card-skeleton__scale" aria-hidden>
              <div className="share-card-skeleton__scale-track" />
            </div>
            <div className="share-card-skeleton__shimmer share-card-skeleton__media" />
          </div>
          <div className="share-card__content">
            <div className="share-card-skeleton__line share-card-skeleton__line--title" />
            <div className="share-card-skeleton__line share-card-skeleton__line--title-short" />
            <div className="share-card-skeleton__line share-card-skeleton__line--loc" />
            <div className="share-card-skeleton__prices">
              <div className="share-card-skeleton__line share-card-skeleton__line--price-row" />
              <div className="share-card-skeleton__line share-card-skeleton__line--price-row share-card-skeleton__line--narrow" />
            </div>
            <div className="share-card-skeleton__footer" />
          </div>
        </article>
      ))}
    </>
  )
}
