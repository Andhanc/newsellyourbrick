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
  propertyData,
  calculatorApplied,
  onApplyRecommendedPrice,
  listingMode,
  minimumSalePrice,
  price,
  debtAmount,
  auctionStartingPrice,
  auctionStartDate,
  auctionEndDate,
  currency,
  pricingErrors,
  onPricingFieldChange,
}) {
  const { t } = useTranslation()

  return (
    <section className="oap-finance-step" aria-labelledby="oap-finance-step-title">
      <OwnerAddPropertyWizardStepHead
        titleId="oap-finance-step-title"
        title={t('oap_financeTitle')}
        subtitle={t('oap_financeSubtitle')}
        subtitleShort={t('oap_financeSubtitleShort')}
        stepNumber={4}
      />

      <div className="oap-finance-step__rows">
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

        <div className="oap-finance-step__row oap-finance-step__row--full oap-finance-step__row--pricing">
          <OwnerAddPropertyWizardSection
            number={2}
            title={t('oap_financePricingTitle')}
            hint={t('oap_financePricingHint')}
            className="oap-finance-block oap-finance-block--pricing"
          >
            <OwnerAddPropertyPricingStep
              embedded
              listingMode={listingMode}
              minimumSalePrice={minimumSalePrice}
              price={price}
              debtAmount={debtAmount}
              auctionStartingPrice={auctionStartingPrice}
              auctionStartDate={auctionStartDate}
              auctionEndDate={auctionEndDate}
              currency={currency}
              errors={pricingErrors}
              onChangeField={onPricingFieldChange}
            />
          </OwnerAddPropertyWizardSection>
        </div>
      </div>
    </section>
  )
}
