import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiX } from 'react-icons/fi'
import { Car } from 'lucide-react'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'
import './TestDrivePromoDrawer.css'

export default function TestDrivePromoDrawer({ isOpen, onClose, onGoToSection }) {
  const { t } = useTranslation()
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose)

  if (!visible || typeof document === 'undefined') return null

  const closingTop = isClosing ? ' drawer-dismiss-from-top--closing' : ''
  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''

  return createPortal(
    <>
      <div
        role="presentation"
        className={`test-drive-promo-drawer__backdrop${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <div
        className={`test-drive-promo-drawer${closingTop}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-drive-promo-drawer-title"
      >
        <div className="test-drive-promo-drawer__content">
          <button
            type="button"
            className="test-drive-promo-drawer__close"
            onClick={() => requestClose()}
            aria-label={t('closeAria')}
          >
            <FiX size={20} />
          </button>

          <div className="test-drive-promo-drawer__body">
            <div className="test-drive-promo-drawer__icon-wrap" aria-hidden="true">
              <Car className="test-drive-promo-drawer__icon" size={28} strokeWidth={1.75} />
            </div>

            <h2 id="test-drive-promo-drawer-title" className="test-drive-promo-drawer__title">
              {t('testDrivePromoDrawerTitle')}
            </h2>
            <p className="test-drive-promo-drawer__text">{t('testDrivePromoDrawerLead')}</p>

            <button
              type="button"
              className="test-drive-promo-drawer__cta"
              onClick={() => requestClose(() => onGoToSection?.())}
            >
              <span>{t('testDrivePromoDrawerCta')}</span>
              <FiArrowRight size={20} aria-hidden />
            </button>
          </div>

          <div className="test-drive-promo-drawer__sheet-handle" aria-hidden="true">
            <span className="test-drive-promo-drawer__sheet-pill" />
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
