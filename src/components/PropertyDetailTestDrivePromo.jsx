import { useTranslation } from 'react-i18next'
import TestDriveSection from './TestDriveSection'
import { publicAsset } from '../utils/publicAsset'
import './PropertyDetailTestDrivePromo.css'

export const PROPERTY_TEST_DRIVE_PROMO_IMAGE = publicAsset(
  'images/property-detail/desktop-test-drive.png',
)

export default function PropertyDetailTestDrivePromo({
  propertyId,
  propertyTable,
  hasTestDrive = true,
  i18nLang,
  className = '',
  imageUrl = '',
  paused = false,
}) {
  const { t } = useTranslation()
  const promoPhoto =
    (typeof imageUrl === 'string' && imageUrl.trim()) || PROPERTY_TEST_DRIVE_PROMO_IMAGE

  return (
    <section
      className={`property-detail-test-drive-promo${paused ? ' property-detail-test-drive-promo--paused' : ''}${className ? ` ${className}` : ''}`}
      aria-labelledby="property-test-drive-promo-title"
    >
      <div
        className={`property-detail-test-drive-promo__banner${
          promoPhoto ? '' : ' property-detail-test-drive-promo__banner--no-photo'
        }`}
      >
        {promoPhoto ? (
          <img
            className="property-detail-test-drive-promo__photo"
            src={promoPhoto}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <span className="property-detail-test-drive-promo__veil" aria-hidden />
        {paused ? (
          <div className="property-detail-test-drive-promo__paused" role="status">
            <span>{t('propertyDetailTestDrivePaused')}</span>
          </div>
        ) : null}

        <div className="property-detail-test-drive-promo__copy">
          <div className="property-detail-test-drive-promo__kicker">
            <span className="property-detail-test-drive-promo__eyebrow">{t('testDrive')}</span>
            <span className="property-detail-test-drive-promo__dot" aria-hidden />
            <span className="property-detail-test-drive-promo__meta">
              {t('propertyDetailTestDriveDaysBadge')}
            </span>
          </div>
          <h3 id="property-test-drive-promo-title" className="property-detail-test-drive-promo__title">
            {t('propertyDetailTestDriveHeadline')}
          </h3>
          <p className="property-detail-test-drive-promo__lead">
            {t('propertyDetailTestDrivePromoLead')}
          </p>
          <div className="property-detail-test-drive-promo__actions">
            <TestDriveSection
              propertyId={propertyId}
              propertyTable={propertyTable}
              hasTestDrive={hasTestDrive}
              i18nLang={i18nLang}
              layout="promo"
              paused={paused}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
