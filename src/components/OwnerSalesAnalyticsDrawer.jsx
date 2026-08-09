import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeEuro,
  BellRing,
  Building2,
  Eye,
  Gavel,
  Heart,
  Percent,
  Trophy,
  UserRound,
  X,
} from 'lucide-react'
import OwnerEmptyPropertiesIllustration from './OwnerEmptyPropertiesIllustration'
import './OwnerSalesAnalyticsDrawer.css'

const MONTH_COUNT = 6
const TYPE_ORDER = ['auction', 'buy_now', 'shares', 'debts']
const TYPE_META = {
  auction: { labelKey: 'osa_typeAuction', color: '#3bc0cb' },
  buy_now: { labelKey: 'osa_typeBuyNow', color: '#23d49a' },
  shares: { labelKey: 'osa_typeShares', color: '#ffca28' },
  debts: { labelKey: 'osa_typeDebts', color: '#ff4e58' },
}

function finiteNumber(...values) {
  for (const value of values) {
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return 0
}

function validDate(...values) {
  for (const value of values) {
    if (!value) continue
    const date = new Date(value)
    if (Number.isFinite(date.getTime())) return date
  }
  return null
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function buildMonths(locale) {
  const now = new Date()
  return Array.from({ length: MONTH_COUNT }, (_, index) => {
    const offset = MONTH_COUNT - 1 - index
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    return {
      key: monthKey(date),
      label: new Intl.DateTimeFormat(locale, { month: 'short' })
        .format(date)
        .replace('.', ''),
      value: 0,
    }
  })
}

function formatMoney(value, currency, locale, compact = false) {
  const amount = Number(value) || 0
  const useCompact = compact && Math.abs(amount) >= 100000
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: useCompact ? 'compact' : 'standard',
      maximumFractionDigits: useCompact ? 1 : 0,
    }).format(amount)
  } catch {
    return `${Math.round(amount).toLocaleString(locale)} ${currency}`
  }
}

function getBidAmount(row) {
  return finiteNumber(row?.bid_amount, row?.bidAmount, row?.amount, row?.value)
}

function getBidDate(row) {
  return validDate(row?.created_at, row?.createdAt, row?.bid_date, row?.date)
}

function getSaleDate(row) {
  const raw = row?.raw || {}
  return validDate(
    raw.sold_at,
    raw.sale_date,
    raw.purchased_at,
    raw.purchase_date,
    raw.closed_at,
    raw.updated_at,
    row?.auctionEndTime,
  )
}

