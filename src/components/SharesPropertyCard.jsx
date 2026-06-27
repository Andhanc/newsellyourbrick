import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import {
  getCollectedAmount,
  getCollectedPercent,
  formatShareOwnershipPercent,
  getShareBadgeType,
  getShareLocationLabel,
} from '../utils/sharesListing'
import { getSharePricePerShare, isShareSoldOut } from '../utils/sharesPageFilters'
import { getCoInvestmentDetailPath } from '../utils/sectionRoutes'
import { formatPropertyPrice } from '../utils/currency'
import './SharesPropertyCard.css'

const BADGE_LABEL_KEYS = {
  stable: 'sharesBadgeStable',
  new: 'sharesBadgeNew',
  commercial: 'sharesBadgeCommercial',
}

function SharesPropertyCard({
  share,
  viewMode = 'grid',
  isFavorite = false,
  onFavoriteToggle,
  onInvest,
  href,
  imageFallback,
}) {
  const { t, i18n } = useTranslation()
  const badgeType = getShareBadgeType(share)
  const badgeLabelKey = BADGE_LABEL_KEYS[badgeType] ?? BADGE_LABEL_KEYS.stable
  const locationLabel = getShareLocationLabel(share)
  const soldOut = isShareSoldOut(share)
  const collectedPercent = getCollectedPercent(share)
  const collectedAmount = getCollectedAmount(share)
  const totalPrice = Number(share.totalPrice) || 0
  const currency = share.currency || 'EUR'
  const ownershipPercent = formatShareOwnershipPercent(share, i18n.language)
  const minInvestment = getSharePricePerShare(share)

  const image = share.image || imageFallback
  const imageProps = buildResponsiveImageProps(image, {
    widths: [320, 480, 640],
    sizes: viewMode === 'list' ? '280px' : '(max-width: 768px) 50vw, 25vw',
    quality: 72,
    fit: 'crop',
  })

  const formatMoney = (amount) =>
    formatPropertyPrice(amount, currency, {
      compact: false,
      locale: i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US',
    })

  const handleFavoriteClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onFavoriteToggle?.(share, e)
  }

  const handleInvestClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!soldOut) onInvest?.(share)
  }

  const detailHref = href || (share ? getCoInvestmentDetailPath(share) : '#')

  return (
    <a
      href={detailHref}
      className={`shares-v2-card shares-v2-card--${viewMode}${soldOut ? ' shares-v2-card--sold-out' : ''}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return
        if (e.target.closest('button')) {
          e.preventDefault()
          return
        }
        if (soldOut) {
          e.preventDefault()
          return
        }
        if (!onInvest) return
        e.preventDefault()
        onInvest(share)
      }}
    >
      <div className="shares-v2-card__media">
        <span className={`shares-v2-card__badge shares-v2-card__badge--${badgeType}`}>
          {t(badgeLabelKey)}
        </span>
        <button
          type="button"
          className={`shares-v2-card__favorite${isFavorite ? ' is-active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={t('favorites')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              stroke="currentColor"
              strokeWidth="2"
              fill={isFavorite ? 'currentColor' : 'none'}
            />
          </svg>
        </button>
        <img {...imageProps} alt={share.title} className="shares-v2-card__image" />
        {soldOut ? <div className="shares-v2-card__sold-overlay">{t('sharesSoldOut')}</div> : null}
      </div>

      <div className="shares-v2-card__body">
        <h2 className="shares-v2-card__title">{share.title}</h2>
        {locationLabel ? (
          <p className="shares-v2-card__location">
            <MapPin size={14} aria-hidden />
            <span>{locationLabel}</span>
          </p>
        ) : null}

        <div className="shares-v2-card__metrics">
          <div className="shares-v2-card__metric">
            <span className="shares-v2-card__metric-label">{t('sharesCardStake')}</span>
            <span className="shares-v2-card__metric-value">
              {ownershipPercent != null ? `${ownershipPercent}%` : '—'}
            </span>
          </div>
          <div className="shares-v2-card__metric">
            <span className="shares-v2-card__metric-label">
              <span className="shares-v2-card__metric-label--desktop">{t('sharesCardMinInvestment')}</span>
              <span className="shares-v2-card__metric-label--mobile">{t('sharesCardInvestment')}</span>
            </span>
            <span className="shares-v2-card__metric-value">
              {formatMoney(minInvestment)}
            </span>
          </div>
        </div>

        <div className="shares-v2-card__progress-head">
          <span className="shares-v2-card__progress-label">{t('sharesCardCollected')}</span>
          <span className="shares-v2-card__progress-percent">{collectedPercent}%</span>
        </div>
        <div className="shares-v2-card__progress-track" aria-hidden>
          <div
            className="shares-v2-card__progress-fill"
            style={{ width: `${collectedPercent}%` }}
          />
        </div>

        <div className="shares-v2-card__footer">
          <div className="shares-v2-card__amounts">
            <strong>{formatMoney(collectedAmount)}</strong>
            <span className="shares-v2-card__amounts-sep">/</span>
            <span>{formatMoney(totalPrice)}</span>
          </div>
          <button
            type="button"
            className="shares-v2-card__invest-btn"
            onClick={handleInvestClick}
            disabled={soldOut}
          >
            {soldOut ? t('sharesAllSold') : t('sharesCardInvest')}
          </button>
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
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-block" />
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-line shares-v2-card__shimmer-line--bar" />
        <div className="shares-v2-card__shimmer shares-v2-card__shimmer-footer" />
      </div>
    </article>
  )
}

export default SharesPropertyCard
