import { useTranslation } from 'react-i18next'
import OwnerAddPropertyCalculatorStep from './OwnerAddPropertyCalculatorStep'
import OwnerAddPropertyPricingStep from './OwnerAddPropertyPricingStep'
import OwnerAddPropertyStepAside from '../components/OwnerAddPropertyStepAside'
import { OwnerAddPropertyWizardStepHead } from '../components/OwnerAddPropertyWizardStepLayout'
import OwnerAddPropertyWizardSection from '../components/OwnerAddPropertyWizardSection'
import { OAP_FINANCE_ROW_ASIDES } from './oapWizardStepVisuals'
import './OwnerAddPropertyFinanceStep.css'
import '../components/OwnerAddPropertyStepAside.css'
import '../components/OwnerAddPropertyWizardStepLayout.css'
import '../components/OwnerAddPropertyWizardSection.css'

export default function OwnerAddPropertyFinanceStep({
  hideWizardChrome = false,
  propertyData,
  calculatorApplied,
  onApplyRecommendedPrice,
  listingMode,
  minimumSalePrice,
  price,
  debtAmount,
  totalShares,
  auctionStartingPrice,
  auctionStartDate,
  auctionEndDate,
  currency,
  pricingErrors,
  pricingFieldSource = {},
  onPricingFieldChange,
}) {
  const { t } = useTranslation()

  const pricingBlock = (
    <OwnerAddPropertyPricingStep
      embedded
      journeyLayout={hideWizardChrome}
      listingMode={listingMode}
      minimumSalePrice={minimumSalePrice}
      price={price}
      debtAmount={debtAmount}
      totalShares={totalShares}
      auctionStartingPrice={auctionStartingPrice}
      auctionStartDate={auctionStartDate}
      auctionEndDate={auctionEndDate}
      currency={currency}
      errors={pricingErrors}
      pricingFieldSource={pricingFieldSource}
      onChangeField={onPricingFieldChange}
    />
  )

  return (
    <section
      className={`oap-finance-step${hideWizardChrome ? ' oap-finance-step--journey' : ''}`}
      aria-labelledby={hideWizardChrome ? 'oap-journey-pricing-title' : 'oap-finance-step-title'}
    >
      {!hideWizardChrome ? (
        <OwnerAddPropertyWizardStepHead
          titleId="oap-finance-step-title"
          title={t('oap_financeTitle')}
          subtitle={t('oap_financeSubtitle')}
          subtitleShort={t('oap_financeSubtitleShort')}
          stepNumber={4}
        />
      ) : null}

      <div className="oap-finance-step__rows">
        {!hideWizardChrome ? (
          <div className="oap-finance-step__row oap-finance-step__row--split oap-finance-step__row--calculator">
            <div className="oap-finance-step__zone">
              <OwnerAddPropertyWizardSection
                number={1}
                title={t('oap_financeValuationTitle')}
                hint={t('oap_financeValuationHint')}
                className="oap-finance-block oap-finance-block--calculator"
              >
                <OwnerAddPropertyCalculatorStep
                  embedded
                  propertyData={propertyData}
                  calculatorApplied={calculatorApplied}
                  onApplyRecommendedPrice={onApplyRecommendedPrice}
                />
              </OwnerAddPropertyWizardSection>
            </div>

            <OwnerAddPropertyStepAside layout="inline" {...OAP_FINANCE_ROW_ASIDES.calculator} />
          </div>
        ) : null}

        <div
          className={`oap-finance-step__row oap-finance-step__row--full oap-finance-step__row--pricing${hideWizardChrome ? ' oap-finance-step__row--pricing-journey' : ''}`}
        >
          {hideWizardChrome ? (
            <div className="oap-finance-step__zone oap-finance-step__zone--pricing-journey">
              <h2 id="oap-journey-pricing-title" className="oap-finance-step__journey-title">
                {t('oap_journeyPricingTitle')}
              </h2>
              <div className="oap-finance-block oap-finance-block--pricing">{pricingBlock}</div>
            </div>
          ) : (
            <OwnerAddPropertyWizardSection
              number={2}
              title={t('oap_financePricingTitle')}
              hint={t('oap_financePricingHint')}
              className="oap-finance-block oap-finance-block--pricing"
            >
              {pricingBlock}
            </OwnerAddPropertyWizardSection>
          )}
        </div>
      </div>
    </section>
  )
}
