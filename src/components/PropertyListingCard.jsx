import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { hasBuyNowOption, hasAuctionBuyNowListingForm } from '../utils/hasBuyNowOption'
import PropertyTimer from './PropertyTimer'
import PropertyShareButton from './PropertyShareButton'
import CircularTimer from './CircularTimer'
import ImageWithSkeleton from './ImageWithSkeleton'
import { formatPropertyPrice } from '../utils/currency'
import {
  getEffectiveAuctionEndTime,
  hasPropertyListingTimer,
  isBuyNowPurchaseCompleted,
  isAuctionListingEnded,
  isPropertyListingSoldOut,
  shouldShowCircularAuctionTimer,
} from '../utils/auctionReminderBounds'
import { getPropertyCardImage } from '../utils/propertyImage'
import { resolveAuctionCurrentBidValue } from '../services/auctionListCache'
import { auctionListingDedupeKey, PROPERTY_DETAIL_AUCTION_TAB_BIDS } from '../utils/propertyDetailUrl'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import './PropertyList.css'

const MOBILE_BREAKPOINT = 768

const PropertyListingCard = ({
  property,
  onOpen,
  showActions = false,
  showFavorite = true,
  showDescription = true,
  showTimer = true,
  pinFooter = false,
  className = '',
  /** Подпись в полоске ставки вместо «Текущая ставка» */
  bidInfoLabel = null,
  /** Сумма в полоске ставки (если не задана — из полей аукциона объекта) */
  bidInfoAmount = null,
  /** Категория мок-объекта для избранного (страница «Понравилось» и т.п.) */
  favoriteMockCategory,
  /** Кнопка/иконка в правом верхнем углу фото (например, история ставок на депозите) */
  imageTopRightAction = null,
  /** Действие в подвале рядом с полоской ставки (кнопка «К объекту» на депозите) */
  footerAction = null,
}) => {
  const { t } = useTranslation()
  const { isFavorite, toggleFavorite } = usePropertyFavorites()
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const formatPrice = (price, currency = 'USD') =>
    formatPropertyPrice(price, currency, { compact: true })

  const resolveFavoriteMockCategory = (p) => {
    if (hasDbBackedProperty(p)) return undefined
    return favoriteMockCategory ?? 'property'
  }

  const isPropertyLiked = (p) => isFavorite(p, resolveFavoriteMockCategory(p))

  const handleFavoriteToggle = (p, e) => {
    e.preventDefault()
    e.stopPropagation()
    const mockCat = resolveFavoriteMockCategory(p)
    return toggleFavorite(p, mockCat ?? 'property')
  }

  const propertyTitle = property.title || property.name || ''
  const propertyImage = getPropertyCardImage(
    property,
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
  )
  const propertyImageProps = buildResponsiveImageProps(propertyImage, {
    widths: [320, 480, 640, 800],
    sizes: '(max-width: 500px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw',
    quality: 72,
    fit: 'crop',
  })

  const buyNowPurchaseCompleted = isBuyNowPurchaseCompleted(property)
  const effectiveAuctionEnd = getEffectiveAuctionEndTime(property)
  const showCircularOnCard = shouldShowCircularAuctionTimer(property)
  const hasTimer = hasPropertyListingTimer(property)

  const isDebtProperty =
    property.sale_type === 'debt' ||
    property.is_debt === 1 ||
    property.is_debt === true ||
    property.has_debt === 1 ||
    property.has_debt === true

  const hasTestDrive =
    !isDebtProperty &&
    hasAuctionBuyNowListingForm(property) &&
    (property.test_drive === 1 || property.testDrive === true || property.test_drive === true)

  const reservedUntilDate = property.reserved_until ? new Date(property.reserved_until) : null
  const isReserved =
    (property.is_reserved === true || property.is_reserved === 1) &&
    (!reservedUntilDate || reservedUntilDate > new Date())

  const hasBuyNowPrice = hasBuyNowOption(property)
  const testTimerDurationMs =
    property.test_timer_duration != null && property.test_timer_duration !== ''
      ? Number(property.test_timer_duration)
      : null
  const normalizedTestTimerDuration =
    testTimerDurationMs != null && Number.isFinite(testTimerDurationMs) && testTimerDurationMs > 0
      ? testTimerDurationMs
      : null

  const isAuctionEndedCard = isPropertyListingSoldOut(property)
  const buyNowWinnerId = property.buy_now_winner_user_id
  const circularSize = isMobile ? 56 : 120

  const showAuctionBidFooter = hasTimer || bidInfoLabel != null
  const hasListingSpecs =
    property.area != null ||
    property.sqft != null ||
    property.living_area != null ||
    property.rooms != null ||
    property.beds != null ||
    property.bedrooms != null ||
    property.bathrooms != null ||
    property.baths != null
  const showSpecsInMeta = pinFooter && !showDescription && hasListingSpecs

  const listingSpecsRow = (iconSize = 16) => (
    <div className="property-specs property-specs--meta">
      {(property.area != null || property.sqft != null || property.living_area != null) && (
        <div className="spec-item">
          <BiArea size={iconSize} aria-hidden />
          <span>
            {property.area ?? property.sqft ?? property.living_area} {t('squareMeters')}
          </span>
        </div>
      )}
      {(property.rooms != null || property.beds != null || property.bedrooms != null) && (
        <div className="spec-item">
          <MdBed size={iconSize} aria-hidden />
          <span>{property.rooms ?? property.beds ?? property.bedrooms}</span>
        </div>
      )}
      {(property.bathrooms != null || property.baths != null) ? (
        <div className="spec-item">
          <MdOutlineBathtub size={iconSize} aria-hidden />
          <span>{property.bathrooms ?? property.baths}</span>
        </div>
      ) : null}
    </div>
  )

  const greenTimerBlock =
    showTimer && hasTimer && !isReserved && !showCircularOnCard && effectiveAuctionEnd ? (
      <div className="property-timer-wrapper">
        <PropertyTimer
          endTime={effectiveAuctionEnd}
          compact={true}
          auctionEndedLabel={t('propertyDetailAuctionCompleted')}
        />
      </div>
    ) : null

  const redTimerBlock =
    showTimer && hasTimer && !isReserved && showCircularOnCard ? (
      <div className="property-timer-wrapper">
        <CircularTimer
          endTime={property.test_timer_end_date}
          size={circularSize}
          strokeWidth={isMobile ? 4 : 6}
          originalDuration={normalizedTestTimerDuration}
          progressKey={`property-listing-card:${property.id}`}
          auctionEndedLabel={t(
            circularSize <= 72 ? 'auctionCircularEndedShort' : 'propertyDetailAuctionCompleted',
          )}
        />
      </div>
    ) : null

  const buyNowCompletedEndedSeal =
    showTimer &&
    hasTimer &&
    !isReserved &&
    buyNowPurchaseCompleted &&
    !showCircularOnCard &&
    !effectiveAuctionEnd ? (
      <div className="property-timer-wrapper">
        <CircularTimer
          endTime={property.buy_now_completed_at}
          size={circularSize}
          strokeWidth={isMobile ? 4 : 6}
          auctionEndedLabel={t(
            circularSize <= 72 ? 'auctionCircularEndedShort' : 'propertyDetailAuctionCompleted',
          )}
        />
      </div>
    ) : null

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return
    onOpen?.(property)
  }

  const cardClassName = [
    'property-card',
    isAuctionEndedCard && 'property-card--auction-ended',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cardClassName} onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      {isAuctionEndedCard ? (
        <div className="property-auction-ended-overlay property-auction-ended-overlay--full-card">
          <span className="property-auction-ended-overlay__title">{t('auctionSoldOutLabel')}</span>
          <button
            type="button"
            className="property-auction-ended-overlay__result-link"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpen?.(property, { auctionTab: PROPERTY_DETAIL_AUCTION_TAB_BIDS })
            }}
          >
            <span>{t('auctionResultSummary')}</span>
            <span aria-hidden>→</span>
          </button>
        </div>
      ) : null}
      <div className="property-link">
        <div className="property-image-container">
          <ImageWithSkeleton
            imgProps={propertyImageProps}
            alt={propertyTitle}
            className="property-image"
            containerClassName="property-image"
          />
          {isReserved && (
            <div className="property-reserved-overlay">
              <div className="reserved-overlay-icon">🔒</div>
              <div className="reserved-overlay-text">Забронировано</div>
            </div>
          )}
          {(hasBuyNowPrice || hasTestDrive) &&
            !isAuctionListingEnded(property) && (
              <div className="property-badges-center">
                {hasBuyNowPrice && (
                  <div
                    className="property-buy-badge"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onOpen?.(property)
                    }}
                  >
                    <span>{t('buyNowSectionTitle')}</span>
                  </div>
                )}
                {hasTestDrive && (
                  <div
                    className="property-testdrive-badge"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onOpen?.(property)
                    }}
                  >
                    <span>{t('testDrive')}</span>
                  </div>
                )}
              </div>
            )}
          <div className="property-media-actions">
            <button
              type="button"
              className={`property-favorite ${isPropertyLiked(property) ? 'active' : ''}`}
              onClick={(e) => handleFavoriteToggle(property, e)}
              aria-label={t('favorites')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill={isPropertyLiked(property) ? 'currentColor' : 'none'}
                />
              </svg>
            </button>
            <PropertyShareButton property={property} />
          </div>
          {imageTopRightAction ? (
            <button
              type="button"
              className="property-image-corner-action"
              aria-label={imageTopRightAction.ariaLabel}
              title={imageTopRightAction.ariaLabel}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                imageTopRightAction.onClick?.(e)
              }}
            >
              {imageTopRightAction.icon}
            </button>
          ) : null}
        </div>
        <div className="property-content">
          {pinFooter ? (
            <>
              {greenTimerBlock}
              {redTimerBlock}
              {buyNowCompletedEndedSeal}
              <div
                className={`property-content-meta${
                  !showDescription ? ' property-content-meta--compact' : ''
                }`}
              >
                <h3 className="property-title">{propertyTitle}</h3>
                {showSpecsInMeta ? listingSpecsRow(16) : null}
                {showDescription &&
                  (property.description ? (
                    <p className="property-description">{property.description}</p>
                  ) : (
                    <p className="property-description property-description--empty" aria-hidden="true" />
                  ))}
                <p className="property-location">{property.location || ''}</p>
                {buyNowWinnerId != null && !isAuctionListingEnded(property) && (
                  <p className="property-card-buy-now-winner" role="status">
                    {t('propertyCardBuyNowWinner', { id: buyNowWinnerId })}
                  </p>
                )}
              </div>
              <div className="property-content-body-gap" aria-hidden="true" />
            </>
          ) : (
            <>
              {isMobile ? (
                <>
                  {greenTimerBlock}
                  {buyNowCompletedEndedSeal}
                  <h3 className="property-title">{propertyTitle}</h3>
                  {redTimerBlock}
                </>
              ) : (
                <>
                  {greenTimerBlock}
                  {redTimerBlock}
                  {buyNowCompletedEndedSeal}
                  <h3 className="property-title">{propertyTitle}</h3>
                </>
              )}
              {property.description ? (
                <p className="property-description">{property.description}</p>
              ) : (
                <p className="property-description property-description--empty" aria-hidden="true" />
              )}
              <p className="property-location">{property.location || ''}</p>
              {buyNowWinnerId != null && !isAuctionListingEnded(property) && (
                <p className="property-card-buy-now-winner" role="status">
                  {t('propertyCardBuyNowWinner', { id: buyNowWinnerId })}
                </p>
              )}
            </>
          )}

          <div
            className={`property-content-bottom${
              showActions ? ' property-content-bottom--with-actions' : ''
            }${pinFooter ? ' property-content-bottom--pin-footer' : ''}`}
          >
            {showAuctionBidFooter && hasListingSpecs && !showSpecsInMeta && (
              <div className="property-card-owner__info">
                <div className="property-card-owner__info-row">
                  {(property.area || property.sqft) && (
                    <div className="property-card-owner__info-item">
                      <BiArea size={16} />
                      <span>
                        {property.area || property.sqft} {t('squareMeters')}
                      </span>
                    </div>
                  )}
                  {(property.rooms || property.beds || property.bedrooms) && (
                    <div className="property-card-owner__info-item">
                      <MdBed size={16} />
                      <span>{property.rooms || property.beds || property.bedrooms}</span>
                    </div>
                  )}
                  {property.bathrooms ? (
                    <div className="property-card-owner__info-item">
                      <MdOutlineBathtub size={16} />
                      <span>{property.bathrooms}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {showAuctionBidFooter ? (
              footerAction ? (
                <div className="property-wallet-footer-row">
                  <div className="property-bid-info">
                    <span className="bid-label">{bidInfoLabel ?? t('currentBid')}</span>
                    <span className="bid-value">
                      {formatPrice(
                        bidInfoAmount != null
                          ? bidInfoAmount
                          : resolveAuctionCurrentBidValue(property),
                        property.currency,
                      )}
                    </span>
                  </div>
                  {footerAction}
                </div>
              ) : (
                <div className="property-bid-info">
                  <span className="bid-label">{bidInfoLabel ?? t('currentBid')}</span>
                  <span className="bid-value">
                    {formatPrice(
                      bidInfoAmount != null
                        ? bidInfoAmount
                        : resolveAuctionCurrentBidValue(property),
                      property.currency,
                    )}
                  </span>
                </div>
              )
            ) : (
              <>
                <div className="property-price">
                  {formatPrice(property.price || 0, property.currency)}
                </div>
                <div className="property-specs">
                  {(property.rooms || property.beds) && (
                    <div className="spec-item">
                      <MdBed size={18} />
                      <span>{property.rooms || property.beds}</span>
                    </div>
                  )}
                  {(property.area || property.sqft) && (
                    <div className="spec-item">
                      <BiArea size={18} />
                      <span>
                        {property.area || property.sqft} {t('squareMeters')}
                      </span>
                    </div>
                  )}
                  {property.floor && (
                    <span className="spec-item">
                      {property.floor} {t('floor')}
                    </span>
                  )}
                </div>
              </>
            )}

            {showActions ? (
              <div className="property-actions" onClick={(e) => e.stopPropagation()}>
                {!isAuctionEndedCard ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-liquid-glass"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onOpen?.(property)
                    }}
                    disabled={isReserved}
                    style={{
                      opacity: isReserved ? 0.5 : 1,
                      cursor: isReserved ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isReserved ? t('objectReserved') : t('placeBid')}
                  </button>
                ) : null}
                {hasBuyNowPrice && !isAuctionListingEnded(property) && (
                  <button
                    type="button"
                    className="btn btn-buy-now btn-liquid-glass-buy"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onOpen?.(property)
                    }}
                    disabled={isReserved}
                    style={{
                      opacity: isReserved ? 0.45 : 1,
                      cursor: isReserved ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isReserved ? t('objectReserved') : t('buyNowSectionTitle')}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyListingCard
