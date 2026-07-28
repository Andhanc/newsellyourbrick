import './OwnerAddPropertyWizardSection.css'

export default function OwnerAddPropertyWizardSection({
  number,
  title,
  hint,
  badge = null,
  className = '',
  children,
}) {
  const classNames = ['oap-wizard-section', className].filter(Boolean).join(' ')

  return (
    <section className={classNames}>
      <header className="oap-wizard-section__head">
        {number != null ? (
          <span className="oap-wizard-section__num" aria-hidden>
            {String(number).padStart(2, '0')}
          </span>
        ) : null}
        <div className="oap-wizard-section__meta">
          <div className="oap-wizard-section__title-row">
            <h3 className="oap-wizard-section__title">{title}</h3>
            {badge}
          </div>
          {hint ? <p className="oap-wizard-section__hint">{hint}</p> : null}
        </div>
      </header>
      <div className="oap-wizard-section__body">{children}</div>
    </section>
  )
}
