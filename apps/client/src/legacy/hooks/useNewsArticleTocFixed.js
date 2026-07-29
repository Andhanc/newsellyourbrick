import { useLayoutEffect } from 'react'

const TOC_GAP_BELOW_HEADER = 16
const FIXED_CLASS = 'news-article-page__toc-panel--fixed'

export function getHeaderBottomPx() {
  const header = document.querySelector('.new-header')
  if (header) return Math.ceil(header.getBoundingClientRect().bottom)
  const spacer = document.querySelector('.new-header-spacer')
  if (spacer) return Math.ceil(spacer.getBoundingClientRect().bottom)
  return 104
}

/** Нижняя граница закреплённой шапки статьи (назад + содержание на мобиле). */
export function getNewsArticleTocTopOffsetPx(stickyHeadEl) {
  let top = getHeaderBottomPx() + TOC_GAP_BELOW_HEADER

  if (stickyHeadEl) {
    const rect = stickyHeadEl.getBoundingClientRect()
    if (rect.bottom > getHeaderBottomPx()) {
      top = Math.max(top, Math.ceil(rect.bottom) + TOC_GAP_BELOW_HEADER)
    }
  }

  return top
}

function clearTocPanelGeometry(panel) {
  if (!panel) return
  panel.classList.remove(FIXED_CLASS)
  panel.style.removeProperty('--toc-top')
  panel.style.removeProperty('--toc-bottom')
  panel.style.removeProperty('--toc-left')
  panel.style.removeProperty('--toc-width')
  panel.style.removeProperty('max-height')
  panel.style.removeProperty('visibility')
  panel.style.removeProperty('pointer-events')
}

/** Сбрасывает legacy inline-стили fixed-панели (десктоп — sticky в CSS). */
export function useNewsArticleTocFixed(_layoutRef, _stickyHeadRef, panelRef, enabled) {
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!enabled || !panel) return undefined

    clearTocPanelGeometry(panel)
    return () => clearTocPanelGeometry(panel)
  }, [enabled, panelRef])
}
