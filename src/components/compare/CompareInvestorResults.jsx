import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiLoader, FiRefreshCw } from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi'
import { formatPropertyPrice } from '../../utils/currency'
import { getPropertyCardImage } from '../../utils/propertyImage'
import { resolvePositivePropertyPrice, summarizeComparisonRows } from '../../utils/compareDecision'
import './CompareInvestorResults.css'

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

function propertyView(item, index, t) {
  const property = item?.property || {}
  const price = resolvePositivePropertyPrice(property)
  return {
    title: property.name || property.title || t('comparePage_objectN', { index }),
    image: getPropertyCardImage(property, FALLBACK_IMAGE),
    price: price != null
      ? formatPropertyPrice(price, property.currency || 'EUR', { compact: true })
      : t('comparePage_priceOnRequest'),
  }
}

function ObjectHeader({ item, side, index, onReplace }) {
  const { t } = useTranslation()
  const view = propertyView(item, index, t)
  const label = index === 1 ? t('comparePage_object1') : t('comparePage_object2')

  return (
    <article className="compare-investor__object" aria-label={`${label}: ${view.title}`}>
      <div className="compare-investor__object-media">
        <img
          src={view.image}
          alt=""
          aria-hidden
          onError={(event) => {
            if (!event.currentTarget.src.endsWith(FALLBACK_IMAGE)) {
              event.currentTarget.src = FALLBACK_IMAGE
            }
          }}
        />
        <span>{index}</span>
      </div>
      <div className="compare-investor__object-copy">
        <small>{label}</small>
        <strong title={view.title}>{view.title}</strong>
        <em>{view.price}</em>
      </div>
      {onReplace ? (
        <button
          type="button"
          className="compare-investor__replace"
          onClick={() => onReplace(side)}
          aria-label={t('comparePage_replaceAria', { label, title: view.title })}
        >
          <FiRefreshCw aria-hidden />
          <span>{t('comparePage_replace')}</span>
        </button>
      ) : null}
    </article>
  )
}

function PointValue({ row, side, objectTitle }) {
  const { t } = useTranslation()
  const isWinner = !row.displayOnly && row.winner === side
  const isTie = !row.displayOnly && row.winner === 'tie'
  const value = row[side]
  const classes = [
    'compare-investor-point__value',
    isWinner && 'compare-investor-point__value--win',
    isTie && 'compare-investor-point__value--tie',
    row.displayOnly && 'compare-investor-point__value--plain',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      aria-label={`${objectTitle}: ${value}${isWinner ? t('comparePage_strongerAriaSuffix') : ''}`}
    >
      <span>{value}</span>
      {isWinner ? <small>{t('comparePage_stronger')}</small> : null}
    </div>
  )
}

