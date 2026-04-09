import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser } from '@clerk/clerk-react'
import { isAuthenticated } from '../services/authService'
import { showNotification } from '../utils/toastHelper'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import { FiHeart, FiMapPin, FiChevronLeft, FiSliders, FiX } from 'react-icons/fi'
import { HiOutlineArrowsExpand } from 'react-icons/hi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { SATELLITE_MAP_STYLE } from '../utils/mapStyles'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import './MapPage.css'

const SORT_OPTIONS = [
  { id: 'popular', label: 'По популярности' },
  { id: 'rating', label: 'По рейтингу' },
  { id: 'price', label: 'Сначала дешевле' }
]

function parseCoordinates(value) {
  if (value == null) return null

  let raw = value
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try { raw = JSON.parse(trimmed) } catch (_) { raw = trimmed.split(',') }
    } else {
      raw = trimmed.split(',')
    }
  }

  let lat, lng
  if (Array.isArray(raw) && raw.length >= 2) {
    lat = parseFloat(raw[0])
    lng = parseFloat(raw[1])
  } else if (typeof raw === 'object' && raw !== null) {
    lat = parseFloat(raw.lat ?? raw.latitude ?? raw.y)
    lng = parseFloat(raw.lng ?? raw.lon ?? raw.longitude ?? raw.x)
  }

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  if ((lat > 90 || lat < -90) && lng >= -90 && lng <= 90) [lat, lng] = [lng, lat]
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return [lat, lng]
}

function normalizeApiProperty(prop, index) {
  const isAuction = prop.is_auction === 1 || prop.is_auction === true || prop.isAuction === true
  const price = prop.price != null && prop.price !== '' ? Number(prop.price) : 0
  let images = []
  if (Array.isArray(prop.images)) {
    images = prop.images.map((img) => (typeof img === 'string' ? img : img?.url || img?.image)).filter(Boolean)
  } else if (prop.image) {
    images = [prop.image]
  }
  const coordinates =
    parseCoordinates(prop.coordinates) ||
    parseCoordinates(prop.location_coordinates) ||
    parseCoordinates(prop.map_coordinates) ||
    parseCoordinates({ lat: prop.lat ?? prop.latitude, lng: prop.lng ?? prop.lon ?? prop.longitude })
  return {
    id: prop.id,
    title: prop.title || prop.name || '',
    location: prop.location || prop.address || '',
    price,
    currentBid: isAuction ? (prop.auction_current_bid ?? prop.auction_starting_price ?? price) : null,
    images: images.length ? images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    area: prop.area ?? prop.sqft ?? 0,
    rooms: prop.rooms ?? prop.beds ?? prop.bedrooms ?? 0,
    floor: prop.floor ?? null,
    coordinates,
    _index: index
  }
}

