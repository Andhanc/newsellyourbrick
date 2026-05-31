import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiX } from 'react-icons/fi'
import { Calendar } from 'lucide-react'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import { useBottomSheetDrag } from '../hooks/useBottomSheetDrag'
import TestDrivePromoIllustration from './TestDrivePromoIllustration'
import './TestDrivePromoDrawer.css'

export default function TestDrivePromoDrawer({ isOpen, onClose, onGoToSection }) {
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
    panelClosingClass: 'test-drive-promo-drawer__panel--closing',
  })

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanelClasses = isClosing
    ? `${closingPanel} drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing`
    : closingPanel

  const handleGoToSection = () => {
    requestClose(() => onGoToSection?.())
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className={`test-drive-promo-drawer__backdrop${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <div
        className={`test-drive-promo-drawer${isDragging ? ' test-drive-promo-drawer--dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-drive-promo-drawer-title"
      >
        <div
          ref={panelRef}
          className={`test-drive-promo-drawer__panel${closingPanelClasses}${isEntering ? ' test-drive-promo-drawer__panel--entering' : ''}${isCollapsed ? ' test-drive-promo-drawer__panel--collapsed' : ''}`}
          style={panelDragStyle}
        >
          <div
            className="test-drive-promo-drawer__drag-zone"
            onPointerDown={onDragZonePointerDown}
            onPointerMove={onDragZonePointerMove}
            onPointerUp={onDragZonePointerUp}
            onPointerCancel={onDragZonePointerCancel}
          >
            <div className="test-drive-promo-drawer__handle" aria-hidden="true">
              <span className="test-drive-promo-drawer__handle-pill" />
            </div>
          </div>

          <button
            type="button"
            className="test-drive-promo-drawer__close"
            onClick={() => requestClose()}
            aria-label={t('closeAria')}
          >
            <FiX size={20} />
          </button>

          <div className="test-drive-promo-drawer__body">
            <TestDrivePromoIllustration className="test-drive-promo-drawer__illustration" />

            <div className="test-drive-promo-drawer__badge" aria-hidden="true">
              <Calendar size={14} strokeWidth={2.25} />
            </div>

            <h2 id="test-drive-promo-drawer-title" className="test-drive-promo-drawer__title">
              {t('testDrivePromoDrawerTitle')}
            </h2>
            <p className="test-drive-promo-drawer__lead">{t('testDrivePromoDrawerLead')}</p>

            <button
              type="button"
              className="test-drive-promo-drawer__cta"
              onClick={handleGoToSection}
            >
              <span>{t('testDrivePromoDrawerCta')}</span>
              <FiArrowRight size={20} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
