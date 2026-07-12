import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'
import { showNotification } from '../utils/toastHelper'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useNavigate } from 'react-router-dom'
import { FiMapPin, FiX, FiMap, FiSearch } from 'react-icons/fi'
import PageBackButton from '../components/PageBackButton'
import MapPagePropertyGrid, { MapPagePropertyGridSkeletons } from '../components/MapPagePropertyGrid'
import MapPageFilters from '../components/MapPageFilters'
import { useTranslation } from 'react-i18next'
import { HiOutlineArrowsExpand } from 'react-icons/hi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { SATELLITE_MAP_STYLE, SATELLITE_MAP_MAX_ZOOM } from '../utils/mapStyles'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { getMainScrollEl, scrollMainTo } from '../utils/mainScroll'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import { formatPropertyPrice } from '../utils/currency'
import './MapPage.css'
import { getPropertyDetailPath, auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import {
  EMPTY_MAP_FILTERS,
  applyMapPageFilters,
  getMapPriceBounds,
  countActiveMapFilters,
} from '../utils/mapPageFilters'
import { isSoldPropertyListing } from '../utils/auctionReminderBounds'

const MAP_LIST_SKELETON_COUNT = 6
const MAP_PIN_MINI_ZOOM = 15
const MAP_PIN_CLUSTER_RADIUS_PX = 84
const MAP_PIN_MINI_APPEAR_DELAY_MS = 280
const MAP_PIN_MINI_STAGGER_MS = 40
const MAP_PIN_THUMB_FALLBACK = '/images/external/photo-1522708323590-d24dbb6b0267-b4dd9c7026.jpg'

const GEOCODE_RESULT_PRIORITY = [
  'building',
  'house',
  'residential',
  'commercial',
  'retail',
  'industrial',
  'office',
  'apartments',
  'street',
  'road',
  'neighbourhood',
  'suburb',
  'quarter',
  'city',
  'town',
  'village',
]

function buildMapPointItems(properties, getCoords) {
  const items = []
  for (const property of properties) {
    const coords = getCoords(property)
    if (!coords) continue
    items.push({ property, lat: coords[0], lng: coords[1] })
  }
  return items
}

function clusterMapPoints(map, items, radiusPx) {
  const clusters = []
  const used = new Set()

  for (let i = 0; i < items.length; i += 1) {
    if (used.has(i)) continue
    const group = [items[i]]
    used.add(i)
    const anchor = map.project([items[i].lng, items[i].lat])

    for (let j = i + 1; j < items.length; j += 1) {
      if (used.has(j)) continue
      const point = map.project([items[j].lng, items[j].lat])
      const dist = Math.hypot(anchor.x - point.x, anchor.y - point.y)
      if (dist <= radiusPx) {
        group.push(items[j])
        used.add(j)
      }
    }

    if (group.length === 1) {
      clusters.push({ type: 'point', ...group[0] })
      continue
    }

    const lat = group.reduce((sum, item) => sum + item.lat, 0) / group.length
    const lng = group.reduce((sum, item) => sum + item.lng, 0) / group.length
    clusters.push({
      type: 'cluster',
      lat,
      lng,
      count: group.length,
      properties: group.map((item) => item.property),
    })
  }

  return clusters
}

function resolveMapMarkerItems(map, items) {
  if (map.getZoom() >= MAP_PIN_MINI_ZOOM) {
    return items.map((item) => ({ type: 'point', ...item }))
  }

  return clusterMapPoints(map, items, MAP_PIN_CLUSTER_RADIUS_PX)
}

function getPropertyThumbSrc(property) {
  return (Array.isArray(property?.images) && property.images[0]) || MAP_PIN_THUMB_FALLBACK
}

function getMapMarkerPriceStr(property, formatPrice) {
  const isAuction =
    property?.isAuction === true ||
    property?.is_auction === 1 ||
    property?.is_auction === true

  const amount = isAuction
    ? property?.currentBid ??
      property?.auction_current_bid ??
      property?.auction_starting_price ??
      property?.price ??
      0
    : property?.price ?? property?.currentBid ?? 0

  return formatPrice(amount, property?.currency || 'USD')
}

function createMapPinThumbImg() {
  const img = document.createElement('img')
  img.className = 'map-pin-mini__img'
  img.alt = ''
  img.decoding = 'async'
  img.addEventListener('error', () => {
    img.src = MAP_PIN_THUMB_FALLBACK
  })
  return img
}

function buildMapPinClusterElement(item, onActivate) {
  const el = document.createElement('div')
  el.className = 'map-pin-thumb-stack map-pin-thumb-stack--enter'
  el.setAttribute('role', 'button')
  el.title = `${item.count} объектов`

  const properties = item.properties || []
  const preview = properties.slice(0, Math.min(3, properties.length))

  preview.forEach((property, index) => {
    const thumb = document.createElement('div')
    thumb.className = 'map-pin-thumb-stack__thumb'
    if (index > 0) {
      thumb.classList.add('map-pin-thumb-stack__thumb--stacked')
      thumb.dataset.stackIndex = String(index)
    }

    const img = createMapPinThumbImg()
    img.src = getPropertyThumbSrc(property)
    thumb.appendChild(img)
    el.appendChild(thumb)
  })

  if (item.count > 1) {
    const badge = document.createElement('span')
    badge.className = 'map-pin-thumb-stack__badge'
    badge.textContent = item.count > 99 ? '99+' : String(item.count)
    el.appendChild(badge)
  }

  bindMarkerActivate(el, onActivate)
  return el
}

function buildMapPinPointElement({
  property,
  isSelected,
  compact,
  priceStr,
  onActivate,
}) {
  const el = document.createElement('div')
  el.className = [
    'map-pin-mini',
    'map-pin-mini--enter',
    isSelected ? 'map-pin-mini--active' : '',
    compact ? 'map-pin-mini--compact' : '',
  ]
    .filter(Boolean)
    .join(' ')
  el.setAttribute('role', 'button')
  el.title = property.title || 'Показать на карте'

  const inner = document.createElement('div')
  inner.className = 'map-pin-mini__inner'

  const imgWrap = document.createElement('div')
  imgWrap.className = 'map-pin-mini__img-wrap'
  const img = createMapPinThumbImg()
  img.src = getPropertyThumbSrc(property)
  imgWrap.appendChild(img)
  if (isSelected) {
    imgWrap.classList.add('map-pin-mini__img-wrap--openable')
  }

  inner.appendChild(imgWrap)

  const priceEl = document.createElement('span')
  priceEl.className = 'map-pin-mini__price'
  priceEl.textContent = priceStr
  inner.appendChild(priceEl)

  el.appendChild(inner)
  bindMarkerActivate(el, onActivate)
  return el
}

function scoreGeocodeHit(hit) {
  const type = String(hit?.type || hit?.class || '').toLowerCase()
  const typeIdx = GEOCODE_RESULT_PRIORITY.indexOf(type)
  const typeScore = typeIdx >= 0 ? (GEOCODE_RESULT_PRIORITY.length - typeIdx) * 12 : 0
  const importance = Number.parseFloat(hit?.importance)
  return typeScore + (Number.isFinite(importance) ? importance * 6 : 0)
}

function pickBestGeocodeHit(hits) {
  if (!Array.isArray(hits) || hits.length === 0) return null
  let best = hits[0]
  let bestScore = scoreGeocodeHit(hits[0])
  for (const hit of hits.slice(1)) {
    const score = scoreGeocodeHit(hit)
    if (score > bestScore) {
      best = hit
      bestScore = score
    }
  }
  return best
}

function scheduleMapPinMiniReveal(el, index) {
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      if (el.isConnected) el.classList.add('map-pin-mini--visible')
    }, MAP_PIN_MINI_APPEAR_DELAY_MS + index * MAP_PIN_MINI_STAGGER_MS)
  })
}

function bindMarkerActivate(el, onActivate) {
  let lastActivate = 0
  const handler = (e) => {
    if (e.button != null && e.button !== 0) return
    const now = Date.now()
    if (now - lastActivate < 450) return
    lastActivate = now
    e.stopPropagation()
    onActivate(e)
  }
  el.addEventListener('click', handler)
  el.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return
    handler(e)
  })
}

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
    ...prop,
    id: prop.id,
    title: prop.title || prop.name || '',
    location: prop.location || prop.address || '',
    price,
    currentBid: isAuction ? (prop.auction_current_bid ?? prop.auction_starting_price ?? price) : null,
    images: images.length ? images : ['/images/external/photo-1522708323590-d24dbb6b0267-b4dd9c7026.jpg'],
    area: prop.area ?? prop.sqft ?? 0,
    rooms: prop.rooms ?? prop.beds ?? prop.bedrooms ?? 0,
    bathrooms: prop.bathrooms ?? prop.baths ?? 0,
    floor: prop.floor ?? null,
    coordinates,
    property_type: prop.property_type || prop.propertyType || '',
    isAuction,
    is_auction: isAuction,
    currency: prop.currency || 'USD',
    source_table:
      prop.source_table ||
      (isAuction ? 'properties' : 'properties_apartments'),
    _index: index,
  }
}

const GEOCODE_CACHE_PREFIX = 'map_geocode_v2:'
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
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ru&addressdetails=1`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    const hit = pickBestGeocodeHit(Array.isArray(data) ? data : [])
    const lat = hit?.lat != null ? parseFloat(hit.lat) : NaN
    const lng = hit?.lon != null ? parseFloat(hit.lon) : NaN
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    const coords = [lat, lng]
    try { localStorage.setItem(cacheKey, JSON.stringify(coords)) } catch (_) {}
    return coords
  } catch (_) { return null }
}


const MapPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, isLoaded: userLoaded } = useUser()
  const { isFavorite, toggleFavorite: toggleFavoriteGlobal } = usePropertyFavorites()
  const [propertiesList, setPropertiesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [mapFilters, setMapFilters] = useState(EMPTY_MAP_FILTERS)
  const [filtersMenuOpen, setFiltersMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProperty, setSelectedProperty] = useState(null)
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
  const [mapFabPhase, setMapFabPhase] = useState('hidden') // hidden | visible | leaving

  const formatPrice = (n, currency = 'USD') =>
    formatPropertyPrice(n, currency, { locale: 'en-US' })

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

  useEffect(() => {
    if (!userLoaded) return
    if (!isSiteUserSignedIn(user, userLoaded)) {
      requestOpenLoginModal({ wizard: true })
      navigate('/', { replace: true })
    }
  }, [user, userLoaded, navigate])

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

  // ─── Поиск, фильтры и сортировка ─────────────────────────────────────────
  const searchNormalized = searchQuery.trim().toLowerCase()
  const activeListings = useMemo(
    () => propertiesList.filter((property) => !isSoldPropertyListing(property)),
    [propertiesList],
  )
  const priceBounds = useMemo(() => getMapPriceBounds(activeListings), [activeListings])
  const activeFilterCount = useMemo(() => countActiveMapFilters(mapFilters), [mapFilters])

  const filteredProperties = useMemo(() => {
    let list = applyMapPageFilters(activeListings, mapFilters, { isFavorite })

    if (searchNormalized) {
      list = list.filter((p) => {
        const title = String(p.title || '').toLowerCase()
        const location = String(p.location || '').toLowerCase()
        return title.includes(searchNormalized) || location.includes(searchNormalized)
      })
    }

    return list
  }, [activeListings, mapFilters, searchNormalized, isFavorite])

  const sortedProperties = useMemo(
    () => [...filteredProperties].sort((a, b) => ((b.id || 0) % 10) - ((a.id || 0) % 10)),
    [filteredProperties],
  )

  useEffect(() => {
    if (!selectedProperty) return
    const stillVisible = sortedProperties.some(
      (property) => String(property.id) === String(selectedProperty.id),
    )
    if (!stillVisible) {
      setSelectedProperty(null)
      setMapOpenHintProperty(null)
    }
  }, [sortedProperties, selectedProperty])

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
    const rafIds = []
    const startMap = () => {
      if (cancelled || !container.isConnected || mapInstanceRef.current) return
      try {
        const map = new maplibregl.Map({
          container,
          style: SATELLITE_MAP_STYLE,
          center: [27.5666, 53.9138],
          zoom: 11,
          minZoom: 2,
          maxZoom: SATELLITE_MAP_MAX_ZOOM,
          // 2D: HTML-маркеры без искажений и без «уплывания» относительно тайлов
          pitch: 0,
          bearing: -12,
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
    }
    rafIds.push(
      requestAnimationFrame(() => {
        rafIds.push(requestAnimationFrame(startMap))
      })
    )
    return () => {
      cancelled = true
      rafIds.forEach((id) => cancelAnimationFrame(id))
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove() } catch (_) {}
        mapInstanceRef.current = null
      }
    }
  }, [mapContainerReady])

  // ─── Обновление маркеров — кластеры при отдалении, карточки при приближении ─
  const updateMapMarkers = useCallback(
    ({ fitBounds = false } = {}) => {
      const map = mapInstanceRef.current
      if (!map || !mapReady) return

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      const pointItems = buildMapPointItems(sortedProperties, getPropertyCoordinates)
      const markerItems = resolveMapMarkerItems(map, pointItems)
      const bounds = new maplibregl.LngLatBounds()
      let hasPoints = false

      let miniCardIndex = 0
      const compactPins = map.getZoom() < MAP_PIN_MINI_ZOOM

      markerItems.forEach((item) => {
        const lngLat = [item.lng, item.lat]
        hasPoints = true
        bounds.extend(lngLat)

        if (item.type === 'cluster') {
          const el = buildMapPinClusterElement(item, () => {
            const targetZoom = Math.min(
              Math.max(map.getZoom() + 2, MAP_PIN_MINI_ZOOM + 0.5),
              SATELLITE_MAP_MAX_ZOOM,
            )
            map.flyTo({ center: lngLat, zoom: targetZoom, duration: 650 })
            if (item.count === 1 && item.properties?.[0]) {
              setSelectedProperty(item.properties[0])
            }
          })

          scheduleMapPinMiniReveal(el, miniCardIndex)
          miniCardIndex += 1

          const marker = new maplibregl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat(lngLat)
            .addTo(map)

          markersRef.current.push(marker)
          return
        }

        const property = item.property
        const isSelected =
          selectedProperty != null && String(selectedProperty.id) === String(property.id)
        const priceStr = getMapMarkerPriceStr(property, formatPrice)

        const focusProperty = () => {
          setSelectedProperty(property)
          map.flyTo({
            center: lngLat,
            zoom: Math.min(Math.max(map.getZoom(), MAP_PIN_MINI_ZOOM + 0.5), SATELLITE_MAP_MAX_ZOOM),
            duration: 700,
          })
          setMapOpenHintProperty(property)
        }

        const el = buildMapPinPointElement({
          property,
          isSelected,
          compact: compactPins,
          priceStr,
          onActivate: focusProperty,
        })

        scheduleMapPinMiniReveal(el, miniCardIndex)
        miniCardIndex += 1

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'bottom',
        })
          .setLngLat(lngLat)
          .addTo(map)

        markersRef.current.push(marker)
      })

      if (fitBounds && !selectedProperty && hasPoints) {
        map.fitBounds(bounds, {
          padding: { top: 80, right: 80, bottom: 80, left: 80 },
          maxZoom: Math.min(MAP_PIN_MINI_ZOOM - 1, SATELLITE_MAP_MAX_ZOOM),
          duration: 700,
        })
      }
    },
    [sortedProperties, selectedProperty, mapReady],
  )

  useEffect(() => {
    updateMapMarkers({ fitBounds: !selectedProperty })
  }, [sortedProperties, selectedProperty, mapReady, updateMapMarkers])

  useEffect(() => {
    if (!mapReady) return undefined
    const map = mapInstanceRef.current
    if (!map) return undefined

    const onZoomEnd = () => updateMapMarkers()
    map.on('zoomend', onZoomEnd)
    return () => {
      map.off('zoomend', onZoomEnd)
    }
  }, [mapReady, updateMapMarkers])

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

  // ─── Плавающая кнопка «Карта» на мобильных ───────────────────────────────
  useEffect(() => {
    if (mapExpanded) {
      setMapFabPhase('hidden')
      return undefined
    }

    const mapEl = mapWrapRef.current
    if (!mapEl) return undefined

    const root = getMainScrollEl()
    const observer = new IntersectionObserver(
      ([entry]) => {
        const wantShow = !entry.isIntersecting
        setMapFabPhase((prev) => {
          if (wantShow) return 'visible'
          if (prev === 'visible') return 'leaving'
          return prev
        })
      },
      {
        root,
        threshold: 0.08,
      },
    )

    observer.observe(mapEl)
    return () => observer.disconnect()
  }, [mapExpanded, mapContainerReady])

  const handleMapFabAnimationEnd = useCallback((event) => {
    if (event.animationName !== 'mapFabSlideOut') return
    setMapFabPhase((prev) => (prev === 'leaving' ? 'hidden' : prev))
  }, [])

  const scrollToMap = useCallback(() => {
    scrollMainTo(0, 0, 'smooth')
    mapWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
    window.setTimeout(() => mapInstanceRef.current?.resize(), 400)
  }, [])

  // ─── Прочие обработчики ──────────────────────────────────────────────────
  const toggleFavorite = async (e, property) => {
    e.stopPropagation()
    const mockCat = hasDbBackedProperty(property) ? undefined : 'recommended'
    await toggleFavoriteGlobal(property, mockCat)
  }

  const focusOnProperty = useCallback((property) => {
    const coords = getPropertyCoordinates(property)
    if (!coords) {
      showNotification('У объекта пока нет координат для отображения на карте')
      return
    }
    // flyTo вызывается здесь; маркеры обновятся через setSelectedProperty → useEffect
    mapInstanceRef.current?.flyTo({
      center: [coords[1], coords[0]],
      zoom: Math.min(MAP_PIN_MINI_ZOOM + 0.5, SATELLITE_MAP_MAX_ZOOM),
      duration: 700
    })
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
    <div className={`map-page-root${mapExpanded ? ' map-page-root--fs-map' : ''}`}>
      <div className="map-page-booking">
        <header className="map-page-back-bar">
          <PageBackButton onClick={() => navigate(-1)} />
        </header>

        <div className="map-page-main">
          <aside className="map-page-list">
            <div className={`map-list-search-bar${filtersMenuOpen ? ' is-filters-open' : ''}`}>
              <div className="map-list-search-block">
                <div className="map-list-search-toolbar">
                <div className="map-page-search-box">
                  <FiSearch className="map-page-search-box__icon" size={20} aria-hidden />
                  <input
                    type="text"
                    className="map-page-search-box__input"
                    inputMode="search"
                    enterKeyHint="search"
                    placeholder={t('mapSearchPlaceholder', { defaultValue: 'Название или адрес' })}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="map-page-search-box__clear"
                      onClick={() => setSearchQuery('')}
                      aria-label={t('clearSearch')}
                    >
                      <FiX size={22} aria-hidden />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className={`map-list-filters-burger${filtersMenuOpen ? ' is-open' : ''}${activeFilterCount > 0 ? ' has-active' : ''}`}
                  aria-expanded={filtersMenuOpen}
                  aria-controls="map-page-filters-panel"
                  aria-label={t('mapFiltersMenuAriaLabel', { defaultValue: 'Фильтры' })}
                  onClick={() => setFiltersMenuOpen((open) => !open)}
                >
                  <span className="map-list-filters-burger__icon" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                  {activeFilterCount > 0 ? (
                    <span className="map-list-filters-burger__badge" aria-hidden>
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
                </div>
                <MapPageFilters
                  id="map-page-filters-panel"
                  open={filtersMenuOpen}
                  filters={mapFilters}
                  onChange={setMapFilters}
                  priceBounds={priceBounds}
                />
              </div>
            </div>
            <p className="map-list-inline-count">
              {loading ? (
                <span className="map-list-count-skel" role="status" aria-busy="true">
                  <span className="map-list-count-skel__bar" />
                </span>
              ) : (
                <>
                  <strong>{sortedProperties.length}</strong> {t('mapFiltersObjects', { defaultValue: 'объектов' })}
                </>
              )}
            </p>

            <div className="map-list-scroll" aria-busy={loading}>
              {loading ? (
                <MapPagePropertyGridSkeletons count={MAP_LIST_SKELETON_COUNT} />
              ) : sortedProperties.length === 0 ? (
                <div className="map-list-empty">
                  <p>
                    {searchNormalized
                      ? t('noResultsHint')
                      : mapFilters.likedOnly
                        ? 'Пока нет понравившихся объектов на карте. Добавьте сердечком из списка.'
                        : 'Нет объектов для отображения'}
                  </p>
                </div>
              ) : (
                <MapPagePropertyGrid
                  properties={sortedProperties}
                  formatPrice={formatPrice}
                  isFavorite={(property) => isFavorite(property, null)}
                  onFavoriteToggle={toggleFavorite}
                  selectedProperty={selectedProperty}
                  user={user}
                  userLoaded={userLoaded}
                />
              )}
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
              <div className="map-page-map-toolbar">
                <PageBackButton
                  onClick={() => navigate(-1)}
                  className="page-back-button--icon-only map-page-map-toolbar__back"
                  iconSize={20}
                />
              </div>
            )}
            {!mapExpanded && (
              <button
                type="button"
                className="map-expand-btn"
                onClick={() => setMapExpanded(true)}
                aria-label={t('mapExpandBtnAriaLabel', { defaultValue: 'Развернуть карту' })}
              >
                <HiOutlineArrowsExpand size={18} aria-hidden />
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
                    {...buildResponsiveImageProps(
                      (Array.isArray(mapOpenHintProperty.images) && mapOpenHintProperty.images[0]) ||
                        '/images/external/photo-1522708323590-d24dbb6b0267-b4dd9c7026.jpg',
                      {
                        widths: [96, 160, 240],
                        sizes: '48px',
                        quality: 70,
                        fit: 'crop',
                      },
                    )}
                    alt=""
                  />
                </div>
                <div className="map-open-hint__main">
                  <p className="map-open-hint__label">Объект на карте</p>
                  <p className="map-open-hint__title">{mapOpenHintProperty.title}</p>
                  <p className="map-open-hint__price">
                    {formatPrice(
                      mapOpenHintProperty.price ?? mapOpenHintProperty.currentBid ?? 0,
                      mapOpenHintProperty.currency,
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="map-open-hint__cta"
                  onClick={() => {
                    if (!ensureCanOpenProperty(user && userLoaded)) return
                    navigate(getPropertyDetailPath(mapOpenHintProperty.id, {
                      property: mapOpenHintProperty,
                    }), { state: { property: mapOpenHintProperty } })
                  }}
                >
                  Открыть объект
                </button>
              </div>
            )}
            {mapExpanded && (
              <PageBackButton
                className="page-back-button--icon-only map-page-map-toolbar__back map-page-map-toolbar__back--fullscreen"
                onClick={() => setMapExpanded(false)}
                iconSize={20}
              />
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={[
          'map-float-map-btn',
          mapFabPhase === 'visible' && 'map-float-map-btn--visible',
          mapFabPhase === 'leaving' && 'map-float-map-btn--leaving',
        ].filter(Boolean).join(' ')}
        onClick={scrollToMap}
        onAnimationEnd={handleMapFabAnimationEnd}
        aria-label={t('mapFloatBtnAriaLabel', { defaultValue: 'Перейти к карте' })}
        aria-hidden={mapFabPhase === 'hidden'}
      >
        <span className="map-float-map-btn__label">{t('mapFloatBtnLabel', { defaultValue: 'Карта' })}</span>
        <FiMap size={18} aria-hidden />
      </button>
    </div>
  )
}

export default MapPage
