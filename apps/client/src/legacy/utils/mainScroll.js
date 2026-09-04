import { forceResetSiteNavScrollLock, setSiteNavDrawerOpen } from './siteNavDrawerDocumentFlag'

/** Основной скролл приложения — контейнер `.app-layout` (document больше не скроллится). */

export const MAIN_SCROLL_SELECTOR = '.app-layout'

/** Снимает типичные «залипшие» блокировки скролла перед лендингами и маркетинговыми страницами. */
export function ensureMainScrollReady() {
  document.documentElement.classList.remove('md-page-active')
  forceResetSiteNavScrollLock()
  setSiteNavDrawerOpen(false)

  const layout = getMainScrollEl()
  if (layout instanceof HTMLElement) {
    layout.style.removeProperty('overflow')
    layout.style.removeProperty('overflow-y')
    layout.style.removeProperty('overflow-x')
  }

  document.body.style.removeProperty('overflow')
  document.documentElement.style.removeProperty('overflow')
}

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

/**
 * Позиция элемента относительно верха скроллящегося `.app-layout`.
 * @param {HTMLElement} element
 * @param {HTMLElement | null} [scrollRoot]
 */
export function getElementTopInMainScroll(element, scrollRoot = getMainScrollEl()) {
  if (!element) return 0
  if (!scrollRoot) return element.getBoundingClientRect().top + window.scrollY
  const rootRect = scrollRoot.getBoundingClientRect()
  const elRect = element.getBoundingClientRect()
  return scrollRoot.scrollTop + (elRect.top - rootRect.top)
}

/**
 * Плавный скролл к якорю внутри основного контейнера приложения.
 * @param {HTMLElement} element
 * @param {{ offset?: number, behavior?: ScrollBehavior }} [options]
 */
export function scrollMainElementIntoView(element, { offset = 96, behavior = 'smooth' } = {}) {
  if (!element) return
  const scrollRoot = getMainScrollEl()
  if (!scrollRoot) {
    element.scrollIntoView({ behavior, block: 'start' })
    return
  }
  const top = getElementTopInMainScroll(element, scrollRoot) - offset
  scrollRoot.scrollTo({ top: Math.max(0, top), behavior })
}

/**
 * Активный id для scrollspy: последний раздел, чей верх выше линии чтения.
 * @param {string[]} ids — порядок как в содержании
 * @param {{ offset?: number }} [options]
 */
export function pickActiveIdByMainScroll(ids, { offset = 120 } = {}) {
  if (!ids.length) return ''
  const scrollRoot = getMainScrollEl()
  if (!scrollRoot) return ids[0]

  const atBottom =
    scrollRoot.scrollTop + scrollRoot.clientHeight >= scrollRoot.scrollHeight - 8
  if (atBottom) return ids[ids.length - 1]

  const probe = scrollRoot.scrollTop + offset
  // Небольшой запас: после smooth-scroll позиция часто на 1–4px выше целевой линии.
  const slack = 8
  let active = ids[0]
  for (const id of ids) {
    const el = document.getElementById(id)
    if (!el) continue
    if (getElementTopInMainScroll(el, scrollRoot) <= probe + slack) active = id
  }
  return active
}
