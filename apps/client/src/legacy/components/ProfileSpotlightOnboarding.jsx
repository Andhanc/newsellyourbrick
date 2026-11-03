import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import './ProfileSpotlightOnboarding.css'

const DEFAULT_PAD = 0
/** Fallback, если у цели не удалось прочитать border-radius. */
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

function measureTarget(el, pad = DEFAULT_PAD) {
  if (!el) return null
  const r = el.getBoundingClientRect()
  const baseR = parseBorderRadiusPx(el)
  const w = r.width + pad * 2
  const h = r.height + pad * 2
  const rx = Math.min(baseR + pad, w / 2 - 0.25, h / 2 - 0.25)
  return {
    top: r.top - pad,
    left: r.left - pad,
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

function unionHole(holes) {
  const top = Math.min(...holes.map((hole) => hole.top))
  const left = Math.min(...holes.map((hole) => hole.left))
  const right = Math.max(...holes.map((hole) => hole.left + hole.width))
  const bottom = Math.max(...holes.map((hole) => hole.top + hole.height))
  const width = Math.max(0, right - left)
  const height = Math.max(0, bottom - top)
  const rx = Math.min(
    Math.max(...holes.map((hole) => hole.rx)),
    width / 2 - 0.25,
    height / 2 - 0.25,
  )
  return { top, left, width, height, rx }
}

function isLaidOut(el) {
  if (!el) return false
  const rect = el.getBoundingClientRect()
  return rect.width > 1 && rect.height > 1
}

function isPaintedBackground(el) {
  try {
    const bg = getComputedStyle(el).backgroundColor
    return Boolean(bg) && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)'
  } catch {
    return false
  }
}

/** Плотный прямоугольник по тексту, без пустых полей растянутой строки. */
function measureTight(el, pad = 0, radius) {
  if (!el) return null
  const rects = []
  try {
    const range = document.createRange()
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      if (!String(walker.currentNode.textContent || '').trim()) continue
      range.selectNodeContents(walker.currentNode)
      rects.push(...Array.from(range.getClientRects()))
    }
  } catch {
    rects.length = 0
  }
  el.querySelectorAll('*').forEach((child) => {
    if (!isPaintedBackground(child)) return
    const rect = child.getBoundingClientRect()
    if (rect.width > 1 && rect.height > 1) rects.push(rect)
  })
  const visible = rects.filter((rect) => rect.width > 1 && rect.height > 1)
  if (!visible.length) return measureTarget(el, pad)
  const top = Math.min(...visible.map((rect) => rect.top))
  const left = Math.min(...visible.map((rect) => rect.left))
  const right = Math.max(...visible.map((rect) => rect.right))
  const bottom = Math.max(...visible.map((rect) => rect.bottom))
  const width = right - left + pad * 2
  const height = bottom - top + pad * 2
  return {
    top: top - pad,
    left: left - pad,
    width,
    height,
    rx: Math.min(
      radius != null ? radius : Math.max(parseBorderRadiusPx(el), 16),
      width / 2 - 0.25,
      height / 2 - 0.25,
    ),
  }
}

function measureHoleGroup(root, group) {
  if (!root || !group?.selector) return []
  const nodes = Array.from(root.querySelectorAll(group.selector)).filter(isLaidOut)
  if (!nodes.length) return []
  const pad = group.pad ?? 0
  const measured = nodes
    .map((el) => (group.tight ? measureTight(el, pad, group.rx) : measureTarget(el, pad)))
    .filter(Boolean)
  if (!measured.length) return []
  return group.union ? [unionHole(measured)] : measured
}

function spotlightDimPath(vw, vh, holes) {
  const outer = `M 0 0 H ${vw} V ${vh} H 0 Z`
  const inner = holes
    .map((hole) => roundedRectPath(hole.left, hole.top, hole.width, hole.height, hole.rx))
    .join(' ')
  return `${outer} ${inner}`
}

/**
 * Затемнение вьюпорта с «окном» вокруг целевого элемента: клики проходят только в прорезь.
 * Подсказка и стрелка — pointer-events: none.
 */