const GEOCODE_CACHE_PREFIX = 'map_geocode_v1:'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function geocodeAddress(address) {
  const query = String(address || '').trim()
  if (!query) return null
  const cacheKey = `${GEOCODE_CACHE_PREFIX}${query.toLowerCase()}`
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length >= 2) return parsed
    }
  } catch (_) {}
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=ru&addressdetails=0`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    const hit = Array.isArray(data) ? data[0] : null
    const lat = hit?.lat != null ? parseFloat(hit.lat) : NaN
    const lng = hit?.lon != null ? parseFloat(hit.lon) : NaN
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    const coords = [lat, lng]
    try { localStorage.setItem(cacheKey, JSON.stringify(coords)) } catch (_) {}
    return coords
  } catch (_) { return null }
}


const MapPage = () => {
  const navigate = useNavigate()
  const { user, isLoaded: userLoaded } = useUser()
  const [propertiesList, setPropertiesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('popular')
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [favorites, setFavorites] = useState(new Set())
  const [imageIndex, setImageIndex] = useState({})
  const mapRef = useRef(null)
  const mapWrapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const [mapContainerReady, setMapContainerReady] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const geocodeInFlightRef = useRef(false)
  const [mapExpanded, setMapExpanded] = useState(false)
  /** Подсказка сверху карты после тапа по маркеру / «Показать» */
  const [mapOpenHintProperty, setMapOpenHintProperty] = useState(null)

  const formatPrice = (n) => '$' + new Intl.NumberFormat('en-US').format(Number(n) || 0)

  const getPropertyCoordinates = (property) => {
    if (property?.coordinates && Array.isArray(property.coordinates) && property.coordinates.length >= 2) {
      return [property.coordinates[0], property.coordinates[1]]
    }
    return null
  }

  // ─── Загрузка объектов ───────────────────────────────────────────────────
  const loadProperties = useCallback(async () => {
    try {
      setLoading(true)
      const apiBase = await getApiBaseUrl()
      const [approvedRes, auctionsRes] = await Promise.all([
        fetch(`${apiBase}/properties/approved`),
        fetch(`${apiBase}/properties/auctions`)
      ])
      let approved = [], auctions = []
      if (approvedRes.ok) {
        const json = await approvedRes.json()
        if (json?.success && Array.isArray(json.data)) approved = json.data
      }
      if (auctionsRes.ok) {
        const json = await auctionsRes.json()
        if (json?.success && Array.isArray(json.data)) auctions = json.data
      }
      const byId = new Map()
      approved.forEach((p, i) => { const n = normalizeApiProperty(p, i); if (n.id != null) byId.set(n.id, n) })
      auctions.forEach((p, i) => { const n = normalizeApiProperty({ ...p, is_auction: true }, approved.length + i); if (n.id != null) byId.set(n.id, n) })
      setPropertiesList(Array.from(byId.values()))
    } catch (e) {
      console.error('Ошибка загрузки объектов для карты:', e)
      setPropertiesList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProperties() }, [loadProperties])

  // ─── Геокодирование для объектов без координат ──────────────────────────
  useEffect(() => {
    if (!propertiesList.length || geocodeInFlightRef.current) return
    const missing = propertiesList
      .filter((p) => !p.coordinates && (p.location || '').trim().length >= 6)
      .slice(0, 50)
    if (missing.length === 0) return
    geocodeInFlightRef.current = true
    let cancelled = false
    ;(async () => {
      for (const p of missing) {
        if (cancelled) break
        const coords = await geocodeAddress(p.location)
        if (coords && !cancelled) setPropertiesList((prev) => prev.map((x) => x.id === p.id ? { ...x, coordinates: coords } : x))
        await sleep(250)
      }
    })().catch(() => {}).finally(() => { geocodeInFlightRef.current = false })
    return () => { cancelled = true }
  }, [propertiesList])

  // ─── Сортировка ──────────────────────────────────────────────────────────
  const sortedProperties = [...propertiesList].sort((a, b) => {
    if (sortBy === 'price') return (a.price || a.currentBid || 0) - (b.price || b.currentBid || 0)
    if (sortBy === 'rating') return ((b.id || 0) % 10) - ((a.id || 0) % 10)
    return 0
  })

  // ─── Инициализация карты ─────────────────────────────────────────────────
  useEffect(() => {
    const id = requestAnimationFrame(() => setMapContainerReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!mapContainerReady) return
    const container = mapRef.current
    if (!container || mapInstanceRef.current) return
    let cancelled = false
    const t = setTimeout(() => {
      if (cancelled || !container.isConnected || mapInstanceRef.current) return
      try {
        const map = new maplibregl.Map({
          container,
          style: SATELLITE_MAP_STYLE,
          center: [27.5666, 53.9138],
          zoom: 11,
          pitch: 45,
          bearing: -15,
          attributionControl: false
        })
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
        mapInstanceRef.current = map
        map.on('load', () => {
          map.resize()
          setTimeout(() => map.resize(), 400)
          setMapReady(true)
        })
      } catch (e) {
        console.error('Ошибка инициализации карты:', e)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove() } catch (_) {}
        mapInstanceRef.current = null
      }
    }
  }, [mapContainerReady])

  // ─── Обновление маркеров — запускается только когда карта готова ─────────
  useEffect(() => {
    if (!mapReady) return
    const map = mapInstanceRef.current
    if (!map) return

    // Удаляем старые маркеры
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const bounds = new maplibregl.LngLatBounds()
    let hasPoints = false

    sortedProperties.forEach((property) => {
      const coords = getPropertyCoordinates(property)
      if (!coords) return

      const lngLat = [coords[1], coords[0]]
      const isSelected =
        selectedProperty != null && String(selectedProperty.id) === String(property.id)
      const priceStr = formatPrice(property.price ?? property.currentBid ?? 0)
      const thumbSrc =
        (Array.isArray(property.images) && property.images[0]) ||
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'

      const el = document.createElement('div')
      el.className = `map-pin-mini${isSelected ? ' map-pin-mini--active' : ''}`
      el.setAttribute('role', 'button')

      const imgWrap = document.createElement('div')
      imgWrap.className = 'map-pin-mini__img-wrap'
      const img = document.createElement('img')
      img.className = 'map-pin-mini__img'
      img.src = thumbSrc
      img.alt = ''
      img.decoding = 'async'
      img.addEventListener('error', () => {
        img.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
      })
      imgWrap.appendChild(img)
      if (isSelected) {
        imgWrap.classList.add('map-pin-mini__img-wrap--openable')
      }
      el.title = 'Показать на карте'

      const priceEl = document.createElement('span')
      priceEl.className = 'map-pin-mini__price'
      priceEl.textContent = priceStr

      el.appendChild(imgWrap)
      el.appendChild(priceEl)

      let lastMarkerActivate = 0
      const onMarkerActivate = (e) => {
        if (e.button != null && e.button !== 0) return
        const now = Date.now()
        if (now - lastMarkerActivate < 450) return
        lastMarkerActivate = now
        e.stopPropagation()
        setSelectedProperty(property)
        map.flyTo({ center: lngLat, zoom: 16, duration: 700 })
        setMapOpenHintProperty(property)
      }
      el.addEventListener('click', onMarkerActivate)
      // MapLibre на маркере вызывает mousedown.preventDefault() — на части Safari/тач «click» не приходит; pointerup для touch/pen
      el.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'mouse') return
        onMarkerActivate(e)
      })

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(lngLat)
        .addTo(map)

      markersRef.current.push(marker)
      bounds.extend(lngLat)
      hasPoints = true
    })

    // Позиционируем карту (только если не выбран конкретный объект)
    if (!selectedProperty && hasPoints) {
      map.fitBounds(bounds, { padding: { top: 80, right: 80, bottom: 80, left: 80 }, maxZoom: 15, duration: 700 })
    }
  }, [sortedProperties, selectedProperty, mapReady])

  // ─── Ресайз при раскрытии карты ─────────────────────────────────────────
  useEffect(() => {
    if (!mapExpanded) return
    const t1 = setTimeout(() => mapInstanceRef.current?.resize(), 50)
    const t2 = setTimeout(() => mapInstanceRef.current?.resize(), 300)
    const t3 = setTimeout(() => mapInstanceRef.current?.resize(), 600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [mapExpanded])

  useEffect(() => {
    if (!mapExpanded) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mapExpanded])

  // ─── Прочие обработчики ──────────────────────────────────────────────────
  const setCardImageIndex = (id, index) => setImageIndex((prev) => ({ ...prev, [id]: index }))

  const toggleFavorite = (e, property) => {
    e.stopPropagation()
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    if (!favorites.has(property.id) && !isClerkAuth && !isOldAuth) {
      showNotification('Войдите в систему, чтобы добавлять объявления в избранное')
      return
    }
    const next = new Set(favorites)
    if (next.has(property.id)) next.delete(property.id); else next.add(property.id)
    setFavorites(next)
  }

  const focusOnProperty = useCallback((property) => {
    const coords = getPropertyCoordinates(property)
    if (!coords) {
      showNotification('У объекта пока нет координат для отображения на карте')
      return
    }
    // flyTo вызывается здесь; маркеры обновятся через setSelectedProperty → useEffect
    mapInstanceRef.current?.flyTo({ center: [coords[1], coords[0]], zoom: 16, duration: 700 })
    setSelectedProperty(property)
    setMapOpenHintProperty(property)
    const wrap = mapWrapRef.current
    if (wrap && !mapExpanded) {
      requestAnimationFrame(() => {
        wrap.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
      })
    }
  }, [mapExpanded])

  // ─── Рендер ──────────────────────────────────────────────────────────────
  return (
    <div className="map-page-root">
      <div className="map-page-booking">
        <header className="map-page-back-bar">
          <button type="button" className="map-page-back-btn" onClick={() => navigate(-1)} aria-label="Назад">
            <FiChevronLeft size={20} />
            <span>Назад</span>
          </button>
        </header>

        <div className="map-page-main">
          <aside className="map-page-list">
            <header className="map-list-header">
              <p className="map-list-count map-list-count--secondary">
                {loading ? 'Загрузка…' : <><strong>{sortedProperties.length}</strong> объектов</>}
              </p>
              <div className="map-sort-pills">
                <button type="button" className="map-sort-pill map-sort-pill--filter">
                  <FiSliders size={16} />
                  Фильтры
                </button>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`map-sort-pill ${sortBy === opt.id ? 'active' : ''}`}
                    onClick={() => setSortBy(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="map-list-scroll">
              {loading ? (
                <div className="map-list-loading">
                  <div className="map-list-loading-spinner" aria-hidden />
                  <p>Загрузка объектов…</p>
                </div>
              ) : sortedProperties.length === 0 ? (
                <div className="map-list-empty"><p>Нет объектов для отображения</p></div>
              ) : sortedProperties.map((property) => {
                const images = property.images || []
                const currentImgIndex = imageIndex[property.id] ?? 0
                const isSelected = selectedProperty?.id === property.id
                const priceDisplay = property.price ?? property.currentBid ?? 0
                const metaParts = []
                if (property.area) metaParts.push(`${property.area} м²`)
                if (property.rooms) metaParts.push(`${property.rooms} комн.`)
                if (property.floor) metaParts.push(`${property.floor} этаж`)

                return (
                  <article
                    key={property.id}
                    className={`map-booking-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (!ensureCanOpenProperty(user && userLoaded)) return
                      navigate(`/property/${property.id}`)
                    }}
                  >
                    <div className="map-booking-card__media">
                      <div className="map-booking-card__img-wrap">
                        <img src={images[currentImgIndex] || images[0]} alt={property.title} />
                        <button
                          type="button"
                          className={`map-booking-card__fav ${favorites.has(property.id) ? 'active' : ''}`}
                          onClick={(e) => toggleFavorite(e, property)}
                          aria-label="В избранное"
                        >
                          <FiHeart size={18} />
                        </button>
                        {images.length > 1 && (
                          <div className="map-booking-card__dots">
                            {images.slice(0, 5).map((_, i) => (
                              <span
                                key={i}
                                className={i === currentImgIndex ? 'active' : ''}
                                onClick={(e) => { e.stopPropagation(); setCardImageIndex(property.id, i) }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="map-booking-card__body">
                      <h3 className="map-booking-card__title">{property.title}</h3>
                      {metaParts.length > 0 && (
                        <p className="map-booking-card__meta">{metaParts.join(' · ')}</p>
                      )}
                      {property.location && (
                        <div className="map-booking-card__location">
                          <span className="map-booking-card__location-row">
                            <FiMapPin size={14} className="map-booking-card__location-icon" />
                            {property.location}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="map-booking-card__right">
                      <div className="map-booking-card__price-block">
                        <p className="map-booking-card__price">{formatPrice(priceDisplay)}</p>
                      </div>
                      <button
                        type="button"
                        className="map-booking-card__show-btn"
                        onClick={(e) => { e.stopPropagation(); focusOnProperty(property) }}
                      >
                        Показать
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </aside>

          <div
            ref={mapWrapRef}
            className={`map-page-map-wrap ${mapExpanded ? 'map-page-map-wrap--fullscreen' : ''}`}
          >
            {mapContainerReady && (
              <div
                ref={mapRef}
                className="map-page-map"
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              />
            )}
            {!mapExpanded && (
              <button type="button" className="map-expand-btn" onClick={() => setMapExpanded(true)}>
                <HiOutlineArrowsExpand size={18} />
                Раскрыть карту
              </button>
            )}
            {mapOpenHintProperty && (
              <div
                className={`map-open-hint ${mapExpanded ? 'map-open-hint--fullscreen' : ''}`}
                role="status"
              >
                <button
                  type="button"
                  className="map-open-hint__dismiss"
                  onClick={() => setMapOpenHintProperty(null)}
                  aria-label="Скрыть подсказку"
                >
                  <FiX size={18} />
                </button>
                <div className="map-open-hint__thumb">
                  <img
                    src={
                      (Array.isArray(mapOpenHintProperty.images) && mapOpenHintProperty.images[0]) ||
                      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'
                    }
                    alt=""
                  />
                </div>
                <div className="map-open-hint__main">
                  <p className="map-open-hint__label">Объект на карте</p>
                  <p className="map-open-hint__title">{mapOpenHintProperty.title}</p>
                  <p className="map-open-hint__price">
                    {formatPrice(mapOpenHintProperty.price ?? mapOpenHintProperty.currentBid ?? 0)}
                  </p>
                </div>
                <button
                  type="button"
                  className="map-open-hint__cta"
                  onClick={() => {
                    if (!ensureCanOpenProperty(user && userLoaded)) return
                    navigate(`/property/${mapOpenHintProperty.id}`)
                  }}
                >
                  Открыть объект
                </button>
              </div>
            )}
            {mapExpanded && (
              <button type="button" className="map-fullscreen-close" onClick={() => setMapExpanded(false)} aria-label="Закрыть карту">
                ×
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapPage
