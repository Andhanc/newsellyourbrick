import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowUpRight, BadgeEuro, ChevronRight, SlidersHorizontal } from 'lucide-react'
import './InvestorMobileResultCard.css'

export default function InvestorMobileResultCard({
  equity,
  yieldValue,
  cashFlow,
  profit,
  headlineLabel,
  yieldLabel,
  assumptions,
  isPositive = true,
  propertyTitle,
  propertyImage,
  onOpenAssumptions,
  onOpenProperty,
}) {
  const { t } = useTranslation()
  const resolvedHeadline = headlineLabel || t('smartInvestor_resultHeadlineDefault')
  const resolvedYield = yieldLabel || t('smartInvestor_resultYieldDefault')

  return (
    <section className="investor-mobile-result" aria-labelledby="investor-mobile-result-title">
      {propertyImage && (
        <div className="investor-mobile-result__property">
          <img src={propertyImage} alt="" />
          <span>
            <small>{t('smartInvestor_resultPropertyLabel')}</small>
            <strong>{propertyTitle || t('smartInvestor_resultSelectedProperty')}</strong>
          </span>
        </div>
      )}
      <div className="investor-mobile-result__head">
        <span className="investor-mobile-result__icon" aria-hidden>
          <BadgeEuro size={20} />
        </span>
        <div>
          <span>{t('smartInvestor_resultBaseScenario')}</span>
          <h2 id="investor-mobile-result-title">{t('smartInvestor_resultTitle')}</h2>
        </div>
      </div>

      <div className="investor-mobile-result__hero">
        <span>{resolvedHeadline}</span>
        <strong className={isPositive ? 'is-positive' : 'is-negative'}>{profit}</strong>
      </div>

      <dl className="investor-mobile-result__metrics">
        <div>
          <dt>{t('smartInvestor_resultEquity')}</dt>
          <dd>{equity}</dd>
        </div>
        <div>
          <dt>{resolvedYield}</dt>
          <dd>{yieldValue}</dd>
        </div>
        <div>
          <dt>{t('smartInvestor_resultAvgMonth')}</dt>
          <dd>{cashFlow}</dd>
        </div>
      </dl>

      <div className="investor-mobile-result__assumptions">
        <ArrowUpRight size={17} aria-hidden />
        <div>
          <strong>{t('smartInvestor_resultAssumptionsTitle')}</strong>
          <span>{assumptions}</span>
        </div>
      </div>
      <div className="investor-mobile-result__risk">
        <AlertTriangle size={17} aria-hidden />
        <div>
          <strong>{t('smartInvestor_resultRiskTitle')}</strong>
          <span>{t('smartInvestor_resultRiskText')}</span>
        </div>
      </div>

      <div className="investor-mobile-result__actions">
        <button type="button" className="investor-mobile-result__action" onClick={onOpenAssumptions}>
          <SlidersHorizontal size={18} aria-hidden />
          {t('smartInvestor_resultTune')}
        </button>
        <button
          type="button"
          className="investor-mobile-result__action investor-mobile-result__action--primary"
          onClick={onOpenProperty}
        >
          {propertyTitle ? t('smartInvestor_resultGoProperty') : t('smartInvestor_resultBrowse')}
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </section>
  )
}
