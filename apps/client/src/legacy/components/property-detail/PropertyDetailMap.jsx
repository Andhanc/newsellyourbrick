import { useTranslation } from 'react-i18next'
import PropertyDetailLocationMap from '../PropertyDetailLocationMap'
import { usePropertyMapCoordinates } from '../../hooks/usePropertyMapCoordinates'

export default function PropertyDetailMap({ property, className = '' }) {
  const { t } = useTranslation()
  const { finalCoordinates, hasRealMarker, isGeocoding } = usePropertyMapCoordinates(property)
  const locationLabel = property?.location || property?.address || t('location') || 'Местоположение'

  return (
    <div className={`property-detail-sidebar__map ${className}`.trim()}>
      <h2 className="property-detail-sidebar__map-title">{locationLabel}</h2>
      <div className="property-detail-sidebar__map-stack">
        {typeof window !== 'undefined' && (
          <>
            <PropertyDetailLocationMap
              center={finalCoordinates}
              zoom={hasRealMarker ? 15 : undefined}
              marker={hasRealMarker ? finalCoordinates : null}
              interactive={hasRealMarker}
              filtersOutsideMap
              mapFrame="sidebar"
              controlsLayout="column"
              allowFullscreen
            />
            {isGeocoding && (
              <div className="property-detail-map__geocoding-hint property-detail-sidebar__map-loading">
                Поиск местоположения...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
