import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import '../styles/drawerDismiss.css'
import './SharesMobileFiltersDrawer.css'

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

export default function SharesMobileFiltersDrawer({
  isOpen,
  onClose,
  title = 'Фильтры',
  children,
  onApply,
  applyLabel,
  onReset,
  resetLabel = 'Сбросить',
}) {
  const panelRef = useRef(null)
  const closeButtonRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  const previousOverflowRef = useRef('')
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.panel,
  })

  const restoreFocus = useCallback(() => {
    window.requestAnimationFrame(() => previouslyFocusedRef.current?.focus?.())
  }, [])

  const handleRequestClose = useCallback(() => {
    requestClose(restoreFocus)
  }, [requestClose, restoreFocus])

  useEffect(() => {
    if (!visible || typeof document === 'undefined') return undefined
    previouslyFocusedRef.current = document.activeElement
    previousOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => {
      ;(closeButtonRef.current || focusableElements(panelRef.current)[0] || panelRef.current)?.focus?.()
    })
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflowRef.current
      previouslyFocusedRef.current?.focus?.()
    }
  }, [visible])

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleRequestClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusables = focusableElements(panelRef.current)
    if (!focusables.length) {
      event.preventDefault()
      panelRef.current?.focus()
      return
    }
    const first = focusables[0]
    const last = focusables.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }, [handleRequestClose])

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanel = isClosing ? ' drawer-dismiss-from-right--closing' : ''

  const handleApply = () => {
    onApply?.()
    handleRequestClose()
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className={`shares-mobile-filters-drawer__backdrop${closingBackdrop}`}
        onClick={handleRequestClose}
      />
      <aside
        ref={panelRef}
        className={`shares-mobile-filters-drawer__panel${closingPanel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shares-mobile-filters-drawer-title"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="shares-mobile-filters-drawer__header">
          <h2 id="shares-mobile-filters-drawer-title">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="shares-mobile-filters-drawer__close"
            onClick={handleRequestClose}
            aria-label="Закрыть"
          >
            <FiX size={20} aria-hidden />
          </button>
        </div>

        <div className="shares-mobile-filters-drawer__body">{children}</div>

        {applyLabel ? (
          <div className="shares-mobile-filters-drawer__footer">
            <button type="button" className="shares-mobile-filters-drawer__apply" onClick={handleApply}>
              {applyLabel}
            </button>
            {onReset ? (
              <button type="button" className="shares-mobile-filters-drawer__reset" onClick={onReset}>
                {resetLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </aside>
    </>,
    document.body,
  )
}

export { FOCUSABLE_SELECTOR }
