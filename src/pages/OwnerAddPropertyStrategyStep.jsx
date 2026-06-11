import { useTranslation } from 'react-i18next'
import OwnerAddPropertyListingStep from './OwnerAddPropertyListingStep'
import OwnerAddPropertyTestDriveStep from './OwnerAddPropertyTestDriveStep'
import OwnerAddPropertyStepAside from '../components/OwnerAddPropertyStepAside'
import { OwnerAddPropertyWizardStepHead } from '../components/OwnerAddPropertyWizardStepLayout'
import OwnerAddPropertyWizardSection from '../components/OwnerAddPropertyWizardSection'
import { OAP_STRATEGY_ROW_ASIDES } from './oapWizardStepVisuals'
import './OwnerAddPropertyStrategyStep.css'
import '../components/OwnerAddPropertyStepAside.css'
import '../components/OwnerAddPropertyWizardSection.css'
import '../components/OwnerAddPropertyWizardStepLayout.css'

export default function OwnerAddPropertyStrategyStep({
  listingModes,
  listingMode,
  listingErrors,
  onSelectListingMode,
  testDriveEnabled,
  testDrive,
  testDrivePricePerDay,
  testDriveInsuranceDeposit,
  testDriveCurrency,
  propertyTypeOption,
  testDriveErrors,
  onTestDriveChoice,
  onTestDriveDetailChange,
}) {
  const { t } = useTranslation()

  return (
    <section className="oap-strategy-step" aria-labelledby="oap-strategy-step-title">
      <OwnerAddPropertyWizardStepHead
        titleId="oap-strategy-step-title"
        title={t('oap_strategyTitle')}
        subtitle={t('oap_strategySubtitle')}
        subtitleShort={t('oap_strategySubtitleShort')}
        stepNumber={3}
      />

      <div className="oap-strategy-step__rows">
        <div className="oap-strategy-step__row oap-strategy-step__row--split oap-strategy-step__row--testdrive">
          <div className="oap-strategy-step__zone">
            <OwnerAddPropertyWizardSection
              number={1}
              title={t('oap_strategyTestDriveTitle')}
              hint={t('oap_strategyTestDriveHint')}
              className="oap-strategy-block oap-strategy-block--testdrive"
            >
              <OwnerAddPropertyTestDriveStep
                embedded
                testDrive={testDrive}
                pricePerDay={testDrivePricePerDay}
                insuranceDeposit={testDriveInsuranceDeposit}
                currency={testDriveCurrency}
                propertyTypeOption={propertyTypeOption}
                errors={testDriveErrors}
                onSelectChoice={onTestDriveChoice}
                onChangeDetail={onTestDriveDetailChange}
              />
            </OwnerAddPropertyWizardSection>
          </div>

          <OwnerAddPropertyStepAside layout="inline" {...OAP_STRATEGY_ROW_ASIDES.testdrive} />
        </div>

        <div className="oap-strategy-step__row oap-strategy-step__row--full oap-strategy-step__row--listing">
          <OwnerAddPropertyWizardSection
            number={2}
            title={t('oap_strategyListingModeTitle')}
            hint={t('oap_strategyListingModeHint')}
            className="oap-strategy-block oap-strategy-block--listing"
          >
            <OwnerAddPropertyListingStep
              embedded
              listingModes={listingModes}
              listingMode={listingMode}
              testDriveEnabled={testDriveEnabled}
              errors={listingErrors}
              onSelectMode={onSelectListingMode}
            />
          </OwnerAddPropertyWizardSection>
        </div>
      </div>
    </section>
  )
}
