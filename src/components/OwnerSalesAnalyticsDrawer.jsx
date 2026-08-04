import { useEffect, useMemo, useRef, useState } from 'react'
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
import './OwnerSalesAnalyticsDrawer.css'

const MONTH_COUNT = 6
const TYPE_ORDER = ['auction', 'buy_now', 'shares', 'debts']
const TYPE_META = {
  auction: { ru: 'Аукционы', en: 'Auctions', color: '#3bc0cb' },
  buy_now: { ru: 'Прямые продажи', en: 'Direct sales', color: '#23d49a' },
  shares: { ru: 'Доли', en: 'Shares', color: '#ffca28' },
  debts: { ru: 'Долги', en: 'Debts', color: '#ff4e58' },
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
  const closeRef = useRef(null)
  const [activeTab, setActiveTab] = useState('sales')
  const ru = String(language || '').startsWith('ru')

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
      label: ru ? TYPE_META[key].ru : TYPE_META[key].en,
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
  }, [bids, locale, properties, ru])

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
            <span className="osa__eyebrow">{ru ? 'Кабинет продавца' : 'Seller dashboard'}</span>
            <h2 id="osa-title">{ru ? 'Аналитика' : 'Analytics'}</h2>
          </div>
          <button ref={closeRef} type="button" className="osa__close" onClick={onClose} aria-label={ru ? 'Закрыть' : 'Close'}>
            <X size={21} aria-hidden />
          </button>
        </header>

        <div className="osa__tabs" role="tablist" aria-label={ru ? 'Раздел аналитики' : 'Analytics section'}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sales'}
            className={`osa__tab${activeTab === 'sales' ? ' osa__tab--active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            {ru ? 'Продажи' : 'Sales'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reach'}
            className={`osa__tab${activeTab === 'reach' ? ' osa__tab--active' : ''}`}
            onClick={() => setActiveTab('reach')}
          >
            {ru ? 'Охват' : 'Reach'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bids'}
            className={`osa__tab${activeTab === 'bids' ? ' osa__tab--active' : ''}`}
            onClick={() => setActiveTab('bids')}
          >
            {ru ? 'Ставки' : 'Bids'}
          </button>
        </div>

        <div className="osa__scroll" role="tabpanel">
          {activeTab === 'sales' ? (
            <>
          <section className="osa__income-card" aria-labelledby="osa-income-title">
            <div className="osa__income-head">
              <div>
                <span>{ru ? 'Получено за месяц' : 'Received this month'}</span>
                <strong id="osa-income-title">
                  {loading ? '—' : formatMoney(analytics.currentAmount, analytics.currency, locale, true)}
                </strong>
                <small className={positiveDelta ? 'osa__delta osa__delta--up' : 'osa__delta osa__delta--down'}>
                  <DeltaIcon size={14} aria-hidden />
                  {Math.abs(analytics.delta).toLocaleString(locale, { maximumFractionDigits: 1 })}%
                  <em>{ru ? ' к прошлому месяцу' : ' vs previous month'}</em>
                </small>
              </div>
              <span className="osa__income-icon" aria-hidden><BadgeEuro size={22} /></span>
            </div>

            <div className="osa__bar-chart" aria-label={ru ? 'Доход по месяцам' : 'Monthly income'}>
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
              {ru ? 'Сумма всех ставок и завершённых продаж' : 'All bids and completed sales combined'}
            </p>
          </section>

          <section className="osa__mix-card" aria-labelledby="osa-mix-title">
            <div className="osa__section-heading">
              <div>
                <span>{ru ? 'Структура продаж' : 'Sales mix'}</span>
                <h3 id="osa-mix-title">{ru ? 'Что продаётся' : 'What is selling'}</h3>
              </div>
              <strong>{analytics.sold.length}</strong>
            </div>

            <div className="osa__donut-wrap">
              <div className="osa__donut" style={{ '--osa-donut': analytics.donut }} aria-hidden>
                <div className="osa__donut-center">
                  <strong>{analytics.sold.length}</strong>
                  <span>{ru ? 'продано' : 'sold'}</span>
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
                <span>{ru ? 'Полезные цифры' : 'Useful numbers'}</span>
                <h3 id="osa-metrics-title">{ru ? 'Эффективность продаж' : 'Sales performance'}</h3>
              </div>
            </div>

            <div className="osa__metric-grid">
              <article>
                <span><Building2 size={17} aria-hidden /></span>
                <small>{ru ? 'Продано объектов' : 'Properties sold'}</small>
                <strong>{analytics.sold.length}</strong>
              </article>
              <article>
                <span><BadgeEuro size={17} aria-hidden /></span>
                <small>{ru ? 'Средний чек' : 'Average sale'}</small>
                <strong>{formatMoney(analytics.averageSale, analytics.currency, locale, true)}</strong>
              </article>
              <article>
                <span><Gavel size={17} aria-hidden /></span>
                <small>{ru ? 'Ставок за месяц' : 'Bids this month'}</small>
                <strong>{analytics.currentMonthBidCount}</strong>
              </article>
              <article>
                <span><Percent size={17} aria-hidden /></span>
                <small>{ru ? 'Конверсия в продажу' : 'Sales conversion'}</small>
                <strong>{analytics.conversion.toLocaleString(locale, { maximumFractionDigits: 1 })}%</strong>
              </article>
            </div>

            <div className="osa__insight">
              <span>{ru ? 'Максимальная ставка' : 'Highest bid'}</span>
              <strong>{formatMoney(analytics.maxBid, analytics.currency, locale, true)}</strong>
              <small>
                {analytics.topType
                  ? `${ru ? 'Лидер по продажам' : 'Top sales type'} — ${analytics.topType.label}`
                  : ru ? 'Данные появятся после первой продажи' : 'Data appears after the first sale'}
              </small>
            </div>
          </section>
            </>
          ) : null}

          {activeTab === 'reach' ? (
            <>
              <section className="osa__reach-summary" aria-labelledby="osa-reach-title">
                <div className="osa__section-heading">
                  <div>
                    <span>{ru ? 'Общая аудитория' : 'Total audience'}</span>
                    <h3 id="osa-reach-title">{ru ? 'Охват объектов' : 'Property reach'}</h3>
                  </div>
                </div>
                <div className="osa__reach-grid">
                  <article>
                    <span className="osa__reach-icon"><Eye size={20} aria-hidden /></span>
                    <small>{ru ? 'Просмотры' : 'Views'}</small>
                    <strong>{loading ? '—' : analytics.totalViews.toLocaleString(locale)}</strong>
                  </article>
                  <article>
                    <span className="osa__reach-icon osa__reach-icon--likes"><Heart size={20} aria-hidden /></span>
                    <small>{ru ? 'Лайки' : 'Likes'}</small>
                    <strong>{loading ? '—' : analytics.totalLikes.toLocaleString(locale)}</strong>
                  </article>
                </div>
              </section>

              <section className="osa__popular" aria-labelledby="osa-popular-title">
                <div className="osa__section-heading">
                  <div>
                    <span>{ru ? 'По просмотрам и лайкам' : 'By views and likes'}</span>
                    <h3 id="osa-popular-title">{ru ? 'Топ-5 популярных' : 'Top 5 popular'}</h3>
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
                          <strong>{property.title || (ru ? `Объект №${property.id}` : `Property #${property.id}`)}</strong>
                          <span>{property.location || property.address || (ru ? 'Объект недвижимости' : 'Property')}</span>
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
                    <strong>{ru ? 'Данных о просмотрах пока нет' : 'No reach data yet'}</strong>
                  </div>
                )}
              </section>
            </>
          ) : null}

          {activeTab === 'bids' ? (
            <section className="osa__bids" aria-labelledby="osa-bids-title">
              <div className="osa__bids-head">
                <span className="osa__bids-icon"><BellRing size={21} aria-hidden /></span>
                <div>
                  <span>{ru ? 'Все объекты' : 'All properties'}</span>
                  <h3 id="osa-bids-title">{ru ? 'Уведомления о ставках' : 'Bid notifications'}</h3>
                </div>
                <strong>{analytics.bidFeed.length}</strong>
              </div>

              {analytics.bidFeed.length ? (
                <div className="osa__bid-list">
                  {analytics.bidFeed.map((bid) => {
                    const buyerId = bid.user_id_number || bid.user_id
                    const propertyId = bid.propertyId || bid.property_id
                    const title = bid.propertyTitle || (ru ? `Объект №${propertyId}` : `Property #${propertyId}`)
                    return (
                      <article className="osa__bid-row" key={bid.feedId}>
                        <span className="osa__bid-avatar"><UserRound size={19} aria-hidden /></span>
                        <div className="osa__bid-copy">
                          <span>{ru ? 'Новая ставка' : 'New bid'}<i /></span>
                          <strong>{title}</strong>
                          <small>
                            {buyerId ? (ru ? `Участник #${buyerId}` : `Bidder #${buyerId}`) : (ru ? 'Участник аукциона' : 'Auction bidder')}
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
                  <strong>{ru ? 'Ставок пока нет' : 'No bids yet'}</strong>
                  <span>{ru ? 'Новые ставки появятся здесь' : 'New bids will appear here'}</span>
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
