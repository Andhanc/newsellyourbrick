import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Clock3, CreditCard, Pencil } from 'lucide-react'
import { formatWalletAmount } from '../utils/ownerWalletDemo'
import './OwnerWalletWithdrawModal.css'

export default function OwnerWalletWithdrawModal({
  open,
  onClose,
  available,
  stripePayout,
  onSubmit,
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setAmount(String(available || ''))
    }
  }, [open, available])

  if (!open) return null

  const parsed = Number(String(amount).replace(/\s/g, '').replace(',', '.'))
  const isValid = Number.isFinite(parsed) && parsed > 0 && parsed <= available

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid || submitting) return
    setSubmitting(true)
    try {
      await onSubmit?.(parsed)
      onClose?.()
    } finally {
      setSubmitting(false)
    }
  }

  const cardLabel = stripePayout?.brand || 'Visa'
  const cardLast4 = stripePayout?.last4 || '4242'
  const cardExp = `${stripePayout?.expMonth || '12'}/${String(stripePayout?.expYear || '26').slice(-2)}`

  return (
    <div className="oww-modal" role="presentation" onClick={onClose}>
      <div
        className="oww-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="oww-modal__head">
          <h2 id={titleId} className="oww-modal__title">
            {t('ownerTest_walletWithdrawTitle')}
          </h2>
          <button type="button" className="oww-modal__close" aria-label={t('ownerTest_walletWithdrawClose')} onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <form className="oww-modal__body" onSubmit={handleSubmit}>
          <div className="oww-modal__field">
            <label className="oww-modal__label" htmlFor="oww-amount">
              {t('ownerTest_walletWithdrawAmountLabel')}
            </label>
            <div className="oww-modal__amount-row">
              <input
                id="oww-amount"
                className="oww-modal__input"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoComplete="off"
              />
              <span className="oww-modal__currency">₽</span>
            </div>
            <p className="oww-modal__hint">
              {t('ownerTest_walletWithdrawAvailable')}{' '}
              <strong>{formatWalletAmount(available)}</strong>
            </p>
          </div>

          <div className="oww-modal__stripe">
            <div className="oww-modal__stripe-head">
              <span>{t('ownerTest_walletWithdrawStripeDetails')}</span>
            </div>
            <div className="oww-modal__card">
              <span className="oww-modal__card-icon" aria-hidden>
                <CreditCard size={20} strokeWidth={2} />
              </span>
              <div className="oww-modal__card-info">
                <strong>
                  {cardLabel} •••• {cardLast4}
                </strong>
                <span>{t('ownerTest_walletWithdrawExpiry', { date: cardExp })}</span>
              </div>
              <button type="button" className="oww-modal__card-edit" aria-label={t('ownerTest_walletWithdrawChangeCard')}>
                <Pencil size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="oww-modal__info">
            <Clock3 size={18} strokeWidth={2} aria-hidden />
            <p>{t('ownerTest_walletWithdrawInfo')}</p>
          </div>

          <button
            type="submit"
            className="oww-modal__submit"
            disabled={!isValid || submitting}
          >
            {submitting ? t('ownerTest_walletWithdrawSubmitting') : t('ownerTest_walletWithdrawSubmit')}
          </button>
        </form>
      </div>
    </div>
  )
}
