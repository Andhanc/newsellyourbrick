import { useState, useEffect, useRef } from 'react'
import { FiX, FiPercent, FiCreditCard, FiPhone, FiExternalLink, FiTrash2 } from 'react-icons/fi'
import { useUser } from '@clerk/clerk-react'
import { getUserData, isAuthenticated } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import { showNotification } from '../utils/toastHelper'
import { startPropertyReservationCheckout } from '../utils/subscriptionCheckout'
import { hasEmailForBuyNowFlow } from '../utils/buyNowEmailGate'
import ShareSignaturePad from './ShareSignaturePad'
import './BuyNowModal.css'

const DEPOSIT_FRACTION = 0.1
const WALLET_OFFSET_EUR = 3000
const POLICY_PDF_URL = '/docs/buy-now-reservation-policy-test.pdf'

const BuyNowModal = ({ isOpen, onClose, property, stripeReturnPath }) => {
  const { user, isLoaded: userLoaded } = useUser()
  const [dbUserId, setDbUserId] = useState(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [walletBalanceEur, setWalletBalanceEur] = useState(null)
  const [useWalletDeposit, setUseWalletDeposit] = useState(false)
  const [pdfOpened, setPdfOpened] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const signaturePadRef = useRef(null)

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
    if (!isOpen) {
      setUseWalletDeposit(false)
      setPdfOpened(false)
      setAgreed(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setPdfOpened(false)
    setAgreed(false)
    signaturePadRef.current?.clear()
  }, [useWalletDeposit, isOpen])

  if (!isOpen) return null

  const propertyTitle = property?.title || property?.name || 'Объект'
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

  const openPdf = () => {
    window.open(POLICY_PDF_URL, '_blank', 'noopener,noreferrer')
    setPdfOpened(true)
  }

  const clearSignature = () => {
    signaturePadRef.current?.clear()
  }

  const handleStripeReservation = async () => {
    if (!property?.id) {
      showNotification('Не удалось определить объект', 'error')
      return
    }
    if (!dbUserId) {
      showNotification('Войдите в аккаунт или обновите страницу.', 'error')
      return
    }
    if (!hasEmailForBuyNowFlow(user, userLoaded)) {
      showNotification(
        'Укажите email в аккаунте или профиле — он нужен для оформления покупки и писем от сервиса.',
        'error'
      )
      return
    }
    if (!agreed || !pdfOpened) {
      showNotification('Откройте PDF и отметьте согласие', 'error')
      return
    }
    if (signaturePadRef.current?.isEmpty()) {
      showNotification('Поставьте подпись', 'error')
      return
    }
    const signaturePng = signaturePadRef.current?.toDataURL() || ''
    if (!signaturePng.startsWith('data:image/png')) {
      showNotification('Не удалось сохранить подпись', 'error')
      return
    }
    if (useWalletDeposit && isEur && !canUseWallet) {
      showNotification('Недостаточно средств на депозите', 'error')
      return
    }
    setStripeLoading(true)
    try {
      const API_BASE_URL = await getApiBaseUrl()
      const useDepositFlag = !!(useWalletDeposit && canUseWallet)
      const intentRes = await fetch(`${API_BASE_URL}/billing/property-reservation-signature-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: dbUserId,
          propertyId: property.id,
          propertyType: property?.property_type || property?.propertyType,
          useDeposit: useDepositFlag,
          signatureDataUrl: signaturePng,
        }),
      })
      const intentData = await intentRes.json().catch(() => ({}))
      if (!intentRes.ok || !intentData.success || !intentData.signingIntentId) {
        showNotification(intentData.error || 'Не удалось сохранить подпись', 'error')
        return
      }

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
        useDeposit: useDepositFlag,
        signingIntentId: intentData.signingIntentId,
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
      <div className="buy-now-modal buy-now-modal--v2" onClick={(e) => e.stopPropagation()}>
        <button className="buy-now-modal__close" type="button" onClick={onClose} aria-label="Закрыть">
          <FiX size={22} />
        </button>

        <div className="buy-now-modal__content buy-now-modal__content--v2">
          <header className="buy-now-modal__head">
            <h2 className="buy-now-modal__title">Купить сейчас</h2>
            <p className="buy-now-modal__subtitle">{propertyTitle}</p>
          </header>

          <div className="buy-now-modal__sums">
            <div className="buy-now-modal__sum-card">
              <span className="buy-now-modal__sum-label">Мин. цена</span>
              <span className="buy-now-modal__sum-value">
                {currencySymbol}
                {minSalePrice.toLocaleString('ru-RU')}
              </span>
            </div>
            <div className="buy-now-modal__sum-card buy-now-modal__sum-card--accent">
              <span className="buy-now-modal__sum-label">
                <FiPercent size={14} aria-hidden /> Резерв 10%
              </span>
              <span className="buy-now-modal__sum-value">
                {currencySymbol}
                {tenPercent.toLocaleString('ru-RU')}
              </span>
              {useWalletDeposit && canUseWallet && (
                <span className="buy-now-modal__sum-note">
                  Картой: {currencySymbol}
                  {cardPayDisplay.toLocaleString('ru-RU')} · −{WALLET_OFFSET_EUR.toLocaleString('ru-RU')} € с депозита
                </span>
              )}
            </div>
          </div>

          <div className="buy-now-modal__wallet-row">
            <div className="buy-now-modal__wallet-row-text">
              <span className="buy-now-modal__wallet-title">3000 € с депозита</span>
              {walletBalanceEur != null && (
                <span className="buy-now-modal__wallet-meta">
                  {walletBalanceEur.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} €
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
          </div>
          {!isEur && <p className="buy-now-modal__inline-hint">Только для объявлений в EUR</p>}
          {isEur && walletBalanceEur != null && walletBalanceEur < WALLET_OFFSET_EUR && (
            <p className="buy-now-modal__inline-hint">Нужно ≥ 3000 € на депозите</p>
          )}

          <section className="buy-now-modal__how">
            <h3 className="buy-now-modal__how-title">Как это работает</h3>
            <div className="buy-now-modal__how-grid">
              <div className="buy-now-modal__how-item">
                <FiCreditCard className="buy-now-modal__how-icon" aria-hidden />
                <div>
                  <strong>Резерв 10%</strong>
                  <span>От минимальной цены объекта</span>
                </div>
              </div>
              <div className="buy-now-modal__how-item">
                <FiPhone className="buy-now-modal__how-icon" aria-hidden />
                <div>
                  <strong>Менеджер</strong>
                  <span>Свяжется для оформления сделки</span>
                </div>
              </div>
            </div>
          </section>

          <section className="buy-now-modal__legal">
            <h3 className="buy-now-modal__legal-title">Согласие</h3>
            <button type="button" className="buy-now-modal__pdf-btn" onClick={openPdf}>
              <FiExternalLink size={17} />
              Условия резерва (PDF)
            </button>
            <label className={`buy-now-modal__check ${!pdfOpened ? 'buy-now-modal__check--disabled' : ''}`}>
              <input
                type="checkbox"
                checked={agreed}
                disabled={!pdfOpened}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>Согласен(на) с условиями</span>
            </label>

            {agreed && (
              <div className="buy-now-modal__signature-block">
                <div className="buy-now-modal__signature-head">
                  <span className="buy-now-modal__signature-label">Подпись</span>
                  <button type="button" className="buy-now-modal__clear-sig" onClick={clearSignature}>
                    <FiTrash2 size={15} />
                    Очистить
                  </button>
                </div>
                <ShareSignaturePad ref={signaturePadRef} active={agreed && isOpen} />
              </div>
            )}
          </section>

          <div className="buy-now-modal__actions">
            <button
              type="button"
              className="buy-now-modal__cta"
              onClick={handleStripeReservation}
              disabled={
                stripeLoading ||
                !property?.id ||
                minSalePrice <= 0 ||
                !agreed ||
                (useWalletDeposit && isEur && !canUseWallet)
              }
            >
              {stripeLoading ? 'Переход…' : 'Оплатить резерв'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuyNowModal
