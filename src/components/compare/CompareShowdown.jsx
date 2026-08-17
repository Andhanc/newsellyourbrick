import { useTranslation } from 'react-i18next'
import { formatPropertyPrice } from '../../utils/currency'
import { resolvePositivePropertyPrice } from '../../utils/compareDecision'
import { getPropertyCardImage } from '../../utils/propertyImage'
import './CompareShowdown.css'

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

function ShowdownCard({ item, index, position }) {
  const { t } = useTranslation()
  const view = propertyView(item, index, t)

  return (
    <article className={`compare-showdown__card compare-showdown__card--${position}`}>
      <img
        src={view.image}
        alt=""
        aria-hidden="true"
        onError={(event) => {
          if (!event.currentTarget.src.endsWith(FALLBACK_IMAGE)) event.currentTarget.src = FALLBACK_IMAGE
        }}
      />
      <div className="compare-showdown__card-shade" />
      <div className="compare-showdown__card-copy">
        <span>{t('comparePage_objectN', { index })}</span>
        <strong>{view.title}</strong>
        <small>{view.price}</small>
      </div>
    </article>
  )
}

export function CompareShowdown({ pair, stage }) {
  const { t } = useTranslation()
  if (!pair || stage === 'idle' || stage === 'complete') return null

  return (
    <section
      className={`compare-showdown${stage === 'exiting' ? ' compare-showdown--exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('comparePage_showdownVersusAria')}
      data-testid="compare-showdown"
    >
      <div className="compare-showdown__stage">
        <ShowdownCard item={pair.left} index={1} position="top" />

        <div className="compare-showdown__versus" aria-label={t('comparePage_showdownVersusAria')}>
          <span>VS</span>
        </div>

        <ShowdownCard item={pair.right} index={2} position="bottom" />
      </div>
    </section>
  )
}
