import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiColumns, FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import CompareFavoritesIllustration from './CompareFavoritesIllustration'
import './CompareFavoritesDrawer.css'

export default function CompareFavoritesDrawer({ isOpen, onClose, onCompare }) {
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
    panelClosingClass: 'compare-favorites-drawer__panel--closing',
  })

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanelClasses = isClosing
    ? `${closingPanel} drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing`
    : closingPanel

  const handleCompare = () => {
    requestClose(() => onCompare?.())
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className={`compare-favorites-drawer__backdrop${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <div
        className={`compare-favorites-drawer${isDragging ? ' compare-favorites-drawer--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-favorites-drawer-title"
      >
        <div
          ref={panelRef}
          className={`compare-favorites-drawer__panel${closingPanelClasses}${isCollapsed ? ' compare-favorites-drawer__panel--collapsed' : ''}`}
          style={panelDragStyle}
        >
          <div
            className="compare-favorites-drawer__drag-zone"
            onPointerDown={onDragZonePointerDown}
            onPointerMove={onDragZonePointerMove}
            onPointerUp={onDragZonePointerUp}
            onPointerCancel={onDragZonePointerCancel}
          >
            <div className="compare-favorites-drawer__handle" aria-hidden="true">
              <span className="compare-favorites-drawer__handle-pill" />
            </div>
          </div>

          <button
            type="button"
            className="compare-favorites-drawer__close"
            onClick={() => requestClose()}
            aria-label={t('compareFavoritesDrawer_closeAria')}
          >
            <FiX size={20} />
          </button>

          <div className="compare-favorites-drawer__body">
            <CompareFavoritesIllustration className="compare-favorites-drawer__illustration" />

            <div className="compare-favorites-drawer__badge" aria-hidden="true">
              <FiColumns size={14} />
            </div>

            <h2 id="compare-favorites-drawer-title" className="compare-favorites-drawer__title">
              {t('compareFavoritesDrawer_title')}
            </h2>
            <p className="compare-favorites-drawer__lead">{t('compareFavoritesDrawer_lead')}</p>
            <p className="compare-favorites-drawer__hint">{t('compareFavoritesDrawer_hint')}</p>

            <button
              type="button"
              className="compare-favorites-drawer__cta"
              onClick={handleCompare}
            >
              <span>{t('compareFavoritesDrawer_cta')}</span>
              <FiArrowRight size={20} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
