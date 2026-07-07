import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Gem, ShoppingBag, Car, ArrowUpRight } from 'lucide-react'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import ListingCardAuctionTimer from './ListingCardAuctionTimer'
import CircularTimer from './CircularTimer'
import ImageWithSkeleton from './ImageWithSkeleton'
import { getPropertyCardImage } from '../utils/propertyImage'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import { resolveAuctionCurrentBidValue } from '../utils/auctionBidValue'
import { isPrivateClubAuctionLot } from '../utils/isPrivateClubAuctionLot'
import { hasBuyNowOption, hasAuctionBuyNowListingForm } from '../utils/hasBuyNowOption'
import {
  getEffectiveAuctionEndTime,
  hasTestTimerDateString,
  isBuyNowPurchaseCompleted,
  isEffectiveAuctionTimerExpired,
  isAuctionListingEnded,
  shouldShowCircularAuctionTimer,
} from '../utils/auctionReminderBounds'
import './AuctionPropertyCard.css'
import { getPropertyDetailPath, PROPERTY_DETAIL_AUCTION_TAB_BIDS } from '../utils/propertyDetailUrl'

function useAuctionCardState(property) {
  return useMemo(() => {
    const buyNowPurchaseCompleted = isBuyNowPurchaseCompleted(property)
    const effectiveAuctionEnd = getEffectiveAuctionEndTime(property)
    const hasTestTimerRaw = !buyNowPurchaseCompleted && hasTestTimerDateString(property)
    const showCircularOnCard = shouldShowCircularAuctionTimer(property)
    const hasTimer =
      (property.isAuction === true &&
        (buyNowPurchaseCompleted ||
          (effectiveAuctionEnd != null && String(effectiveAuctionEnd).trim() !== ''))) ||
      hasTestTimerRaw

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

    const isTimerExpired = isEffectiveAuctionTimerExpired(property)
    const isAuctionEndedCard = isTimerExpired && hasTimer
    const isPrivateClub = isPrivateClubAuctionLot(property)
    const listingEnded = isAuctionListingEnded(property)

    return {
      buyNowPurchaseCompleted,
      effectiveAuctionEnd,
      showCircularOnCard,
      hasTimer,
      hasTestDrive,
      isReserved,
      hasBuyNowPrice,
      normalizedTestTimerDuration,
      isAuctionEndedCard,
      isPrivateClub,
      listingEnded,
      buyNowWinnerId: property.buy_now_winner_user_id,
      showGreenTimer: hasTimer && !isReserved && !showCircularOnCard && effectiveAuctionEnd,
      showCircularTimer: hasTimer && !isReserved && showCircularOnCard,
      showBuyNowEndedSeal:
        hasTimer &&
        !isReserved &&
        buyNowPurchaseCompleted &&
        !showCircularOnCard &&
        !effectiveAuctionEnd,
    }
  }, [property])
}

