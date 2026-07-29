import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiTrendingUp, FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import CompareInvestorProIllustration from './CompareInvestorProIllustration'
import './CompareInvestorProDrawer.css'

export default function CompareInvestorProDrawer({ isOpen, onClose, onOpenInvestorPanel }) {
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
    panelClosingClass: 'compare-investor-pro-drawer__panel--closing',
    maxViewportHeightRatio: 0.5,
  })

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanelClasses = isClosing
    ? `${closingPanel} drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing`
    : closingPanel

  const handleOpenPanel = () => {
    requestClose(() => onOpenInvestorPanel?.())
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className={`compare-investor-pro-drawer__backdrop${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <div
        className={`compare-investor-pro-drawer${isDragging ? ' compare-investor-pro-drawer--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-investor-pro-drawer-title"
      >
        <div
          ref={panelRef}
          className={`compare-investor-pro-drawer__panel${closingPanelClasses}${isCollapsed ? ' compare-investor-pro-drawer__panel--collapsed' : ''}`}
          style={panelDragStyle}
        >
          <div
            className="compare-investor-pro-drawer__drag-zone"
            onPointerDown={onDragZonePointerDown}
            onPointerMove={onDragZonePointerMove}
            onPointerUp={onDragZonePointerUp}
            onPointerCancel={onDragZonePointerCancel}
          >
            <div className="compare-investor-pro-drawer__handle" aria-hidden="true">
              <span className="compare-investor-pro-drawer__handle-pill" />
            </div>
          </div>

          <button
            type="button"
            className="compare-investor-pro-drawer__close"
            onClick={() => requestClose()}
            aria-label={t('compareInvestorProDrawer_closeAria')}
          >
            <FiX size={20} />
          </button>

          <div className="compare-investor-pro-drawer__body">
            <CompareInvestorProIllustration className="compare-investor-pro-drawer__illustration" />

            <div className="compare-investor-pro-drawer__badge" aria-hidden="true">
              <FiTrendingUp size={14} />
            </div>

            <h2 id="compare-investor-pro-drawer-title" className="compare-investor-pro-drawer__title">
              {t('compareInvestorProDrawer_title')}
            </h2>
            <p className="compare-investor-pro-drawer__lead">{t('compareInvestorProDrawer_lead')}</p>
            <p className="compare-investor-pro-drawer__hint">{t('compareInvestorProDrawer_hint')}</p>

            <button
              type="button"
              className="compare-investor-pro-drawer__cta"
              onClick={handleOpenPanel}
            >
              <span>{t('compareInvestorProDrawer_cta')}</span>
              <FiArrowRight size={20} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
