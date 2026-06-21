import { useTranslation } from 'react-i18next'
import OwnerAddPropertyDocumentsStep from './OwnerAddPropertyDocumentsStep'
import OwnerAddPropertyWizardStepLayout, {
  OwnerAddPropertyWizardStepHead,
} from '../components/OwnerAddPropertyWizardStepLayout'
import { OAP_WIZARD_STEP_VISUALS } from './oapWizardStepVisuals'
import './OwnerAddPropertyVerificationStep.css'

export default function OwnerAddPropertyVerificationStep({
  hideWizardChrome = false,
  listingMode,
  requiredDocuments,
  additionalDocuments,
  errors,
  onRequiredChange,
  onRequiredRemove,
  onAddAdditional,
  onRemoveAdditional,
}) {
  const { t } = useTranslation()

  const documentsStep = (
    <OwnerAddPropertyDocumentsStep
      embedded
      journeyLayout={hideWizardChrome}
      listingMode={listingMode}
      requiredDocuments={requiredDocuments}
      additionalDocuments={additionalDocuments}
      errors={errors}
      onRequiredChange={onRequiredChange}
      onRequiredRemove={onRequiredRemove}
      onAddAdditional={onAddAdditional}
      onRemoveAdditional={onRemoveAdditional}
    />
  )

  if (hideWizardChrome) {
    return (
      <section
        className="oap-verification-step oap-verification-step--journey"
        aria-labelledby="oap-journey-documents-title"
      >
        <h2 id="oap-journey-documents-title" className="oap-verification-step__journey-title">
          {t('oap_journeyDocumentsTitle')}
        </h2>
        <div className="oap-verification-step__rows">{documentsStep}</div>
      </section>
    )
  }

  return (
    <OwnerAddPropertyWizardStepLayout
      className="oap-verification-step"
      ariaLabelledBy="oap-verification-step-title"
      visual={OAP_WIZARD_STEP_VISUALS[5]}
    >
      <OwnerAddPropertyWizardStepHead
        titleId="oap-verification-step-title"
        title={t('oap_documentsVerificationTitle')}
        subtitle={t('oap_documentsVerificationSubtitle')}
        subtitleShort={t('oap_documentsVerificationSubtitleShort')}
        stepNumber={5}
      />

      <div className="oap-verification-step__rows">{documentsStep}</div>
    </OwnerAddPropertyWizardStepLayout>
  )
}
