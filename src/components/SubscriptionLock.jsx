import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiArrowRight, FiLock } from 'react-icons/fi'
import './SubscriptionLock.css'

const SUBSCRIPTIONS_HREF = { pathname: '/subscriptions', hash: 'subscriptions-pricing-section' }

export default function SubscriptionLock({
  locked,
  requiredPlan = 'Pro',
  children,
  className = '',
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!locked) return children

  return (
    <div className={`subscription-lock${className ? ` ${className}` : ''}`}>
      <div className="subscription-lock__content" aria-hidden inert="">
        {children}
      </div>
      <button
        type="button"
        className="subscription-lock__overlay"
        onClick={() => navigate(SUBSCRIPTIONS_HREF)}
        aria-label={t('subscriptionLockAria', { plan: requiredPlan })}
      >
        <span className="subscription-lock__prompt">
          <span className="subscription-lock__icon" aria-hidden>
            <FiLock size={20} />
          </span>
          <span className="subscription-lock__title">
            {t('subscriptionLockTitle', { plan: requiredPlan })}
          </span>
          <span className="subscription-lock__cta">
            {t('subscriptionLockCta')}
            <FiArrowRight size={15} aria-hidden />
          </span>
        </span>
      </button>
    </div>
  )
}
