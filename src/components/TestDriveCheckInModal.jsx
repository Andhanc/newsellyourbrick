import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiCheckCircle, FiUpload, FiX } from 'react-icons/fi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { showNotification } from '../utils/toastHelper'
import './TestDriveCheckInModal.css'

const STEP_COUNT = 6

const HIGHLIGHT_KEYS = ['interior', 'bed', 'price', 'kitchen', 'location']

const initialForm = () => ({
  first_impression: '',
  first_impression_comment: '',
  comfort: '',
  comfort_missing_comment: '',
  comfort_photos: [],
  highlights: [],
  highlights_comment: '',
  price_impression: '',
  price_improve_comment: '',
  purchase_intent: '',
  purchase_comment: '',
})

function toDataUrls(files) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = reject
          reader.readAsDataURL(file)
        }),
    ),
  )
}

function toggleHighlight(list, key) {
  const k = String(key)
  if (list.includes(k)) return list.filter((x) => x !== k)
  return [...list, k]
}

/** @returns {{ key: string, params?: Record<string, unknown> } | null} */
function getStepBlockReason(step, form) {
  switch (step) {
    case 0: {
      if (!form.first_impression) return { key: 'tdSurvey_err_s1_pick' }
      return null
    }
    case 1: {
      if (!form.comfort) return { key: 'tdSurvey_err_s2_pick' }
      if (form.comfort === 'mostly_but_missing' && !String(form.comfort_missing_comment || '').trim()) {
        return { key: 'tdSurvey_err_s2_missing' }
      }
      return null
    }
    case 2: {
      if (!form.highlights?.length) return { key: 'tdSurvey_err_s3_pick' }
      return null
    }
    case 3: {
      if (!form.price_impression) return { key: 'tdSurvey_err_s4_pick' }
      return null
    }
    case 4: {
      if (!form.purchase_intent) return { key: 'tdSurvey_err_s5_pick' }
      return null
    }
    default:
      return null
  }
}

function isStepValid(step, form) {
  return getStepBlockReason(step, form) === null
}

function canNavigateToStep(target, form) {
  if (target < 0 || target >= STEP_COUNT) return false
  for (let j = 0; j < target; j += 1) {
    if (!isStepValid(j, form)) return false
  }
  return true
}

function canSubmitForm(form) {
  for (let j = 0; j < 5; j += 1) {
    if (!isStepValid(j, form)) return false
  }
  return true
}

/**
 * @param {{ open: boolean, bookingId?: string | number | null, surveyToken?: string | null, onClose: () => void, onSuccess?: () => void }} props
 */
