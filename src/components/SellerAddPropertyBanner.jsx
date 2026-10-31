import { useTranslation } from 'react-i18next'
import { useId } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { publicAsset } from '../utils/publicAsset'
import './SellerAddPropertyBanner.css'

export default function SellerAddPropertyBanner({ onClick, variant = 'profile', className = '' }) {
  const { t } = useTranslation()
  const titleId = useId()

  return (
    <button
      type="button"
      className={`seller-add-property-banner seller-add-property-banner--${variant}${className ? ` ${className}` : ''}`}
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-description`}
      onClick={onClick}
    >
      <span className="seller-add-property-banner__copy">
        <span id={titleId} className="seller-add-property-banner__title">{t('ownerTest_ariaAddProperty')}</span>
        <span id={`${titleId}-description`} className="seller-add-property-banner__description">{t('ownerTest_addPropertyBannerDescription')}</span>
        <span className="seller-add-property-banner__button" aria-hidden="true">
          {t('ownerTest_ariaAddProperty')}
          <ArrowUpRight size={18} strokeWidth={2.4} aria-hidden="true" />
        </span>
      </span>
      <span className="seller-add-property-banner__art-wrap" aria-hidden="true">
        <img
          className="seller-add-property-banner__art"
          src={publicAsset('images/owner-dashboard/add-property-tiffany-3d.webp')}
          alt=""
          width="640"
          height="640"
          draggable="false"
        />
      </span>
    </button>
  )
}
