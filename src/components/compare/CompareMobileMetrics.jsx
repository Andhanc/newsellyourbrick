import { FiRefreshCw } from 'react-icons/fi'
import { formatPropertyPrice } from '../../utils/currency'
import { getPropertyCardImage } from '../../utils/propertyImage'
import './CompareMobileMetrics.css'

const FALLBACK_IMAGE = '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

function sideView(item, index) {
  const property = item?.property || {}
  const price =
    property.currentBid ??
    property.current_bid ??
    property.price ??
    property.auction_starting_price
  return {
    key: item?.key || `object-${index}`,
    title: property.name || property.title || `Объект ${index}`,
    image: getPropertyCardImage(property, FALLBACK_IMAGE),
    price: price != null && price !== ''
      ? formatPropertyPrice(price, property.currency || 'EUR', { compact: true })
      : 'Цена по запросу',
  }
}

function ObjectHeader({ item, side, index, label, onReplace }) {
  const view = sideView(item, index)
  return (
    <article className="compare-mobile__object" aria-label={`${label}: ${view.title}`}>
      <div className="compare-mobile__object-media">
        <img
          className="compare-mobile__object-image"
          src={view.image}
          alt=""
          aria-hidden
          onError={(event) => {
            if (!event.currentTarget.src.endsWith(FALLBACK_IMAGE)) {
              event.currentTarget.src = FALLBACK_IMAGE
            }
          }}
        />
        <span className="compare-mobile__object-index">{index}</span>
      </div>
      <div className="compare-mobile__object-copy">
        <span className="compare-mobile__object-kicker">{label}</span>
        <strong title={view.title}>{view.title}</strong>
        <span className="compare-mobile__object-price">{view.price}</span>
      </div>
      <button type="button" className="compare-mobile__replace" onClick={() => onReplace(side)}>
        <FiRefreshCw aria-hidden />
        <span>Сменить</span>
      </button>
    </article>
  )
}

function MetricValue({ row, side, objectTitle }) {
  const isWinner = !row.displayOnly && row.winner === side
  const isTie = !row.displayOnly && row.winner === 'tie'
  const value = row[side]
  const classes = [
    'compare-mobile__value',
    isWinner && 'compare-mobile__value--win',
    isTie && 'compare-mobile__value--tie',
    row.displayOnly && 'compare-mobile__value--plain',
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} aria-label={`${objectTitle}: ${value}${isWinner ? ', сильнее' : ''}`}>
      <span className="compare-mobile__value-number">{value}</span>
      {isWinner ? <span className="compare-mobile__winner">Сильнее</span> : null}
    </div>
  )
}

export default function CompareMobileMetrics({ left, right, rows, onReplace }) {
  const leftView = sideView(left, 1)
  const rightView = sideView(right, 2)
  const replaceLeft = () => onReplace('left')
  const replaceRight = () => onReplace('right')

  return (
    <div className="compare-mobile" role="region" aria-label="Сравнение двух объектов">
      <div className="compare-mobile__pair">
        <ObjectHeader item={left} side="left" index={1} label="Объект 1" onReplace={replaceLeft} />
        <ObjectHeader item={right} side="right" index={2} label="Объект 2" onReplace={replaceRight} />
      </div>

      <div className="compare-mobile__metrics">
        {rows.map((row) => (
          <article className="compare-mobile__metric" key={row.id} aria-labelledby={`compare-mobile-metric-${row.id}`}>
            <h3 id={`compare-mobile-metric-${row.id}`} className="compare-mobile__metric-label">{row.label}</h3>
            <div className="compare-mobile__values">
              <MetricValue row={row} side="left" objectTitle={leftView.title} />
              <MetricValue row={row} side="right" objectTitle={rightView.title} />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
