import { Crown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatPropertyPrice } from '../../utils/currency'
import { getPropertyCardImage } from '../../utils/propertyImage'
import { resolvePositivePropertyPrice } from '../../utils/compareDecision'
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

function PropertyPodium({ item, index, side, pct, rank }) {
  const { t } = useTranslation()
  const view = propertyView(item, index, t)

  return (
    <article className={`compare-decision__property compare-decision__property--${side} compare-decision__property--rank-${rank}`}>
      <div className="compare-decision__contestant">
        <div className="compare-decision__avatar-wrap">
          <img
            className="compare-decision__avatar"
            src={view.image}
            alt=""
            aria-hidden="true"
            onError={(event) => {
              if (!event.currentTarget.src.endsWith(FALLBACK_IMAGE)) event.currentTarget.src = FALLBACK_IMAGE
            }}
          />
          {rank === 1 ? (
            <span className="compare-decision__crown" aria-hidden="true">
              <Crown />
            </span>
          ) : null}
        </div>
        <span className="compare-decision__property-label">{t('comparePage_objectN', { index })}</span>
        <strong className="compare-decision__property-title" title={view.title}>{view.title}</strong>
        <span className="compare-decision__property-price">{view.price}</span>
      </div>

      <div className="compare-decision__podium">
        <span className="compare-decision__rank" aria-hidden="true">{rank}</span>
        <strong className="compare-decision__score">{pct || 0}%</strong>
      </div>
    </article>
  )
}

export default function CompareDecisionSummary({ pair, summary, onOpenCalculator }) {
  const { t } = useTranslation()
  if (!pair) return null

  const entries = [
    { item: pair.left, side: 'left', index: 1, pct: summary?.leftPct || 0 },
    { item: pair.right, side: 'right', index: 2, pct: summary?.rightPct || 0 },
  ]
  const hasSingleLeader = summary?.leader === 'left' || summary?.leader === 'right'
  const podiumEntries = hasSingleLeader
    ? entries
        .map((entry) => ({ ...entry, rank: entry.side === summary.leader ? 1 : 2 }))
        .sort((a, b) => b.rank - a.rank)
    : entries.map((entry) => ({ ...entry, rank: 1 }))
  const calculatorEntry = podiumEntries.find((entry) => entry.rank === 1) || podiumEntries[0]
  const calculatorView = propertyView(calculatorEntry.item, calculatorEntry.index, t)

  return (
    <section className="compare-decision" aria-labelledby="compare-decision-title">
      <h2 id="compare-decision-title" className="compare-decision__title">{t('comparePage_decisionTitle')}</h2>

      <div
        className={`compare-decision__properties${hasSingleLeader ? '' : ' compare-decision__properties--tie'}`}
        role="group"
        aria-label={t('comparePage_scoreBarAria', {
          left: summary?.leftPct || 0,
          right: summary?.rightPct || 0,
          count: summary?.decided || 0,
        })}
      >
        {podiumEntries.map((entry) => (
          <PropertyPodium
            key={entry.side}
            {...entry}
          />
        ))}
      </div>

      <button
        type="button"
        className="compare-decision__action"
        onClick={() => onOpenCalculator(calculatorEntry.side)}
        aria-label={t('comparePage_openCalcAria', { title: calculatorView.title })}
      >
        {t('comparePage_calcThisObject')}
      </button>
    </section>
  )
}