export default function TestDriveCheckInModal({ open, bookingId, surveyToken, onClose, onSuccess }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [activeStep, setActiveStep] = useState(0)

  const reset = useCallback(() => {
    setForm(initialForm())
    setActiveStep(0)
    setDetail(null)
    setLoading(true)
    setSaving(false)
  }, [])

  useEffect(() => {
    if (!open) return
    if (surveyToken) {
      reset()
      let cancelled = false
      ;(async () => {
        try {
          const base = await getApiBaseUrl()
          const res = await fetch(
            `${String(base).replace(/\/$/, '')}/test-drive-survey/${encodeURIComponent(String(surveyToken))}/detail`,
          )
          const data = await res.json()
          if (cancelled) return
          if (!res.ok || !data.success) {
            showNotification(data.error || t('buyerCheckIn_loadError'), 'error')
            onClose()
            return
          }
          setDetail(data.data)
        } catch {
          if (!cancelled) {
            showNotification(t('buyerCheckIn_networkError'), 'error')
            onClose()
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
      return () => {
        cancelled = true
      }
    }
    if (bookingId == null || bookingId === '') {
      return
    }
    reset()
    let cancelled = false
    ;(async () => {
      try {
        const base = await getApiBaseUrl()
        const uid = localStorage.getItem('userId')
        if (!uid || !/^\d+$/.test(uid)) {
          showNotification(t('buyerCheckIn_authRequired'), 'error')
          onClose()
          return
        }
        const res = await fetch(
          `${String(base).replace(/\/$/, '')}/test-drive-bookings/${bookingId}/detail?user_id=${uid}`,
        )
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.success) {
          showNotification(data.error || t('buyerCheckIn_loadError'), 'error')
          onClose()
          return
        }
        setDetail(data.data)
      } catch {
        if (!cancelled) {
          showNotification(t('buyerCheckIn_networkError'), 'error')
          onClose()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, bookingId, surveyToken, onClose, reset, t])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const canSubmit = useMemo(() => canSubmitForm(form), [form])

  const tryGoNext = () => {
    if (loading || !detail) return
    const reason = getStepBlockReason(activeStep, form)
    if (reason) {
      showNotification(t(reason.key, reason.params || {}), 'warning')
      return
    }
    setActiveStep((s) => Math.min(s + 1, STEP_COUNT - 1))
  }

  const goBack = () => {
    setActiveStep((s) => Math.max(s - 1, 0))
  }

  const buildReportPayload = () => {
    const trim = (s) => String(s || '').trim()
    return {
      survey_version: 2,
      first_impression: form.first_impression,
      first_impression_comment: trim(form.first_impression_comment),
      comfort: form.comfort,
      comfort_missing_comment:
        form.comfort === 'mostly_but_missing' ? trim(form.comfort_missing_comment) : '',
      comfort_photos: Array.isArray(form.comfort_photos) ? form.comfort_photos.filter(Boolean) : [],
      highlights: Array.isArray(form.highlights) ? [...form.highlights] : [],
      highlights_comment: trim(form.highlights_comment),
      price_impression: form.price_impression,
      price_improve_comment: trim(form.price_improve_comment),
      purchase_intent: form.purchase_intent,
      purchase_comment: trim(form.purchase_comment),
      submitted_at: new Date().toISOString(),
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    const uid = localStorage.getItem('userId')
    if (!surveyToken && (!uid || !/^\d+$/.test(uid))) return
    setSaving(true)
    try {
      const base = await getApiBaseUrl()
      const reportPayload = buildReportPayload()
      let res
      if (surveyToken) {
        res = await fetch(
          `${String(base).replace(/\/$/, '')}/test-drive-survey/${encodeURIComponent(String(surveyToken))}/report`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              report: reportPayload,
            }),
          },
        )
      } else {
        res = await fetch(
          `${String(base).replace(/\/$/, '')}/test-drive-bookings/${bookingId}/check-in-report`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: parseInt(uid, 10),
              report: reportPayload,
            }),
          },
        )
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        showNotification(data.error || t('buyerCheckIn_saveError'), 'error')
        return
      }
      showNotification(t('tdSurvey_successToast'), 'success')
      onSuccess?.()
      onClose()
    } catch {
      showNotification(t('buyerCheckIn_networkError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null
  if (!surveyToken && (bookingId == null || bookingId === '')) return null

  const navKeys = [
    'tdSurvey_nav1',
    'tdSurvey_nav2',
    'tdSurvey_nav3',
    'tdSurvey_nav4',
    'tdSurvey_nav5',
    'tdSurvey_nav6',
  ]

  const progressPct = ((activeStep + 1) / STEP_COUNT) * 100

  const labelFirstImpression = (v) => {
    const m = { better: 'tdSurvey_s1_opt_better', as_photos: 'tdSurvey_s1_opt_ok', slightly_off: 'tdSurvey_s1_opt_off' }
    return v ? t(m[v] || '') : '—'
  }
  const labelComfort = (v) => {
    const m = { great: 'tdSurvey_s2_opt_great', mostly_but_missing: 'tdSurvey_s2_opt_partial' }
    return v ? t(m[v] || '') : '—'
  }
  const labelHighlight = (k) => t(`tdSurvey_s3_opt_${k}`, { defaultValue: k })
  const highlightsSummary = () =>
    (form.highlights || []).map((k) => labelHighlight(k)).filter(Boolean).join(', ') || '—'
  const labelPrice = (v) => {
    const m = {
      great_value: 'tdSurvey_s4_opt_value',
      fair: 'tdSurvey_s4_opt_fair',
      expensive: 'tdSurvey_s4_opt_expensive',
    }
    return v ? t(m[v] || '') : '—'
  }
  const labelPurchase = (v) => {
    const m = {
      definitely_yes: 'tdSurvey_s5_opt_love',
      rather_yes: 'tdSurvey_s5_opt_yes',
      rather_no: 'tdSurvey_s5_opt_no',
    }
    return v ? t(m[v] || '') : '—'
  }

  const renderStepContent = () => {
    if (loading || !detail) {
      return <div className="td-checkin-modal__state">{t('buyerCheckIn_loading')}</div>
    }

    if (activeStep === 0) {
      const opts = [
        { value: 'better', key: 'tdSurvey_s1_opt_better' },
        { value: 'as_photos', key: 'tdSurvey_s1_opt_ok' },
        { value: 'slightly_off', key: 'tdSurvey_s1_opt_off' },
      ]
      return (
        <div className="td-checkin-modal__section">
          <p className="td-checkin-modal__step-eyebrow">{t('tdSurvey_s1_badge')}</p>
          <h3>{t('tdSurvey_s1_title')}</h3>
          <p className="td-checkin-modal__hint-text">{t('tdSurvey_s1_intro')}</p>
          <div className="td-checkin-modal__options td-checkin-modal__options--radio td-checkin-modal__options--stack">
            {opts.map(({ value, key }) => (
              <label
                key={value}
                className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.first_impression === value ? ' td-checkin-modal__opt--active' : ''}`}
              >
                <input
                  type="radio"
                  name="td_first_impression"
                  value={value}
                  checked={form.first_impression === value}
                  onChange={() => setForm((s) => ({ ...s, first_impression: value }))}
                />
                <span>{t(key)}</span>
              </label>
            ))}
          </div>
          <label className="td-checkin-modal__feedback-label" htmlFor="td-s1-comment">
            {t('tdSurvey_s1_comment_label')}
          </label>
          <textarea
            id="td-s1-comment"
            className="td-checkin-modal__textarea"
            value={form.first_impression_comment}
            onChange={(e) => setForm((s) => ({ ...s, first_impression_comment: e.target.value }))}
            placeholder={t('tdSurvey_s1_comment_ph')}
            rows={4}
          />
        </div>
      )
    }

    if (activeStep === 1) {
      const opts = [
        { value: 'great', key: 'tdSurvey_s2_opt_great' },
        { value: 'mostly_but_missing', key: 'tdSurvey_s2_opt_partial' },
      ]
      return (
        <div className="td-checkin-modal__section">
          <p className="td-checkin-modal__step-eyebrow">{t('tdSurvey_s2_badge')}</p>
          <h3>{t('tdSurvey_s2_title')}</h3>
          <p className="td-checkin-modal__hint-text">{t('tdSurvey_s2_intro')}</p>
          <div className="td-checkin-modal__options td-checkin-modal__options--radio td-checkin-modal__options--stack">
            {opts.map(({ value, key }) => (
              <label
                key={value}
                className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.comfort === value ? ' td-checkin-modal__opt--active' : ''}`}
              >
                <input
                  type="radio"
                  name="td_comfort"
                  value={value}
                  checked={form.comfort === value}
                  onChange={() => setForm((s) => ({ ...s, comfort: value }))}
                />
                <span>{t(key)}</span>
              </label>
            ))}
          </div>
          {form.comfort === 'mostly_but_missing' ? (
            <>
              <label className="td-checkin-modal__feedback-label" htmlFor="td-comfort-miss">
                {t('tdSurvey_s2_missing_label')}
              </label>
              <textarea
                id="td-comfort-miss"
                className="td-checkin-modal__textarea"
                value={form.comfort_missing_comment}
                onChange={(e) => setForm((s) => ({ ...s, comfort_missing_comment: e.target.value }))}
                rows={4}
              />
              <p className="td-checkin-modal__hint-text td-checkin-modal__hint-text--muted">{t('tdSurvey_s2_photos_note')}</p>
              <label className="td-checkin-modal__upload">
                <FiUpload size={16} aria-hidden />
                {t('buyerCheckIn_uploadPhotos')}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const urls = await toDataUrls(Array.from(e.target.files || []))
                    setForm((s) => ({ ...s, comfort_photos: urls }))
                  }}
                />
              </label>
            </>
          ) : null}
        </div>
      )
    }

    if (activeStep === 2) {
      return (
        <div className="td-checkin-modal__section">
          <p className="td-checkin-modal__step-eyebrow">{t('tdSurvey_s3_badge')}</p>
          <h3>{t('tdSurvey_s3_title')}</h3>
          <p className="td-checkin-modal__hint-text td-checkin-modal__hint-text--muted">{t('tdSurvey_s3_hint')}</p>
          <div className="td-checkin-modal__options td-checkin-modal__options--radio td-checkin-modal__options--stack">
            {HIGHLIGHT_KEYS.map((key) => {
              const on = form.highlights.includes(key)
              return (
                <label
                  key={key}
                  className={`td-checkin-modal__opt td-checkin-modal__opt--radio${on ? ' td-checkin-modal__opt--active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setForm((s) => ({ ...s, highlights: toggleHighlight(s.highlights, key) }))}
                  />
                  <span>{t(`tdSurvey_s3_opt_${key}`)}</span>
                </label>
              )
            })}
          </div>
          <label className="td-checkin-modal__feedback-label" htmlFor="td-hl-comment">
            {t('tdSurvey_s3_comment_label')}
          </label>
          <textarea
            id="td-hl-comment"
            className="td-checkin-modal__textarea"
            value={form.highlights_comment}
            onChange={(e) => setForm((s) => ({ ...s, highlights_comment: e.target.value }))}
            placeholder={t('tdSurvey_s3_comment_ph')}
            rows={4}
          />
        </div>
      )
    }

    if (activeStep === 3) {
      const opts = [
        { value: 'great_value', key: 'tdSurvey_s4_opt_value' },
        { value: 'fair', key: 'tdSurvey_s4_opt_fair' },
        { value: 'expensive', key: 'tdSurvey_s4_opt_expensive' },
      ]
      return (
        <div className="td-checkin-modal__section">
          <p className="td-checkin-modal__step-eyebrow">{t('tdSurvey_s4_badge')}</p>
          <h3>{t('tdSurvey_s4_title')}</h3>
          <p className="td-checkin-modal__hint-text">{t('tdSurvey_s4_intro')}</p>
          <div className="td-checkin-modal__options td-checkin-modal__options--radio td-checkin-modal__options--stack">
            {opts.map(({ value, key }) => (
              <label
                key={value}
                className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.price_impression === value ? ' td-checkin-modal__opt--active' : ''}`}
              >
                <input
                  type="radio"
                  name="td_price_impression"
                  value={value}
                  checked={form.price_impression === value}
                  onChange={() => setForm((s) => ({ ...s, price_impression: value }))}
                />
                <span>{t(key)}</span>
              </label>
            ))}
          </div>
          <label className="td-checkin-modal__feedback-label" htmlFor="td-price-comm">
            {t('tdSurvey_s4_comment_label')}
          </label>
          <textarea
            id="td-price-comm"
            className="td-checkin-modal__textarea"
            value={form.price_improve_comment}
            onChange={(e) => setForm((s) => ({ ...s, price_improve_comment: e.target.value }))}
            placeholder={t('tdSurvey_s4_comment_ph')}
            rows={4}
          />
        </div>
      )
    }

    if (activeStep === 4) {
      const opts = [
        { value: 'definitely_yes', key: 'tdSurvey_s5_opt_love' },
        { value: 'rather_yes', key: 'tdSurvey_s5_opt_yes' },
        { value: 'rather_no', key: 'tdSurvey_s5_opt_no' },
      ]
      return (
        <div className="td-checkin-modal__section">
          <p className="td-checkin-modal__step-eyebrow">{t('tdSurvey_s5_badge')}</p>
          <h3>{t('tdSurvey_s5_title')}</h3>
          <div className="td-checkin-modal__options td-checkin-modal__options--radio td-checkin-modal__options--stack">
            {opts.map(({ value, key }) => (
              <label
                key={value}
                className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.purchase_intent === value ? ' td-checkin-modal__opt--active' : ''}`}
              >
                <input
                  type="radio"
                  name="td_purchase_intent"
                  value={value}
                  checked={form.purchase_intent === value}
                  onChange={() => setForm((s) => ({ ...s, purchase_intent: value }))}
                />
                <span>{t(key)}</span>
              </label>
            ))}
          </div>
          <label className="td-checkin-modal__feedback-label" htmlFor="td-purchase-comm">
            {t('tdSurvey_s5_final_comment_label')}
          </label>
          <textarea
            id="td-purchase-comm"
            className="td-checkin-modal__textarea"
            value={form.purchase_comment}
            onChange={(e) => setForm((s) => ({ ...s, purchase_comment: e.target.value }))}
            rows={4}
          />
        </div>
      )
    }

    return (
      <div className="td-checkin-modal__section">
        <h3>{t('tdSurvey_s6_title')}</h3>
        <p className="td-checkin-modal__hint-text">{t('tdSurvey_s6_intro')}</p>
        <div className="td-checkin-modal__review">
          <div>
            <strong>{t('tdSurvey_s1_title')}</strong>
            <div style={{ marginTop: 6 }}>{labelFirstImpression(form.first_impression)}</div>
            {form.first_impression_comment.trim() ? (
              <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{form.first_impression_comment}</div>
            ) : null}
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>{t('tdSurvey_s2_title')}</strong>
            <div style={{ marginTop: 6 }}>{labelComfort(form.comfort)}</div>
            {form.comfort === 'mostly_but_missing' && form.comfort_missing_comment.trim() ? (
              <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{form.comfort_missing_comment}</div>
            ) : null}
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>{t('tdSurvey_s3_title')}</strong>
            <div style={{ marginTop: 6 }}>{highlightsSummary()}</div>
            {form.highlights_comment.trim() ? (
              <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{form.highlights_comment}</div>
            ) : null}
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>{t('tdSurvey_s4_title')}</strong>
            <div style={{ marginTop: 6 }}>{labelPrice(form.price_impression)}</div>
            {form.price_improve_comment.trim() ? (
              <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{form.price_improve_comment}</div>
            ) : null}
          </div>
          <div style={{ marginTop: 12 }}>
            <strong>{t('tdSurvey_s5_title')}</strong>
            <div style={{ marginTop: 6 }}>{labelPurchase(form.purchase_intent)}</div>
            {form.purchase_comment.trim() ? (
              <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{form.purchase_comment}</div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="td-checkin-modal__btn td-checkin-modal__btn--primary"
          disabled={!canSubmit || saving}
          onClick={() => void handleSubmit()}
        >
          <FiCheckCircle size={18} aria-hidden />
          {saving ? t('tdSurvey_submitting') : t('tdSurvey_submit')}
        </button>
      </div>
    )
  }

  const { booking, property } = detail || { booking: null, property: null }
  const titleText = property?.title || t('tdSurvey_title_fallback')
  const rangeText =
    booking && property
      ? t('buyerCheckIn_bookingRange', { start: booking.start_date, end: booking.end_date })
      : ''

  return (
    <div
      className="td-checkin-modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="td-checkin-modal" role="dialog" aria-modal="true" aria-labelledby="td-checkin-modal-title">
        <div className="td-checkin-modal__top">
          <div className="td-checkin-modal__title-block">
            <h2 id="td-checkin-modal-title">{t('tdSurvey_title')}</h2>
            {!loading && detail ? (
              <>
                {detail.buyer?.first_name ? (
                  <p className="td-checkin-modal__welcome">
                    {t('buyerCheckIn_hello', { name: detail.buyer.first_name })}
                  </p>
                ) : null}
                <p>
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
              <p>{t('buyerCheckIn_loading')}</p>
            )}
          </div>
          <button type="button" className="td-checkin-modal__close" onClick={onClose} aria-label={t('buyerCheckIn_close')}>
            <FiX size={22} aria-hidden />
          </button>
        </div>

        <div className="td-checkin-modal__mobile-progress" aria-hidden={false}>
          <div className="td-checkin-modal__mobile-progress-label">
            <span>{t('tdSurvey_stepProgress', { current: activeStep + 1, total: STEP_COUNT })}</span>
            <span>{navKeys[activeStep] ? t(navKeys[activeStep]) : ''}</span>
          </div>
          <div className="td-checkin-modal__mobile-bar">
            <div className="td-checkin-modal__mobile-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="td-checkin-modal__body">
          <nav className="td-checkin-modal__rail" aria-label={t('tdSurvey_stepsAria')}>
            {navKeys.map((key, idx) => {
              const done = idx < activeStep && isStepValid(idx, form)
              const active = idx === activeStep
              const canClick = canNavigateToStep(idx, form)
              return (
                <button
                  key={key}
                  type="button"
                  className={`td-checkin-modal__rail-item${active ? ' td-checkin-modal__rail-item--active' : ''}${done ? ' td-checkin-modal__rail-item--done' : ''}`}
                  disabled={!canClick}
                  onClick={() => {
                    if (canClick) setActiveStep(idx)
                  }}
                >
                  <span className="td-checkin-modal__rail-num">{idx + 1}</span>
                  <span>{t(key)}</span>
                </button>
              )
            })}
          </nav>
          <div className="td-checkin-modal__content">{renderStepContent()}</div>
        </div>

        <div className="td-checkin-modal__footer">
          <button type="button" className="td-checkin-modal__btn" onClick={activeStep === 0 ? onClose : goBack}>
            {activeStep === 0 ? (
              <>
                <FiX size={16} aria-hidden />
                {t('buyerCheckIn_close')}
              </>
            ) : (
              <>
                <FiArrowLeft size={16} aria-hidden />
                {t('buyerCheckIn_back')}
              </>
            )}
          </button>
          {activeStep < STEP_COUNT - 1 ? (
            <button
              type="button"
              className="td-checkin-modal__btn td-checkin-modal__btn--primary"
              disabled={loading || !detail}
              onClick={tryGoNext}
            >
              {t('buyerCheckIn_next')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
