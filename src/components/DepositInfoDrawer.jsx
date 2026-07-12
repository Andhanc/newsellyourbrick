import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiCheckCircle, FiRefreshCw, FiShield, FiX } from 'react-icons/fi'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'
import '../styles/drawerDismiss.css'
import './DepositInfoDrawer.css'

export default function DepositInfoDrawer({ isOpen, onClose }) {
  const { t } = useTranslation()
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, requestClose])

  if (!visible || typeof document === 'undefined') return null

  return createPortal(
    <>
      <button
        type="button"
        className={`deposit-info-drawer__backdrop${isClosing ? ' drawer-dismiss-backdrop--closing' : ''}`}
        onClick={() => requestClose()}
        aria-label={t('depositModal_closeAria')}
      />
      <section
        className={`deposit-info-drawer${isClosing ? ' drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-info-drawer-title"
      >
        <div className="deposit-info-drawer__handle" aria-hidden><span /></div>
        <button
          type="button"
          className="deposit-info-drawer__close"
          onClick={() => requestClose()}
          aria-label={t('depositModal_closeAria')}
        >
          <FiX aria-hidden />
        </button>

        <div className="deposit-info-drawer__visual">
          <img src="/images/property-detail/deposit-wallet-3d.png" alt="" aria-hidden />
        </div>

        <span className="deposit-info-drawer__eyebrow">SellYourBrick Deposit</span>
        <h2 id="deposit-info-drawer-title">{t('walletPage_whatIsDepositTitle')}</h2>
        <p className="deposit-info-drawer__lead">
          {t('walletPage_whatIsDepositText', { amount: 3000 })}
        </p>

        <div className="deposit-info-drawer__benefits">
          <div><FiShield aria-hidden /><span>{t('depositModal_infoParagraph1', { amount: '3000 €' })}</span></div>
          <div><FiRefreshCw aria-hidden /><span>{t('depositModal_infoParagraph2')}</span></div>
          <div><FiCheckCircle aria-hidden /><span>{t('depositModal_infoParagraph3')}</span></div>
        </div>

        <button type="button" className="deposit-info-drawer__cta" onClick={() => requestClose()}>
          {t('walletPage_understand', { defaultValue: 'Понятно' })}
        </button>
      </section>
    </>,
    document.body,
  )
}
