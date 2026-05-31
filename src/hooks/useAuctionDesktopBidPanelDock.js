import { useEffect } from 'react'

const DESKTOP_MQ = '(min-width: 961px)'
const FOOTER_GAP_PX = 24

function readHeaderDockTop() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--pd-auction-header-h')
  const headerH = Number.parseFloat(raw) || 56
  return headerH + 12
}

/**
 * Десктопная панель ставок: fixed при скролле, у футера открепляется и уезжает вверх с колонкой.
 */
export default function useAuctionDesktopBidPanelDock({
  enabled,
  panelRef,
  anchorRef,
  dockKey,
}) {
  useEffect(() => {
    if (!enabled) return undefined

    const mq = window.matchMedia(DESKTOP_MQ)
    let raf = 0
    let attachRaf = 0
    let disposed = false
    let scrollRoot = null
    let ro = null

    const clearPanelStyles = (panel) => {
      if (!panel) return
      panel.style.position = ''
      panel.style.top = ''
      panel.style.bottom = ''
      panel.style.left = ''
      panel.style.width = ''
      panel.style.maxHeight = ''
      panel.style.overflowY = ''
      panel.style.overflowX = ''
    }

    const apply = (panel, anchor) => {
      if (!mq.matches) {
        clearPanelStyles(panel)
        return
      }

      const footer = document.getElementById('site-footer')
      const headerTop = readHeaderDockTop()
      const anchorRect = anchor.getBoundingClientRect()
      const panelHeight = panel.offsetHeight
      const footerTop = footer ? footer.getBoundingClientRect().top : window.innerHeight
      const limitBottom = footerTop - FOOTER_GAP_PX

      if (anchorRect.top > headerTop) {
        clearPanelStyles(panel)
        return
      }

      let top = headerTop

      if (top + panelHeight > limitBottom) {
        top = limitBottom - panelHeight
      }

      if (top + panelHeight > anchorRect.bottom) {
        panel.style.position = 'absolute'
        panel.style.top = 'auto'
        panel.style.bottom = '0'
        panel.style.left = '0'
        panel.style.width = '100%'
        panel.style.maxHeight = ''
        panel.style.overflowY = ''
        panel.style.overflowX = ''
        return
      }

      panel.style.position = 'fixed'
      panel.style.top = `${top}px`
      panel.style.left = `${anchorRect.left}px`
      panel.style.width = `${anchorRect.width}px`
      panel.style.bottom = ''
      panel.style.maxHeight = ''
      panel.style.overflowY = ''
      panel.style.overflowX = ''
    }

    const scheduleApply = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (disposed) return
        const panel = panelRef?.current
        const anchor = anchorRef?.current
        if (panel && anchor) apply(panel, anchor)
      })
    }

    const onScroll = () => scheduleApply()
    const onResize = () => scheduleApply()
    const onMqChange = () => scheduleApply()

    const detachListeners = () => {
      scrollRoot?.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      mq.removeEventListener('change', onMqChange)
      ro?.disconnect()
      ro = null
    }

    const attach = () => {
      if (disposed) return

      const panel = panelRef?.current
      const anchor = anchorRef?.current
      if (!panel || !anchor) {
        attachRaf = requestAnimationFrame(attach)
        return
      }

      detachListeners()

      scrollRoot = document.querySelector('.app-layout')
      apply(panel, anchor)

      scrollRoot?.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onResize, { passive: true })
      mq.addEventListener('change', onMqChange)

      ro = new ResizeObserver(onScroll)
      ro.observe(panel)
      ro.observe(anchor)

      const footer = document.getElementById('site-footer')
      if (footer) ro.observe(footer)
    }

    attach()

    return () => {
      disposed = true
      if (raf) cancelAnimationFrame(raf)
      if (attachRaf) cancelAnimationFrame(attachRaf)
      detachListeners()
      clearPanelStyles(panelRef?.current)
    }
  }, [enabled, panelRef, anchorRef, dockKey])
}
