import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowLeft, FiArrowRight, FiCheck, FiUpload } from 'react-icons/fi'
import { getApiBaseUrl } from '../utils/apiConfig'
import { showNotification } from '../utils/toastHelper'
import BuyerCelebrationModal from '../components/BuyerCelebrationModal'
import {
  SURVEY_HIGHLIGHT_KEYS,
  SURVEY_NAV_KEYS,
  SURVEY_STEP_COUNT,
  buildSurveyReportPayload,
  canNavigateSurveyStep,
  canSubmitSurveyForm,
  createEmptySurveyForm,
  filesToDataUrls,
  getSurveyStepBlockReason,
  isSurveyStepValid,
  toggleSurveyHighlight,
} from '../utils/testDriveSurveyShared'
import './TestDriveSurveyPage.css'

function formatStayRange(start, end, locale) {
  if (!start || !end) return ''
  try {
    const fmt = new Intl.DateTimeFormat(locale || 'ru-RU', {
      day: 'numeric',
      month: 'long',
    })
    return `${fmt.format(new Date(`${start}T12:00:00`))} — ${fmt.format(new Date(`${end}T12:00:00`))}`
  } catch {
    return `${start} — ${end}`
  }
}

/**
 * Полноэкранный опрос после тест-драйва (ссылка из уведомлений / WhatsApp).
 */
