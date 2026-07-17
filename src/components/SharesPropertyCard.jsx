import { ArrowUpRight, Heart, MapPin } from 'lucide-react'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import { publicAsset } from '../utils/publicAsset'
import BuyerStatusRibbon from './buyer-mobile/BuyerStatusRibbon'
import {
  formatForecastYield,
  normalizeMarketplaceShare,
  resolveShareMarketplaceState,
} from '../utils/sharesMarketplacePresentation'
import './SharesPropertyCard.css'

const CARD_IMAGE_FALLBACK = publicAsset('images/co-investment/co-investment-card-fallback.png')

function formatMoney(value, currency = 'EUR') {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function SharesPropertyCard({
  share,
  viewMode = 'grid',
  isFavorite = false,
  onFavoriteToggle,
  onInvest,
}) {
  const cardShare = normalizeMarketplaceShare(share)
  const investmentState = resolveShareMarketplaceState(cardShare)
  const forecast = formatForecastYield(cardShare.annualYield)
  const collectedPercent = Number.isFinite(cardShare.collectedPercent)
    ? cardShare.collectedPercent
    : null
  const availableLabel =
    Number.isFinite(cardShare.availableShares) && Number.isFinite(cardShare.totalShares)
      ? `${cardShare.availableShares} из ${cardShare.totalShares}`
      : '—'
  const locationLabel = cardShare.location || [cardShare.city, cardShare.country].filter(Boolean).join(', ')
  const usesFallbackImage = !cardShare.image
  const imageProps = buildResponsiveImageProps(cardShare.image || CARD_IMAGE_FALLBACK, {
    widths: [320, 480, 640],
    sizes: viewMode === 'list' ? '280px' : '(max-width: 768px) 50vw, 25vw',
    quality: 76,
    fit: 'crop',
  })
  const handleFavoriteClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onFavoriteToggle?.(share, event)
  }

  const handleOpen = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!investmentState.blocksInvestment) onInvest?.(share)
  }

  const handleImageError = (event) => {
    const image = event.currentTarget
    if (image.getAttribute('src') === CARD_IMAGE_FALLBACK) return
    image.onerror = null
    image.removeAttribute('srcset')
    image.src = CARD_IMAGE_FALLBACK
    image.alt = 'Нейтральный архитектурный визуал — фотография объекта проверяется'
  }

  return (
    <article
      className={`shares-v2-card shares-v2-card--${viewMode} shares-v2-card--${investmentState.state}`}
    >
      <div className="shares-v2-card__media">
        <img
          {...imageProps}
          alt={
            usesFallbackImage
              ? 'Нейтральный архитектурный визуал — фотография объекта проверяется'
              : cardShare.title || 'Объект долевой недвижимости'
          }
          className="shares-v2-card__image"
          onError={handleImageError}
        />
        <span className="shares-v2-card__badge">{cardShare.statusLabel}</span>
        <button
          type="button"
          className={`shares-v2-card__favorite${isFavorite ? ' is-active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          aria-pressed={isFavorite}
        >
          <Heart size={19} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
        </button>
        <BuyerStatusRibbon listingState={investmentState} />
      </div>

      <div className="shares-v2-card__body">
        <div className="shares-v2-card__heading">
          <h2 className="shares-v2-card__title">{cardShare.title || 'Название уточняется'}</h2>
          {locationLabel ? (
            <p className="shares-v2-card__location">
              <MapPin size={13} aria-hidden />
              <span>{locationLabel}</span>
            </p>
          ) : null}
        </div>

        <div className="shares-v2-card__metrics">
          <div className="shares-v2-card__metric shares-v2-card__metric--entry">
            <span className="shares-v2-card__metric-label">Минимальный вход</span>
            <strong className="shares-v2-card__metric-value">
              {formatMoney(cardShare.pricePerShare, cardShare.currency)}
            </strong>
          </div>
          <div className="shares-v2-card__metric shares-v2-card__metric--forecast">
            <span className="shares-v2-card__metric-label">Прогноз доходности</span>
            <strong className="shares-v2-card__metric-value">{forecast.value}</strong>
            <small>{forecast.note}</small>
          </div>
        </div>

        <div className="shares-v2-card__progress-head">
          <span className="shares-v2-card__progress-label">Доступно долей</span>
          <strong className="shares-v2-card__progress-percent">{availableLabel}</strong>
        </div>
        <div
          className={`shares-v2-card__progress-track${collectedPercent == null ? ' is-unknown' : ''}`}
          role="progressbar"
          aria-label="Собрано долей"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={collectedPercent ?? undefined}
          aria-valuetext={collectedPercent == null ? 'Данные уточняются' : `${collectedPercent}%`}
        >
          <div
            className="shares-v2-card__progress-fill"
            style={{ width: `${collectedPercent ?? 0}%` }}
          />
        </div>
        <div className="shares-v2-card__progress-note">
          <span>Собрано</span>
          <strong>{collectedPercent == null ? '—' : `${collectedPercent}%`}</strong>
        </div>

        <button
          type="button"
          className={`shares-v2-card__invest-btn${investmentState.blocksInvestment ? ' is-disabled' : ''}`}
          onClick={handleOpen}
          disabled={investmentState.blocksInvestment}
        >
          <span>{investmentState.ctaLabel}</span>
          <ArrowUpRight size={17} aria-hidden />
        </button>
      </div>
    </article>
  )
}

export function SharesPropertyCardSkeleton({ viewMode = 'grid' }) {
  return (
    <article className={`shares-v2-card shares-v2-card--skeleton shares-v2-card--${viewMode}`} aria-hidden>
      <div className="shares-v2-card__media shares-v2-card__shimmer" />
      <div className="shares-v2-card__body">
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-line shares-v2-card__shimmer-line--title" />
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-line shares-v2-card__shimmer-line--loc" />
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-block" />
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-line shares-v2-card__shimmer-line--bar" />
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-footer" />
      </div>
    </article>
  )
}

export default SharesPropertyCard
