import { useState, useEffect, useRef } from 'react'
import { FiX, FiExternalLink, FiTrash2, FiChevronLeft } from 'react-icons/fi'
import ShareSignaturePad from './ShareSignaturePad'
import { fetchUserDeposit } from '../utils/depositApi'
import { showNotification } from '../utils/toastHelper'
import './SharePurchaseModal.css'
import { openReserveTermsPdf } from '../utils/reserveTermsPdfUrl'
import { navigateToStripeCheckout } from '../utils/subscriptionCheckout'
import { formatPropertyPrice } from '../utils/currency'
import { useDrawerDismiss, DRAWER_DISMISS_MS } from '../hooks/useDrawerDismiss'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const WALLET_OFFSET_EUR = 3000
const STEP_PRICE = 1
const STEP_AGREEMENT = 2

/** Склонение для «N доля/доли/долей» на русском */
function russianSharesWord(n) {
  const abs = Number(n)
  if (!Number.isFinite(abs) || abs < 0) return 'долей'
  const d10 = abs % 10
  const d100 = abs % 100
  if (d100 >= 11 && d100 <= 14) return 'долей'
  if (d10 === 1) return 'доля'
  if (d10 >= 2 && d10 <= 4) return 'доли'
  return 'долей'
}

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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [walletBalanceEur, setWalletBalanceEur] = useState(null)
  const [useWalletDeposit, setUseWalletDeposit] = useState(false)
  const [step, setStep] = useState(STEP_PRICE)
  const signaturePadRef = useRef(null)
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

  const formatPrice = (n) => formatPropertyPrice(n, currency, { compact: true })

  const openPdf = async () => {
    try {
      const { url, found } = await openReserveTermsPdf()
      setPdfViewerUrl(url)
      setIsPdfViewerOpen(true)
      setPdfOpened(true)
      if (!found) {
        showNotification(
          'Не удалось проверить файл условий. Если документ не открылся, обновите страницу или обратитесь в поддержку.',
          'error'
        )
      }
    } catch {
      showNotification('Не удалось открыть файл условий', 'error')
    }
  }

  const clearSignature = () => {
    signaturePadRef.current?.clear()
  }

  const handlePay = async () => {
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
    try {
      const intentRes = await fetch(`${API_BASE}/billing/share-purchase-signature-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          propertyId,
          propertyType,
          sharesCount: buyCount,
          signatureDataUrl: signaturePng,
        }),
      })
      const intentData = await intentRes.json().catch(() => ({}))
      if (!intentRes.ok || !intentData.success || !intentData.signingIntentId) {
        setError(intentData.error || 'Не удалось сохранить подпись')
        setSubmitting(false)
        return
      }

      const res = await fetch(`${API_BASE}/billing/create-share-purchase-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setError(data.error || 'Не удалось создать оплату')
        setSubmitting(false)
        return
      }
      if (data.url) {
        navigateToStripeCheckout(data.url)
        return
      }
      setError('Сервер не вернул ссылку на оплату')
    } catch (e) {
      setError(e?.message || 'Ошибка сети')
    }
    setSubmitting(false)
  }

  return (
    <div
      className={`share-purchase-modal-overlay${closingBackdrop}`}
      role="presentation"
      onClick={() => requestClose()}
    >
      <div
        className={`share-purchase-modal${closingPanel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-purchase-modal-title"
        aria-describedby="share-purchase-modal-step"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="share-purchase-modal__drawer-handle" aria-hidden>
          <span className="share-purchase-modal__drawer-pill" />
        </div>
        <div className="share-purchase-modal__scroll">
          <div className="share-purchase-modal__header">
            <div className="share-purchase-modal__header-leading">
              {step === STEP_AGREEMENT && (
                <button
                  type="button"
                  className="share-purchase-modal__header-back"
                  onClick={() => {
                    setStep(STEP_PRICE)
                    setError(null)
                  }}
                  aria-label="Назад: цена и параметры"
                >
                  <FiChevronLeft size={22} />
                </button>
              )}
              <div className="share-purchase-modal__header-text">
                <h2 id="share-purchase-modal-title">
                  {step === STEP_PRICE ? 'Цена и параметры' : 'Согласие и оплата'}
                </h2>
                <p id="share-purchase-modal-step" className="share-purchase-modal__step-meta">
                  Шаг {step} из 2 · {step === STEP_PRICE ? 'проверьте сумму' : 'документы и подпись'}
                </p>
              </div>
            </div>
            <button type="button" className="share-purchase-modal__close" onClick={() => requestClose()} aria-label="Закрыть">
              <FiX size={22} />
            </button>
          </div>

          <div className="share-purchase-modal__body">
            {step === STEP_PRICE && (
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

                <button type="button" className="share-purchase-modal__pay-btn" onClick={() => setStep(STEP_AGREEMENT)}>
                  Далее: согласие и оплата
                </button>
              </>
            )}

            {step === STEP_AGREEMENT && (
              <>
                <div className="share-purchase-modal__recap" aria-live="polite">
                  <span className="share-purchase-modal__recap-label">К оплате</span>
                  <strong className="share-purchase-modal__recap-value">{formatPrice(totalToPay)}</strong>
                  <span className="share-purchase-modal__recap-muted">
                    {buyCount} {russianSharesWord(buyCount)}
                  </span>
                </div>

                <div className="share-purchase-modal__policy">
                  <p className="share-purchase-modal__policy-intro">
                    Перед покупкой ознакомьтесь с условиями долевого участия. Документ откроется в окне поверх этой
                    формы.
                  </p>
                  <button type="button" className="share-purchase-modal__pdf-btn" onClick={openPdf}>
                    <FiExternalLink size={18} />
                    Открыть политику (PDF)
                  </button>
                </div>

                <label
                  className={`share-purchase-modal__check ${!pdfOpened ? 'share-purchase-modal__check--disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={agreed}
                    disabled={!pdfOpened}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span>Я прочитал(а) политику и согласен(на) с условиями покупки доли</span>
                </label>
                {!pdfOpened && (
                  <p className="share-purchase-modal__hint">
                    Сначала откройте PDF — после этого можно отметить согласие.
                  </p>
                )}

                {agreed && (
                  <div className="share-purchase-modal__signature-block">
                    <div className="share-purchase-modal__signature-head">
                      <label>Подпись согласия</label>
                      <button type="button" className="share-purchase-modal__clear-sig" onClick={clearSignature}>
                        <FiTrash2 size={16} />
                        Очистить
                      </button>
                    </div>
                    <ShareSignaturePad ref={signaturePadRef} active={agreed && isOpen && step === STEP_AGREEMENT} />
                  </div>
                )}

                {error && <p className="share-purchase-modal__error">{error}</p>}

                {agreed && (
                  <button
                    type="button"
                    className="share-purchase-modal__pay-btn"
                    disabled={submitting}
                    onClick={handlePay}
                  >
                    {submitting ? 'Переход к оплате…' : `Оплатить в Stripe (${formatPrice(totalToPay)})`}
                  </button>
                )}
              </>
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
              <strong>Условия резерва (PDF)</strong>
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
