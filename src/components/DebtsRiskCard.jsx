import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronRight, Code2, Copy, Rocket, Zap } from 'lucide-react'
import './ui/FlipCard.css'
import './DebtsRiskCard.css'

const TONE_COLORS = {
  high: '#DC2626',
  medium: '#CA8A04',
  low: '#16A34A',
}

const FEATURE_ICONS = [Copy, Code2, Rocket, Zap]

function ClickHint({ accent, label }) {
  return (
    <div className="debts-risk-card__click-hint" style={{ borderColor: `${accent}30` }}>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v3" />
        <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
      <span style={{ color: accent }}>{label}</span>
    </div>
  )
}

function LiveLinesBackground({ accent }) {
  return (
    <div className="debts-risk-card__live-bg" aria-hidden>
      <div className="debts-risk-card__live-bg-inner">
        {[...Array(6)].map((_, i) => {
          const w = 48 + ((i * 11) % 42)
          const ml = (i * 9) % 26
          return (
            <div
              key={i}
              className="flip-card-line debts-risk-card__live-line"
              style={{
                width: `${w}%`,
                marginLeft: `${ml}%`,
                animationDelay: `${i * 0.22}s`,
                background: `linear-gradient(to right, ${accent}22, ${accent}55, ${accent}22)`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function DebtsRiskCard({
  label,
  subtitle,
  description,
  features = [],
  ctaText = '',
  count,
  Icon,
  tone,
  isActive = false,
  isFlipped = false,
  onFilterClick,
  onFlipChange,
}) {
  const { t } = useTranslation()
  const accent = TONE_COLORS[tone] || TONE_COLORS.high

  const ctaLabel = String(ctaText || '')
    .replace(/^(\p{Extended_Pictographic}\p{Emoji_Modifier}*|\p{Emoji_Presentation})(\uFE0F|\u200D\p{Extended_Pictographic})*\s+/u, '')
    .trim()

  const handleFlip = () => {
    onFlipChange?.(!isFlipped)
  }

  return (
    <article
      className={`debts-risk-card debts-risk-card--${tone}${
        isActive ? ' is-active' : ''
      }${isFlipped ? ' is-flipped' : ''}`}
      style={{ '--debts-risk-accent': accent }}
    >
      <div className="debts-risk-card__top">
        <button
          type="button"
          className="debts-risk-card__top-main"
          onClick={() => onFilterClick?.()}
          aria-pressed={isActive}
        >
          <span className="debts-risk-card__icon" aria-hidden>
            <Icon size={22} strokeWidth={2} />
          </span>
          <span className="debts-risk-card__copy">
            <span className="debts-risk-card__label">{label}</span>
            <span className="debts-risk-card__count-row">
              <span className="debts-risk-card__count-num">{count}</span>
              <span className="debts-risk-card__count-word">
                {t('debtsRiskObjectsWord', { count })}
              </span>
            </span>
          </span>
        </button>
        <button
          type="button"
          className="debts-risk-card__chevron-btn"
          onClick={handleFlip}
          aria-expanded={isFlipped}
          aria-label={isFlipped ? t('debtsRiskCardCollapse') : t('debtsRiskCardExpand')}
        >
          <ChevronRight size={18} className="debts-risk-card__chevron" aria-hidden />
        </button>
      </div>

      <div className="debts-risk-card__flip-root">
        <button
          type="button"
          className="debts-risk-card__flip-trigger"
          onClick={handleFlip}
          aria-expanded={isFlipped}
          aria-label={isFlipped ? t('debtsRiskCardCollapse') : t('debtsRiskCardExpand')}
        >
          <div className="debts-risk-card__flip-inner">
            {/* ── FRONT ── */}
            <div className="debts-risk-card__face debts-risk-card__face--front">
              <div
                className="debts-risk-card__face-glow"
                style={{ background: `radial-gradient(ellipse at 100% 50%, ${accent}14 0%, transparent 62%)` }}
                aria-hidden
              />
              <ClickHint accent={accent} label={t('debtsFlipCardClickHint')} />
              <div className="debts-risk-card__front-footer">
                <div className="debts-risk-card__front-text">
                  <h3 className="debts-risk-card__front-title">{label}</h3>
                  <p className="debts-risk-card__front-subtitle">{subtitle}</p>
                </div>
                <Zap className="debts-risk-card__front-zap" size={16} style={{ color: accent }} aria-hidden />
              </div>
            </div>

            {/* ── BACK ── */}
            <div className="debts-risk-card__face debts-risk-card__face--back">
              <LiveLinesBackground accent={accent} />
              <div
                className="debts-risk-card__face-glow debts-risk-card__face-glow--back"
                style={{ background: `radial-gradient(ellipse at 100% 100%, ${accent}10 0%, transparent 60%)` }}
                aria-hidden
              />

              <div className="debts-risk-card__back-content">
                <div className="debts-risk-card__back-header">
                  <div
                    className="debts-risk-card__back-icon-wrap"
                    style={{ background: accent, boxShadow: `0 3px 10px ${accent}40` }}
                  >
                    <Icon size={18} color="#fff" strokeWidth={2} aria-hidden />
                  </div>
                  <h3 className="debts-risk-card__back-title">{label}</h3>
                </div>

                <p className="debts-risk-card__back-description">{description}</p>

                {features.length > 0 ? (
                  <ul className="debts-risk-card__back-features">
                    {features.map((feature, index) => {
                      const FeatureIcon = FEATURE_ICONS[index % FEATURE_ICONS.length]
                      return (
                        <li key={feature} className="debts-risk-card__back-feature">
                          <span
                            className="debts-risk-card__back-feature-icon"
                            style={{ background: `${accent}1A` }}
                          >
                            <FeatureIcon size={13} style={{ color: accent }} aria-hidden />
                          </span>
                          <span className="debts-risk-card__back-feature-text">{feature}</span>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}

                {ctaLabel ? (
                  <div className="debts-risk-card__back-footer">
                    <div className="debts-risk-card__back-divider" />
                    <span className="debts-risk-card__back-cta">
                      <span className="debts-risk-card__back-cta-label">
                        <Icon size={18} style={{ color: accent }} aria-hidden />
                        <span>{ctaLabel}</span>
                      </span>
                      <ArrowRight size={16} style={{ color: accent }} aria-hidden />
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </button>
      </div>
    </article>
  )
}

export default DebtsRiskCard
