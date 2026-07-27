import * as React from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { DRAWER_DISMISS_MS, useDrawerDismiss } from '@/hooks/useDrawerDismiss'
import './subscription-screen.css'

export type SubscriptionFeature = {
  icon: React.ReactNode
  text: string
}

export type SubscriptionPricingOption = {
  id: string
  price: string
  period: string
  badge?: string
}

export type SubscriptionScreenProps = {
  open: boolean
  appName: string
  planType: string
  features: SubscriptionFeature[]
  pricingOptions: SubscriptionPricingOption[]
  defaultPlanId: string
  subscribeButtonText: string
  footerText: string
  loading?: boolean
  onClose: () => void
  onSubscribe: (planId: string) => void
}

export function SubscriptionScreen({
  open,
  appName,
  planType,
  features,
  pricingOptions,
  defaultPlanId,
  subscribeButtonText,
  footerText,
  loading = false,
  onClose,
  onSubscribe,
}: SubscriptionScreenProps) {
  const { visible, isClosing, requestClose } = useDrawerDismiss(open, onClose, {
    duration: DRAWER_DISMISS_MS.spring,
  })
  const [selectedPlan, setSelectedPlan] = React.useState(defaultPlanId)

  React.useEffect(() => {
    if (!open) return
    setSelectedPlan(defaultPlanId)
  }, [defaultPlanId, open])

  React.useEffect(() => {
    if (!visible) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [requestClose, visible])

  if (!visible || typeof document === 'undefined') return null

  const closingBackdrop = isClosing ? ' drawer-dismiss-backdrop--closing' : ''
  const openBackdrop = isClosing ? '' : ' subscription-screen-overlay__backdrop--open'
  const sheetMotionClass = isClosing ? ' subscription-screen--closing' : ' subscription-screen--open'

  return createPortal(
    <div className="subscription-screen-overlay">
      <button
        type="button"
        className={`subscription-screen-overlay__backdrop${openBackdrop}${closingBackdrop}`}
        aria-label="Close"
        onClick={() => requestClose()}
      />
      <div className={cn('subscription-screen', sheetMotionClass)}>
        <div className="subscription-screen__sheet">
          <div className="subscription-screen__header">
            <h2 className="subscription-screen__title">
              {appName} <span className="subscription-screen__title-accent">{planType}</span>
            </h2>
            <button
              type="button"
              className="subscription-screen__close"
              aria-label="Close"
              onClick={() => requestClose()}
            >
              <X size={20} strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          <ul className="subscription-screen__features">
            {features.map((feature, index) => (
              <motion.li
                key={feature.text}
                className="subscription-screen__feature"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.22 + index * 0.08, ease: 'easeOut' }}
              >
                <span className="subscription-screen__feature-icon" aria-hidden>
                  {feature.icon}
                </span>
                <span>{feature.text}</span>
              </motion.li>
            ))}
          </ul>

          <div className="subscription-screen__pricing" role="radiogroup" aria-label={planType}>
            {pricingOptions.map((option) => {
              const isSelected = selectedPlan === option.id
              return (
                <label
                  key={option.id}
                  className={cn(
                    'subscription-screen__option',
                    isSelected && 'subscription-screen__option--selected',
                  )}
                >
                  <input
                    type="radio"
                    name="subscription-billing"
                    value={option.id}
                    checked={isSelected}
                    onChange={() => setSelectedPlan(option.id)}
                    className="subscription-screen__sr-radio"
                  />
                  <span className="subscription-screen__option-main">
                    <span className="subscription-screen__option-radio" aria-hidden>
                      <span
                        className={cn(
                          'subscription-screen__option-dot',
                          isSelected && 'subscription-screen__option-dot--visible',
                        )}
                      />
                    </span>
                    <span className="subscription-screen__option-price">{option.price}</span>
                    <span className="subscription-screen__option-period">{option.period}</span>
                  </span>
                  {option.badge ? (
                    <span className="subscription-screen__badge">{option.badge}</span>
                  ) : null}
                </label>
              )
            })}
          </div>

          <button
            type="button"
            className="subscription-screen__cta"
            disabled={loading}
            onClick={() => onSubscribe(selectedPlan)}
          >
            {loading ? '…' : subscribeButtonText}
          </button>

          <p className="subscription-screen__footer">{footerText}</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
