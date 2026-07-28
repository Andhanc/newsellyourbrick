import { useEffect, useState } from 'react'

export const MOBILE_LAYOUT_BREAKPOINT = 768

export default function useMobileLayout(breakpoint = MOBILE_LAYOUT_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint,
  )

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [breakpoint])

  return isMobile
}
