import { createPortal } from 'react-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useMobileModalLayout } from '../hooks/useMobileModalLayout'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import '../styles/drawerDismiss.css'

/**
 * Оболочка: на мобильном — bottom sheet drawer, на десктопе — центрированная модалка.
 */
export default function RoleSwitchDrawerShell({
  isOpen,
  onClose,
  children,
  ariaLabelledBy,
  wide = false,
  /** Доля высоты экрана для sheet (0–1). null — без ограничения. */
  maxHeightRatio = 0.78,
  closeLabel,
  onBack,
  backLabel,
}) {
  const isMobile = useMobileModalLayout()
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  const {
    panelRef,
    isDragging,
    panelDragStyle,
    isCollapsed,
    closingPanel,
    onDragZonePointerDown,
    onDragZonePointerMove,
    onDragZonePointerUp,
    onDragZonePointerCancel,
  } = useBottomSheetDrag({
    isOpen,
    visible,
    isClosing,
    requestClose,
    panelClosingClass: 'role-switch-drawer__panel--closing',
    maxViewportHeightRatio: maxHeightRatio,
  })

  if (!visible) return null

  const handleBackdropClose = () => requestClose()

  if (!isMobile) {
    return (
      <div className="role-switch-overlay" onClick={handleBackdropClose} role="presentation">
        <div
          className={`role-switch-modal${wide ? ' role-switch-modal--wide' : ''}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledBy}
        >
          <div className="role-switch-modal__header">
            {onBack ? (
              <button type="button" className="role-switch-modal__back" onClick={onBack}>
                <FiArrowLeft size={18} aria-hidden />
                {backLabel}
              </button>
            ) : (
              <span className="role-switch-modal__header-spacer" aria-hidden />
            )}
            <button
              type="button"
              className="role-switch-modal__close"
              onClick={handleBackdropClose}
              aria-label={closeLabel}
            >
              <span aria-hidden>×</span>
            </button>
          </div>
          {children}
        </div>
      </div>
    )
  }

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanelClasses = isClosing
    ? `${closingPanel} drawer-dismiss-from-bottom--closing`
    : closingPanel

  return createPortal(
    <>
      <div
        role="presentation"
        className={`role-switch-drawer__backdrop${closingBackdrop}`}
        onClick={handleBackdropClose}
      />
      <div
        className={`role-switch-drawer${isDragging ? ' role-switch-drawer--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
      >
        <div
          ref={panelRef}
          className={`role-switch-drawer__panel${closingPanelClasses}${isCollapsed ? ' role-switch-drawer__panel--collapsed' : ''}`}
          style={panelDragStyle}
        >
          <div className="role-switch-drawer__toolbar">
            <div className="role-switch-drawer__toolbar-side role-switch-drawer__toolbar-side--start">
              {onBack ? (
                <button type="button" className="role-switch-drawer__back" onClick={onBack}>
                  <FiArrowLeft size={18} aria-hidden />
                  <span>{backLabel}</span>
                </button>
              ) : (
                <span className="role-switch-drawer__toolbar-spacer" aria-hidden />
              )}
            </div>

            <div
              className="role-switch-drawer__drag-zone"
              onPointerDown={onDragZonePointerDown}
              onPointerMove={onDragZonePointerMove}
              onPointerUp={onDragZonePointerUp}
              onPointerCancel={onDragZonePointerCancel}
            >
              <div className="role-switch-drawer__handle" aria-hidden="true">
                <span className="role-switch-drawer__handle-pill" />
              </div>
            </div>

            <div className="role-switch-drawer__toolbar-side role-switch-drawer__toolbar-side--end">
              <button
                type="button"
                className="role-switch-drawer__close"
                onClick={handleBackdropClose}
                aria-label={closeLabel}
              >
                <span aria-hidden>×</span>
              </button>
            </div>
          </div>

          <div className="role-switch-drawer__scroll">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  )
}