export default function TestDriveSurveyPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(createEmptySurveyForm)
  const [activeStep, setActiveStep] = useState(0)
  const [celebrateOpen, setCelebrateOpen] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)

  const reset = useCallback(() => {
    setForm(createEmptySurveyForm())
    setActiveStep(0)
    setDetail(null)
    setLoadError('')
    setLoading(true)
    setSaving(false)
    setCelebrateOpen(false)
    setHoverRating(0)
  }, [])

  useEffect(() => {
    if (!token) {
      setLoadError(t('buyerCheckIn_loadError'))
      setLoading(false)
      return
    }
    reset()
    let cancelled = false
    ;(async () => {
      try {
        const base = await getApiBaseUrl()
        const res = await fetch(
          `${String(base).replace(/\/$/, '')}/test-drive-survey/${encodeURIComponent(String(token))}/detail`,
        )
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.success) {
          setLoadError(data.error || t('buyerCheckIn_loadError'))
          return
        }
        setDetail(data.data)
      } catch {
        if (!cancelled) setLoadError(t('buyerCheckIn_networkError'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, reset, t])

  useEffect(() => {
    const prev = document.title
    document.title = `${t('tdSurvey_title')} · SellYourBrick`
    return () => {
      document.title = prev
    }
  }, [t])

  const canSubmit = useMemo(() => canSubmitSurveyForm(form), [form])
  const progressPct = ((activeStep + 1) / SURVEY_STEP_COUNT) * 100

  const property = detail?.property
  const booking = detail?.booking
  const propertyTitle = property?.title || t('tdSurvey_title_fallback')
  const stayRange = formatStayRange(booking?.start_date, booking?.end_date, i18n.language)

  const tryGoNext = () => {
    if (loading || !detail) return
    const reason = getSurveyStepBlockReason(activeStep, form)
    if (reason) {
      showNotification(t(reason.key, reason.params || {}), 'warning')
      return
    }
    setActiveStep((s) => Math.min(s + 1, SURVEY_STEP_COUNT - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setActiveStep((s) => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!canSubmit || !token) return
    const reason = getSurveyStepBlockReason(5, form)
    if (reason) {
      showNotification(t(reason.key, reason.params || {}), 'warning')
      return
    }
    setSaving(true)
    try {
      const base = await getApiBaseUrl()
      const res = await fetch(
        `${String(base).replace(/\/$/, '')}/test-drive-survey/${encodeURIComponent(String(token))}/report`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report: buildSurveyReportPayload(form) }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        showNotification(data.error || t('buyerCheckIn_saveError'), 'error')
        return
      }
      setCelebrateOpen(true)
    } catch {
      showNotification(t('buyerCheckIn_networkError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const finishAfterCelebration = () => {
    setCelebrateOpen(false)
    navigate('/profile', { replace: true })
  }

  const labelFirstImpression = (v) => {
    const m = {
      better: 'tdSurvey_s1_opt_better',
      as_photos: 'tdSurvey_s1_opt_ok',
      slightly_off: 'tdSurvey_s1_opt_off',
    }
    return v ? t(m[v] || '') : '—'
  }
  const labelComfort = (v) => {
    const m = { great: 'tdSurvey_s2_opt_great', mostly_but_missing: 'tdSurvey_s2_opt_partial' }
    return v ? t(m[v] || '') : '—'
  }
  const highlightsSummary = () =>
    (form.highlights || [])
      .map((k) => t(`tdSurvey_s3_opt_${k}`, { defaultValue: k }))
      .filter(Boolean)
      .join(', ') || '—'
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

  const renderChoice = (name, value, current, onPick, label) => (
    <label
      key={value}
      className={`td-survey__choice${current === value ? ' td-survey__choice--active' : ''}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={current === value}
        onChange={() => onPick(value)}
      />
      <span className="td-survey__choice-mark" aria-hidden>
        {current === value ? <FiCheck size={14} strokeWidth={2.5} /> : null}
      </span>
      <span className="td-survey__choice-label">{label}</span>
    </label>
  )

  const renderStep = () => {
    if (activeStep === 0) {
      const opts = [
        { value: 'better', key: 'tdSurvey_s1_opt_better' },
        { value: 'as_photos', key: 'tdSurvey_s1_opt_ok' },
        { value: 'slightly_off', key: 'tdSurvey_s1_opt_off' },
      ]
      return (
        <>
          <h2 className="td-survey__question">{t('tdSurvey_s1_title')}</h2>
          <p className="td-survey__lead">{t('tdSurvey_s1_intro')}</p>
          <div className="td-survey__choices" role="radiogroup" aria-label={t('tdSurvey_s1_title')}>
            {opts.map(({ value, key }) =>
              renderChoice(
                'td_first_impression',
                value,
                form.first_impression,
                (v) => setForm((s) => ({ ...s, first_impression: v })),
                t(key),
              ),
            )}
          </div>
          <label className="td-survey__field-label" htmlFor="td-s1-comment">
            {t('tdSurvey_s1_comment_label')}
          </label>
          <textarea
            id="td-s1-comment"
            className="td-survey__textarea"
            value={form.first_impression_comment}
            onChange={(e) => setForm((s) => ({ ...s, first_impression_comment: e.target.value }))}
            placeholder={t('tdSurvey_s1_comment_ph')}
            rows={4}
          />
        </>
      )
    }

    if (activeStep === 1) {
      const opts = [
        { value: 'great', key: 'tdSurvey_s2_opt_great' },
        { value: 'mostly_but_missing', key: 'tdSurvey_s2_opt_partial' },
      ]
      return (
        <>
          <h2 className="td-survey__question">{t('tdSurvey_s2_title')}</h2>
          <p className="td-survey__lead">{t('tdSurvey_s2_intro')}</p>
          <div className="td-survey__choices" role="radiogroup" aria-label={t('tdSurvey_s2_title')}>
            {opts.map(({ value, key }) =>
              renderChoice(
                'td_comfort',
                value,
                form.comfort,
                (v) => setForm((s) => ({ ...s, comfort: v })),
                t(key),
              ),
            )}
          </div>
          {form.comfort === 'mostly_but_missing' ? (
            <div className="td-survey__followup">
              <label className="td-survey__field-label" htmlFor="td-comfort-miss">
                {t('tdSurvey_s2_missing_label')}
              </label>
              <textarea
                id="td-comfort-miss"
                className="td-survey__textarea"
                value={form.comfort_missing_comment}
                onChange={(e) => setForm((s) => ({ ...s, comfort_missing_comment: e.target.value }))}
                rows={4}
              />
              <p className="td-survey__hint">{t('tdSurvey_s2_photos_note')}</p>
              <label className="td-survey__upload">
                <FiUpload size={16} aria-hidden />
                <span>{t('buyerCheckIn_uploadPhotos')}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const urls = await filesToDataUrls(Array.from(e.target.files || []))
                    setForm((s) => ({ ...s, comfort_photos: urls }))
                  }}
                />
              </label>
              {form.comfort_photos?.length ? (
                <p className="td-survey__hint">
                  {t('tdSurvey_photosSelected', { count: form.comfort_photos.length })}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )
    }

    if (activeStep === 2) {
      return (
        <>
          <h2 className="td-survey__question">{t('tdSurvey_s3_title')}</h2>
          <p className="td-survey__lead">{t('tdSurvey_s3_hint')}</p>
          <div className="td-survey__choices" role="group" aria-label={t('tdSurvey_s3_title')}>
            {SURVEY_HIGHLIGHT_KEYS.map((key) => {
              const on = form.highlights.includes(key)
              return (
                <label key={key} className={`td-survey__choice${on ? ' td-survey__choice--active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setForm((s) => ({ ...s, highlights: toggleSurveyHighlight(s.highlights, key) }))
                    }
                  />
                  <span className="td-survey__choice-mark" aria-hidden>
                    {on ? <FiCheck size={14} strokeWidth={2.5} /> : null}
                  </span>
                  <span className="td-survey__choice-label">{t(`tdSurvey_s3_opt_${key}`)}</span>
                </label>
              )
            })}
          </div>
          <label className="td-survey__field-label" htmlFor="td-hl-comment">
            {t('tdSurvey_s3_comment_label')}
          </label>
          <textarea
            id="td-hl-comment"
            className="td-survey__textarea"
            value={form.highlights_comment}
            onChange={(e) => setForm((s) => ({ ...s, highlights_comment: e.target.value }))}
            placeholder={t('tdSurvey_s3_comment_ph')}
            rows={4}
          />
        </>
      )
    }

    if (activeStep === 3) {
      const opts = [
        { value: 'great_value', key: 'tdSurvey_s4_opt_value' },
        { value: 'fair', key: 'tdSurvey_s4_opt_fair' },
        { value: 'expensive', key: 'tdSurvey_s4_opt_expensive' },
      ]
      return (
        <>
          <h2 className="td-survey__question">{t('tdSurvey_s4_title')}</h2>
          <p className="td-survey__lead">{t('tdSurvey_s4_intro')}</p>
          <div className="td-survey__choices" role="radiogroup" aria-label={t('tdSurvey_s4_title')}>
            {opts.map(({ value, key }) =>
              renderChoice(
                'td_price_impression',
                value,
                form.price_impression,
                (v) => setForm((s) => ({ ...s, price_impression: v })),
                t(key),
              ),
            )}
          </div>
          <label className="td-survey__field-label" htmlFor="td-price-comm">
            {t('tdSurvey_s4_comment_label')}
          </label>
          <textarea
            id="td-price-comm"
            className="td-survey__textarea"
            value={form.price_improve_comment}
            onChange={(e) => setForm((s) => ({ ...s, price_improve_comment: e.target.value }))}
            placeholder={t('tdSurvey_s4_comment_ph')}
            rows={4}
          />
        </>
      )
    }

    if (activeStep === 4) {
      const opts = [
        { value: 'definitely_yes', key: 'tdSurvey_s5_opt_love' },
        { value: 'rather_yes', key: 'tdSurvey_s5_opt_yes' },
        { value: 'rather_no', key: 'tdSurvey_s5_opt_no' },
      ]
      return (
        <>
          <h2 className="td-survey__question">{t('tdSurvey_s5_title')}</h2>
          <p className="td-survey__lead">{t('tdSurvey_s5_intro')}</p>
          <div className="td-survey__choices" role="radiogroup" aria-label={t('tdSurvey_s5_title')}>
            {opts.map(({ value, key }) =>
              renderChoice(
                'td_purchase_intent',
                value,
                form.purchase_intent,
                (v) => setForm((s) => ({ ...s, purchase_intent: v })),
                t(key),
              ),
            )}
          </div>
          <label className="td-survey__field-label" htmlFor="td-purchase-comm">
            {t('tdSurvey_s5_final_comment_label')}
          </label>
          <textarea
            id="td-purchase-comm"
            className="td-survey__textarea"
            value={form.purchase_comment}
            onChange={(e) => setForm((s) => ({ ...s, purchase_comment: e.target.value }))}
            placeholder={t('tdSurvey_s5_comment_ph')}
            rows={4}
          />
        </>
      )
    }

    const ratingValue =
      typeof form.overall_rating === 'number' && Number.isFinite(form.overall_rating)
        ? form.overall_rating
        : 0
    const previewRating = hoverRating > 0 ? hoverRating : ratingValue

    return (
      <>
        <h2 className="td-survey__question">{t('tdSurvey_s6_title')}</h2>
        <p className="td-survey__lead">{t('tdSurvey_s6_intro')}</p>

        <div className="td-survey__summary" aria-label={t('tdSurvey_s6_summaryAria')}>
          <div className="td-survey__summary-row">
            <span>{t('tdSurvey_nav1')}</span>
            <strong>{labelFirstImpression(form.first_impression)}</strong>
          </div>
          <div className="td-survey__summary-row">
            <span>{t('tdSurvey_nav2')}</span>
            <strong>{labelComfort(form.comfort)}</strong>
          </div>
          <div className="td-survey__summary-row">
            <span>{t('tdSurvey_nav3')}</span>
            <strong>{highlightsSummary()}</strong>
          </div>
          <div className="td-survey__summary-row">
            <span>{t('tdSurvey_nav4')}</span>
            <strong>{labelPrice(form.price_impression)}</strong>
          </div>
          <div className="td-survey__summary-row">
            <span>{t('tdSurvey_nav5')}</span>
            <strong>{labelPurchase(form.purchase_intent)}</strong>
          </div>
        </div>

        <div className="td-survey__stars-block">
          <p className="td-survey__stars-label">{t('tdSurvey_s6_starsLabel')}</p>
          <div
            className="td-survey__stars"
            role="radiogroup"
            aria-label={t('tdSurvey_s6_starsLabel')}
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const active = n <= previewRating
              return (
                <button
                  key={n}
                  type="button"
                  className={`td-survey__star${active ? ' td-survey__star--on' : ''}`}
                  aria-checked={ratingValue === n}
                  aria-label={t('tdSurvey_s6_starAria', { n })}
                  role="radio"
                  onMouseEnter={() => setHoverRating(n)}
                  onFocus={() => setHoverRating(n)}
                  onBlur={() => setHoverRating(0)}
                  onClick={() => {
                    setHoverRating(0)
                    setForm((s) => ({ ...s, overall_rating: n }))
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                    <path d="M12 2.6l2.74 6.34 6.86.58-5.2 4.5 1.56 6.7L12 16.9l-5.96 3.82 1.56-6.7-5.2-4.5 6.86-.58L12 2.6z" />
                  </svg>
                </button>
              )
            })}
          </div>
          {ratingValue > 0 ? (
            <p className="td-survey__stars-value">{ratingValue} / 5</p>
          ) : null}
        </div>
      </>
    )
  }

  if (celebrateOpen) {
    return (
      <BuyerCelebrationModal
        open
        title={t('tdSurvey_celebrationTitle')}
        text={t('tdSurvey_celebrationText')}
        ctaLabel={t('tdSurvey_celebrationCta')}
        onCta={finishAfterCelebration}
        titleId="td-survey-celebration-title"
      />
    )
  }

  return (
    <div className="td-survey">
      <header className="td-survey__top">
        <div className="td-survey__top-inner">
          <div className="td-survey__brand">
            <span className="td-survey__brand-mark" aria-label="SellYourBrick">
              <span>Sell</span>
              <span className="td-survey__brand-accent">Your</span>
              <span>Brick</span>
            </span>
            <span className="td-survey__brand-sep" aria-hidden />
            <span className="td-survey__brand-sub">{t('tdSurvey_pageEyebrow')}</span>
          </div>
          <button
            type="button"
            className="td-survey__exit"
            onClick={() => navigate('/', { replace: true })}
          >
            {t('tdSurvey_exit')}
          </button>
        </div>
        <div className="td-survey__progress" aria-hidden>
          <div className="td-survey__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      <main className="td-survey__main">
        <aside className="td-survey__aside">
          <p className="td-survey__aside-kicker">{t('tdSurvey_asideKicker')}</p>
          <h1 className="td-survey__aside-title">{propertyTitle}</h1>
          {stayRange ? <p className="td-survey__aside-meta">{stayRange}</p> : null}

          <nav className="td-survey__steps" aria-label={t('tdSurvey_stepsAria')}>
            {SURVEY_NAV_KEYS.map((key, idx) => {
              const done = idx < activeStep && isSurveyStepValid(idx, form)
              const active = idx === activeStep
              const canClick = canNavigateSurveyStep(idx, form)
              return (
                <button
                  key={key}
                  type="button"
                  className={`td-survey__step${active ? ' td-survey__step--active' : ''}${done ? ' td-survey__step--done' : ''}`}
                  disabled={!canClick || loading}
                  onClick={() => {
                    if (canClick) {
                      setActiveStep(idx)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  }}
                >
                  <span className="td-survey__step-num">{done ? <FiCheck size={14} /> : idx + 1}</span>
                  <span>{t(key)}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        <section className="td-survey__panel" aria-label={t('tdSurvey_stepProgress', { current: activeStep + 1, total: SURVEY_STEP_COUNT })}>
          {loading ? (
            <div className="td-survey__state">{t('buyerCheckIn_loading')}</div>
          ) : loadError ? (
            <div className="td-survey__state td-survey__state--error">
              <p>{loadError}</p>
              <button type="button" className="td-survey__btn td-survey__btn--primary" onClick={() => navigate('/')}>
                {t('tdSurvey_exit')}
              </button>
            </div>
          ) : (
            <div className="td-survey__content">{renderStep()}</div>
          )}

          {!loading && !loadError ? (
            <div className="td-survey__footer">
              <button
                type="button"
                className="td-survey__btn"
                onClick={activeStep === 0 ? () => navigate('/', { replace: true }) : goBack}
              >
                <FiArrowLeft size={16} aria-hidden />
                {activeStep === 0 ? t('tdSurvey_exit') : t('buyerCheckIn_back')}
              </button>

              {activeStep < SURVEY_STEP_COUNT - 1 ? (
                <button type="button" className="td-survey__btn td-survey__btn--primary" onClick={tryGoNext}>
                  {t('buyerCheckIn_next')}
                  <FiArrowRight size={16} aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  className="td-survey__btn td-survey__btn--primary"
                  disabled={!canSubmit || saving}
                  onClick={() => void handleSubmit()}
                >
                  {saving ? t('tdSurvey_submitting') : t('tdSurvey_submit')}
                  {!saving ? <FiArrowRight size={16} aria-hidden /> : null}
                </button>
              )}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}
