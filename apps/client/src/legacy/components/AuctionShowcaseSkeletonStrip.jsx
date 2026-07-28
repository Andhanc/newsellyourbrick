import './AuctionShowcaseSkeletonStrip.css'

/**
 * Только карточки-скелетоны — внутрь существующего .auction-showcase__scroller
 * (на класс скроллера вешается `auction-showcase-skeleton-root` для стилей).
 */
export function AuctionShowcaseSkeletonCards({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`auction-showcase-sk-${i}`}
          className="auction-showcase-card auction-showcase-card--skeleton"
          aria-hidden="true"
        >
          <div className="auction-showcase-card__link">
            <div className="auction-showcase-card__surface">
              <div className="auction-showcase-card__media">
                <div className="auction-showcase-skeleton__shimmer" />
                <span className="auction-showcase-skeleton__fav" />
              </div>
              <div className="auction-showcase-card__caption">
                <div className="auction-showcase-skeleton__timer-pill" />
                <div className="auction-showcase-skeleton__line auction-showcase-skeleton__line--title" />
                <div className="auction-showcase-skeleton__bid-row">
                  <div className="auction-showcase-skeleton__line auction-showcase-skeleton__line--label" />
                  <div className="auction-showcase-skeleton__line auction-showcase-skeleton__line--value" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

/**
 * Горизонтальная лента скелетонов в разметке карточек витрины аукциона (как .auction-showcase-card на главной).
 */
export function AuctionShowcaseSkeletonStrip({ count = 6 }) {
  return (
    <div className="auction-showcase-skeleton-root" aria-busy="true" aria-label="Загрузка объектов">
      <div className="auction-showcase__carousel">
        <div className="auction-showcase__scroller">
          <AuctionShowcaseSkeletonCards count={count} />
        </div>
      </div>
    </div>
  )
}
