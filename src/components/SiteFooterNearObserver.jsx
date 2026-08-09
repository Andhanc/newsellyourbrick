import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLayoutScrollRef } from '../context/LayoutScrollContext'
import { setSiteFooterNear } from '../utils/siteDocumentLayoutFlags'

/**
 * Единый IntersectionObserver для #site-footer на всех маршрутах с AppLayout.
 * При смене маршрута сбрасываем флаг: иначе после короткой страницы (например /wallet)
 * класс html.site-footer-near залипает и прячет плашку депозита на /auction до hard refresh.
 *
 * Footer lazy (Suspense): ждём появления #site-footer через MutationObserver,
 * а не только 1–2 rAF — иначе плашки депозита/AI никогда не подписались бы на футер.
 */
export default function SiteFooterNearObserver() {
  const layoutScrollRef = useLayoutScrollRef()
  const { pathname } = useLocation()

  useEffect(() => {
    setSiteFooterNear(false)

    let observer = null
    let mo = null
    let cancelled = false

    const getScrollRoot = () =>
      layoutScrollRef?.current || document.querySelector('.app-layout') || null

    const connect = () => {
      if (cancelled) return false
      const footer = document.getElementById('site-footer')
      if (!footer) return false

      if (observer) {
        observer.disconnect()
        observer = null
      }
      observer = new IntersectionObserver(
        ([entry]) => {
          setSiteFooterNear(Boolean(entry?.isIntersecting))
        },
        {
          root: getScrollRoot(),
          rootMargin: '0px 0px -12% 0px',
          threshold: [0, 0.02, 0.5],
        }
      )
      observer.observe(footer)
      return true
    }

    if (!connect()) {
      const watchRoot = getScrollRoot() || document.body
      mo = new MutationObserver(() => {
        if (connect()) {
          mo?.disconnect()
          mo = null
        }
      })
      mo.observe(watchRoot, { childList: true, subtree: true })
    }

    return () => {
      cancelled = true
      mo?.disconnect()
      if (observer) observer.disconnect()
      setSiteFooterNear(false)
    }
  }, [layoutScrollRef, pathname])

  return null
}
