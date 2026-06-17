import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import maplibregl from 'maplibre-gl'
import { useTranslation } from 'react-i18next'
import {
  Bus,
  GraduationCap,
  HeartPulse,
  Loader2,
  ShoppingBag,
  Trees,
} from 'lucide-react'
import LocationMap from './LocationMap'
import {
  fetchNearbyPlaces,
  getMapPoiCategory,
  MAP_POI_CATEGORIES,
} from '../utils/mapNearbyPlaces'
import './PropertyDetailLocationMap.css'

const CATEGORY_ICONS = {
  schools: GraduationCap,
  transport: Bus,
  medical: HeartPulse,
  recreation: Trees,
  shops: ShoppingBag,
}

function buildCacheKey(lat, lng, categoryId) {
  return `${categoryId}:${lat.toFixed(4)}:${lng.toFixed(4)}`
}

function PoiMarkerIcon({ categoryId, color }) {
  const Icon = CATEGORY_ICONS[categoryId] || Trees
  return <Icon size={16} strokeWidth={2.2} aria-hidden color={color} />
}

export default function PropertyDetailLocationMap({
  center,
  zoom,
  marker,
  controlsLayout = 'column',
  interactive = false,
  filtersOutsideMap = false,
  mapFrame = null,
  allowFullscreen = true,
  mapStyle,
  markerColor,
  className = '',
}) {
  const { t } = useTranslation()
  const mapRef = useRef(null)
  const poiMarkersRef = useRef(new Map())
  const poiRootsRef = useRef(new Map())
  const poiCacheRef = useRef(new Map())
  const requestIdRef = useRef(0)

  const [mapReady, setMapReady] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)
  const [loadingCategory, setLoadingCategory] = useState(null)
  const [errorCategory, setErrorCategory] = useState(null)

  const coords = useMemo(() => {
    if (!Array.isArray(center) || center.length !== 2) return null
    const lat = parseFloat(center[0])
    const lng = parseFloat(center[1])
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { lat, lng }
  }, [center])

  const handleMapReady = useCallback((map) => {
    mapRef.current = map
    setMapReady(Boolean(map))
    if (map) {
      requestAnimationFrame(() => {
        try {
          map.resize()
        } catch {
          // ignore
        }
      })
      window.setTimeout(() => {
        try {
          map.resize()
        } catch {
          // ignore
        }
      }, 150)
    }
  }, [])

  const removeCategoryMarkers = useCallback((categoryId) => {
    const markers = poiMarkersRef.current.get(categoryId) || []
    markers.forEach((markerInstance) => markerInstance.remove())
    poiMarkersRef.current.delete(categoryId)

    const roots = poiRootsRef.current.get(categoryId) || []
    roots.forEach((root) => {
      queueMicrotask(() => root.unmount())
    })
    poiRootsRef.current.delete(categoryId)
  }, [])

  const clearAllCategoryMarkers = useCallback(() => {
    MAP_POI_CATEGORIES.forEach((category) => {
      removeCategoryMarkers(category.id)
    })
  }, [removeCategoryMarkers])

  const addCategoryMarkers = useCallback((categoryId, places) => {
    const map = mapRef.current
    if (!map) return false

    const category = getMapPoiCategory(categoryId)
    if (!category) return false

    removeCategoryMarkers(categoryId)

    if (!places?.length) {
      return true
    }

    const markers = []
    const roots = []

    places.forEach((place) => {
      const element = document.createElement('button')
      element.type = 'button'
      element.className = `location-map-poi-marker location-map-poi-marker--${categoryId}`
      element.style.setProperty('--poi-color', category.color)
      element.style.setProperty('--poi-soft', category.softColor)
      element.style.setProperty('--poi-border', category.borderColor)
      element.setAttribute('aria-label', place.name)

      const iconHost = document.createElement('span')
      iconHost.className = 'location-map-poi-marker__icon'
      element.appendChild(iconHost)

      const root = createRoot(iconHost)
      root.render(<PoiMarkerIcon categoryId={categoryId} color={category.color} />)
      roots.push(root)

      const popup = new maplibregl.Popup({
        offset: 14,
        closeButton: false,
        className: 'location-map-poi-popup',
      })
      const popupContent = document.createElement('div')
      popupContent.textContent = place.name
      popup.setDOMContent(popupContent)

      const markerInstance = new maplibregl.Marker({
        element,
        anchor: 'center',
      })
        .setLngLat([place.lng, place.lat])
        .setPopup(popup)
        .addTo(map)

      element.addEventListener('click', (event) => {
        event.stopPropagation()
        markerInstance.togglePopup()
      })

      markers.push(markerInstance)
    })

    poiMarkersRef.current.set(categoryId, markers)
    poiRootsRef.current.set(categoryId, roots)
    return true
  }, [removeCategoryMarkers])

  const applyActiveCategoryMarkers = useCallback(() => {
    if (!mapReady || !activeCategory || !coords) return

    MAP_POI_CATEGORIES.forEach((category) => {
      if (category.id !== activeCategory) {
        removeCategoryMarkers(category.id)
      }
    })

    const cacheKey = buildCacheKey(coords.lat, coords.lng, activeCategory)
    if (!poiCacheRef.current.has(cacheKey)) return

    addCategoryMarkers(activeCategory, poiCacheRef.current.get(cacheKey))
  }, [activeCategory, addCategoryMarkers, coords, mapReady, removeCategoryMarkers])

  useEffect(() => {
    applyActiveCategoryMarkers()
  }, [applyActiveCategoryMarkers, loadingCategory])

  useEffect(() => {
    return () => {
      clearAllCategoryMarkers()
    }
  }, [clearAllCategoryMarkers])

  const selectCategory = async (categoryId) => {
    if (!interactive || !coords) return

    const isRetryAfterError = activeCategory === categoryId && errorCategory === categoryId
    setErrorCategory(null)

    if (activeCategory === categoryId && !isRetryAfterError) {
      requestIdRef.current += 1
      setActiveCategory(null)
      clearAllCategoryMarkers()
      return
    }

    requestIdRef.current += 1
    const requestId = requestIdRef.current

    if (!isRetryAfterError) {
      clearAllCategoryMarkers()
      setActiveCategory(categoryId)
    }

    const cacheKey = buildCacheKey(coords.lat, coords.lng, categoryId)
    if (poiCacheRef.current.has(cacheKey)) {
      setErrorCategory(null)
      applyActiveCategoryMarkers()
      return
    }

    setLoadingCategory(categoryId)
    try {
      const places = await fetchNearbyPlaces(coords.lat, coords.lng, categoryId)
      if (requestId !== requestIdRef.current) return
      poiCacheRef.current.set(cacheKey, places)
      setErrorCategory(null)
      applyActiveCategoryMarkers()
    } catch {
      if (requestId !== requestIdRef.current) return
      setErrorCategory(categoryId)
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingCategory(null)
      }
    }
  }

  const mapNode = (
    <div className="property-detail-location-map__map">
      <LocationMap
        center={center}
        zoom={zoom}
        marker={marker}
        controlsLayout={controlsLayout}
        onMapReady={handleMapReady}
        allowFullscreen={allowFullscreen}
        mapStyle={mapStyle}
        markerColor={markerColor}
      />
    </div>
  )

  const filtersNode =
    interactive && coords ? (
      <div className="property-detail-location-map__filters" role="group" aria-label={t('propertyDetailMapFilters')}>
        {MAP_POI_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category.id]
          const isActive = activeCategory === category.id
          const isLoading = loadingCategory === category.id
          const hasError = errorCategory === category.id

          return (
            <button
              key={category.id}
              type="button"
              className={`property-detail-location-map__filter property-detail-location-map__filter--${category.id}${
                isActive ? ' is-active' : ''
              }${hasError ? ' is-error' : ''}`}
              style={{
                '--filter-color': category.color,
                '--filter-soft': category.softColor,
                '--filter-border': category.borderColor,
              }}
              onClick={() => selectCategory(category.id)}
              disabled={Boolean(loadingCategory)}
              aria-pressed={isActive}
            >
              <span className="property-detail-location-map__filter-icon" aria-hidden>
                {isLoading ? (
                  <Loader2 size={16} className="property-detail-location-map__filter-spinner" />
                ) : (
                  <Icon size={14} strokeWidth={2.2} />
                )}
              </span>
              <span className="property-detail-location-map__filter-label">
                {t(category.labelKey)}
              </span>
            </button>
          )
        })}
      </div>
    ) : null

  if (filtersOutsideMap) {
    const framedMap =
      mapFrame === 'auction' ? (
        <div className="property-detail-auction-desktop-map__frame">
          <div className="property-detail-auction-desktop-map__map-wrap">{mapNode}</div>
        </div>
      ) : mapFrame === 'sidebar' ? (
        <div className="property-detail-sidebar__map-container">{mapNode}</div>
      ) : (
        mapNode
      )

    return (
      <div
        className={`property-detail-location-map property-detail-location-map--split${
          className ? ` ${className}` : ''
        }`}
      >
        {framedMap}
        {filtersNode}
      </div>
    )
  }

  return (
    <div className={`property-detail-location-map${className ? ` ${className}` : ''}`}>
      {mapNode}
      {filtersNode}
    </div>
  )
}
