/** Основной скролл приложения — контейнер `.app-layout` (document больше не скроллится). */

export const MAIN_SCROLL_SELECTOR = '.app-layout'

export function getMainScrollEl() {
  if (typeof document === 'undefined') return null
  return document.querySelector(MAIN_SCROLL_SELECTOR)
}

/**
 * @param {number} top
 * @param {number} [left=0]
 * @param {ScrollBehavior | 'instant'} [behavior='auto'] — 'instant' мапится в 'auto'
 */
export function scrollMainTo(top = 0, left = 0, behavior = 'auto') {
  const el = getMainScrollEl()
  const b = behavior === 'instant' ? 'auto' : behavior
  if (el) {
    el.scrollTo({ top, left, behavior: b })
  } else {
    window.scrollTo({ top, left, behavior: b })
  }
}

export function getMainScrollTop() {
  const el = getMainScrollEl()
  return el ? el.scrollTop : window.scrollY
}

export function getMainScrollLeft() {
  const el = getMainScrollEl()
  return el ? el.scrollLeft : window.scrollX
}
