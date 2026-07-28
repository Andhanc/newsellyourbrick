/**
 * Скелетон карточек листинга — повторяет разметку и пропорции .property-card на главной.
 */
export function PropertyListingSkeletonGrid({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={`property-skeleton-${i}`}
          className="property-card property-card--skeleton"
          aria-hidden="true"
        >
          <div className="property-link property-link--skeleton">
            <div className="property-image-container">
              <div className="property-card-skeleton__shimmer property-card-skeleton__media" />
              <span className="property-card-skeleton__fav-ring" />
            </div>
            <div className="property-content">
              <div className="property-card-skeleton__line property-card-skeleton__line--title" />
              <div className="property-card-skeleton__line property-card-skeleton__line--title-narrow" />
              <div className="property-card-skeleton__line property-card-skeleton__line--loc" />
              <div className="property-card-skeleton__line property-card-skeleton__line--price" />
              <div className="property-card-skeleton__specs">
                <span className="property-card-skeleton__pill" />
                <span className="property-card-skeleton__pill" />
                <span className="property-card-skeleton__pill property-card-skeleton__pill--grow" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
