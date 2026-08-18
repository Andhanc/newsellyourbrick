import { useState, useEffect, useRef } from 'react'
import { FiX, FiPercent, FiCreditCard, FiPhone, FiExternalLink, FiTrash2, FiAward, FiArrowLeft, FiArrowRight, FiLock } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { useUser } from '@clerk/clerk-react'
import { getUserData, isAuthenticated } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import { fetchUserDeposit } from '../utils/depositApi'
import { showNotification } from '../utils/toastHelper'
import { startPropertyReservationCheckout } from '../utils/subscriptionCheckout'
import { hasEmailForBuyNowFlow } from '../utils/buyNowEmailGate'
import ShareSignaturePad from './ShareSignaturePad'
import './BuyNowModal.css'
import { launchReserveTermsPdf } from '../utils/reserveTermsPdfUrl'
import { getCurrencySymbol } from '../utils/currency'

const DEPOSIT_FRACTION = 0.1
const WALLET_OFFSET_EUR = 3000

const BuyNowModal = ({
  isOpen,
  onClose,
  property,
  stripeReturnPath,
  variant = 'buyNow',
  winningBidAmount,
}) => {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language || 'ru').split('-')[0]
  const { user, isLoaded: userLoaded } = useUser()
  const [dbUserId, setDbUserId] = useState(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [walletBalanceEur, setWalletBalanceEur] = useState(null)
  const [useWalletDeposit, setUseWalletDeposit] = useState(false)
  const [reserveInEur, setReserveInEur] = useState(null)
  const [pdfOpened, setPdfOpened] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signatureReady, setSignatureReady] = useState(false)
  const [step, setStep] = useState(1)
  const signaturePadRef = useRef(null)

  const isAuctionWinner = variant === 'auctionWinner'

  useEffect(() => {
    if (!isOpen) return undefined
    document.documentElement.classList.add('buy-now-modal-open')
    return () => document.documentElement.classList.remove('buy-now-modal-open')
  }, [isOpen])

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
        const deposit = await fetchUserDeposit(API_BASE_URL, dbUserId, { ttlMs: 15000 })
        if (cancelled || !deposit) return
        const parsedDeposit = Number(deposit.depositAmount)
        if (Number.isFinite(parsedDeposit)) {
          setWalletBalanceEur(parsedDeposit)
          return
        }
        setWalletBalanceEur(null)
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
      setSignatureReady(false)
      setStep(1)
      setStripeLoading(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setPdfOpened(false)
    setAgreed(false)
    setSignatureReady(false)
    signaturePadRef.current?.clear()
  }, [useWalletDeposit, isOpen])

  const propertyTitle = property?.title || property?.name || t('listingDefault')
  const currency = (property?.currency || 'USD').toUpperCase()
  const currencySymbol = getCurrencySymbol(currency)

  const minSalePriceRaw = isAuctionWinner
    ? Number(winningBidAmount) || Number(property?.currentBid) || 0
    : Number(property?.price) ||
      Number(property?.minimumSalePrice) ||
      Number(property?.minimum_sale_price) ||
      0
  const minSalePrice = Math.round(minSalePriceRaw * 100) / 100
  const tenPercent = Math.round(minSalePrice * DEPOSIT_FRACTION * 100) / 100
  const reserveBasisForWallet =
    currency === 'EUR'
      ? tenPercent
      : Number.isFinite(reserveInEur) && reserveInEur != null
        ? reserveInEur
        : null
  const canUseWallet = walletBalanceEur != null && walletBalanceEur >= WALLET_OFFSET_EUR && reserveBasisForWallet > WALLET_OFFSET_EUR

  let reserveDisplayAmount = tenPercent
  let reserveDisplayCurrency = currency
  if (useWalletDeposit && canUseWallet) {
    if (currency === 'EUR') {
      reserveDisplayAmount = Math.round(Math.max(0, tenPercent - WALLET_OFFSET_EUR) * 100) / 100
      reserveDisplayCurrency = 'EUR'
    } else {
      const reserveEurValue = Number.isFinite(reserveInEur) && reserveInEur != null ? reserveInEur : tenPercent
      reserveDisplayAmount = Math.round(Math.max(0, reserveEurValue - WALLET_OFFSET_EUR) * 100) / 100
      reserveDisplayCurrency = 'EUR'
    }
  }
  const reserveDisplaySymbol = getCurrencySymbol(reserveDisplayCurrency)

  const winningBidNum =
    isAuctionWinner && winningBidAmount != null ? Math.round(Number(winningBidAmount) * 100) / 100 : null
  const hasValidWinningBid = !isAuctionWinner || (winningBidNum != null && winningBidNum > 0)

  const formatMoney = (n) =>
    Number(n).toLocaleString(locale === 'ru' ? 'ru-RU' : locale, { maximumFractionDigits: 2 })

  useEffect(() => {
    if (!isOpen) return
    if (currency === 'EUR') {
      setReserveInEur(tenPercent)
      return
    }
    if (!(tenPercent > 0)) {
      setReserveInEur(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const API_BASE_URL = await getApiBaseUrl()
        const params = new URLSearchParams({
          from: currency.toLowerCase(),
          to: 'eur',
          amount: String(tenPercent),
        })
        const resp = await fetch(`${API_BASE_URL}/billing/fx/convert?${params.toString()}`)
        const data = await resp.json().catch(() => ({}))
        if (!resp.ok || !data?.success) throw new Error(data?.error || 'fx_error')
        const convertedAmount = Number(data?.data?.amount)
        if (!cancelled && Number.isFinite(convertedAmount) && convertedAmount > 0) {
          setReserveInEur(convertedAmount)
        }
      } catch {
        if (!cancelled) setReserveInEur(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, currency, tenPercent])

  const openPdf = () => {
    try {
      launchReserveTermsPdf()
      // После явного действия пользователя считаем документ открытым. При
      // rel=noopener браузеры намеренно возвращают null даже для успешной вкладки,
      // поэтому проверка window.open() блокировала согласие в рабочем сценарии.
      setPdfOpened(true)
    } catch {
      showNotification('Не удалось открыть файл условий', 'error')
    }
  }

  const clearSignature = () => {
    signaturePadRef.current?.clear()
    setSignatureReady(false)
  }

  const handleStripeReservation = async () => {
    if (stripeLoading) return
    if (!property?.id) {
      showNotification(t('buyNowModalErrorNoProperty'), 'error')
      return
    }
    if (!dbUserId) {
      showNotification(t('buyNowModalErrorLogin'), 'error')
      return
    }
    if (!hasEmailForBuyNowFlow(user, userLoaded)) {
      showNotification(t('buyNowModalErrorEmail'), 'error')
      return
    }
    if (!agreed || !pdfOpened) {
      showNotification(t('buyNowModalErrorPdfConsent'), 'error')
      return
    }
    if (signaturePadRef.current?.isEmpty?.()) {
      showNotification(t('buyNowModalErrorSignature'), 'error')
      return
    }
    const signaturePng = signaturePadRef.current?.toDataURL() || ''
    if (!signaturePng.startsWith('data:image/png')) {
      showNotification(t('buyNowModalErrorSignatureSave'), 'error')
      return
    }
    if (useWalletDeposit && !canUseWallet) {
      showNotification(t('buyNowModalErrorDeposit'), 'error')
      return
    }
    setStripeLoading(true)
    try {
      const API_BASE_URL = await getApiBaseUrl()
      const useDepositFlag = !!(useWalletDeposit && canUseWallet)
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 45000)
      let intentData = {}
      try {
        const intentRes = await fetch(`${API_BASE_URL}/billing/property-reservation-signature-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            userId: dbUserId,
            propertyId: property.id,
            propertyType: property?.property_type || property?.propertyType,
            useDeposit: useDepositFlag,
            signatureDataUrl: signaturePng,
          }),
        })
        intentData = await intentRes.json().catch(() => ({}))
        if (!intentRes.ok || !intentData.success || !intentData.signingIntentId) {
          showNotification(intentData.error || t('buyNowModalErrorSignatureSave'), 'error')
          return
        }
      } catch (error) {
        const msg =
          error?.name === 'AbortError'
            ? 'Превышено время ожидания ответа сервера. Проверьте, что API запущен.'
            : error?.message || t('buyNowModalErrorCheckout')
        showNotification(msg, 'error')
        return
      } finally {
        window.clearTimeout(timer)
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
        purchaseVariant: isAuctionWinner ? 'auctionWinner' : 'buyNow',
      })
      if (!result.ok) {
        showNotification(result.error || t('buyNowModalErrorCheckout'), 'error')
        return
      }
      if (!result.redirected) {
        showNotification(t('buyNowModalErrorCheckout'), 'error')
      }
    } finally {
      setStripeLoading(false)
    }
  }

  const payDisabled =
    stripeLoading ||
    !property?.id ||
    minSalePrice <= 0 ||
    !agreed ||
    !signatureReady ||
    (useWalletDeposit && !canUseWallet) ||
    !hasValidWinningBid

  if (!isOpen) return null

  const goForward = () => {
    if (step === 1) {
      setStep(2)
      return
    }
    if (step === 2 && agreed && pdfOpened) setStep(3)
  }

  return (
    <div className="buy-now-modal-overlay" onClick={onClose} role="presentation">
      <div
        className={[
          'buy-now-modal',
          'buy-now-modal--v2',
          isAuctionWinner ? 'buy-now-modal--auction-winner' : '',
          step === 3 ? 'buy-now-modal--signing' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-now-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="buy-now-modal__drawer-handle" aria-hidden="true">
          <span className="buy-now-modal__drawer-handle-pill" />
        </div>

        <button
          className="buy-now-modal__close"
          type="button"
          onClick={onClose}
          aria-label={t('buyNowModalCloseAria')}
        >
          <FiX size={20} />
        </button>

        <div className="buy-now-modal__content buy-now-modal__content--v2">
          <header className="buy-now-modal__head">
            <h2 id="buy-now-modal-title" className="buy-now-modal__title">
              {step === 1
                ? (isAuctionWinner ? t('auctionWinPaymentModalTitle') : t('buyNowModalTitle'))
                : step === 2
                  ? 'Условия резерва'
                  : 'Подпишите и оплатите'}
            </h2>
            <p className="buy-now-modal__subtitle">{propertyTitle}</p>
            {isAuctionWinner && (
              <p className="buy-now-modal__auction-lead">{t('auctionWinPaymentModalLead')}</p>
            )}
          </header>

          <div className="buy-now-modal__body">
            {step === 1 ? <>
              <div className="buy-now-modal__sums">
              {isAuctionWinner ? (
                <>
                  <div className="buy-now-modal__sum-card">
                    <span className="buy-now-modal__sum-label">
                      {t('auctionWinPaymentModalWinningBidLabel')}
                    </span>
                    <span className="buy-now-modal__sum-value">
                      {currencySymbol}
                      {winningBidNum != null ? formatMoney(winningBidNum) : '—'}
                    </span>
                    <span className="buy-now-modal__sum-footnote">
                      {t('auctionWinPaymentModalWinningBidHint')}
                    </span>
                  </div>
                  <div className="buy-now-modal__sum-card buy-now-modal__sum-card--accent">
                    <span className="buy-now-modal__sum-label">
                      <FiPercent size={13} aria-hidden /> {t('auctionWinPaymentModalReserveLabel')}
                    </span>
                    <span className="buy-now-modal__sum-value">
                      {reserveDisplaySymbol}
                      {formatMoney(useWalletDeposit && canUseWallet ? reserveDisplayAmount : tenPercent)}
                    </span>
                    <span className="buy-now-modal__sum-footnote">
                      {t('auctionWinPaymentModalReserveHint')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="buy-now-modal__sum-card">
                    <span className="buy-now-modal__sum-label">{t('buyNowModalMinPriceLabel')}</span>
                    <span className="buy-now-modal__sum-value">
                      {currencySymbol}
                      {formatMoney(minSalePrice)}
                    </span>
                    <span className="buy-now-modal__sum-footnote">{t('buyNowModalFullPriceHint')}</span>
                  </div>
                  <div className="buy-now-modal__sum-card buy-now-modal__sum-card--accent">
                    <span className="buy-now-modal__sum-label">
                      <FiPercent size={13} aria-hidden /> {t('buyNowModalReservePercentLabel')}
                    </span>
                    <span className="buy-now-modal__sum-value">
                      {reserveDisplaySymbol}
                      {formatMoney(useWalletDeposit && canUseWallet ? reserveDisplayAmount : tenPercent)}
                    </span>
                    <span className="buy-now-modal__sum-footnote">{t('buyNowModalReserveHint')}</span>
                  </div>
                </>
              )}
              </div>

              <div className="buy-now-modal__wallet-row">
              <div className="buy-now-modal__wallet-row-text">
                <span className="buy-now-modal__wallet-title">{t('buyNowModalWalletTitle')}</span>
                {walletBalanceEur != null && (
                  <span className="buy-now-modal__wallet-meta">
                    {walletBalanceEur.toLocaleString(locale === 'ru' ? 'ru-RU' : locale, {
                      maximumFractionDigits: 0,
                    })}{' '}
                    €
                  </span>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-label={t('buyNowModalWalletTitle')}
                aria-checked={useWalletDeposit}
                disabled={!canUseWallet}
                className={`buy-now-modal__switch ${useWalletDeposit ? 'buy-now-modal__switch--on' : ''} ${
                  !canUseWallet ? 'buy-now-modal__switch--disabled' : ''
                }`}
                onClick={() => {
                  if (!canUseWallet) return
                  setUseWalletDeposit((v) => !v)
                }}
              >
                <span className="buy-now-modal__switch-knob" />
              </button>
              </div>
              {walletBalanceEur != null && walletBalanceEur < WALLET_OFFSET_EUR && (
                <p className="buy-now-modal__inline-hint">{t('buyNowModalWalletNeedDepositHint')}</p>
              )}

              <section className="buy-now-modal__how">
              <h3 className="buy-now-modal__how-title">
                {isAuctionWinner ? t('auctionWinPaymentModalHowTitle') : t('buyNowModalHowTitle')}
              </h3>
              <div className="buy-now-modal__how-grid">
                {isAuctionWinner ? (
                  <>
                    <div className="buy-now-modal__how-item">
                      <FiAward className="buy-now-modal__how-icon" aria-hidden />
                      <div>
                        <strong>{t('auctionWinPaymentModalHowStep1Title')}</strong>
                        <span>{t('auctionWinPaymentModalHowStep1Desc')}</span>
                      </div>
                    </div>
                    <div className="buy-now-modal__how-item">
                      <FiPhone className="buy-now-modal__how-icon" aria-hidden />
                      <div>
                        <strong>{t('auctionWinPaymentModalHowStep2Title')}</strong>
                        <span>{t('auctionWinPaymentModalHowStep2Desc')}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="buy-now-modal__how-item">
                      <FiCreditCard className="buy-now-modal__how-icon" aria-hidden />
                      <div>
                        <strong>{t('buyNowModalHowReserveTitle')}</strong>
                        <span>{t('buyNowModalHowReserveDesc')}</span>
                      </div>
                    </div>
                    <div className="buy-now-modal__how-item">
                      <FiPhone className="buy-now-modal__how-icon" aria-hidden />
                      <div>
                        <strong>{t('buyNowModalHowManagerTitle')}</strong>
                        <span>{t('buyNowModalHowManagerDesc')}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              </section>
            </> : null}

            {step === 2 ? (
              <section className="buy-now-modal__legal buy-now-modal__legal--terms">
                <div className="buy-now-modal__terms-icon"><FiLock size={25} /></div>
                <div className="buy-now-modal__legal-top">
                  <h3 className="buy-now-modal__legal-title">Перед оплатой внимательно прочитайте документ</h3>
                  <p className="buy-now-modal__terms-copy">
                    В нём зафиксированы сумма резерва, срок бронирования и порядок дальнейшего оформления сделки.
                  </p>
                <button type="button" className="buy-now-modal__pdf-btn" onClick={openPdf}>
                  <FiExternalLink size={15} />
                  {t('buyNowModalPdfTerms')}
                </button>
                <label
                  className={`buy-now-modal__check ${!pdfOpened ? 'buy-now-modal__check--disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={agreed}
                    disabled={!pdfOpened}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span>{t('buyNowModalAgreeCheckbox')}</span>
                </label>
              </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="buy-now-modal__legal buy-now-modal__legal--signature">
                <div className="buy-now-modal__signature-summary">
                  <span>К оплате сейчас</span>
                  <strong>{reserveDisplaySymbol}{formatMoney(useWalletDeposit && canUseWallet ? reserveDisplayAmount : tenPercent)}</strong>
                  <small>Stripe подтвердит платёж до создания заявки</small>
                </div>
                <div className="buy-now-modal__signature-block">
                  <div className="buy-now-modal__signature-head">
                    <span className="buy-now-modal__signature-label">{t('buyNowModalSignatureLabel')}</span>
                    <button type="button" className="buy-now-modal__clear-sig" onClick={clearSignature}>
                      <FiTrash2 size={14} />
                      {t('buyNowModalClearSignature')}
                    </button>
                  </div>
                  <ShareSignaturePad
                    ref={signaturePadRef}
                    active={step === 3 && isOpen}
                    onInkChange={setSignatureReady}
                  />
                </div>
              </section>
            ) : null}
          </div>

          <div className="buy-now-modal__actions">
            {step > 1 ? (
              <button type="button" className="buy-now-modal__back" onClick={() => setStep((value) => Math.max(1, value - 1))}>
                <FiArrowLeft size={18} /> Назад
              </button>
            ) : null}
            {step < 3 ? (
              <button
                type="button"
                className="buy-now-modal__cta"
                onClick={goForward}
                disabled={step === 2 && (!pdfOpened || !agreed)}
              >
                Продолжить <FiArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="buy-now-modal__cta"
                onClick={handleStripeReservation}
                disabled={payDisabled}
              >
                {stripeLoading
                  ? t('buyNowModalRedirecting')
                  : isAuctionWinner
                    ? t('auctionWinPaymentModalPayCta')
                    : t('buyNowModalPayReserve')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuyNowModal
