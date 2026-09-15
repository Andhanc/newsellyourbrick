import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'
import { showNotification } from '../utils/toastHelper'
import { useNavigate } from 'react-router-dom'
import { FiArrowUpRight, FiMapPin, FiX, FiMap, FiSearch, FiMinimize2 } from 'react-icons/fi'
import { MdDirectionsWalk } from 'react-icons/md'
import { MapPinned } from 'lucide-react'
import PageBackButton from '../components/PageBackButton'
import PropertyStreetViewDrawer from '../components/PropertyStreetViewDrawer'
import MapPagePropertyGrid, { MapPagePropertyGridSkeletons } from '../components/MapPagePropertyGrid'
import MapPageFilters from '../components/MapPageFilters'
import BuyerEmptyState from '../components/buyer-mobile/BuyerEmptyState'
import BuyerSheetShell from '../components/buyer-mobile/BuyerSheetShell'
import { useTranslation } from 'react-i18next'
import { HiOutlineArrowsExpand } from 'react-icons/hi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { SATELLITE_MAP_MAX_ZOOM } from '../utils/mapStyles'
import {
  createYandexMap,
  createYandexMarker,
  SimpleLngLatBounds,
  YANDEX_MAP_TYPE_SATELLITE,
} from '../utils/yandexMapEngine'
import '../utils/yandexMapChrome.css'
import { toYandexMapsLang } from '../utils/yandexMapsLang'
import { fetchNominatimFirst } from '../utils/oapLocationGeocode'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import { requestOpenLoginModal } from '../utils/requestOpenLoginModal'
import { isSiteUserSignedIn } from '../utils/siteAuthGate'
import { usePropertyFavorites } from '../context/PropertyFavoritesContext'
import { hasDbBackedProperty } from '../utils/propertyFavoriteKey'
import { getMainScrollEl, scrollMainTo } from '../utils/mainScroll'
import { buildResponsiveImageProps } from '../utils/responsiveImage'
import { formatPropertyPrice } from '../utils/currency'
import {
  applyPropertyImageFallback,
  PROPERTY_CARD_IMAGE_FALLBACK,
} from '../utils/propertyImage'
import './MapPage.css'
import { getPropertyDetailPath, auctionListingDedupeKey } from '../utils/propertyDetailUrl'
import {
  EMPTY_MAP_FILTERS,
  applyMapPageFilters,
  getMapPriceBounds,
  countActiveMapFilters,
} from '../utils/mapPageFilters'
import { isSoldPropertyListing } from '../utils/auctionReminderBounds'
import MapTypeSwitcherButton from '../components/MapTypeSwitcherButton'

const MAP_LIST_SKELETON_COUNT = 6
const MAP_PIN_MINI_ZOOM = 15
/** Ближе к максимуму спутника — чтобы объект был крупно в кадре. */
const MAP_FOCUS_ZOOM = Math.min(SATELLITE_MAP_MAX_ZOOM, 17)
const MAP_PIN_CLUSTER_RADIUS_PX = 84
const MAP_PIN_MINI_APPEAR_DELAY_MS = 280
const MAP_PIN_MINI_STAGGER_MS = 40
const MAP_PIN_THUMB_FALLBACK = PROPERTY_CARD_IMAGE_FALLBACK
const MAP_SHEET_HALF_MAX_PX = 500
const MAP_SHEET_HALF_VH = 0.54
const MAP_SHEET_PEEK_PX = 176

function getMapSheetHeightPx(sheetState, mapExpanded) {
  if (mapExpanded || typeof window === 'undefined') return 0
  if (sheetState === 'peek') return MAP_SHEET_PEEK_PX
  if (sheetState === 'expanded') return window.innerHeight
  return Math.min(window.innerHeight * MAP_SHEET_HALF_VH, MAP_SHEET_HALF_MAX_PX)
}

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

function buildMapPinClusterElement(item, onActivate, clusterTitle) {
  const el = document.createElement('div')
  el.className = 'map-pin-thumb-stack map-pin-thumb-stack--enter'
  el.setAttribute('role', 'button')
  el.title = clusterTitle || `${item.count}`

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
  showOnMapLabel,
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
  el.title = property.title || showOnMapLabel || ''

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
    const hit = await fetchNominatimFirst(query)
    const lat = hit?.lat != null ? parseFloat(hit.lat) : NaN
    const lng = hit?.lon != null ? parseFloat(hit.lon) : NaN
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    const coords = [lat, lng]
    try { localStorage.setItem(cacheKey, JSON.stringify(coords)) } catch (_) {}
    return coords
  } catch (_) { return null }
}


const MapPage = () => {
  const { t, i18n } = useTranslation()
  const mapsLang = toYandexMapsLang(i18n.language)
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
  const [mapType, setMapType] = useState(YANDEX_MAP_TYPE_SATELLITE)
  const mapTypeRef = useRef(mapType)
  mapTypeRef.current = mapType
  const geocodeInFlightRef = useRef(false)
  const [mapExpanded, setMapExpanded] = useState(false)
  /** Подсказка сверху карты после тапа по маркеру / «Показать» */
  const [mapOpenHintProperty, setMapOpenHintProperty] = useState(null)
  const [streetViewProperty, setStreetViewProperty] = useState(null)
  const [mapFabPhase, setMapFabPhase] = useState('hidden') // hidden | visible | leaving
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768,
  )
  const [resultsSheetState, setResultsSheetState] = useState('half')

  const formatPrice = (n, currency = 'USD') =>
    formatPropertyPrice(n, currency, { locale: 'en-US' })

  const getPropertyCoordinates = (property) => {
    if (property?.coordinates && Array.isArray(property.coordinates) && property.coordinates.length >= 2) {
      return [property.coordinates[0], property.coordinates[1]]
    }
    return null
  }

  useEffect(() => {
    const syncViewport = () => setIsMobile(window.innerWidth <= 768)
    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  const cycleResultsSheet = () => {
    setResultsSheetState((current) => {
      if (current === 'peek') return 'half'
      if (current === 'half') return 'expanded'
      return 'peek'
    })
  }

  /**
   * Nested scroll блока «N объектов»:
   * 1) пока sheet не на весь экран — жест двигает sheet (half/peek → expanded);
   * 2) на полном раскрытии — скролл списка карточек;
   * 3) у верха списка обратный жест снова сворачивает sheet к half.
   * scrollDelta > 0 = «в контент» (wheel вниз / палец вверх).
   */
  const resultsSheetRef = useRef(null)
  const listScrollRef = useRef(null)
  const sheetGestureStartYRef = useRef(null)
  const resultsSheetStateRef = useRef(resultsSheetState)
  resultsSheetStateRef.current = resultsSheetState
  const SHEET_GESTURE_PX = 28
  const SHEET_WHEEL_PX = 10

  const expandResultsSheet = useCallback(() => {
    if (!isMobile) return
    setResultsSheetState((current) => (current === 'expanded' ? current : 'expanded'))
  }, [isMobile])

  const collapseResultsSheet = useCallback(() => {
    if (!isMobile) return
    const el = listScrollRef.current
    if (el) el.scrollTop = 0
    setResultsSheetState((current) => (current === 'half' || current === 'peek' ? current : 'half'))
  }, [isMobile])

  const isResultsListAtTop = useCallback(() => {
    const el = listScrollRef.current
    return !el || el.scrollTop <= 1
  }, [])

  const applyNestedSheetScroll = useCallback(
    (scrollDelta, threshold = SHEET_GESTURE_PX) => {
      if (!isMobile) return false
      const state = resultsSheetStateRef.current
      if (scrollDelta > threshold) {
        if (state !== 'expanded') {
          expandResultsSheet()
          return true
        }
        return false
      }
      if (scrollDelta < -threshold) {
        if (state === 'expanded' && isResultsListAtTop()) {
          collapseResultsSheet()
          return true
        }
        // Пока sheet не раскрыт — глотаем обратный жест, чтобы список не уезжал.
        if (state !== 'expanded') return true
      }
      return false
    },
    [isMobile, expandResultsSheet, collapseResultsSheet, isResultsListAtTop],
  )

  useEffect(() => {
    if (!isMobile) return undefined
    const root = resultsSheetRef.current
    if (!root) return undefined

    const onTouchStart = (event) => {
      if (event.touches.length !== 1) {
        sheetGestureStartYRef.current = null
        return
      }
      const target = event.target
      if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) {
        sheetGestureStartYRef.current = null
        return
      }
      sheetGestureStartYRef.current = event.touches[0].clientY
    }

    const onTouchMove = (event) => {
      if (event.touches.length !== 1) return
      const startY = sheetGestureStartYRef.current
      if (startY == null) return
      const currentY = event.touches[0].clientY
      const scrollDelta = startY - currentY
      const state = resultsSheetStateRef.current

      if (state !== 'expanded') {
        if (applyNestedSheetScroll(scrollDelta)) {
          event.preventDefault()
          sheetGestureStartYRef.current = currentY
        }
        return
      }

      if (scrollDelta < -SHEET_GESTURE_PX && isResultsListAtTop()) {
        event.preventDefault()
        collapseResultsSheet()
        sheetGestureStartYRef.current = currentY
      }
    }

    const onWheel = (event) => {
      const state = resultsSheetStateRef.current
      if (state !== 'expanded') {
        if (applyNestedSheetScroll(event.deltaY, SHEET_WHEEL_PX)) {
          event.preventDefault()
        }
        return
      }
      if (event.deltaY < -SHEET_WHEEL_PX && isResultsListAtTop()) {
        event.preventDefault()
        collapseResultsSheet()
      }
    }

    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('wheel', onWheel)
    }
  }, [isMobile, applyNestedSheetScroll, collapseResultsSheet, isResultsListAtTop])

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
      .slice(0, 12)
    if (missing.length === 0) return
    geocodeInFlightRef.current = true
    let cancelled = false
    ;(async () => {
      for (const p of missing) {
        if (cancelled) break
        const coords = await geocodeAddress(p.location)
        if (coords && !cancelled) setPropertiesList((prev) => prev.map((x) => x.id === p.id ? { ...x, coordinates: coords } : x))
        await sleep(400)
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
    if (!container) return
    let cancelled = false
    const rafIds = []
    const startMap = () => {
      if (cancelled || !container.isConnected || mapInstanceRef.current) return
      createYandexMap(container, {
        center: [27.5666, 53.9138],
        zoom: 11,
        minZoom: 2,
        maxZoom: SATELLITE_MAP_MAX_ZOOM,
        type: mapTypeRef.current,
        lang: mapsLang,
      })
        .then((map) => {
          if (cancelled) {
            map.remove()
            return
          }
          mapInstanceRef.current = map
          map.resize()
          setTimeout(() => map.resize(), 400)
          setMapReady(true)
        })
        .catch((e) => {
          console.error('Ошибка инициализации карты:', e)
        })
    }
    rafIds.push(
      requestAnimationFrame(() => {
        rafIds.push(requestAnimationFrame(startMap))
      })
    )
    return () => {
      cancelled = true
      rafIds.forEach((id) => cancelAnimationFrame(id))
      setMapReady(false)
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove() } catch (_) {}
        mapInstanceRef.current = null
      }
    }
  }, [mapContainerReady, mapsLang])

  // ─── Обновление маркеров — кластеры при отдалении, карточки при приближении ─
  const updateMapMarkers = useCallback(
    ({ fitBounds = false } = {}) => {
      const map = mapInstanceRef.current
      if (!map || !mapReady) return

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      const pointItems = buildMapPointItems(sortedProperties, getPropertyCoordinates)
      const markerItems = resolveMapMarkerItems(map, pointItems)
      const bounds = new SimpleLngLatBounds()
      let hasPoints = false

      let miniCardIndex = 0
      const compactPins = map.getZoom() < MAP_PIN_MINI_ZOOM

      markerItems.forEach((item) => {
        const lngLat = [item.lng, item.lat]
        hasPoints = true
        bounds.extend(lngLat)

        if (item.type === 'cluster') {
          const el = buildMapPinClusterElement(
            item,
            () => {
              const targetZoom = Math.min(
                Math.max(map.getZoom() + 2, MAP_PIN_MINI_ZOOM + 0.5),
                SATELLITE_MAP_MAX_ZOOM,
              )
              map.flyTo({ center: lngLat, zoom: targetZoom, duration: 650 })
              if (item.count === 1 && item.properties?.[0]) {
                setSelectedProperty(item.properties[0])
                if (isMobile) setResultsSheetState('half')
              }
            },
            t('mapPage_clusterCountTitle', { count: item.count }),
          )

          scheduleMapPinMiniReveal(el, miniCardIndex)
          miniCardIndex += 1

          const marker = createYandexMarker(map, {
            element: el,
            lngLat,
          })

          markersRef.current.push(marker)
          return
        }

        const property = item.property
        const isSelected =
          selectedProperty != null && String(selectedProperty.id) === String(property.id)
        const priceStr = getMapMarkerPriceStr(property, formatPrice)

        const focusProperty = () => {
          setSelectedProperty(property)
          if (isMobile) setResultsSheetState('half')
          setMapOpenHintProperty(property)
          const runFly = () => {
            map.resize()
            const sheetPad = isMobile
              ? getMapSheetHeightPx('half', mapExpanded)
              : 0
            map.flyTo({
              center: lngLat,
              zoom: MAP_FOCUS_ZOOM,
              duration: 700,
              padding: {
                top: isMobile ? 72 : 80,
                right: 24,
                bottom: sheetPad + 12,
                left: 24,
              },
            })
          }
          window.setTimeout(runFly, isMobile ? 40 : 0)
        }

        const el = buildMapPinPointElement({
          property,
          isSelected,
          compact: compactPins,
          priceStr,
          onActivate: focusProperty,
          showOnMapLabel: t('mapPage_showOnMap'),
        })

        scheduleMapPinMiniReveal(el, miniCardIndex)
        miniCardIndex += 1

        const marker = createYandexMarker(map, {
          element: el,
          lngLat,
        })

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
    [sortedProperties, selectedProperty, mapReady, isMobile, mapExpanded, t],
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
    if (!mapExpanded) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMapExpanded(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
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
      showNotification(t('mapPage_noCoordsNotify'))
      return
    }
    if (isMobile) setResultsSheetState('half')
    setSelectedProperty(property)
    setMapOpenHintProperty(property)

    const runFly = () => {
      const map = mapInstanceRef.current
      if (!map) return
      map.resize()
      const sheetPad = isMobile ? getMapSheetHeightPx('half', mapExpanded) : 0
      map.flyTo({
        center: [coords[1], coords[0]],
        zoom: MAP_FOCUS_ZOOM,
        duration: 700,
        padding: {
          top: isMobile ? 72 : 80,
          right: 24,
          bottom: sheetPad + 12,
          left: 24,
        },
      })
    }

    // Даём sheet начать сворачиваться, затем центрируем с учётом padding.
    window.setTimeout(runFly, isMobile ? 40 : 0)
    window.setTimeout(() => mapInstanceRef.current?.resize(), 360)

    const wrap = mapWrapRef.current
    if (wrap && !mapExpanded) {
      requestAnimationFrame(() => {
        wrap.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
      })
    }
  }, [isMobile, mapExpanded, t])

  // ─── Рендер ──────────────────────────────────────────────────────────────
  return (
    <div className={`map-page-root map-page-root--sheet-${resultsSheetState}${mapExpanded ? ' map-page-root--fs-map' : ''}`}>
      <div className="map-page-booking">
        <header className="map-page-back-bar">
          <PageBackButton onClick={() => navigate(-1)} />
        </header>

        <div className="map-page-main">
          <aside
            ref={resultsSheetRef}
            className={`map-page-list map-page-list--${resultsSheetState}`}
          >
            <div className="map-results-sheet__chrome">
            <button
              type="button"
              className="map-results-sheet__handle"
              onClick={cycleResultsSheet}
              aria-controls="map-results-scroll"
              aria-expanded={resultsSheetState === 'expanded'}
              aria-label={
                resultsSheetState === 'expanded'
                  ? t('mapPage_collapseListAria')
                  : t('mapPage_expandListAria')
              }
            >
              <span aria-hidden />
              <strong>
                {loading
                  ? t('mapPage_searching')
                  : `${sortedProperties.length} ${t('mapFiltersObjects')}`}
              </strong>
            </button>
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
                    placeholder={t('mapSearchPlaceholder')}
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
                  aria-label={t('mapFiltersMenuAriaLabel')}
                  onClick={() => {
                    if (isMobile) {
                      setFiltersMenuOpen(true)
                      return
                    }
                    setFiltersMenuOpen((open) => !open)
                  }}
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
                {!isMobile ? (
                  <MapPageFilters
                    id="map-page-filters-panel"
                    open={filtersMenuOpen}
                    filters={mapFilters}
                    onChange={setMapFilters}
                    priceBounds={priceBounds}
                  />
                ) : null}
              </div>
            </div>
            <p className="map-list-inline-count">
              {loading ? (
                <span className="map-list-count-skel" role="status" aria-busy="true">
                  <span className="map-list-count-skel__bar" />
                </span>
              ) : (
                <>
                  <strong>{sortedProperties.length}</strong> {t('mapFiltersObjects')}
                </>
              )}
            </p>
            </div>

            <div
              id="map-results-scroll"
              ref={listScrollRef}
              className="map-list-scroll"
              aria-busy={loading}
            >
              {loading ? (
                <MapPagePropertyGridSkeletons count={MAP_LIST_SKELETON_COUNT} />
              ) : sortedProperties.length === 0 ? (
                <BuyerEmptyState
                  className="map-list-empty"
                  icon={MapPinned}
                  eyebrow={t('mapPage_emptyEyebrow')}
                  title={mapFilters.likedOnly ? t('mapPage_emptyTitleLiked') : t('mapPage_emptyTitle')}
                  description={
                    searchNormalized
                      ? t('mapPage_emptyDescSearch')
                      : mapFilters.likedOnly
                        ? t('mapPage_emptyDescLiked')
                        : t('mapPage_emptyDescFilters')
                  }
                  primaryLabel={
                    mapFilters.likedOnly ? t('mapPage_emptyPrimaryLiked') : t('mapPage_emptyPrimaryReset')
                  }
                  onPrimary={() => {
                    setMapFilters(EMPTY_MAP_FILTERS)
                    setSearchQuery('')
                  }}
                  secondaryLabel={t('mapPage_emptySecondaryCatalog')}
                  onSecondary={() => navigate('/auction')}
                />
              ) : (
                <MapPagePropertyGrid
                  properties={sortedProperties}
                  formatPrice={formatPrice}
                  isFavorite={(property) => isFavorite(property, null)}
                  onFavoriteToggle={toggleFavorite}
                  onFocusOnMap={focusOnProperty}
                  selectedProperty={selectedProperty}
                  user={user}
                  userLoaded={userLoaded}
                />
              )}
            </div>
          </aside>

          <div
            ref={mapWrapRef}
            className={[
              'map-page-map-wrap',
              mapExpanded ? 'map-page-map-wrap--fullscreen' : '',
              mapOpenHintProperty ? 'map-page-map-wrap--hint-open' : '',
            ].filter(Boolean).join(' ')}
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
            <button
              type="button"
              className={`map-expand-btn${mapExpanded ? ' map-expand-btn--collapse' : ''}`}
              onClick={() => setMapExpanded((expanded) => !expanded)}
              aria-label={mapExpanded
                ? t('mapCollapseBtnAriaLabel')
                : t('mapExpandBtnAriaLabel')}
              title={mapExpanded ? t('mapPage_collapseTitle') : t('mapPage_expandTitle')}
              aria-pressed={mapExpanded}
            >
              {mapExpanded
                ? <FiMinimize2 size={18} aria-hidden />
                : <HiOutlineArrowsExpand size={18} aria-hidden />}
            </button>
            <div className="map-page-zoom" role="group" aria-label="Масштаб карты">
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn({ duration: 200 })}
                aria-label="Увеличить"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut({ duration: 200 })}
                aria-label="Уменьшить"
              >
                −
              </button>
            </div>
            <MapTypeSwitcherButton
              mapType={mapType}
              onChange={(nextType) => {
                setMapType(nextType)
                mapInstanceRef.current?.setType?.(nextType)
              }}
              className="map-type-btn"
              iconSize={18}
            />
            {mapOpenHintProperty && (
              <div
                className={`map-open-hint ${mapExpanded ? 'map-open-hint--fullscreen' : ''}`}
                role="dialog"
                aria-labelledby="map-open-hint-title"
              >
                <div className="map-open-hint__thumb">
                  <img
                    {...buildResponsiveImageProps(
                      (Array.isArray(mapOpenHintProperty.images) && mapOpenHintProperty.images[0]) ||
                        '/images/external/photo-1522708323590-d24dbb6b0267-b4dd9c7026.jpg',
                      {
                        widths: [128, 192, 256],
                        sizes: '(max-width: 520px) 64px, 72px',
                        quality: 76,
                        fit: 'crop',
                      },
                    )}
                    alt=""
                    onError={applyPropertyImageFallback}
                  />
                </div>
                <div className="map-open-hint__main">
                  <p className="map-open-hint__label">{t('mapPage_hintLabel')}</p>
                  <p id="map-open-hint-title" className="map-open-hint__title">
                    {mapOpenHintProperty.title}
                  </p>
                  <p className="map-open-hint__price">
                    {formatPrice(
                      mapOpenHintProperty.price ?? mapOpenHintProperty.currentBid ?? 0,
                      mapOpenHintProperty.currency,
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className="map-open-hint__dismiss"
                  onClick={() => setMapOpenHintProperty(null)}
                  aria-label={t('mapPage_dismissHintAria')}
                >
                  <FiX size={18} aria-hidden />
                </button>
                <div className="map-open-hint__actions">
                  <button
                    type="button"
                    className="map-open-hint__action map-open-hint__action--street-view"
                    onClick={() => setStreetViewProperty(mapOpenHintProperty)}
                    aria-haspopup="dialog"
                    aria-expanded={Boolean(streetViewProperty)}
                  >
                    <span className="map-open-hint__action-icon" aria-hidden>
                      <MdDirectionsWalk size={21} />
                    </span>
                    <span>{t('mapPage_streetView')}</span>
                  </button>
                  <button
                    type="button"
                    className="map-open-hint__action map-open-hint__action--property btn-tiffany-shine"
                    onClick={() => {
                      if (!ensureCanOpenProperty(user && userLoaded)) return
                      navigate(getPropertyDetailPath(mapOpenHintProperty.id, {
                        property: mapOpenHintProperty,
                      }), { state: { property: mapOpenHintProperty } })
                    }}
                  >
                    <span className="map-open-hint__action-icon" aria-hidden>
                      <FiArrowUpRight size={18} />
                    </span>
                    <span>{t('mapPage_openProperty')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isMobile ? (
        <BuyerSheetShell
          isOpen={filtersMenuOpen}
          onClose={() => setFiltersMenuOpen(false)}
          titleId="map-mobile-filters-title"
          describedBy="map-mobile-filters-description"
          tone="choice"
          className="map-filters-sheet"
          footer={(
            <div className="map-filters-sheet__actions">
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  className="map-filters-sheet__reset"
                  onClick={() => setMapFilters({ ...EMPTY_MAP_FILTERS })}
                >
                  {t('mapFiltersReset')}
                </button>
              ) : null}
              <button
                type="button"
                className="map-filters-sheet__apply"
                onClick={() => {
                  setFiltersMenuOpen(false)
                  setResultsSheetState('half')
                }}
              >
                {t('mapPage_showCount', { count: sortedProperties.length })}
              </button>
            </div>
          )}
        >
          <div className="map-filters-sheet__head">
            <p>{t('mapSearch')}</p>
            <h2 id="map-mobile-filters-title">{t('mapPage_filtersSheetTitle')}</h2>
            <span id="map-mobile-filters-description">
              {t('mapPage_filtersSheetDesc')}
            </span>
          </div>
          <MapPageFilters
            id="map-mobile-filters-panel"
            open
            filters={mapFilters}
            onChange={setMapFilters}
            priceBounds={priceBounds}
          />
        </BuyerSheetShell>
      ) : null}

      <PropertyStreetViewDrawer
        isOpen={Boolean(streetViewProperty)}
        onClose={() => setStreetViewProperty(null)}
        center={getPropertyCoordinates(streetViewProperty)}
      />

      <button
        type="button"
        className={[
          'map-float-map-btn',
          mapFabPhase === 'visible' && 'map-float-map-btn--visible',
          mapFabPhase === 'leaving' && 'map-float-map-btn--leaving',
        ].filter(Boolean).join(' ')}
        onClick={scrollToMap}
        onAnimationEnd={handleMapFabAnimationEnd}
        aria-label={t('mapFloatBtnAriaLabel')}
        aria-hidden={mapFabPhase === 'hidden'}
      >
        <span className="map-float-map-btn__label">{t('mapFloatBtnLabel')}</span>
        <FiMap size={18} aria-hidden />
      </button>
    </div>
  )
}

export default MapPage
