import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Headphones, Sparkles } from 'lucide-react'
import OapWizardSidebarImage from './OapWizardSidebarImage'
import './OwnerAddPropertyStepAside.css'

export default function OwnerAddPropertyStepAside({
  accent = 'teal',
  layout = 'sidebar',
  variant = 'full',
  image,
  eyebrow,
  eyebrowKey,
  lead,
  leadKey,
  stepLabel,
  stepLabelKey,
  stepLabelParams,
  highlights = [],
  highlightKeys = [],
  tipsTitle,
  tipsTitleKey,
  tips = [],
  help,
}) {
  const { t } = useTranslation()
  const resolvedTipsTitle = tipsTitleKey
    ? t(tipsTitleKey)
    : tipsTitle ?? t('ownerTest_oapTipsTitle')
  const resolvedEyebrow = eyebrowKey ? t(eyebrowKey) : eyebrow
  const resolvedLead = leadKey ? t(leadKey) : lead
  const resolvedStepLabel = stepLabelKey
    ? t(stepLabelKey, stepLabelParams || {})
    : stepLabel
  const resolvedHighlights =
    highlightKeys.length > 0 ? highlightKeys.map((key) => t(key)) : highlights
  const resolvedHelp = help
    ? {
        title: help.titleKey ? t(help.titleKey) : help.title,
        text: help.textKey ? t(help.textKey) : help.text,
      }
    : null

  if (!image && tips.length === 0 && !resolvedEyebrow && !resolvedLead) return null

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
      resolvedEyebrow ||
      resolvedLead ||
      (variant !== 'compact' && resolvedHighlights.length > 0)
  )

  return (
    <aside className={asideClass} aria-label={resolvedTipsTitle}>
      <div className="oap-wizard-aside__card">
        {showHero ? (
          <div className="oap-wizard-aside__hero">
            <div className="oap-wizard-aside__hero-mesh" aria-hidden />
            {resolvedStepLabel ? (
              <span className="oap-wizard-aside__step-badge" aria-hidden>
                {resolvedStepLabel}
              </span>
            ) : null}
            {resolvedHighlights.length > 0 ? (
              <div className="oap-wizard-aside__highlights">
                {resolvedHighlights.map((item) => (
                  <span key={item} className="oap-wizard-aside__highlight">
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {image ? (
              <div className="oap-wizard-aside__visual-frame">
                <div className="oap-wizard-aside__visual-glow" aria-hidden />
                <OapWizardSidebarImage src={image} className="oap-wizard-aside__visual-img" />
              </div>
            ) : null}
            {(resolvedEyebrow || resolvedLead) && (
              <div className="oap-wizard-aside__hero-copy">
                {resolvedEyebrow ? (
                  <span className="oap-wizard-aside__eyebrow">{resolvedEyebrow}</span>
                ) : null}
                {resolvedLead ? <p className="oap-wizard-aside__lead">{resolvedLead}</p> : null}
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
                const tipTitle = tip.titleKey ? t(tip.titleKey) : tip.title
                const tipText = tip.textKey ? t(tip.textKey) : tip.text
                return (
                  <li key={tip.titleKey || tip.title || index} className="oap-wizard-aside__guide-item">
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
                        <strong>{tipTitle}</strong>
                      </div>
                      <p>{tipText}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {resolvedHelp ? (
          <div className="oap-wizard-aside__help">
            <h4 className="oap-wizard-aside__help-title">{resolvedHelp.title}</h4>
            <p className="oap-wizard-aside__help-text">{resolvedHelp.text}</p>
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
