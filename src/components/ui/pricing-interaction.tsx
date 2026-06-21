import NumberFlow from '@number-flow/react'
import React from 'react'
import { cn } from '@/lib/utils'
import './pricing-interaction.css'

export type PricingInteractionPlan = {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  popular?: boolean
}

export type PricingInteractionProps = {
  plans: PricingInteractionPlan[]
  monthlyLabel: string
  yearlyLabel: string
  perMonthSuffix: string
  ctaLabel: string
  activeCtaLabel: string
  popularLabel: string
  activePlanId?: string | null
  loading?: boolean
  onGetStarted: (planId: string, period: 'monthly' | 'yearly') => void
}

function planIndexById(plans: PricingInteractionPlan[], planId?: string | null) {
  if (!planId) return 0
  const index = plans.findIndex((plan) => plan.id === planId)
  return index >= 0 ? index : 0
}

export function PricingInteraction({
  plans,
  monthlyLabel,
  yearlyLabel,
  perMonthSuffix,
  ctaLabel,
  activeCtaLabel,
  popularLabel,
  activePlanId = null,
  loading = false,
  onGetStarted,
}: PricingInteractionProps) {
  const [active, setActive] = React.useState(() => planIndexById(plans, activePlanId))
  const [period, setPeriod] = React.useState(0)

  React.useEffect(() => {
    setActive(planIndexById(plans, activePlanId))
  }, [activePlanId, plans])

  const selectedPlan = plans[active] ?? plans[0]
  const isCurrentPlan = Boolean(activePlanId && selectedPlan?.id === activePlanId)
  const isFreePlan = selectedPlan?.monthlyPrice === 0
  const ctaDisabled = loading || isCurrentPlan || isFreePlan

  const handleGetStarted = () => {
    if (!selectedPlan || ctaDisabled) return
    onGetStarted(selectedPlan.id, period === 0 ? 'monthly' : 'yearly')
  }

  return (
    <div className="pricing-interaction">
      <div className="pricing-interaction__period">
        <div
          className="pricing-interaction__period-indicator"
          style={{ transform: `translateX(${period * 100}%)` }}
          aria-hidden
        />
        <button
          type="button"
          className={cn(
            'pricing-interaction__period-btn',
            period === 0 && 'pricing-interaction__period-btn--active',
          )}
          onClick={() => setPeriod(0)}
        >
          {monthlyLabel}
        </button>
        <button
          type="button"
          className={cn(
            'pricing-interaction__period-btn',
            period === 1 && 'pricing-interaction__period-btn--active',
          )}
          onClick={() => setPeriod(1)}
        >
          {yearlyLabel}
        </button>
      </div>

      <div className="pricing-interaction__plans">
        {plans.map((plan, index) => {
          const price = period === 0 ? plan.monthlyPrice : plan.yearlyPrice
          const isSelected = active === index

          return (
            <button
              key={plan.id}
              type="button"
              className={cn(
                'pricing-interaction__plan',
                plan.popular && 'pricing-interaction__plan--popular',
                isSelected && 'pricing-interaction__plan--selected',
              )}
              onClick={() => setActive(index)}
              aria-pressed={isSelected}
            >
              <span className="pricing-interaction__plan-copy">
                <span className="pricing-interaction__plan-title-row">
                  <span className="pricing-interaction__plan-title">{plan.name}</span>
                  {plan.popular ? (
                    <span className="pricing-interaction__plan-badge">{popularLabel}</span>
                  ) : null}
                </span>
                <p className="pricing-interaction__plan-price">
                  <span className="pricing-interaction__plan-amount">
                    {price === 0 ? (
                      <>0 €</>
                    ) : (
                      <>
                        <NumberFlow value={price} />
                        <span>{'\u00a0'}€</span>
                      </>
                    )}
                  </span>
                  <span className="pricing-interaction__plan-suffix">{perMonthSuffix}</span>
                </p>
              </span>
              <span
                className={cn(
                  'pricing-interaction__radio',
                  isSelected && 'pricing-interaction__radio--selected',
                )}
                aria-hidden
              >
                <span
                  className={cn(
                    'pricing-interaction__radio-dot',
                    isSelected && 'pricing-interaction__radio-dot--visible',
                  )}
                />
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="pricing-interaction__cta"
        disabled={ctaDisabled}
        onClick={handleGetStarted}
      >
        {loading ? '…' : isCurrentPlan ? activeCtaLabel : ctaLabel}
      </button>
    </div>
  )
}
