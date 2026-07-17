import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Coins,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
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

  const handleClose = () => {
    setView('choice')
    onClose?.()
  }

  const handleCardPayment = () => {
    onSelectStripe?.()
    handleClose()
  }

  const cryptoTitle = t('depositPicker_cryptoWalletTitle', { defaultValue: 'Криптокошелёк' })

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={handleClose}
      tone="choice"
      titleId="deposit-picker-title"
      describedBy="deposit-picker-description"
      closeLabel={t('depositPicker_closeAria', { defaultValue: 'Закрыть выбор способа пополнения' })}
      className="deposit-picker"
    >
      {view === 'choice' ? (
        <div className="deposit-picker__choice">
          <span className="deposit-picker__eyebrow">
            <ShieldCheck size={15} aria-hidden /> Защищённое пополнение
          </span>
          <h2 id="deposit-picker-title" className="deposit-picker__title">
            {t('depositPicker_title', { defaultValue: 'Как пополнить депозит?' })}
          </h2>
          <p id="deposit-picker-description" className="deposit-picker__subtitle">
            Выберите удобный способ. Перед оплатой вы увидите сумму и итоговые условия.
          </p>

          <div className="deposit-picker__methods" role="list" aria-label="Способы пополнения">
            <button
              type="button"
              role="listitem"
              className="deposit-picker__method deposit-picker__method--recommended"
              disabled={stripeCheckoutLoading}
              aria-busy={stripeCheckoutLoading || undefined}
              onClick={handleCardPayment}
            >
              <span className="deposit-picker__method-icon" aria-hidden>
                {stripeCheckoutLoading ? <LoaderCircle className="deposit-picker__spinner" size={25} /> : <CreditCard size={25} />}
              </span>
              <span className="deposit-picker__method-copy">
                <span className="deposit-picker__method-badge">Рекомендуем</span>
                <strong>{t('depositPicker_cardLabel', { defaultValue: 'Банковская карта' })}</strong>
                <small>{t('depositPicker_cardDesc', { defaultValue: 'Быстрый переход к защищённой оплате' })}</small>
              </span>
              <ChevronRight size={21} aria-hidden />
            </button>

            <button
              type="button"
              role="listitem"
              className="deposit-picker__method"
              onClick={() => setView('crypto')}
            >
              <span className="deposit-picker__method-icon deposit-picker__method-icon--crypto" aria-hidden>
                <Coins size={25} />
              </span>
              <span className="deposit-picker__method-copy">
                <strong>{cryptoTitle}</strong>
                <small>{t('depositPicker_cryptoDesc', { defaultValue: 'Оплата через подключённый TON-кошелёк' })}</small>
              </span>
              <ChevronRight size={21} aria-hidden />
            </button>
          </div>

          <div className="deposit-picker__trust">
            <LockKeyhole size={18} aria-hidden />
            <p><strong>Сначала подтверждение.</strong> Мы не списываем средства без вашего финального действия на платёжном экране.</p>
          </div>
        </div>
      ) : (
        <div className="deposit-picker__crypto">
          <button type="button" className="deposit-picker__back" onClick={() => setView('choice')}>
            <ArrowLeft size={19} aria-hidden />
            {t('depositPicker_back', { defaultValue: 'Другой способ' })}
          </button>

          <span className="deposit-picker__eyebrow"><WalletCards size={15} aria-hidden /> TON Connect</span>
          <h2 id="deposit-picker-title" className="deposit-picker__title">{cryptoTitle}</h2>
          <p id="deposit-picker-description" className="deposit-picker__subtitle">
            Подключите кошелёк, проверьте адрес и подтвердите перевод в приложении.
          </p>

          <div className="deposit-picker__crypto-card">
            {tonWallet && tonAddress ? (
              <>
                <div className="deposit-picker__wallet-row">
                  <span className="deposit-picker__wallet-avatar" aria-hidden>
                    {tonWallet.icon ? <img src={tonWallet.icon} alt="" /> : <WalletCards size={24} />}
                  </span>
                  <span className="deposit-picker__wallet-copy">
                    <strong>{tonWallet.name || t('depositPicker_tonWalletDefaultName', { defaultValue: 'TON Wallet' })}</strong>
                    <small title={tonAddress}>{shortenAddress ? shortenAddress(tonAddress) : `${tonAddress.slice(0, 6)}…${tonAddress.slice(-4)}`}</small>
                  </span>
                  <span className="deposit-picker__connected"><Check size={14} aria-hidden /> Подключён</span>
                </div>

                {tonPaymentSuccess ? (
                  <div className="deposit-picker__success" role="status">
                    <Check size={19} aria-hidden />
                    {t('depositPicker_paymentSuccess', { defaultValue: 'Перевод подтверждён' })}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="deposit-picker__pay"
                    onClick={onPayUsdt}
                    disabled={tonPaymentLoading}
                    aria-busy={tonPaymentLoading || undefined}
                  >
                    {tonPaymentLoading ? <LoaderCircle className="deposit-picker__spinner" size={20} aria-hidden /> : null}
                    {tonPaymentLoading
                      ? t('depositPicker_payWaiting', { defaultValue: 'Ожидаем подтверждение…' })
                      : t('depositPicker_payButton', { defaultValue: 'Перейти к подтверждению' })}
                  </button>
                )}

                <p className="deposit-picker__crypto-note">
                  {tonPaymentLoading
                    ? t('depositPicker_payPhoneHint', { defaultValue: 'Подтвердите запрос в приложении кошелька на телефоне.' })
                    : t('depositPicker_payCrossDevice', { defaultValue: 'Окно кошелька откроется на этом устройстве.' })}
                </p>

                <div className="deposit-picker__wallet-actions">
                  <button type="button" onClick={() => tonConnectUI?.openModal?.()}>
                    {t('depositPicker_changeWallet', { defaultValue: 'Сменить кошелёк' })}
                  </button>
                  <button type="button" onClick={() => tonConnectUI?.disconnect?.()}>
                    {t('depositPicker_disconnectWallet', { defaultValue: 'Отключить' })}
                  </button>
                </div>
              </>
            ) : (
              <div className="deposit-picker__disconnected">
                <span className="deposit-picker__crypto-mark" aria-hidden><Coins size={29} /></span>
                <h3>Подключите TON-кошелёк</h3>
                <p>{t('depositPicker_connectHint', { defaultValue: 'Сайт покажет адрес и сумму до того, как вы подтвердите перевод.' })}</p>
                <button type="button" className="deposit-picker__pay" onClick={() => tonConnectUI?.openModal?.()}>
                  {t('depositPicker_connectWallet', { defaultValue: 'Подключить кошелёк' })}
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
