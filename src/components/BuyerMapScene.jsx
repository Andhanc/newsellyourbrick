import { useEffect, useRef } from 'react'
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

const MAP_FOCUS = {
  center: [-4.8864, 36.5108],
  zoom: 7.1,
}

const FEATURED_IMAGE = 'images/test-drive/property-marbella.png'

const metricCards = [
  { key: 'yield', label: 'Доходность', value: '+10.8%', Icon: FiTrendingUp, placement: 'tl' },
  { key: 'area', label: 'Площадь', value: '1 500 м²', Icon: FiGrid, placement: 'tr' },
  { key: 'beds', label: 'Спальни', value: '3 bed', Icon: FiHome, placement: 'bl' },
  { key: 'trust', label: 'Проверка', value: '99%', Icon: FiShield, placement: 'br' },
]

function disableMapInteraction(map) {
  map.scrollZoom.disable()
  map.dragPan.disable()
  map.boxZoom.disable()
  map.dragRotate.disable()
  map.keyboard.disable()
  map.doubleClickZoom.disable()
  map.touchZoomRotate.disable()
}

function focusMapOnSpain(map) {
  map.jumpTo({
    center: MAP_FOCUS.center,
    zoom: MAP_FOCUS.zoom,
  })
}

function MetricCard({ label, value, Icon, placement }) {
  return (
    <article className={`buyer-glass-card buyer-glass-card--${placement}`}>
      <span className="buyer-glass-card__icon" aria-hidden>
        <Icon />
      </span>
      <span className="buyer-glass-card__label">{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

export default function BuyerMapScene({ onCardClick }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)

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

    const onLoad = () => focusMapOnSpain(map)

    map.on('load', onLoad)
    if (map.loaded()) onLoad()

    let resizeRaf = null
    const queueResize = () => {
      if (resizeRaf != null) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null
        try {
          map.resize()
          focusMapOnSpain(map)
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
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="buyer-map-scene" aria-label="Карта с объектом">
      <div className="buyer-map-scene__map" ref={mapContainerRef} aria-hidden />

      <div className="buyer-map-scene__metrics" aria-label="Показатели объекта">
        {metricCards.map((card) => (
          <MetricCard key={card.key} {...card} />
        ))}
      </div>

      <div className="buyer-map-scene__marker" aria-label="Выбранный объект">
        <article className="buyer-map-marker__card">
          <div className="buyer-map-marker__media">
            <img src={publicAsset(FEATURED_IMAGE)} alt="" loading="eager" decoding="async" />
            <span className="buyer-map-marker__badge">New</span>
          </div>
          <div className="buyer-map-marker__body">
            <h2>Luxury Oceanfront Villa</h2>
            <p>
              <FiMapPin aria-hidden />
              Marbella, Costa del Sol
            </p>
            <footer>
              <strong>$520,000</strong>
              <em>+10.8%</em>
              <button type="button" onClick={() => onCardClick?.('Luxury Oceanfront Villa')}>
                Подробнее
              </button>
            </footer>
          </div>
        </article>
        <span className="buyer-map-marker__tail" aria-hidden />
        <span className="buyer-map-marker__point" aria-hidden />
      </div>
    </div>
  )
}
