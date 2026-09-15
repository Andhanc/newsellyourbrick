import React, { useEffect, useRef, useState } from 'react'
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './LocationMap.css'
import '../utils/yandexMapChrome.css'
import { STREET_MAP_MAX_ZOOM } from '../utils/mapStyles'
import { createYandexMap, YANDEX_MAP_TYPE_ROADMAP } from '../utils/yandexMapEngine'
import { toYandexMapsLang } from '../utils/yandexMapsLang'
import MapTypeSwitcherButton from './MapTypeSwitcherButton'

function createPinElement(color) {
  const el = document.createElement('div')
  el.className = 'location-map-yandex-pin'
  el.innerHTML = `<span class="location-map-yandex-pin__dot" style="background:${color || '#0099A9'}"></span>`
  return el
}

const LocationMap = ({
  center,
  zoom = 10,
  marker,
  markerDraggable = false,
  onMarkerDragEnd,
  onMapReady,
  allowFullscreen = true,
  controlsLayout = 'default',
  mapStyle: _mapStyle,
  markerColor = '#0099A9',
  maxZoom = null,
  mapType = YANDEX_MAP_TYPE_ROADMAP,
  showMapTypeSwitcher = false,
  pageScrollInteraction = false,
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
  const [mapFailed, setMapFailed] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [activeMapType, setActiveMapType] = useState(mapType)
  const { i18n } = useTranslation()
  const mapsLang = toYandexMapsLang(i18n.language)
  const mapTypeRef = useRef(activeMapType)

  onMarkerDragEndRef.current = onMarkerDragEnd
  onMapReadyRef.current = onMapReady
  markerDraggableRef.current = markerDraggable
  markerColorRef.current = markerColor
  mapTypeRef.current = activeMapType

  useEffect(() => {
    setActiveMapType(mapType)
  }, [mapType])

  const resolvedMaxZoom = maxZoom ?? STREET_MAP_MAX_ZOOM

  const scheduleMapResize = () => {
    requestAnimationFrame(() => {
      try {
        mapRef.current?.resize()
      } catch {
        // ignore
      }
    })
  }

  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return undefined

    let resizeRaf = null
    const queueResize = () => {
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null
        try {
          mapRef.current?.resize()
        } catch {
          // ignore
        }
      })
    }

    const resizeObserver = new ResizeObserver(queueResize)
    resizeObserver.observe(container)

    let intersectionObserver = null
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            queueResize()
          }
        },
        { threshold: 0 },
      )
      intersectionObserver.observe(container)
    }

    queueResize()

    return () => {
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf)
      resizeObserver.disconnect()
      intersectionObserver?.disconnect()
    }
  }, [])

  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return undefined

    let cancelled = false
    let mapInstance = null

    let initialCenter = [20, 55]
    let initialZoom = 3

    if (Array.isArray(center) && center.length === 2) {
      const lat = parseFloat(center[0])
      const lng = parseFloat(center[1])
      if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const isDefaultView = Math.abs(lat - 55) < 1 && Math.abs(lng - 20) < 1
        initialCenter = [lng, lat]
        initialZoom = isDefaultView ? 3 : (zoom || 15)
      }
    }

    createYandexMap(container, {
      center: initialCenter,
      zoom: Math.min(initialZoom, resolvedMaxZoom),
      minZoom: 2,
      maxZoom: resolvedMaxZoom,
      type: mapTypeRef.current,
      lang: mapsLang,
      pageScrollInteraction,
    })
      .then((map) => {
        if (cancelled) {
          map.remove()
          return
        }
        mapInstance = map
        mapRef.current = map
        setMapFailed(false)
        setMapReady(true)
        onMapReadyRef.current?.(map)
        scheduleMapResize()
        window.setTimeout(scheduleMapResize, 120)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Yandex map init failed', error)
        setMapFailed(true)
      })

    return () => {
      cancelled = true
      setMapReady(false)
      onMapReadyRef.current?.(null)
      if (markerRef.current) {
        try { markerRef.current.remove() } catch { /* ignore */ }
        markerRef.current = null
      }
      const live = mapInstance || mapRef.current
      if (live) {
        try { live.remove() } catch { /* ignore */ }
      }
      mapInstance = null
      mapRef.current = null
      lastCenterRef.current = null
      lastZoomAppliedRef.current = null
    }
  }, [allowFullscreen, controlsLayout, resolvedMaxZoom, mapsLang, pageScrollInteraction])

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
      window.setTimeout(scheduleMapResize, 30)
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

  useEffect(() => {
    if (!mapReady) return
    mapRef.current?.setPageScrollInteraction?.(pageScrollInteraction && !isFullscreen)
  }, [pageScrollInteraction, isFullscreen, mapReady])

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
    if (!mapReady || !mapRef.current) return
    if (!Array.isArray(center) || center.length !== 2) return

    const lat = parseFloat(center[0])
    const lng = parseFloat(center[1])
    if (Number.isNaN(lat) || Number.isNaN(lng)) return
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return

    const centerKey = `${lat.toFixed(4)}-${lng.toFixed(4)}`
    if (lastCenterRef.current === centerKey) return
    lastCenterRef.current = centerKey
    mapRef.current.setCenter([lng, lat])
  }, [center, mapReady])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    if (zoom === undefined || zoom === null) {
      lastZoomAppliedRef.current = null
      return
    }

    const z = Math.min(Number(zoom), resolvedMaxZoom)
    if (lastZoomAppliedRef.current === z) return
    lastZoomAppliedRef.current = z
    mapRef.current.setZoom(z)
  }, [zoom, resolvedMaxZoom, mapReady])

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

    try {
      const addMarker = map.addDotMarker || map.addHtmlMarker
      markerRef.current = addMarker.call(map, {
        ...(map.addDotMarker
          ? { color: markerColorRef.current }
          : { element: createPinElement(markerColorRef.current) }),
        coordinates: [lng, lat],
        draggable: !!markerDraggableRef.current,
        onDragEnd: (coords) => onMarkerDragEndRef.current?.(coords),
      })
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    if (!Array.isArray(marker) || marker.length !== 2) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      return
    }

    const lat = parseFloat(marker[0])
    const lng = parseFloat(marker[1])
    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return
    }

    placeMarker([lng, lat])
  }, [marker, markerDraggable, markerColor, mapReady])

  const handleZoomIn = () => {
    mapRef.current?.zoomIn({ duration: 200 })
  }

  const handleZoomOut = () => {
    mapRef.current?.zoomOut({ duration: 200 })
  }

  const handleMapTypeChange = (nextType) => {
    setActiveMapType(nextType)
    mapRef.current?.setType?.(nextType)
  }

  const useColumnControls = controlsLayout === 'column'
  const hideControls = controlsLayout === 'none'
  const useDefaultZoom = !hideControls && !useColumnControls

  return (
    <div
      ref={containerRef}
      className={`location-map-container${
        isFullscreen ? ' location-map-container--fullscreen' : ''
      }${useColumnControls ? ' location-map-container--column-controls' : ''}${
        hideControls ? ' location-map-container--no-controls' : ''
      }${pageScrollInteraction ? ' location-map-container--page-scroll' : ''}`}
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
          {showMapTypeSwitcher ? (
            <MapTypeSwitcherButton
              mapType={activeMapType}
              onChange={handleMapTypeChange}
              className="location-map-controls-column__btn location-map-controls-column__btn--type"
              iconSize={16}
            />
          ) : null}
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
      {useDefaultZoom ? (
        <div className="location-map-zoom">
          <button type="button" onClick={handleZoomIn} aria-label="Увеличить">+</button>
          <button type="button" onClick={handleZoomOut} aria-label="Уменьшить">−</button>
        </div>
      ) : null}
      {showMapTypeSwitcher && !useColumnControls && !hideControls ? (
        <MapTypeSwitcherButton
          mapType={activeMapType}
          onChange={handleMapTypeChange}
          className="location-map-type-btn"
          iconSize={15}
        />
      ) : null}
      <div ref={mapContainerRef} className="location-map" />
      {mapFailed ? (
        <div className="location-map-fallback" role="status">
          Не удалось загрузить Яндекс Карту
        </div>
      ) : null}
    </div>
  )
}

export default LocationMap
