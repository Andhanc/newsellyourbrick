import { useState, useEffect, useRef } from 'react'
import { FiX, FiPercent, FiCreditCard, FiPhone, FiExternalLink, FiTrash2, FiAward } from 'react-icons/fi'
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
import reserveTermsPdf from '../../Document.pdf'

const DEPOSIT_FRACTION = 0.1
const WALLET_OFFSET_EUR = 3000
const POLICY_PDF_URL = reserveTermsPdf

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
  const [pdfOpened, setPdfOpened] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const signaturePadRef = useRef(null)

  const isAuctionWinner = variant === 'auctionWinner'

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
        if (typeof deposit.depositAmount === 'number') {
          setWalletBalanceEur(deposit.depositAmount)
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

  const propertyTitle = property?.title || property?.name || t('listingDefault')
  const currency = (property?.currency || 'USD').toUpperCase()
  const currencySymbol =
    currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'BYN' ? 'Br' : ''

  const minSalePriceRaw =
    Number(property?.price) ||
    Number(property?.minimumSalePrice) ||
    Number(property?.auction_starting_price) ||
    Number(property?.auctionStartingPrice) ||
    Number(property?.currentBid) ||
    (isAuctionWinner ? Number(winningBidAmount) : 0) ||
    0
  const minSalePrice = Math.round(minSalePriceRaw * 100) / 100
  const tenPercent = Math.round(minSalePrice * DEPOSIT_FRACTION * 100) / 100
  const isEur = currency === 'EUR'
  const canUseWallet =
    isEur && walletBalanceEur != null && walletBalanceEur >= WALLET_OFFSET_EUR && tenPercent > WALLET_OFFSET_EUR

  let cardPayDisplay = tenPercent
  if (useWalletDeposit && canUseWallet) {
    cardPayDisplay = Math.round(Math.max(0, tenPercent - WALLET_OFFSET_EUR) * 100) / 100
  }

  const winningBidNum =
    isAuctionWinner && winningBidAmount != null ? Math.round(Number(winningBidAmount) * 100) / 100 : null
  const hasValidWinningBid = !isAuctionWinner || (winningBidNum != null && winningBidNum > 0)

  const formatMoney = (n) =>
    Number(n).toLocaleString(locale === 'ru' ? 'ru-RU' : locale, { maximumFractionDigits: 2 })

  const openPdf = () => {
    window.open(POLICY_PDF_URL, '_blank', 'noopener,noreferrer')
    setPdfOpened(true)
  }

  const clearSignature = () => {
    signaturePadRef.current?.clear()
  }

  const handleStripeReservation = async () => {
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
    if (signaturePadRef.current?.isEmpty()) {
      showNotification(t('buyNowModalErrorSignature'), 'error')
      return
    }
    const signaturePng = signaturePadRef.current?.toDataURL() || ''
    if (!signaturePng.startsWith('data:image/png')) {
      showNotification(t('buyNowModalErrorSignatureSave'), 'error')
      return
    }
    if (useWalletDeposit && isEur && !canUseWallet) {
      showNotification(t('buyNowModalErrorDeposit'), 'error')
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
        showNotification(intentData.error || t('buyNowModalErrorSignatureSave'), 'error')
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
        showNotification(result.error || t('buyNowModalErrorCheckout'), 'error')
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
    (useWalletDeposit && isEur && !canUseWallet) ||
    !hasValidWinningBid

  return (
    <div className="buy-now-modal-overlay" onClick={onClose}>
      <div
        className={`buy-now-modal buy-now-modal--v2 ${isAuctionWinner ? 'buy-now-modal--auction-winner' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="buy-now-modal__close"
          type="button"
          onClick={onClose}
          aria-label={t('buyNowModalCloseAria')}
        >
          <FiX size={22} />
        </button>

        <div className="buy-now-modal__content buy-now-modal__content--v2">
          <header className="buy-now-modal__head">
            <h2 className="buy-now-modal__title">
              {isAuctionWinner ? t('auctionWinPaymentModalTitle') : t('buyNowModalTitle')}
            </h2>
            <p className="buy-now-modal__subtitle">{propertyTitle}</p>
            {isAuctionWinner && (
              <p className="buy-now-modal__auction-lead">{t('auctionWinPaymentModalLead')}</p>
            )}
          </header>

          <div className="buy-now-modal__sums">
            {isAuctionWinner ? (
              <>
                <div className="buy-now-modal__sum-card">
                  <span className="buy-now-modal__sum-label">{t('auctionWinPaymentModalWinningBidLabel')}</span>
                  <span className="buy-now-modal__sum-value">
                    {currencySymbol}
                    {winningBidNum != null ? formatMoney(winningBidNum) : '—'}
                  </span>
                  <span className="buy-now-modal__sum-footnote">{t('auctionWinPaymentModalWinningBidHint')}</span>
                </div>
                <div className="buy-now-modal__sum-card buy-now-modal__sum-card--accent">
                  <span className="buy-now-modal__sum-label">
                    <FiPercent size={14} aria-hidden /> {t('auctionWinPaymentModalReserveLabel')}
                  </span>
                  <span className="buy-now-modal__sum-value">
                    {currencySymbol}
                    {formatMoney(tenPercent)}
                  </span>
                  {useWalletDeposit && canUseWallet && (
                    <span className="buy-now-modal__sum-note">
                      {t('buyNowModalCardPayNote', {
                        card: `${currencySymbol}${formatMoney(cardPayDisplay)}`,
                        wallet: `${WALLET_OFFSET_EUR.toLocaleString(locale === 'ru' ? 'ru-RU' : locale)} €`,
                      })}
                    </span>
                  )}
                  <span className="buy-now-modal__sum-footnote">{t('auctionWinPaymentModalReserveHint')}</span>
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
                    <FiPercent size={14} aria-hidden /> {t('buyNowModalReservePercentLabel')}
                  </span>
                  <span className="buy-now-modal__sum-value">
                    {currencySymbol}
                    {formatMoney(tenPercent)}
                  </span>
                  {useWalletDeposit && canUseWallet && (
                    <span className="buy-now-modal__sum-note">
                      {t('buyNowModalCardPayNote', {
                        card: `${currencySymbol}${formatMoney(cardPayDisplay)}`,
                        wallet: `${WALLET_OFFSET_EUR.toLocaleString(locale === 'ru' ? 'ru-RU' : locale)} €`,
                      })}
                    </span>
                  )}
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
          {!isEur && <p className="buy-now-modal__inline-hint">{t('buyNowModalWalletOnlyEurHint')}</p>}
          {isEur && walletBalanceEur != null && walletBalanceEur < WALLET_OFFSET_EUR && (
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

          <section className="buy-now-modal__legal">
            <h3 className="buy-now-modal__legal-title">{t('buyNowModalConsentTitle')}</h3>
            <button type="button" className="buy-now-modal__pdf-btn" onClick={openPdf}>
              <FiExternalLink size={17} />
              {t('buyNowModalPdfTerms')}
            </button>
            <label className={`buy-now-modal__check ${!pdfOpened ? 'buy-now-modal__check--disabled' : ''}`}>
              <input
                type="checkbox"
                checked={agreed}
                disabled={!pdfOpened}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>{t('buyNowModalAgreeCheckbox')}</span>
            </label>

            {agreed && (
              <div className="buy-now-modal__signature-block">
                <div className="buy-now-modal__signature-head">
                  <span className="buy-now-modal__signature-label">{t('buyNowModalSignatureLabel')}</span>
                  <button type="button" className="buy-now-modal__clear-sig" onClick={clearSignature}>
                    <FiTrash2 size={15} />
                    {t('buyNowModalClearSignature')}
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
              disabled={payDisabled}
            >
              {stripeLoading
                ? t('buyNowModalRedirecting')
                : isAuctionWinner
                  ? t('auctionWinPaymentModalPayCta')
                  : t('buyNowModalPayReserve')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuyNowModal
