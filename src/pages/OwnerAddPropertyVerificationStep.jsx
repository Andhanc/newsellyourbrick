import { useTranslation } from 'react-i18next'
import OwnerAddPropertyDocumentsStep from './OwnerAddPropertyDocumentsStep'
import OwnerAddPropertyWizardStepLayout, {
  OwnerAddPropertyWizardStepHead,
} from '../components/OwnerAddPropertyWizardStepLayout'
import { OAP_WIZARD_STEP_VISUALS } from './oapWizardStepVisuals'
import './OwnerAddPropertyVerificationStep.css'

export default function OwnerAddPropertyVerificationStep({
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

      <div className="oap-verification-step__rows">
        <OwnerAddPropertyDocumentsStep
          embedded
          listingMode={listingMode}
          requiredDocuments={requiredDocuments}
          additionalDocuments={additionalDocuments}
          errors={errors}
          onRequiredChange={onRequiredChange}
          onRequiredRemove={onRequiredRemove}
          onAddAdditional={onAddAdditional}
          onRemoveAdditional={onRemoveAdditional}
        />
      </div>
    </OwnerAddPropertyWizardStepLayout>
  )
}
