import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MapPin,
  Gem,
  ShoppingBag,
  Car,
  ArrowUpRight,
  Heart,
  LockKeyhole,
  Clock,
  Layers,
  LandPlot,
} from 'lucide-react'
import { MdBed } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
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
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
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
    const showSoldPresentation = isAuctionEndedCard

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
      showSoldPresentation,
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

function formatAuctionCardCountdown(endTime) {
  if (!endTime) return null
  const diffMs = new Date(endTime).getTime() - Date.now()
  if (diffMs <= 0) return null
  const totalSec = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const pad = (value) => String(value).padStart(2, '0')
  if (days > 0) return `${days}д ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function AuctionCardOverlayCountdown({ endTime }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [endTime])

  void tick
  const timeText = formatAuctionCardCountdown(endTime)
  if (!timeText) return null

  return (
    <div className="auction-card__countdown-pill" role="timer">
      <Clock size={14} strokeWidth={2.2} aria-hidden />
      <span>{timeText}</span>
    </div>
  )
}

function formatLandAreaValue(raw) {
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return null
  // Values under 500 are treated as sotki; larger values as m² → sotki.
  const sotki = value >= 500 ? value / 100 : value
  const rounded = Math.round(sotki * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
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

  const buyNowPrice = property.price != null && property.price !== '' ? Number(property.price) : 0
  const showBuyNowPriceRow =
    state.hasBuyNowPrice &&
    !state.blocksPurchase &&
    !state.listingEnded &&
    !state.showSoldPresentation &&
    Number.isFinite(buyNowPrice) &&
    buyNowPrice > 0

  const bidsCount = Number(property.bids_count ?? property.bidsCount ?? property.total_bids ?? 0)
  const showBidsCount = state.hasTimer && !state.showSoldPresentation && Number.isFinite(bidsCount)

  const detailHref = property ? getPropertyDetailPath(property) : '#'

  const showFeatureBadges =
    !state.isReserved &&
    !state.blocksBid &&
    !state.blocksPurchase &&
    !showPrivateClubBand &&
    state.hasTestDrive &&
    !state.listingEnded &&
    !state.showGreenTimer

  const visibleActionCount =
    !showPrivateClubBand && !state.blocksBid
      ? 1 +
        (state.hasBuyNowPrice && !state.blocksPurchase && !state.listingEnded ? 1 : 0)
      : 0

  const cardClassName = [
    'auction-card',
    `auction-card--actions-${visibleActionCount}`,
    state.isAuctionEndedCard && 'auction-card--ended',
    state.showSoldPresentation && 'auction-card--sold-presentation',
    `auction-card--buyer-${state.listingState.state}`,
    showPrivateClubBand && 'auction-card--vip',
    state.showCircularTimer && 'auction-card--live',
  ]
    .filter(Boolean)
    .join(' ')

  const areaValue = property.area || property.sqft
  const roomsValue = property.rooms || property.beds || property.bedrooms
  const floorsValue = property.total_floors || property.totalFloors || property.floors || property.floor
  const landValue = formatLandAreaValue(property.land_area ?? property.landArea)

  const cardSpecs = [
    areaValue
      ? {
          key: 'area',
          icon: <BiArea size={15} aria-hidden />,
          value: `${areaValue} ${t('squareMeters')}`,
          label: t('propertyDetailSpecsArea'),
        }
      : null,
    roomsValue
      ? {
          key: 'rooms',
          icon: <MdBed size={15} aria-hidden />,
          value: String(roomsValue),
          label: t('propertyDetailRoomsLabel'),
        }
      : null,
    floorsValue
      ? {
          key: 'floors',
          icon: <Layers size={14} strokeWidth={2.1} aria-hidden />,
          value: String(floorsValue),
          label: t('propertyDetailSpecsFloors'),
        }
      : null,
    landValue
      ? {
          key: 'land',
          icon: <LandPlot size={14} strokeWidth={2.1} aria-hidden />,
          value: t('auctionCardLandSotki', { count: landValue }),
          label: t('propertyDetailPlotLabel'),
        }
      : null,
  ]
    .filter(Boolean)
    .slice(0, 4)

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
        </a>
        <AuctionFinalStateRibbon listingState={state.listingState} />

        {showPrivateClubBand ? (
          <div className="auction-card__vip-ribbon" aria-label={t('auctionPrivateClubLotTooltip')}>
            <Gem size={14} strokeWidth={2.2} aria-hidden />
            <span>{t('auctionPrivateClubVipBadge')}</span>
            <span className="auction-card__vip-ribbon-dot" aria-hidden />
            <span className="auction-card__vip-ribbon-label">{t('auctionPrivateClubMobileLabel')}</span>
          </div>
        ) : null}

        {state.showGreenTimer ? (
          <div className="auction-card__media-top">
            <span className="auction-card__until-pill">{t('auctionCardUntilEnd')}</span>
            <AuctionCardOverlayCountdown endTime={state.effectiveAuctionEnd} />
          </div>
        ) : null}

        <button
          type="button"
          className={`auction-card__favorite${isFavorite ? ' auction-card__favorite--active' : ''}`}
          onClick={(e) => onFavoriteToggle(property, e)}
          aria-label={isFavorite ? t('auctionRemoveFavorite') : t('propertyDetailAddToFavorites')}
          aria-pressed={Boolean(isFavorite)}
        >
          <Heart size={18} strokeWidth={2} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
        </button>

        {showFeatureBadges ? (
          <div className="auction-card__photo-icons" onClick={(e) => e.stopPropagation()}>
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
            {state.hasBuyNowPrice && !state.blocksPurchase && !showBuyNowPriceRow ? (
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
          </div>
        ) : null}

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
                size={64}
                strokeWidth={5}
                originalDuration={state.normalizedTestTimerDuration}
                progressKey={`auction-card:${property.id}`}
                auctionEndedLabel={t('auctionCircularEndedShort')}
              />
            ) : null}
            {state.showBuyNowEndedSeal ? (
              <CircularTimer
                endTime={property.buy_now_completed_at}
                size={64}
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

      <div className="auction-card__body">
        <div className="auction-card__meta">
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

          {property.location ? (
            <p className="auction-card__location">
              <MapPin size={13} strokeWidth={2.2} aria-hidden />
              <span>{property.location}</span>
            </p>
          ) : (
            <p className="auction-card__location auction-card__location--empty" aria-hidden />
          )}

          {cardSpecs.length > 0 ? (
            <div
              className={`auction-card__specs auction-card__specs--${Math.min(cardSpecs.length, 4)}`}
            >
              {cardSpecs.map((spec) => (
                <div key={spec.key} className="auction-card__spec">
                  <span className="auction-card__spec-icon" aria-hidden>
                    {spec.icon}
                  </span>
                  <span className="auction-card__spec-value">{spec.value}</span>
                  <span className="auction-card__spec-label">{spec.label}</span>
                </div>
              ))}
            </div>
          ) : null}

          {state.buyNowWinnerId != null && !state.listingEnded ? (
            <p className="auction-card__winner-note" role="status">
              {t('propertyCardBuyNowWinner', { id: state.buyNowWinnerId })}
            </p>
          ) : null}
        </div>

        <div className="auction-card__footer">
          <div
            className={`auction-card__pricing${
              state.showSoldPresentation ? ' auction-card__pricing--sold' : ''
            }`}
          >
            <div className="auction-card__price-row">
              <div className="auction-card__price-main">
                <span className="auction-card__price-label">
                  <span className="auction-card__price-label-full">
                    {state.showSoldPresentation
                      ? t('auctionSoldFor')
                      : state.hasTimer
                        ? t('currentBid').replace(/:$/, '')
                        : t('propertyDetailPrice').replace(/:$/, '')}
                  </span>
                  <span className="auction-card__price-label-short">
                    {state.showSoldPresentation
                      ? t('auctionSoldFor')
                      : state.hasTimer
                        ? t('auctionCardBidShort')
                        : t('propertyDetailPrice').replace(/:$/, '')}
                  </span>
                </span>
                <span className="auction-card__price-value">
                  {formatPrice(displayPrice, property.currency)}
                </span>
              </div>
              {showBidsCount ? (
                <span className="auction-card__bids-count">
                  {t('auctionCardBidsCount', { count: bidsCount })}
                </span>
              ) : null}
            </div>

            {showBuyNowPriceRow ? (
              <div className="auction-card__buy-now-row">
                <span className="auction-card__price-label">{t('buyNowModalTitle')}</span>
                <span className="auction-card__buy-now-value">
                  {formatPrice(buyNowPrice, property.currency)}
                </span>
              </div>
            ) : null}
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
                className="auction-card__btn auction-card__btn--outline"
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
                    <ArrowUpRight className="auction-card__btn-arrow" size={15} aria-hidden />
                  </>
                )}
              </button>
              {state.hasBuyNowPrice && !state.blocksPurchase && !state.listingEnded ? (
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
                      <span className="auction-card__btn-text-full">{t('buyNowModalTitle')}</span>
                      <span className="auction-card__btn-text-short">{t('auctionCardBuyShort')}</span>
                      <ArrowUpRight className="auction-card__btn-arrow" size={15} aria-hidden />
                    </>
                  )}
                </button>
              ) : null}
            </div>
          ) : null}
          {state.showSoldPresentation ? (
            <button
              type="button"
              className="auction-card__sold-cta"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onOpen(property)
              }}
              aria-label={openLabel}
            >
              <span className="auction-card__sold-cta-copy">
                <span className="auction-card__sold-cta-label">{t('auctionSoldBadge')}</span>
                <span className="auction-card__sold-cta-open">{t('buyerCabinet_openProperty')}</span>
              </span>
              <ArrowUpRight className="auction-card__sold-cta-arrow" size={17} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
