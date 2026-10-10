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
  hideWizardChrome = false,
  listingModes,
  listingMode,
  listingErrors,
  onSelectListingMode,
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

  const testDriveBlock = (
    <OwnerAddPropertyTestDriveStep
      embedded
      journeyLayout={hideWizardChrome}
      testDrive={testDrive}
      pricePerDay={testDrivePricePerDay}
      insuranceDeposit={testDriveInsuranceDeposit}
      currency={testDriveCurrency}
      propertyTypeOption={propertyTypeOption}
      errors={testDriveErrors}
      onSelectChoice={onTestDriveChoice}
      onChangeDetail={onTestDriveDetailChange}
    />
  )

  const listingBlock = (
    <OwnerAddPropertyListingStep
      embedded
      journeyLayout={hideWizardChrome}
      listingModes={listingModes}
      listingMode={listingMode}
      errors={listingErrors}
      onSelectMode={onSelectListingMode}
    />
  )

  return (
    <section
      className={`oap-strategy-step${hideWizardChrome ? ' oap-strategy-step--journey' : ''}`}
      aria-labelledby={hideWizardChrome ? 'oap-journey-testdrive-title' : 'oap-strategy-step-title'}
    >
      {!hideWizardChrome ? (
        <OwnerAddPropertyWizardStepHead
          titleId="oap-strategy-step-title"
          title={t('oap_strategyTitle')}
          subtitle={t('oap_strategySubtitle')}
          subtitleShort={t('oap_strategySubtitleShort')}
          stepNumber={3}
        />
      ) : null}

      <div className="oap-strategy-step__rows">
        <div
          className={`oap-strategy-step__row oap-strategy-step__row--testdrive${hideWizardChrome ? ' oap-strategy-step__row--testdrive-journey' : ' oap-strategy-step__row--split'}`}
        >
          <div
            className={`oap-strategy-step__zone${hideWizardChrome ? ' oap-strategy-step__zone--testdrive-journey' : ''}`}
          >
            {hideWizardChrome ? (
              <>
                <h2 id="oap-journey-testdrive-title" className="oap-strategy-step__journey-title">
                  {t('oap_journeyTestDriveTitle')}
                </h2>
                {testDriveBlock}
              </>
            ) : (
              <OwnerAddPropertyWizardSection
                number={1}
                title={t('oap_strategyTestDriveTitle')}
                hint={t('oap_strategyTestDriveHint')}
                className="oap-strategy-block oap-strategy-block--testdrive"
              >
                {testDriveBlock}
              </OwnerAddPropertyWizardSection>
            )}
          </div>

          {!hideWizardChrome ? (
            <OwnerAddPropertyStepAside layout="inline" {...OAP_STRATEGY_ROW_ASIDES.testdrive} />
          ) : null}
        </div>

        <div
          className={`oap-strategy-step__row oap-strategy-step__row--full oap-strategy-step__row--listing${hideWizardChrome ? ' oap-strategy-step__row--listing-journey' : ''}`}
        >
          {hideWizardChrome ? (
            <div className="oap-strategy-step__zone oap-strategy-step__zone--listing-journey">
              <h2 className="oap-strategy-step__journey-title">{t('oap_journeyListingTitle')}</h2>
              <div className="oap-strategy-block oap-strategy-block--listing">{listingBlock}</div>
            </div>
          ) : (
            <OwnerAddPropertyWizardSection
              number={2}
              title={t('oap_strategyListingModeTitle')}
              hint={t('oap_strategyListingModeHint')}
              className="oap-strategy-block oap-strategy-block--listing"
            >
              {listingBlock}
            </OwnerAddPropertyWizardSection>
          )}
        </div>
      </div>
    </section>
  )
}
