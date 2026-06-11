import { useTranslation } from 'react-i18next'
import OwnerAddPropertyStepAside from './OwnerAddPropertyStepAside'
import './OwnerAddPropertyWizardStepLayout.css'
import './OwnerAddPropertyWizardSection.css'

export function OwnerAddPropertyWizardStepHead({
  titleId,
  title,
  subtitle,
  subtitleShort,
  stepNumber,
  stepTotal = 5,
}) {
  const { t } = useTranslation()
  const progressPct = stepNumber ? Math.round((stepNumber / stepTotal) * 100) : 0

  return (
    <header className="oap-wizard-step__head">
      {stepNumber ? (
        <div className="oap-wizard-step__progress" aria-hidden>
          <div className="oap-wizard-step__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      ) : null}
      <div className="oap-wizard-step__head-row">
        <div className="oap-wizard-step__title-wrap">
          <span className="oap-wizard-step__title-mark" aria-hidden />
          <h2 id={titleId} className="oap-wizard-step__title">
            {title}
          </h2>
        </div>
        {stepNumber ? (
          <span className="oap-wizard-step__badge">
            {t('oap_wizardStepBadge', { current: stepNumber, total: stepTotal })}
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="oap-wizard-step__subtitle">
          {subtitleShort ? (
            <>
              <span className="oap-wizard-step__subtitle-full">{subtitle}</span>
              <span className="oap-wizard-step__subtitle-short">{subtitleShort}</span>
            </>
          ) : (
            subtitle
          )}
        </p>
      ) : null}
    </header>
  )
}

export default function OwnerAddPropertyWizardStepLayout({
  className = '',
  ariaLabelledBy,
  visual,
  children,
}) {
  const classNames = ['oap-wizard-step', className].filter(Boolean).join(' ')

  return (
    <section className={classNames} aria-labelledby={ariaLabelledBy}>
      <div className="oap-wizard-step__layout">
        <div className="oap-wizard-step__main">{children}</div>
        {visual ? <OwnerAddPropertyStepAside {...visual} /> : null}
      </div>
    </section>
  )
}
