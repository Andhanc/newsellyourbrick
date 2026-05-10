import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiCheck, FiCheckCircle, FiUpload, FiX } from 'react-icons/fi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { showNotification } from '../utils/toastHelper'
import './TestDriveCheckInModal.css'

const STEP_COUNT = 5

/** Минимальная длина отзыва об объекте на шаге 1 (символов без пробелов по краям). */
const MIN_PROPERTY_FEEDBACK_LEN = 15

const initialForm = () => ({
  /** exceeded | matched | partially | below — насколько объект совпал с ожиданиями покупателя */
  property_expectations: '',
  /** Свободный отзыв именно об объекте (планировка, состояние, соответствие описанию) */
  property_feedback: '',
  amenities_ok: '',
  amenities_comment: '',
  amenities_photos: [],
  defects_state: '',
  defects_comment: '',
  defects_photos: [],
  /** yes | no — приемлема ли цена за этот объект */
  price_acceptable: '',
  price_acceptable_comment: '',
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

/** @returns {{ key: string, params?: Record<string, unknown> } | null} */
function getStepBlockReason(step, form) {
  switch (step) {
    case 0: {
      if (!form.property_expectations) return { key: 'buyerCheckIn_step0_pickRating' }
      const len = String(form.property_feedback || '').trim().length
      if (len < MIN_PROPERTY_FEEDBACK_LEN)
        return {
          key: 'buyerCheckIn_step0_feedbackMin',
          params: { min: MIN_PROPERTY_FEEDBACK_LEN, current: len },
        }
      return null
    }
    case 1:
      if (!form.amenities_ok) return { key: 'buyerCheckIn_step1_pick' }
      if (
        form.amenities_ok === 'no' &&
        (!String(form.amenities_comment || '').trim() || !form.amenities_photos?.length)
      )
        return { key: 'buyerCheckIn_step1_noDetails' }
      return null
    case 2:
      if (!form.defects_state) return { key: 'buyerCheckIn_step2_pick' }
      if (
        form.defects_state === 'issues' &&
        (!String(form.defects_comment || '').trim() || !form.defects_photos?.length)
      )
        return { key: 'buyerCheckIn_step2_issuesDetails' }
      return null
    case 3:
      if (!form.price_acceptable) return { key: 'buyerCheckIn_step3_pick' }
      if (form.price_acceptable === 'no' && !String(form.price_acceptable_comment || '').trim())
        return { key: 'buyerCheckIn_step3_noComment' }
      return null
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
  for (let j = 0; j < 4; j += 1) {
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

  const handleSubmit = async () => {
    if (!canSubmit) return
    const uid = localStorage.getItem('userId')
    if (!surveyToken && (!uid || !/^\d+$/.test(uid))) return
    setSaving(true)
    try {
      const base = await getApiBaseUrl()
      const reportPayload = {
        ...form,
        submitted_at: new Date().toISOString(),
      }
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
      showNotification(t('buyerCheckIn_success'), 'success')
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
    'buyerCheckIn_step1Nav',
    'buyerCheckIn_step2Nav',
    'buyerCheckIn_step3Nav',
    'buyerCheckIn_step4Nav',
    'buyerCheckIn_step5Nav',
  ]

  const progressPct = ((activeStep + 1) / STEP_COUNT) * 100

  const renderStepContent = () => {
    if (loading || !detail) {
      return <div className="td-checkin-modal__state">{t('buyerCheckIn_loading')}</div>
    }
    const { property } = detail

    if (activeStep === 0) {
      const expOpts = [
        { value: 'exceeded', key: 'buyerCheckIn_property_exceeded' },
        { value: 'matched', key: 'buyerCheckIn_property_matched' },
        { value: 'partially', key: 'buyerCheckIn_property_partially' },
        { value: 'below', key: 'buyerCheckIn_property_below' },
      ]
      return (
        <div className="td-checkin-modal__section">
          <h3>{t('buyerCheckIn_q_property_title')}</h3>
          <p className="td-checkin-modal__hint-text">{t('buyerCheckIn_q_property_intro')}</p>
          <div className="td-checkin-modal__options td-checkin-modal__options--radio td-checkin-modal__options--stack">
            {expOpts.map(({ value, key }) => (
              <label
                key={value}
                className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.property_expectations === value ? ' td-checkin-modal__opt--active' : ''}`}
              >
                <input
                  type="radio"
                  name="td_property_expectations"
                  value={value}
                  checked={form.property_expectations === value}
                  onChange={() => setForm((s) => ({ ...s, property_expectations: value }))}
                />
                <span>{t(key)}</span>
              </label>
            ))}
          </div>
          <label className="td-checkin-modal__feedback-label" htmlFor="td-property-feedback">
            {t('buyerCheckIn_property_feedback_label')}
          </label>
          <textarea
            id="td-property-feedback"
            className="td-checkin-modal__textarea"
            value={form.property_feedback}
            onChange={(e) => setForm((s) => ({ ...s, property_feedback: e.target.value }))}
            placeholder={t('buyerCheckIn_property_feedback_ph')}
            rows={5}
          />
          <p className="td-checkin-modal__hint-text td-checkin-modal__hint-text--muted">
            {t('buyerCheckIn_property_feedback_hint', { min: MIN_PROPERTY_FEEDBACK_LEN })}
          </p>
        </div>
      )
    }

    if (activeStep === 1) {
      return (
        <div className="td-checkin-modal__section">
          <h3>{t('buyerCheckIn_q_amenities_title')}</h3>
          <div className="td-checkin-modal__amenities-block">
            <p className="td-checkin-modal__amenities-label">{t('buyerCheckIn_amenitiesListLabel')}</p>
            {(property.amenities || []).length > 0 ? (
              <ul className="td-checkin-modal__amenities" role="list">
                {(property.amenities || []).map((a, idx) => (
                  <li key={`${idx}-${a}`} className="td-checkin-modal__amenity-chip">
                    <span className="td-checkin-modal__amenity-icon" aria-hidden>
                      <FiCheck size={12} strokeWidth={3} />
                    </span>
                    <span className="td-checkin-modal__amenity-text">{a}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="td-checkin-modal__amenities-empty">{t('buyerCheckIn_amenitiesEmpty')}</p>
            )}
          </div>
          <div className="td-checkin-modal__options td-checkin-modal__options--radio">
            <label
              className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.amenities_ok === 'yes' ? ' td-checkin-modal__opt--active' : ''}`}
            >
              <input
                type="radio"
                name="td_amenities_ok"
                value="yes"
                checked={form.amenities_ok === 'yes'}
                onChange={() => setForm((s) => ({ ...s, amenities_ok: 'yes' }))}
              />
              <span>{t('buyerCheckIn_yes')}</span>
            </label>
            <label
              className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.amenities_ok === 'no' ? ' td-checkin-modal__opt--active' : ''}`}
            >
              <input
                type="radio"
                name="td_amenities_ok"
                value="no"
                checked={form.amenities_ok === 'no'}
                onChange={() => setForm((s) => ({ ...s, amenities_ok: 'no' }))}
              />
              <span>{t('buyerCheckIn_no')}</span>
            </label>
          </div>
          {form.amenities_ok === 'no' ? (
            <>
              <textarea
                className="td-checkin-modal__textarea"
                value={form.amenities_comment}
                onChange={(e) => setForm((s) => ({ ...s, amenities_comment: e.target.value }))}
                placeholder={t('buyerCheckIn_amenitiesCommentPh')}
              />
              <label className="td-checkin-modal__upload">
                <FiUpload size={16} aria-hidden />
                {t('buyerCheckIn_uploadPhotos')}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const urls = await toDataUrls(Array.from(e.target.files || []))
                    setForm((s) => ({ ...s, amenities_photos: urls }))
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
          <h3>{t('buyerCheckIn_q_defects_title')}</h3>
          <div className="td-checkin-modal__options td-checkin-modal__options--radio">
            <label
              className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.defects_state === 'ok' ? ' td-checkin-modal__opt--active' : ''}`}
            >
              <input
                type="radio"
                name="td_defects_state"
                value="ok"
                checked={form.defects_state === 'ok'}
                onChange={() => setForm((s) => ({ ...s, defects_state: 'ok' }))}
              />
              <span>{t('buyerCheckIn_defects_ok')}</span>
            </label>
            <label
              className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.defects_state === 'issues' ? ' td-checkin-modal__opt--active' : ''}`}
            >
              <input
                type="radio"
                name="td_defects_state"
                value="issues"
                checked={form.defects_state === 'issues'}
                onChange={() => setForm((s) => ({ ...s, defects_state: 'issues' }))}
              />
              <span>{t('buyerCheckIn_defects_issues')}</span>
            </label>
          </div>
          {form.defects_state === 'issues' ? (
            <>
              <textarea
                className="td-checkin-modal__textarea"
                value={form.defects_comment}
                onChange={(e) => setForm((s) => ({ ...s, defects_comment: e.target.value }))}
                placeholder={t('buyerCheckIn_defectsCommentPh')}
              />
              <label className="td-checkin-modal__upload">
                <FiUpload size={16} aria-hidden />
                {t('buyerCheckIn_uploadPhotos')}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const urls = await toDataUrls(Array.from(e.target.files || []))
                    setForm((s) => ({ ...s, defects_photos: urls }))
                  }}
                />
              </label>
            </>
          ) : null}
        </div>
      )
    }

    if (activeStep === 3) {
      return (
        <div className="td-checkin-modal__section">
          <h3>{t('buyerCheckIn_q_price_title')}</h3>
          <p className="td-checkin-modal__hint-text">{t('buyerCheckIn_q_price_intro')}</p>
          <div className="td-checkin-modal__options td-checkin-modal__options--radio">
            <label
              className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.price_acceptable === 'yes' ? ' td-checkin-modal__opt--active' : ''}`}
            >
              <input
                type="radio"
                name="td_price_acceptable"
                value="yes"
                checked={form.price_acceptable === 'yes'}
                onChange={() => setForm((s) => ({ ...s, price_acceptable: 'yes' }))}
              />
              <span>{t('buyerCheckIn_price_yes')}</span>
            </label>
            <label
              className={`td-checkin-modal__opt td-checkin-modal__opt--radio${form.price_acceptable === 'no' ? ' td-checkin-modal__opt--active' : ''}`}
            >
              <input
                type="radio"
                name="td_price_acceptable"
                value="no"
                checked={form.price_acceptable === 'no'}
                onChange={() => setForm((s) => ({ ...s, price_acceptable: 'no' }))}
              />
              <span>{t('buyerCheckIn_price_no')}</span>
            </label>
          </div>
          {form.price_acceptable === 'no' ? (
            <textarea
              className="td-checkin-modal__textarea"
              value={form.price_acceptable_comment}
              onChange={(e) => setForm((s) => ({ ...s, price_acceptable_comment: e.target.value }))}
              placeholder={t('buyerCheckIn_price_comment_ph')}
            />
          ) : null}
        </div>
      )
    }

    return (
      <div className="td-checkin-modal__section">
        <h3>{t('buyerCheckIn_reviewTitle')}</h3>
        <div className="td-checkin-modal__review">
          <div>
            <strong>{t('buyerCheckIn_q_property_title')}</strong>
            <div style={{ marginTop: 6 }}>
              {form.property_expectations
                ? t(`buyerCheckIn_property_${form.property_expectations}`)
                : '—'}
            </div>
            {form.property_feedback ? (
              <div style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{form.property_feedback}</div>
            ) : null}
          </div>
          <div style={{ marginTop: 10 }}>
            <strong>{t('buyerCheckIn_q_amenities_title')}</strong>: {form.amenities_ok || '—'}
          </div>
          <div style={{ marginTop: 10 }}>
            <strong>{t('buyerCheckIn_q_defects_title')}</strong>: {form.defects_state || '—'}
          </div>
          <div style={{ marginTop: 10 }}>
            <strong>{t('buyerCheckIn_q_price_title')}</strong>:{' '}
            {form.price_acceptable === 'yes'
              ? t('buyerCheckIn_price_yes')
              : form.price_acceptable === 'no'
                ? t('buyerCheckIn_price_no')
                : '—'}
            {form.price_acceptable === 'no' && form.price_acceptable_comment ? (
              <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{form.price_acceptable_comment}</div>
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
          {saving ? t('buyerCheckIn_submitting') : t('buyerCheckIn_submit')}
        </button>
      </div>
    )
  }

  const { booking, property } = detail || { booking: null, property: null }
  const titleText = property?.title || t('buyerCheckIn_title')
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
            <h2 id="td-checkin-modal-title">{t('buyerCheckIn_title')}</h2>
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
            <span>{t('buyerCheckIn_stepProgress', { current: activeStep + 1, total: STEP_COUNT })}</span>
            <span>{navKeys[activeStep] ? t(navKeys[activeStep]) : ''}</span>
          </div>
          <div className="td-checkin-modal__mobile-bar">
            <div className="td-checkin-modal__mobile-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="td-checkin-modal__body">
          <nav className="td-checkin-modal__rail" aria-label={t('buyerCheckIn_stepsAria')}>
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
