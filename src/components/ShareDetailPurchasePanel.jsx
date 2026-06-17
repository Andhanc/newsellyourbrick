import { useTranslation } from 'react-i18next'
import { FiPlus } from 'react-icons/fi'
import { formatPropertyPrice } from '../utils/currency'
import './ShareDetailPurchasePanel.css'

export default function ShareDetailPurchasePanel({
  totalShares = 20,
  sharesSold = 0,
  myShares = 0,
  availableToBuy = 0,
  buyCount = 1,
  onBuyCountChange,
  pricePerShare = 0,
  currency = 'EUR',
  isSoldOut = false,
  isDbShare = false,
  onPurchase,
  variant = 'desktop',
}) {
  const { t, i18n } = useTranslation()

  const othersSold = Math.max(0, sharesSold - myShares)
  const previewMyShares = myShares + Math.min(buyCount, availableToBuy)
  const previewAvailable = Math.max(0, availableToBuy - buyCount)
  const previewSold = sharesSold + Math.min(buyCount, availableToBuy)

  const pctOthers = totalShares > 0 ? (othersSold / totalShares) * 100 : 0
  const pctMyShares = totalShares > 0 ? (previewMyShares / totalShares) * 100 : 0
  const pctAvailable = totalShares > 0 ? (previewAvailable / totalShares) * 100 : 0

  const formatPrice = (amount) =>
    formatPropertyPrice(amount, currency, {
      compact: variant === 'mobile',
      locale: i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US',
    })

  if (isSoldOut) {
    return (
      <div className={`share-purchase-panel share-purchase-panel--${variant} share-purchase-panel--sold-out`}>
        <div className="share-purchase-panel__sold-icon" aria-hidden>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h3 className="share-purchase-panel__sold-title">{t('shareDetailSoldOutTitle')}</h3>
        <p className="share-purchase-panel__sold-text">
          {t('shareDetailSoldOutText', { total: totalShares })}
        </p>
      </div>
    )
  }

  return (
    <div className={`share-purchase-panel share-purchase-panel--${variant}`}>
      <div className="share-purchase-panel__chart">
        <span className="share-purchase-panel__label">{t('shareDetailChartTitle')}</span>
        {buyCount > 0 && availableToBuy > 0 ? (
          <p className="share-purchase-panel__preview-hint">
            {t('shareDetailChartPreview', { count: buyCount })}
          </p>
        ) : null}
        <div className="share-purchase-panel__pie-wrap">
          <div
            className="share-purchase-panel__pie"
            style={{
              background: `conic-gradient(
                #5b6ee1 0% ${pctOthers}%,
                #0abab5 ${pctOthers}% ${pctOthers + pctMyShares}%,
                #dff7ff ${pctOthers + pctMyShares}% 100%
              )`,
            }}
            aria-hidden
          />
          <div className="share-purchase-panel__pie-center">
            <span className="share-purchase-panel__pie-value">
              {buyCount > 0 && availableToBuy > 0 ? previewSold : sharesSold}
            </span>
            <span className="share-purchase-panel__pie-of">{t('shareDetailPieOf', { total: totalShares })}</span>
            {buyCount > 0 && availableToBuy > 0 ? (
              <span className="share-purchase-panel__pie-after">{t('shareDetailPieAfterPurchase')}</span>
            ) : null}
          </div>
        </div>
        <ul className="share-purchase-panel__legend">
          <li className="share-purchase-panel__legend-item share-purchase-panel__legend-item--available">
            <span className="share-purchase-panel__legend-dot" />
            {t('shareDetailLegendAvailable')}:{' '}
            {buyCount > 0 && availableToBuy > 0 ? previewAvailable : availableToBuy}
          </li>
          <li className="share-purchase-panel__legend-item share-purchase-panel__legend-item--mine">
            <span className="share-purchase-panel__legend-dot" />
            {t('shareDetailLegendYours')}:{' '}
            {buyCount > 0 && availableToBuy > 0 ? previewMyShares : myShares}
          </li>
          {othersSold > 0 ? (
            <li className="share-purchase-panel__legend-item share-purchase-panel__legend-item--others">
              <span className="share-purchase-panel__legend-dot" />
              {t('shareDetailLegendOthers')}: {othersSold}
            </li>
          ) : null}
        </ul>
      </div>

      <div className="share-purchase-panel__buy">
        <span className="share-purchase-panel__label">{t('shareDetailBuyCountLabel')}</span>
        <div className="share-purchase-panel__stepper-row">
          <div className="share-purchase-panel__stepper">
            <button
              type="button"
              className="share-purchase-panel__stepper-btn"
              onClick={() => onBuyCountChange?.(Math.max(1, buyCount - 1))}
              disabled={buyCount <= 1}
              aria-label={t('shareDetailDecrease')}
            >
              −
            </button>
            <span className="share-purchase-panel__stepper-value">{buyCount}</span>
            <button
              type="button"
              className="share-purchase-panel__stepper-btn"
              onClick={() => onBuyCountChange?.(Math.min(availableToBuy, buyCount + 1))}
              disabled={buyCount >= availableToBuy}
              aria-label={t('shareDetailIncrease')}
            >
              +
            </button>
          </div>
          <div className="share-purchase-panel__total">
            <span className="share-purchase-panel__total-label">{t('shareDetailTotal')}</span>
            <span className="share-purchase-panel__total-value">
              {formatPrice(pricePerShare * buyCount)}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="share-purchase-panel__cta"
          onClick={onPurchase}
          disabled={availableToBuy <= 0}
        >
          <FiPlus size={20} aria-hidden />
          {buyCount > 1 ? t('shareDetailBuyShares', { count: buyCount }) : t('shareDetailBuyShare')}
        </button>
        {!isDbShare ? (
          <p className="share-purchase-panel__demo-hint">{t('shareDetailDemoHint')}</p>
        ) : null}
      </div>
    </div>
  )
}
