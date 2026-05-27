import { useTranslation } from 'react-i18next'
import PropertyYieldPromoIllustration from './PropertyYieldPromoIllustration'
import './PropertyDetailYieldPromo.css'

export default function PropertyDetailYieldPromo({ onClick, className = '' }) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      className={`property-detail-yield-promo${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      <span className="property-detail-yield-promo__shine" aria-hidden />
      <span className="property-detail-yield-promo__content">
        <span className="property-detail-yield-promo__title">
          {t('propertyDetailCalculateYield')}
        </span>
      </span>
      <span className="property-detail-yield-promo__icon-wrap" aria-hidden>
        <PropertyYieldPromoIllustration className="property-detail-yield-promo__illustration" />
      </span>
    </button>
  )
}
