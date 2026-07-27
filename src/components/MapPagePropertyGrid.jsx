import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import AuctionPropertyCard from './AuctionPropertyCard'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getPropertyDetailPath, auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import './AuctionPropertyCard.css'
import './ui/AuctionMobileLayout.css'

function MapPagePropertyGridSkeleton() {
  return (
    <div className="auction-card auction-card--map auction-card--skeleton" aria-hidden="true">
      <div className="auction-card__media auction-card-skeleton__media" />
      <div className="listing-card-auction-timer listing-card-auction-timer--placeholder" aria-hidden="true" />
      <div className="auction-card__body auction-card-skeleton__body">
        <div className="auction-card-skeleton__line auction-card-skeleton__line--short" />
        <div className="auction-card-skeleton__line auction-card-skeleton__line--title" />
        <div className="auction-card-skeleton__line auction-card-skeleton__line--specs" />
        <div className="auction-card-skeleton__btn" />
      </div>
    </div>
  )
}

export function MapPagePropertyGridSkeletons({ count = 6 }) {
  return (
    <div className="map-page-property-grid">
      <div className="auction-mobile-stack auction-mobile-stack--desktop-cards properties-grid properties-grid--auction-cards">
        {Array.from({ length: count }, (_, i) => (
          <MapPagePropertyGridSkeleton key={`map-grid-skel-${i}`} />
        ))}
      </div>
    </div>
  )
}

export default function MapPagePropertyGrid({
  properties,
  formatPrice,
  isFavorite,
  onFavoriteToggle,
  selectedProperty = null,
  user,
  userLoaded,
}) {
  const navigate = useNavigate()

  const openProperty = (property, options) => {
    if (!ensureCanOpenProperty(user && userLoaded)) return
    navigate(getPropertyDetailPath(property.id, { property }), {
      state: { property, ...options },
    })
  }

  return (
    <div className="map-page-property-grid">
      <div className="auction-mobile-stack auction-mobile-stack--desktop-cards properties-grid properties-grid--auction-cards">
        {properties.map((property) => {
          const isSelected =
            selectedProperty != null &&
            auctionListingDedupeKey(selectedProperty) === auctionListingDedupeKey(property)

          return (
            <AuctionPropertyCard
              key={auctionListingDedupeKey(property)}
              property={property}
              isFavorite={typeof isFavorite === 'function' ? isFavorite(property) : false}
              onFavoriteToggle={(prop, e) => onFavoriteToggle(e, prop)}
              onOpen={openProperty}
              formatPrice={formatPrice}
              mapNavigateCta
              className={cn(isSelected && 'map-page-grid-card--selected')}
            />
          )
        })}
      </div>
    </div>
  )
}
