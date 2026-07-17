import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Gem, ShoppingBag, Car, ArrowUpRight, Heart, LockKeyhole } from 'lucide-react'
import { MdBed, MdOutlineBathtub } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import ListingCardAuctionTimer from './ListingCardAuctionTimer'
import CircularTimer from './CircularTimer'
import ImageWithSkeleton from './ImageWithSkeleton'
import { getPropertyCardImage, PROPERTY_CARD_IMAGE_FALLBACK } from '../utils/propertyImage'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import { resolveAuctionCurrentBidValue } from '../utils/auctionBidValue'
import { isPrivateClubAuctionLot } from '../utils/isPrivateClubAuctionLot'
import { hasBuyNowOption, hasAuctionBuyNowListingForm } from '../utils/hasBuyNowOption'
import {
  getEffectiveAuctionEndTime,
  hasTestTimerDateString,
  isBuyNowPurchaseCompleted,
  isAuctionListingEnded,
  shouldShowCircularAuctionTimer,
} from '../utils/auctionReminderBounds'
import './AuctionPropertyCard.css'
import { getPropertyDetailPath, PROPERTY_DETAIL_AUCTION_TAB_BIDS } from '../utils/propertyDetailUrl'
import { resolveBuyerListingState } from '../utils/resolveBuyerListingState'
import AuctionFinalStateRibbon from './auction/AuctionFinalStateRibbon'

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

    const isPrivateClub = isPrivateClubAuctionLot(property)
    const listingEnded = isAuctionListingEnded(property)
    const listingState = resolveBuyerListingState(property)
    const blocksPurchase = listingState.blocksPurchase
    const blocksBid = listingState.blocksBid
    const isAuctionEndedCard = listingState.state === 'sold' || listingState.state === 'auction-ended'

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
      listingState,
      blocksPurchase,
      blocksBid,
      buyNowWinnerId: property.buy_now_winner_user_id,
      showGreenTimer: hasTimer && !blocksBid && !isReserved && !showCircularOnCard && effectiveAuctionEnd,
      showCircularTimer: hasTimer && !blocksBid && !isReserved && showCircularOnCard,
      showBuyNowEndedSeal:
        hasTimer &&
        !blocksBid &&
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
  const propertyImage = getPropertyCardImage(property, PROPERTY_CARD_IMAGE_FALLBACK)
  const propertyImageProps = buildResponsiveImageProps(propertyImage, {
    widths: [320, 480, 640, 800],
    sizes: '(max-width: 500px) 50vw, (max-width: 768px) 50vw, (max-width: 1200px) 50vw, 33vw',
    quality: 72,
    fit: 'crop',
  })

  const showPrivateClubBand =
    viewerHasVip &&
    state.isPrivateClub &&
    !state.blocksBid &&
    !state.blocksPurchase &&
    !state.listingEnded &&
    !state.isReserved

  const displayPrice = state.hasTimer
    ? resolveAuctionCurrentBidValue(property)
    : property.price || 0

  const detailHref = property ? getPropertyDetailPath(property) : '#'

  const showFeatureBadges =
    !state.isReserved &&
    !state.blocksBid &&
    !state.blocksPurchase &&
    !showPrivateClubBand &&
    (state.hasBuyNowPrice || state.hasTestDrive) &&
    !state.listingEnded

  const cardClassName = [
    'auction-card',
    state.isAuctionEndedCard && 'auction-card--ended',
    `auction-card--buyer-${state.listingState.state}`,
    showPrivateClubBand && 'auction-card--vip',
    state.showCircularTimer && 'auction-card--live',
  ]
    .filter(Boolean)
    .join(' ')

  const cardSpecs = [
    (property.area || property.sqft) && {
      key: 'area',
      icon: <BiArea size={15} aria-hidden />,
      label: `${property.area || property.sqft} ${t('squareMeters')}`,
    },
    (property.rooms || property.beds || property.bedrooms) && {
      key: 'rooms',
      icon: <MdBed size={15} aria-hidden />,
      label: property.rooms || property.beds || property.bedrooms,
    },
    property.bathrooms && {
      key: 'bathrooms',
      icon: <MdOutlineBathtub size={15} aria-hidden />,
      label: property.bathrooms,
    },
    property.floor && {
      key: 'floor',
      icon: null,
      label: `${property.floor} ${t('floor')}`,
    },
  ]
    .filter(Boolean)
    .slice(0, 2)

  const handleCanonicalOpen = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1) return
    if (!onOpen) return
    event.preventDefault()
    onOpen(property)
  }

  const openLabel = `${t('buyerCabinet_openProperty')}: ${propertyTitle}`

  return (
    <article className={cardClassName}>
      <div className="auction-card__media">
        <a
          href={detailHref}
          className="auction-card__media-link"
          onClick={handleCanonicalOpen}
          aria-label={openLabel}
        >
          <ImageWithSkeleton
            imgProps={propertyImageProps}
            fallbackSrc={PROPERTY_CARD_IMAGE_FALLBACK}
            alt={propertyTitle}
            className="auction-card__image"
            containerClassName="auction-card__image-wrap"
          />
          <div className="auction-card__media-gradient" aria-hidden />
          <AuctionFinalStateRibbon listingState={state.listingState} />
        </a>

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
            aria-label={isFavorite ? t('auctionRemoveFavorite') : t('propertyDetailAddToFavorites')}
            aria-pressed={Boolean(isFavorite)}
          >
            <Heart size={20} strokeWidth={2} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
          </button>

          {showFeatureBadges ? (
            <div className="auction-card__photo-icons" onClick={(e) => e.stopPropagation()}>
              {state.hasBuyNowPrice && !state.blocksPurchase ? (
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
            <LockKeyhole size={14} strokeWidth={2.2} aria-hidden />
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

          <h3 className="auction-card__title">
            <a
              href={detailHref}
              className="auction-card__title-link"
              onClick={handleCanonicalOpen}
              aria-label={openLabel}
            >
              {propertyTitle}
            </a>
          </h3>

          <div className="auction-card__specs">
            {cardSpecs.map((spec) => (
              <span key={spec.key} className="auction-card__spec">
                {spec.icon}
                {spec.label}
              </span>
            ))}
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
              <span className="auction-card__price-label-full">
                {state.hasTimer ? t('currentBid').replace(/:$/, '') : t('propertyDetailPrice').replace(/:$/, '')}
              </span>
              <span className="auction-card__price-label-short">
                {state.hasTimer
                  ? t('auctionCardBidShort')
                  : t('propertyDetailPrice').replace(/:$/, '')}
              </span>
            </span>
            <span className="auction-card__price-value">{formatPrice(displayPrice, property.currency)}</span>
          </div>

          {!showPrivateClubBand && !state.blocksBid ? (
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
                {state.isReserved ? (
                  t('objectReserved')
                ) : (
                  <>
                    <span className="auction-card__btn-text-full">{t('placeBid')}</span>
                    <span className="auction-card__btn-text-short">{t('auctionCardBidShort')}</span>
                  </>
                )}
              </button>
              {state.hasBuyNowPrice && !state.blocksPurchase && !state.listingEnded ? (
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
                  {state.isReserved ? (
                    t('objectReserved')
                  ) : (
                    <>
                      <span className="auction-card__btn-text-full">{t('buyNowModalTitle')}</span>
                      <span className="auction-card__btn-text-short">{t('auctionCardBuyShort')}</span>
                    </>
                  )}
                </button>
              ) : null}
            </div>
          ) : null}
          {state.isAuctionEndedCard ? (
            <button
              type="button"
              className="buyer-card-final-action auction-card__final-action"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpen(property, { auctionTab: PROPERTY_DETAIL_AUCTION_TAB_BIDS })
              }}
            >
              <span>
                {state.listingState.state === 'sold'
                  ? t('auctionFinalActionSold')
                  : t('auctionFinalActionEnded')}
              </span>
              <strong>{t('auctionResultSummary')} <ArrowUpRight size={14} aria-hidden /></strong>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
