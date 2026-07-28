import { useLayoutEffect } from 'react'
import {
  getHeaderBottomPx,
  getNewsArticleTocTopOffsetPx,
} from '@/hooks/useNewsArticleTocFixed'

const MOBILE_MQ = '(max-width: 900px)'
const GAP = 12

/**
 * На мобиле sticky ломается из‑за overflow у .app-layout__content —
 * фиксируем панель «Назад + Содержание» и резервируем место под неё.
 */
export function useNewsArticleMobileFixedHead(stickyHeadRef, spacerRef) {
  useLayoutEffect(() => {
    const head = stickyHeadRef.current
    const spacer = spacerRef.current
    if (!head) return undefined

    const mq = window.matchMedia(MOBILE_MQ)

    const update = () => {
      if (!mq.matches) {
        head.style.removeProperty('position')
        head.style.removeProperty('top')
        head.style.removeProperty('left')
        head.style.removeProperty('right')
        head.style.removeProperty('width')
        head.style.removeProperty('z-index')
        if (spacer) spacer.style.height = '0'
        document.documentElement.style.removeProperty('--news-article-scroll-offset')
        return
      }

      const topPx = getHeaderBottomPx()
      head.style.position = 'fixed'
      head.style.top = `${topPx}px`
      head.style.left = '0'
      head.style.right = '0'
      head.style.width = '100%'
      head.style.zIndex = '30'

      const headHeight = Math.ceil(head.offsetHeight)
      if (spacer) spacer.style.height = `${headHeight}px`

      document.documentElement.style.setProperty(
        '--news-article-scroll-offset',
        `${topPx + headHeight + GAP}px`,
      )
    }

    update()
    const raf = window.requestAnimationFrame(update)

    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(head)

    const header = document.querySelector('.new-header')
    if (header) ro?.observe(header)

    mq.addEventListener('change', update)
    window.addEventListener('resize', update, { passive: true })

    return () => {
      window.cancelAnimationFrame(raf)
      mq.removeEventListener('change', update)
      window.removeEventListener('resize', update)
      ro?.disconnect()
      head.style.removeProperty('position')
      head.style.removeProperty('top')
      head.style.removeProperty('left')
      head.style.removeProperty('right')
      head.style.removeProperty('width')
      head.style.removeProperty('z-index')
      if (spacer) spacer.style.height = '0'
      document.documentElement.style.removeProperty('--news-article-scroll-offset')
    }
  }, [stickyHeadRef, spacerRef])
}

export function getNewsArticleScrollOffsetPx(stickyHeadEl) {
  if (typeof window !== 'undefined' && window.matchMedia(MOBILE_MQ).matches && stickyHeadEl) {
    return getHeaderBottomPx() + stickyHeadEl.offsetHeight + GAP
  }
  return getNewsArticleTocTopOffsetPx(stickyHeadEl) + 20
}
