import { useEffect, useState } from 'react'

const MOBILE_MODAL_MQ = '(max-width: 640px)'

export function useMobileModalLayout() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(MOBILE_MODAL_MQ).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MODAL_MQ)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}
