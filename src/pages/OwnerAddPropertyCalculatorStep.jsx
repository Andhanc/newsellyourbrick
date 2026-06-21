import { useTranslation } from 'react-i18next'
import { Lightbulb, TrendingUp, CheckCircle2 } from 'lucide-react'
import PropertyCalculatorModal from '../components/PropertyCalculatorModal'
import OapWizardSidebarImage from '../components/OapWizardSidebarImage'
import { OAP_CALCULATOR_IMAGES } from './oapCalculatorImages'
import './OwnerAddPropertyCalculatorStep.css'

export default function OwnerAddPropertyCalculatorStep({
  embedded = false,
  propertyData,
  calculatorApplied = false,
  onApplyRecommendedPrice,
}) {
  const { t } = useTranslation()

  const calculatorCard = (
    <>
      {calculatorApplied && (
        <div className="oap-calculator-step__applied" role="status">
          <CheckCircle2 size={18} strokeWidth={2} aria-hidden />
          <span>
            {t('addPropertyCalculatorAppliedFromRecommended')}
          </span>
        </div>
      )}

      <div className="oap-calculator-step__card">
        {!embedded && (
          <div className="oap-calculator-step__card-head">
            <span className="oap-calculator-step__card-icon" aria-hidden>
              <TrendingUp size={20} strokeWidth={1.85} />
            </span>
            <div className="oap-calculator-step__card-copy">
              <h3 className="oap-calculator-step__card-title">{t('oap_calculatorCardTitle')}</h3>
              <p className="oap-calculator-step__card-lead">{t('oap_calculatorCardHint')}</p>
            </div>
          </div>
        )}

        <div className="oap-calculator-step__embed">
          <PropertyCalculatorModal
            isOpen
            variant="embedded"
            onClose={() => {}}
            lockFields
            initialPropertyData={propertyData}
            onApplyRecommendedPrice={onApplyRecommendedPrice}
          />
        </div>
      </div>
    </>
  )

  if (embedded) {
    return <section className="oap-calculator-step oap-calculator-step--embedded">{calculatorCard}</section>
  }

  return (
    <section className="oap-calculator-step" aria-labelledby="oap-calculator-title">
      <div className="oap-calculator-step__layout">
        <div className="oap-calculator-step__main">
          <header className="oap-calculator-step__head">
            <h2 id="oap-calculator-title" className="oap-calculator-step__title">
              {t('oap_calculatorAutoTitle')}
            </h2>
            <p className="oap-calculator-step__subtitle">{t('oap_calculatorAutoDesc')}</p>
          </header>

          {calculatorCard}
        </div>

        <aside className="oap-calculator-step__sidebar" aria-label={t('oap_calculatorSidebarAria')}>
          <div className="oap-calculator-step__sidebar-head">
            <span className="oap-calculator-step__sidebar-icon" aria-hidden>
              <Lightbulb size={16} strokeWidth={2} />
            </span>
            <span className="oap-calculator-step__sidebar-title">{t('oap_calculatorSidebarTitle')}</span>
          </div>
          <p className="oap-calculator-step__sidebar-text">{t('oap_calculatorSidebarP1')}</p>
          <p className="oap-calculator-step__sidebar-text">{t('oap_calculatorSidebarP2')}</p>
          <ul className="oap-calculator-step__sidebar-tips">
            <li>{t('oap_calculatorSidebarLi1')}</li>
            <li>{t('oap_calculatorSidebarLi2')}</li>
            <li>{t('oap_calculatorSidebarLi3')}</li>
          </ul>
          <div className="oap-calculator-step__sidebar-illustration">
            <OapWizardSidebarImage
              src={OAP_CALCULATOR_IMAGES.sidebarHero}
              className="oap-calculator-step__sidebar-img"
            />
          </div>
        </aside>
      </div>
    </section>
  )
}