function formatBidDate(value, locale) {
  const date = validDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function isSoldProperty(row) {
  const raw = row?.raw || {}
  const status = String(raw.status || raw.sale_status || raw.purchase_status || '').toLowerCase()
  return (
    row?.statusKey === 'sold' ||
    row?.filterKey === 'sold' ||
    raw.is_sold === true ||
    raw.is_sold === 1 ||
    Boolean(raw.sold_at || raw.sale_date || raw.purchased_at) ||
    ['sold', 'completed', 'purchased', 'closed'].includes(status)
  )
}

function buildDonutGradient(items, total) {
  if (!total) return 'conic-gradient(#e7ebf1 0deg 360deg)'
  const parts = []
  let cursor = 0
  items.forEach((item) => {
    if (!item.count) return
    const span = (item.count / total) * 360
    const end = cursor + span
    const gap = Math.min(2.6, span * 0.12)
    parts.push(`transparent ${cursor}deg ${cursor + gap}deg`)
    parts.push(`${item.color} ${cursor + gap}deg ${Math.max(cursor + gap, end - gap)}deg`)
    parts.push(`transparent ${Math.max(cursor + gap, end - gap)}deg ${end}deg`)
    cursor = end
  })
  return `conic-gradient(${parts.join(', ')})`
}

export default function OwnerSalesAnalyticsDrawer({
  open,
  onClose,
  properties = [],
  bids = [],
  locale = 'ru-RU',
  language = 'ru',
  loading = false,
}) {
  const { t } = useTranslation()
  const closeRef = useRef(null)
  const [activeTab, setActiveTab] = useState('sales')

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus())
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [onClose, open])

  const analytics = useMemo(() => {
    const sold = properties.filter(isSoldProperty)
    const currency = String(
      sold[0]?.currency || properties[0]?.currency || bids[0]?.propertyCurrency || 'EUR'
    ).toUpperCase()
    const months = buildMonths(locale)
    const values = new Map(months.map((month) => [month.key, 0]))

    bids.forEach((bid) => {
      const date = getBidDate(bid)
      if (!date) return
      const key = monthKey(date)
      if (!values.has(key)) return
      values.set(key, values.get(key) + getBidAmount(bid))
    })

    sold.forEach((property) => {
      const date = getSaleDate(property) || new Date()
      const key = monthKey(date)
      if (!values.has(key)) return
      values.set(key, values.get(key) + finiteNumber(property.priceAmount, property.raw?.price))
    })

    const monthly = months.map((month) => ({ ...month, value: values.get(month.key) || 0 }))
    const maxMonth = Math.max(1, ...monthly.map((month) => month.value))
    const currentAmount = monthly.at(-1)?.value || 0
    const previousAmount = monthly.at(-2)?.value || 0
    const delta = previousAmount > 0
      ? ((currentAmount - previousAmount) / previousAmount) * 100
      : currentAmount > 0 ? 100 : 0
    const nowKey = monthKey(new Date())
    const currentMonthBids = bids.filter((bid) => {
      const date = getBidDate(bid)
      return date && monthKey(date) === nowKey
    })
    const maxBid = Math.max(0, ...bids.map(getBidAmount))
    const saleTotal = sold.reduce(
      (sum, row) => sum + finiteNumber(row.priceAmount, row.raw?.price),
      0,
    )

    const types = TYPE_ORDER.map((key) => ({
      key,
      label: t(TYPE_META[key].labelKey),
      color: TYPE_META[key].color,
      count: sold.filter((row) => row.listingType === key).length,
    }))
    const topType = [...types].sort((a, b) => b.count - a.count)[0]

    const reachRows = properties
      .map((property) => {
        const views = finiteNumber(
          property.viewsValue,
          property.viewsCount,
          property.views_count,
          property.raw?.view_count,
          property.raw?.views_count,
        )
        const likes = finiteNumber(
          property.likesValue,
          property.likesCount,
          property.likes_count,
          property.raw?.likes_count,
          property.raw?.favorites_count,
        )
        return { ...property, reachViews: views, reachLikes: likes, popularity: views + likes }
      })
      .sort((a, b) => b.popularity - a.popularity)

    const bidFeed = bids
      .map((bid, index) => ({
        ...bid,
        feedId: bid.id || `${bid.propertyId || bid.property_id}-${getBidDate(bid)?.getTime() || index}-${getBidAmount(bid)}`,
        feedDate: getBidDate(bid),
      }))
      .sort((a, b) => (b.feedDate?.getTime() || 0) - (a.feedDate?.getTime() || 0))

    return {
      currency,
      monthly,
      maxMonth,
      currentAmount,
      delta,
      sold,
      types,
      donut: buildDonutGradient(types, sold.length),
      averageSale: sold.length ? saleTotal / sold.length : 0,
      currentMonthBidCount: currentMonthBids.length,
      maxBid,
      conversion: properties.length ? (sold.length / properties.length) * 100 : 0,
      topType: topType?.count ? topType : null,
      totalViews: reachRows.reduce((sum, row) => sum + row.reachViews, 0),
      totalLikes: reachRows.reduce((sum, row) => sum + row.reachLikes, 0),
      popular: reachRows.slice(0, 5),
      bidFeed,
    }
  }, [bids, locale, properties, t])

  if (!open || typeof document === 'undefined') return null

  const positiveDelta = analytics.delta >= 0
  const DeltaIcon = positiveDelta ? ArrowUpRight : ArrowDownRight

  return createPortal(
    <div className="osa" role="presentation">
      <div
        className="osa__backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.()
        }}
      />
      <section
        className="osa__drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="osa-title"
      >
        <div className="osa__handle" aria-hidden><span /></div>
        <header className="osa__header">
          <div>
            <span className="osa__eyebrow">{t('osa_eyebrow')}</span>
            <h2 id="osa-title">{t('osa_title')}</h2>
          </div>
          <button ref={closeRef} type="button" className="osa__close" onClick={onClose} aria-label={t('osa_close')}>
            <X size={21} aria-hidden />
          </button>
        </header>

        <div className="osa__tabs" role="tablist" aria-label={t('osa_tabsAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sales'}
            className={`osa__tab${activeTab === 'sales' ? ' osa__tab--active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            {t('osa_tabSales')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reach'}
            className={`osa__tab${activeTab === 'reach' ? ' osa__tab--active' : ''}`}
            onClick={() => setActiveTab('reach')}
          >
            {t('osa_tabReach')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bids'}
            className={`osa__tab${activeTab === 'bids' ? ' osa__tab--active' : ''}`}
            onClick={() => setActiveTab('bids')}
          >
            {t('osa_tabBids')}
          </button>
        </div>

        <div className="osa__scroll" role="tabpanel">
          {!loading && properties.length === 0 ? (
            <div className="osa__empty-state osa__empty-state--illustrated">
              <OwnerEmptyPropertiesIllustration className="osa__empty-art" />
              <strong>{t('osa_emptyTitle')}</strong>
              <span>
                {t('osa_emptyText')}
              </span>
            </div>
          ) : null}

          {properties.length > 0 && activeTab === 'sales' ? (
            <>
          <section className="osa__income-card" aria-labelledby="osa-income-title">
            <div className="osa__income-head">
              <div>
                <span>{t('osa_receivedMonth')}</span>
                <strong id="osa-income-title">
                  {loading ? '—' : formatMoney(analytics.currentAmount, analytics.currency, locale, true)}
                </strong>
                <small className={positiveDelta ? 'osa__delta osa__delta--up' : 'osa__delta osa__delta--down'}>
                  <DeltaIcon size={14} aria-hidden />
                  {Math.abs(analytics.delta).toLocaleString(locale, { maximumFractionDigits: 1 })}%
                  <em>{t('osa_vsPrevMonth')}</em>
                </small>
              </div>
              <span className="osa__income-icon" aria-hidden><BadgeEuro size={22} /></span>
            </div>

            <div className="osa__bar-chart" aria-label={t('osa_monthlyIncome')}>
              {analytics.monthly.map((month, index) => {
                const height = month.value > 0
                  ? Math.max(14, Math.round((month.value / analytics.maxMonth) * 100))
                  : 8
                const current = index === analytics.monthly.length - 1
                return (
                  <div className="osa__bar-column" key={month.key}>
                    <span className="osa__bar-track">
                      <i
                        className={current ? 'osa__bar osa__bar--current' : 'osa__bar'}
                        style={{ '--osa-bar-height': `${height}%` }}
                        title={formatMoney(month.value, analytics.currency, locale)}
                      />
                    </span>
                    <small>{month.label}</small>
                  </div>
                )
              })}
            </div>
            <p className="osa__income-note">
              {t('osa_bidsSalesCombined')}
            </p>
          </section>

          <section className="osa__mix-card" aria-labelledby="osa-mix-title">
            <div className="osa__section-heading">
              <div>
                <span>{t('osa_salesMix')}</span>
                <h3 id="osa-mix-title">{t('osa_whatSelling')}</h3>
              </div>
              <strong>{analytics.sold.length}</strong>
            </div>

            <div className="osa__donut-wrap">
              <div className="osa__donut" style={{ '--osa-donut': analytics.donut }} aria-hidden>
                <div className="osa__donut-center">
                  <strong>{analytics.sold.length}</strong>
                  <span>{t('osa_sold')}</span>
                </div>
              </div>
              <div className="osa__legend">
                {analytics.types.map((type) => (
                  <div key={type.key}>
                    <span style={{ '--osa-type-color': type.color }} />
                    <small>{type.label}</small>
                    <strong>{type.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="osa__metrics" aria-labelledby="osa-metrics-title">
            <div className="osa__section-heading">
              <div>
                <span>{t('osa_usefulNumbers')}</span>
                <h3 id="osa-metrics-title">{t('osa_salesPerf')}</h3>
              </div>
            </div>

            <div className="osa__metric-grid">
              <article>
                <span><Building2 size={17} aria-hidden /></span>
                <small>{t('osa_soldProps')}</small>
                <strong>{analytics.sold.length}</strong>
              </article>
              <article>
                <span><BadgeEuro size={17} aria-hidden /></span>
                <small>{t('osa_avgSale')}</small>
                <strong>{formatMoney(analytics.averageSale, analytics.currency, locale, true)}</strong>
              </article>
              <article>
                <span><Gavel size={17} aria-hidden /></span>
                <small>{t('osa_bidsMonth')}</small>
                <strong>{analytics.currentMonthBidCount}</strong>
              </article>
              <article>
                <span><Percent size={17} aria-hidden /></span>
                <small>{t('osa_conversion')}</small>
                <strong>{analytics.conversion.toLocaleString(locale, { maximumFractionDigits: 1 })}%</strong>
              </article>
            </div>

            <div className="osa__insight">
              <span>{t('osa_highestBid')}</span>
              <strong>{formatMoney(analytics.maxBid, analytics.currency, locale, true)}</strong>
              <small>
                {analytics.topType
                  ? `${t('osa_topType')} — ${analytics.topType.label}`
                  : t('osa_afterFirstSale')}
              </small>
            </div>
          </section>
            </>
          ) : null}

          {properties.length > 0 && activeTab === 'reach' ? (
            <>
              <section className="osa__reach-summary" aria-labelledby="osa-reach-title">
                <div className="osa__section-heading">
                  <div>
                    <span>{t('osa_totalAudience')}</span>
                    <h3 id="osa-reach-title">{t('osa_propertyReach')}</h3>
                  </div>
                </div>
                <div className="osa__reach-grid">
                  <article>
                    <span className="osa__reach-icon"><Eye size={20} aria-hidden /></span>
                    <small>{t('osa_views')}</small>
                    <strong>{loading ? '—' : analytics.totalViews.toLocaleString(locale)}</strong>
                  </article>
                  <article>
                    <span className="osa__reach-icon osa__reach-icon--likes"><Heart size={20} aria-hidden /></span>
                    <small>{t('osa_likes')}</small>
                    <strong>{loading ? '—' : analytics.totalLikes.toLocaleString(locale)}</strong>
                  </article>
                </div>
              </section>

              <section className="osa__popular" aria-labelledby="osa-popular-title">
                <div className="osa__section-heading">
                  <div>
                    <span>{t('osa_byViewsLikes')}</span>
                    <h3 id="osa-popular-title">{t('osa_top5')}</h3>
                  </div>
                  <span className="osa__popular-trophy"><Trophy size={18} aria-hidden /></span>
                </div>
                {analytics.popular.length ? (
                  <div className="osa__popular-list">
                    {analytics.popular.map((property, index) => (
                      <article className="osa__popular-row" key={property.statsKey || property.id || index}>
                        <span className={`osa__popular-rank${index === 0 ? ' osa__popular-rank--first' : ''}`}>{index + 1}</span>
                        <img
                          src={property.image || '/images/external/photo-1568605114967-8130f3a36994-bc29e86e2f.jpg'}
                          alt=""
                        />
                        <div className="osa__popular-copy">
                          <strong>{property.title || (t('osa_propertyNumber', { id: property.id }))}</strong>
                          <span>{property.location || property.address || (t('osa_propertyFallback'))}</span>
                        </div>
                        <div className="osa__popular-stats">
                          <span><Eye size={13} aria-hidden />{property.reachViews.toLocaleString(locale)}</span>
                          <span><Heart size={13} aria-hidden />{property.reachLikes.toLocaleString(locale)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="osa__empty-state">
                    <Eye size={25} aria-hidden />
                    <strong>{t('osa_noReach')}</strong>
                  </div>
                )}
              </section>
            </>
          ) : null}

          {properties.length > 0 && activeTab === 'bids' ? (
            <section className="osa__bids" aria-labelledby="osa-bids-title">
              <div className="osa__bids-head">
                <span className="osa__bids-icon"><BellRing size={21} aria-hidden /></span>
                <div>
                  <span>{t('osa_allProperties')}</span>
                  <h3 id="osa-bids-title">{t('osa_bidNotices')}</h3>
                </div>
                <strong>{analytics.bidFeed.length}</strong>
              </div>

              {analytics.bidFeed.length ? (
                <div className="osa__bid-list">
                  {analytics.bidFeed.map((bid) => {
                    const buyerId = bid.user_id_number || bid.user_id
                    const propertyId = bid.propertyId || bid.property_id
                    const title = bid.propertyTitle || (t('osa_propertyNumber', { id: propertyId }))
                    return (
                      <article className="osa__bid-row" key={bid.feedId}>
                        <span className="osa__bid-avatar"><UserRound size={19} aria-hidden /></span>
                        <div className="osa__bid-copy">
                          <span>{t('osa_newBid')}<i /></span>
                          <strong>{title}</strong>
                          <small>
                            {buyerId ? (t('osa_bidder', { id: buyerId })) : (t('osa_auctionBidder'))}
                            {' · '}{formatBidDate(bid.feedDate, locale)}
                          </small>
                        </div>
                        <strong className="osa__bid-amount">
                          {formatMoney(getBidAmount(bid), bid.propertyCurrency || 'EUR', locale)}
                        </strong>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="osa__empty-state osa__empty-state--bids">
                  <Gavel size={27} aria-hidden />
                  <strong>{t('osa_noBids')}</strong>
                  <span>{t('osa_noBidsHint')}</span>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  )
}
