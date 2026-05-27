import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import DepositSuccessIllustration from './DepositSuccessIllustration'
import './DepositSuccessDrawer.css'

export default function DepositSuccessDrawer({
  isOpen,
  onClose,
  balanceFormatted,
  onContinue,
}) {
  const { t } = useTranslation()
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanel = isClosing
    ? ' drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing'
    : ''

  const handleContinue = () => {
    requestClose(() => onContinue?.())
  }

  return createPortal(
    <>
      <div
        role="presentation"
        className={`deposit-success-drawer__backdrop${closingBackdrop}`}
        onClick={() => requestClose()}
      />
      <div
        className={`deposit-success-drawer${closingPanel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-success-drawer-title"
      >
        <div className="deposit-success-drawer__panel">
          <button
            type="button"
            className="deposit-success-drawer__close"
            onClick={() => requestClose()}
            aria-label={t('depositSuccessDrawer_closeAria')}
          >
            <FiX size={20} />
          </button>

          <div className="deposit-success-drawer__handle" aria-hidden="true">
            <span className="deposit-success-drawer__handle-pill" />
          </div>

          <DepositSuccessIllustration className="deposit-success-drawer__illustration" />

          <h2 id="deposit-success-drawer-title" className="deposit-success-drawer__title">
            {t('depositSuccessDrawer_title')}
          </h2>
          <p className="deposit-success-drawer__lead">{t('depositSuccessDrawer_lead')}</p>
          <p className="deposit-success-drawer__balance">
            {t('depositSuccessDrawer_balance', { amount: balanceFormatted })}
          </p>

          <button
            type="button"
            className="deposit-success-drawer__cta"
            onClick={handleContinue}
          >
            <span>{t('depositSuccessDrawer_cta')}</span>
            <FiArrowRight size={20} aria-hidden />
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
