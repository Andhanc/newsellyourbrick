import { useTranslation } from 'react-i18next'
import { FiArrowUpRight, FiCheckCircle } from 'react-icons/fi'
import { formatPropertyPrice } from '../../utils/currency'
import { getPropertyCardImage } from '../../utils/propertyImage'
import { formatComparisonDecision, resolvePositivePropertyPrice } from '../../utils/compareDecision'
import './CompareDecisionSummary.css'

const FALLBACK_IMAGE = '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

function propertyView(item, index, t) {
  const property = item?.property || {}
  const price = resolvePositivePropertyPrice(property)
  return {
    title: property.name || property.title || t('comparePage_objectN', { index }),
    image: getPropertyCardImage(property, FALLBACK_IMAGE),
    price: price != null && price !== ''
      ? formatPropertyPrice(price, property.currency || 'EUR', { compact: true })
      : t('comparePage_priceOnRequest'),
  }
}

function PropertyAction({ item, index, score, pct, decided, isLead, onSelect }) {
  const { t } = useTranslation()
  const view = propertyView(item, index, t)
  return (
    <article
      className={`compare-decision__property${isLead ? ' compare-decision__property--lead' : ''}`}
      style={{ '--decision-share': `${Math.max(0, Math.min(100, pct || 0))}%` }}
    >
      <div className="compare-decision__property-main">
        <div className="compare-decision__property-media">
          <img
            src={view.image}
            alt=""
            aria-hidden="true"
            onError={(event) => {
              if (!event.currentTarget.src.endsWith(FALLBACK_IMAGE)) event.currentTarget.src = FALLBACK_IMAGE
            }}
          />
          <span className="compare-decision__property-label">
            {t('comparePage_signalsLabel', { index, pct: pct || 0 })}
          </span>
          <div className="compare-decision__score-ring" aria-hidden="true">
            <div>
              <strong>{pct || 0}%</strong>
              <small>{score || 0}/{decided || 0}</small>
            </div>
          </div>
        </div>
        <div className="compare-decision__property-copy">
          <strong className="compare-decision__property-title">{view.title}</strong>
          <span className="compare-decision__property-price">{view.price}</span>
          <small className="compare-decision__property-points">
            <FiCheckCircle aria-hidden="true" />
            {t('comparePage_scorePoints', { score: score || 0, count: decided || 0 })}
          </small>
        </div>
      </div>
      <button
        type="button"
        className="compare-decision__action"
        onClick={onSelect}
        aria-label={t('comparePage_openCalcAria', { title: view.title })}
      >
        {t('comparePage_calcThisObject')}
        <FiArrowUpRight aria-hidden="true" />
      </button>
    </article>
  )
}

export default function CompareDecisionSummary({ pair, summary, onOpenCalculator }) {
  const { t } = useTranslation()
  if (!pair) return null

  return (
    <section className="compare-decision" aria-labelledby="compare-decision-title">
      <header className="compare-decision__header">
        <div className="compare-decision__heading">
          <span className="compare-decision__eyebrow"><FiCheckCircle aria-hidden="true" /> {t('comparePage_decisionEyebrow')}</span>
          <h2 id="compare-decision-title">{t('comparePage_decisionTitle')}</h2>
        </div>
        <p className="compare-decision__result">{formatComparisonDecision(summary, t)}</p>
        {summary?.decided > 0 ? (
          <div
            className="compare-decision__bar"
            role="img"
            aria-label={t('comparePage_scoreBarAria', {
              left: summary.leftPct,
              right: summary.rightPct,
              count: summary.decided,
            })}
          >
            {summary.leftPct > 0 ? (
              <span
                className="compare-decision__bar-side compare-decision__bar-side--left"
                style={{ flexGrow: summary.leftPct, flexBasis: 0 }}
              >
                {summary.leftPct}%
              </span>
            ) : null}
            {summary.rightPct > 0 ? (
              <span
                className="compare-decision__bar-side compare-decision__bar-side--right"
                style={{ flexGrow: summary.rightPct, flexBasis: 0 }}
              >
                {summary.rightPct}%
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="compare-decision__meta">
          {t('comparePage_decisionMeta', { count: summary?.decided || 0 })}
          {summary?.tie > 0 ? ` ${t('comparePage_decisionTiesNote', { count: summary.tie })}` : ''}
        </p>
      </header>

      <div className="compare-decision__properties">
        <PropertyAction
          item={pair.left}
          index={1}
          score={summary?.left || 0}
          pct={summary?.leftPct || 0}
          decided={summary?.decided || 0}
          isLead={summary?.leader === 'left'}
          onSelect={() => onOpenCalculator('left')}
        />
        <PropertyAction
          item={pair.right}
          index={2}
          score={summary?.right || 0}
          pct={summary?.rightPct || 0}
          decided={summary?.decided || 0}
          isLead={summary?.leader === 'right'}
          onSelect={() => onOpenCalculator('right')}
        />
      </div>

      <p className="compare-decision__disclaimer">
        {t('comparePage_decisionDisclaimer')}
      </p>
    </section>
  )
}
