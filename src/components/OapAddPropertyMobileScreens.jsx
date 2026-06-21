import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiX, FiCheck } from 'react-icons/fi'
import { Sparkles } from 'lucide-react'
import { generateListingDescription } from '../services/aiService'
import { showNotification } from '../utils/toastHelper'
import './OapAddPropertyMobileScreens.css'

export function OapAddPropertyMobileWelcome({
  title = '',
  description = '',
  titleMaxLength = 80,
  descriptionMaxLength = 2000,
  onTitleChange,
  onDescriptionChange,
}) {
  const { t } = useTranslation()
  const titleLength = title.length
  const descriptionLength = description.length
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [showDescriptionCompareModal, setShowDescriptionCompareModal] = useState(false)
  const [descriptionCompareDraft, setDescriptionCompareDraft] = useState('')
  const [descriptionCompareAi, setDescriptionCompareAi] = useState('')

  const handleGenerateDescription = async () => {
    const draft = (description || '').trim()
    if (!draft) {
      showNotification(t('oap_err_generateDescEmpty'), 'warning')
      return
    }

    setIsGeneratingDescription(true)
    try {
      const text = await generateListingDescription(draft, title?.trim() || '')
      setDescriptionCompareDraft(draft)
      setDescriptionCompareAi(text)
      setShowDescriptionCompareModal(true)
    } catch (error) {
      console.error(error)
      const message =
        error?.message === 'GENERATE_LISTING_INVALID_API_KEY'
          ? t('oap_err_generateDescApiKey')
          : t('oap_err_generateDescFailed')
      showNotification(message, 'error')
    } finally {
      setIsGeneratingDescription(false)
    }
  }

  const handleAcceptDescriptionCompare = () => {
    onDescriptionChange?.(descriptionCompareAi)
    setShowDescriptionCompareModal(false)
    setDescriptionCompareDraft('')
    setDescriptionCompareAi('')
    showNotification(t('oap_generateDescSuccess'), 'success')
  }

  const handleRejectDescriptionCompare = () => {
    setShowDescriptionCompareModal(false)
    setDescriptionCompareDraft('')
    setDescriptionCompareAi('')
    showNotification(t('oap_generateDescKeptYours'), 'info')
  }

  return (
    <div className="oap-mobile-screen">
      <h2 className="oap-mobile-screen__title">
        {t('oap_journeyWelcomeTitleBefore')}{' '}
        <span className="oap-mobile-screen__pill">{t('oap_journeyWelcomeTitleHighlight')}</span>
      </h2>

      <div className="oap-mobile-screen__fields">
        <label className="oap-mobile-screen__field">
          <span className="oap-mobile-screen__field-label">{t('oap_presentationNameTitle')}</span>
          <span className="oap-mobile-screen__field-control">
            <input
              type="text"
              className="oap-mobile-screen__input"
              placeholder={t('oap_presentationNamePlaceholder')}
              value={title}
              maxLength={titleMaxLength}
              required
              aria-required="true"
              onChange={(e) => onTitleChange?.(e.target.value)}
            />
            <span className="oap-mobile-screen__counter">
              {titleLength}/{titleMaxLength}
            </span>
          </span>
        </label>

        <div className="oap-mobile-screen__field">
          <span className="oap-mobile-screen__field-label">{t('oap_presentationDescTitle')}</span>
          <label className="oap-mobile-screen__field-control">
            <textarea
              className="oap-mobile-screen__textarea"
              rows={5}
              placeholder={t('oap_presentationDescPlaceholder')}
              value={description}
              maxLength={descriptionMaxLength}
              onChange={(e) => onDescriptionChange?.(e.target.value)}
            />
            <span
              className={`oap-mobile-screen__counter${descriptionLength > descriptionMaxLength * 0.9 ? ' oap-mobile-screen__counter--warn' : ''}`}
            >
              {descriptionLength}/{descriptionMaxLength}
            </span>
          </label>
          <div className="oap-mobile-screen__generate-row">
            <button
              type="button"
              className="oap-mobile-screen__generate"
              onClick={handleGenerateDescription}
              disabled={isGeneratingDescription || !(description || '').trim()}
              aria-label={t('oap_presentationGenerateAria')}
            >
              <Sparkles size={16} strokeWidth={2} className="oap-mobile-screen__generate-icon" aria-hidden />
              <span>
                {isGeneratingDescription
                  ? t('oap_presentationGenerating')
                  : t('oap_presentationGenerate')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {showDescriptionCompareModal && (
        <div
          className="description-compare-modal-overlay"
          onClick={handleRejectDescriptionCompare}
          role="presentation"
        >
          <div
            className="description-compare-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="oap-mobile-description-compare-title"
          >
            <button
              type="button"
              className="description-compare-modal__close"
              onClick={handleRejectDescriptionCompare}
              aria-label={t('oap_publishClose')}
            >
              <FiX size={20} />
            </button>
            <h2 id="oap-mobile-description-compare-title" className="description-compare-modal__title">
              {t('addPropertyDescriptionCompareTitle')}
            </h2>
            <p className="description-compare-modal__subtitle">
              {t('addPropertyDescriptionCompareSubtitle')}
            </p>
            <div className="description-compare-grid">
              <div className="description-compare-card description-compare-card--yours">
                <div className="description-compare-card__head">
                  <span className="description-compare-card__badge">
                    {t('addPropertyDescriptionCompareYours')}
                  </span>
                </div>
                <div className="description-compare-card__body">{descriptionCompareDraft}</div>
              </div>
              <div className="description-compare-card description-compare-card--ai">
                <div className="description-compare-card__head">
                  <span className="description-compare-card__badge description-compare-card__badge--ai">
                    {t('addPropertyDescriptionCompareAi')}
                  </span>
                </div>
                <div className="description-compare-card__body">{descriptionCompareAi}</div>
              </div>
            </div>
            <div className="description-compare-modal__actions">
              <button
                type="button"
                className="description-compare-btn description-compare-btn--reject"
                onClick={handleRejectDescriptionCompare}
              >
                {t('addPropertyDescriptionReject')}
              </button>
              <button
                type="button"
                className="description-compare-btn description-compare-btn--accept"
                onClick={handleAcceptDescriptionCompare}
              >
                <FiCheck size={18} strokeWidth={2.5} />
                {t('addPropertyDescriptionAccept')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function OapAddPropertyMobileComplete({ title, address }) {
  const { t } = useTranslation()

  return (
    <div className="oap-mobile-screen oap-mobile-screen--complete">
      <h2 className="oap-mobile-screen__title">
        {t('oap_journeyCompleteTitleBefore')}{' '}
        <span className="oap-mobile-screen__pill">{t('oap_journeyCompleteTitleHighlight')}</span>
      </h2>
      <p className="oap-mobile-screen__text">{t('oap_journeyCompleteText')}</p>
      {(title || address) && (
        <div className="oap-mobile-screen__summary">
          {title ? <p className="oap-mobile-screen__summary-title">{title}</p> : null}
          {address ? <p className="oap-mobile-screen__summary-meta">{address}</p> : null}
        </div>
      )}
    </div>
  )
}
