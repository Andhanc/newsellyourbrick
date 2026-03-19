import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser } from '@clerk/clerk-react'
import { isAuthenticated } from '../services/authService'
import { showNotification } from '../utils/toastHelper'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import { FiHeart, FiMapPin, FiChevronLeft, FiSliders } from 'react-icons/fi'
import { HiOutlineArrowsExpand } from 'react-icons/hi'
import { getApiBaseUrl } from '../utils/apiConfig'
import './MapPage.css'

const SORT_OPTIONS = [
  { id: 'popular', label: 'По популярности' },
  { id: 'rating', label: 'По рейтингу' },
  { id: 'price', label: 'Сначала дешевле' }
]

// Нормализация объекта из API для карты и списка
function normalizeApiProperty(prop, index) {
  const isAuction = prop.is_auction === 1 || prop.is_auction === true || prop.isAuction === true
  const price = prop.price != null && prop.price !== '' ? Number(prop.price) : 0
  const currentBid = prop.currentBid ?? prop.auction_current_bid ?? prop.auction_starting_price ?? price
  let images = []
  if (Array.isArray(prop.images)) {
    images = prop.images.map((img) => (typeof img === 'string' ? img : img?.url || img?.image)).filter(Boolean)
  } else if (prop.image) {
    images = [prop.image]
  }
  let coordinates = null
  if (prop.coordinates) {
    try {
      if (typeof prop.coordinates === 'string') {
        const parsed = JSON.parse(prop.coordinates)
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const lat = parseFloat(parsed[0])
          const lng = parseFloat(parsed[1])
          if (!isNaN(lat) && !isNaN(lng)) coordinates = [lat, lng]
        }
      } else if (Array.isArray(prop.coordinates) && prop.coordinates.length >= 2) {
        const lat = parseFloat(prop.coordinates[0])
        const lng = parseFloat(prop.coordinates[1])
        if (!isNaN(lat) && !isNaN(lng)) coordinates = [lat, lng]
      }
    } catch (_) {}
  }
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

  // localStorage cache by normalized address
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
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        // Nominatim просит корректный User-Agent/Referer — в браузере это ок,
        // но заголовок User-Agent запретят, поэтому не выставляем его вручную.
        'Accept': 'application/json'
      }
    })
    if (!res.ok) return null
    const data = await res.json()
    const hit = Array.isArray(data) ? data[0] : null
    const lat = hit?.lat != null ? parseFloat(hit.lat) : NaN
    const lng = hit?.lon != null ? parseFloat(hit.lon) : NaN
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    const coords = [lat, lng]
    try {
      localStorage.setItem(cacheKey, JSON.stringify(coords))
    } catch (_) {}
    return coords
  } catch (_) {
    return null
  }
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
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const [mapContainerReady, setMapContainerReady] = useState(false)
  const geocodeInFlightRef = useRef(false)

  const formatPrice = (n) => {
    return '$' + new Intl.NumberFormat('en-US').format(Number(n) || 0)
  }

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true)
      const apiBase = await getApiBaseUrl()
      const [approvedRes, auctionsRes] = await Promise.all([
        fetch(`${apiBase}/properties/approved`),
        fetch(`${apiBase}/properties/auctions`)
      ])
      let approved = []
      let auctions = []
      if (approvedRes.ok) {
        const json = await approvedRes.json()
        if (json?.success && Array.isArray(json.data)) approved = json.data
      }
      if (auctionsRes.ok) {
        const json = await auctionsRes.json()
        if (json?.success && Array.isArray(json.data)) auctions = json.data
      }
      const byId = new Map()
      approved.forEach((p, i) => {
        const norm = normalizeApiProperty(p, i)
        if (norm.id != null) byId.set(norm.id, norm)
      })
      auctions.forEach((p, i) => {
        const norm = normalizeApiProperty({ ...p, is_auction: true }, approved.length + i)
        if (norm.id != null) byId.set(norm.id, norm)
      })
      setPropertiesList(Array.from(byId.values()))
    } catch (e) {
      console.error('Ошибка загрузки объектов для карты:', e)
      setPropertiesList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProperties()
  }, [loadProperties])

  const sortedProperties = [...propertiesList].sort((a, b) => {
    if (sortBy === 'price') {
      return (a.price || a.currentBid || 0) - (b.price || b.currentBid || 0)
    }
    if (sortBy === 'rating') {
      const ra = 9 + ((a.id || 0) % 10) / 10
      const rb = 9 + ((b.id || 0) % 10) / 10
      return rb - ra
    }
    return 0
  })

  const getPropertyCoordinates = (property) => {
    if (property.coordinates && Array.isArray(property.coordinates) && property.coordinates.length >= 2) {
      return [property.coordinates[0], property.coordinates[1]]
    }
    return null
  }

  // Догружаем координаты для объектов, у которых их нет (по адресу), чтобы на карте были реальные точки.
  useEffect(() => {
    if (!propertiesList.length) return
    if (geocodeInFlightRef.current) return

    const missing = propertiesList
      .filter((p) => !p.coordinates && (p.location || '').trim().length >= 6)
      .slice(0, 50) // не пытаемся геокодить сотни объектов за раз

    if (missing.length === 0) return

    geocodeInFlightRef.current = true
    let cancelled = false

    ;(async () => {
      for (let i = 0; i < missing.length; i++) {
        if (cancelled) break
        const p = missing[i]
        const coords = await geocodeAddress(p.location)
        if (coords && !cancelled) {
          setPropertiesList((prev) =>
            prev.map((x) => (x.id === p.id ? { ...x, coordinates: coords } : x))
          )
        }
        // небольшая пауза, чтобы не спамить Nominatim
        await sleep(250)
      }
    })()
      .catch(() => {})
      .finally(() => {
        geocodeInFlightRef.current = false
      })

    return () => {
      cancelled = true
    }
  }, [propertiesList])

  // Стиль карты: OpenStreetMap (надёжно грузится без ключа)
  const MAP_STYLE = {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap'
      }
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
  }

  // Монтируем контейнер карты после первого рендера, чтобы у блока уже были размеры
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setMapContainerReady(true)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (!mapContainerReady) return
    const container = mapRef.current
    if (!container || mapInstanceRef.current) return

    let cancelled = false
    const initMap = () => {
      if (cancelled || !container.isConnected || mapInstanceRef.current) return
      try {
        const map = new maplibregl.Map({
          container,
          style: MAP_STYLE,
          center: [37.6173, 55.7558],
          zoom: 10,
          attributionControl: false
        })
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
        mapInstanceRef.current = map

        const doResize = () => {
          if (map.resize) map.resize()
        }
        map.on('load', () => {
          doResize()
          setTimeout(doResize, 300)
          setTimeout(doResize, 800)
        })
        // На случай если load уже произошёл или контейнер изначально с размерами
        requestAnimationFrame(() => {
          setTimeout(doResize, 100)
        })
      } catch (e) {
        console.error('Ошибка инициализации карты:', e)
      }
    }

    const t = setTimeout(initMap, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (e) {}
        mapInstanceRef.current = null
      }
    }
  }, [mapContainerReady])

  useEffect(() => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    if (!map.loaded()) {
      map.once('load', updateMarkers)
      return
    }
    updateMarkers()

    function updateMarkers() {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      sortedProperties.forEach((property) => {
        const coords = getPropertyCoordinates(property)
        if (!coords) return
        const isSelected = selectedProperty?.id === property.id
        const priceVal = property.price ?? property.currentBid ?? 0
        const priceStr = formatPrice(priceVal)

        const el = document.createElement('div')
        el.className = `map-price-marker ${isSelected ? 'active' : ''}`
        el.textContent = priceStr
        el.style.cursor = 'pointer'

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([coords[1], coords[0]])
          .addTo(map)

        el.addEventListener('click', () => setSelectedProperty(property))
        markersRef.current.push(marker)
      })

      if (selectedProperty) {
        const coords = getPropertyCoordinates(selectedProperty)
        if (coords) {
          map.flyTo({ center: [coords[1], coords[0]], zoom: 14, duration: 800 })
        }
      }
    }
  }, [sortedProperties, selectedProperty])

  const setCardImageIndex = (id, index) => {
    setImageIndex((prev) => ({ ...prev, [id]: index }))
  }

  const toggleFavorite = (e, property) => {
    e.stopPropagation()
    const isClerkAuth = user && userLoaded
    const isOldAuth = isAuthenticated()
    const isFav = favorites.has(property.id)
    if (!isFav && !isClerkAuth && !isOldAuth) {
      showNotification('Войдите в систему, чтобы добавлять объявления в избранное')
      return
    }
    const next = new Set(favorites)
    if (next.has(property.id)) next.delete(property.id)
    else next.add(property.id)
    setFavorites(next)
  }

  const [mapExpanded, setMapExpanded] = useState(false)

  const expandMap = () => {
    setMapExpanded(true)
  }

  const closeExpandedMap = () => {
    setMapExpanded(false)
  }

  useEffect(() => {
    if (mapExpanded && mapInstanceRef.current?.resize) {
      mapInstanceRef.current.resize()
    }
  }, [mapExpanded])

  return (
    <div className="map-page-root">
      <div className="map-page-booking">
        {/* Одна кнопка «Назад» сверху — для всех экранов */}
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
            <div className="map-list-empty">
              <p>Нет объектов для отображения</p>
            </div>
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
                onClick={() => navigate(`/property/${property.id}`)}
              >
                <div className="map-booking-card__media">
                  <div className="map-booking-card__img-wrap">
                    <img
                      src={images[currentImgIndex] || images[0]}
                      alt={property.title}
                    />
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
                            onClick={(e) => {
                              e.stopPropagation()
                              setCardImageIndex(property.id, i)
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="map-booking-card__body">
                  <h3 className="map-booking-card__title">{property.title}</h3>
                  {metaParts.length > 0 && (
                    <p className="map-booking-card__meta">
                      {metaParts.join(' · ')}
                    </p>
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
                    <p className="map-booking-card__price">
                      {formatPrice(priceDisplay)}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </aside>

      <div className={`map-page-map-wrap ${mapExpanded ? 'map-page-map-wrap--fullscreen' : ''}`}>
        {mapContainerReady && (
          <div
            ref={mapRef}
            className="map-page-map"
            style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
          />
        )}
        {!mapExpanded && (
          <button type="button" className="map-expand-btn" onClick={expandMap}>
            <HiOutlineArrowsExpand size={18} />
            Раскрыть карту
          </button>
        )}
        {mapExpanded && (
          <button type="button" className="map-fullscreen-close" onClick={closeExpandedMap} aria-label="Закрыть карту">
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
