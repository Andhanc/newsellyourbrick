import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, Heart, Layers, MapPin, PieChart } from 'lucide-react'
import { MdBed } from 'react-icons/md'
import { BiArea } from 'react-icons/bi'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import { formatPropertyPrice } from '../utils/currency'
import { publicAsset } from '../utils/publicAsset'
import BuyerStatusRibbon from './buyer-mobile/BuyerStatusRibbon'
import {
  normalizeMarketplaceShare,
  resolveShareMarketplaceState,
} from '../utils/sharesMarketplacePresentation'
import { getCoInvestmentDetailPath } from '../utils/sectionRoutes'
import './SharesPropertyCard.css'

const CARD_IMAGE_FALLBACK = publicAsset('images/co-investment/co-investment-card-fallback.png')

function SharesPropertyCard({
  share,
  viewMode = 'grid',
  isFavorite = false,
  onFavoriteToggle,
  onInvest,
  href,
}) {
  const { t, i18n } = useTranslation()
  const cardShare = normalizeMarketplaceShare(share)
  const investmentState = resolveShareMarketplaceState(cardShare)
  const detailHref = href || getCoInvestmentDetailPath(cardShare)
  const totalShares = Number.isFinite(cardShare.totalShares) ? cardShare.totalShares : null
  const soldShares = Number.isFinite(cardShare.sharesSold) ? cardShare.sharesSold : null
  const collectedPercent = Number.isFinite(cardShare.collectedPercent) ? cardShare.collectedPercent : null
  const locationLabel =
    cardShare.location || [cardShare.city, cardShare.country].filter(Boolean).join(', ')
  const usesFallbackImage = !cardShare.image
  const numberLocale = i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US'
  const imageProps = buildResponsiveImageProps(cardShare.image || CARD_IMAGE_FALLBACK, {
    widths: [320, 480, 640, 800],
    sizes: viewMode === 'list' ? '280px' : '(max-width: 768px) 50vw, 25vw',
    quality: 76,
    fit: 'crop',
  })

  const formatPrice = (amount, { compact = false } = {}) =>
    formatPropertyPrice(amount, cardShare.currency || 'EUR', {
      compact,
      locale: numberLocale,
    })

  const collectedMeta =
    soldShares != null && totalShares != null && collectedPercent != null
      ? t('sharesCardAvailableMeta', {
          count: soldShares,
          total: totalShares,
          percent: collectedPercent,
        })
      : '—'

  const cardSpecs = useMemo(() => {
    const areaValue = cardShare.area || cardShare.sqft
    const roomsValue = cardShare.rooms || cardShare.beds || cardShare.bedrooms
    const floorsValue =
      cardShare.total_floors || cardShare.totalFloors || cardShare.floors || cardShare.floor

    const propertySpecs = [
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
    ].filter(Boolean)

    if (propertySpecs.length >= 3) return propertySpecs.slice(0, 3)

    const shareSpecs = [
      {
        key: 'entry',
        icon: <PieChart size={14} strokeWidth={2.1} aria-hidden />,
        value: formatPrice(cardShare.pricePerShare, { compact: true }),
        label: t('sharesCardMinInvestment'),
      },
      soldShares != null && totalShares != null
        ? {
            key: 'collected',
            icon: <PieChart size={14} strokeWidth={2.1} aria-hidden />,
            value: `${soldShares}/${totalShares}`,
            label: t('sharesCardCollected'),
          }
        : null,
      totalShares != null
        ? {
            key: 'total',
            icon: <Layers size={14} strokeWidth={2.1} aria-hidden />,
            value: String(totalShares),
            label: t('sharesCardSpecTotalShares'),
          }
        : null,
    ].filter(Boolean)

    const merged = [...propertySpecs]
    for (const spec of shareSpecs) {
      if (merged.length >= 3) break
      if (!merged.some((item) => item.key === spec.key)) merged.push(spec)
    }
    return merged.slice(0, 3)
  }, [cardShare, collectedMeta, formatPrice, soldShares, t, totalShares])

  const handleFavoriteClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onFavoriteToggle?.(share, event)
  }

  const handleCardOpen = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1) return
    if (event.target.closest('button')) {
      event.preventDefault()
      return
    }
    event.preventDefault()
    onInvest?.(share)
  }

  const handleOpen = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onInvest?.(share)
  }

  const handleImageError = (event) => {
    const image = event.currentTarget
    if (image.getAttribute('src') === CARD_IMAGE_FALLBACK) return
    image.onerror = null
    image.removeAttribute('srcset')
    image.src = CARD_IMAGE_FALLBACK
    image.alt = t('sharesCardFallbackImageAlt')
  }

  const showSoldPresentation =
    investmentState.state === 'sold' || investmentState.state === 'auction-ended'

  return (
    <a
      href={detailHref}
      className={`shares-v2-card shares-v2-card--${viewMode} shares-v2-card--${investmentState.state}${
        showSoldPresentation ? ' shares-v2-card--sold-presentation' : ''
      }`}
      onClick={handleCardOpen}
    >
      <div className="shares-v2-card__media">
        <img
          {...imageProps}
          alt={
            usesFallbackImage
              ? t('sharesCardFallbackImageAlt')
              : cardShare.title || t('sharesCardFallbackTitle')
          }
          className="shares-v2-card__image"
          onError={handleImageError}
        />
        <div className="shares-v2-card__media-gradient" aria-hidden />

        {!showSoldPresentation ? (
          <div
            className="shares-v2-card__shares-dock"
            aria-label={collectedMeta}
          >
            <div className="shares-v2-card__shares-dock-row">
              <div className="shares-v2-card__shares-dock-copy">
                <span className="shares-v2-card__shares-dock-label">{t('sharesCardCollected')}</span>
                <p className="shares-v2-card__shares-dock-count">
                  {soldShares != null && totalShares != null ? (
                    <>
                      <span className="shares-v2-card__shares-dock-num">{soldShares}</span>
                      <span className="shares-v2-card__shares-dock-sep">{t('sharesCardDockOf')}</span>
                      <span className="shares-v2-card__shares-dock-num">{totalShares}</span>
                      <span className="shares-v2-card__shares-dock-unit">{t('sharesCardDockShares')}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              {collectedPercent != null ? (
                <span className="shares-v2-card__shares-dock-percent">{collectedPercent}%</span>
              ) : null}
            </div>
            <div
              className={`shares-v2-card__shares-dock-track${
                collectedPercent == null ? ' is-unknown' : ''
              }`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={collectedPercent ?? undefined}
              aria-valuetext={collectedMeta}
            >
              <span style={{ width: `${collectedPercent ?? 0}%` }} />
            </div>
          </div>
        ) : null}

        {!showSoldPresentation ? (
          <button
            type="button"
            className={`shares-v2-card__favorite${isFavorite ? ' is-active' : ''}`}
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? t('auctionRemoveFavorite') : t('propertyDetailAddToFavorites')}
            aria-pressed={isFavorite}
          >
            <Heart size={18} strokeWidth={2} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : null}
        <BuyerStatusRibbon listingState={investmentState} />
      </div>

      <div className="shares-v2-card__body">
        <div className="shares-v2-card__meta">
          <h3 className="shares-v2-card__title">{cardShare.title || t('sharesCardTitleFallback')}</h3>
          {locationLabel ? (
            <p className="shares-v2-card__location">
              <MapPin size={13} strokeWidth={2.2} aria-hidden />
              <span>{locationLabel}</span>
            </p>
          ) : (
            <p className="shares-v2-card__location shares-v2-card__location--empty" aria-hidden />
          )}

          {cardSpecs.length ? (
            <div className={`shares-v2-card__specs shares-v2-card__specs--${cardSpecs.length}`}>
              {cardSpecs.map((spec) => (
                <div key={spec.key} className="shares-v2-card__spec">
                  <span className="shares-v2-card__spec-icon" aria-hidden>
                    {spec.icon}
                  </span>
                  <span className="shares-v2-card__spec-value">{spec.value}</span>
                  <span className="shares-v2-card__spec-label">{spec.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="shares-v2-card__footer">
          {showSoldPresentation ? (
            <button
              type="button"
              className="shares-v2-card__sold-cta"
              onClick={handleOpen}
            >
              <span className="shares-v2-card__sold-cta-copy">
                <span className="shares-v2-card__sold-cta-label">{investmentState.ctaLabel}</span>
                <span className="shares-v2-card__sold-cta-open">{t('buyerCabinet_openProperty')}</span>
              </span>
              <ArrowUpRight size={17} aria-hidden />
            </button>
          ) : (
            <div className="shares-v2-card__actions shares-v2-card__actions--single">
              <button
                type="button"
                className={`shares-v2-card__btn shares-v2-card__btn--primary shares-v2-card__invest-btn${
                  investmentState.blocksInvestment ? ' is-disabled' : ''
                }`}
                onClick={handleOpen}
                aria-disabled={investmentState.blocksInvestment || undefined}
              >
                <span className="shares-v2-card__btn-text">{investmentState.ctaLabel}</span>
                <ArrowUpRight className="shares-v2-card__btn-arrow" size={15} aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </a>
  )
}

export function SharesPropertyCardSkeleton({ viewMode = 'grid' }) {
  return (
    <article className={`shares-v2-card shares-v2-card--skeleton shares-v2-card--${viewMode}`} aria-hidden>
      <div className="shares-v2-card__media shares-v2-card__shimmer" />
      <div className="shares-v2-card__body">
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-line shares-v2-card__shimmer-line--title" />
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-line shares-v2-card__shimmer-line--loc" />
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-block shares-v2-card__shimmer-block--specs" />
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-footer" />
      </div>
    </article>
  )
}

export default SharesPropertyCard
