import { loadYandexMaps } from './yandexMapsLoader'
import { STREET_MAP_MAX_ZOOM } from './mapStyles'

const containerAdapters = new WeakMap()

function toLatLng([lng, lat]) {
  return [lat, lng]
}

function fromLatLng([lat, lng]) {
  return [lng, lat]
}

function destroyAdapterOnContainer(container) {
  const existing = containerAdapters.get(container)
  if (!existing) return
  containerAdapters.delete(container)
  try {
    existing.remove()
  } catch {
    // ignore
  }
  try {
    container.replaceChildren()
  } catch {
    // ignore
  }
}

function createHtmlMarkerLayout(ymaps, element) {
  const HtmlMarkerLayout = ymaps.templateLayoutFactory.createClass(
    '<div class="yandex-html-marker-root"></div>',
    {
      build() {
        HtmlMarkerLayout.superclass.build.call(this)
        const parent = this.getParentElement?.() || this.getElement?.()
        const root = parent?.querySelector?.('.yandex-html-marker-root') || parent
        if (root && element && element.parentNode !== root) {
          root.replaceChildren(element)
        }
      },
      clear() {
        if (element?.parentNode) {
          element.parentNode.removeChild(element)
        }
        HtmlMarkerLayout.superclass.clear.call(this)
      },
      getShape() {
        try {
          if (!element || !ymaps.shape?.Rectangle || !ymaps.geometry?.pixel?.Rectangle) return null
          const width = Math.max(element.offsetWidth || 28, 16)
          const height = Math.max(element.offsetHeight || 36, 16)
          return new ymaps.shape.Rectangle(
            new ymaps.geometry.pixel.Rectangle([
              [-width / 2, -height],
              [width / 2, 0],
            ]),
          )
        } catch {
          return null
        }
      },
    },
  )
  return HtmlMarkerLayout
}

export class SimpleLngLatBounds {
  constructor() {
    this.minLng = Infinity
    this.minLat = Infinity
    this.maxLng = -Infinity
    this.maxLat = -Infinity
  }

  extend([lng, lat]) {
    this.minLng = Math.min(this.minLng, lng)
    this.minLat = Math.min(this.minLat, lat)
    this.maxLng = Math.max(this.maxLng, lng)
    this.maxLat = Math.max(this.maxLat, lat)
    return this
  }

  isValid() {
    return Number.isFinite(this.minLng) && Number.isFinite(this.maxLng)
  }

  toYandexBounds() {
    return [
      [this.minLat, this.minLng],
      [this.maxLat, this.maxLng],
    ]
  }
}

