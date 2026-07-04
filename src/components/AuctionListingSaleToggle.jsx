import { useTranslation } from 'react-i18next'
import './AuctionListingSaleToggle.css'

function AuctionListingSaleToggle({ value = 'all', onChange }) {
  const { t } = useTranslation()

  return (
    <div
      className="auction-listing-sale-toggle"
      role="tablist"
      aria-label={t('auctionListingSaleToggleLabel')}
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'all'}
        className={`auction-listing-sale-toggle__btn${
          value === 'all' ? ' auction-listing-sale-toggle__btn--active' : ''
        }`}
        onClick={() => onChange?.('all')}
      >
        {t('auctionListingSaleAll')}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'buy_now'}
        className={`auction-listing-sale-toggle__btn${
          value === 'buy_now' ? ' auction-listing-sale-toggle__btn--active' : ''
        }`}
        onClick={() => onChange?.('buy_now')}
      >
        {t('auctionListingSaleBuyNow')}
      </button>
    </div>
  )
}

export default AuctionListingSaleToggle
