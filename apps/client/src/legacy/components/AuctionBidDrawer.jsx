import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import './AuctionBidDrawer.css'

export default function AuctionBidDrawer({ isOpen, onClose, title, children }) {
  const { t } = useTranslation()
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  const {
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
  } = useBottomSheetDrag({
    isOpen,
    visible,
    isClosing,
    requestClose,
    panelClosingClass: 'auction-bid-drawer__panel--closing',
    maxViewportHeightRatio: 0.62,
  })

  useEffect(() => {
    if (!visible) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [visible])

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanelClasses = isClosing
    ? `${closingPanel} drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing`
    : closingPanel

  return createPortal(
    <>
      <div
        role="presentation"
        className={`auction-bid-drawer__backdrop${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <div
        className={`auction-bid-drawer${isDragging ? ' auction-bid-drawer--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-bid-drawer-title"
      >
        <div
          ref={panelRef}
          className={`auction-bid-drawer__panel${closingPanelClasses}${
            isEntering ? ' auction-bid-drawer__panel--entering' : ''
          }${isCollapsed ? ' auction-bid-drawer__panel--collapsed' : ''}`}
          style={panelDragStyle}
        >
          <div
            className="auction-bid-drawer__drag-zone"
            onPointerDown={onDragZonePointerDown}
            onPointerMove={onDragZonePointerMove}
            onPointerUp={onDragZonePointerUp}
            onPointerCancel={onDragZonePointerCancel}
          >
            <div className="auction-bid-drawer__handle" aria-hidden="true">
              <span className="auction-bid-drawer__handle-pill" />
            </div>
          </div>

          <div className="auction-bid-drawer__header">
            {title ? (
              <h2 id="auction-bid-drawer-title" className="auction-bid-drawer__title">
                {title}
              </h2>
            ) : (
              <span id="auction-bid-drawer-title" className="auction-bid-drawer__title-sr">
                {t('placeBid')}
              </span>
            )}
            <button
              type="button"
              className="auction-bid-drawer__close"
              onClick={() => requestClose()}
              aria-label={t('closeAria')}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="auction-bid-drawer__body">{children}</div>
        </div>
      </div>
    </>,
    document.body,
  )
}
