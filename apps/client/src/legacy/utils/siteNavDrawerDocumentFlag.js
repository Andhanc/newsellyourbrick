/**
 * Открыто ли общее боковое меню (бургер в Header / MainPage).
 * По классу скрываем плавающую кнопку AI и блокируем скролл страницы.
 */

const SCROLL_LOCK_STATE = {
  count: 0,
  appLayoutOverflow: '',
  appLayoutOverflowY: '',
  bodyOverflow: '',
  htmlOverflow: '',
  nested: [],
}

const NESTED_SCROLL_SELECTORS = ['.md-stage', '.md']

function isMenuScrollTarget(target) {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest('.header-mega-menu__scroll') ||
      target.closest('.menu-dropdown__content--mega'),
  )
}

function onTouchMove(event) {
  if (isMenuScrollTarget(event.target)) return
  event.preventDefault()
}

function onWheel(event) {
  if (isMenuScrollTarget(event.target)) return
  event.preventDefault()
}

function acquireScrollLock() {
  if (SCROLL_LOCK_STATE.count === 0) {
    const appLayout = document.querySelector('.app-layout')
    SCROLL_LOCK_STATE.bodyOverflow = document.body.style.overflow
    SCROLL_LOCK_STATE.htmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    if (appLayout instanceof HTMLElement) {
      SCROLL_LOCK_STATE.appLayoutOverflow = appLayout.style.overflow
      SCROLL_LOCK_STATE.appLayoutOverflowY = appLayout.style.overflowY
      appLayout.style.overflow = 'hidden'
      appLayout.style.overflowY = 'hidden'
    }

    SCROLL_LOCK_STATE.nested = NESTED_SCROLL_SELECTORS.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)).map((node) => {
        const el = /** @type {HTMLElement} */ (node)
        const prev = { el, overflow: el.style.overflow, overflowY: el.style.overflowY }
        el.style.overflow = 'hidden'
        el.style.overflowY = 'hidden'
        return prev
      }),
    )

    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('wheel', onWheel, { passive: false })
  }

  SCROLL_LOCK_STATE.count += 1
}

function releaseScrollLock() {
  SCROLL_LOCK_STATE.count = Math.max(0, SCROLL_LOCK_STATE.count - 1)
  if (SCROLL_LOCK_STATE.count > 0) return

  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('wheel', onWheel)

  document.body.style.overflow = SCROLL_LOCK_STATE.bodyOverflow
  document.documentElement.style.overflow = SCROLL_LOCK_STATE.htmlOverflow

  const appLayout = document.querySelector('.app-layout')
  if (appLayout instanceof HTMLElement) {
    appLayout.style.overflow = SCROLL_LOCK_STATE.appLayoutOverflow
    appLayout.style.overflowY = SCROLL_LOCK_STATE.appLayoutOverflowY
  }

  SCROLL_LOCK_STATE.nested.forEach(({ el, overflow, overflowY }) => {
    if (!el.isConnected) return
    el.style.overflow = overflow
    el.style.overflowY = overflowY
  })
  SCROLL_LOCK_STATE.nested = []
}

export function setSiteNavDrawerOpen(open) {
  const next = Boolean(open)
  const wasOpen = document.documentElement.classList.contains('site-nav-drawer-open')
  document.documentElement.classList.toggle('site-nav-drawer-open', next)

  if (next && !wasOpen) acquireScrollLock()
  if (!next && wasOpen) releaseScrollLock()
}
