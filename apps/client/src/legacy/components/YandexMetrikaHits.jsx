import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const YANDEX_METRIKA_ID = 111370545

/**
 * SPA: первый просмотр уже учитывает init в index.html;
 * дальше — hit при смене маршрута (pathname + search).
 */
export default function YandexMetrikaHits() {
  const location = useLocation()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (typeof window.ym !== 'function') return

    const url = `${window.location.origin}${location.pathname}${location.search}${location.hash}`
    window.ym(YANDEX_METRIKA_ID, 'hit', url, {
      title: document.title,
      referer: document.referrer,
    })
  }, [location.pathname, location.search, location.hash])

  return null
}
