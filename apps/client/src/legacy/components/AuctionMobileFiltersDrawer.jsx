import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import AuctionDesktopFilters from './AuctionDesktopFilters'
import './AuctionMobileFiltersDrawer.css'

export default function AuctionMobileFiltersDrawer({
  isOpen,
  onClose,
  filterProps,
  children,
}) {
  const { t } = useTranslation()
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
    panelClosingClass: 'auction-mobile-filters-drawer__panel--closing',
    maxViewportHeightRatio: 0.92,
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

  const handleApply = () => {
    filterProps?.onApply?.()
    requestClose()
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className={`auction-mobile-filters-drawer__backdrop${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <div
        className={`auction-mobile-filters-drawer${
          isDragging ? ' auction-mobile-filters-drawer--dragging' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-mobile-filters-drawer-title"
      >
        <div
          ref={panelRef}
          className={`auction-mobile-filters-drawer__panel${closingPanelClasses}${
            isCollapsed ? ' auction-mobile-filters-drawer__panel--collapsed' : ''
          }`}
          style={panelDragStyle}
        >
          <div
            className="auction-mobile-filters-drawer__drag-zone"
            onPointerDown={onDragZonePointerDown}
            onPointerMove={onDragZonePointerMove}
            onPointerUp={onDragZonePointerUp}
            onPointerCancel={onDragZonePointerCancel}
          >
            <div className="auction-mobile-filters-drawer__handle" aria-hidden="true">
              <span className="auction-mobile-filters-drawer__handle-pill" />
            </div>
          </div>

          <div className="auction-mobile-filters-drawer__header">
            <h2 id="auction-mobile-filters-drawer-title" className="auction-mobile-filters-drawer__title">
              {t('filters')}
            </h2>
            <button
              type="button"
              className="auction-mobile-filters-drawer__close"
              onClick={() => requestClose()}
              aria-label={t('closeAria')}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="auction-mobile-filters-drawer__scroll">
            {children ?? (
              <AuctionDesktopFilters {...filterProps} variant="drawer" onApply={handleApply} />
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
