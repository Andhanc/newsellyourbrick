import { useTranslation } from 'react-i18next'
import TestDriveSection from './TestDriveSection'
import './PropertyDetailTestDrivePromo.css'

export default function PropertyDetailTestDrivePromo({
  propertyId,
  propertyTable,
  hasTestDrive = true,
  i18nLang,
  className = '',
  imageUrl = '',
}) {
  const { t } = useTranslation()
  const promoPhoto = typeof imageUrl === 'string' ? imageUrl.trim() : ''

  return (
    <section
      className={`property-detail-test-drive-promo${className ? ` ${className}` : ''}`}
      aria-labelledby="property-test-drive-promo-title"
    >
      <div
        className={`property-detail-test-drive-promo__banner${
          promoPhoto ? '' : ' property-detail-test-drive-promo__banner--no-photo'
        }`}
      >
        <span className="property-detail-test-drive-promo__grid" aria-hidden />
        <div className="property-detail-test-drive-promo__copy">
          <span className="property-detail-test-drive-promo__eyebrow">{t('testDrive')}</span>
          <h3 id="property-test-drive-promo-title" className="property-detail-test-drive-promo__title">
            {t('propertyDetailTestDriveHeadline')}
          </h3>
          <p className="property-detail-test-drive-promo__lead">{t('testDrivePromoDrawerLead')}</p>
          <span className="property-detail-test-drive-promo__badge">{t('propertyDetailTestDriveDaysBadge')}</span>
        </div>
        {promoPhoto ? (
          <span className="property-detail-test-drive-promo__media" aria-hidden>
            <span className="property-detail-test-drive-promo__photo-frame">
              <img
                className="property-detail-test-drive-promo__photo"
                src={promoPhoto}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </span>
          </span>
        ) : null}
      </div>

      <div className="property-detail-test-drive-promo__actions">
        <TestDriveSection
          propertyId={propertyId}
          propertyTable={propertyTable}
          hasTestDrive={hasTestDrive}
          i18nLang={i18nLang}
          layout="promo"
        />
      </div>
    </section>
  )
}
