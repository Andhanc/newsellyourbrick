import { forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react'
import './ShareSignaturePad.css'

/**
 * Компактное поле подписи: чёрное по белому. ref: { clear(), isEmpty(), toDataURL() }
 */
const ShareSignaturePad = forwardRef(function ShareSignaturePad({ active }, ref) {
  const frameRef = useRef(null)
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const lastPoint = useRef(null)
  const hasInk = useRef(false)
  const logicalSizeRef = useRef({ width: 0, height: 0 })
  const activeRef = useRef(active)
  activeRef.current = active

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const frame = frameRef.current
    if (!canvas || !frame) return

    const w = Math.floor(frame.clientWidth)
    const h = Math.floor(frame.clientHeight)
    if (w < 16 || h < 16) return

    logicalSizeRef.current = { width: w, height: h }

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    hasInk.current = false
    lastPoint.current = null
  }, [])

  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const { width, height } = logicalSizeRef.current
    if (!width || !height) return null

    const r = canvas.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return null

    let clientX
    let clientY
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = ((clientX - r.left) / r.width) * width
    const y = ((clientY - r.top) / r.height) * height
    return { x, y }
  }, [])

  const start = useCallback(
    (e) => {
      if (!activeRef.current) return
      e.preventDefault()
      const p = getPoint(e)
      if (!p) return
      drawing.current = true
      lastPoint.current = p
    },
    [getPoint]
  )

  const move = useCallback(
    (e) => {
      if (!activeRef.current || !drawing.current) return
      e.preventDefault()
      const p = getPoint(e)
      if (!p || lastPoint.current == null) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return
      ctx.strokeStyle = '#000000'
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      lastPoint.current = p
      hasInk.current = true
    },
    [getPoint]
  )

  const end = useCallback((e) => {
    if (e?.cancelable) e.preventDefault()
    drawing.current = false
    lastPoint.current = null
  }, [])

  useEffect(() => {
    if (!active) return undefined

    let retries = 0
    const runSetup = () => {
      setupCanvas()
      const { width, height } = logicalSizeRef.current
      if ((width < 16 || height < 16) && retries < 12) {
        retries += 1
        requestAnimationFrame(runSetup)
      }
    }

    runSetup()
    const t = window.setTimeout(runSetup, 50)
    const t2 = window.setTimeout(runSetup, 200)

    const frame = frameRef.current
    if (!frame) {
      return () => {
        window.clearTimeout(t)
        window.clearTimeout(t2)
      }
    }

    const ro = new ResizeObserver(() => {
      runSetup()
    })
    ro.observe(frame)

    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
      ro.disconnect()
    }
  }, [active, setupCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) return undefined
    const opts = { passive: false }
    const ts = (e) => start(e)
    const tm = (e) => {
      e.preventDefault()
      move(e)
    }
    const te = (e) => end(e)
    canvas.addEventListener('touchstart', ts, opts)
    canvas.addEventListener('touchmove', tm, opts)
    canvas.addEventListener('touchend', te, opts)
    canvas.addEventListener('touchcancel', te, opts)
    return () => {
      canvas.removeEventListener('touchstart', ts, opts)
      canvas.removeEventListener('touchmove', tm, opts)
      canvas.removeEventListener('touchend', te, opts)
      canvas.removeEventListener('touchcancel', te, opts)
    }
  }, [active, start, move, end])

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        setupCanvas()
      },
      isEmpty: () => !hasInk.current,
      toDataURL: () => {
        const canvas = canvasRef.current
        if (!canvas) return ''
        try {
          return canvas.toDataURL('image/png')
        } catch {
          return ''
        }
      },
    }),
    [setupCanvas]
  )

  if (!active) return null

  return (
    <div className="share-signature-pad">
      <div className="share-signature-pad__frame" ref={frameRef}>
        <canvas
          ref={canvasRef}
          className="share-signature-pad__canvas"
          role="img"
          aria-label="Поле для подписи"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
        />
      </div>
      <p className="share-signature-pad__hint">Подпись мышью или пальцем</p>
    </div>
  )
})

export default ShareSignaturePad
