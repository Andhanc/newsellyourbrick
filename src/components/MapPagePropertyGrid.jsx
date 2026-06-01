import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { cn } from '@/lib/utils'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { getPropertyCardImage } from '../utils/propertyImage'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import { getPropertyDetailPath, auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import PropertyShareButton from './PropertyShareButton'
import ImageWithSkeleton from './ImageWithSkeleton'
import './ui/AuctionMobileLayout.css'

function MapPagePropertyGridSkeleton() {
  return (
    <div className="auction-mobile-item-wrap">
      <article className="auction-mobile-item auction-mobile-item--card auction-mobile--card map-page-grid-card map-page-grid-card--skeleton" aria-hidden="true">
        <div className="auction-mobile-item__media map-page-grid-card__media-skel" />
        <div className="auction-mobile-item__body">
          <div className="map-page-grid-card__line map-page-grid-card__line--title" />
          <div className="map-page-grid-card__line map-page-grid-card__line--loc" />
          <div className="map-page-grid-card__line map-page-grid-card__line--price" />
        </div>
      </article>
    </div>
  )
}

export function MapPagePropertyGridSkeletons({ count = 6 }) {
  return (
    <div className="map-page-property-grid auction-mobile-layout">
      <div className="auction-mobile-stack auction-mobile-stack--grid">
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
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="map-page-property-grid auction-mobile-layout">
      <div className="auction-mobile-stack auction-mobile-stack--grid">
        {properties.map((property) => (
          <MapPagePropertyGridCard
            key={auctionListingDedupeKey(property)}
            property={property}
            formatPrice={formatPrice}
            isFavorite={isFavorite}
            onFavoriteToggle={onFavoriteToggle}
            isSelected={
              selectedProperty != null &&
              auctionListingDedupeKey(selectedProperty) === auctionListingDedupeKey(property)
            }
            user={user}
            userLoaded={userLoaded}
            t={t}
            navigate={navigate}
          />
        ))}
      </div>
    </div>
  )
}

function MapPagePropertyGridCard({
  property,
  formatPrice,
  isFavorite,
  onFavoriteToggle,
  isSelected,
  user,
  userLoaded,
  t,
  navigate,
}) {
  const favoriteBtnRef = useRef(null)
  const [favPulse, setFavPulse] = useState(false)
  const propertyTitle = property.title || property.name || ''
  const propertyImage = getPropertyCardImage(
    property,
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  )
  const propertyImageProps = buildResponsiveImageProps(propertyImage, {
    widths: [240, 320, 480, 640],
    sizes: '50vw',
    quality: 72,
    fit: 'crop',
  })
  const priceDisplay = property.price ?? property.currentBid ?? 0
  const isFav = typeof isFavorite === 'function' ? isFavorite(property) : false

  const openProperty = () => {
    if (!ensureCanOpenProperty(user && userLoaded)) return
    navigate(getPropertyDetailPath(property.id, { property }), { state: { property } })
  }

  const handleFavoriteClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    await onFavoriteToggle(e, property)
    setFavPulse(true)
    window.setTimeout(() => setFavPulse(false), 420)
  }

  const metaRow =
    property.area || property.sqft || property.rooms || property.beds || property.bedrooms || property.bathrooms ? (
      <div className="auction-mobile-meta">
        {(property.area || property.sqft) && (
          <span>
            <BiArea size={15} />
            {property.area || property.sqft} {t('squareMeters')}
          </span>
        )}
        {(property.rooms || property.beds || property.bedrooms) && (
          <span>
            <MdBed size={15} />
            {property.rooms || property.beds || property.bedrooms}
          </span>
        )}
        {property.bathrooms ? (
          <span>
            <MdOutlineBathtub size={15} />
            {property.bathrooms}
          </span>
        ) : null}
      </div>
    ) : null

  return (
    <div className="auction-mobile-item-wrap">
      <article
        className={cn(
          'auction-mobile-item auction-mobile-item--card auction-mobile--card map-page-grid-card',
          isSelected && 'map-page-grid-card--selected',
          favPulse && 'map-page-grid-card--fav-pulse',
        )}
        onClick={openProperty}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openProperty()
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="auction-mobile-item__media">
          <div className="auction-mobile-image-wrap">
            <ImageWithSkeleton
              imgProps={propertyImageProps}
              alt={propertyTitle}
              className="rounded-[inherit]"
              containerClassName="rounded-[inherit]"
            />
            <div className="property-media-actions property-media-actions--compact property-media-actions--reverse">
              <PropertyShareButton property={property} variant="compact" iconSize={16} />
              <button
                ref={favoriteBtnRef}
                type="button"
                className={cn(
                  'auction-mobile-favorite-btn auction-mobile-favorite-btn--media',
                  isFav && 'auction-mobile-favorite-btn--active',
                )}
                onClick={handleFavoriteClick}
                aria-label={t('addToFavorites')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill={isFav ? 'currentColor' : 'none'}
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="auction-mobile-item__body">
          <div className="auction-mobile-head">
            <h3 className="auction-mobile-card-title">{propertyTitle}</h3>
          </div>

          {property.location ? (
            <p className="auction-mobile-loc">
              <span>{property.location}</span>
            </p>
          ) : null}

          {metaRow}

          <p className="map-page-grid-card__price">{formatPrice(priceDisplay, property.currency)}</p>
        </div>
      </article>
    </div>
  )
}
