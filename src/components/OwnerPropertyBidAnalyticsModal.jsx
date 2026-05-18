import { useEffect, useMemo, useState } from 'react'
import i18n from 'i18next'
import { useTranslation } from 'react-i18next'
import { FiBarChart2, FiX } from 'react-icons/fi'
import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import { PropertyBidAnalyticsChart } from './ui/property-bid-analytics-chart'
import BiddingHistoryPanel from './BiddingHistoryPanel'
import './ui/property-bid-analytics-chart.css'
import './OwnerPropertyBidAnalyticsModal.css'
import { getCurrencySymbol as getCurrencySymbolByCode } from '../utils/currency'

let API_BASE_URL = getApiBaseUrlSync()

function getCurrencySymbol(property) {
  return getCurrencySymbolByCode(property?.currency || 'USD')
}

function bidsToChartData(bids) {
  const sorted = [...bids].sort((a, b) => {
    const ta = new Date(a.created_at).getTime()
    const tb = new Date(b.created_at).getTime()
    return ta - tb
  })
  return sorted
    .filter((b) => b.created_at != null && b.bid_amount != null)
    .map((b) => ({
      time: typeof b.created_at === 'string' ? b.created_at : new Date(b.created_at).toISOString(),
      price: Number(b.bid_amount),
    }))
    .filter((row) => !Number.isNaN(row.price))
}

function parseTimeMs(value) {
  if (value == null || value === '') return NaN
  const raw = String(value).trim()
  if (!raw) return NaN
  let t = new Date(raw).getTime()
  if (!Number.isFinite(t)) {
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)/)
    if (m) t = new Date(`${m[1]}T${m[2]}`).getTime()
  }
  return t
}

function buildBidChartSeries(property, bids) {
  const bidPoints = bidsToChartData(bids)
  if (bidPoints.length === 0) return []

  const startingPriceRaw =
    property?.auction_starting_price ??
    property?.auctionStartingPrice ??
    property?.starting_price ??
    property?.startingPrice ??
    null

  let startPrice = Number(startingPriceRaw)
  if (!Number.isFinite(startPrice) || startPrice <= 0) {
    startPrice = bidPoints[0].price
  }

  const firstBidMs = parseTimeMs(bidPoints[0].time)
  if (!Number.isFinite(firstBidMs)) return bidPoints

  const auctionStartRaw =
    property?.auction_start_date ??
    property?.auctionStartDate ??
    property?.start_date ??
    property?.publishedDate ??
    property?.created_at ??
    null

  let anchorMs = parseTimeMs(auctionStartRaw)
  if (!Number.isFinite(anchorMs)) {
    anchorMs = firstBidMs - 60_000
  }
  if (anchorMs >= firstBidMs) {
    anchorMs = firstBidMs - 1000
  }

  const anchorPoint = {
    time: new Date(anchorMs).toISOString(),
    price: startPrice,
  }

  const out = [anchorPoint, ...bidPoints]
  for (let i = 1; i < out.length; i += 1) {
    const prev = parseTimeMs(out[i - 1].time)
    const cur = parseTimeMs(out[i].time)
    if (!Number.isFinite(cur) || cur <= prev) {
      out[i] = { ...out[i], time: new Date(prev + 1000).toISOString() }
    }
  }
  return out
}

function LoadingPanel({ message }) {
  return (
    <div className="owner-bid-analytics-modal__loading" aria-busy="true" aria-live="polite">
      <div className="owner-bid-analytics-modal__loading-shimmer" />
      <div className="owner-bid-analytics-modal__loading-rows">
        <span className="owner-bid-analytics-modal__loading-dot" />
        <span className="owner-bid-analytics-modal__loading-dot" />
        <span className="owner-bid-analytics-modal__loading-dot" />
      </div>
      <p className="owner-bid-analytics-modal__loading-text">{message}</p>
    </div>
  )
}

export default function OwnerPropertyBidAnalyticsModal({ isOpen, onClose, property }) {
  const { t } = useTranslation()
  const [subView, setSubView] = useState('history')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [points, setPoints] = useState([])

  useEffect(() => {
    const init = async () => {
      API_BASE_URL = await getApiBaseUrl()
    }
    init()
  }, [])

  useEffect(() => {
    if (isOpen) {
      setSubView('history')
    }
  }, [isOpen, property?.id])

  useEffect(() => {
    if (!isOpen || !property?.id || subView !== 'chart') {
      setLoading(false)
      setPoints([])
      setError(null)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const base = await getApiBaseUrl()
        API_BASE_URL = base
        const res = await fetch(`${API_BASE_URL}/bids/property/${property.id}`)
        const json = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok || !json.success) {
          setError(json.error || i18n.t('ownerBidSellerChartError'))
          setPoints([])
          return
        }
        setPoints(buildBidChartSeries(property, json.data || []))
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || i18n.t('ownerBidSellerNetworkError'))
          setPoints([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [
    isOpen,
    subView,
    property?.id,
    property?.auction_starting_price,
    property?.auction_start_date,
    property?.publishedDate,
    property?.starting_price,
  ])

  const currencySymbol = useMemo(() => getCurrencySymbol(property), [property])

  if (!isOpen || !property) return null

  const title = property.title || t('bidHistoryPropertyDefault')

  return (
    <div className="owner-bid-analytics-overlay" onClick={onClose} role="presentation">
      <div
        className="owner-bid-analytics-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-bid-analytics-heading"
      >
        <div className="owner-bid-analytics-modal__ambient" aria-hidden />

        <button type="button" className="owner-bid-analytics-modal__close" onClick={onClose} aria-label={t('closeAria')}>
          <FiX size={20} strokeWidth={2.25} />
        </button>

        <header className="owner-bid-analytics-modal__header">
          <span className="owner-bid-analytics-modal__eyebrow">{t('ownerBidSellerModalEyebrow')}</span>
          <div className="owner-bid-analytics-modal__headline">
            <div className="owner-bid-analytics-modal__icon-ring" aria-hidden>
              <FiBarChart2 size={22} />
            </div>
            <div className="owner-bid-analytics-modal__titles">
              <h2 id="owner-bid-analytics-heading" className="owner-bid-analytics-modal__heading">
                {t('ownerBidSellerModalTitle')}
              </h2>
              <p className="owner-bid-analytics-modal__property">{title}</p>
            </div>
          </div>
        </header>

        <div className="owner-bid-analytics-modal__body">
          <div className="owner-bid-analytics-modal__view-row">
            <div className="pba-tabs owner-bid-analytics-modal__view-tabs" role="tablist" aria-label={t('ownerBidSellerViewTabsAria')}>
              <button
                type="button"
                role="tab"
                aria-selected={subView === 'history'}
                className={`pba-tabs__btn${subView === 'history' ? ' pba-tabs__btn--active' : ''}`}
                onClick={() => setSubView('history')}
              >
                {t('ownerBidSellerModalTabHistory')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={subView === 'chart'}
                className={`pba-tabs__btn${subView === 'chart' ? ' pba-tabs__btn--active' : ''}`}
                onClick={() => setSubView('chart')}
              >
                {t('ownerBidSellerModalTabChart')}
              </button>
            </div>
          </div>

          {subView === 'history' ? (
            <div className="owner-bid-analytics-modal__history-root">
              <BiddingHistoryPanel property={property} isOpen={isOpen} hideTitleHeader />
            </div>
          ) : loading ? (
            <LoadingPanel message={t('ownerBidSellerChartLoading')} />
          ) : error ? (
            <div className="owner-bid-analytics-modal__state owner-bid-analytics-modal__state--error" role="alert">
              <span className="owner-bid-analytics-modal__state-icon" aria-hidden>
                !
              </span>
              {error}
            </div>
          ) : points.length === 0 ? (
            <div className="owner-bid-analytics-modal__state owner-bid-analytics-modal__state--empty">
              <p className="owner-bid-analytics-modal__state-title">{t('ownerBidSellerChartEmptyTitle')}</p>
              <p className="owner-bid-analytics-modal__state-desc">{t('ownerBidSellerChartEmptyDesc')}</p>
            </div>
          ) : (
            <div className="owner-bid-analytics-modal__chart-shell">
              <PropertyBidAnalyticsChart data={points} currencySymbol={currencySymbol} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
