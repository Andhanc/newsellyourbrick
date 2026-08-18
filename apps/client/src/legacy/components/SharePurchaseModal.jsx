import { useState, useEffect, useRef } from 'react'
import { FiX, FiExternalLink, FiTrash2, FiArrowLeft, FiArrowRight, FiLock } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import ShareSignaturePad from './ShareSignaturePad'
import { fetchUserDeposit } from '../utils/depositApi'
import { showNotification } from '../utils/toastHelper'
import './SharePurchaseModal.css'
import { launchReserveTermsPdf } from '../utils/reserveTermsPdfUrl'
import { navigateToStripeCheckout } from '../utils/subscriptionCheckout'
import { formatPropertyPrice } from '../utils/currency'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api'
const WALLET_OFFSET_EUR = 3000
const STEP_PRICE = 1
const STEP_TERMS = 2
const STEP_SIGN = 3

const SharePurchaseModal = ({
  isOpen,
  onClose,
  shareObject,
  buyCount,
  userId,
  userEmail,
  userDeposit,
  returnPath,
}) => {
  const [pdfOpened, setPdfOpened] = useState(false)
  const [pdfViewerUrl, setPdfViewerUrl] = useState('')
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signatureReady, setSignatureReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [walletBalanceEur, setWalletBalanceEur] = useState(null)
  const [useWalletDeposit, setUseWalletDeposit] = useState(false)
  const [step, setStep] = useState(STEP_PRICE)
  const signaturePadRef = useRef(null)
  const { i18n } = useTranslation()
  const numberLocale = i18n.language?.startsWith('ru') ? 'ru-RU' : 'en-US'
  const { visible, isClosing, requestClose } = useDrawerDismiss(isOpen, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })

  useEffect(() => {
    if (!isOpen) {
      setStep(STEP_PRICE)
      setPdfOpened(false)
      setPdfViewerUrl('')
      setIsPdfViewerOpen(false)
      setAgreed(false)
      setSignatureReady(false)
      setSubmitting(false)
      setError(null)
      setUseWalletDeposit(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 768px)').matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !userId) return
    let cancelled = false
    ;(async () => {
      const deposit = await fetchUserDeposit(API_BASE, userId, { ttlMs: 15000 })
      if (cancelled) return
      const fromApi = Number(deposit?.depositAmount)
      const fallback = Number(userDeposit)
      const resolved = Number.isFinite(fromApi) ? fromApi : Number.isFinite(fallback) ? fallback : 0
      setWalletBalanceEur(resolved)
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, userId, userDeposit])

  if (!visible || !shareObject) return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const closingPanel = isClosing
    ? ' drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing'
    : ''

  const pricePerShare = Number(shareObject.pricePerShare) || 0
  const total = pricePerShare * buyCount
  const currency = String(shareObject.currency || 'USD').toUpperCase()
  const isEur = currency === 'EUR'
  const canUseWallet =
    isEur && walletBalanceEur != null && walletBalanceEur >= WALLET_OFFSET_EUR && total > WALLET_OFFSET_EUR
  const walletApplied = useWalletDeposit && canUseWallet ? WALLET_OFFSET_EUR : 0
  const totalToPay = Math.max(0, total - walletApplied)
  const propertyId = shareObject.id
  const propertyType = shareObject.property_type
  const propertyTitle = shareObject.title || 'Объект'
  const payDisabled =
    submitting || !signatureReady || (useWalletDeposit && !canUseWallet)

  const formatPrice = (n) => formatPropertyPrice(n, currency, { compact: false, locale: numberLocale })

  const stepTitle =
    step === STEP_PRICE ? 'Цена и параметры' : step === STEP_TERMS ? 'Условия покупки' : 'Подпишите и оплатите'

  const openPdf = () => {
    try {
      const { url, openedInNewTab } = launchReserveTermsPdf()
      setPdfOpened(true)
      if (!openedInNewTab) {
        setPdfViewerUrl(url)
        setIsPdfViewerOpen(true)
      }
    } catch {
      showNotification('Не удалось открыть файл условий', 'error')
    }
  }

  const clearSignature = () => {
    signaturePadRef.current?.clear()
    setSignatureReady(false)
  }

  const goForward = () => {
    setError(null)
    if (step === STEP_PRICE) {
      setStep(STEP_TERMS)
      return
    }
    if (step === STEP_TERMS && agreed && pdfOpened) setStep(STEP_SIGN)
  }

  const goBack = () => {
    setError(null)
    setStep((value) => Math.max(STEP_PRICE, value - 1))
  }

  const handlePay = async () => {
    if (submitting) return
    setError(null)
    if (!userId || !propertyId || !propertyType) {
      setError('Недостаточно данных для оплаты')
      return
    }
    if (signaturePadRef.current?.isEmpty()) {
      setError('Поставьте подпись в поле ниже')
      return
    }
    const signaturePng = signaturePadRef.current?.toDataURL() || ''
    if (!signaturePng.startsWith('data:image/png')) {
      setError('Не удалось сохранить подпись')
      return
    }
    if (useWalletDeposit && !canUseWallet) {
      setError('Недостаточно депозита для списания 3000 €')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 45000)
      let intentRes
      let intentData = {}
      try {
        intentRes = await fetch(`${API_BASE}/billing/share-purchase-signature-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            userId,
            propertyId,
            propertyType,
            sharesCount: buyCount,
            signatureDataUrl: signaturePng,
          }),
        })
        intentData = await intentRes.json().catch(() => ({}))
      } finally {
        window.clearTimeout(timer)
      }
      if (!intentRes?.ok || !intentData.success || !intentData.signingIntentId) {
        setError(intentData.error || 'Не удалось сохранить подпись')
        return
      }

      const checkoutController = new AbortController()
      const checkoutTimer = window.setTimeout(() => checkoutController.abort(), 45000)
      let data = {}
      let res
      try {
        res = await fetch(`${API_BASE}/billing/create-share-purchase-checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: checkoutController.signal,
          body: JSON.stringify({
            userId,
            propertyId,
            propertyType,
            sharesCount: buyCount,
            signingIntentId: intentData.signingIntentId,
            useDeposit: !!(useWalletDeposit && canUseWallet),
            customerEmail: userEmail || undefined,
            returnPath: returnPath || undefined,
          }),
        })
        data = await res.json().catch(() => ({}))
      } finally {
        window.clearTimeout(checkoutTimer)
      }
      if (!res?.ok || !data.success) {
        setError(data.error || 'Не удалось создать оплату')
        return
      }
      const checkoutUrl =
        typeof data.url === 'string'
          ? data.url
          : typeof data?.data?.url === 'string'
            ? data.data.url
            : ''
      if (checkoutUrl && navigateToStripeCheckout(checkoutUrl)) {
        return
      }
      setError('Сервер не вернул ссылку на оплату')
    } catch (e) {
      const msg =
        e?.name === 'AbortError'
          ? 'Превышено время ожидания ответа сервера. Проверьте, что API запущен.'
          : e?.message || 'Ошибка сети'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={`share-purchase-modal-overlay${closingBackdrop}`}
      role="presentation"
      onClick={() => requestClose()}
    >
      <div
        className={`share-purchase-modal${step === STEP_SIGN ? ' share-purchase-modal--signing' : ''}${closingPanel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-purchase-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="share-purchase-modal__drawer-handle" aria-hidden>
          <span className="share-purchase-modal__drawer-pill" />
        </div>
        <button
          type="button"
          className="share-purchase-modal__close"
          onClick={() => requestClose()}
          aria-label="Закрыть"
        >
          <FiX size={20} />
        </button>

        <div className="share-purchase-modal__content">
          <header className="share-purchase-modal__head">
            <h2 id="share-purchase-modal-title" className="share-purchase-modal__title">
              {stepTitle}
            </h2>
            <p className="share-purchase-modal__subtitle">{propertyTitle}</p>
          </header>

          <div className="share-purchase-modal__body">
            {step === STEP_PRICE ? (
              <>
                <div className="share-purchase-modal__summary">
                  <div className="share-purchase-modal__row">
                    <span>Объект</span>
                    <strong>{shareObject.title}</strong>
                  </div>
                  <div className="share-purchase-modal__row">
                    <span>Количество долей</span>
                    <strong>{buyCount}</strong>
                  </div>
                  <div className="share-purchase-modal__row">
                    <span>Цена одной доли</span>
                    <strong>{formatPrice(pricePerShare)}</strong>
                  </div>
                  <div className="share-purchase-modal__row share-purchase-modal__row--total">
                    <span>К оплате</span>
                    <strong>{formatPrice(totalToPay)}</strong>
                  </div>
                </div>

                {isEur && (
                  <label className="share-purchase-modal__wallet-toggle">
                    <input
                      type="checkbox"
                      checked={useWalletDeposit}
                      onChange={(e) => setUseWalletDeposit(e.target.checked)}
                      disabled={!canUseWallet}
                    />
                    <span>Использовать депозит 3000 € в счет покупки долей</span>
                  </label>
                )}
                {isEur && !canUseWallet && (
                  <p className="share-purchase-modal__wallet-hint">
                    Для списания депозита нужно минимум 3000 € на балансе и сумма покупки выше 3000 €.
                  </p>
                )}
              </>
            ) : null}

            {step === STEP_TERMS ? (
              <section className="share-purchase-modal__legal share-purchase-modal__legal--terms">
                <div className="share-purchase-modal__terms-icon" aria-hidden>
                  <FiLock size={25} />
                </div>
                <div className="share-purchase-modal__legal-top">
                  <h3 className="share-purchase-modal__legal-title">
                    Перед оплатой внимательно прочитайте документ
                  </h3>
                  <p className="share-purchase-modal__terms-copy">
                    В нём зафиксированы сумма, количество долей и порядок оформления сделки.
                  </p>
                  <button type="button" className="share-purchase-modal__pdf-btn" onClick={openPdf}>
                    <FiExternalLink size={15} />
                    Условия покупки (PDF)
                  </button>
                  <label
                    className={`share-purchase-modal__check ${!pdfOpened ? 'share-purchase-modal__check--disabled' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={agreed}
                      disabled={!pdfOpened}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <span>Согласен(на) с условиями</span>
                  </label>
                </div>
              </section>
            ) : null}

            {step === STEP_SIGN ? (
              <section className="share-purchase-modal__legal share-purchase-modal__legal--signature">
                <div className="share-purchase-modal__signature-summary">
                  <span>К оплате сейчас</span>
                  <strong>{formatPrice(totalToPay)}</strong>
                  <small>Stripe подтвердит платёж до создания заявки</small>
                </div>
                <div className="share-purchase-modal__signature-block">
                  <div className="share-purchase-modal__signature-head">
                    <span className="share-purchase-modal__signature-label">Подпись</span>
                    <button type="button" className="share-purchase-modal__clear-sig" onClick={clearSignature}>
                      <FiTrash2 size={14} />
                      Очистить
                    </button>
                  </div>
                  <ShareSignaturePad
                    ref={signaturePadRef}
                    active={step === STEP_SIGN && isOpen}
                    onInkChange={setSignatureReady}
                  />
                </div>
                {error ? <p className="share-purchase-modal__error">{error}</p> : null}
              </section>
            ) : null}
          </div>

          <div className="share-purchase-modal__actions">
            {step > STEP_PRICE ? (
              <button type="button" className="share-purchase-modal__back" onClick={goBack}>
                <FiArrowLeft size={18} /> Назад
              </button>
            ) : null}
            {step < STEP_SIGN ? (
              <button
                type="button"
                className="share-purchase-modal__cta"
                onClick={goForward}
                disabled={step === STEP_TERMS && (!pdfOpened || !agreed)}
              >
                Продолжить <FiArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="share-purchase-modal__cta"
                onClick={handlePay}
                disabled={payDisabled}
              >
                {submitting ? 'Переход к оплате…' : 'Оплатить доли'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isPdfViewerOpen && (
        <div
          className="share-purchase-modal__pdf-viewer-overlay"
          role="presentation"
          onClick={() => setIsPdfViewerOpen(false)}
        >
          <div className="share-purchase-modal__pdf-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="share-purchase-modal__pdf-viewer-head">
              <strong>Условия покупки (PDF)</strong>
              <button
                type="button"
                className="share-purchase-modal__pdf-viewer-close"
                onClick={() => setIsPdfViewerOpen(false)}
                aria-label="Закрыть просмотр PDF"
              >
                <FiX size={18} />
              </button>
            </div>
            <iframe title="Условия покупки долей" src={pdfViewerUrl} className="share-purchase-modal__pdf-viewer-frame" />
          </div>
        </div>
      )}
    </div>
  )
}

export default SharePurchaseModal
