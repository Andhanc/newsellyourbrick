import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Headphones, Sparkles } from 'lucide-react'
import './OwnerAddPropertyStepAside.css'

export default function OwnerAddPropertyStepAside({
  accent = 'teal',
  layout = 'sidebar',
  variant = 'full',
  image,
  eyebrow,
  lead,
  stepLabel,
  highlights = [],
  tipsTitle,
  tips = [],
  help,
}) {
  const { t } = useTranslation()
  const resolvedTipsTitle = tipsTitle ?? t('ownerTest_oapTipsTitle')
  if (!image && tips.length === 0 && !eyebrow && !lead) return null

  const asideClass = [
    'oap-wizard-aside',
    `oap-wizard-aside--${accent}`,
    layout === 'inline' ? 'oap-wizard-aside--inline' : '',
    variant === 'compact' ? 'oap-wizard-aside--compact' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const showHero = Boolean(
    (variant !== 'compact' && image) ||
      eyebrow ||
      lead ||
      (variant !== 'compact' && highlights.length > 0)
  )

  return (
    <aside className={asideClass} aria-label={resolvedTipsTitle}>
      <div className="oap-wizard-aside__card">
        {showHero ? (
          <div className="oap-wizard-aside__hero">
            <div className="oap-wizard-aside__hero-mesh" aria-hidden />
            {stepLabel ? (
              <span className="oap-wizard-aside__step-badge" aria-hidden>
                {stepLabel}
              </span>
            ) : null}
            {highlights.length > 0 ? (
              <div className="oap-wizard-aside__highlights">
                {highlights.map((item) => (
                  <span key={item} className="oap-wizard-aside__highlight">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {image ? (
              <div className="oap-wizard-aside__visual-frame">
                <div className="oap-wizard-aside__visual-glow" aria-hidden />
                <img src={image} alt="" className="oap-wizard-aside__visual-img" />
              </div>
            ) : null}
            {(eyebrow || lead) && (
              <div className="oap-wizard-aside__hero-copy">
                {eyebrow ? <span className="oap-wizard-aside__eyebrow">{eyebrow}</span> : null}
                {lead ? <p className="oap-wizard-aside__lead">{lead}</p> : null}
              </div>
            )}
          </div>
        ) : null}

        {tips.length > 0 ? (
          <div className="oap-wizard-aside__guide">
            <div className="oap-wizard-aside__guide-head">
              <span className="oap-wizard-aside__guide-icon" aria-hidden>
                <Sparkles size={15} strokeWidth={2.2} />
              </span>
              <h3 className="oap-wizard-aside__guide-title">{resolvedTipsTitle}</h3>
            </div>
            <ul className="oap-wizard-aside__guide-list">
              {tips.map((tip, index) => {
                const TipIcon = tip.Icon
                return (
                  <li key={tip.title} className="oap-wizard-aside__guide-item">
                    <span className="oap-wizard-aside__guide-num" aria-hidden>
                      {index + 1}
                    </span>
                    <div className="oap-wizard-aside__guide-body">
                      <div className="oap-wizard-aside__guide-row">
                        <span
                          className={`oap-wizard-aside__tip-icon oap-wizard-aside__tip-icon--${tip.tone || 'tiffany'}`}
                          aria-hidden
                        >
                          <TipIcon size={15} strokeWidth={1.85} />
                        </span>
                        <strong>{tip.title}</strong>
                      </div>
                      <p>{tip.text}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {help ? (
          <div className="oap-wizard-aside__help">
            <h4 className="oap-wizard-aside__help-title">{help.title}</h4>
            <p className="oap-wizard-aside__help-text">{help.text}</p>
            <Link to="/chat?manager=1" className="oap-wizard-aside__help-btn">
              <Headphones size={16} aria-hidden />
              {t('ownerTest_oapContactSupport')}
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
