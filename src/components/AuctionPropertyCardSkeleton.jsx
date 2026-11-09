import './AuctionPropertyCard.css'
import './AuctionPropertyCardSkeleton.css'

/** Uses the auction card's media, metadata, pricing and action layout. */
export default function AuctionPropertyCardSkeleton({ actions = 2 }) {
  return (
    <article className={`auction-card auction-card--skeleton auction-card--actions-${actions}`} aria-hidden="true">
      <div className="auction-card__media auction-card-skeleton__media">
        <span className="auction-card-skeleton__favorite" />
      </div>
      <div className="auction-card__body">
        <div className="auction-card__meta">
          <div className="auction-card-skeleton__line auction-card-skeleton__line--title" />
          <div className="auction-card-skeleton__line auction-card-skeleton__line--short" />
          <div className="auction-card__specs auction-card__specs--3">
            {[0, 1, 2].map(index => (
              <div className="auction-card__spec" key={index}>
                <span className="auction-card-skeleton__spec-icon" />
                <span className="auction-card-skeleton__line auction-card-skeleton__line--spec" />
                <span className="auction-card-skeleton__line auction-card-skeleton__line--label" />
              </div>
            ))}
          </div>
        </div>
        <div className="auction-card__footer">
          <div className="auction-card__pricing">
            <div className="auction-card-skeleton__line auction-card-skeleton__line--label" />
            <div className="auction-card-skeleton__line auction-card-skeleton__line--price" />
          </div>
          <div className={`auction-card__actions${actions === 1 ? ' auction-card__actions--single' : ''}`}>
            {Array.from({ length: actions }, (_, index) => <span key={index} className="auction-card__btn auction-card-skeleton__btn" />)}
          </div>
        </div>
      </div>
    </article>
  )
}