function MetricGroups({ rows, leftTitle, rightTitle }) {
  const { t } = useTranslation()
  const noData = t('comparePage_noData')
  const dash = t('comparePage_dash')
  const groupedRows = rows.reduce((groups, row) => {
    const group = METRIC_GROUP_DEFS.find((candidate) => candidate.rows.includes(row.id))
    const groupId = group?.id || 'property'
    const list = groups.get(groupId) || []
    list.push(row)
    groups.set(groupId, list)
    return groups
  }, new Map())

  return (
    <div className="compare-investor__metrics">
      {METRIC_GROUP_DEFS.map((group) => {
        const groupRows = groupedRows.get(group.id) || []
        if (groupRows.length === 0) return null
        const hasIncompleteData = groupRows.some((row) => (
          row.left === dash || row.right === dash || row.left === noData || row.right === noData
        ))
        return (
          <section className="compare-investor-group" key={group.id} aria-labelledby={`compare-panel-group-${group.id}`}>
            <div className="compare-investor-group__head">
              <h3 id={`compare-panel-group-${group.id}`}>{t(group.labelKey)}</h3>
              {hasIncompleteData ? <span>{t('comparePage_incompleteFields')}</span> : null}
            </div>
            <div className="compare-investor-group__rows">
              {groupRows.map((row) => (
                <article className="compare-investor-point" key={row.id}>
                  <h4>{row.label}</h4>
                  <div className="compare-investor-point__values">
                    <PointValue row={row} side="left" objectTitle={leftTitle} />
                    <PointValue row={row} side="right" objectTitle={rightTitle} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function leadCopy(summary, t) {
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

export default function CompareInvestorResults({
  pair,
  rows = [],
  onReplace,
  aiResult,
  aiLoading,
  aiError,
  onRunAi,
}) {
  const { t } = useTranslation()
  const summary = useMemo(() => summarizeComparisonRows(rows), [rows])
  const aiScores = useMemo(
    () => {
      const aiRows = aiResult?.rows || []
      let left = 0
      let right = 0
      let tie = 0
      for (const row of aiRows) {
        if (row.winner === 'left') left += 1
        else if (row.winner === 'right') right += 1
        else if (row.winner === 'tie') tie += 1
      }
      return aiRows.length ? { left, right, tie } : null
    },
    [aiResult],
  )

  if (!pair) return null

  const leftView = propertyView(pair.left, 1, t)
  const rightView = propertyView(pair.right, 2, t)
  const hasAi = Boolean(aiResult?.summary || aiResult?.rows?.length)

  return (
    <section className="compare-investor" aria-labelledby="compare-investor-title">
      <header className="compare-investor__intro">
        <span className="compare-investor__eyebrow">
          <HiOutlineSparkles aria-hidden />
          {t('comparePage_investorResultEyebrow')}
        </span>
        <h2 id="compare-investor-title">{t('comparePage_investorResultTitle')}</h2>
        <p>{t('comparePage_investorResultLead')}</p>
      </header>

      <div className="compare-investor__pair">
        <ObjectHeader item={pair.left} side="left" index={1} onReplace={onReplace} />
        <ObjectHeader item={pair.right} side="right" index={2} onReplace={onReplace} />
      </div>

      <p className="compare-investor__lead">{leadCopy(summary, t)}</p>

      <MetricGroups rows={rows} leftTitle={leftView.title} rightTitle={rightView.title} />

      <div className="compare-investor__toolbar">
        <button
          type="button"
          className="compare-investor__run"
          onClick={onRunAi}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <>
              <FiLoader className="compare-investor-card__spin" aria-hidden />
              {t('comparePage_aiLoading')}
            </>
          ) : (
            <>
              <HiOutlineSparkles aria-hidden />
              {hasAi ? t('comparePage_aiRefresh') : t('comparePage_aiGet')}
            </>
          )}
        </button>
      </div>

      {aiLoading ? (
        <p className="compare-investor__status" role="status" aria-live="polite">
          {t('comparePage_aiLoading')}
        </p>
      ) : null}

      {aiError && !aiLoading ? (
        <div className="compare-investor__error" role="alert">
          <span>{aiError}</span>
          <button type="button" onClick={onRunAi}>{t('comparePage_aiRetry')}</button>
        </div>
      ) : null}

      {!aiLoading && !aiError && !hasAi ? (
        <div className="compare-investor__idle">
          <strong>{t('comparePage_aiIdleStrong')}</strong>
          <span>{t('comparePage_aiIdleText')}</span>
        </div>
      ) : null}

      {!aiLoading && aiResult?.summary ? (
        <div className="compare-investor__summary">
          <p>{aiResult.summary}</p>
        </div>
      ) : null}

      {!aiLoading && aiResult?.rows?.length > 0 ? (
        <div className="compare-investor__ai-list">
          {aiResult.rows.map((row, idx) => (
            <article className="compare-investor-point" key={`${row.aspect}-${idx}`}>
              <h4>{row.aspect}</h4>
              <div className="compare-investor-point__values">
                <div className={row.winner === 'left' ? 'compare-investor-point__value compare-investor-point__value--win' : 'compare-investor-point__value'}>
                  <small>{t('comparePage_object1')}</small>
                  <span>{row.left}</span>
                </div>
                <div className={row.winner === 'right' ? 'compare-investor-point__value compare-investor-point__value--win' : 'compare-investor-point__value'}>
                  <small>{t('comparePage_object2')}</small>
                  <span>{row.right}</span>
                </div>
              </div>
            </article>
          ))}
          {aiScores ? (
            <p className="compare-investor__ai-score">
              {t('comparePage_aiMobileScore', { left: aiScores.left, right: aiScores.right })}
              {aiScores.tie > 0 ? t('comparePage_aiMobileScoreTie', { tie: aiScores.tie }) : ''}.
            </p>
          ) : null}
        </div>
      ) : null}

      {!aiLoading && aiResult && !aiResult.rows?.length && aiResult.summary ? (
        <p className="compare-investor__status">{t('comparePage_aiNote')}</p>
      ) : null}

      <p className="compare-investor__disclaimer">{t('comparePage_aiDisclaimer')}</p>
    </section>
  )
}
