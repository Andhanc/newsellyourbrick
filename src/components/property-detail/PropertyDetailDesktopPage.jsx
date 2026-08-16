import { useLayoutEffect, useRef } from 'react'
import './PropertyDetailDesktopPage.css'

const STICKY_GAP_PX = 16

/** Pin a column after it has been fully scrolled: top if shorter than the viewport, else flush to the bottom. */
function useStickyColumnPin(ref) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const sync = () => {
      const scroller = el.closest('.app-layout')
      const viewportH = scroller instanceof HTMLElement ? scroller.clientHeight : window.innerHeight
      const top = Math.min(STICKY_GAP_PX, viewportH - el.offsetHeight - STICKY_GAP_PX)
      el.style.top = `${Math.round(top)}px`
    }

    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [])
}

/**
 * Desktop property page — clean layout, no legacy chrome.
 */
export default function PropertyDetailDesktopPage({
  header,
  gallery,
  title,
  subtitle,
  stats,
  toolbar,
  sidebar,
  children,
  belowGrid,
  footer,
}) {
  const mainRef = useRef(null)
  useStickyColumnPin(mainRef)

  return (
    <div className="pdx-page property-detail-desktop-v4-root">
      <div className="pdx-page__container">
        {(header || toolbar) ? (
          <header className="pdx-page__topline">
            <div className="pdx-page__topline-main">{header}</div>
            {toolbar ? <div className="pdx-page__toolbar">{toolbar}</div> : null}
          </header>
        ) : null}

        <div className="pdx-page__grid">
          <div className="pdx-page__main" ref={mainRef}>
            <div className="pdx-page__gallery">{gallery}</div>

            <div className="pdx-page__head">
              <div className="pdx-page__head-copy">
                {subtitle ? <p className="pdx-page__subtitle">{subtitle}</p> : null}
                <h1 className="pdx-page__title">{title}</h1>
                {stats ? <div className="pdx-page__stats">{stats}</div> : null}
              </div>
            </div>

            <div className="pdx-page__content">{children}</div>
            {footer ? <footer className="pdx-page__footer">{footer}</footer> : null}
          </div>

          <aside className="pdx-page__aside">{sidebar}</aside>
        </div>

        {belowGrid ? <div className="pdx-page__below-grid">{belowGrid}</div> : null}
      </div>
    </div>
  )
}