export default function AuctionPropertyCard({
  property,
  isFavorite,
  onFavoriteToggle,
  onOpen,
  onTooltip,
  viewerHasVip = false,
  formatPrice,
}) {
  const { t } = useTranslation()
  const state = useAuctionCardState(property)

  const propertyTitle = property.title || property.name || ''
  const propertyImage = getPropertyCardImage(
    property,
    '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'
  )
  const propertyImageProps = buildResponsiveImageProps(propertyImage, {
    widths: [320, 480, 640, 800],
    sizes: '(max-width: 500px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw',
    quality: 72,
    fit: 'crop',
  })

  const showPrivateClubBand =
    viewerHasVip && state.isPrivateClub && !state.listingEnded && !state.isReserved

  const displayPrice = state.hasTimer
    ? resolveAuctionCurrentBidValue(property)
    : property.price || 0

  const detailHref = property ? getPropertyDetailPath(property) : '#'

  const showFeatureBadges =
    !state.isReserved &&
    !showPrivateClubBand &&
    (state.hasBuyNowPrice || state.hasTestDrive) &&
    !state.listingEnded

  const cardClassName = [
    'auction-card',
    state.isAuctionEndedCard && 'auction-card--ended',
    showPrivateClubBand && 'auction-card--vip',
    state.showCircularTimer && 'auction-card--live',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <a
      href={detailHref}
      className={cardClassName}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return
        if (e.target.closest('button')) {
          e.preventDefault()
          return
        }
        if (!onOpen) return
        e.preventDefault()
        onOpen(property)
      }}
    >
      {state.isAuctionEndedCard ? (
        <div className="auction-card__ended-overlay">
          <span className="auction-card__ended-title">{t('auctionSoldOutLabel')}</span>
          <button
            type="button"
            className="auction-card__ended-link"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpen(property, { auctionTab: PROPERTY_DETAIL_AUCTION_TAB_BIDS })
            }}
          >
            <span>{t('auctionResultSummary')}</span>
            <ArrowUpRight size={16} aria-hidden />
          </button>
        </div>
      ) : null}

      <div className="auction-card__media">
        <ImageWithSkeleton
          imgProps={propertyImageProps}
          alt={propertyTitle}
          className="auction-card__image"
          containerClassName="auction-card__image-wrap"
        />
        <div className="auction-card__media-gradient" aria-hidden />

        {showPrivateClubBand ? (
          <div className="auction-card__vip-ribbon" aria-label={t('auctionPrivateClubLotTooltip')}>
            <Gem size={14} strokeWidth={2.2} aria-hidden />
            <span>{t('auctionPrivateClubVipBadge')}</span>
            <span className="auction-card__vip-ribbon-dot" aria-hidden />
            <span className="auction-card__vip-ribbon-label">{t('auctionPrivateClubMobileLabel')}</span>
          </div>
        ) : null}

        <div className="auction-card__media-actions">
          <button
            type="button"
            className={`auction-card__favorite${isFavorite ? ' auction-card__favorite--active' : ''}`}
            onClick={(e) => onFavoriteToggle(property, e)}
            aria-label={t('favorites')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                stroke="currentColor"
                strokeWidth="2"
                fill={isFavorite ? 'currentColor' : 'none'}
              />
            </svg>
          </button>

          {showFeatureBadges ? (
            <div className="auction-card__photo-icons" onClick={(e) => e.stopPropagation()}>
              {state.hasBuyNowPrice ? (
                <button
                  type="button"
                  className="auction-card__photo-icon auction-card__photo-icon--buy"
                  aria-label={t('buyNowSectionTitle')}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    onTooltip?.({
                      show: true,
                      text: t('buyNowTooltip'),
                      x: rect.left + rect.width / 2,
                      y: rect.top - 10,
                    })
                  }}
                  onMouseLeave={() => onTooltip?.({ show: false, text: '', x: 0, y: 0 })}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onOpen(property)
                  }}
                >
                  <span className="auction-card__photo-icon-glass" aria-hidden />
                  <ShoppingBag size={16} strokeWidth={2.1} aria-hidden />
                </button>
              ) : null}
              {state.hasTestDrive ? (
                <button
                  type="button"
                  className="auction-card__photo-icon auction-card__photo-icon--test"
                  aria-label={t('testDrive')}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    onTooltip?.({
                      show: true,
                      text: t('testDriveTooltip'),
                      x: rect.left + rect.width / 2,
                      y: rect.top - 10,
                    })
                  }}
                  onMouseLeave={() => onTooltip?.({ show: false, text: '', x: 0, y: 0 })}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onOpen(property)
                  }}
                >
                  <span className="auction-card__photo-icon-glass" aria-hidden />
                  <Car size={16} strokeWidth={2.1} aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {state.isReserved ? (
          <div className="auction-card__reserved">
            <span aria-hidden>🔒</span>
            <span>{t('reserved')}</span>
          </div>
        ) : null}

        {!state.isReserved && (state.showCircularTimer || state.showBuyNowEndedSeal) ? (
          <div
            className={[
              'auction-card__timer-dock',
              state.showCircularTimer && 'auction-card__timer-dock--live',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {state.showCircularTimer ? (
              <CircularTimer
                endTime={property.test_timer_end_date}
                size={58}
                strokeWidth={5}
                originalDuration={state.normalizedTestTimerDuration}
                progressKey={`auction-card:${property.id}`}
                auctionEndedLabel={t('auctionCircularEndedShort')}
              />
            ) : null}
            {state.showBuyNowEndedSeal ? (
              <CircularTimer
                endTime={property.buy_now_completed_at}
                size={58}
                strokeWidth={5}
                auctionEndedLabel={t('auctionCircularEndedShort')}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {showPrivateClubBand ? (
        <div className="auction-card__vip-strip" onClick={(e) => e.stopPropagation()}>
          <div className="auction-card__vip-strip-shine" aria-hidden />
          <Gem size={13} strokeWidth={2.2} aria-hidden />
          <span className="auction-card__vip-strip-label">{t('auctionCardVipExclusive')}</span>
          <button
            type="button"
            className="auction-card__vip-strip-cta"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onOpen(property)
            }}
          >
            {t('auctionPrivateClubGoCta')}
            <ArrowUpRight size={14} aria-hidden />
          </button>
        </div>
      ) : null}

      {!state.isReserved && state.showGreenTimer ? (
        <ListingCardAuctionTimer
          endTime={state.effectiveAuctionEnd}
          endedLabel={t('propertyDetailAuctionCompleted')}
        />
      ) : null}

      <div className="auction-card__body">
        <div className="auction-card__meta">
          {property.location ? (
            <p className="auction-card__location">
              <MapPin size={14} strokeWidth={2.2} aria-hidden />
              <span>{property.location}</span>
            </p>
          ) : (
            <p className="auction-card__location auction-card__location--empty" aria-hidden />
          )}

          <h3 className="auction-card__title">{propertyTitle}</h3>

          <div className="auction-card__specs">
            {(property.area || property.sqft) ? (
              <span className="auction-card__spec">
                <BiArea size={15} aria-hidden />
                {property.area || property.sqft} {t('squareMeters')}
              </span>
            ) : null}
            {(property.rooms || property.beds || property.bedrooms) ? (
              <span className="auction-card__spec">
                <MdBed size={15} aria-hidden />
                {property.rooms || property.beds || property.bedrooms}
              </span>
            ) : null}
            {property.bathrooms ? (
              <span className="auction-card__spec">
                <MdOutlineBathtub size={15} aria-hidden />
                {property.bathrooms}
              </span>
            ) : null}
            {property.floor ? (
              <span className="auction-card__spec">
                {property.floor} {t('floor')}
              </span>
            ) : null}
          </div>

          {state.buyNowWinnerId != null && !state.listingEnded ? (
            <p className="auction-card__winner-note" role="status">
              {t('propertyCardBuyNowWinner', { id: state.buyNowWinnerId })}
            </p>
          ) : null}
        </div>

        <div className="auction-card__footer">
          <div className="auction-card__price-panel">
            <span className="auction-card__price-label">
              {state.hasTimer ? t('currentBid').replace(/:$/, '') : t('propertyDetailPrice').replace(/:$/, '')}
            </span>
            <span className="auction-card__price-value">{formatPrice(displayPrice, property.currency)}</span>
          </div>

          {!showPrivateClubBand && !state.isAuctionEndedCard ? (
            <div
              className={`auction-card__actions${
                state.hasBuyNowPrice && !state.listingEnded ? '' : ' auction-card__actions--single'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="auction-card__btn auction-card__btn--primary"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onOpen(property)
                }}
                disabled={state.isReserved}
              >
                {state.isReserved ? t('objectReserved') : t('placeBid')}
              </button>
              {state.hasBuyNowPrice && !state.listingEnded ? (
                <button
                  type="button"
                  className="auction-card__btn auction-card__btn--secondary"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onOpen(property)
                  }}
                  disabled={state.isReserved}
                >
                  {state.isReserved ? t('objectReserved') : t('buyNowModalTitle')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </a>
  )
}
