import { useEffect, useState } from 'react'

/** Синхронизация с html.site-footer-near (ставит SiteFooterNearObserver). */
export default function useSiteFooterNear() {
  const [near, setNear] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('site-footer-near')
      : false,
  )

  useEffect(() => {
    const sync = () => {
      setNear(document.documentElement.classList.contains('site-footer-near'))
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return near
}