export async function createYandexMap(container, {
  center = [27.5615, 53.9045],
  zoom = 11,
  minZoom = 2,
  maxZoom = STREET_MAP_MAX_ZOOM,
  /** 'yandex#map' | 'yandex#satellite' | 'yandex#hybrid' */
  type = 'yandex#map',
  lang,
} = {}) {
  if (!container) {
    throw new Error('Yandex map container is missing')
  }

  destroyAdapterOnContainer(container)

  const ymaps = await loadYandexMaps(lang)

  // React StrictMode: another mount may have taken the container while we awaited.
  destroyAdapterOnContainer(container)

  const listeners = {
    load: new Set(),
    zoomend: new Set(),
    moveend: new Set(),
  }

  let currentCenter = Array.isArray(center) ? center : [27.5615, 53.9045]
  let currentZoom = Number(zoom) || 11
  let lastSettledZoom = currentZoom
  let destroyed = false

  const ymap = new ymaps.Map(
    container,
    {
      center: toLatLng(currentCenter),
      zoom: currentZoom,
      type,
      controls: [],
      // Явно: pinch пальцами + колесо мыши (на desktop default иногда без multiTouch/scrollZoom)
      behaviors: ['drag', 'multiTouch', 'scrollZoom', 'dblClickZoom'],
    },
    {
      minZoom,
      maxZoom,
      suppressMapOpenBlock: true,
      yandexMapDisablePoiInteractivity: true,
    },
  )

  try {
    ymap.behaviors.enable(['drag', 'multiTouch', 'scrollZoom', 'dblClickZoom'])
  } catch {
    // ignore if behavior module unavailable
  }

  try {
    container.style.touchAction = 'none'
    if (container.parentElement) container.parentElement.style.touchAction = 'none'
  } catch {
    // ignore
  }

  const emit = (eventName) => {
    if (destroyed) return
    listeners[eventName]?.forEach((handler) => {
      try {
        handler()
      } catch {
        // ignore listener errors
      }
    })
  }

  ymap.events.add('boundschange', (event) => {
    if (destroyed) return
    const nextCenter = event.get('newCenter')
    const nextZoom = event.get('newZoom')
    if (Array.isArray(nextCenter) && nextCenter.length === 2) {
      currentCenter = fromLatLng(nextCenter)
    }
    if (nextZoom != null) currentZoom = nextZoom
    emit('moveend')
    if (lastSettledZoom !== currentZoom) {
      lastSettledZoom = currentZoom
      emit('zoomend')
    }
  })

  const adapter = {
    engine: 'yandex',
    raw: ymap,
    loaded() {
      return !destroyed
    },
    getZoom() {
      return currentZoom
    },
    getCenter() {
      return currentCenter
    },
    setCenter(lngLat) {
      if (destroyed) return
      currentCenter = lngLat
      ymap.setCenter(toLatLng(lngLat), currentZoom, { duration: 0 })
    },
    setZoom(nextZoom) {
      if (destroyed) return
      const z = Math.min(Math.max(Number(nextZoom) || currentZoom, minZoom), maxZoom)
      currentZoom = z
      ymap.setZoom(z, { duration: 0 })
    },
    zoomIn({ duration = 200 } = {}) {
      if (destroyed) return
      const z = Math.min(currentZoom + 1, maxZoom)
      currentZoom = z
      ymap.setZoom(z, { duration })
    },
    zoomOut({ duration = 200 } = {}) {
      if (destroyed) return
      const z = Math.max(currentZoom - 1, minZoom)
      currentZoom = z
      ymap.setZoom(z, { duration })
    },
    flyTo({
      center: nextCenter,
      zoom: nextZoom,
      duration = 500,
      padding = null,
    } = {}) {
      if (destroyed) return
      if (nextCenter) currentCenter = nextCenter
      if (nextZoom != null) {
        currentZoom = Math.min(Math.max(Number(nextZoom), minZoom), maxZoom)
      }

      const padTop = Math.max(0, Number(padding?.top) || 0)
      const padRight = Math.max(0, Number(padding?.right) || 0)
      const padBottom = Math.max(0, Number(padding?.bottom) || 0)
      const padLeft = Math.max(0, Number(padding?.left) || 0)
      const hasPadding = padTop || padRight || padBottom || padLeft

      if (!hasPadding) {
        ymap.setCenter(toLatLng(currentCenter), currentZoom, { duration })
        return
      }

      // Сдвигаем центр так, чтобы точка оказалась в центре видимой области
      // (между padding top/bottom/left/right), а не за bottom sheet.
      try {
        const size = ymap.container.getSize?.() || [0, 0]
        const width = size[0] || container.clientWidth || 0
        const height = size[1] || container.clientHeight || 0
        const projection = ymap.options.get('projection')
        const targetGlobal = projection.toGlobalPixels(
          toLatLng(currentCenter),
          currentZoom,
        )
        const offsetX = (padLeft - padRight) / 2
        const offsetY = (padBottom - padTop) / 2
        // Если карта ещё не измерилась — обычный setCenter
        if (!width || !height || !Array.isArray(targetGlobal)) {
          ymap.setCenter(toLatLng(currentCenter), currentZoom, { duration })
          return
        }
        const centerGlobal = [targetGlobal[0] + offsetX, targetGlobal[1] + offsetY]
        if (typeof ymap.setGlobalPixelCenter === 'function') {
          ymap.setGlobalPixelCenter(centerGlobal, currentZoom, { duration })
          // Синхронизируем adapter center с фактическим центром карты
          try {
            const geo = projection.fromGlobalPixels(centerGlobal, currentZoom)
            if (Array.isArray(geo) && geo.length >= 2) {
              currentCenter = fromLatLng(geo)
            }
          } catch {
            // keep target as logical center for callers
          }
          return
        }
      } catch {
        // fall through
      }
      ymap.setCenter(toLatLng(currentCenter), currentZoom, { duration })
      if (padBottom || padTop) {
        try {
          ymap.panBy([0, Math.round((padBottom - padTop) / 2)], { duration: 0 })
        } catch {
          // ignore
        }
      }
    },
    fitBounds(bounds, { duration = 700, maxZoom: fitMaxZoom } = {}) {
      if (destroyed || !bounds?.isValid?.()) return
      const options = {
        checkZoomRange: true,
        duration,
        zoomMargin: 80,
      }
      if (fitMaxZoom != null) options.preciseZoom = false
      ymap.setBounds(bounds.toYandexBounds(), options)
    },
    project([lng, lat]) {
      if (destroyed) return { x: 0, y: 0 }
      try {
        const projection = ymap.options.get('projection')
        const globalPixels = projection.toGlobalPixels([lat, lng], ymap.getZoom())
        const page = ymap.converter.globalToPage(globalPixels)
        return { x: page[0], y: page[1] }
      } catch {
        return { x: 0, y: 0 }
      }
    },
    resize() {
      if (destroyed) return
      try {
        ymap.container.fitToViewport()
      } catch {
        // ignore
      }
    },
    on(eventName, handler) {
      listeners[eventName]?.add(handler)
      if (eventName === 'load') {
        queueMicrotask(() => {
          if (!destroyed) handler()
        })
      }
    },
    off(eventName, handler) {
      listeners[eventName]?.delete(handler)
    },
    once(eventName, handler) {
      const wrapped = () => {
        adapter.off(eventName, wrapped)
        handler()
      }
      adapter.on(eventName, wrapped)
    },
    addDotMarker({ coordinates, color = '#0099A9', draggable = false, onDragEnd } = {}) {
      if (destroyed || !Array.isArray(coordinates)) {
        return { setLngLat() { return this }, remove() {} }
      }

      const placemark = new ymaps.Placemark(
        toLatLng(coordinates),
        {},
        {
          preset: 'islands#circleDotIcon',
          iconColor: color,
          draggable: Boolean(draggable),
          hasBalloon: false,
          hasHint: false,
          openBalloonOnClick: false,
        },
      )
      if (onDragEnd) {
        placemark.events.add('dragend', () => {
          if (destroyed) return
          const latLng = placemark.geometry.getCoordinates()
          if (!Array.isArray(latLng) || latLng.length < 2) return
          onDragEnd({ lat: latLng[0], lng: latLng[1] })
        })
      }
      ymap.geoObjects.add(placemark)
      return {
        setLngLat([lng, lat]) {
          if (!destroyed) placemark.geometry.setCoordinates([lat, lng])
          return this
        },
        remove() {
          try {
            ymap.geoObjects.remove(placemark)
          } catch {
            // already removed
          }
        },
      }
    },
    addHtmlMarker({ element, coordinates, draggable = false, onDragEnd } = {}) {
      if (destroyed || !element || !Array.isArray(coordinates)) {
        return { setLngLat() { return this }, remove() {} }
      }

      const HtmlMarkerLayout = createHtmlMarkerLayout(ymaps, element)
      const placemark = new ymaps.Placemark(
        toLatLng(coordinates),
        {},
        {
          draggable: Boolean(draggable),
          iconLayout: HtmlMarkerLayout,
          iconOffset: [0, 0],
          hasBalloon: false,
          hasHint: false,
          openBalloonOnClick: false,
        },
      )
      if (onDragEnd) {
        placemark.events.add('dragend', () => {
          if (destroyed) return
          const latLng = placemark.geometry.getCoordinates()
          if (!Array.isArray(latLng) || latLng.length < 2) return
          onDragEnd({ lat: latLng[0], lng: latLng[1] })
        })
      }
      ymap.geoObjects.add(placemark)
      return {
        setLngLat([lng, lat]) {
          if (!destroyed) placemark.geometry.setCoordinates([lat, lng])
          return this
        },
        remove() {
          try {
            ymap.geoObjects.remove(placemark)
          } catch {
            // already removed
          }
        },
      }
    },
    remove() {
      if (destroyed) return
      destroyed = true
      if (containerAdapters.get(container) === adapter) {
        containerAdapters.delete(container)
      }
      try {
        ymap.destroy()
      } catch {
        try {
          container.replaceChildren()
        } catch {
          // ignore
        }
      }
    },
  }

  containerAdapters.set(container, adapter)

  // На случай, если CSS ещё не подхватился / классы сменились — прячем copyright-pane сразу.
  try {
    container.querySelectorAll('[class*="copyrights-pane"], [class*="map-copyrights-promo"]').forEach((node) => {
      node.style.setProperty('display', 'none', 'important')
      node.style.setProperty('visibility', 'hidden', 'important')
    })
  } catch {
    // ignore
  }

  queueMicrotask(() => {
    adapter.resize()
    emit('load')
  })
  return adapter
}

export function createYandexMarker(map, { element, lngLat, draggable = false, onDragEnd } = {}) {
  if (!map?.addHtmlMarker) return { setLngLat() { return this }, remove() {} }
  const marker = map.addHtmlMarker({
    element,
    coordinates: lngLat,
    draggable,
    onDragEnd,
  })
  return {
    setLngLat(nextLngLat) {
      marker.setLngLat(nextLngLat)
      return this
    },
    addTo() {
      return this
    },
    remove() {
      marker.remove()
    },
  }
}
