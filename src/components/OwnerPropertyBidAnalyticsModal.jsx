import { useEffect, useMemo, useState } from 'react'
import { FiBarChart2, FiX } from 'react-icons/fi'
import { getApiBaseUrl, getApiBaseUrlSync } from '../utils/apiConfig'
import { PropertyBidAnalyticsChart } from './ui/property-bid-analytics-chart'
import './OwnerPropertyBidAnalyticsModal.css'

let API_BASE_URL = getApiBaseUrlSync()

function getCurrencySymbol(property) {
  const currency = property?.currency || 'USD'
  if (currency === 'EUR') return '€'
  if (currency === 'BYN') return 'Br'
  if (currency === 'USD') return '$'
  return '$'
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

/**
 * Добавляет точку «старт аукциона» до первой ставки, чтобы при одной ставке
 * была линия от стартовой цены к текущей, а не один маркер.
 */
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

function LoadingPanel() {
  return (
    <div className="owner-bid-analytics-modal__loading" aria-busy="true" aria-live="polite">
      <div className="owner-bid-analytics-modal__loading-shimmer" />
      <div className="owner-bid-analytics-modal__loading-rows">
        <span className="owner-bid-analytics-modal__loading-dot" />
        <span className="owner-bid-analytics-modal__loading-dot" />
        <span className="owner-bid-analytics-modal__loading-dot" />
      </div>
      <p className="owner-bid-analytics-modal__loading-text">Загружаем историю ставок…</p>
    </div>
  )
}

export default function OwnerPropertyBidAnalyticsModal({ isOpen, onClose, property }) {
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
    if (!isOpen || !property?.id) {
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
          setError(json.error || 'Не удалось загрузить ставки')
          setPoints([])
          return
        }
        setPoints(buildBidChartSeries(property, json.data || []))
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Ошибка сети')
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
    property?.id,
    property?.auction_starting_price,
    property?.auction_start_date,
    property?.publishedDate,
    property?.starting_price,
  ])

  const currencySymbol = useMemo(() => getCurrencySymbol(property), [property])

  if (!isOpen || !property) return null

  const title = property.title || 'Объект'

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

        <button type="button" className="owner-bid-analytics-modal__close" onClick={onClose} aria-label="Закрыть">
          <FiX size={20} strokeWidth={2.25} />
        </button>

        <header className="owner-bid-analytics-modal__header">
          <span className="owner-bid-analytics-modal__eyebrow">Кабинет продавца</span>
          <div className="owner-bid-analytics-modal__headline">
            <div className="owner-bid-analytics-modal__icon-ring" aria-hidden>
              <FiBarChart2 size={22} />
            </div>
            <div className="owner-bid-analytics-modal__titles">
              <h2 id="owner-bid-analytics-heading" className="owner-bid-analytics-modal__heading">
                Аналитика по ставкам
              </h2>
              <p className="owner-bid-analytics-modal__property">{title}</p>
            </div>
          </div>
        </header>

        <div className="owner-bid-analytics-modal__body">
          {loading ? (
            <LoadingPanel />
          ) : error ? (
            <div className="owner-bid-analytics-modal__state owner-bid-analytics-modal__state--error" role="alert">
              <span className="owner-bid-analytics-modal__state-icon" aria-hidden>
                !
              </span>
              {error}
            </div>
          ) : points.length === 0 ? (
            <div className="owner-bid-analytics-modal__state owner-bid-analytics-modal__state--empty">
              <p className="owner-bid-analytics-modal__state-title">Пока без ставок</p>
              <p className="owner-bid-analytics-modal__state-desc">
                Когда появятся предложения покупателей, здесь отобразится динамика цены.
              </p>
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
