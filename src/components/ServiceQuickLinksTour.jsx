import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { getMainScrollEl } from '../utils/mainScroll'
import './ServiceQuickLinksTour.css'

const PAD = 4
const HOLE_RADIUS = 16

function measureTarget(el) {
  if (!el) return null
  const r = el.getBoundingClientRect()
  const w = r.width + PAD * 2
  const h = r.height + PAD * 2
  const rx = Math.min(HOLE_RADIUS, w / 2 - 0.25, h / 2 - 0.25)
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: w,
    height: h,
    rx,
  }
}

function roundedRectPath(x, y, w, h, r) {
  const R = Math.max(0, Math.min(r, w / 2, h / 2))
  if (R <= 0) {
    return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`
  }
  return [
    `M ${x + R} ${y}`,
    `H ${x + w - R}`,
    `A ${R} ${R} 0 0 1 ${x + w} ${y + R}`,
    `V ${y + h - R}`,
    `A ${R} ${R} 0 0 1 ${x + w - R} ${y + h}`,
    `H ${x + R}`,
    `A ${R} ${R} 0 0 1 ${x} ${y + h - R}`,
    `V ${y + R}`,
    `A ${R} ${R} 0 0 1 ${x + R} ${y}`,
    'Z',
  ].join(' ')
}

function spotlightDimPath(vw, vh, hole) {
  const outer = `M 0 0 H ${vw} V ${vh} H 0 Z`
  const inner = roundedRectPath(hole.left, hole.top, hole.width, hole.height, hole.rx)
  return `${outer} ${inner}`
}

function buildHitSlabs(vw, vh, hole) {
  const y0 = hole.top
  const y1 = hole.top + hole.height
  const x0 = hole.left
  const x1 = hole.left + hole.width
  return [
    { left: 0, top: 0, width: vw, height: Math.max(0, y0) },
    { left: 0, top: y1, width: vw, height: Math.max(0, vh - y1) },
    { left: 0, top: y0, width: Math.max(0, x0), height: y1 - y0 },
    { left: x1, top: y0, width: Math.max(0, vw - x1), height: y1 - y0 },
  ].filter((s) => s.width > 0 && s.height > 0)
}

/**
 * Затемнение + «окно» на блоке направлений (Доли / Аукцион / Долги) и подсказка внизу.
 */
export function ServiceQuickLinksTour({ active, onDismiss, groupRef }) {
  const reduceMotion = useReducedMotion()
  const panelRef = useRef(null)
  const lockedScrollTopRef = useRef(0)
  const [viewport, setViewport] = useState(() =>
    typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 0, h: 0 },
  )
  const [hole, setHole] = useState(null)
  const lastHoleRef = useRef(null)

  const update = useCallback(() => {
    if (!active || typeof window === 'undefined') return
    const w = window.innerWidth
    const h = window.innerHeight
    setViewport({ w, h })
    const measured = measureTarget(groupRef?.current)
    if (measured) {
      lastHoleRef.current = measured
      setHole(measured)
    }
  }, [active, groupRef])

  useLayoutEffect(() => {
    if (!active) return
    update()
  }, [active, update])

  useLayoutEffect(() => {
    if (!active) return
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            window.requestAnimationFrame(update)
          })
        : null
    const els = [groupRef?.current].filter(Boolean)
    els.forEach((el) => ro?.observe(el))
    window.addEventListener('resize', update)
    return () => {
      els.forEach((el) => ro?.unobserve(el))
      ro?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [active, groupRef, update])

  useEffect(() => {
    if (!active) return
    const id = window.requestAnimationFrame(() => update())
    return () => window.cancelAnimationFrame(id)
  }, [active, update])

  useEffect(() => {
    if (!active || typeof window === 'undefined') return

    const scrollEl = getMainScrollEl()
    const grid = groupRef?.current

    if (scrollEl && grid) {
      const gridRect = grid.getBoundingClientRect()
      const scrollRect = scrollEl.getBoundingClientRect()
      const targetTop = Math.max(0, scrollEl.scrollTop + gridRect.top - scrollRect.top - 20)
      scrollEl.scrollTop = targetTop
      lockedScrollTopRef.current = targetTop
      window.requestAnimationFrame(update)
    } else {
      lockedScrollTopRef.current = scrollEl?.scrollTop ?? window.scrollY
    }

    const prevBodyOverflow = document.body.style.overflow
    const prevScrollOverflow = scrollEl?.style.overflow ?? ''
    document.body.style.overflow = 'hidden'
    if (scrollEl) scrollEl.style.overflow = 'hidden'

    const lockScrollPosition = () => {
      const top = lockedScrollTopRef.current
      if (scrollEl) {
        if (scrollEl.scrollTop !== top) scrollEl.scrollTop = top
      } else if (window.scrollY !== top) {
        window.scrollTo(0, top)
      }
    }

    const blockScroll = (e) => {
      e.preventDefault()
      lockScrollPosition()
    }

    lockScrollPosition()
    scrollEl?.addEventListener('scroll', lockScrollPosition, { passive: true })
    scrollEl?.addEventListener('wheel', blockScroll, { passive: false })
    scrollEl?.addEventListener('touchmove', blockScroll, { passive: false })
    window.addEventListener('wheel', blockScroll, { passive: false })
    window.addEventListener('touchmove', blockScroll, { passive: false })

    return () => {
      document.body.style.overflow = prevBodyOverflow
      if (scrollEl) scrollEl.style.overflow = prevScrollOverflow
      scrollEl?.removeEventListener('scroll', lockScrollPosition)
      scrollEl?.removeEventListener('wheel', blockScroll)
      scrollEl?.removeEventListener('touchmove', blockScroll)
      window.removeEventListener('wheel', blockScroll)
      window.removeEventListener('touchmove', blockScroll)
    }
  }, [active, groupRef, update])

  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [active])

  if (typeof document === 'undefined') return null

  const { w: vw, h: vh } = viewport
  const spot = hole ?? lastHoleRef.current
  const dimPath = spot && vw > 0 ? spotlightDimPath(vw, vh, spot) : ''
  const ringPath = spot ? roundedRectPath(spot.left, spot.top, spot.width, spot.height, spot.rx) : ''
  const slabs = spot && vw > 0 ? buildHitSlabs(vw, vh, spot) : []

  const portal = (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="service-quick-links-tour"
          className="service-quick-links-tour"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          {slabs.map((s, i) => (
            <div
              key={`slab-${i}`}
              className="service-quick-links-tour__hit-slab"
              style={{ left: s.left, top: s.top, width: s.width, height: s.height }}
              aria-hidden
            />
          ))}
          {dimPath ? (
            <svg
              className="service-quick-links-tour__dim-svg"
              width={vw}
              height={vh}
              viewBox={`0 0 ${vw} ${vh}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              <path fill="rgba(15, 23, 42, 0.58)" fillRule="evenodd" d={dimPath} pointerEvents="none" />
              {ringPath ? (
                <path
                  d={ringPath}
                  fill="none"
                  className="service-quick-links-tour__ring"
                  pointerEvents="none"
                />
              ) : null}
            </svg>
          ) : null}
          <div
            ref={panelRef}
            className="service-quick-links-tour__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-quick-links-tour-title"
          >
            <p id="service-quick-links-tour-title" className="service-quick-links-tour__text">
              Начни изучать наш сервис уже сейчас. Покупай недвижимость легко.
            </p>
            <button type="button" className="service-quick-links-tour__ok" onClick={onDismiss}>
              Понятно
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  return createPortal(portal, document.body)
}
