import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DRAWER_DISMISS_MS, useDrawerDismiss } from '../../hooks/useDrawerDismiss'
import './BuyerSheetShell.css'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableElements(root) {
  if (!root) return []
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
  )
}

export default function BuyerSheetShell({
  isOpen,
  onClose,
  titleId,
  labelledBy,
  describedBy,
  tone = 'detail',
  closeLabel = 'Закрыть',
  dismissible = true,
  footer = null,
  initialFocusRef,
  children,
  className = '',
}) {
  const surfaceRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  const bodyOverflowRef = useRef('')
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.panel,
  })

  const restoreFocus = useCallback(() => {
    window.requestAnimationFrame(() => previouslyFocusedRef.current?.focus?.())
  }, [])

  const handleRequestClose = useCallback(() => {
    if (!dismissible) return
    requestClose(restoreFocus)
  }, [dismissible, requestClose, restoreFocus])

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) handleRequestClose()
    },
    [handleRequestClose],
  )

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        if (dismissible) {
          event.preventDefault()
          handleRequestClose()
        }
        return
      }

      if (event.key !== 'Tab') return
      const focusables = focusableElements(surfaceRef.current)
      if (focusables.length === 0) {
        event.preventDefault()
        surfaceRef.current?.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [dismissible, handleRequestClose],
  )

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined

    previouslyFocusedRef.current = document.activeElement
    bodyOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      const preferred = initialFocusRef?.current
      const firstFocusable = focusableElements(surfaceRef.current)[0]
      ;(preferred || closeButtonRef.current || firstFocusable || surfaceRef.current)?.focus?.()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = bodyOverflowRef.current
      previouslyFocusedRef.current?.focus?.()
    }
  }, [initialFocusRef, isOpen])

  if (!visible || typeof document === 'undefined') return null

  const rootClassName = [
    'buyer-sheet',
    `buyer-sheet--${tone}`,
    isClosing ? 'buyer-sheet--closing' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return createPortal(
    <div className={rootClassName} onKeyDown={handleKeyDown}>
      <div
        className={`buyer-sheet__backdrop${isClosing ? ' drawer-dismiss-backdrop--closing' : ''}`}
        role="presentation"
        onClick={handleBackdropClick}
      />
      <section
        ref={surfaceRef}
        className={`buyer-sheet__surface${isClosing ? ' drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        <div className="buyer-sheet__handle" aria-hidden="true"><span /></div>
        {dismissible ? (
          <button
            ref={closeButtonRef}
            type="button"
            className="buyer-sheet__close buyer-touch-target"
            onClick={handleRequestClose}
            aria-label={closeLabel}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
        <div className="buyer-sheet__body">{children}</div>
        {footer ? <footer className="buyer-sheet__footer buyer-safe-bottom">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  )
}

export { FOCUSABLE_SELECTOR }
