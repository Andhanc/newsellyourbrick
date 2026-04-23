import React, { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './LocationMap.css'
import { SATELLITE_MAP_STYLE, SATELLITE_MAP_MAX_ZOOM } from '../utils/mapStyles'

const LocationMap = ({
  center,
  zoom = 10,
  marker,
  markerDraggable = false,
  onMarkerDragEnd,
}) => {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const lastCenterRef = useRef(null)
  const lastZoomAppliedRef = useRef(null)
  const onMarkerDragEndRef = useRef(onMarkerDragEnd)
  const markerDraggableRef = useRef(markerDraggable)

  onMarkerDragEndRef.current = onMarkerDragEnd
  markerDraggableRef.current = markerDraggable

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
      style: SATELLITE_MAP_STYLE,
      center: initialCenter,
      zoom: Math.min(initialZoom, SATELLITE_MAP_MAX_ZOOM),
      minZoom: 2,
      maxZoom: SATELLITE_MAP_MAX_ZOOM,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    return () => {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
  }, [])

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
        const z = Math.min(Number(zoom), SATELLITE_MAP_MAX_ZOOM)
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
  }, [zoom])

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
        color: '#0ABAB5',
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
  }, [marker, markerDraggable])

  return (
    <div className="location-map-container">
      <div ref={mapContainerRef} className="location-map" />
    </div>
  )
}

export default LocationMap
