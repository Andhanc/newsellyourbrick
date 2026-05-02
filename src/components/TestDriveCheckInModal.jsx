import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiCheck, FiCheckCircle, FiUpload, FiX } from 'react-icons/fi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { showNotification } from '../utils/toastHelper'
import './TestDriveCheckInModal.css'

const STEP_COUNT = 5

const initialForm = () => ({
  entered_object: '',
  entered_object_comment: '',
  amenities_ok: '',
  amenities_comment: '',
  amenities_photos: [],
  defects_state: '',
  defects_comment: '',
  defects_photos: [],
  ready_to_stay: '',
  ready_to_stay_comment: '',
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

function isStepValid(step, form) {
  switch (step) {
    case 0:
      if (!form.entered_object) return false
      if (form.entered_object === 'no' && !String(form.entered_object_comment || '').trim()) return false
      return true
    case 1:
      if (!form.amenities_ok) return false
      if (
        form.amenities_ok === 'no' &&
        (!String(form.amenities_comment || '').trim() || !form.amenities_photos?.length)
      )
        return false
      return true
    case 2:
      if (!form.defects_state) return false
      if (
        form.defects_state === 'issues' &&
        (!String(form.defects_comment || '').trim() || !form.defects_photos?.length)
      )
        return false
      return true
    case 3:
      if (!form.ready_to_stay) return false
      if (form.ready_to_stay === 'no' && !String(form.ready_to_stay_comment || '').trim()) return false
      return true
    default:
      return true
  }
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
 * @param {{ open: boolean, bookingId: string | number | null, onClose: () => void, onSuccess?: () => void }} props
 */
export default function TestDriveCheckInModal({ open, bookingId, onClose, onSuccess }) {
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
    if (!open || bookingId == null || bookingId === '') {
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
  }, [open, bookingId, onClose, reset, t])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const canSubmit = useMemo(() => canSubmitForm(form), [form])

  const goNext = () => {
    if (!isStepValid(activeStep, form)) return
    setActiveStep((s) => Math.min(s + 1, STEP_COUNT - 1))
  }

  const goBack = () => {
    setActiveStep((s) => Math.max(s - 1, 0))
  }

  const handleSubmit = async () => {
    if (!canSubmit || !bookingId) return
    const uid = localStorage.getItem('userId')
    if (!uid || !/^\d+$/.test(uid)) return
    setSaving(true)
    try {
      const base = await getApiBaseUrl()
      const res = await fetch(
        `${String(base).replace(/\/$/, '')}/test-drive-bookings/${bookingId}/check-in-report`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: parseInt(uid, 10),
            report: {
              ...form,
              submitted_at: new Date().toISOString(),
            },
          }),
        },
      )
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

  if (!open || bookingId == null || bookingId === '') return null

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
      return (
        <div className="td-checkin-modal__section">
          <h3>{t('buyerCheckIn_q_enter_title')}</h3>
          <div className="td-checkin-modal__options">
            <button
              type="button"
              className={`td-checkin-modal__opt${form.entered_object === 'yes' ? ' td-checkin-modal__opt--active' : ''}`}
              onClick={() => setForm((s) => ({ ...s, entered_object: 'yes' }))}
            >
              {t('buyerCheckIn_yes')}
            </button>
            <button
              type="button"
              className={`td-checkin-modal__opt${form.entered_object === 'no' ? ' td-checkin-modal__opt--active' : ''}`}
              onClick={() => setForm((s) => ({ ...s, entered_object: 'no' }))}
            >
              {t('buyerCheckIn_no')}
            </button>
          </div>
          {form.entered_object === 'no' ? (
            <textarea
              className="td-checkin-modal__textarea"
              value={form.entered_object_comment}
              onChange={(e) => setForm((s) => ({ ...s, entered_object_comment: e.target.value }))}
              placeholder={t('buyerCheckIn_enterCommentPh')}
            />
          ) : null}
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
          <div className="td-checkin-modal__options">
            <button
              type="button"
              className={`td-checkin-modal__opt${form.amenities_ok === 'yes' ? ' td-checkin-modal__opt--active' : ''}`}
              onClick={() => setForm((s) => ({ ...s, amenities_ok: 'yes' }))}
            >
              {t('buyerCheckIn_yes')}
            </button>
            <button
              type="button"
              className={`td-checkin-modal__opt${form.amenities_ok === 'no' ? ' td-checkin-modal__opt--active' : ''}`}
              onClick={() => setForm((s) => ({ ...s, amenities_ok: 'no' }))}
            >
              {t('buyerCheckIn_no')}
            </button>
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
          <div className="td-checkin-modal__options">
            <button
              type="button"
              className={`td-checkin-modal__opt${form.defects_state === 'ok' ? ' td-checkin-modal__opt--active' : ''}`}
              onClick={() => setForm((s) => ({ ...s, defects_state: 'ok' }))}
            >
              {t('buyerCheckIn_defects_ok')}
            </button>
            <button
              type="button"
              className={`td-checkin-modal__opt${form.defects_state === 'issues' ? ' td-checkin-modal__opt--active' : ''}`}
              onClick={() => setForm((s) => ({ ...s, defects_state: 'issues' }))}
            >
              {t('buyerCheckIn_defects_issues')}
            </button>
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
          <h3>{t('buyerCheckIn_q_ready_title')}</h3>
          <div className="td-checkin-modal__options">
            <button
              type="button"
              className={`td-checkin-modal__opt${form.ready_to_stay === 'yes' ? ' td-checkin-modal__opt--active' : ''}`}
              onClick={() => setForm((s) => ({ ...s, ready_to_stay: 'yes' }))}
            >
              {t('buyerCheckIn_yes')}
            </button>
            <button
              type="button"
              className={`td-checkin-modal__opt${form.ready_to_stay === 'no' ? ' td-checkin-modal__opt--active' : ''}`}
              onClick={() => setForm((s) => ({ ...s, ready_to_stay: 'no' }))}
            >
              {t('buyerCheckIn_no')}
            </button>
          </div>
          {form.ready_to_stay === 'no' ? (
            <textarea
              className="td-checkin-modal__textarea"
              value={form.ready_to_stay_comment}
              onChange={(e) => setForm((s) => ({ ...s, ready_to_stay_comment: e.target.value }))}
              placeholder={t('buyerCheckIn_readyCommentPh')}
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
            <strong>{t('buyerCheckIn_q_enter_title')}</strong>: {form.entered_object || '—'}
            {form.entered_object === 'no' && form.entered_object_comment ? (
              <div style={{ marginTop: 6 }}>{form.entered_object_comment}</div>
            ) : null}
          </div>
          <div style={{ marginTop: 10 }}>
            <strong>{t('buyerCheckIn_q_amenities_title')}</strong>: {form.amenities_ok || '—'}
          </div>
          <div style={{ marginTop: 10 }}>
            <strong>{t('buyerCheckIn_q_defects_title')}</strong>: {form.defects_state || '—'}
          </div>
          <div style={{ marginTop: 10 }}>
            <strong>{t('buyerCheckIn_q_ready_title')}</strong>: {form.ready_to_stay || '—'}
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
              <p>
                <strong>{titleText}</strong>
                {rangeText ? (
                  <>
                    <br />
                    {rangeText}
                  </>
                ) : null}
              </p>
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
              disabled={!isStepValid(activeStep, form)}
              onClick={goNext}
            >
              {t('buyerCheckIn_next')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
