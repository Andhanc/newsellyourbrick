import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import './ProfileSpotlightOnboarding.css'

const PAD = 8
/** Совпадает с .test-hero-icon-tile (border-radius: 14px) + отступ подсветки. */
const TILE_RADIUS = 14

function parseBorderRadiusPx(el) {
  if (!el) return TILE_RADIUS
  try {
    const br = getComputedStyle(el).borderRadius
    const n = parseFloat(String(br).split(/[\s/]/)[0])
    return Number.isFinite(n) && n > 0 ? n : TILE_RADIUS
  } catch {
    return TILE_RADIUS
  }
}

function measureTarget(el) {
  if (!el) return null
  const r = el.getBoundingClientRect()
  const baseR = parseBorderRadiusPx(el)
  const w = r.width + PAD * 2
  const h = r.height + PAD * 2
  const rx = Math.min(baseR + PAD, w / 2 - 0.25, h / 2 - 0.25)
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: w,
    height: h,
    rx,
  }
}

/** Скруглённый прямоугольник для подпути SVG. */
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

/**
 * Затемнение вьюпорта с «окном» вокруг целевого элемента: клики проходят только в прорезь.
 * Подсказка и стрелка — pointer-events: none.
 */
export function ProfileSpotlightOnboarding({ active, targetRef, message }) {
  const reduceMotion = useReducedMotion()
  const [box, setBox] = useState(null)
  const lastBoxRef = useRef(null)
  const [viewport, setViewport] = useState(() =>
    typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 0, h: 0 },
  )

  const targetRefStable = targetRef

  const update = useCallback(() => {
    if (!active || typeof window === 'undefined') return
    const w = window.innerWidth
    const h = window.innerHeight
    setViewport({ w, h })
    const next = measureTarget(targetRefStable?.current)
    if (next) {
      lastBoxRef.current = next
      setBox(next)
    }
  }, [active, targetRefStable])

  useLayoutEffect(() => {
    if (!active) {
      setBox(null)
      lastBoxRef.current = null
      return
    }
    setBox(null)
    lastBoxRef.current = null
    update()
  }, [active, targetRefStable, update])

  useLayoutEffect(() => {
    if (!active) return
    const el = targetRefStable?.current
    const ro = el ? new ResizeObserver(() => update()) : null
    if (el && ro) ro.observe(el)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      if (ro && el) ro.unobserve(el)
      ro?.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [active, targetRefStable, update])

  /** Ref на кнопку/карточку может появиться позже (layout, motion) — несколько попыток измерения. */
  useEffect(() => {
    if (!active) return
    let cancelled = false
    let frames = 0
    const tick = () => {
      if (cancelled) return
      update()
      frames += 1
      if (frames < 24 && !lastBoxRef.current) {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
    const t = window.setTimeout(() => {
      if (!cancelled) update()
    }, 50)
    const t2 = window.setTimeout(() => {
      if (!cancelled) update()
    }, 280)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [active, update])

  if (typeof document === 'undefined') return null

  const { w: vw, h: vh } = viewport
  const r = box || lastBoxRef.current

  const bubbleW = Math.min(216, Math.max(180, vw - 40))
  /** Примерная высота компактного баббла (padding + 1–2 строки текста). */
  const bubbleApproxH = 44
  let bubbleLeft = 16
  let bubbleTop = 24
  let stemPath = ''
  let headPath = ''

  if (r && vw > 0 && vh > 0) {
    const tx = r.left + r.width / 2
    const tyTop = r.top
    const tyBottom = r.top + r.height

    bubbleLeft = Math.max(16, Math.min(tx - bubbleW / 2, vw - bubbleW - 16))

    const preferAbove = r.top > bubbleApproxH + 96
    let arrowFrom
    let arrowTo
    if (preferAbove) {
      bubbleTop = Math.max(16, r.top - bubbleApproxH - 40)
      arrowFrom = { x: bubbleLeft + bubbleW / 2, y: bubbleTop + bubbleApproxH + 2 }
      arrowTo = { x: tx, y: tyTop - 3 }
    } else {
      bubbleTop = Math.min(vh - bubbleApproxH - 16, tyBottom + 36)
      arrowFrom = { x: bubbleLeft + bubbleW / 2, y: bubbleTop - 2 }
      arrowTo = { x: tx, y: tyBottom + 3 }
    }

    const dx = arrowTo.x - arrowFrom.x
    const dy = arrowTo.y - arrowFrom.y
    /** Более длинная плавная дуга, как на референсе. */
    const lift = preferAbove ? -Math.max(64, Math.abs(dy) * 0.5) : Math.max(64, Math.abs(dy) * 0.5)
    const c1 = { x: arrowFrom.x + dx * 0.2, y: arrowFrom.y + lift * 0.75 }
    const c2 = { x: arrowTo.x - dx * 0.14, y: arrowTo.y - lift * 0.52 }

    const tip = arrowTo
    let fx = tip.x - c2.x
    let fy = tip.y - c2.y
    let fl = Math.hypot(fx, fy)
    if (fl < 1e-3) {
      fx = dx
      fy = dy
      fl = Math.hypot(fx, fy) || 1
    }
    const ux = fx / fl
    const uy = fy / fl
    /** Открытая «V» у острия: две линии от основания к точке (как на референсе). */
    const headDepth = 13
    const headHalf = 6.5
    const perpX = -uy
    const perpY = ux
    const baseMid = { x: tip.x - ux * headDepth, y: tip.y - uy * headDepth }
    const wingL = { x: baseMid.x + perpX * headHalf, y: baseMid.y + perpY * headHalf }
    const wingR = { x: baseMid.x - perpX * headHalf, y: baseMid.y - perpY * headHalf }

    stemPath = `M ${arrowFrom.x} ${arrowFrom.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${tip.x} ${tip.y}`
    headPath = `M ${wingL.x} ${wingL.y} L ${tip.x} ${tip.y} M ${wingR.x} ${wingR.y} L ${tip.x} ${tip.y}`
  }

  const dimPath = r && vw > 0 ? spotlightDimPath(vw, vh, r) : ''
  const hasHoleLayer = Boolean(r && vw > 0 && dimPath)
  const showFallbackDim = Boolean(active && vw > 0 && vh > 0 && !hasHoleLayer)

  const portal = (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="profile-spotlight"
          className="profile-spotlight"
          style={{ pointerEvents: 'none' }}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reduceMotion ? 0.12 : 0.48,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {showFallbackDim ? (
            <>
              <svg
                className="profile-spotlight__dim-svg profile-spotlight__dim-svg--fallback"
                width={vw}
                height={vh}
                viewBox={`0 0 ${vw} ${vh}`}
                preserveAspectRatio="none"
                pointerEvents="none"
                aria-hidden
              >
                <path fill="rgba(15, 23, 42, 0.58)" d={`M 0 0 H ${vw} V ${vh} H 0 Z`} />
              </svg>
              <div
                className="profile-spotlight__bubble profile-spotlight__bubble--fallback"
                style={{
                  left: Math.max(16, (vw - bubbleW) / 2),
                  top: 24,
                  width: bubbleW,
                }}
              >
                <p className="profile-spotlight__bubble-text">{message}</p>
              </div>
            </>
          ) : null}
          {r && vw > 0 && dimPath ? (
            <>
              {/* Прозрачные полосы надёжно перехватывают клики; SVG ниже только для вида со скруглением. */}
              <div
                className="profile-spotlight__hit-slab"
                style={{ left: 0, top: 0, width: vw, height: Math.max(0, r.top) }}
                aria-hidden
              />
              <div
                className="profile-spotlight__hit-slab"
                style={{
                  left: 0,
                  top: r.top,
                  width: Math.max(0, r.left),
                  height: r.height,
                }}
                aria-hidden
              />
              <div
                className="profile-spotlight__hit-slab"
                style={{
                  left: r.left + r.width,
                  top: r.top,
                  width: Math.max(0, vw - r.left - r.width),
                  height: r.height,
                }}
                aria-hidden
              />
              <div
                className="profile-spotlight__hit-slab"
                style={{
                  left: 0,
                  top: r.top + r.height,
                  width: vw,
                  height: Math.max(0, vh - r.top - r.height),
                }}
                aria-hidden
              />

              <svg
                className="profile-spotlight__dim-svg"
                width={vw}
                height={vh}
                viewBox={`0 0 ${vw} ${vh}`}
                preserveAspectRatio="none"
                pointerEvents="none"
                aria-hidden
              >
                <path
                  fill="rgba(15, 23, 42, 0.58)"
                  fillRule="evenodd"
                  d={dimPath}
                  className="profile-spotlight__dim-path"
                  pointerEvents="none"
                />
              </svg>

              <div
                className="profile-spotlight__bubble"
                style={{
                  left: bubbleLeft,
                  top: bubbleTop,
                  width: bubbleW,
                }}
              >
                <p className="profile-spotlight__bubble-text">{message}</p>
              </div>

              {stemPath && headPath ? (
                <svg
                  className="profile-spotlight__arrow-svg"
                  width={vw}
                  height={vh}
                  viewBox={`0 0 ${vw} ${vh}`}
                  aria-hidden
                >
                  <path
                    d={stemPath}
                    fill="none"
                    className="profile-spotlight__arrow-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={headPath}
                    fill="none"
                    className="profile-spotlight__arrow-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )

  return createPortal(portal, document.body)
}
