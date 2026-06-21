import { useTranslation } from 'react-i18next'
import { publicAsset } from '../utils/publicAsset'
import './PropertyDetailYieldPromo.css'

const YIELD_PROMO_HOUSE_IMAGE = publicAsset('images/owner-ads/ad-premium-house.png')

export default function PropertyDetailYieldPromo({ onClick, className = '', variant = 'default' }) {
  const { t } = useTranslation()
  const isDesktopAuction = variant === 'desktop-auction'

  return (
    <button
      type="button"
      className={`property-detail-yield-promo property-detail-yield-promo--banner${
        isDesktopAuction ? ' property-detail-yield-promo--desktop-auction' : ''
      }${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      <span className="property-detail-yield-promo__grid" aria-hidden />
      <span className="property-detail-yield-promo__copy">
        <span className="property-detail-yield-promo__title">
          {t('propertyDetailCalculateYield')}
        </span>
        <span className="property-detail-yield-promo__lead">
          {t('propertyDetailCalculateYieldLead')}
        </span>
        <span className="property-detail-yield-promo__cta">
          {t('propertyDetailCalculateYieldCta')}
        </span>
      </span>
      <span className="property-detail-yield-promo__media" aria-hidden>
        <span className="property-detail-yield-promo__halo" />
        <img
          className="property-detail-yield-promo__photo"
          src={YIELD_PROMO_HOUSE_IMAGE}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </span>
    </button>
  )
}
