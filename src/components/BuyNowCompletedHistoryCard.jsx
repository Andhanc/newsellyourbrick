import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import './WonPropertyCard.css'

/**
 * Завершённая покупка «Купить сейчас» в истории — визуально как выигранный аукцион
 * (карточка WonPropertyCard + стили завершённого аукциона).
 */
function BuyNowCompletedHistoryCard({
  row,
  formatPrice,
  formatDate,
  sharePurchaseImageSrc,
  placeholderSrc,
  purchaseTerms,
  onSellObject,
}) {
  const { t } = useTranslation()
  const b = row.billing || {}
  const pid = b.property_id
  const minSale = b.minimum_sale_price
  const paidStripe = (row.amount_cents || 0) / 100
  const walletEur = b.wallet_eur_applied || 0
  const totalPaid = b.total_paid_toward_price ?? paidStripe + walletEur
  const remaining = b.remaining_to_full_purchase ?? (minSale != null ? Math.max(0, minSale - totalPaid) : null)
  const cur = (row.currency || 'eur').toUpperCase()
  const tenPct = b.ten_percent
  const title =
    row.property_title ||
    (pid != null
      ? t('buyerHistory_propertyTitle', { id: pid })
      : t('buyerHistory_propertyTitle', { id: '—' }))
  const imgSrc = sharePurchaseImageSrc(row.property_image)

  return (
    <div className="won-property-card won-property-card--buy-now-completed">
      <div className="won-property-card__main">
        <div className="won-property-card__image-wrapper">
          <div className="won-property-card__image">
            <img
              src={imgSrc}
              alt=""
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = placeholderSrc
              }}
            />
            <div className="won-property-card__badge status-badge status-badge--completed-sale">
              {t('buyerHistory_reserveSoldBadge')}
            </div>
          </div>
        </div>
        <div className="won-property-card__info">
          <h3 className="won-property-card__title">{title}</h3>
          <p className="won-property-card__location">{t('buyerHistory_reserveBuyNowChannel')}</p>
          {purchaseTerms ? (
            <p className="won-property-card__terms">{purchaseTerms}</p>
          ) : null}
          {tenPct != null && (
            <p className="history-reservation-pay-summary won-property-card__buy-now-summary">
              {t('buyerHistory_reserveCompletedPayment', {
                ten: formatPrice(tenPct, cur),
                rest: remaining != null ? formatPrice(remaining, cur) : '—',
              })}
            </p>
          )}
          <div className="won-property-card__quick-info">
            <div className="quick-info__item">
              <span className="quick-info__label">{t('buyerHistory_minSale')}</span>
              <span className="quick-info__value price">
                {minSale != null ? formatPrice(minSale, cur) : '—'}
              </span>
            </div>
            <div className="quick-info__item">
              <span className="quick-info__label">{t('buyerHistory_totalPaid')}</span>
              <span className="quick-info__value price">
                {typeof totalPaid === 'number' ? formatPrice(totalPaid, cur) : '—'}
              </span>
            </div>
            <div className="quick-info__item">
              <span className="quick-info__label">{t('buyerHistory_date')}</span>
              <span className="quick-info__value">{formatDate(row.paid_at)}</span>
            </div>
          </div>
          {pid != null && (
            <Link
              to={`/property/${pid}`}
              className="won-property-card__link"
              onClick={(e) => {
                if (ensureCanOpenProperty()) return
                e.preventDefault()
              }}
            >
              {t('buyerWon_viewProperty')}
            </Link>
          )}
          {typeof onSellObject === 'function' ? (
            <button type="button" className="card-button card-button--secondary" onClick={onSellObject}>
              Продать объект
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default BuyNowCompletedHistoryCard
