import { useState, useEffect, useCallback, useRef } from 'react'

export const DRAWER_DISMISS_MS = {
  backdrop: 280,
  panel: 380,
  menu: 300,
  spring: 400,
}

/**
 * Держит drawer в DOM во время анимации закрытия, затем вызывает onClose.
 *
 * @param {boolean} isOpen
 * @param {() => void} [onClose]
 * @param {{ duration?: number }} [options]
 */
export function useDrawerDismiss(isOpen, onClose, { duration = DRAWER_DISMISS_MS.panel } = {}) {
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const visible = isOpen || isClosing

  const requestClose = useCallback(
    (afterClose) => {
      if (!isOpen || isClosing) return
      setIsClosing(true)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null
        setIsClosing(false)
        onCloseRef.current?.()
        afterClose?.()
      }, duration)
    },
    [isOpen, isClosing, duration],
  )

  useEffect(() => {
    if (isOpen || isClosing) return
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setIsClosing(false)
  }, [isOpen, isClosing])

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    },
    [],
  )

  return { visible, isClosing, requestClose }
}
