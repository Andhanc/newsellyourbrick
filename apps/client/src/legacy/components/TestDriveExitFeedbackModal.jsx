import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiX } from 'react-icons/fi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { showNotification } from '../utils/toastHelper'
import { useDrawerDismiss } from '../hooks/useDrawerDismiss'
import './TestDriveExitFeedbackModal.css'

const MIN_COMMENT_LEN = 10

/**
 * Публичная оценка после проживания (звёзды + текст). Десктоп — модалка, телефон — нижний лист.
 *
 * @param {{ open: boolean, feedbackToken?: string | null, onClose: () => void, onSuccess?: () => void }} props
 */
export default function TestDriveExitFeedbackModal({ open, feedbackToken, onClose, onSuccess }) {
  const { t } = useTranslation()
  const { visible, isClosing, requestClose } = useDrawerDismiss(open, onClose)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)
  const [rating, setRating] = useState(null)
  const [comment, setComment] = useState('')
  const [alreadyDone, setAlreadyDone] = useState(false)

  const reset = useCallback(() => {
    setDetail(null)
    setRating(null)
    setComment('')
    setAlreadyDone(false)
    setLoading(true)
    setSaving(false)
  }, [])

  useEffect(() => {
    if (!open || !feedbackToken) return
    reset()
    let cancelled = false
    ;(async () => {
      try {
        const base = await getApiBaseUrl()
        const res = await fetch(
          `${String(base).replace(/\/$/, '')}/test-drive-feedback/${encodeURIComponent(String(feedbackToken))}/detail`,
        )
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.success) {
          showNotification(data.error || t('exitFeedback_loadError'), 'error')
          onClose()
          return
        }
        setDetail(data.data)
        if (data.data?.already_submitted) setAlreadyDone(true)
      } catch {
        if (!cancelled) {
          showNotification(t('exitFeedback_networkError'), 'error')
          onClose()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, feedbackToken, onClose, reset, t])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, requestClose])

  const canSubmit =
    Number.isFinite(Number(rating)) &&
    Number(rating) >= 1 &&
    Number(rating) <= 5 &&
    String(comment || '').trim().length >= MIN_COMMENT_LEN

  /** Строго после явного выбора звезды (не показываем поле комментария до клика). */
  const ratingChosen =
    typeof rating === 'number' && Number.isFinite(rating) && rating >= 1 && rating <= 5

  const handleSubmit = async () => {
    if (!canSubmit || !feedbackToken) return
    setSaving(true)
    try {
      const base = await getApiBaseUrl()
      const res = await fetch(
        `${String(base).replace(/\/$/, '')}/test-drive-feedback/${encodeURIComponent(String(feedbackToken))}/report`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report: {
              rating: Math.round(Number(rating)),
              comment: String(comment || '').trim(),
            },
          }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) {
        showNotification(data.error || t('exitFeedback_alreadyDone'), 'warning')
        setAlreadyDone(true)
        return
      }
      if (!res.ok || !data.success) {
        showNotification(data.error || t('exitFeedback_saveError'), 'error')
        return
      }
      showNotification(t('exitFeedback_success'), 'success')
      onSuccess?.()
      onClose()
    } catch {
      showNotification(t('exitFeedback_networkError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!visible || !feedbackToken) return null

  const closingPanel = isClosing
    ? ' drawer-dismiss-from-bottom--closing drawer-dismiss-modal--closing'
    : ''
  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''

  const { booking, buyer, property } = detail || {}
  const titleText = property?.title || t('exitFeedback_title')
  const rangeText =
    booking && property
      ? t('exitFeedback_bookingRange', { start: booking.start_date, end: booking.end_date })
      : ''

  return (
    <div
      className={`td-exit-feedback-overlay${closingBackdrop}`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose()
      }}
    >
      <div
        className={`td-exit-feedback${closingPanel}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="td-exit-feedback-title"
      >
        <div className="td-exit-feedback__top">
          <div>
            <h2 id="td-exit-feedback-title">{t('exitFeedback_title')}</h2>
            {!loading && detail ? (
              <>
                {buyer?.first_name ? (
                  <p className="td-exit-feedback__welcome">
                    {t('exitFeedback_hello', { name: buyer.first_name })}
                  </p>
                ) : null}
                <p className="td-exit-feedback__meta">
                  <strong>{titleText}</strong>
                  {rangeText ? (
                    <>
                      <br />
                      {rangeText}
                    </>
                  ) : null}
                </p>
              </>
            ) : (
              <p>{t('exitFeedback_loading')}</p>
            )}
          </div>
          <button type="button" className="td-exit-feedback__close" onClick={() => requestClose()} aria-label={t('exitFeedback_close')}>
            <FiX size={22} aria-hidden />
          </button>
        </div>

        <div className="td-exit-feedback__body">
          {loading ? (
            <div className="td-exit-feedback__state">{t('exitFeedback_loading')}</div>
          ) : alreadyDone ? (
            <div className="td-exit-feedback__done">{t('exitFeedback_thanksAlready')}</div>
          ) : (
            <>
              <p className="td-exit-feedback__intro">{t('exitFeedback_intro')}</p>
              <div className="td-exit-feedback__stars-wrap">
                <span className="td-exit-feedback__stars-label">{t('exitFeedback_starsLabel')}</span>
                <div className="td-exit-feedback__stars" role="radiogroup" aria-label={t('exitFeedback_starsLabel')}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`td-exit-feedback__star${ratingChosen && n <= rating ? ' td-exit-feedback__star--on' : ''}`}
                      aria-pressed={rating === n}
                      aria-label={t('exitFeedback_starAria', { n })}
                      onClick={() => setRating(n)}
                    >
                      <span className="td-exit-feedback__star-char" aria-hidden>
                        ★
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {ratingChosen ? (
                <div className="td-exit-feedback__comment-block">
                  <label className="td-exit-feedback__comment-label" htmlFor="td-exit-feedback-comment">
                    {t('exitFeedback_commentLabel')}
                  </label>
                  <textarea
                    id="td-exit-feedback-comment"
                    className="td-exit-feedback__textarea"
                    rows={5}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('exitFeedback_commentPh')}
                  />
                  <p className="td-exit-feedback__hint">{t('exitFeedback_commentHint', { min: MIN_COMMENT_LEN })}</p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {!loading && !alreadyDone ? (
          <div className="td-exit-feedback__footer">
            <button type="button" className="td-exit-feedback__btn" onClick={() => requestClose()}>
              {t('exitFeedback_close')}
            </button>
            <button
              type="button"
              className="td-exit-feedback__btn td-exit-feedback__btn--primary"
              disabled={!ratingChosen || !canSubmit || saving}
              onClick={() => void handleSubmit()}
            >
              {saving ? t('exitFeedback_submitting') : t('exitFeedback_submit')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
