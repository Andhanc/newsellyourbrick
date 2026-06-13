import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi'
import 'maplibre-gl/dist/maplibre-gl.css'
import './LocationMap.css'
import { SATELLITE_MAP_STYLE, SATELLITE_MAP_MAX_ZOOM, STREET_MAP_MAX_ZOOM } from '../utils/mapStyles'

const LocationMap = ({
  center,
  zoom = 10,
  marker,
  markerDraggable = false,
  onMarkerDragEnd,
  onMapReady,
  allowFullscreen = true,
  controlsLayout = 'default',
  mapStyle = SATELLITE_MAP_STYLE,
  markerColor = '#0ABAB5',
  maxZoom = null,
}) => {
  const containerRef = useRef(null)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const lastCenterRef = useRef(null)
  const lastZoomAppliedRef = useRef(null)
  const onMarkerDragEndRef = useRef(onMarkerDragEnd)
  const onMapReadyRef = useRef(onMapReady)
  const markerDraggableRef = useRef(markerDraggable)
  const markerColorRef = useRef(markerColor)
  const [isFullscreen, setIsFullscreen] = useState(false)

  onMarkerDragEndRef.current = onMarkerDragEnd
  onMapReadyRef.current = onMapReady
  markerDraggableRef.current = markerDraggable
  markerColorRef.current = markerColor

  const resolvedMaxZoom = maxZoom ?? (mapStyle === SATELLITE_MAP_STYLE ? SATELLITE_MAP_MAX_ZOOM : STREET_MAP_MAX_ZOOM)

  // Инициализация карты (без маркера — маркер в отдельном эффекте)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    let initialCenter = [20, 55]
    let initialZoom = 3

    if (Array.isArray(center) && center.length === 2) {
      const lat = parseFloat(center[0])
      const lng = parseFloat(center[1])
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const isDefaultView = Math.abs(lat - 55) < 1 && Math.abs(lng - 20) < 1
        initialCenter = [lng, lat]
        initialZoom = isDefaultView ? 3 : (zoom || 15)
      }
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: initialCenter,
      zoom: Math.min(initialZoom, resolvedMaxZoom),
      minZoom: 2,
      maxZoom: resolvedMaxZoom,
      attributionControl: false,
    })

    if (controlsLayout !== 'column') {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    }
    mapRef.current = map

    const notifyMapReady = () => {
      onMapReadyRef.current?.(map)
    }

    if (map.loaded()) {
      notifyMapReady()
    } else {
      map.once('load', notifyMapReady)
    }

    return () => {
      onMapReadyRef.current?.(null)
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
  }, [allowFullscreen, controlsLayout, mapStyle, resolvedMaxZoom])

  useEffect(() => {
    if (!allowFullscreen || typeof document === 'undefined') return undefined

    const getFullscreenElement = () => (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    )

    const handleFullscreenChange = () => {
      const fullscreenElement = getFullscreenElement()
      setIsFullscreen(fullscreenElement === containerRef.current)
      if (mapRef.current) {
        setTimeout(() => {
          try {
            mapRef.current?.resize()
          } catch {
            // ignore
          }
        }, 30)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [allowFullscreen])

  const toggleFullscreen = () => {
    if (!allowFullscreen || typeof document === 'undefined') return
    const element = containerRef.current
    if (!element) return

    const fullscreenElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement

    if (!fullscreenElement) {
      const requestFullscreen =
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.mozRequestFullScreen ||
        element.msRequestFullscreen
      requestFullscreen?.call(element)
      return
    }

    const exitFullscreen =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen
    exitFullscreen?.call(document)
  }

  useEffect(() => {
    if (!mapRef.current) return

    if (!Array.isArray(center) || center.length !== 2) {
      return
    }

    const lat = parseFloat(center[0])
    const lng = parseFloat(center[1])

    if (isNaN(lat) || isNaN(lng)) return
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return

    const lngLat = [lng, lat]
    const centerKey = `${lat.toFixed(4)}-${lng.toFixed(4)}`
    if (lastCenterRef.current === centerKey) {
      return
    }
    lastCenterRef.current = centerKey

    const applyCenter = () => {
      try {
        mapRef.current.setCenter(lngLat)
      } catch {
        // ignore
      }
    }

    if (!mapRef.current.loaded()) {
      mapRef.current.once('load', applyCenter)
      return
    }
    applyCenter()
  }, [center])

  useEffect(() => {
    if (!mapRef.current) return
    if (zoom === undefined || zoom === null) {
      lastZoomAppliedRef.current = null
      return
    }

    const applyZoom = () => {
      try {
        const z = Math.min(Number(zoom), resolvedMaxZoom)
        if (lastZoomAppliedRef.current === z) return
        lastZoomAppliedRef.current = z
        mapRef.current.setZoom(z)
      } catch {
        // ignore
      }
    }

    if (!mapRef.current.loaded()) {
      mapRef.current.once('load', applyZoom)
      return
    }
    applyZoom()
  }, [zoom, resolvedMaxZoom])

  const placeMarker = (lngLat) => {
    const map = mapRef.current
    if (!map) return

    const lat = lngLat[1]
    const lng = lngLat[0]
    const isDefaultView = Math.abs(lat - 55) < 1 && Math.abs(lng - 20) < 1
    if (isDefaultView) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      return
    }

    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    const draggable = !!markerDraggableRef.current

    try {
      const m = new maplibregl.Marker({
        color: markerColorRef.current || '#0ABAB5',
        pitchAlignment: 'map',
        rotationAlignment: 'viewport',
        subpixelPositioning: true,
        draggable,
      })
        .setLngLat(lngLat)
        .addTo(map)
      markerRef.current = m
      if (draggable && typeof m.on === 'function') {
        m.on('dragend', () => {
          const ll = m.getLngLat()
          onMarkerDragEndRef.current?.({ lat: ll.lat, lng: ll.lng })
        })
      }
    } catch {
      // ignore
    }
  }

  // Маркер: создаём/обновляем после загрузки карты
  useEffect(() => {
    if (!mapRef.current) return

    if (!Array.isArray(marker) || marker.length !== 2) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      return
    }

    const lat = parseFloat(marker[0])
    const lng = parseFloat(marker[1])

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return
    }

    const lngLat = [lng, lat]

    const run = () => placeMarker(lngLat)

    if (!mapRef.current.loaded()) {
      mapRef.current.once('load', run)
      return
    }
    run()
  }, [marker, markerDraggable, markerColor])

  const handleZoomIn = () => {
    try {
      mapRef.current?.zoomIn({ duration: 200 })
    } catch {
      // ignore
    }
  }

  const handleZoomOut = () => {
    try {
      mapRef.current?.zoomOut({ duration: 200 })
    } catch {
      // ignore
    }
  }

  const useColumnControls = controlsLayout === 'column'
  const hideControls = controlsLayout === 'none'

  return (
    <div
      ref={containerRef}
      className={`location-map-container${
        isFullscreen ? ' location-map-container--fullscreen' : ''
      }${useColumnControls ? ' location-map-container--column-controls' : ''}${
        hideControls ? ' location-map-container--no-controls' : ''
      }`}
    >
      {!hideControls && (useColumnControls ? (
        <div className="location-map-controls-column">
          {allowFullscreen ? (
            <button
              type="button"
              className="location-map-controls-column__btn location-map-controls-column__btn--expand"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Свернуть карту' : 'Открыть карту'}
              title={isFullscreen ? 'Свернуть карту' : 'Открыть карту'}
            >
              {isFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
            </button>
          ) : null}
          <button
            type="button"
            className="location-map-controls-column__btn"
            onClick={handleZoomIn}
            aria-label="Увеличить"
            title="Увеличить"
          >
            +
          </button>
          <button
            type="button"
            className="location-map-controls-column__btn"
            onClick={handleZoomOut}
            aria-label="Уменьшить"
            title="Уменьшить"
          >
            −
          </button>
        </div>
      ) : (
        allowFullscreen && (
          <button
            type="button"
            className="location-map-fullscreen-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Свернуть карту' : 'Открыть карту'}
            title={isFullscreen ? 'Свернуть карту' : 'Открыть карту'}
          >
            {isFullscreen ? <FiMinimize2 size={15} /> : <FiMaximize2 size={15} />}
          </button>
        )
      ))}
      <div ref={mapContainerRef} className="location-map" />
    </div>
  )
}

export default LocationMap
