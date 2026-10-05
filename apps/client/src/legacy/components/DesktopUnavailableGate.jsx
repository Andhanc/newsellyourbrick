import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MOBILE_ONLY_MIN_DESKTOP_WIDTH,
  shouldBlockDesktopForPath,
} from '../utils/softLaunchAccess'

const FeatureUnavailablePage = lazy(() => import('./FeatureUnavailablePage'))

function useIsDesktopViewport(minWidth = MOBILE_ONLY_MIN_DESKTOP_WIDTH) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`)
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [minWidth])

  return isDesktop
}

/**
 * Blocks desktop/tablet-wide viewports while the product is mobile-only.
 * Admin / marketer paths pass through.
 */
export default function DesktopUnavailableGate({ children }) {
  const { pathname } = useLocation()
  const isDesktop = useIsDesktopViewport()

  if (isDesktop && shouldBlockDesktopForPath(pathname)) {
    return (
      <Suspense fallback={null}>
        <FeatureUnavailablePage variant="desktop" />
      </Suspense>
    )
  }

  return children
}
