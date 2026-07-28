import { useCallback, useRef } from 'react'

const DEFAULT_MIN_DISTANCE = 48

/**
 * Horizontal swipe on touch devices: swipe left → onSwipeLeft, swipe right → onSwipeRight.
 */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  minDistance = DEFAULT_MIN_DISTANCE,
}) {
  const touchStartRef = useRef(null)

  const onTouchStart = useCallback(
    (e) => {
      if (!enabled) return
      const touch = e.changedTouches?.[0]
      if (!touch) return
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    },
    [enabled],
  )

  const onTouchEnd = useCallback(
    (e) => {
      if (!enabled || !touchStartRef.current) return
      const touch = e.changedTouches?.[0]
      if (!touch) {
        touchStartRef.current = null
        return
      }

      const dx = touch.clientX - touchStartRef.current.x
      const dy = touch.clientY - touchStartRef.current.y
      touchStartRef.current = null

      if (Math.abs(dx) < minDistance || Math.abs(dx) <= Math.abs(dy)) return

      if (dx < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    },
    [enabled, minDistance, onSwipeLeft, onSwipeRight],
  )

  const onTouchCancel = useCallback(() => {
    touchStartRef.current = null
  }, [])

  return { onTouchStart, onTouchEnd, onTouchCancel }
}
