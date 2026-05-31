import { useEffect } from 'react'

const DESKTOP_MQ = '(min-width: 961px)'
const FOOTER_GAP_PX = 16

function readHeaderDockTop() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--pd-auction-header-h')
  const headerH = Number.parseFloat(raw) || 56
  return headerH + 12
}

/**
 * Фиксирует панель ставок на десктопе; при приближении футера поднимает её, чтобы не перекрывать.
 */
export default function useAuctionDesktopBidPanelDock({
  enabled,
  panelRef,
  anchorRef,
  layoutScrollRef,
}) {
  useEffect(() => {
    if (!enabled) return undefined

    const panel = panelRef?.current
    const anchor = anchorRef?.current
    if (!panel || !anchor) return undefined

    const scrollRoot = layoutScrollRef?.current || document.querySelector('.app-layout')
    const footer = document.getElementById('site-footer')
    const mq = window.matchMedia(DESKTOP_MQ)

    const apply = () => {
      if (!mq.matches) {
        panel.style.position = ''
        panel.style.top = ''
        panel.style.left = ''
        panel.style.width = ''
        return
      }

      const anchorRect = anchor.getBoundingClientRect()
      const panelHeight = panel.offsetHeight
      const defaultTop = readHeaderDockTop()

      let top = defaultTop
      if (footer) {
        const maxTop = footer.getBoundingClientRect().top - panelHeight - FOOTER_GAP_PX
        top = Math.min(defaultTop, maxTop)
      }

      panel.style.position = 'fixed'
      panel.style.left = `${anchorRect.left}px`
      panel.style.width = `${anchorRect.width}px`
      panel.style.top = `${top}px`
    }

    apply()

    scrollRoot?.addEventListener('scroll', apply, { passive: true })
    window.addEventListener('resize', apply, { passive: true })

    const ro = new ResizeObserver(apply)
    ro.observe(panel)
    ro.observe(anchor)
    if (footer) ro.observe(footer)

    mq.addEventListener('change', apply)

    return () => {
      scrollRoot?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      mq.removeEventListener('change', apply)
      ro.disconnect()
      panel.style.position = ''
      panel.style.top = ''
      panel.style.left = ''
      panel.style.width = ''
    }
  }, [enabled, panelRef, anchorRef, layoutScrollRef])
}
