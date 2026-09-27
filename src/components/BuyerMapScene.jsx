import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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

const FEATURED_IMAGE = 'images/test-drive/property-marbella-card.jpg'

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
  const { t } = useTranslation()
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)

  const metricCards = useMemo(
    () => [
      { key: 'yield', label: t('buyerPage_mapYield'), value: '+10.8%', Icon: FiTrendingUp, placement: 'tl' },
      { key: 'area', label: t('buyerPage_mapArea'), value: '1 500 м²', Icon: FiGrid, placement: 'tr' },
      { key: 'beds', label: t('buyerPage_mapBeds'), value: t('buyerPage_mapBedsValue'), Icon: FiHome, placement: 'bl' },
      { key: 'trust', label: t('buyerPage_mapTrust'), value: '99%', Icon: FiShield, placement: 'br' },
    ],
    [t],
  )

  const featuredTitle = t('buyerPage_mapFeaturedTitle')

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
    <div className="buyer-map-scene" aria-label={t('buyerPage_mapAria')}>
      <div className="buyer-map-scene__map" ref={mapContainerRef} aria-hidden />

      <div className="buyer-map-scene__metrics" aria-label={t('buyerPage_mapMetricsAria')}>
        {metricCards.map((card) => (
          <MetricCard key={card.key} {...card} />
        ))}
      </div>

      <div className="buyer-map-scene__marker" aria-label={t('buyerPage_mapSelectedAria')}>
        <article className="buyer-map-marker__card">
          <div className="buyer-map-marker__media">
            <img
              src={publicAsset(FEATURED_IMAGE)}
              alt=""
              width={520}
              height={325}
              loading="eager"
              decoding="async"
            />
            <span className="buyer-map-marker__badge">{t('buyerPage_mapBadgeNew')}</span>
          </div>
          <div className="buyer-map-marker__body">
            <h2>{featuredTitle}</h2>
            <p>
              <FiMapPin aria-hidden />
              {t('buyerPage_mapFeaturedLocation')}
            </p>
            <footer>
              <strong>$520,000</strong>
              <em>+10.8%</em>
              <button type="button" onClick={() => onCardClick?.(featuredTitle)}>
                {t('buyerPage_mapLearnMore')}
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
