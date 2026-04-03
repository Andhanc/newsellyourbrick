import { useState, useEffect } from 'react'
import { FiX, FiCheckCircle, FiPercent, FiCreditCard, FiPhone } from 'react-icons/fi'
import { useUser } from '@clerk/clerk-react'
import { getUserData, isAuthenticated } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import { showNotification } from '../utils/toastHelper'
import { startPropertyReservationCheckout } from '../utils/subscriptionCheckout'
import './BuyNowModal.css'

const DEPOSIT_FRACTION = 0.1
const WALLET_OFFSET_EUR = 3000

const BuyNowModal = ({ isOpen, onClose, property, stripeReturnPath }) => {
  const { user, isLoaded: userLoaded } = useUser()
  const [dbUserId, setDbUserId] = useState(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [walletBalanceEur, setWalletBalanceEur] = useState(null)
  const [useWalletDeposit, setUseWalletDeposit] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const fetchDbUserId = async () => {
      const saved = localStorage.getItem('userId')
      if (saved && /^\d+$/.test(saved)) {
        setDbUserId(parseInt(saved, 10))
        return
      }

      if (!userLoaded) return

      const isClerkAuth = user && userLoaded
      const isOldAuth = isAuthenticated()

      if (isClerkAuth && user) {
        try {
          const API_BASE_URL = await getApiBaseUrl()
          const userEmail =
            user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress
          if (userEmail) {
            const userResponse = await fetch(
              `${API_BASE_URL}/users/email/${encodeURIComponent(userEmail)}`
            )
            if (userResponse.ok) {
              const json = await userResponse.json()
              if (json.success && json.data?.id) {
                const numericId = json.data.id
                setDbUserId(numericId)
                localStorage.setItem('userId', String(numericId))
              }
            }
          }
        } catch (e) {
          console.warn('BuyNowModal: не удалось получить userId из БД', e)
        }
      } else if (isOldAuth) {
        const ud = getUserData()
        const id = ud?.id
        if (id && /^\d+$/.test(String(id))) {
          setDbUserId(parseInt(String(id), 10))
        }
      }
    }

    fetchDbUserId()
  }, [isOpen, userLoaded, user?.id, user?.primaryEmailAddress?.emailAddress])

  useEffect(() => {
    if (!isOpen || !dbUserId) return
    let cancelled = false
    ;(async () => {
      try {
        const API_BASE_URL = await getApiBaseUrl()
        const res = await fetch(`${API_BASE_URL}/users/${dbUserId}/deposit`)
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (json.success && json.data && typeof json.data.depositAmount === 'number') {
          setWalletBalanceEur(json.data.depositAmount)
        }
      } catch {
        setWalletBalanceEur(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, dbUserId])

  useEffect(() => {
    if (!isOpen) setUseWalletDeposit(false)
  }, [isOpen])

  if (!isOpen) return null

  const propertyTitle = property?.title || property?.name || 'Объект недвижимости'
  const currency = (property?.currency || 'USD').toUpperCase()
  const currencySymbol =
    currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'BYN' ? 'Br' : ''

  const minSalePrice = Number(property?.price) || 0
  const tenPercent = Math.round(minSalePrice * DEPOSIT_FRACTION * 100) / 100
  const isEur = currency === 'EUR'
  const canUseWallet =
    isEur && walletBalanceEur != null && walletBalanceEur >= WALLET_OFFSET_EUR && tenPercent > WALLET_OFFSET_EUR

  let cardPayDisplay = tenPercent
  if (useWalletDeposit && canUseWallet) {
    cardPayDisplay = Math.round(Math.max(0, tenPercent - WALLET_OFFSET_EUR) * 100) / 100
  }

  const handleStripeReservation = async () => {
    if (!property?.id) {
      showNotification('Не удалось определить объект', 'error')
      return
    }
    if (!dbUserId) {
      showNotification('Не удалось получить профиль пользователя. Обновите страницу или войдите снова.', 'error')
      return
    }
    if (useWalletDeposit && isEur && !canUseWallet) {
      showNotification('Недостаточно средств на депозите или сумма резерва слишком мала', 'error')
      return
    }
    setStripeLoading(true)
    try {
      const customerEmail =
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        getUserData()?.email ||
        undefined
      const returnPath =
        stripeReturnPath || (property?.id != null ? `/property/${property.id}` : '/')
      const result = await startPropertyReservationCheckout({
        userId: dbUserId,
        propertyId: property.id,
        propertyType: property?.property_type || property?.propertyType,
        customerEmail,
        returnPath,
        useDeposit: !!(useWalletDeposit && canUseWallet),
      })
      if (!result.ok) {
        showNotification(result.error || 'Не удалось открыть оплату', 'error')
      }
    } finally {
      setStripeLoading(false)
    }
  }

  return (
    <div className="buy-now-modal-overlay" onClick={onClose}>
      <div className="buy-now-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="buy-now-modal__close"
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <FiX size={24} />
        </button>

        <div className="buy-now-modal__content">
          <div className="buy-now-modal__header">
            <div className="buy-now-modal__icon">
              <FiCheckCircle size={48} />
            </div>
            <h2 className="buy-now-modal__title">Купить сейчас</h2>
            <p className="buy-now-modal__subtitle">{propertyTitle}</p>
          </div>

          <div className="buy-now-modal__intro">
            <p className="buy-now-modal__intro-text">
              Резерв <strong>10% от минимальной цены продажи</strong>. После оплаты объект
              резервируется за вами, менеджер свяжется для полной оплаты и оформления сделки.
            </p>
          </div>

          <div className="buy-now-modal__price-block">
            <span className="buy-now-modal__price-label">Минимальная цена продажи</span>
            <span className="buy-now-modal__price-value">
              {currencySymbol}
              {minSalePrice.toLocaleString('ru-RU')}
            </span>
          </div>

          <div className="buy-now-modal__wallet-toggle">
            <div className="buy-now-modal__wallet-toggle-label">
              <span>Списать 3000 € с депозита</span>
              {walletBalanceEur != null && (
                <span className="buy-now-modal__wallet-balance">
                  Депозит: {walletBalanceEur.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} €
                </span>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={useWalletDeposit}
              disabled={!isEur || !canUseWallet}
              className={`buy-now-modal__switch ${useWalletDeposit ? 'buy-now-modal__switch--on' : ''} ${
                !isEur || !canUseWallet ? 'buy-now-modal__switch--disabled' : ''
              }`}
              onClick={() => {
                if (!isEur || !canUseWallet) return
                setUseWalletDeposit((v) => !v)
              }}
            >
              <span className="buy-now-modal__switch-knob" />
            </button>
            {!isEur && (
              <p className="buy-now-modal__wallet-hint">
                Списание с депозита доступно только для объявлений в EUR.
              </p>
            )}
            {isEur && walletBalanceEur != null && walletBalanceEur < WALLET_OFFSET_EUR && (
              <p className="buy-now-modal__wallet-hint">На депозите нужно не менее 3000 €.</p>
            )}
          </div>

          <div className="buy-now-modal__price-block buy-now-modal__price-block--deposit">
            <span className="buy-now-modal__price-label">
              <FiPercent size={16} aria-hidden style={{ verticalAlign: 'middle', marginRight: 6 }} />
              10% резерв
            </span>
            <span className="buy-now-modal__price-value buy-now-modal__price-value--deposit">
              {currencySymbol}
              {tenPercent.toLocaleString('ru-RU')}
            </span>
            {useWalletDeposit && canUseWallet && (
              <div className="buy-now-modal__split-pay">
                <span>−{WALLET_OFFSET_EUR.toLocaleString('ru-RU')} € с депозита</span>
                <span>
                  К оплате картой: {currencySymbol}
                  {cardPayDisplay.toLocaleString('ru-RU')}
                </span>
              </div>
            )}
          </div>

          <div className="buy-now-modal__instructions">
            <h3 className="buy-now-modal__instructions-title">Как это работает</h3>

            <div className="buy-now-modal__step">
              <div className="buy-now-modal__step-number">1</div>
              <div className="buy-now-modal__step-content">
                <h4 className="buy-now-modal__step-title">
                  <FiCreditCard size={20} />
                  Резерв 10%
                </h4>
                <p className="buy-now-modal__step-text">
                  Считается от минимальной цены продажи (не от текущей ставки аукциона).
                </p>
              </div>
            </div>

            <div className="buy-now-modal__step">
              <div className="buy-now-modal__step-number">2</div>
              <div className="buy-now-modal__step-content">
                <h4 className="buy-now-modal__step-title">
                  <FiPhone size={20} />
                  Менеджер
                </h4>
                <p className="buy-now-modal__step-text">
                  После оплаты резерва с вами свяжется менеджер для полной сделки.
                </p>
              </div>
            </div>
          </div>

          <div className="buy-now-modal__contact">
            <p className="buy-now-modal__contact-text">
              Тест Stripe: ключи <code>sk_test_</code>, карта 4242&nbsp;4242&nbsp;4242&nbsp;4242.
            </p>
          </div>

          <div className="buy-now-modal__actions buy-now-modal__actions--stack">
            <button
              type="button"
              className="buy-now-modal__button buy-now-modal__button--stripe"
              onClick={handleStripeReservation}
              disabled={
                stripeLoading ||
                !property?.id ||
                minSalePrice <= 0 ||
                (useWalletDeposit && isEur && !canUseWallet)
              }
            >
              {stripeLoading ? 'Переход к оплате…' : 'Оплатить резерв'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuyNowModal
