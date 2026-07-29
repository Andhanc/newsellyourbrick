import { useTranslation } from 'react-i18next'
import { getResolvedAmenityLabels } from '../../utils/tzAmenityLabels'

export default function PropertyDetailInfoSection({
  displayProperty,
  property = null,
  hideAmenities = false,
  amenitiesOnly = false,
}) {
  const { t } = useTranslation()
  const sourceProperty = property || displayProperty

  if (!displayProperty) return null

  const renderDetailedFields = () => {
    if (displayProperty.property_type === 'house' || displayProperty.property_type === 'villa') {
      return (
        <>
          {displayProperty.land_area != null &&
            displayProperty.land_area !== '' &&
            Number(displayProperty.land_area) > 0 && (
              <div className="property-detail-info-item property-detail-info-item--horizontal">
                <span className="property-detail-info-label">{t('addPropertyDetailsLandAreaLabel')}:</span>
                <span className="property-detail-info-value">{displayProperty.land_area} м²</span>
              </div>
            )}
          <div className="property-detail-info-item property-detail-info-item--horizontal">
            <span className="property-detail-info-label">{t('addPropertyDetailsAreaLabel')}:</span>
            <span className="property-detail-info-value">
              {displayProperty.area || displayProperty.sqft
                ? `${displayProperty.area || displayProperty.sqft} м²`
                : '—'}
            </span>
          </div>
          {displayProperty.living_area != null &&
            displayProperty.living_area !== '' &&
            Number(displayProperty.living_area) > 0 && (
              <div className="property-detail-info-item property-detail-info-item--horizontal">
                <span className="property-detail-info-label">{t('addPropertyDetailsLivingAreaLabel')}:</span>
                <span className="property-detail-info-value">{displayProperty.living_area} м²</span>
              </div>
            )}
          <div className="property-detail-info-item property-detail-info-item--horizontal">
            <span className="property-detail-info-label">{t('addPropertyDetailsBedroomsLabel')}:</span>
            <span className="property-detail-info-value">
              {displayProperty.bedrooms !== undefined && displayProperty.bedrooms !== null
                ? displayProperty.bedrooms
                : '—'}
            </span>
          </div>
          <div className="property-detail-info-item property-detail-info-item--horizontal">
            <span className="property-detail-info-label">{t('addPropertyDetailsBathroomsShortLabel')}:</span>
            <span className="property-detail-info-value">{displayProperty.bathrooms || '—'}</span>
          </div>
          <div className="property-detail-info-item property-detail-info-item--horizontal">
            <span className="property-detail-info-label">{t('addPropertyDetailsFloorsCountLabel')}:</span>
            <span className="property-detail-info-value">
              {displayProperty.total_floors !== undefined && displayProperty.total_floors !== null
                ? displayProperty.total_floors
                : '—'}
            </span>
          </div>
          <div className="property-detail-info-item property-detail-info-item--horizontal">
            <span className="property-detail-info-label">{t('addPropertyDetailsBuildingMaterialLabel')}:</span>
            <span className="property-detail-info-value">
              {displayProperty.building_type
                ? formatBuildingType(displayProperty.building_type, t)
                : '—'}
            </span>
          </div>
          <div className="property-detail-info-item property-detail-info-item--horizontal">
            <span className="property-detail-info-label">{t('addPropertyDetailsYearBuiltLabel')}:</span>
            <span className="property-detail-info-value">
              {displayProperty.year_built !== undefined && displayProperty.year_built !== null
                ? displayProperty.year_built
                : '—'}
            </span>
          </div>
        </>
      )
    }

    return (
      <>
        <div className="property-detail-info-item property-detail-info-item--horizontal">
          <span className="property-detail-info-label">{t('propertyDetailRoomsLabel')}:</span>
          <span className="property-detail-info-value">
            {displayProperty.rooms || displayProperty.beds || displayProperty.bedrooms || '—'}
          </span>
        </div>
        <div className="property-detail-info-item property-detail-info-item--horizontal">
          <span className="property-detail-info-label">{t('addPropertyDetailsAreaLabel')}:</span>
          <span className="property-detail-info-value">
            {displayProperty.area || displayProperty.sqft
              ? `${displayProperty.area || displayProperty.sqft} м²`
              : '—'}
          </span>
        </div>
        {displayProperty.living_area != null &&
          displayProperty.living_area !== '' &&
          Number(displayProperty.living_area) > 0 && (
            <div className="property-detail-info-item property-detail-info-item--horizontal">
              <span className="property-detail-info-label">{t('addPropertyDetailsLivingAreaLabel')}:</span>
              <span className="property-detail-info-value">{displayProperty.living_area} м²</span>
            </div>
          )}
        <div className="property-detail-info-item property-detail-info-item--horizontal">
          <span className="property-detail-info-label">{t('addPropertyDetailsBathroomsShortLabel')}:</span>
          <span className="property-detail-info-value">{displayProperty.bathrooms || '—'}</span>
        </div>
        <div className="property-detail-info-item property-detail-info-item--horizontal">
          <span className="property-detail-info-label">{t('propertyDetailFloorLabel')}:</span>
          <span className="property-detail-info-value">
            {displayProperty.floor !== undefined && displayProperty.floor !== null
              ? displayProperty.floor
              : '—'}
          </span>
        </div>
        <div className="property-detail-info-item property-detail-info-item--horizontal">
          <span className="property-detail-info-label">{t('propertyDetailTotalFloorsShort')}:</span>
          <span className="property-detail-info-value">
            {displayProperty.total_floors !== undefined && displayProperty.total_floors !== null
              ? displayProperty.total_floors
              : '—'}
          </span>
        </div>
        <div className="property-detail-info-item property-detail-info-item--horizontal">
          <span className="property-detail-info-label">{t('propertyDetailBuildingTypeShort')}:</span>
          <span className="property-detail-info-value">
            {displayProperty.building_type
              ? formatBuildingType(displayProperty.building_type, t)
              : '—'}
          </span>
        </div>
        <div className="property-detail-info-item property-detail-info-item--horizontal">
          <span className="property-detail-info-label">{t('addPropertyDetailsYearBuiltLabel')}:</span>
          <span className="property-detail-info-value">
            {displayProperty.year_built !== undefined && displayProperty.year_built !== null
              ? displayProperty.year_built
              : '—'}
          </span>
        </div>
      </>
    )
  }

  const renderAmenities = () => {
    const merged = {
      ...displayProperty,
      ...sourceProperty,
      amenities: sourceProperty?.amenities ?? displayProperty?.amenities,
      tz_amenities_json: sourceProperty?.tz_amenities_json ?? displayProperty?.tz_amenities_json,
    }
    const amenities = getResolvedAmenityLabels(merged)

    if (amenities.length === 0) {
      return (
        <span className="amenity-tag amenity-tag--empty">{t('propertyDetailAmenitiesNone')}</span>
      )
    }

    return amenities.map((amenity, index) => (
      <span key={index} className="amenity-tag">
        {amenity}
      </span>
    ))
  }

  const additionalInfo =
    displayProperty.additional_amenities ||
    sourceProperty?.additional_amenities ||
    sourceProperty?.additionalAmenities ||
    null
  const hasAdditionalInfo =
    additionalInfo !== null && additionalInfo !== undefined && String(additionalInfo).trim() !== ''

  if (amenitiesOnly) {
    return (
      <div className="property-detail-info-block">
        <h3 className="property-detail-info-block__title">{t('propertyDetailAmenitiesTitle')}</h3>
        <div className="property-detail-info-block__content property-detail-info-block__content--amenities">
          {renderAmenities()}
        </div>
      </div>
    )
  }

  return (
    <div className="property-detail-info-section">
      <div className="property-detail-info-block">
        <h3 className="property-detail-info-block__title">{t('addPropertyDetailsTitle')}</h3>
        <div className="property-detail-info-block__content property-detail-info-block__content--horizontal">
          {renderDetailedFields()}
        </div>
      </div>

      {!hideAmenities && (
        <div className="property-detail-info-block">
          <h3 className="property-detail-info-block__title">{t('propertyDetailAmenitiesTitle')}</h3>
          <div className="property-detail-info-block__content property-detail-info-block__content--amenities">
            {renderAmenities()}
          </div>
        </div>
      )}

      {hasAdditionalInfo && (
        <div className="property-detail-info-block">
          <h3 className="property-detail-info-block__title">{t('propertyDetailAdditionalAmenitiesTitle')}</h3>
          <div className="property-detail-info-block__content property-detail-info-block__content--text">
            <p>{String(additionalInfo)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function formatBuildingType(type, t) {
  const map = {
    monolithic: 'addPropertyDetailsBuildingMonolithic',
    brick: 'addPropertyDetailsBuildingBrick',
    panel: 'addPropertyDetailsBuildingPanel',
    block: 'addPropertyDetailsBuildingBlock',
    wood: 'addPropertyDetailsBuildingWood',
    frame: 'addPropertyDetailsBuildingFrame',
    aerated_concrete: 'addPropertyDetailsBuildingAerated',
    foam_concrete: 'addPropertyDetailsBuildingFoam',
    other: 'addPropertyDetailsBuildingOther',
  }
  const key = map[type]
  return key ? t(key) : type
}
