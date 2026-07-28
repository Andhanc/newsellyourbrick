import { useEffect } from 'react'
import { getMainScrollEl } from '../utils/mainScroll'

/** Первый вертикально прокручиваемый предок от node до exclusiveRoot (не включая exclusiveRoot). */
function findVerticalScrollable(from, exclusiveRoot) {
  let el = from
  if (el?.nodeType === Node.TEXT_NODE) el = el.parentElement
  if (!(el instanceof Element)) return null
  while (el && el !== exclusiveRoot) {
    const st = window.getComputedStyle(el)
    const oy = st.overflowY
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      return el
    }
    el = el.parentElement
  }
  return null
}

/**
 * Колесо над любой зоной страницы (поля фона, сайдбар, контент) ведёт себя единообразно:
 * сначала крутится правая колонка (inner), у краёв — .app-layout.
 * Вложенные скроллы (например .sidebar-nav) оставляем браузеру.
 *
 * @param {React.RefObject<HTMLElement|null>} captureRootRef — обычно корень .profile-page
 * @param {React.RefObject<HTMLElement|null>} innerRef — .profile-main-scroll
 */
export function useChainedAppLayoutScroll(captureRootRef, innerRef, { minWidth = 769, active = true } = {}) {
  useEffect(() => {
    if (!active) return
    const pageEl = captureRootRef?.current
    const inner = innerRef?.current
    if (!pageEl || !inner) return

    const isDesktop = () =>
      typeof window !== 'undefined' && window.matchMedia(`(min-width: ${minWidth}px)`).matches

    const onWheel = (e) => {
      if (!isDesktop()) return
      if (!pageEl.contains(e.target)) return
      if (e.target.closest?.('[aria-modal="true"]')) return

      const outer = getMainScrollEl()
      if (!outer) return

      const nested = findVerticalScrollable(e.target, pageEl)
      if (nested && nested !== inner) return

      const { scrollTop, scrollHeight, clientHeight } = inner
      const dy = e.deltaY
      const eps = 1
      const atTop = scrollTop <= eps
      const atBottom = scrollTop + clientHeight >= scrollHeight - eps
      const innerScrollable = scrollHeight > clientHeight + eps

      if (!innerScrollable) {
        outer.scrollTop += dy
        e.preventDefault()
        return
      }

      if (dy > 0 && atBottom) {
        outer.scrollTop += dy
        e.preventDefault()
        return
      }
      if (dy < 0 && atTop) {
        outer.scrollTop += dy
        e.preventDefault()
        return
      }

      e.preventDefault()
      inner.scrollTop += dy
    }

    pageEl.addEventListener('wheel', onWheel, { passive: false, capture: true })
    return () => pageEl.removeEventListener('wheel', onWheel, { capture: true })
  }, [captureRootRef, innerRef, minWidth, active])
}
