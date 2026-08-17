import { useTranslation } from 'react-i18next'
import { FiCheck, FiRefreshCw, FiRotateCcw } from 'react-icons/fi'
import { formatPropertyPrice } from '../../utils/currency'
import { getPropertyCardImage } from '../../utils/propertyImage'
import { resolvePositivePropertyPrice } from '../../utils/compareDecision'
import './CompareMobileMetrics.css'

const FALLBACK_IMAGE = '/images/external/photo-1560448204-e02f11c3d0e2-54a1e4fab4.jpg'

const METRIC_GROUP_DEFS = [
  { id: 'price', labelKey: 'comparePage_groupPrice', rows: ['price', 'auction_start', 'ppm'] },
  {
    id: 'property',
    labelKey: 'comparePage_groupProperty',
    rows: ['area', 'living_area', 'land_area', 'beds', 'baths', 'year', 'house_floors', 'floor', 'material'],
  },
  { id: 'comfort', labelKey: 'comparePage_groupComfort', rows: ['comfort'] },
]

function sideView(item, index, t) {
  const property = item?.property || {}
  const price = resolvePositivePropertyPrice(property)
  return {
    key: item?.key || `object-${index}`,
    title: property.name || property.title || t('comparePage_objectN', { index }),
    image: getPropertyCardImage(property, FALLBACK_IMAGE),
    price: price != null && price !== ''
      ? formatPropertyPrice(price, property.currency || 'EUR', { compact: true })
      : t('comparePage_priceOnRequest'),
  }
}

function ObjectHeader({ item, side, index, label, onReplace }) {
  const { t } = useTranslation()
  const view = sideView(item, index, t)
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
      <button
        type="button"
        className="compare-mobile__replace"
        onClick={() => onReplace(side)}
        aria-label={t('comparePage_replaceAria', { label, title: view.title })}
      >
        <FiRefreshCw aria-hidden />
        <span>{t('comparePage_replace')}</span>
      </button>
    </article>
  )
}

function MetricValue({ row, side, objectTitle }) {
  const { t } = useTranslation()
  const isWinner = !row.displayOnly && row.winner === side
  const value = row[side]
  const classes = [
    'compare-mobile__value',
    isWinner && 'compare-mobile__value--winner',
    row.displayOnly && 'compare-mobile__value--plain',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      aria-label={`${objectTitle}: ${value}${isWinner ? t('comparePage_strongerAriaSuffix') : ''}`}
    >
      <span className="compare-mobile__value-number">{value}</span>
      {isWinner ? (
        <span className="compare-mobile__winner" aria-hidden="true">
          <FiCheck />
        </span>
      ) : null}
    </div>
  )
}

export default function CompareMobileMetrics({ left, right, rows, onReplace, onClear }) {
  const { t } = useTranslation()
  const leftView = sideView(left, 1, t)
  const rightView = sideView(right, 2, t)
  const replaceLeft = () => onReplace('left')
  const replaceRight = () => onReplace('right')
  const groupedRows = rows.map((row) => {
    const group = METRIC_GROUP_DEFS.find((candidate) => candidate.rows.includes(row.id))
    return { row, groupId: group?.id || 'property' }
  }).reduce((groups, entry) => {
    const list = groups.get(entry.groupId) || []
    list.push(entry.row)
    groups.set(entry.groupId, list)
    return groups
  }, new Map())

  return (
    <div className="compare-mobile" role="region" aria-label={t('comparePage_metricsAria')}>
      <div className="compare-mobile__pair">
        <ObjectHeader item={left} side="left" index={1} label={t('comparePage_object1')} onReplace={replaceLeft} />
        <ObjectHeader item={right} side="right" index={2} label={t('comparePage_object2')} onReplace={replaceRight} />
        <div className="compare-mobile__versus" aria-hidden="true">VS</div>
        <button type="button" className="compare-mobile__clear" onClick={onClear}>
          <FiRotateCcw aria-hidden="true" />
          <span>{t('comparePage_clearSelection')}</span>
        </button>
      </div>

      <div className="compare-mobile__metrics">
        {METRIC_GROUP_DEFS.map((group) => {
          const groupRows = groupedRows.get(group.id) || []
          if (groupRows.length === 0) return null
          return (
            <section className="compare-mobile__group" key={group.id} aria-labelledby={`compare-mobile-group-${group.id}`}>
              <div className="compare-mobile__group-head">
                <h3 id={`compare-mobile-group-${group.id}`}>{t(group.labelKey)}</h3>
              </div>
              <div className="compare-mobile__group-rows">
                {groupRows.map((row) => (
                  <article className="compare-mobile__metric" key={row.id} aria-labelledby={`compare-mobile-metric-${row.id}`}>
                    <h4 id={`compare-mobile-metric-${row.id}`} className="compare-mobile__metric-label">{row.label}</h4>
                    <div className="compare-mobile__values">
                      <MetricValue row={row} side="left" objectTitle={leftView.title} />
                      <MetricValue row={row} side="right" objectTitle={rightView.title} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
