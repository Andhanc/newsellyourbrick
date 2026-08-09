import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import './InvestorMobileStepHeader.css'

export default function InvestorMobileStepHeader({ step = 1 }) {
  const { t } = useTranslation()
  const steps = useMemo(
    () => [
      { id: 1, label: t('smartInvestor_step1Label'), copy: t('smartInvestor_step1Copy') },
      { id: 2, label: t('smartInvestor_step2Label'), copy: t('smartInvestor_step2Copy') },
      { id: 3, label: t('smartInvestor_step3Label'), copy: t('smartInvestor_step3Copy') },
    ],
    [t],
  )
  const active = steps.find((item) => item.id === step) || steps[0]
  return (
    <section className="investor-mobile-step" aria-label={t('smartInvestor_stepAria')}>
      <div className="investor-mobile-step__eyebrow">{t('smartInvestor_brand')}</div>
      <h1>{active.label}</h1>
      <p>{active.copy}</p>
      <div className="investor-mobile-step__progress" aria-label={t('smartInvestor_stepProgress', { label: active.label })}>
        {steps.map((item) => (
          <span
            key={item.id}
            className={item.id <= active.id ? 'is-filled' : ''}
            aria-current={item.id === active.id ? 'step' : undefined}
          />
        ))}
      </div>
      <ol className="investor-mobile-step__labels">
        {steps.map((item) => (
          <li key={item.id} className={item.id === active.id ? 'is-active' : ''}>
            {item.label}
          </li>
        ))}
      </ol>
    </section>
  )
}
