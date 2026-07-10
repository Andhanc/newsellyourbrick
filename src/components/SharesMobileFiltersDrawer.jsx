import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import '../styles/drawerDismiss.css'
import './SharesMobileFiltersDrawer.css'

export default function SharesMobileFiltersDrawer({
  isOpen,
  onClose,
  title = 'Фильтры',
  children,
  onApply,
  applyLabel,
}) {
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.panel,
  })

  useEffect(() => {
    if (!visible) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanel = isClosing ? ' drawer-dismiss-from-right--closing' : ''

  const handleApply = () => {
    onApply?.()
    requestClose()
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className={`shares-mobile-filters-drawer__backdrop${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <aside
        className={`shares-mobile-filters-drawer__panel${closingPanel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shares-mobile-filters-drawer-title"
      >
        <div className="shares-mobile-filters-drawer__header">
          <h2 id="shares-mobile-filters-drawer-title">{title}</h2>
          <button
            type="button"
            className="shares-mobile-filters-drawer__close"
            onClick={() => requestClose()}
            aria-label="Закрыть"
          >
            <FiX size={20} aria-hidden />
          </button>
        </div>

        <div className="shares-mobile-filters-drawer__body">{children}</div>

        {applyLabel ? (
          <div className="shares-mobile-filters-drawer__footer">
            <button
              type="button"
              className="shares-mobile-filters-drawer__apply"
              onClick={handleApply}
            >
              {applyLabel}
            </button>
          </div>
        ) : null}
      </aside>
    </>,
    document.body,
  )
}
