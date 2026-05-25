import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCreditCard } from 'react-icons/fi'
import './DepositTopUpPicker.css'

const TON_ICON_SVG = (
  <svg width="28" height="28" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 56c15.464 0 28-12.536 28-28S43.464 0 28 0 0 12.536 0 28s12.536 28 28 28z" fill="#0098EA"/>
    <path d="M37.56 15.027H18.44c-.577 0-.866.32-1.01.96L14.028 35.46c-.144.64.072 1.04.577 1.2l5.34 1.44c.577.16.865-.08 1.01-.72l2.017-8.4c.144-.64.721-1.2 1.298-1.2h4.392c5.772 0 9.063-2.88 10.11-8.64l.433-2.4c.144-.72-.217-1.04-.721-1.12l-4.68-.64c-.576-.08-.864-.4-.72-1.04l.288-1.2c.144-.64.576-.96 1.153-.96h2.88c.576 0 .864-.32.72-.96l-.576-2.4c-.145-.64-.433-.96-1.01-.96z" fill="#fff"/>
  </svg>
)

const DepositTopUpPicker = ({
  isOpen,
  onClose,
  onSelectStripe,
  stripeCheckoutLoading,
  tonWallet,
  tonAddress,
  tonConnectUI,
  onPayUsdt,
  tonPaymentLoading,
  tonPaymentSuccess,
  shortenAddress
}) => {
  const { t } = useTranslation()
  const [view, setView] = useState('choice') // 'choice' | 'crypto'

  const handleClose = () => {
    setView('choice')
    onClose()
  }

  const handleBack = () => {
    setView('choice')
  }

  if (!isOpen) return null

  return (
    <div className="deposit-picker-overlay" onClick={handleClose}>
      <div className="deposit-picker" onClick={e => e.stopPropagation()}>
        <button type="button" className="deposit-picker__close" onClick={handleClose} aria-label={t('depositPicker_closeAria')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {view === 'choice' && (
          <>
            <h2 className="deposit-picker__title">{t('depositPicker_title')}</h2>
            <p className="deposit-picker__subtitle">{t('depositPicker_subtitle')}</p>
            <div className="deposit-picker__options">
              <button
                type="button"
                className="deposit-picker__option deposit-picker__option--card"
                disabled={stripeCheckoutLoading}
                onClick={() => {
                  onSelectStripe?.()
                  handleClose()
                }}
              >
                <span className="deposit-picker__option-icon">
                  <FiCreditCard size={32} />
                </span>
                <span className="deposit-picker__option-label">{t('depositPicker_cardLabel')}</span>
                <span className="deposit-picker__option-desc">{t('depositPicker_cardDesc')}</span>
              </button>
              <button
                type="button"
                className="deposit-picker__option deposit-picker__option--crypto"
                onClick={() => setView('crypto')}
              >
                <span className="deposit-picker__option-icon deposit-picker__option-icon--ton">
                  <svg width="32" height="32" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M28 56c15.464 0 28-12.536 28-28S43.464 0 28 0 0 12.536 0 28s12.536 28 28 28z" fill="#0098EA"/>
                    <path d="M37.56 15.027H18.44c-.577 0-.866.32-1.01.96L14.028 35.46c-.144.64.072 1.04.577 1.2l5.34 1.44c.577.16.865-.08 1.01-.72l2.017-8.4c.144-.64.721-1.2 1.298-1.2h4.392c5.772 0 9.063-2.88 10.11-8.64l.433-2.4c.144-.72-.217-1.04-.721-1.12l-4.68-.64c-.576-.08-.864-.4-.72-1.04l.288-1.2c.144-.64.576-.96 1.153-.96h2.88c.576 0 .864-.32.72-.96l-.576-2.4c-.145-.64-.433-.96-1.01-.96z" fill="#fff"/>
                  </svg>
                </span>
                <span className="deposit-picker__option-label">{t('depositPicker_cryptoLabel')}</span>
                <span className="deposit-picker__option-desc">{t('depositPicker_cryptoDesc')}</span>
              </button>
            </div>
          </>
        )}

        {view === 'crypto' && (
          <div className="deposit-picker__crypto">
            <button type="button" className="deposit-picker__back" onClick={handleBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              {t('depositPicker_back')}
            </button>
            <div className="deposit-picker__crypto-block crypto-wallet-block deposit-picker__crypto-block--in-picker">
              <div className="crypto-wallet-block__header">
                <span className="crypto-wallet-block__icon crypto-wallet-block__icon--ton">
                  {TON_ICON_SVG}
                </span>
                <span className="crypto-wallet-block__title">{t('depositPicker_cryptoWalletTitle')}</span>
              </div>
              {tonWallet && tonAddress ? (
                <div className="crypto-wallet-card crypto-wallet-card--connected">
                  <div className="crypto-wallet-card__wallet-info">
                    {tonWallet.icon && (
                      <img src={tonWallet.icon} alt="" className="crypto-wallet-card__wallet-icon" />
                    )}
                    <div className="crypto-wallet-card__wallet-details">
                      <span className="crypto-wallet-card__wallet-name">{tonWallet.name || t('depositPicker_tonWalletDefaultName')}</span>
                      <span className="crypto-wallet-card__address" title={tonAddress}>
                        {shortenAddress ? shortenAddress(tonAddress) : `${tonAddress?.slice(0, 6)}…${tonAddress?.slice(-4)}`}
                      </span>
                    </div>
                  </div>
                  <div className="crypto-wallet-card__pay-section">
                    <p className="crypto-wallet-card__pay-hint">{t('depositPicker_payHint')}</p>
                    {tonPaymentSuccess ? (
                      <div className="crypto-wallet-card__success">
                        <span className="crypto-wallet-card__success-icon">✓</span>
                        <span>{t('depositPicker_paymentSuccess')}</span>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="crypto-wallet-card__pay-btn"
                          onClick={onPayUsdt}
                          disabled={tonPaymentLoading}
                        >
                          {tonPaymentLoading ? (
                            <>
                              <span className="crypto-wallet-card__pay-btn-spinner" />
                              {t('depositPicker_payWaiting')}
                            </>
                          ) : (
                            t('depositPicker_payButton')
                          )}
                        </button>
                        {tonPaymentLoading && (
                          <p className="crypto-wallet-card__pay-phone-hint">
                            {t('depositPicker_payPhoneHint')}
                          </p>
                        )}
                        <p className="crypto-wallet-card__pay-cross-device-note">
                          {t('depositPicker_payCrossDevice')}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="crypto-wallet-card__actions">
                    <button
                      type="button"
                      className="crypto-wallet-card__btn crypto-wallet-card__btn--change"
                      onClick={() => tonConnectUI?.openModal?.()}
                    >
                      {t('depositPicker_changeWallet')}
                    </button>
                    <button
                      type="button"
                      className="crypto-wallet-card__btn crypto-wallet-card__btn--disconnect"
                      onClick={() => tonConnectUI?.disconnect?.()}
                    >
                      {t('depositPicker_disconnectWallet')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="crypto-wallet-card crypto-wallet-card--disconnected">
                  <p className="crypto-wallet-card__hint">{t('depositPicker_connectHint')}</p>
                  <button
                    type="button"
                    className="crypto-wallet-card__connect-btn"
                    onClick={() => tonConnectUI?.openModal?.()}
                  >
                    <span className="crypto-wallet-card__connect-btn-icon">
                      <svg width="24" height="24" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M28 56c15.464 0 28-12.536 28-28S43.464 0 28 0 0 12.536 0 28s12.536 28 28 28z" fill="#0098EA"/>
                        <path d="M37.56 15.027H18.44c-.577 0-.866.32-1.01.96L14.028 35.46c-.144.64.072 1.04.577 1.2l5.34 1.44c.577.16.865-.08 1.01-.72l2.017-8.4c.144-.64.721-1.2 1.298-1.2h4.392c5.772 0 9.063-2.88 10.11-8.64l.433-2.4c.144-.72-.217-1.04-.721-1.12l-4.68-.64c-.576-.08-.864-.4-.72-1.04l.288-1.2c.144-.64.576-.96 1.153-.96h2.88c.576 0 .864-.32.72-.96l-.576-2.4c-.145-.64-.433-.96-1.01-.96z" fill="#fff"/>
                      </svg>
                    </span>
                    {t('depositPicker_connectWallet')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DepositTopUpPicker
