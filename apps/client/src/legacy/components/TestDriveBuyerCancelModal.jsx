import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getApiBaseUrl } from '../utils/apiConfig'
import { showNotification } from '../utils/toastHelper'
import './TestDriveBuyerCancelModal.css'

const REASON_CODES = ['dates_changed', 'found_alternative', 'property_not_fit', 'price_concern', 'personal', 'other']

/**
 * @param {{ open: boolean, booking: object | null, hasOnlinePayment: boolean, onClose: () => void, onSuccess?: () => void }} props
 */
export default function TestDriveBuyerCancelModal({ open, booking, hasOnlinePayment, onClose, onSuccess }) {
  const { t } = useTranslation()
  const [code, setCode] = useState('dates_changed')
  const [otherText, setOtherText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setCode('dates_changed')
    setOtherText('')
    setError(null)
    setSubmitting(false)
  }, [open, booking?.id])

  if (!open || !booking) return null

  const onSubmit = async () => {
    setError(null)
    const uidRaw = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
    const uid = uidRaw && /^\d+$/.test(String(uidRaw)) ? parseInt(String(uidRaw), 10) : null
    if (!uid) {
      setError(t('buyerBookings_loginRequired'))
      return
    }
    if (code === 'other' && otherText.trim().length < 5) {
      setError(t('buyerBookings_cancelOtherTooShort'))
      return
    }
    setSubmitting(true)
    try {
      const base = await getApiBaseUrl()
      const res = await fetch(`${base.replace(/\/$/, '')}/test-drive-bookings/${booking.id}/cancel-by-buyer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: uid,
          reason_code: code,
          reason_text: code === 'other' ? otherText.trim() : '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        setError(data.error || t('buyerBookings_cancelError'))
        setSubmitting(false)
        return
      }
      showNotification(t('buyerBookings_cancelSuccess'), 'success')
      onSuccess?.()
      onClose()
    } catch {
      setError(t('buyerBookings_cancelError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="tdbuyer-cancel-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div className="tdbuyer-cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="tdbuyer-cancel-title">
        <h2 id="tdbuyer-cancel-title" className="tdbuyer-cancel-dialog__title">
          {t('buyerBookings_cancelModalTitle')}
        </h2>
        {hasOnlinePayment ? (
          <p className="tdbuyer-cancel-dialog__warn">
            <strong>{t('buyerBookings_cancelRefund50Title')}</strong>
            {t('buyerBookings_cancelRefund50Body')}
          </p>
        ) : (
          <p className="tdbuyer-cancel-dialog__note">{t('buyerBookings_cancelNoPaymentNote')}</p>
        )}
        <p className="tdbuyer-cancel-dialog__label">{t('buyerBookings_cancelReasonPrompt')}</p>
        <div className="tdbuyer-cancel-dialog__options">
          {REASON_CODES.map((c) => (
            <label key={c} className="tdbuyer-cancel-dialog__option">
              <input type="radio" name="tdbuyer-cancel-reason" checked={code === c} onChange={() => setCode(c)} />
              <span>{t(`buyerBookings_cancelReason_${c}`)}</span>
            </label>
          ))}
        </div>
        {code === 'other' ? (
          <textarea
            className="tdbuyer-cancel-dialog__textarea"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder={t('buyerBookings_cancelOtherPlaceholder')}
            maxLength={2000}
            aria-label={t('buyerBookings_cancelOtherPlaceholder')}
          />
        ) : null}
        {error ? (
          <p className="tdbuyer-cancel-dialog__err" role="alert">
            {error}
          </p>
        ) : null}
        <div className="tdbuyer-cancel-dialog__actions">
          <button type="button" className="tdbuyer-cancel-dialog__btn" disabled={submitting} onClick={onClose}>
            {t('buyerBookings_cancelClose')}
          </button>
          <button type="button" className="tdbuyer-cancel-dialog__btn tdbuyer-cancel-dialog__btn--danger" disabled={submitting} onClick={() => void onSubmit()}>
            {submitting ? t('buyerBookings_cancelSubmitting') : t('buyerBookings_cancelSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}
