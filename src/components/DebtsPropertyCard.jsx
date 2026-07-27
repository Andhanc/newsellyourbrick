import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { formatPropertyPrice } from '../utils/currency'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import ImageWithSkeleton from './ImageWithSkeleton'
import { getPropertyCardImage, PROPERTY_CARD_IMAGE_FALLBACK } from '../utils/propertyImage'
import { getEffectiveAuctionEndTime } from '../utils/auctionReminderBounds'
import ListingCardAuctionTimer from './ListingCardAuctionTimer'
import {
  getDebtRiskLabelKey,
  getDebtRiskTone,
  getDebtsCardPresentation,
} from '../utils/debtsCardPresentation'
import { getPropertyDetailPath } from '../utils/propertyDetailUrl'
import './DebtsPropertyCard.css'

function DebtsPropertyCard({
  property,
  isFavorite = false,
  onFavoriteToggle,
  onOpen,
  href,
}) {
  const { t, i18n } = useTranslation()

  const title = property.title || property.name || ''
  const image = getPropertyCardImage(property, PROPERTY_CARD_IMAGE_FALLBACK)
  const imageProps = buildResponsiveImageProps(image, {
    widths: [320, 480, 640, 800],
    sizes: '(max-width: 1200px) 50vw, 33vw',
    quality: 72,
    fit: 'crop',
  })

  const tone = getDebtRiskTone(property.debt_severity)
  const riskLabelKey = getDebtRiskLabelKey(property.debt_severity)
  const currency = property.currency || 'EUR'
  const isReserved = property.is_reserved === true || property.is_reserved === 1
  const auctionEndTime = getEffectiveAuctionEndTime(property)
  const showAuctionTimer = property.isAuction === true && auctionEndTime

  const presentation = useMemo(() => getDebtsCardPresentation(property), [property])

  const formatMoney = (amount) =>
    formatPropertyPrice(amount, currency, {
      compact: false,
      locale: i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US',
    })

  const detailHref = href || (property ? getPropertyDetailPath(property) : '#')

  const handleOpen = (e) => {
    if (e?.target?.closest('button')) return
    if (!ensureCanOpenProperty()) return
    onOpen?.(property)
  }

  const handleFavorite = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onFavoriteToggle?.(property, e)
  }

  const handleAction = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!ensureCanOpenProperty()) return
    onOpen?.(property)
  }

  const auctionTimerSlot =
    showAuctionTimer ? (
      <ListingCardAuctionTimer
        endTime={auctionEndTime}
        endedLabel={t('propertyDetailAuctionCompleted')}
      />
    ) : null

  return (
    <a
      href={detailHref}
      className={`debts-property-card debts-property-card--link${isReserved ? ' debts-property-card--reserved' : ''}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return
        if (e.target.closest('button')) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        handleOpen(e)
      }}
    >
      <div className="debts-property-card__media">
        <span className={`debts-property-card__risk debts-property-card__risk--${tone}`}>
          {t(riskLabelKey)}
        </span>
        <button
          type="button"
          className={`debts-property-card__favorite${isFavorite ? ' is-active' : ''}`}
          onClick={handleFavorite}
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
        <ImageWithSkeleton
          imgProps={imageProps}
          fallbackSrc={PROPERTY_CARD_IMAGE_FALLBACK}
          alt={title}
          className="debts-property-card__image"
          containerClassName="debts-property-card__image-wrap"
        />
      </div>

      {auctionTimerSlot}

      <div className="debts-property-card__body">
        <h3 className="debts-property-card__title">{title}</h3>
        {property.location ? (
          <p className="debts-property-card__location">
            <MapPin size={14} aria-hidden />
            <span>{property.location}</span>
          </p>
        ) : null}

        <div className="debts-property-card__pricing debts-property-card__pricing--grid">
          {presentation.metrics.map((metric) => (
            <div key={metric.id} className="debts-property-card__price-row">
              <span className="debts-property-card__price-label">{t(metric.labelKey)}</span>
              <span
                className={`debts-property-card__price-value${
                  metric.amount == null ? ' debts-property-card__price-value--empty' : ''
                }`}
              >
                {metric.amount != null ? formatMoney(metric.amount) : '—'}
              </span>
            </div>
          ))}
        </div>

        {presentation.actions.length > 0 ? (
          <div
            className="debts-property-card__actions property-actions"
            onClick={(e) => e.stopPropagation()}
          >
            {presentation.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={
                  action.variant === 'primary'
                    ? 'debts-property-card__btn btn btn-primary btn-liquid-glass'
                    : `debts-property-card__btn debts-property-card__btn--${action.variant}`
                }
                onClick={handleAction}
                disabled={isReserved}
              >
                {isReserved ? t('objectReserved') : t(action.labelKey)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </a>
  )
}

export function DebtsPropertyCardSkeleton() {
  return (
    <article className="debts-property-card debts-property-card--skeleton" aria-hidden>
      <div className="debts-property-card__media debts-property-card__shimmer" />
      <div className="listing-card-auction-timer debts-property-card__shimmer" />
      <div className="debts-property-card__body">
        <div className="debts-property-card__shimmer debts-property-card__shimmer--title" />
        <div className="debts-property-card__shimmer debts-property-card__shimmer--line" />
        <div className="debts-property-card__shimmer debts-property-card__shimmer--price debts-property-card__pricing--grid">
          <div className="debts-property-card__shimmer debts-property-card__shimmer--metric" />
          <div className="debts-property-card__shimmer debts-property-card__shimmer--metric" />
        </div>
        <div className="debts-property-card__shimmer debts-property-card__shimmer--btn" />
      </div>
    </article>
  )
}

export default DebtsPropertyCard
