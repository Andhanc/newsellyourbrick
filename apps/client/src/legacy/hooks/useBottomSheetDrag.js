import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const DISMISS_DRAG_PX = 100
const MIN_SHEET_HEIGHT = 64
const COLLAPSED_SNAP_RATIO = 0.5
const ENTER_ANIMATION_MS = 440
const CONTENT_PULL_ARM_PX = 14
const WHEEL_DISMISS_PX = 90
const HANDLE_SELECTOR = '[data-sheet-drag-zone], [class*="drag-zone"], [class*="__handle"], .buyer-sheet__handle'
const INTERACTIVE_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

function findScrollableAncestor(start, root) {
  let node = start instanceof Element ? start : start?.parentElement
  while (node && node !== root) {
    const style = window.getComputedStyle(node)
    const canScroll = node.scrollHeight > node.clientHeight + 1
    const overflowY = style.overflowY
    if (canScroll && (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')) {
      return node
    }
    node = node.parentElement
  }
  return root
}

/**
 * Жесты нижнего sheet: ручка, свайп вниз по контенту у верхнего края, закрытие.
 */
export function useBottomSheetDrag({
  isOpen,
  visible,
  isClosing,
  requestClose,
  panelClosingClass,
  /** Доля высоты окна (0–1), например 0.5 = не больше половины экрана */
  maxViewportHeightRatio = null,
  /** Только сдвиг и закрытие, без изменения высоты панели */
  dismissOnly = false,
  /** Выключить translate во время жеста (например, если панель уже анимирует Framer Motion) */
  applyVisual = true,
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
  const contentPullRef = useRef({ armed: false, active: false, startY: 0 })
  const contentPullActiveRef = useRef(false)
  const finishDragRef = useRef(() => {})
  const requestCloseRef = useRef(requestClose)
  const isClosingRef = useRef(isClosing)
  const isDraggingRef = useRef(isDragging)

  requestCloseRef.current = requestClose
  isClosingRef.current = isClosing
  isDraggingRef.current = isDragging

  const getMaxSheetHeight = useCallback(() => {
    if (maxViewportHeightRatio == null || maxViewportHeightRatio <= 0) return Infinity
    return Math.max(MIN_SHEET_HEIGHT, Math.round(window.innerHeight * maxViewportHeightRatio))
  }, [maxViewportHeightRatio])

  const measureFullHeight = useCallback(
    (applySheetHeight = true) => {
      if (dismissOnly) return
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
    [getMaxSheetHeight, dismissOnly],
  )

  useEffect(() => {
    if (!isOpen) {
      setDragLayoutReady(false)
      setSheetHeight(null)
      return undefined
    }
    if (dismissOnly) {
      setDragLayoutReady(true)
      return undefined
    }
    setDragLayoutReady(false)
    const t = window.setTimeout(() => setDragLayoutReady(true), ENTER_ANIMATION_MS)
    return () => window.clearTimeout(t)
  }, [isOpen, dismissOnly])

  useLayoutEffect(() => {
    if (dismissOnly || !visible || !isOpen) return undefined
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
  }, [visible, isOpen, dragLayoutReady, measureFullHeight, isDragging, dismissOnly])

  useEffect(() => {
    if (isOpen) {
      setDragY(0)
      dragYRef.current = 0
      setIsDragging(false)
      contentPullRef.current = { armed: false, active: false, startY: 0 }
      contentPullActiveRef.current = false
    }
  }, [isOpen])

  const finishDrag = useCallback(() => {
    const fromContentPull = contentPullActiveRef.current
    contentPullActiveRef.current = false
    setIsDragging(false)
    const full = fullHeightRef.current
    const h = sheetHeight ?? full
    const shouldDismiss =
      dragYRef.current >= DISMISS_DRAG_PX ||
      (!dismissOnly &&
        !fromContentPull &&
        h <= MIN_SHEET_HEIGHT + 8 &&
        dragYRef.current > 24)

    if (shouldDismiss) {
      requestClose()
      return
    }

    if (dismissOnly || fromContentPull) {
      setDragY(0)
      dragYRef.current = 0
      return
    }

    if (h < full * COLLAPSED_SNAP_RATIO) {
      setSheetHeight(MIN_SHEET_HEIGHT)
    } else {
      setSheetHeight(full)
    }
    setDragY(0)
    dragYRef.current = 0
  }, [requestClose, sheetHeight, dismissOnly])

  finishDragRef.current = finishDrag

  const onDragZonePointerDown = useCallback(
    (e) => {
      if (isClosing) return
      e.preventDefault()
      if (!dismissOnly) {
        if (!fullHeightRef.current) measureFullHeight(true)
        else if (sheetHeight == null) setSheetHeight(fullHeightRef.current)
      }
      setIsDragging(true)
      pointerStartYRef.current = e.clientY
      heightAtDragStartRef.current = sheetHeight ?? fullHeightRef.current
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [isClosing, sheetHeight, measureFullHeight, dismissOnly],
  )

  const onDragZonePointerMove = useCallback(
    (e) => {
      if (!isDragging || contentPullActiveRef.current) return
      const dy = e.clientY - pointerStartYRef.current

      if (dismissOnly) {
        const extra = Math.max(0, dy)
        dragYRef.current = extra
        setDragY(extra)
        return
      }

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
    [isDragging, dismissOnly],
  )

  const onDragZonePointerUp = useCallback(
    (e) => {
      if (!isDragging || contentPullActiveRef.current) return
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
    if (!isDragging || contentPullActiveRef.current) return
    finishDrag()
  }, [isDragging, finishDrag])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !visible || !isOpen) return undefined

    const onTouchStart = (event) => {
      if (isClosingRef.current) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(HANDLE_SELECTOR) || target.closest(INTERACTIVE_SELECTOR)) {
        contentPullRef.current.armed = false
        return
      }
      const scroller = findScrollableAncestor(target, panel)
      if (scroller && scroller.scrollTop > 1) {
        contentPullRef.current.armed = false
        return
      }
      contentPullRef.current = {
        armed: true,
        active: false,
        startY: event.touches[0]?.clientY ?? 0,
      }
    }

    const onTouchMove = (event) => {
      if (!contentPullRef.current.armed || isClosingRef.current) return
      if (isDraggingRef.current && !contentPullActiveRef.current) return
      const y = event.touches[0]?.clientY ?? contentPullRef.current.startY
      const dy = y - contentPullRef.current.startY
      if (!contentPullRef.current.active) {
        if (dy < CONTENT_PULL_ARM_PX) {
          if (dy < -10) contentPullRef.current.armed = false
          return
        }
        const scroller = findScrollableAncestor(event.target, panel)
        if (scroller && scroller.scrollTop > 1) {
          contentPullRef.current.armed = false
          return
        }
        contentPullRef.current.active = true
        contentPullActiveRef.current = true
        setIsDragging(true)
      }
      event.preventDefault()
      const extra = Math.max(0, dy)
      dragYRef.current = extra
      setDragY(extra)
    }

    const onTouchEnd = () => {
      if (contentPullRef.current.active) finishDragRef.current()
      contentPullRef.current = { armed: false, active: false, startY: 0 }
    }

    let wheelAcc = 0
    const onWheel = (event) => {
      if (isClosingRef.current) return
      const scroller = findScrollableAncestor(event.target, panel)
      if (scroller && scroller.scrollTop > 1) {
        wheelAcc = 0
        return
      }
      if (event.deltaY < 0) {
        wheelAcc += -event.deltaY
        if (wheelAcc >= WHEEL_DISMISS_PX) {
          wheelAcc = 0
          requestCloseRef.current()
        }
      } else {
        wheelAcc = 0
      }
    }

    panel.addEventListener('touchstart', onTouchStart, { passive: true })
    panel.addEventListener('touchmove', onTouchMove, { passive: false })
    panel.addEventListener('touchend', onTouchEnd)
    panel.addEventListener('touchcancel', onTouchEnd)
    panel.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      panel.removeEventListener('touchstart', onTouchStart)
      panel.removeEventListener('touchmove', onTouchMove)
      panel.removeEventListener('touchend', onTouchEnd)
      panel.removeEventListener('touchcancel', onTouchEnd)
      panel.removeEventListener('wheel', onWheel)
    }
  }, [visible, isOpen])

  const isCollapsed =
    !dismissOnly &&
    dragLayoutReady &&
    sheetHeight != null &&
    fullHeightRef.current > 0 &&
    sheetHeight <= MIN_SHEET_HEIGHT + 4

  const panelDragStyle = !applyVisual
    ? undefined
    : dismissOnly
      ? !isClosing && (isDragging || dragY > 0)
        ? {
            transform: dragY > 0 ? `translate3d(0, ${dragY}px, 0)` : undefined,
            transition: isDragging
              ? 'none'
              : 'transform 0.32s cubic-bezier(0.22, 1, 0.32, 1)',
          }
        : undefined
      : !isClosing &&
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

export function sheetHandleDragProps({
  onDragZonePointerDown,
  onDragZonePointerMove,
  onDragZonePointerUp,
  onDragZonePointerCancel,
}) {
  return {
    onPointerDown: onDragZonePointerDown,
    onPointerMove: onDragZonePointerMove,
    onPointerUp: onDragZonePointerUp,
    onPointerCancel: onDragZonePointerCancel,
  }
}

export function assignSheetPanelRef(hookRef, extraRef) {
  return (node) => {
    hookRef.current = node
    if (typeof extraRef === 'function') extraRef(node)
    else if (extraRef) extraRef.current = node
  }
}
