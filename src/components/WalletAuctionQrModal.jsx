import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiCheck, FiCopy, FiHome, FiSmartphone, FiX } from 'react-icons/fi'
import QRCode from 'qrcode'

const buildPaymentUrl = () => {
  if (typeof window === 'undefined') return '/auction'
  return new URL('/wallet?payment=qr', window.location.origin).toString()
}

export default function WalletPaymentQrModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const closeButtonRef = useRef(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const paymentUrl = buildPaymentUrl()

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return undefined

    let cancelled = false
    setQrDataUrl('')
    QRCode.toDataURL(paymentUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 640,
      color: {
        dark: '#08111FFF',
        light: '#FFFFFFFF',
      },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    }).catch((error) => {
      console.error('Не удалось создать QR-код для оплаты:', error)
    })

    return () => {
      cancelled = true
    }
  }, [paymentUrl, isOpen])

  useEffect(() => {
    if (!isOpen) setCopied(false)
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('Не удалось скопировать ссылку:', error)
    }
  }

  return createPortal(
    <div
      className="wallet-qr-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="wallet-qr-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-qr-modal-title"
        aria-describedby="wallet-qr-modal-description"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="wallet-qr-modal__close"
          onClick={onClose}
          aria-label={t('walletPage_qrClose')}
        >
          <FiX aria-hidden />
        </button>

        <div className="wallet-qr-modal__eyebrow" aria-hidden>
          <FiHome />
          SELL YOUR BRICK
        </div>
        <h2 id="wallet-qr-modal-title">{t('walletPage_qrTitle')}</h2>
        <p id="wallet-qr-modal-description">{t('walletPage_qrDescription')}</p>

        <div className="wallet-qr-modal__code-shell">
          {qrDataUrl ? (
            <img
              className="wallet-qr-modal__code"
              src={qrDataUrl}
              alt={t('walletPage_qrImageAlt')}
            />
          ) : (
            <div className="wallet-qr-modal__code-loading" aria-label={t('walletPage_qrLoading')} />
          )}
        </div>

        <div className="wallet-qr-modal__hint">
          <FiSmartphone aria-hidden />
          <span>{t('walletPage_qrHint')}</span>
        </div>

        <div className="wallet-qr-modal__actions">
          <button type="button" className="wallet-qr-modal__copy" onClick={handleCopy}>
            {copied ? <FiCheck aria-hidden /> : <FiCopy aria-hidden />}
            <span>{copied ? t('walletPage_qrCopied') : t('walletPage_qrCopy')}</span>
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
