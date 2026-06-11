import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiX, FiCheck } from 'react-icons/fi'
import OwnerAddPropertyAmenitiesStep from './OwnerAddPropertyAmenitiesStep'
import OwnerAddPropertyMediaStep from './OwnerAddPropertyMediaStep'
import OwnerAddPropertyStepAside from '../components/OwnerAddPropertyStepAside'
import { OwnerAddPropertyWizardStepHead } from '../components/OwnerAddPropertyWizardStepLayout'
import OwnerAddPropertyWizardSection from '../components/OwnerAddPropertyWizardSection'
import AnimatedGenerateButton from '../components/ui/animated-generate-button-shadcn-tailwind'
import { generateListingDescription } from '../services/aiService'
import { showNotification } from '../utils/toastHelper'
import { OAP_PRESENTATION_ROW_ASIDES } from './oapWizardStepVisuals'
import './OwnerAddPropertyPresentationStep.css'
import '../components/OwnerAddPropertyStepAside.css'
import '../components/OwnerAddPropertyWizardSection.css'

export default function OwnerAddPropertyPresentationStep({
  form,
  titleMaxLength,
  descriptionMaxLength,
  onFieldChange,
  typeProfile,
  selectedAmenities,
  onToggleAmenity,
  onAdditionalChange,
  photos,
  videos,
  onAddPhotos,
  onRemovePhoto,
  onAddVideo,
  onRemoveVideo,
}) {
  const { t } = useTranslation()
  const titleLength = form.title.length
  const descriptionLength = form.description.length
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [showDescriptionCompareModal, setShowDescriptionCompareModal] = useState(false)
  const [descriptionCompareDraft, setDescriptionCompareDraft] = useState('')
  const [descriptionCompareAi, setDescriptionCompareAi] = useState('')

  const handleGenerateDescription = async () => {
    const draft = (form.description || '').trim()
    if (!draft) {
      showNotification(t('oap_err_generateDescEmpty'), 'warning')
      return
    }

    setIsGeneratingDescription(true)
    try {
      const text = await generateListingDescription(draft, form.title?.trim() || '')
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
    onFieldChange('description', descriptionCompareAi)
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
    <section className="oap-presentation-step" aria-labelledby="oap-presentation-step-title">
      <OwnerAddPropertyWizardStepHead
        titleId="oap-presentation-step-title"
        title={t('oap_presentationTitle')}
        subtitle={t('oap_presentationSubtitle')}
        subtitleShort={t('oap_presentationSubtitleShort')}
        stepNumber={2}
      />

      <div className="oap-presentation-step__rows">
        <div className="oap-presentation-step__row oap-presentation-step__row--split oap-presentation-step__row--title">
          <div className="oap-presentation-step__zone">
            <OwnerAddPropertyWizardSection
              number={1}
              title={t('oap_presentationNameTitle')}
              hint={t('oap_presentationNameHint')}
            >
              <label className="oap-presentation-field">
                <span className="oap-presentation-field__control">
                  <input
                    type="text"
                    className="oap-presentation-field__input"
                    placeholder={t('oap_presentationNamePlaceholder')}
                    value={form.title}
                    maxLength={titleMaxLength}
                    required
                    aria-required="true"
                    onChange={(e) => onFieldChange('title', e.target.value)}
                  />
                  <span className="oap-presentation-field__counter">
                    {titleLength}/{titleMaxLength}
                  </span>
                </span>
              </label>
            </OwnerAddPropertyWizardSection>
          </div>

          <OwnerAddPropertyStepAside layout="inline" {...OAP_PRESENTATION_ROW_ASIDES.copy} />
        </div>

        <div className="oap-presentation-step__row oap-presentation-step__row--full oap-presentation-step__row--description">
          <OwnerAddPropertyWizardSection
            number={2}
            title={t('oap_presentationDescTitle')}
            hint={t('oap_presentationDescHint')}
          >
            <label className="oap-presentation-field">
              <span className="oap-presentation-field__control">
                <textarea
                  className="oap-presentation-field__textarea"
                  rows={6}
                  placeholder={t('oap_presentationDescPlaceholder')}
                  value={form.description}
                  maxLength={descriptionMaxLength}
                  onChange={(e) => onFieldChange('description', e.target.value)}
                />
                <span
                  className={`oap-presentation-field__counter${descriptionLength > descriptionMaxLength * 0.9 ? ' oap-presentation-field__counter--warn' : ''}`}
                >
                  {descriptionLength}/{descriptionMaxLength}
                </span>
              </span>
            </label>
            <div className="oap-presentation-step__generate-row">
              <AnimatedGenerateButton
                labelIdle={t('oap_presentationGenerate')}
                labelActive={t('oap_presentationGenerating')}
                generating={isGeneratingDescription}
                highlightHueDeg={210}
                onClick={handleGenerateDescription}
                disabled={isGeneratingDescription || !(form.description || '').trim()}
                ariaLabel={t('oap_presentationGenerateAria')}
                className="oap-presentation-step__generate-btn"
              />
            </div>
          </OwnerAddPropertyWizardSection>
        </div>

        <div className="oap-presentation-step__row oap-presentation-step__row--split oap-presentation-step__row--amenities">
          <OwnerAddPropertyStepAside
            layout="inline"
            variant="compact"
            {...OAP_PRESENTATION_ROW_ASIDES.amenities}
          />

          <div className="oap-presentation-step__zone oap-presentation-step__zone--amenities">
            <OwnerAddPropertyWizardSection
              number={3}
              title={t('oap_presentationAmenitiesTitle')}
              hint={t('oap_presentationAmenitiesHint')}
            >
              <OwnerAddPropertyAmenitiesStep
                embedded
                typeProfile={typeProfile}
                additionalAmenities={form.additionalAmenities}
                selectedAmenities={selectedAmenities}
                onAdditionalChange={onAdditionalChange}
                onToggleAmenity={onToggleAmenity}
              />
            </OwnerAddPropertyWizardSection>
          </div>
        </div>

        <div className="oap-presentation-step__row oap-presentation-step__row--full oap-presentation-step__row--media">
          <OwnerAddPropertyWizardSection
            number={4}
            title={t('oap_presentationMediaTitle')}
            hint={t('oap_presentationMediaHint')}
          >
            <OwnerAddPropertyMediaStep
              embedded
              photos={photos}
              videos={videos}
              onAddPhotos={onAddPhotos}
              onRemovePhoto={onRemovePhoto}
              onAddVideo={onAddVideo}
              onRemoveVideo={onRemoveVideo}
            />
          </OwnerAddPropertyWizardSection>
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
            aria-labelledby="oap-description-compare-title"
          >
            <button
              type="button"
              className="description-compare-modal__close"
              onClick={handleRejectDescriptionCompare}
              aria-label={t('oap_publishClose')}
            >
              <FiX size={20} />
            </button>
            <h2 id="oap-description-compare-title" className="description-compare-modal__title">
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
    </section>
  )
}
