import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import TestDriveSection from './TestDriveSection'
import { publicAsset } from '../utils/publicAsset'
import './PropertyDetailTestDriveActionPromo.css'

export const PROPERTY_TEST_DRIVE_PROMO_IMAGE = publicAsset(
  'images/property-detail/test-drive-sunshine-desktop.webp',
)

export const PROPERTY_TEST_DRIVE_PROMO_MOBILE_IMAGE = publicAsset(
  'images/property-detail/test-drive-sunshine-mobile.webp',
)

const PropertyDetailTestDrivePromo = forwardRef(function PropertyDetailTestDrivePromo(
  {
    propertyId,
    propertySlug,
    propertyTable,
    propertyType,
    hasTestDrive = true,
    i18nLang,
    className = '',
    imageUrl = '',
    paused = false,
  },
  ref,
) {
  const { t } = useTranslation()
  const promoPhoto =
    (typeof imageUrl === 'string' && imageUrl.trim()) || PROPERTY_TEST_DRIVE_PROMO_IMAGE

  return (
    <section
      ref={ref}
      className={`property-detail-test-drive-promo${paused ? ' property-detail-test-drive-promo--paused' : ''}${className ? ` ${className}` : ''}`}
      aria-labelledby="property-test-drive-promo-title"
    >
      {paused ? (
        <div className="property-detail-test-drive-promo__paused" role="status">
          <span>{t('propertyDetailTestDrivePaused')}</span>
        </div>
      ) : null}

      <picture className="property-detail-test-drive-promo__art" aria-hidden="true">
        {!imageUrl ? <source media="(max-width: 760px)" srcSet={PROPERTY_TEST_DRIVE_PROMO_MOBILE_IMAGE} /> : null}
        <img
          className="property-detail-test-drive-promo__photo"
          src={promoPhoto}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </picture>

      <div className="property-detail-test-drive-promo__copy">
        <span className="property-detail-test-drive-promo__eyebrow">{t('testDrive')}</span>
        <h3 id="property-test-drive-promo-title" className="property-detail-test-drive-promo__title">
          {t('propertyDetailTestDriveHeadline')}
        </h3>
        <p className="property-detail-test-drive-promo__lead">
          {t('propertyDetailTestDrivePromoLead')}
        </p>
      </div>
      <div className="property-detail-test-drive-promo__actions">
        <TestDriveSection
          propertyId={propertyId}
          propertySlug={propertySlug}
          propertyTable={propertyTable}
          propertyType={propertyType}
          hasTestDrive={hasTestDrive}
          i18nLang={i18nLang}
          layout="promo"
          paused={paused}
        />
      </div>
    </section>
  )
})

export default PropertyDetailTestDrivePromo
