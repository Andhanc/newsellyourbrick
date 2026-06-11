import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EyeOff, Gavel, Shield, Sparkles, TrendingUp } from 'lucide-react'
import { getCeilingRange } from '../utils/auctionBidCeilingSimulation'
import { getUserBidCeilingHistory } from '../utils/auctionBidCeilingUserBids'
import './AuctionBidCeilingChart.css'

export default function AuctionBidCeilingChart({
  currentBid,
  ceiling,
  fmtPrice,
  currencySymbol = '€',
  bids = [],
  userId,
  isUserLeader = false,
  formatDateTime,
}) {
  const { t } = useTranslation()

  const range = useMemo(() => getCeilingRange(currentBid, ceiling), [currentBid, ceiling])

  const userBids = useMemo(
    () => getUserBidCeilingHistory(bids, userId, range.current, isUserLeader),
    [bids, userId, range.current, isUserLeader],
  )

  const fmt = (value) =>
    fmtPrice ? fmtPrice(value) : `${Math.round(value).toLocaleString()} ${currencySymbol}`

  const hasRange = range.max > range.current

  const statusLabel = (status) => {
    if (status === 'leading') return t('auctionBidCeilingBidStatusLeading')
    if (status === 'outbid') return t('auctionBidCeilingBidStatusOutbid')
    return t('auctionBidCeilingBidStatusActive')
  }

  return (
    <div className="abc-chart">
      <header className="abc-chart__header">
        <div className="abc-chart__header-glow" aria-hidden />
        <div className="abc-chart__header-inner">
          <span className="abc-chart__badge">
            <Sparkles size={13} aria-hidden />
            {t('auctionBidCeilingBadge')}
          </span>
          <h2 className="abc-chart__title">{t('auctionBidCeilingChartTitle')}</h2>
          <p className="abc-chart__lead">{t('auctionBidCeilingChartLead')}</p>
        </div>
      </header>

      <div className="abc-chart__body">
        <section className="abc-chart__meter" aria-label={t('auctionBidCeilingChartRangeTitle')}>
          {hasRange ? (
            <>
              <div className="abc-chart__meter-grid">
                <div className="abc-chart__metric">
                  <span className="abc-chart__metric-label">{t('auctionBidCeilingChartNowLabel')}</span>
                  <span className="abc-chart__metric-value">{fmt(range.current)}</span>
                </div>
                <div className="abc-chart__metric abc-chart__metric--hero">
                  <span className="abc-chart__metric-label">
                    {t('auctionBidCeilingChartHeadroomLabel')}
                  </span>
                  <span className="abc-chart__metric-value abc-chart__metric-value--hero">
                    <TrendingUp size={16} aria-hidden />
                    {fmt(range.headroom)}
                  </span>
                </div>
                <div className="abc-chart__metric abc-chart__metric--right">
                  <span className="abc-chart__metric-label">
                    {t('auctionBidCeilingChartCeilingLabel')}
                  </span>
                  <span className="abc-chart__metric-value abc-chart__metric-value--ceiling">
                    {fmt(range.max)}
                  </span>
                </div>
              </div>

              <div className="abc-chart__bridge" aria-hidden>
                <div className="abc-chart__bridge-node abc-chart__bridge-node--start">
                  <span className="abc-chart__bridge-dot" />
                  <span className="abc-chart__bridge-caption">{t('auctionBidCeilingChartNowLabel')}</span>
                </div>
                <div className="abc-chart__bridge-track">
                  <div className="abc-chart__bridge-fill" />
                  <div className="abc-chart__bridge-shimmer" />
                </div>
                <div className="abc-chart__bridge-node abc-chart__bridge-node--end">
                  <span className="abc-chart__bridge-dot abc-chart__bridge-dot--ceiling">
                    <Shield size={14} aria-hidden />
                  </span>
                  <span className="abc-chart__bridge-caption">
                    {t('auctionBidCeilingChartCeilingLabel')}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="abc-chart__no-range">{t('auctionBidCeilingChartNoRange')}</p>
          )}
        </section>

        <ul className="abc-chart__features">
          <li className="abc-chart__feature">
            <span className="abc-chart__feature-icon abc-chart__feature-icon--auto" aria-hidden>
              <Gavel size={17} />
            </span>
            <div>
              <strong>{t('auctionBidCeilingChartInsightAuto')}</strong>
              <p>{t('auctionBidCeilingChartInsightAutoText')}</p>
            </div>
          </li>
          <li className="abc-chart__feature">
            <span className="abc-chart__feature-icon abc-chart__feature-icon--hidden" aria-hidden>
              <EyeOff size={17} />
            </span>
            <div>
              <strong>{t('auctionBidCeilingChartInsightHidden')}</strong>
              <p>{t('auctionBidCeilingChartInsightHiddenText')}</p>
            </div>
          </li>
        </ul>

        <section className="abc-chart__history" aria-labelledby="abc-chart-history-title">
          <div className="abc-chart__history-head">
            <h3 id="abc-chart-history-title">{t('auctionBidCeilingChartHistoryTitle')}</h3>
            <p>{t('auctionBidCeilingChartHistoryLead')}</p>
          </div>

          {userBids.length > 0 ? (
            <ol className="abc-chart__timeline">
              {userBids.map((bid, index) => (
                <li
                  key={bid.id}
                  className={`abc-chart__timeline-item abc-chart__timeline-item--${bid.status}`}
                >
                  <span className="abc-chart__timeline-marker" aria-hidden />
                  <div className="abc-chart__timeline-card">
                    <div className="abc-chart__timeline-main">
                      <span className="abc-chart__timeline-amount">{fmt(bid.amount)}</span>
                      <span className="abc-chart__timeline-time">
                        {formatDateTime ? formatDateTime(bid.createdAt) : ''}
                      </span>
                    </div>
                    <div className="abc-chart__timeline-meta">
                      {bid.fromCeiling ? (
                        <span className="abc-chart__timeline-tag">{t('auctionBidCeilingChartBidAuto')}</span>
                      ) : null}
                      <span className={`abc-chart__timeline-status abc-chart__timeline-status--${bid.status}`}>
                        {statusLabel(bid.status)}
                      </span>
                    </div>
                  </div>
                  {index < userBids.length - 1 ? (
                    <span className="abc-chart__timeline-line" aria-hidden />
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="abc-chart__history-empty" role="status">
              {t('auctionBidCeilingChartHistoryEmpty')}
            </p>
          )}
        </section>

        <p className="abc-chart__footnote" role="note">
          {t('auctionBidCeilingChartNote')}
        </p>
      </div>
    </div>
  )
}
