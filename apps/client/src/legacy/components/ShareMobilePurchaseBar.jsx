import { useTranslation } from 'react-i18next'
import './ShareMobilePurchaseBar.css'

export default function ShareMobilePurchaseBar({ config }) {
  const { t } = useTranslation()
  const {
    availableToBuy = 0,
    buyCount = 1,
    onBuyCountChange,
    isSoldOut = false,
    onPurchase,
    formatStickyTotal,
  } = config || {}

  if (isSoldOut || availableToBuy <= 0) {
    return (
      <div className="property-detail-mobile-bottom-bar share-mobile-purchase-bar share-mobile-purchase-bar--sold-out">
        <strong>{t('shareDetailSoldOutTitle')}</strong>
        <span>{t('shareDetailSoldOutText', { total: config?.totalShares || 0 })}</span>
      </div>
    )
  }

  return (
    <div className="property-detail-mobile-bottom-bar share-mobile-purchase-bar">
      <div className="share-mobile-purchase-bar__summary">
        <div className="share-mobile-purchase-bar__quantity">
          <span className="share-mobile-purchase-bar__label">{t('shareDetailBuyCountLabel')}</span>
          <div className="share-mobile-purchase-bar__stepper">
            <button
              type="button"
              onClick={() => onBuyCountChange?.(Math.max(1, buyCount - 1))}
              disabled={buyCount <= 1}
              aria-label={t('shareDetailDecrease')}
            >
              −
            </button>
            <strong aria-live="polite">{buyCount}</strong>
            <button
              type="button"
              onClick={() => onBuyCountChange?.(Math.min(availableToBuy, buyCount + 1))}
              disabled={buyCount >= availableToBuy}
              aria-label={t('shareDetailIncrease')}
            >
              +
            </button>
          </div>
        </div>

        <div className="share-mobile-purchase-bar__total">
          <span>{t('shareDetailTotal')}</span>
          <strong>{formatStickyTotal?.() ?? ''}</strong>
        </div>
      </div>

      <button type="button" className="share-mobile-purchase-bar__cta" onClick={onPurchase}>
        {buyCount > 1
          ? t('shareDetailBuyShares', { count: buyCount })
          : t('shareDetailBuyShare')}
      </button>
    </div>
  )
}
