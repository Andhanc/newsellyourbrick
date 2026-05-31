import { FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import PropertyYieldPromoIllustration from './PropertyYieldPromoIllustration'
import './PropertyDetailYieldPromo.css'

export default function PropertyDetailYieldPromo({ onClick, className = '', variant = 'default' }) {
  const { t } = useTranslation()

  if (variant === 'desktop-auction') {
    return (
      <button
        type="button"
        className={`property-detail-yield-promo property-detail-yield-promo--desktop-auction${
          className ? ` ${className}` : ''
        }`}
        onClick={onClick}
      >
        <span className="property-detail-yield-promo__desktop-bg" aria-hidden />
        <span className="property-detail-yield-promo__desktop-grid" aria-hidden />
        <span className="property-detail-yield-promo__desktop-body">
          <span className="property-detail-yield-promo__desktop-copy">
            <span className="property-detail-yield-promo__desktop-badge">
              {t('propertyDetailCalculateYieldBadge')}
            </span>
            <span className="property-detail-yield-promo__desktop-title">
              {t('propertyDetailCalculateYield')}
            </span>
            <span className="property-detail-yield-promo__desktop-lead">
              {t('propertyDetailCalculateYieldLead')}
            </span>
            <span className="property-detail-yield-promo__desktop-cta">
              {t('propertyDetailCalculateYieldCta')}
              <FiArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </span>
          </span>
          <span className="property-detail-yield-promo__desktop-visual" aria-hidden>
            <PropertyYieldPromoIllustration className="property-detail-yield-promo__illustration" />
          </span>
        </span>
      </button>
    )
  }

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
