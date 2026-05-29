import { useTranslation } from 'react-i18next'

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
    const featureLabelKeys = {
      feature1: 'addPropertyAmenityUndergroundParking',
      feature2: 'addPropertyAmenityRestaurant',
      feature3: 'addPropertyAmenitiesWashingMachine',
      feature4: 'addPropertyAmenityBarLounge',
      feature5: 'addPropertyAmenityAccessControl',
      feature6: 'addPropertyAmenityCctv',
      feature7: 'addPropertyAmenitiesLoggia',
      feature8: 'addPropertyAmenityStorageRoom',
      feature9: 'addPropertyAmenityRooftopTerrace',
      feature10: 'addPropertyAmenityRaisedFloor',
      feature11: 'addPropertyAmenityPrivateGarage',
      feature12: 'addPropertyAmenityEvCharging',
      feature13: 'addPropertyAmenityGym',
      feature14: 'addPropertyAmenitySauna',
      feature15: 'addPropertyAmenitySpa',
      feature16: 'addPropertyAmenityVideoIntercom',
      feature17: 'addPropertyAmenitySecurity247',
      feature18: 'addPropertyAmenitiesWardrobe',
      feature19: 'addPropertyAmenityFireplace',
      feature20: 'addPropertyAmenitySmartHome',
      feature21: 'addPropertyAmenitySolarPanels',
      feature22: 'addPropertyAmenityHvacSystem',
      feature23: 'addPropertyAmenityAirConditioning',
      feature24: 'addPropertyAmenityWaterConnected',
      feature25: 'addPropertyAmenityBackupGenerator',
      feature26: 'addPropertyAmenityFreightElevator',
    }
    const mainAmenityKeys = {
      balcony: 'addPropertyAmenitiesBalcony',
      parking: 'addPropertyAmenitiesParkingSpace',
      elevator: 'addPropertyAmenitiesElevator',
      garage: 'propertyDetailAmenityGarage',
      pool: 'addPropertyAmenityPool',
      garden: 'addPropertyAmenityGarden',
      electricity: 'addPropertyAmenityElectricityConnected',
      internet: 'addPropertyAmenityInternetConnected',
      security: 'addPropertyAmenitySecurity247',
      furniture: 'addPropertyAmenitiesBuiltInFurniture',
    }

    const amenities = []
    const amenitiesArray = sourceProperty?.amenities || displayProperty.amenities || []
    const isAmenitiesArray = Array.isArray(amenitiesArray)

    if (isAmenitiesArray && amenitiesArray.length > 0) {
      Object.entries(mainAmenityKeys).forEach(([key, labelKey]) => {
        if (amenitiesArray.includes(key)) amenities.push(t(labelKey))
      })
      for (let i = 1; i <= 26; i++) {
        const featureKey = `feature${i}`
        if (amenitiesArray.includes(featureKey) && featureLabelKeys[featureKey]) {
          amenities.push(t(featureLabelKeys[featureKey]))
        }
      }
    } else {
      Object.entries(mainAmenityKeys).forEach(([key, labelKey]) => {
        if (displayProperty[key] === true) amenities.push(t(labelKey))
      })
      for (let i = 1; i <= 26; i++) {
        const featureKey = `feature${i}`
        if (displayProperty[featureKey] === true && featureLabelKeys[featureKey]) {
          amenities.push(t(featureLabelKeys[featureKey]))
        }
      }
    }

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
