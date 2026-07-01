import { useCallback, useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  FiGrid,
  FiHome,
  FiMapPin,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi'
import { BUYER_HERO_MAP_STYLE } from '@/utils/mapStyles'
import { publicAsset } from '@/utils/publicAsset'

const FEATURED_PROPERTY = {
  lat: 36.5108,
  lng: -4.8864,
  label: 'Marbella',
}

/** Точки только по Испании — равномерно вокруг центральной карточки */
const mapPins = [
  {
    lat: 40.4168,
    lng: -3.7038,
    image: 'images/sellyourbrick/about/about-category-shares.jpg',
    label: 'Madrid',
  },
  {
    lat: 41.3874,
    lng: 2.1686,
    image: 'images/test-drive/property-marbella.png',
    label: 'Barcelona',
  },
  {
    lat: 39.4699,
    lng: -0.3763,
    image: 'images/sellyourbrick/about/about-category-buynow.jpg',
    label: 'Valencia',
  },
  {
    lat: 37.3891,
    lng: -5.9845,
    image: 'images/test-drive/property-paphos.png',
    label: 'Sevilla',
  },
  {
    lat: 36.527,
    lng: -6.2886,
    image: 'images/sellyourbrick/about/about-category-auction.jpg',
    label: 'Cádiz',
  },
  {
    lat: 36.834,
    lng: -2.4637,
    image: 'images/test-drive/property-nice.png',
    label: 'Almería',
  },
  {
    lat: 43.263,
    lng: -2.935,
    image: 'images/sellyourbrick/about/about-hero-villa.jpg',
    label: 'Bilbao',
  },
]

const hubGlassCards = [
  { key: 'yield', label: 'Доходность', value: '+10.8%', Icon: FiTrendingUp, placement: 'tl' },
  { key: 'area', label: 'Площадь', value: '1 500 м²', Icon: FiGrid, placement: 'tr' },
  { key: 'beds', label: 'Спальни', value: '3 bed', Icon: FiHome, placement: 'bl' },
  { key: 'trust', label: 'Проверка', value: '99%', Icon: FiShield, placement: 'br' },
]

const MAP_FOCUS = {
  center: [FEATURED_PROPERTY.lng, FEATURED_PROPERTY.lat],
  zoom: 6.35,
}

function disableMapInteraction(map) {
  map.scrollZoom.disable()
  map.dragPan.disable()
  map.boxZoom.disable()
  map.dragRotate.disable()
  map.keyboard.disable()
  map.doubleClickZoom.disable()
  map.touchZoomRotate.disable()
}

function createPhotoPin(imageSrc, label) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'buyer-map-pin'
  button.setAttribute('aria-label', `Открыть объекты ${label}`)

  const ring = document.createElement('span')
  ring.className = 'buyer-map-pin__ring'

  const photo = document.createElement('span')
  photo.className = 'buyer-map-pin__photo'

  const img = document.createElement('img')
  img.src = imageSrc
  img.alt = ''
  img.loading = 'lazy'
  img.decoding = 'async'

  const stem = document.createElement('span')
  stem.className = 'buyer-map-pin__stem'
  stem.setAttribute('aria-hidden', 'true')

  photo.appendChild(img)
  ring.appendChild(photo)
  button.append(ring, stem)

  return button
}

function focusMapOnSpain(map) {
  map.jumpTo({
    center: MAP_FOCUS.center,
    zoom: MAP_FOCUS.zoom,
  })
}

export default function BuyerMapScene({ onPinClick, onCardClick }) {
  const sceneRef = useRef(null)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const onPinClickRef = useRef(onPinClick)
  const [hubStyle, setHubStyle] = useState({ opacity: 0 })

  onPinClickRef.current = onPinClick

  const syncHubLayout = useCallback(() => {
    const sceneRect = sceneRef.current?.getBoundingClientRect()
    if (!sceneRect) return

    setHubStyle({
      left: `${sceneRect.width * 0.5}px`,
      top: `${sceneRect.height * 0.5}px`,
      opacity: 1,
    })
  }, [])

  useEffect(() => {
    const container = mapContainerRef.current
    if (!container || mapRef.current) return undefined

    const map = new maplibregl.Map({
      container,
      style: BUYER_HERO_MAP_STYLE,
      center: MAP_FOCUS.center,
      zoom: MAP_FOCUS.zoom,
      minZoom: 5,
      maxZoom: 9,
      attributionControl: false,
      fadeDuration: 0,
      renderWorldCopies: false,
    })

    disableMapInteraction(map)
    mapRef.current = map

    const markers = []

    const addMarkers = () => {
      markers.forEach((marker) => marker.remove())
      markers.length = 0

      focusMapOnSpain(map)

      mapPins.forEach((pin) => {
        const el = createPhotoPin(publicAsset(pin.image), pin.label)
        el.addEventListener('click', () => onPinClickRef.current?.(pin.label))

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
          offset: [0, -8],
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map)

        markers.push(marker)
      })

      syncHubLayout()
    }

    map.on('load', addMarkers)
    if (map.loaded()) addMarkers()

    let resizeRaf = null
    const queueResize = () => {
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null
        try {
          map.resize()
          focusMapOnSpain(map)
          syncHubLayout()
        } catch {
          // ignore
        }
      })
    }

    const resizeObserver = new ResizeObserver(queueResize)
    resizeObserver.observe(container)
    queueResize()

    return () => {
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf)
      resizeObserver.disconnect()
      markers.forEach((marker) => marker.remove())
      map.remove()
      mapRef.current = null
    }
  }, [syncHubLayout])

  return (
    <div className="buyer-map-scene" ref={sceneRef} aria-label="Карта с объектом">
      <div className="buyer-map-scene__map" ref={mapContainerRef} aria-hidden />

      <div className="buyer-map-scene__glass" aria-label="Характеристики объекта">
        {hubGlassCards.map(({ key, label, value, Icon, placement }) => (
          <article className={`buyer-glass-card buyer-glass-card--${placement}`} key={key}>
            <span className="buyer-glass-card__icon" aria-hidden>
              <Icon />
            </span>
            <span className="buyer-glass-card__label">{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="buyer-map-scene__hub" style={hubStyle}>
        <article className="buyer-map-card">
          <span className="buyer-map-card__badge">New</span>
          <h2>Luxury Oceanfront Villa</h2>
          <p>
            <FiMapPin aria-hidden />
            Marbella, Costa del Sol, Spain
          </p>
          <footer>
            <div>
              <strong>$520,000</strong>
              <em>+10.8%</em>
            </div>
            <button type="button" onClick={() => onCardClick?.('Luxury Oceanfront Villa')}>
              Подробнее
            </button>
          </footer>
          <span className="buyer-map-card__anchor" aria-hidden />
        </article>
      </div>
    </div>
  )
}
