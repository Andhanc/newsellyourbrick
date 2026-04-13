import { useState, useEffect, useRef } from 'react'
import { FiX, FiExternalLink, FiTrash2 } from 'react-icons/fi'
import ShareSignaturePad from './ShareSignaturePad'
import { fetchUserDeposit } from '../utils/depositApi'
import './SharePurchaseModal.css'
import { RESERVE_TERMS_PDF_URL as POLICY_PDF_URL } from '../utils/reserveTermsPdfUrl'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const WALLET_OFFSET_EUR = 3000

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
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [walletBalanceEur, setWalletBalanceEur] = useState(null)
  const [useWalletDeposit, setUseWalletDeposit] = useState(false)
  const signaturePadRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setPdfOpened(false)
      setAgreed(false)
      setSubmitting(false)
      setError(null)
      setUseWalletDeposit(false)
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

  if (!isOpen || !shareObject) return null

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

  const formatPrice = (n) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    return `$${Number(n).toLocaleString('en-US')}`
  }

  const openPdf = () => {
    const url = POLICY_PDF_URL
    window.open(url, '_blank', 'noopener,noreferrer')
    setPdfOpened(true)
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
        window.location.href = data.url
        return
      }
      setError('Сервер не вернул ссылку на оплату')
    } catch (e) {
      setError(e?.message || 'Ошибка сети')
    }
    setSubmitting(false)
  }

  return (
    <div className="share-purchase-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="share-purchase-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-purchase-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="share-purchase-modal__header">
          <h2 id="share-purchase-modal-title">Покупка долей</h2>
          <button type="button" className="share-purchase-modal__close" onClick={onClose} aria-label="Закрыть">
            <FiX size={22} />
          </button>
        </div>

        <div className="share-purchase-modal__body">
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

          <div className="share-purchase-modal__policy">
            <p className="share-purchase-modal__policy-intro">
              Перед покупкой ознакомьтесь с условиями долевого участия. Документ откроется в новой вкладке.
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
            <p className="share-purchase-modal__hint">Сначала откройте PDF — после этого можно отметить согласие.</p>
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
              <ShareSignaturePad ref={signaturePadRef} active={agreed && isOpen} />
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
        </div>
      </div>
    </div>
  )
}

export default SharePurchaseModal
