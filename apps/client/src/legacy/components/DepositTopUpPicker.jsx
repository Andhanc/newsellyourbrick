import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Coins,
  CreditCard,
  LoaderCircle,
  WalletCards,
} from 'lucide-react'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import './DepositTopUpPicker.css'

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
  shortenAddress,
}) => {
  const { t } = useTranslation()
  const [view, setView] = useState('choice')
  const [selectedMethod, setSelectedMethod] = useState('card')

  const handleClose = () => {
    setView('choice')
    setSelectedMethod('card')
    onClose?.()
  }

  const handleCardPayment = () => {
    onSelectStripe?.()
    handleClose()
  }

  const cryptoTitle = t('depositPicker_cryptoWalletTitle')

  const handleContinue = () => {
    if (selectedMethod === 'crypto') {
      setView('crypto')
      return
    }
    handleCardPayment()
  }

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={handleClose}
      tone="choice"
      titleId="deposit-picker-title"
      describedBy="deposit-picker-description"
      closeLabel={t('depositPicker_closeAria')}
      className="deposit-picker"
    >
      {view === 'choice' ? (
        <div className="deposit-picker__choice">
          <h2 id="deposit-picker-title" className="deposit-picker__title">
            {t('depositPicker_title')}
          </h2>
          <p id="deposit-picker-description" className="deposit-picker__subtitle">
            {t('depositPicker_subtitle')}
          </p>

          <div className="deposit-picker__methods" role="list" aria-label={t('depositPicker_methodsAriaLabel')}>
            <button
              type="button"
              role="listitem"
              className={`deposit-picker__method deposit-picker__method--recommended${selectedMethod === 'card' ? ' is-selected' : ''}`}
              disabled={stripeCheckoutLoading}
              aria-busy={stripeCheckoutLoading || undefined}
              aria-pressed={selectedMethod === 'card'}
              onClick={() => setSelectedMethod('card')}
            >
              <span className="deposit-picker__method-icon" aria-hidden>
                {stripeCheckoutLoading ? (
                  <LoaderCircle className="deposit-picker__spinner" size={22} />
                ) : (
                  <CreditCard size={22} strokeWidth={2} />
                )}
              </span>
              <span className="deposit-picker__method-copy">
                <span className="deposit-picker__method-title-row">
                  <strong>{t('depositPicker_cardLabel')}</strong>
                  <span className="deposit-picker__method-badge">
                    {t('depositPicker_recommended')}
                  </span>
                </span>
                <small>
                  {t('depositPicker_cardDesc')}
                </small>
              </span>
              <span className="deposit-picker__method-chevron" aria-hidden>
                {selectedMethod === 'card' ? <Check size={18} strokeWidth={2.5} /> : <ChevronRight size={18} strokeWidth={2.2} />}
              </span>
            </button>

            <button
              type="button"
              role="listitem"
              className={`deposit-picker__method${selectedMethod === 'crypto' ? ' is-selected' : ''}`}
              aria-pressed={selectedMethod === 'crypto'}
              onClick={() => setSelectedMethod('crypto')}
            >
              <span className="deposit-picker__method-icon deposit-picker__method-icon--crypto" aria-hidden>
                <Coins size={22} strokeWidth={2} />
              </span>
              <span className="deposit-picker__method-copy">
                <span className="deposit-picker__method-title-row">
                  <strong>{cryptoTitle}</strong>
                </span>
                <small>
                  {t('depositPicker_cryptoDesc')}
                </small>
              </span>
              <span className="deposit-picker__method-chevron" aria-hidden>
                {selectedMethod === 'crypto' ? <Check size={18} strokeWidth={2.5} /> : <ChevronRight size={18} strokeWidth={2.2} />}
              </span>
            </button>
          </div>

          <button
            type="button"
            className="deposit-picker__continue"
            onClick={handleContinue}
            disabled={stripeCheckoutLoading}
          >
            {stripeCheckoutLoading ? <LoaderCircle className="deposit-picker__spinner" size={18} aria-hidden /> : null}
            <span>
              {stripeCheckoutLoading
                ? t('depositPicker_openingCheckout')
                : t('depositPicker_continue')}
            </span>
          </button>
        </div>
      ) : (
        <div className="deposit-picker__crypto">
          <button type="button" className="deposit-picker__back" onClick={() => setView('choice')}>
            <ArrowLeft size={18} strokeWidth={2.2} aria-hidden />
            {t('depositPicker_back')}
          </button>

          <span className="deposit-picker__eyebrow">
            <WalletCards size={15} strokeWidth={2.2} aria-hidden />
            TON Connect
          </span>
          <h2 id="deposit-picker-title" className="deposit-picker__title">
            {cryptoTitle}
          </h2>
          <p id="deposit-picker-description" className="deposit-picker__subtitle">
            {t('depositPicker_cryptoFlowSubtitle')}
          </p>

          <div className="deposit-picker__crypto-card">
            {tonWallet && tonAddress ? (
              <>
                <div className="deposit-picker__wallet-row">
                  <span className="deposit-picker__wallet-avatar" aria-hidden>
                    {tonWallet.icon ? <img src={tonWallet.icon} alt="" /> : <WalletCards size={22} />}
                  </span>
                  <span className="deposit-picker__wallet-copy">
                    <strong>
                      {tonWallet.name ||
                        t('depositPicker_tonWalletDefaultName', { defaultValue: 'TON Wallet' })}
                    </strong>
                    <small title={tonAddress}>
                      {shortenAddress
                        ? shortenAddress(tonAddress)
                        : `${tonAddress.slice(0, 6)}…${tonAddress.slice(-4)}`}
                    </small>
                  </span>
                  <span className="deposit-picker__connected">
                    <Check size={14} strokeWidth={2.4} aria-hidden /> {t('depositPicker_connected')}
                  </span>
                </div>

                {tonPaymentSuccess ? (
                  <div className="deposit-picker__success" role="status">
                    <span className="deposit-picker__success-icon" aria-hidden>
                      <Check size={20} strokeWidth={2.4} />
                    </span>
                    {t('depositPicker_paymentSuccess')}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="deposit-picker__pay"
                    onClick={onPayUsdt}
                    disabled={tonPaymentLoading}
                    aria-busy={tonPaymentLoading || undefined}
                  >
                    {tonPaymentLoading ? (
                      <LoaderCircle className="deposit-picker__spinner" size={18} aria-hidden />
                    ) : null}
                    {tonPaymentLoading
                      ? t('depositPicker_payWaiting')
                      : t('depositPicker_payButton')}
                  </button>
                )}

                <p className="deposit-picker__crypto-note">
                  {tonPaymentLoading
                    ? t('depositPicker_payPhoneHint')
                    : t('depositPicker_payCrossDevice')}
                </p>

                <div className="deposit-picker__wallet-actions">
                  <button type="button" onClick={() => tonConnectUI?.openModal?.()}>
                    {t('depositPicker_changeWallet')}
                  </button>
                  <button type="button" onClick={() => tonConnectUI?.disconnect?.()}>
                    {t('depositPicker_disconnectWallet')}
                  </button>
                </div>
              </>
            ) : (
              <div className="deposit-picker__disconnected">
                <span className="deposit-picker__crypto-mark" aria-hidden>
                  <Coins size={28} strokeWidth={2} />
                </span>
                <h3>{t('depositPicker_connectTonTitle')}</h3>
                <p>
                  {t('depositPicker_connectHint')}
                </p>
                <button
                  type="button"
                  className="deposit-picker__pay"
                  onClick={() => tonConnectUI?.openModal?.()}
                >
                  {t('depositPicker_connectWallet')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </BuyerSheetShell>
  )
}

export default DepositTopUpPicker
