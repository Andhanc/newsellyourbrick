import { useEffect, useState } from 'react'

/** Breakpoint совпадает с auction desktop layout (PropertyDetailClassic). */
export const DESKTOP_PROPERTY_MIN_WIDTH = 961

export function useIsDesktopProperty() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(min-width: ${DESKTOP_PROPERTY_MIN_WIDTH}px)`).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_PROPERTY_MIN_WIDTH}px)`)
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isDesktop
}
