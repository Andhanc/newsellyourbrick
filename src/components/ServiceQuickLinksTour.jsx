import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import './ServiceQuickLinksTour.css'

const PAD = 8
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

function multiSpotlightDimPath(vw, vh, holes) {
  const outer = `M 0 0 H ${vw} V ${vh} H 0 Z`
  const inners = holes.map((h) => roundedRectPath(h.left, h.top, h.width, h.height, h.rx)).join(' ')
  return `${outer} ${inners}`
}

/** Затемнение вне объединения прямоугольников «дырок» (сортировка по left). */
function buildHitSlabs(vw, vh, holes) {
  if (!holes.length) return []
  const sorted = [...holes].sort((a, b) => a.left - b.left)
  const y0 = Math.min(...sorted.map((h) => h.top))
  const y1 = Math.max(...sorted.map((h) => h.top + h.height))
  const slabs = []
  slabs.push({ left: 0, top: 0, width: vw, height: Math.max(0, y0) })
  slabs.push({ left: 0, top: y1, width: vw, height: Math.max(0, vh - y1) })
  let x = 0
  for (const h of sorted) {
    if (h.left > x) {
      slabs.push({ left: x, top: y0, width: h.left - x, height: y1 - y0 })
    }
    x = h.left + h.width
  }
  if (x < vw) {
    slabs.push({ left: x, top: y0, width: vw - x, height: y1 - y0 })
  }
  return slabs
}

function arrowStemAndHead(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lift = -Math.max(52, Math.abs(dy) * 0.42)
  const c1 = { x: from.x + dx * 0.22, y: from.y + lift * 0.72 }
  const c2 = { x: to.x - dx * 0.12, y: to.y - lift * 0.48 }
  const stemPath = `M ${from.x} ${from.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`
  const tip = to
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
  const headDepth = 13
  const headHalf = 6.5
  const perpX = -uy
  const perpY = ux
  const baseMid = { x: tip.x - ux * headDepth, y: tip.y - uy * headDepth }
  const wingL = { x: baseMid.x + perpX * headHalf, y: baseMid.y + perpY * headHalf }
  const wingR = { x: baseMid.x - perpX * headHalf, y: baseMid.y - perpY * headHalf }
  const headPath = `M ${wingL.x} ${wingL.y} L ${tip.x} ${tip.y} M ${wingR.x} ${wingR.y} L ${tip.x} ${tip.y}`
  return { stemPath, headPath }
}

/**
 * Затемнение + три «окна» на карточках направлений (Доли / Аукцион / Долги), стрелки к подсказке внизу.
 * Проп `bonusesRef` — ref средней карточки (исторически «бонусы», сейчас аукцион).
 */
export function ServiceQuickLinksTour({ active, onDismiss, sharesRef, debtsRef, bonusesRef }) {
  const reduceMotion = useReducedMotion()
  const panelRef = useRef(null)
  const [viewport, setViewport] = useState(() =>
    typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 0, h: 0 },
  )
  const [holes, setHoles] = useState([])
  const [panelBox, setPanelBox] = useState(null)
  const lastHolesRef = useRef([])

  const update = useCallback(() => {
    if (!active || typeof window === 'undefined') return
    const w = window.innerWidth
    const h = window.innerHeight
    setViewport({ w, h })
    const measured = [sharesRef?.current, bonusesRef?.current, debtsRef?.current]
      .map((el) => measureTarget(el))
      .filter(Boolean)
    if (measured.length) {
      lastHolesRef.current = measured
      setHoles(measured)
    }
    const pr = panelRef.current?.getBoundingClientRect()
    if (pr && pr.width > 0) {
      setPanelBox({ top: pr.top, left: pr.left, width: pr.width, height: pr.height })
    }
  }, [active, sharesRef, bonusesRef, debtsRef])

  useLayoutEffect(() => {
    if (!active) return
    update()
  }, [active, update])

  useLayoutEffect(() => {
    if (!active || typeof window === 'undefined') return
    const el = bonusesRef?.current
    if (!el) return
    const id = window.setTimeout(() => {
      try {
        el.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
      } catch {
        /* ignore */
      }
    }, 80)
    return () => window.clearTimeout(id)
  }, [active, bonusesRef, reduceMotion])

  useLayoutEffect(() => {
    if (!active) return
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            window.requestAnimationFrame(update)
          })
        : null
    const els = [sharesRef?.current, bonusesRef?.current, debtsRef?.current, panelRef.current].filter(Boolean)
    els.forEach((el) => ro?.observe(el))
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      els.forEach((el) => ro?.unobserve(el))
      ro?.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [active, sharesRef, bonusesRef, debtsRef, update])

  useEffect(() => {
    if (!active) return
    const id = window.requestAnimationFrame(() => update())
    return () => window.cancelAnimationFrame(id)
  }, [active, update])

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
  const list = holes.length ? holes : lastHolesRef.current
  const dimPath = list.length && vw > 0 ? multiSpotlightDimPath(vw, vh, list) : ''
  const slabs = list.length && vw > 0 ? buildHitSlabs(vw, vh, list) : []

  const sorted = [...list].sort((a, b) => a.left - b.left)
  let arrowSvg = null
  if (panelBox && sorted.length > 0 && vw > 0) {
    const panelTop = panelBox.top
    const pl = panelBox.left
    const pw = panelBox.width
    const n = sorted.length
    const paths = []
    sorted.forEach((hole, i) => {
      const cx = hole.left + hole.width / 2
      const fromX = Math.max(pl + 16, Math.min(pl + pw - 16, pl + (pw * (i + 1)) / (n + 1)))
      const from = { x: fromX, y: panelTop }
      const to = { x: cx, y: hole.top + hole.height + 2 }
      const { stemPath, headPath } = arrowStemAndHead(from, to)
      paths.push(
        <g key={`arr-${i}`}>
          <path d={stemPath} fill="none" className="service-quick-links-tour__arrow-stroke" strokeLinecap="round" />
          <path d={headPath} fill="none" className="service-quick-links-tour__arrow-stroke" strokeLinecap="round" />
        </g>,
      )
    })
    arrowSvg = (
      <svg className="service-quick-links-tour__arrow-svg" width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} aria-hidden>
        {paths}
      </svg>
    )
  }

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
            </svg>
          ) : null}
          {arrowSvg}
          <div ref={panelRef} className="service-quick-links-tour__panel" role="dialog" aria-modal="true" aria-labelledby="service-quick-links-tour-title">
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
