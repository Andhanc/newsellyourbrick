import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './OwnerPricingCards.css'

const YEARLY_DISCOUNT = 0.2
const FREE_COMPARE_PRICE = 99

const PLAN_ORDER = ['standard', 'pro', 'institutional']

function getYearlyMonthlyPrice(monthlyPrice) {
  if (monthlyPrice === 0) return 0
  return Math.round(monthlyPrice * (1 - YEARLY_DISCOUNT))
}

function formatEuro(amount) {
  return amount.toLocaleString('ru-RU')
}

function PlanPrice({ monthlyPrice, isYearly, perMonthSuffix }) {
  const isFree = monthlyPrice === 0
  const displayPrice = isYearly ? getYearlyMonthlyPrice(monthlyPrice) : monthlyPrice

  return (
    <div className="opc-plan__price-block">
      {isFree ? (
        <>
          <strong className="opc-plan__price opc-plan__price--free">€0</strong>
          <span className="opc-plan__period">{perMonthSuffix}</span>
          <span className="opc-plan__price-was opc-plan__price-was--red" aria-hidden="true">
            €{formatEuro(FREE_COMPARE_PRICE)}
          </span>
        </>
      ) : (
        <>
          {isYearly ? (
            <span className="opc-plan__price-was" aria-hidden="true">
              €{formatEuro(monthlyPrice)}
            </span>
          ) : null}
          <strong className="opc-plan__price">€{formatEuro(displayPrice)}</strong>
          <span className="opc-plan__period">{perMonthSuffix}</span>
        </>
      )}
    </div>
  )
}

export default function OwnerPricingCards({
  plans,
  planDetails,
  taglines,
  activePlanId,
  loading = false,
  monthlyLabel,
  yearlyLabel,
  yearlySaveLabel,
  perMonthSuffix,
  activeCtaLabel,
  popularLabel,
  onSelectPlan,
}) {
  const { t } = useTranslation()
  const [billingCycle, setBillingCycle] = useState('monthly')
  const isYearly = billingCycle === 'yearly'

  const orderedPlans = useMemo(
    () => PLAN_ORDER.map((id) => plans.find((plan) => plan.id === id)).filter(Boolean),
    [plans]
  )

  const defaultSelectedId = useMemo(() => {
    const featured = orderedPlans.find((plan) => plan.id === 'pro')
    const firstAvailable = orderedPlans.find((plan) => plan.id !== activePlanId)
    return firstAvailable?.id || featured?.id || orderedPlans[0]?.id || 'pro'
  }, [activePlanId, orderedPlans])

  const [selectedPlanId, setSelectedPlanId] = useState(defaultSelectedId)

  useEffect(() => {
    setSelectedPlanId(defaultSelectedId)
  }, [defaultSelectedId])

  const selectedPlan = orderedPlans.find((plan) => plan.id === selectedPlanId) || orderedPlans[0]
  const selectedDetails = selectedPlan ? planDetails[selectedPlan.id] : null
  const selectedIsCurrent = selectedPlan?.id === activePlanId
  const subscribeDisabled = loading || !selectedPlan || selectedIsCurrent

  const handleSubscribe = () => {
    if (subscribeDisabled) return
    onSelectPlan(selectedPlan.id, billingCycle)
  }

  return (
    <div className="owner-pricing-cards">
      <div className="opc-billing" role="group" aria-label={t('ownerTest_subscriptionsTitle')}>
        <div className="opc-billing__tabs">
          <button
            type="button"
            className="opc-billing__tab"
            data-active={billingCycle === 'monthly'}
            aria-pressed={billingCycle === 'monthly'}
            onClick={() => setBillingCycle('monthly')}
          >
            {monthlyLabel}
          </button>
          <button
            type="button"
            className="opc-billing__tab opc-billing__tab--yearly"
            data-active={billingCycle === 'yearly'}
            aria-pressed={billingCycle === 'yearly'}
            onClick={() => setBillingCycle('yearly')}
          >
            {yearlyLabel}
            <span className="opc-billing__save">{t('ownerTest_subscriptionsYearlySaveBadge')}</span>
          </button>
        </div>
      </div>

      <div className="opc-plan-grid">
        {orderedPlans.map((plan) => {
          const details = planDetails[plan.id]
          if (!details) return null

          const isCurrent = activePlanId === plan.id
          const isFeatured = plan.id === 'pro'
          const isSelected = selectedPlanId === plan.id
          const features = details.features.map((item) => item.text)

          return (
            <article
              key={plan.id}
              className={[
                'opc-plan',
                isSelected ? 'opc-plan--selected' : '',
                isCurrent ? 'opc-plan--current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isFeatured ? <span className="opc-plan__badge">{popularLabel}</span> : null}
              {isCurrent ? (
                <span className="opc-plan__ribbon" role="status">
                  {activeCtaLabel}
                </span>
              ) : null}

              <h3 className="opc-plan__name">{plan.name}</h3>
              {taglines[plan.id] ? <p className="opc-plan__desc">{taglines[plan.id]}</p> : null}

              <PlanPrice
                monthlyPrice={plan.monthlyPrice}
                isYearly={isYearly}
                perMonthSuffix={perMonthSuffix}
              />

              {isYearly && plan.monthlyPrice > 0 ? (
                <p className="opc-plan__yearly-note">{yearlySaveLabel}</p>
              ) : null}

              <ul className="opc-plan__features">
                {features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} strokeWidth={2.5} aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={[
                  'opc-plan__button',
                  isSelected ? 'opc-plan__button--selected' : '',
                  isCurrent ? 'opc-plan__button--current' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={isCurrent}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                {isCurrent ? activeCtaLabel : t('ownerTest_planChoose')}
                {!isCurrent ? <ArrowRight size={16} strokeWidth={2.25} aria-hidden /> : null}
              </button>
            </article>
          )
        })}
      </div>

      <div className="opc-subscribe-panel">
        <div className="opc-subscribe-panel__copy">
          <span>{t('ownerTest_subscriptionsSelectedPlan')}</span>
          <strong>{selectedPlan?.name}</strong>
          <p>{selectedPlan ? taglines[selectedPlan.id] : ''}</p>
        </div>
        <button
          type="button"
          className="opc-subscribe-panel__cta"
          disabled={subscribeDisabled}
          onClick={handleSubscribe}
        >
          <CreditCard size={18} strokeWidth={2.25} aria-hidden />
          {loading ? '…' : selectedIsCurrent ? activeCtaLabel : t('ownerTest_subscriptionDrawerSubscribe')}
        </button>
      </div>
    </div>
  )
}
