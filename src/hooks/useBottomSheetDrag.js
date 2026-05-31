import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const DISMISS_DRAG_PX = 100
const MIN_SHEET_HEIGHT = 64
const COLLAPSED_SNAP_RATIO = 0.5
const ENTER_ANIMATION_MS = 440

/**
 * Жесты нижнего sheet: тянуть за handle — менять высоту и закрыть свайпом вниз.
 */
export function useBottomSheetDrag({
  isOpen,
  visible,
  isClosing,
  requestClose,
  panelClosingClass,
  /** Доля высоты окна (0–1), например 0.5 = не больше половины экрана */
  maxViewportHeightRatio = null,
}) {
  const [dragY, setDragY] = useState(0)
  const [sheetHeight, setSheetHeight] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragLayoutReady, setDragLayoutReady] = useState(false)
  const panelRef = useRef(null)
  const fullHeightRef = useRef(0)
  const dragYRef = useRef(0)
  const pointerStartYRef = useRef(0)
  const heightAtDragStartRef = useRef(0)

  const getMaxSheetHeight = useCallback(() => {
    if (maxViewportHeightRatio == null || maxViewportHeightRatio <= 0) return Infinity
    return Math.max(MIN_SHEET_HEIGHT, Math.round(window.innerHeight * maxViewportHeightRatio))
  }, [maxViewportHeightRatio])

  const measureFullHeight = useCallback(
    (applySheetHeight = true) => {
      const panel = panelRef.current
      if (!panel) return
      const cap = getMaxSheetHeight()
      panel.style.height = ''
      if (Number.isFinite(cap)) {
        panel.style.maxHeight = `${cap}px`
      } else {
        panel.style.maxHeight = ''
      }
      const measured = panel.offsetHeight
      const h = Number.isFinite(cap) ? Math.min(measured, cap) : measured
      fullHeightRef.current = h
      if (applySheetHeight) setSheetHeight(h)
      setDragY(0)
      dragYRef.current = 0
    },
    [getMaxSheetHeight],
  )

  useEffect(() => {
    if (!isOpen) {
      setDragLayoutReady(false)
      setSheetHeight(null)
      return undefined
    }
    setDragLayoutReady(false)
    const t = window.setTimeout(() => setDragLayoutReady(true), ENTER_ANIMATION_MS)
    return () => window.clearTimeout(t)
  }, [isOpen])

  useLayoutEffect(() => {
    if (!visible || !isOpen) return
    measureFullHeight(false)
    if (!dragLayoutReady) return undefined
    measureFullHeight(true)
    const panel = panelRef.current
    if (!panel || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => {
      if (!isDragging) measureFullHeight(true)
    })
    ro.observe(panel)
    return () => ro.disconnect()
  }, [visible, isOpen, dragLayoutReady, measureFullHeight, isDragging])

  useEffect(() => {
    if (isOpen) {
      setDragY(0)
      dragYRef.current = 0
      setIsDragging(false)
    }
  }, [isOpen])

  const finishDrag = useCallback(() => {
    setIsDragging(false)
    const full = fullHeightRef.current
    const h = sheetHeight ?? full
    const shouldDismiss =
      dragYRef.current >= DISMISS_DRAG_PX ||
      (h <= MIN_SHEET_HEIGHT + 8 && dragYRef.current > 24)

    if (shouldDismiss) {
      requestClose()
      return
    }

    if (h < full * COLLAPSED_SNAP_RATIO) {
      setSheetHeight(MIN_SHEET_HEIGHT)
    } else {
      setSheetHeight(full)
    }
    setDragY(0)
    dragYRef.current = 0
  }, [requestClose, sheetHeight])

  const onDragZonePointerDown = useCallback(
    (e) => {
      if (isClosing) return
      e.preventDefault()
      if (!fullHeightRef.current) measureFullHeight(true)
      else if (sheetHeight == null) setSheetHeight(fullHeightRef.current)
      setIsDragging(true)
      pointerStartYRef.current = e.clientY
      heightAtDragStartRef.current = sheetHeight ?? fullHeightRef.current
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [isClosing, sheetHeight, measureFullHeight],
  )

  const onDragZonePointerMove = useCallback(
    (e) => {
      if (!isDragging) return
      const dy = e.clientY - pointerStartYRef.current
      const full = fullHeightRef.current
      const startH = heightAtDragStartRef.current

      if (dy >= 0) {
        const nextH = Math.max(MIN_SHEET_HEIGHT, startH - dy)
        setSheetHeight(nextH)
        const shrinkDone = startH - MIN_SHEET_HEIGHT
        if (dy > shrinkDone) {
          const extra = dy - shrinkDone
          dragYRef.current = extra
          setDragY(extra)
        } else {
          dragYRef.current = 0
          setDragY(0)
        }
      } else {
        const nextH = Math.min(full, startH - dy)
        setSheetHeight(nextH)
        dragYRef.current = 0
        setDragY(0)
      }
    },
    [isDragging],
  )

  const onDragZonePointerUp = useCallback(
    (e) => {
      if (!isDragging) return
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
      finishDrag()
    },
    [isDragging, finishDrag],
  )

  const onDragZonePointerCancel = useCallback(() => {
    if (!isDragging) return
    finishDrag()
  }, [isDragging, finishDrag])

  const isCollapsed =
    dragLayoutReady &&
    sheetHeight != null &&
    fullHeightRef.current > 0 &&
    sheetHeight <= MIN_SHEET_HEIGHT + 4

  const panelDragStyle =
    !isClosing &&
    dragLayoutReady &&
    (isDragging || dragY > 0 || isCollapsed)
      ? {
          height: sheetHeight ?? undefined,
          maxHeight: sheetHeight ?? undefined,
          transform: dragY > 0 ? `translate3d(0, ${dragY}px, 0)` : undefined,
          transition: isDragging
            ? 'none'
            : 'height 0.32s cubic-bezier(0.22, 1, 0.32, 1), transform 0.32s cubic-bezier(0.22, 1, 0.32, 1), max-height 0.32s cubic-bezier(0.22, 1, 0.32, 1)',
        }
      : undefined

  const isEntering = visible && isOpen && !isClosing && !dragLayoutReady

  const closingPanel = isClosing && panelClosingClass ? ` ${panelClosingClass}` : ''

  return {
    panelRef,
    isDragging,
    panelDragStyle,
    isCollapsed,
    isEntering,
    closingPanel,
    onDragZonePointerDown,
    onDragZonePointerMove,
    onDragZonePointerUp,
    onDragZonePointerCancel,
  }
}
