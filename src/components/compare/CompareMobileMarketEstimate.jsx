import { useTranslation } from 'react-i18next'
import { FiBarChart2, FiLoader } from 'react-icons/fi'
import './CompareMobileMarketEstimate.css'

function propertyName(item, fallback) {
  return item?.property?.name || item?.property?.title || fallback
}

function ResultValue({ value, pending, error }) {
  const { t } = useTranslation()
  if (pending) {
    return (
      <span className="compare-market__pending">
        <FiLoader aria-hidden="true" />
        {t('comparePage_calcPending')}
      </span>
    )
  }
  if (error) return <span className="compare-market__error">{error}</span>
  return <strong>{value}</strong>
}

function SimilarProperties({ title, items, dataReady, loading, dash, formatValue }) {
  const { t } = useTranslation()
  return (
    <section className="compare-market__similar-col">
      <h4>{title}</h4>
      {items?.length ? (
        <ul>
          {items.slice(0, 4).map((property, index) => (
            <li key={property.link || `${title}-${index}`}>
              <strong>{formatValue(property.price, dash)}</strong>
              <span>
                {property.area ? t('comparePage_areaM2', { area: property.area }) : ''}
                {property.rooms != null
                  ? `${property.area ? ' · ' : ''}${t('comparePage_similarRooms', { count: property.rooms })}`
                  : ''}
              </span>
              {property.source ? <small>{property.source}</small> : null}
            </li>
          ))}
        </ul>
      ) : dataReady ? (
        <p>{t('comparePage_similarEmpty')}</p>
      ) : (
        !loading && <p>{dash}</p>
      )}
    </section>
  )
}

export default function CompareMobileMarketEstimate({
  pair,
  calcLoading,
  calcData,
  calcError,
  dash,
  formatValue,
}) {
  const { t } = useTranslation()
  const hasResults = Boolean(calcLoading || calcData.left || calcData.right || calcError.left || calcError.right)
  const leftName = propertyName(pair?.left, t('comparePage_object1'))
  const rightName = propertyName(pair?.right, t('comparePage_object2'))
  const rows = [
    {
      id: 'price',
      label: t('comparePage_calcRecommendedPrice'),
      left: formatValue(calcData.left?.recommendedPrice, dash, calcData.left?.currency),
      right: formatValue(calcData.right?.recommendedPrice, dash, calcData.right?.currency),
    },
    {
      id: 'sqm',
      label: t('comparePage_calcPricePerSqm'),
      left: formatValue(calcData.left?.recommendedPricePerSqm, dash, calcData.left?.currency),
      right: formatValue(calcData.right?.recommendedPricePerSqm, dash, calcData.right?.currency),
    },
    {
      id: 'sources',
      label: t('comparePage_calcSources'),
      left: calcData.left?.searchParams?.sources?.length ? calcData.left.searchParams.sources.join(', ') : dash,
      right: calcData.right?.searchParams?.sources?.length ? calcData.right.searchParams.sources.join(', ') : dash,
    },
  ]

  return (
    <section className="compare-market" aria-labelledby="compare-market-title">
      <header className="compare-market__header">
        <span className="compare-market__icon" aria-hidden="true"><FiBarChart2 /></span>
        <div>
          <span className="compare-market__eyebrow">{t('comparePage_marketEyebrow')}</span>
          <h2 id="compare-market-title">{t('comparePage_calcResultsTitle')}</h2>
        </div>
      </header>

      <p className="compare-market__intro">{t('comparePage_marketIntro')}</p>

      {hasResults ? (
        <div className="compare-market__results" aria-live="polite">
          <div className="compare-market__objects">
            <span><b>1</b>{leftName}</span>
            <span><b>2</b>{rightName}</span>
          </div>

          <div className="compare-market__rows">
            {rows.map((row) => (
              <article className="compare-market__row" key={row.id}>
                <h3>{row.label}</h3>
                <div className="compare-market__values">
                  <div aria-label={`${leftName}: ${row.left}`}>
                    <ResultValue
                      value={row.left}
                      pending={row.id === 'price' && calcLoading && !calcData.left}
                      error={row.id === 'price' ? calcError.left : null}
                    />
                  </div>
                  <div aria-label={`${rightName}: ${row.right}`}>
                    <ResultValue
                      value={row.right}
                      pending={row.id === 'price' && calcLoading && !calcData.right}
                      error={row.id === 'price' ? calcError.right : null}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {(calcData.left?.note || calcData.right?.note) ? (
            <div className="compare-market__notes">
              <h3>{t('comparePage_calcNote')}</h3>
              {calcData.left?.note ? <p><b>1</b>{calcData.left.note}</p> : null}
              {calcData.right?.note ? <p><b>2</b>{calcData.right.note}</p> : null}
            </div>
          ) : null}

          <div className="compare-market__similar">
            <SimilarProperties
              title={t('comparePage_similarLeft')}
              items={calcData.left?.similarProperties}
              dataReady={Boolean(calcData.left && !calcError.left)}
              loading={calcLoading}
              dash={dash}
              formatValue={formatValue}
            />
            <SimilarProperties
              title={t('comparePage_similarRight')}
              items={calcData.right?.similarProperties}
              dataReady={Boolean(calcData.right && !calcError.right)}
              loading={calcLoading}
              dash={dash}
              formatValue={formatValue}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
