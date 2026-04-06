import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { showNotification } from '../utils/toastHelper'
import { ensureCanOpenProperty } from '../utils/propertyAccessGuard'
import './WonPropertyCard.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const WonPropertyCard = ({ purchase, formatPrice, formatDate }) => {
  const { t, i18n } = useTranslation()
  const billingLocale = (() => {
    const code = (i18n.language || 'ru').split('-')[0]
    const map = { ru: 'ru-RU', en: 'en-US', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', sv: 'sv-SE' }
    return map[code] || 'en-US'
  })()
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [depositExpired, setDepositExpired] = useState(false)
  const [isPayingDeposit, setIsPayingDeposit] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false)

  // Вычисляем оставшееся время до истечения срока оплаты депозита
  useEffect(() => {
    if (!purchase.depositDueDate || purchase.depositPaid) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const dueDate = new Date(purchase.depositDueDate).getTime()
      const remaining = dueDate - now

      if (remaining <= 0) {
        setDepositExpired(true)
        setTimeRemaining(null)
      } else {
        setDepositExpired(false)
        setTimeRemaining(remaining)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [purchase.depositDueDate, purchase.depositPaid])

  const handlePayDeposit = async () => {
    if (isPayingDeposit) return

    setIsPayingDeposit(true)
    try {
      const response = await fetch(`${API_BASE_URL}/auction-winners/${purchase.id}/pay-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Обновляем статус покупки
          purchase.depositPaid = true
          purchase.status = 'deposit_paid'
          // Перезагружаем страницу для обновления данных
          window.location.reload()
        } else {
          showNotification(result.error || t('buyerWon_payError'))
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        showNotification(errorData.error || t('buyerWon_payError'))
      }
    } catch (error) {
      console.error('Ошибка при оплате депозита:', error)
      showNotification(t('buyerWon_networkError'))
    } finally {
      setIsPayingDeposit(false)
    }
  }

  const formatTimeRemaining = (ms) => {
    if (!ms || ms <= 0) return '00:00:00'
    
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)

    if (days > 0) {
      return t('buyerWon_timeRemainVerbose', { days, hours, minutes, seconds })
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="won-property-card">
      <div className="won-property-card__main">
        <div className="won-property-card__image-wrapper">
          <div className="won-property-card__image">
            <img
              src={purchase.image}
              alt={purchase.propertyTitle || t('buyerHistory_fallbackProperty')}
            />
            {/* Таймер на фото */}
            {!purchase.depositPaid && purchase.depositDueDate && !depositExpired && timeRemaining && (
              <div className="won-property-card__timer-overlay">
                <div className="timer-overlay__time">{formatTimeRemaining(timeRemaining)}</div>
                <div className="timer-overlay__label">{t('buyerWon_timeLeft')}</div>
              </div>
            )}
            {!purchase.depositPaid && depositExpired && (
              <div className="won-property-card__timer-overlay expired">
                <div className="timer-overlay__time">{t('buyerWon_expired')}</div>
              </div>
            )}
            <div className={`won-property-card__badge status-badge ${
              purchase.depositPaid ? 'status-success' : 
              depositExpired ? 'status-failed' : 
              'status-warning'
            }`}>
              {purchase.depositPaid ? t('buyerWon_paid') : 
               depositExpired ? t('buyerWon_expiredShort') : 
               t('buyerWon_pendingPay')}
            </div>
          </div>
        </div>
        
        <div className="won-property-card__info">
          <h3 className="won-property-card__title">
            {purchase.propertyTitle || t('buyerHistory_fallbackProperty')}
          </h3>
          <p className="won-property-card__location">
            {purchase.location || t('buyerHistory_fallbackAddress')}
          </p>
          
          <div className="won-property-card__quick-info">
            <div className="quick-info__item">
              <span className="quick-info__label">{t('buyerWon_winningBid')}</span>
              <span className="quick-info__value price">
                {formatPrice(purchase.purchasePrice, purchase.currency)}
              </span>
            </div>
            <div className="quick-info__item">
              <span className="quick-info__label">{t('buyerWon_deposit')}</span>
              <span className="quick-info__value deposit-amount">
                {formatPrice(purchase.depositAmount, purchase.currency)}
              </span>
            </div>
          </div>

          {/* Кнопка оплаты депозита */}
          {!purchase.depositPaid && !depositExpired && (
            <button
              className="won-property-card__pay-button"
              onClick={handlePayDeposit}
              disabled={isPayingDeposit}
            >
              {isPayingDeposit ? t('buyerWon_processing') : t('buyerWon_payDeposit')}
            </button>
          )}

          {/* Кнопка деталей */}
          <button
            className="won-property-card__toggle-button"
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          >
            <span>{t('buyerWon_details')}</span>
            {isDetailsOpen ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>
      </div>

      {/* Раскрывающийся блок с деталями */}
      {isDetailsOpen && (
        <div className="won-property-card__details-panel">
          <div className="details-panel__section">
            <div className="details-panel__item">
              <span className="details-panel__label">{t('buyerWon_winDate')}</span>
              <span className="details-panel__value">
                {formatDate(purchase.purchaseDate)}
              </span>
            </div>
            <div className="details-panel__item">
              <span className="details-panel__label">{t('buyerWon_winningBid')}</span>
              <span className="details-panel__value price">
                {formatPrice(purchase.purchasePrice, purchase.currency)}
              </span>
            </div>
            <div className="details-panel__item">
              <span className="details-panel__label">{t('buyerWon_depositAmount')}</span>
              <span className="details-panel__value deposit-amount">
                {formatPrice(purchase.depositAmount, purchase.currency)}
              </span>
            </div>
            {!purchase.depositPaid && purchase.depositDueDate && (
              <div className="details-panel__item">
                <span className="details-panel__label">{t('buyerWon_paymentDeadline')}</span>
                <span className="details-panel__value">
                  {new Date(purchase.depositDueDate).toLocaleString(billingLocale, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Инструкция по оплате - раскрывающийся блок */}
          {!purchase.depositPaid && (
            <>
              <button
                className="won-property-card__toggle-button"
                onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
              >
                <span>{t('buyerWon_paymentInstructions')}</span>
                {isInstructionsOpen ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              
              {isInstructionsOpen && (
                <div className="won-property-card__instructions-panel">
                  <ol className="instructions-panel__list">
                    <li>{t('buyerWon_instr1')}</li>
                    <li>
                      {t('buyerWon_instr2', {
                        amount: formatPrice(purchase.depositAmount, purchase.currency),
                      })}
                    </li>
                    <li>{t('buyerWon_instr3')}</li>
                    <li>{t('buyerWon_instr4')}</li>
                  </ol>
                  <div className="instructions-panel__note">
                    <strong>{t('buyerWon_important')}</strong> {t('buyerWon_depositNote')}
                  </div>
                </div>
              )}
            </>
          )}

          <Link
            to={`/property/${purchase.propertyId}`}
            className="won-property-card__link"
            onClick={(e) => {
              if (ensureCanOpenProperty()) return
              e.preventDefault()
            }}
          >
            {t('buyerWon_viewProperty')}
          </Link>
        </div>
      )}
    </div>
  )
}

export default WonPropertyCard