export function ProfileSpotlightOnboarding({
  active,
  targetRef,
  message,
  /** Внешний отступ «окна» вокруг цели; 0 — ровно по краям элемента. */
  pad = DEFAULT_PAD,
  /**
   * Отдельные прорези внутри targetRef.
   * { selector, union?, tight?, pad? } — union склеивает совпадения в одно окно.
   */
  holeGroups = null,
  bubbleShiftX = 0,
  bubbleShiftY = 0,
  headRotateDeg = 0,
  /** Максимальная ширина подсказки (по умолчанию компактная). */
  bubbleMaxWidth = 216,
}) {
  const reduceMotion = useReducedMotion()
  const [measure, setMeasure] = useState(null)
  const lastMeasureRef = useRef(null)
  const [viewport, setViewport] = useState(() =>
    typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 0, h: 0 },
  )

  const targetRefStable = targetRef

  const update = useCallback(() => {
    if (!active || typeof window === 'undefined') return
    const w = window.innerWidth
    const h = window.innerHeight
    setViewport({ w, h })
    const root = targetRefStable?.current
    let holes = []
    if (holeGroups?.length && root) {
      holes = holeGroups.flatMap((group) => measureHoleGroup(root, group))
    } else {
      const one = measureTarget(root, pad)
      if (one) holes = [one]
    }
    if (!holes.length) return
    const union = holes.length === 1 ? holes[0] : unionHole(holes)
    let box = union
    if (holeGroups?.length && root) {
      const section = measureTarget(root, 0)
      if (section && section.top < union.top - 8) {
        box = {
          ...union,
          top: section.top,
          height: union.top + union.height - section.top,
        }
      }
    }
    const next = {
      box,
      holes,
      multi: Boolean(holeGroups?.length && holes.length > 1),
    }
    lastMeasureRef.current = next
    setMeasure(next)
  }, [active, targetRefStable, pad, holeGroups])

  useLayoutEffect(() => {
    if (!active) {
      setMeasure(null)
      lastMeasureRef.current = null
      return
    }
    setMeasure(null)
    lastMeasureRef.current = null
    update()
  }, [active, targetRefStable, update])

  useLayoutEffect(() => {
    if (!active) return
    const root = targetRefStable?.current
    const observed = []
    if (root) observed.push(root)
    if (root && holeGroups?.length) {
      holeGroups.forEach((group) => {
        root.querySelectorAll(group.selector).forEach((el) => observed.push(el))
      })
    }
    const ro = observed.length ? new ResizeObserver(() => update()) : null
    observed.forEach((el) => ro.observe(el))
    const scrollRoot = document.querySelector('.app-layout')
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    scrollRoot?.addEventListener('scroll', update, { passive: true })
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      scrollRoot?.removeEventListener('scroll', update)
    }
  }, [active, targetRefStable, holeGroups, update])

  /** Ref на кнопку/карточку может появиться позже (layout, motion) — несколько попыток измерения. */
  useEffect(() => {
    if (!active) return
    let cancelled = false
    let frames = 0
    const tick = () => {
      if (cancelled) return
      update()
      frames += 1
      if (frames < 24 && !lastMeasureRef.current) {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
    const timers = [50, 280, 700, 1500].map((delay) => window.setTimeout(() => {
      if (!cancelled) update()
    }, delay))
    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [active, update])

  if (typeof document === 'undefined') return null

  const { w: vw, h: vh } = viewport
  const stored = measure || lastMeasureRef.current
  const r = stored?.box || null
  const holes = stored?.holes || []
  const multi = Boolean(stored?.multi && holes.length > 1)

  const bubbleW = Math.min(bubbleMaxWidth, Math.max(180, vw - 40))
  /** Примерная высота компактного баббла (padding + 1–2 строки текста). */
  const bubbleApproxH = message && String(message).length > 42 ? 58 : 44
  let bubbleLeft = 16
  let bubbleTop = 24
  let stemPath = ''
  let headPath = ''

  if (r && vw > 0 && vh > 0) {
    const tx = r.left + r.width / 2
    const tyTop = r.top
    const tyBottom = r.top + r.height

    bubbleLeft = Math.max(16, Math.min(tx - bubbleW / 2 + bubbleShiftX, vw - bubbleW - 16))

    const preferAbove = r.top > bubbleApproxH + 96
    let arrowFrom
    let arrowTo
    if (preferAbove) {
      bubbleTop = Math.max(16, r.top - bubbleApproxH - 40 + bubbleShiftY)
      arrowFrom = { x: bubbleLeft + bubbleW / 2, y: bubbleTop + bubbleApproxH + 2 }
      arrowTo = { x: tx, y: tyTop - 3 }
    } else {
      bubbleTop = Math.min(vh - bubbleApproxH - 16, tyBottom + 36 + bubbleShiftY)
      arrowFrom = { x: bubbleLeft + bubbleW / 2, y: bubbleTop - 2 }
      arrowTo = { x: tx, y: tyBottom + 3 }
    }

    const dx = arrowTo.x - arrowFrom.x
    const dy = arrowTo.y - arrowFrom.y
    /** Более длинная плавная дуга, направленная к целевому элементу. */
    const lift = preferAbove ? Math.max(64, Math.abs(dy) * 0.5) : -Math.max(64, Math.abs(dy) * 0.5)
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
    const headDepth = 11
    const headHalf = 6
    const perpX = -uy
    const perpY = ux
    const baseMid = { x: tip.x - ux * headDepth, y: tip.y - uy * headDepth }
    let wingL = { x: baseMid.x + perpX * headHalf, y: baseMid.y + perpY * headHalf }
    let wingR = { x: baseMid.x - perpX * headHalf, y: baseMid.y - perpY * headHalf }

    // Чуть поворачиваем только наконечник против часовой, чтобы он смотрел левее.
    const headRotateRad = (headRotateDeg * Math.PI) / 180
    const cosA = Math.cos(headRotateRad)
    const sinA = Math.sin(headRotateRad)
    const rotateAroundTip = (p) => {
      const dxp = p.x - tip.x
      const dyp = p.y - tip.y
      return {
        x: tip.x + dxp * cosA - dyp * sinA,
        y: tip.y + dxp * sinA + dyp * cosA,
      }
    }
    wingL = rotateAroundTip(wingL)
    wingR = rotateAroundTip(wingR)

    const shaftEnd = { x: tip.x - ux * 1.2, y: tip.y - uy * 1.2 }
    stemPath = `M ${arrowFrom.x} ${arrowFrom.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${shaftEnd.x} ${shaftEnd.y}`
    headPath = `M ${wingL.x} ${wingL.y} L ${tip.x} ${tip.y} M ${wingR.x} ${wingR.y} L ${tip.x} ${tip.y}`
  }

  const dimPath = holes.length && vw > 0 ? spotlightDimPath(vw, vh, holes) : ''
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
              {multi ? null : (
                <>
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
                </>
              )}

              <svg
                className={`profile-spotlight__dim-svg${multi ? ' profile-spotlight__dim-svg--multi' : ''}`}
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
                  pointerEvents={multi ? 'fill' : 'none'}
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
                    className="profile-spotlight__arrow-stroke profile-spotlight__arrow-head"
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
