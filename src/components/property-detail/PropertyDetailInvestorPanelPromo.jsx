import { forwardRef } from 'react'
import { FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import PropertyDetailInvestorPanelIllustration from './PropertyDetailInvestorPanelIllustration'
import './PropertyDetailInvestorPanelPromo.css'

const PropertyDetailInvestorPanelPromo = forwardRef(function PropertyDetailInvestorPanelPromo(
  { onClick, className = '', matchTestDriveHeight = false },
  ref,
) {
  const { t } = useTranslation()

  return (
    <section
      ref={ref}
      className={[
        'pdx-investor-promo',
        matchTestDriveHeight ? 'pdx-investor-promo--match-test-drive' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="pdx-investor-promo-title"
    >
      <div className="pdx-investor-promo__hero">
        <div className="pdx-investor-promo__preview">
          <PropertyDetailInvestorPanelIllustration className="pdx-investor-promo__illustration" />
        </div>
      </div>

      <div className="pdx-investor-promo__body">
        <h3 id="pdx-investor-promo-title" className="pdx-investor-promo__title">
          {t('propertyDetailInvestorPromoTitle')}
        </h3>
        <p className="pdx-investor-promo__lead">{t('propertyDetailInvestorPromoLead')}</p>
        <button type="button" className="pdx-investor-promo__cta" onClick={onClick}>
          {t('propertyDetailInvestorPromoCta')}
          <FiArrowRight size={15} aria-hidden />
        </button>
      </div>
    </section>
  )
})

export default PropertyDetailInvestorPanelPromo
