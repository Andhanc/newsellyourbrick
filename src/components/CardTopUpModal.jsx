import { useState, useEffect } from 'react'
import { validateLuhn, detectCardType } from '../utils/cardValidation'
import { showNotification } from '../utils/toastHelper'
import './CardTopUpModal.css'

const CardTopUpModal = ({ isOpen, onClose, userId, apiBaseUrl, onSuccess }) => {
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardType, setCardType] = useState(null)
  const [cardError, setCardError] = useState('')
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCardNumber('')
      setCardExpiry('')
      setCardCvv('')
      setCardType(null)
      setCardError('')
      setIsCardFlipped(false)
      setIsSubmitting(false)
    }
  }, [isOpen])

  useEffect(() => {
    const cleaned = cardNumber.replace(/\D/g, '')
    const hasNumber = cleaned.length >= 13
    const hasExpiry = cardExpiry.length === 5
    if (hasNumber && hasExpiry && !isCardFlipped) {
      const t = setTimeout(() => setIsCardFlipped(true), 300)
      return () => clearTimeout(t)
    }
  }, [cardNumber, cardExpiry, isCardFlipped])

  const canSubmit = () => {
    const cleaned = cardNumber.replace(/\D/g, '')
    return (
      cleaned.length >= 13 &&
      cleaned.length <= 19 &&
      validateLuhn(cleaned) &&
      cardExpiry.length === 5 &&
      /^\d{2}\/\d{2}$/.test(cardExpiry) &&
      cardCvv.length >= 3 &&
      cardCvv.length <= 4
    )
  }

  const getCardColor = () => {
    if (cardType === 'VISA') {
      return 'linear-gradient(135deg, #0ABAB5 0%, #089a95 50%, #0ABAB5 100%)'
    }
    if (cardType === 'MASTERCARD') {
      return 'linear-gradient(135deg, #EB001B 0%, #F79E1B 50%, #EB001B 100%)'
    }
    return 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)'
  }

  const handleNumberChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 19)
    setCardNumber(cleaned)
    setCardError('')
    if (cleaned.length >= 4) {
      const type = detectCardType(cleaned)
      if (type !== 'UNKNOWN') setCardType(type)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit() || isSubmitting || !userId || !apiBaseUrl) return

    const cleaned = cardNumber.replace(/\D/g, '')
    const [month, year] = cardExpiry.split('/')
    const expiryMonth = parseInt(month, 10)
    const expiryYear = parseInt(year, 10)
    const now = new Date()
    const currentYear = now.getFullYear() % 100
    const currentMonth = now.getMonth() + 1
    if (expiryMonth < 1 || expiryMonth > 12) {
      setCardError('Месяц должен быть от 01 до 12')
      return
    }
    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      setCardError('Срок действия карты истек')
      return
    }
    if (detectCardType(cleaned) === 'UNKNOWN') {
      setCardError('Используйте Visa или Mastercard')
      return
    }

    setCardError('')
    setIsSubmitting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/users/${userId}/deposit/top-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        const newDeposit = data.data?.depositAmount ?? 0
        showNotification(`Депозит пополнен на 3000 €. Баланс: €${Number(newDeposit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
        onSuccess?.(newDeposit)
        onClose()
      } else {
        setCardError(data.error || 'Ошибка пополнения')
      }
    } catch (err) {
      setCardError(err.message || 'Ошибка сети')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="card-topup-overlay" onClick={onClose}>
      <div className="card-topup-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="card-topup-modal__close" onClick={onClose} aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <h2 className="card-topup-modal__title">Пополнение картой</h2>
        <p className="card-topup-modal__subtitle">Введите данные карты.</p>

        <div className="card-topup-modal__card-wrap">
          <div
            className={`card-topup-card ${isCardFlipped ? 'flipped' : ''}`}
            style={{ '--card-color': getCardColor() }}
          >
            <div className="card-topup-card__front">
              <div className="card-topup-card__bg" style={{ background: getCardColor() }} />
              <div className="card-topup-card__content">
                <div className="card-topup-card__top">
                  {cardType === 'MASTERCARD' ? (
                    <div className="card-topup-card__logo-master">
                      <span className="circle circle--red" />
                      <span className="circle circle--yellow" />
                    </div>
                  ) : cardType ? (
                    <span className="card-topup-card__logo-text">VISA</span>
                  ) : null}
                </div>
                <div className="card-topup-card__number">
                  <input
                    type="text"
                    className="card-topup-card__input"
                    value={(cardNumber.match(/.{1,4}/g) || []).join(' ')}
                    onChange={e => handleNumberChange(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                  />
                </div>
                <div className="card-topup-card__bottom">
                  <div className="card-topup-card__expiry">
                    <input
                      type="text"
                      className="card-topup-card__input card-topup-card__input--expiry"
                      value={cardExpiry}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '').slice(0, 4)
                        if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2)
                        setCardExpiry(v)
                        setCardError('')
                      }}
                      placeholder="MM/YY"
                      maxLength="5"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="card-topup-card__back">
              <div className="card-topup-card__stripe" />
              <div className="card-topup-card__cvv">
                <span className="card-topup-card__cvv-label">CVV</span>
                <input
                  type="text"
                  className="card-topup-card__input card-topup-card__input--cvv"
                  value={cardCvv}
                  onChange={e => {
                    setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
                    setCardError('')
                  }}
                  placeholder="***"
                  maxLength="4"
                />
              </div>
            </div>
          </div>
        </div>

        {cardError && <div className="card-topup-modal__error">{cardError}</div>}

        <button
          type="button"
          className="card-topup-modal__submit"
          disabled={!canSubmit() || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Пополняем…' : 'Пополнить 3000 €'}
        </button>
      </div>
    </div>
  )
}

export default CardTopUpModal
