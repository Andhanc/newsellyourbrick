import { FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { publicAsset } from '../utils/publicAsset'
import './PropertyDetailBuyNowPromo.css'

export const PROPERTY_BUY_NOW_PROMO_IMAGE = publicAsset(
  'images/property-detail/buy-now-action-3d.webp',
)

export default function PropertyDetailBuyNowPromo({ onOpen, className = '' }) {
  const { t } = useTranslation()

  return (
    <section
      className={`property-detail-buy-now-promo${className ? ` ${className}` : ''}`}
      aria-labelledby="property-detail-buy-now-promo-title"
    >
      <div className="property-detail-buy-now-promo__copy">
        <h3 id="property-detail-buy-now-promo-title" className="property-detail-buy-now-promo__title">
          {t('propertyDetailBuyNowPromoTitle')}
        </h3>
        <p className="property-detail-buy-now-promo__lead">
          {t('propertyDetailBuyNowPromoSubtitle')}
        </p>

        <button
          type="button"
          className="property-detail-buy-now-promo__cta"
          onClick={onOpen}
        >
          <span>{t('buyNowSectionTitle')}</span>
          <FiArrowRight size={20} strokeWidth={2.4} aria-hidden />
        </button>
      </div>

      <img
        className="property-detail-buy-now-promo__art"
        src={PROPERTY_BUY_NOW_PROMO_IMAGE}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </section>
  )
}
