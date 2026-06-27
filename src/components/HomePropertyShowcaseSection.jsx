import { Link } from 'react-router-dom'
import { FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import AuctionPropertyCard from './AuctionPropertyCard'
import DebtsPropertyCard, { DebtsPropertyCardSkeleton } from './DebtsPropertyCard'
import SharesPropertyCard, { SharesPropertyCardSkeleton } from './SharesPropertyCard'
import { mapShareFromApiResponse } from '../utils/shareCardDisplay'
import { formatPropertyPrice } from '../utils/currency'
import { buildPropertyDetailNavigation } from '../utils/propertyDetailUrl'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'

const SHARE_FALLBACK = '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

function AuctionCardSkeleton() {
  return (
    <div className="auction-card auction-card--skeleton" aria-hidden>
      <div className="auction-card__media auction-card-skeleton__media" />
      <div className="auction-card__body auction-card-skeleton__body">
        <div className="auction-card-skeleton__line auction-card-skeleton__line--short" />
        <div className="auction-card-skeleton__line auction-card-skeleton__line--title" />
        <div className="auction-card-skeleton__line auction-card-skeleton__line--specs" />
        <div className="auction-card-skeleton__price-panel" />
        <div className="auction-card-skeleton__btn" />
      </div>
    </div>
  )
}

function HomeShowcaseSlot({ children }) {
  return <div className="home-showcase__slot">{children}</div>
}

export default function HomePropertyShowcaseSection({
  sectionClassName,
  title,
  titleTo,
  subtitle,
  ctaLabel,
  onCtaClick,
  scrollerRef,
  onScroll,
  loading = false,
  items = [],
  variant,
  t,
  navigate,
  isFavorite,
  toggleFavorite,
  ensureCanOpenProperty,
  showPropertyAuthRequiredToast,
  containerClassName = 'apartments-section__container',
  hideWhenEmpty = false,
}) {
  if (hideWhenEmpty && items.length === 0 && !loading) {
    return null
  }

  const favoriteCategory = (property) =>
    hasDbBackedProperty(property) ? undefined : 'property'

  const isPropertyLiked = (property) => isFavorite(property, favoriteCategory(property))

  const handleFavoriteToggle = (property, e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    toggleFavorite(property, favoriteCategory(property))
  }

  const openListing = (property, { auctionTab } = {}) => {
    if (!ensureCanOpenProperty()) {
      showPropertyAuthRequiredToast()
      return
    }
    const { pathname, state } = buildPropertyDetailNavigation(property, {
      auctionTab: auctionTab || undefined,
    })
    navigate(pathname, { state })
  }

  const formatPrice = (price, currency = 'USD') =>
    formatPropertyPrice(price ?? 0, currency, { compact: true })

  const renderSkeletons = () => {
    const count = 4
    if (variant === 'debts') {
      return Array.from({ length: count }, (_, i) => (
        <HomeShowcaseSlot key={`sk-debts-${i}`}>
          <DebtsPropertyCardSkeleton />
        </HomeShowcaseSlot>
      ))
    }
    if (variant === 'shares') {
      return Array.from({ length: count }, (_, i) => (
        <HomeShowcaseSlot key={`sk-shares-${i}`}>
          <SharesPropertyCardSkeleton />
        </HomeShowcaseSlot>
      ))
    }
    return Array.from({ length: count }, (_, i) => (
      <HomeShowcaseSlot key={`sk-auction-${i}`}>
        <AuctionCardSkeleton />
      </HomeShowcaseSlot>
    ))
  }

  const renderCards = () => {
    if (variant === 'debts') {
      return items.map((property) => (
        <HomeShowcaseSlot key={property.id}>
          <DebtsPropertyCard
            property={property}
            isFavorite={isPropertyLiked(property)}
            onFavoriteToggle={handleFavoriteToggle}
            onOpen={openListing}
          />
        </HomeShowcaseSlot>
      ))
    }

    if (variant === 'shares') {
      return items.map((property) => {
        const share = mapShareFromApiResponse(property, SHARE_FALLBACK)
        if (!share) return null
        return (
          <HomeShowcaseSlot key={share.shareId || property.id}>
            <SharesPropertyCard
              share={share}
              isFavorite={isPropertyLiked(property)}
              onFavoriteToggle={handleFavoriteToggle}
              onInvest={(obj) => {
                if (!ensureCanOpenProperty()) {
                  showPropertyAuthRequiredToast()
                  return
                }
                const routeId =
                  obj.shareId || obj.routeId || `${obj.property_type || 'apartment'}-${obj.id}`
                navigate(`/shares/${routeId}`, { state: { shareObject: obj } })
              }}
              imageFallback={SHARE_FALLBACK}
            />
          </HomeShowcaseSlot>
        )
      })
    }

    return items.map((property) => (
      <HomeShowcaseSlot key={property.id}>
        <AuctionPropertyCard
          property={property}
          isFavorite={isPropertyLiked(property)}
          onFavoriteToggle={handleFavoriteToggle}
          onOpen={openListing}
          formatPrice={formatPrice}
        />
      </HomeShowcaseSlot>
    ))
  }

  return (
    <section className={sectionClassName}>
      <div className={containerClassName}>
        <header className="auction-showcase__header">
          <div className="auction-showcase__intro">
            <div className="auction-showcase__title-row">
              <h2 className="auction-showcase__title">
                <Link to={titleTo} className="auction-showcase__title-link">
                  {title}
                </Link>
              </h2>
              <button type="button" className="auction-showcase__cta" onClick={onCtaClick}>
                <span className="auction-showcase__cta-text">{ctaLabel}</span>
                <span className="auction-showcase__cta-icon" aria-hidden>
                  <FiArrowRight size={18} strokeWidth={2.25} />
                </span>
              </button>
            </div>
            <p className="auction-showcase__subtitle">{subtitle}</p>
          </div>
        </header>

        <div className="auction-showcase__carousel">
          <div
            ref={scrollerRef}
            className="auction-showcase__scroller home-showcase__scroller"
            aria-busy={loading}
          >
            {loading ? renderSkeletons() : renderCards()}
          </div>
          <div className="auction-showcase__nav" role="group" aria-label={t('showcaseCarouselNav')}>
            <button
              type="button"
              className="auction-showcase__nav-btn auction-showcase__nav-btn--prev"
              aria-label={t('showcaseCarouselPrev')}
              onClick={() => onScroll(-1)}
              disabled={loading}
            >
              <FiChevronLeft size={22} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              className="auction-showcase__nav-btn auction-showcase__nav-btn--next"
              aria-label={t('showcaseCarouselNext')}
              onClick={() => onScroll(1)}
              disabled={loading}
            >
              <FiChevronRight size={22} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
