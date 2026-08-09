import { useTranslation } from 'react-i18next'
import { FiArrowUpRight, FiCheckCircle } from 'react-icons/fi'
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

function decisionText(summary, t) {
  if (!summary || summary.leader === 'unknown') return t('comparePage_decisionUnknown')
  if (summary.leader === 'tie') {
    return t('comparePage_decisionTie', { left: summary.left, right: summary.right })
  }
  const leader = summary.leader === 'left' ? t('comparePage_object1') : t('comparePage_object2')
  return t('comparePage_decisionLead', {
    leader: leader.toLowerCase(),
    left: summary.left,
    right: summary.right,
  })
}

function PropertyAction({ item, index, score, onSelect }) {
  const { t } = useTranslation()
  const view = propertyView(item, index, t)
  return (
    <article className="compare-decision__property">
      <div className="compare-decision__property-main">
        <img
          src={view.image}
          alt=""
          aria-hidden="true"
          onError={(event) => {
            if (!event.currentTarget.src.endsWith(FALLBACK_IMAGE)) event.currentTarget.src = FALLBACK_IMAGE
          }}
        />
        <div>
          <span>{t('comparePage_signalsLabel', { index, score })}</span>
          <strong>{view.title}</strong>
          <small>{view.price}</small>
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
        <span className="compare-decision__eyebrow"><FiCheckCircle aria-hidden="true" /> {t('comparePage_decisionEyebrow')}</span>
        <h2 id="compare-decision-title">{t('comparePage_decisionTitle')}</h2>
        <p className="compare-decision__result">{decisionText(summary, t)}</p>
        <p className="compare-decision__meta">
          {t('comparePage_decisionMeta', { count: summary?.compared || 0 })}
        </p>
      </header>

      <div className="compare-decision__properties">
        <PropertyAction
          item={pair.left}
          index={1}
          score={summary?.left || 0}
          onSelect={() => onOpenCalculator('left')}
        />
        <PropertyAction
          item={pair.right}
          index={2}
          score={summary?.right || 0}
          onSelect={() => onOpenCalculator('right')}
        />
      </div>

      <p className="compare-decision__disclaimer">
        {t('comparePage_decisionDisclaimer')}
      </p>
    </section>
  )
}
