import { useEffect } from 'react'
import { useLayoutScrollRef } from '../context/LayoutScrollContext'
import { setSiteFooterNear } from '../utils/siteDocumentLayoutFlags'

/**
 * Единый IntersectionObserver для #site-footer на всех маршрутах с AppLayout.
 */
export default function SiteFooterNearObserver() {
  const layoutScrollRef = useLayoutScrollRef()

  useEffect(() => {
    const footer = document.getElementById('site-footer')
    if (!footer) return undefined

    const getScrollRoot = () =>
      layoutScrollRef?.current || document.querySelector('.app-layout') || null

    let observer = null

    const connect = () => {
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
    }

    connect()
    const raf = requestAnimationFrame(() => connect())

    return () => {
      cancelAnimationFrame(raf)
      if (observer) observer.disconnect()
      setSiteFooterNear(false)
    }
  }, [layoutScrollRef])

  return null
}
