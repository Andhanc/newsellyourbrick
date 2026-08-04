import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  BarChart3,
  ChevronDown,
  X,
  ArrowLeft,
  Calendar,
  Heart,
  Inbox,
  MoreVertical,
  Plus,
  Gavel,
  CircleDollarSign,
  Clock,
  BedDouble,
  ShowerHead,
  Maximize2,
  Eye,
  PieChart,
  MapPin,
} from 'lucide-react'
import { OWNER_PROP_IMAGES } from './ownerPropertiesTestImages'
import { getOwnerListingTypeLabels, getOwnerTestProperty } from './ownerPropertiesTestData'
import { OwnerAdCard } from '../components/OwnerAds'
import {
  downloadXlsxBuffer,
  exportOwnerAnalyticsExcel,
} from '../utils/ownerAnalyticsExcelExport'
import {
  fetchOwnerProperties,
  getOwnerPropertiesUserId,
  mapApiPropertyToOwnerListRow,
} from '../utils/ownerPropertiesList'
import { showNotification } from '../utils/toastHelper'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import OwnerPropertyAnalyticsSkeleton from '../components/OwnerPropertyAnalyticsSkeleton'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { useOwnerTestNavItems } from '../hooks/useOwnerTestNavItems'
import { getOwnerTestIntlLocale } from '../utils/ownerTestI18n'
import {
  formatOwnerAuctionTimerFullCountdown,
  getOwnerAuctionTimerFlags,
  getOwnerAuctionTimerParts,
  OWNER_AUCTION_TIMER_SEGMENT_KEYS,
} from '../utils/ownerTestTimer'
import { getCurrencySymbol } from '../utils/currency'
import { OWNER_TEST_STANDALONE_HREF_MAP } from '../utils/ownerTestNav'
import './OwnerPropertyAnalyticsTestPage.css'
import './OwnerPropertyAnalyticsTestPage.mobile.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const OPA_TIFFANY = '#0099a9'
const AUCTION_CROWN_IMAGE = '/images/owner-properties-test/owner-auction-crown-3d.png'

const EMPTY_OWNER_SALES = {
  auction: [],
  shares: [],
  debts: [],
  buy_now: [],
  test_drive: [],
}

function AnimatedPropertyAmount({ amount, currency, fallback, locale }) {
  const target = Number(amount)
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (!Number.isFinite(target) || target <= 0) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setDisplayValue(target)
      return undefined
    }

    let frameId = 0
    const startedAt = window.performance.now()
    const duration = 1450

    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 4)
      setDisplayValue(target * eased)
      if (progress < 1) frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frameId)
  }, [target])

  if (!Number.isFinite(target) || target <= 0) return fallback || '—'

  return `${getCurrencySymbol(currency || 'USD')}${Math.round(displayValue).toLocaleString(locale, {
    maximumFractionDigits: 0,
  })}`
}

async function fetchPublicAnalyticsProperty(propertyId) {
  const response = await fetch(`/api/properties/${encodeURIComponent(propertyId)}`)
  if (!response.ok) return null
  const result = await response.json().catch(() => ({}))
  if (!result?.success || !result?.data) return null
  return mapApiPropertyToOwnerListRow(result.data)
}

function formatOwnerHighlightMoney(amount, currency, locale) {
  const num = Number(amount)
  if (!Number.isFinite(num)) return '—'
  const sym = getCurrencySymbol(currency || 'USD')
  return `${sym}${num.toLocaleString(locale, { maximumFractionDigits: 0 })}`
}

function getPropertyListingHighlight(property) {
  if (!property) return null

  if (property.listingType === 'auction') {
    return {
      type: 'auction',
      currentBid: property.currentBid || property.price || '—',
    }
  }

  if (property.listingType === 'shares') {
    const raw = property.raw || {}
    const totalShares = Number(raw.total_shares ?? raw.totalShares) || 0
    const sharesSold = Math.min(
      Number(raw.shares_sold ?? raw.sharesSold ?? property.shares_sold) || 0,
      totalShares || Number.POSITIVE_INFINITY
    )
    const totalPrice = Number(raw.price ?? property.priceAmount) || 0
    const pricePerShare =
      Number(raw.price_per_share ?? raw.pricePerShare) ||
      (totalShares > 0 ? totalPrice / totalShares : 0)
    const collected = sharesSold * pricePerShare
    const currency = property.currency || raw.currency || 'USD'
    const progress = totalShares > 0 ? Math.min(100, (sharesSold / totalShares) * 100) : 0

    return {
      type: 'shares',
      sharesSold,
      totalShares,
      collected,
      currency,
      progress,
    }
  }

  return null
}

function ListingHighlightBlock({ property, t, intlLocale }) {
  const highlight = useMemo(() => getPropertyListingHighlight(property), [property])
  if (!highlight) return null

  if (highlight.type === 'auction') {
    return (
      <article className="opa-listing-highlight opa-listing-highlight--auction" aria-label={t('bidHistoryCurrentMaxBid')}>
        <div className="opa-listing-highlight__content">
          <span className="opa-listing-highlight__eyebrow">{t('bidHistoryCurrentMaxBid')}</span>
          <p className="opa-listing-highlight__value">{highlight.currentBid}</p>
          <span className="opa-listing-highlight__hint">{t('ownerTest_analyticsAuctionBidHint')}</span>
        </div>
        <div className="opa-listing-highlight__art-wrap" aria-hidden>
          <img
            src={AUCTION_CROWN_IMAGE}
            alt=""
            className="opa-listing-highlight__art"
            loading="lazy"
          />
        </div>
      </article>
    )
  }

  return (
    <article className="opa-listing-highlight opa-listing-highlight--shares" aria-label={t('ownerTest_analyticsSharesHighlight')}>
      <div className="opa-listing-highlight__glow" aria-hidden />
      <div className="opa-listing-highlight__content">
        <span className="opa-listing-highlight__eyebrow">{t('ownerTest_analyticsSharesHighlight')}</span>
        <p className="opa-listing-highlight__shares-count">
          <strong>{highlight.sharesSold.toLocaleString(intlLocale)}</strong>
          {highlight.totalShares > 0 ? (
            <>
              <span className="opa-listing-highlight__shares-sep">/</span>
              <span>{highlight.totalShares.toLocaleString(intlLocale)}</span>
            </>
          ) : null}
        </p>
        <p className="opa-listing-highlight__shares-label">
          {highlight.totalShares > 0
            ? t('sharesSoldCount', {
                sold: highlight.sharesSold.toLocaleString(intlLocale),
                total: highlight.totalShares.toLocaleString(intlLocale),
              })
            : t('ownerTest_analyticsSharesSoldOnly', {
                sold: highlight.sharesSold.toLocaleString(intlLocale),
              })}
        </p>
        {highlight.totalShares > 0 ? (
          <div
            className="opa-listing-highlight__progress"
            role="progressbar"
            aria-valuenow={Math.round(highlight.progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('sharesPercentSold', { percent: Math.round(highlight.progress) })}
          >
            <span style={{ width: `${highlight.progress}%` }} />
          </div>
        ) : null}
        <p className="opa-listing-highlight__collected">
          <span>{t('sharesSidebarStatsCollected')}</span>
          <strong>{formatOwnerHighlightMoney(highlight.collected, highlight.currency, intlLocale)}</strong>
        </p>
      </div>
      <div className="opa-listing-highlight__visual opa-listing-highlight__visual--shares" aria-hidden>
        <PieChart size={34} strokeWidth={1.9} />
      </div>
    </article>
  )
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`opa-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="opa-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#33adbb" />
          <stop offset="100%" stopColor="#007d8a" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#opa-logo-grad)" />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        $
      </text>
    </svg>
  )
}

function DeltaBadge({ value, up }) {
  if (!value) return null
  const cls =
    up === false ? 'opa-delta opa-delta--down' : up === true ? 'opa-delta opa-delta--up' : 'opa-delta'
  return <span className={cls}>{value}</span>
}

function useOpaMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const onChange = (e) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return mobile
}

function buildMetricSeries(baseSeries, metric, analytics) {
  if (metric === 'bids' && Array.isArray(analytics?.bidsChartDesktop)) {
    return Array.isArray(baseSeries) && baseSeries.length === analytics.bidsChartMobile?.length
      ? analytics.bidsChartMobile
      : analytics.bidsChartDesktop
  }
  if (metric === 'likes' && Array.isArray(analytics?.likesChartDesktop)) {
    return Array.isArray(baseSeries) && baseSeries.length === analytics.likesChartMobile?.length
      ? analytics.likesChartMobile
      : analytics.likesChartDesktop
  }
  if (metric === 'views' && Array.isArray(baseSeries)) return baseSeries
  return Array.isArray(baseSeries) ? baseSeries : []
}

function formatDateSafe(value, locale) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale)
}

function normalizeAnalyticsPropertyTable(table) {
  const value = String(table || '').trim()
  if (value === 'houses') return 'properties_houses'
  if (value === 'apartments') return 'properties_apartments'
  if (value === 'properties_houses' || value === 'properties_apartments') return value
  return value || 'properties_apartments'
}

function getAnalyticsPropertyTable(property) {
  const raw = property?.raw || property || {}
  return normalizeAnalyticsPropertyTable(
    raw.property_table ||
      raw.propertyTable ||
      raw.source_table ||
      (raw.property_type === 'house' || raw.property_type === 'villa' ? 'properties_houses' : '')
  )
}

function getAnalyticsSaleKey(row) {
  const id = row?.property_id ?? row?.propertyId ?? row?.id
  const table = normalizeAnalyticsPropertyTable(row?.property_table ?? row?.propertyTable ?? row?.source_table)
  return `${Number(id)}:${table}`
}

function filterSalesForAnalyticsProperty(data, property) {
  if (!data || !property) return EMPTY_OWNER_SALES
  const propertyKey = `${Number(property.id)}:${getAnalyticsPropertyTable(property)}`
  const filtered = { ...EMPTY_OWNER_SALES }
  for (const section of ['auction', 'shares', 'debts', 'buy_now']) {
    const rows = Array.isArray(data[section]) ? data[section] : []
    filtered[section] = rows.filter((row) => getAnalyticsSaleKey(row) === propertyKey)
  }
  return filtered
}

function buildAnalyticsExcelProperty(property) {
  const raw = property?.raw || {}
  return {
    ...raw,
    id: property.id,
    title: property.title,
    location: property.location,
    price: property.priceAmount ?? raw.price ?? 0,
    beds: raw.bedrooms || raw.rooms || 0,
    baths: raw.bathrooms || 0,
    sqft: raw.area || 0,
    status:
      property.filterKey === 'sold'
        ? 'sold'
        : property.filterKey === 'draft'
          ? 'pending'
          : property.filterKey === 'active'
            ? 'active'
            : property.statusKey || 'pending',
    likesCount: property.likesCount ?? raw.likes_count ?? 0,
    bidsCount: property.bidsCount ?? raw.bids_count ?? 0,
    shares_sold: raw.shares_sold ?? property.shares_sold ?? 0,
    publishedDate: raw.created_at || raw.updated_at || null,
  }
}

function getPropertyHeroSpecs(property, t) {
  const raw = property?.raw || {}
  const beds = Number(raw.bedrooms ?? raw.rooms)
  const baths = Number(raw.bathrooms)
  const area = Number(raw.area ?? raw.total_area ?? raw.living_area)
  const items = []

  if (Number.isFinite(beds) && beds > 0) {
    items.push({
      id: 'beds',
      icon: BedDouble,
      value: beds,
      label: t('propertyDetailBedsShort'),
    })
  }

  if (Number.isFinite(baths) && baths > 0) {
    items.push({
      id: 'baths',
      icon: ShowerHead,
      value: baths,
      label: t('propertyDetailBathsShort'),
    })
  }

  if (Number.isFinite(area) && area > 0) {
    items.push({
      id: 'area',
      icon: Maximize2,
      value: area,
      label: t('propertyDetailSpecsArea'),
      suffix: raw.area_unit === 'sqft' ? ' sqft' : ' m²',
    })
  }

  return items
}

function getAnalyticsTimerEndTime(property) {
  const raw = property?.raw || {}
  const direct =
    property?.auctionEndTime ||
    property?.test_timer_end_date ||
    property?.auction_end_date ||
    property?.end_time ||
    property?.endTime ||
    raw.test_timer_end_date ||
    raw.auction_end_date ||
    raw.auction_end_at ||
    raw.auctionEndAt ||
    raw.auction_end_time ||
    raw.end_time ||
    raw.endTime ||
    null

  if (direct) return direct

  const duration = Number(raw.test_timer_duration ?? property?.test_timer_duration)
  const createdAt = raw.created_at || raw.published_at || raw.listed_at
  if (Number.isFinite(duration) && duration > 0 && createdAt) {
    const startMs = new Date(createdAt).getTime()
    if (Number.isFinite(startMs)) {
      return new Date(startMs + duration).toISOString()
    }
  }

  return null
}

function formatAnalyticsTimerLabel(label) {
  const value = String(label || '').trim()
  if (!value) return value
  return value.replace(/^(\d+)\s*д\s+(\d{1,2}:\d{2}:\d{2})$/i, '$1:$2')
}

function getAnalyticsTimerState(property, t, now = Date.now()) {
  const endTime = getAnalyticsTimerEndTime(property)
  if (!endTime && property?.auctionTimer) {
    return {
      expired: false,
      warning: false,
      critical: false,
      urgent: false,
      caption: t('ownerTest_propertiesTimerLeft'),
      label: formatAnalyticsTimerLabel(property.auctionTimer),
    }
  }
  if (!endTime) return null

  const endMs = new Date(endTime).getTime()
  if (!Number.isFinite(endMs)) return null

  const remainingMs = endMs - now
  const { expired, warning, critical, urgent } = getOwnerAuctionTimerFlags(remainingMs)

  if (expired) {
    return {
      expired: true,
      warning: false,
      critical: false,
      urgent: false,
      caption: t('ownerTest_propertiesTimerCaption'),
      label: t('ownerTest_propertiesTimerFinished'),
    }
  }

  return {
    expired: false,
    warning,
    critical,
    urgent,
    caption: t('ownerTest_propertiesTimerLeft'),
    label: formatOwnerAuctionTimerFullCountdown(remainingMs, t),
  }
}

function getPropertyCoverTimerModifier(timer) {
  if (!timer) return 'empty'
  if (timer.expired) return 'finished'
  if (timer.urgent) return 'urgent'
  if (timer.critical) return 'critical'
  if (timer.warning) return 'warning'
  return 'long'
}

function PropertyCoverTimer({ property, now, t }) {
  const timer = getAnalyticsTimerState(property, t, now)
  if (!timer) return null

  const endTime = getAnalyticsTimerEndTime(property)
  const endMs = endTime ? new Date(endTime).getTime() : NaN
  const remainingMs = Number.isFinite(endMs) ? Math.max(0, endMs - now) : null
  const hasLiveCountdown = !timer.expired && remainingMs != null && remainingMs > 0
  const parts = hasLiveCountdown ? getOwnerAuctionTimerParts(remainingMs) : null

  return (
    <div
      className={`opa-property-card__timer opa-property-card__timer--${getPropertyCoverTimerModifier(timer)}`}
      aria-live="polite"
    >
      <div className="opa-property-card__timer-fade" aria-hidden />
      <div className="opa-property-card__timer-content">
        <span className="opa-property-card__timer-eyebrow">
          <Clock size={12} strokeWidth={2.2} aria-hidden />
          {timer.caption}
        </span>
        {parts ? (
          <div className="opa-property-card__timer-segments">
            {OWNER_AUCTION_TIMER_SEGMENT_KEYS.map(([partKey, labelKey]) => (
              <div key={partKey} className="opa-property-card__timer-segment">
                <strong>{String(parts[partKey]).padStart(2, '0')}</strong>
                <span>{t(labelKey)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="opa-property-card__timer-value">
            <strong>{timer.label}</strong>
          </p>
        )}
      </div>
    </div>
  )
}

function AnalyticsTimerPanel({ property, now, t }) {
  const timer = getAnalyticsTimerState(property, t, now)
  const hasTimer = Boolean(timer)
  const currentBid = property?.currentBid || property?.price || '—'
  const statusText = timer?.expired
    ? t('ownerTest_timerFinished')
    : hasTimer
      ? t('ownerTest_propertiesTimerCaption')
      : t('ownerTest_analyticsNoData')
  const value = timer?.label || '—'

  return (
    <section
      className={[
        'opa-timer-panel',
        !hasTimer && 'opa-timer-panel--empty',
        timer?.expired && 'opa-timer-panel--expired',
        timer?.warning && 'opa-timer-panel--warning',
        timer?.critical && 'opa-timer-panel--critical',
        timer?.urgent && 'opa-timer-panel--urgent',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={t('ownerTest_propertiesTimerCaption')}
    >
      <div className="opa-timer-panel__main">
        <span className="opa-timer-panel__icon" aria-hidden>
          <Clock size={24} strokeWidth={2.4} />
        </span>
        <div className="opa-timer-panel__copy">
          <span className="opa-timer-panel__eyebrow">{statusText}</span>
          <h2 className="opa-timer-panel__title">{t('ownerTest_propertiesTimerCaption')}</h2>
          <p className="opa-timer-panel__text">
            {timer?.expired
              ? t('ownerTest_timerFinished')
              : hasTimer
                ? t('oap_testDriveHint')
                : t('ownerTest_analyticsNoData')}
          </p>
        </div>
      </div>
      <div className="opa-timer-panel__count" aria-live="polite">
        <span className="opa-timer-panel__count-label">
          {timer?.expired
            ? t('ownerTest_propertiesTimerCaption')
            : hasTimer
              ? t('ownerTest_propertiesTimerLeft')
              : t('ownerTest_propertiesTimerLeft')}
        </span>
        <strong>{value}</strong>
      </div>
      <div className="opa-timer-panel__meta">
        <span>
          <CircleDollarSign size={17} strokeWidth={2.2} aria-hidden />
          {t('bidHistoryCurrentMaxBid')}
        </span>
        <strong>{currentBid}</strong>
      </div>
    </section>
  )
}

export default function OwnerPropertyAnalyticsTestPage() {
  const { t, i18n } = useTranslation()
  const intlLocale = useMemo(() => getOwnerTestIntlLocale(i18n.language), [i18n.language])
  const { fullName, roleLabel } = useOwnerTestProfile()
  const { propertyId: routePropertyId } = useParams()
  const { isEmbedded, goTo, propertyId: embeddedPropertyId } = useOwnerTestEmbeddedNav()
  const navItems = useOwnerTestNavItems({
    activeId: 'properties',
    hrefMap: isEmbedded ? undefined : OWNER_TEST_STANDALONE_HREF_MAP,
  })
  const chartMetrics = useMemo(
    () => [
      { id: 'bids', label: t('ownerTest_analyticsMetricBids') },
      { id: 'views', label: t('ownerTest_analyticsMetricViews') },
      { id: 'likes', label: t('ownerTest_analyticsMetricLikes') },
    ],
    [t]
  )
  const listingTypeLabels = useMemo(() => getOwnerListingTypeLabels(t), [t])
  const formatDateForExport = useCallback((value) => formatDateSafe(value, intlLocale), [intlLocale])
  const propertyId = isEmbedded ? embeddedPropertyId : routePropertyId
  const [property, setProperty] = useState(() => getOwnerTestProperty(propertyId))
  const [propertyLoading, setPropertyLoading] = useState(() => !getOwnerTestProperty(propertyId))
  const [menuOpen, setMenuOpen] = useState(false)
  const [chartMetric, setChartMetric] = useState('bids')
  const [chartMetricOpen, setChartMetricOpen] = useState(false)
  const [timerNow, setTimerNow] = useState(() => Date.now())
  const [exportingExcel, setExportingExcel] = useState(false)
  const [compactHeaderVisible, setCompactHeaderVisible] = useState(false)
  const [heroImageFailed, setHeroImageFailed] = useState(false)
  const isMobile = useOpaMobile()
  const mobileDetailsRef = useRef(null)
  const heroValueRef = useRef(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    let cancelled = false

    const loadProperty = async () => {
      const cached = getOwnerTestProperty(propertyId)
      if (cached) {
        setProperty(cached)
        setPropertyLoading(false)
        return
      }

      setPropertyLoading(true)
      try {
        const userId = getOwnerPropertiesUserId()
        if (userId) await fetchOwnerProperties(userId)
        if (!cancelled) {
          const ownerProperty = getOwnerTestProperty(propertyId)
          const publicProperty = ownerProperty || await fetchPublicAnalyticsProperty(propertyId)
          setProperty(publicProperty)
        }
      } catch (error) {
        console.warn('OwnerPropertyAnalyticsTestPage: не удалось загрузить объект', error)
        if (!cancelled) setProperty(null)
      } finally {
        if (!cancelled) setPropertyLoading(false)
      }
    }

    loadProperty()
    return () => {
      cancelled = true
    }
  }, [propertyId])

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `opa-nav__item${active ? ' opa-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="opa-nav__badge">{badge}</span>}
        </>
      )

      if (href) {
        return (
          <Link key={id} to={href} className={className} onClick={closeMenu}>
            {inner}
          </Link>
        )
      }

      return (
        <button key={id} type="button" className={className} onClick={closeMenu}>
          {inner}
        </button>
      )
    },
    [closeMenu]
  )

  useEffect(() => {
    if (isEmbedded) return undefined
    document.documentElement.classList.add('opa-page-active')
    return () => document.documentElement.classList.remove('opa-page-active')
  }, [isEmbedded])

  useEffect(() => {
    if (!isEmbedded || !goTo || propertyLoading || property || !propertyId) return
    goTo(OWNER_VIEWS.PROPERTIES)
  }, [property, propertyId, propertyLoading, isEmbedded, goTo])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  useEffect(() => {
    const priceNode = heroValueRef.current
    if (!isMobile || !property || !priceNode) {
      setCompactHeaderVisible(false)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCompactHeaderVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      },
      { threshold: 0, rootMargin: '-66px 0px 0px' }
    )

    observer.observe(priceNode)
    return () => observer.disconnect()
  }, [isMobile, property])

  useEffect(() => {
    setHeroImageFailed(false)
  }, [property?.image])

  const propertyTimerEndTime = useMemo(() => getAnalyticsTimerEndTime(property), [property])

  useEffect(() => {
    if (!propertyTimerEndTime) return undefined
    setTimerNow(Date.now())
    const timer = window.setInterval(() => setTimerNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [propertyTimerEndTime])

  const analytics = property?.analytics
  const selectedChartMetric = chartMetrics.find((metric) => metric.id === chartMetric) || chartMetrics[0]
  const listingTypeLabel =
    listingTypeLabels[property?.listingType] || t('ownerTest_propertiesTypeBuyNow')
  const heroAmount = property?.listingType === 'auction'
    ? Number(property?.currentBidAmount || property?.priceAmount)
    : Number(property?.priceAmount)
  const heroLocation = property?.location || [property?.raw?.city, property?.raw?.country].filter(Boolean).join(', ') || t('ownerTest_analyticsNoData')
  const heroDescription = String(property?.raw?.description || '').trim()
  const propertyHeroImage = property?.image || ''
  const compactPrice = Number.isFinite(heroAmount) && heroAmount > 0
    ? formatOwnerHighlightMoney(heroAmount, property?.currency, intlLocale)
    : property?.price || '—'

  const lineChartData = useMemo(() => {
    if (!analytics) return null
    const sourceSeries = isMobile ? analytics.viewsChartMobile : analytics.viewsChartDesktop
    const metricSeries = buildMetricSeries(sourceSeries, chartMetric, analytics)
    return {
      labels: isMobile ? analytics.chartLabelsMobile : analytics.chartLabelsDesktop,
      datasets: [
        {
          label: selectedChartMetric.label,
          data: metricSeries,
          borderColor: OPA_TIFFANY,
          backgroundColor: 'rgba(0, 153, 169, 0.14)',
          fill: true,
          tension: 0.42,
          pointRadius: isMobile ? 4 : 3,
          pointHoverRadius: 5,
          pointBackgroundColor: OPA_TIFFANY,
          borderWidth: 2.5,
        },
      ],
    }
  }, [analytics, chartMetric, isMobile, selectedChartMetric.label])

  const lineChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleFont: { family: 'Inter', size: 12 },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9', drawBorder: false },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter', size: isMobile ? 10 : 11 },
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          min: 0,
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter', size: isMobile ? 10 : 11 },
          },
          grid: { color: '#f1f5f9', drawBorder: false },
          border: { display: false },
        },
      },
    }),
    [isMobile]
  )

  const handleExportToExcel = useCallback(async () => {
    const userId = getOwnerPropertiesUserId()
    if (!userId) {
      showNotification(t('ownerTest_analyticsLoginExport'))
      return
    }
    if (!property) return

    setExportingExcel(true)
    try {
      const response = await fetch(`/api/owner/${userId}/my-sales`)
      const json = await response.json().catch(() => ({}))
      const salesData =
        response.ok && json.success && json.data ? json.data : EMPTY_OWNER_SALES
      const propertySales = filterSalesForAnalyticsProperty(salesData, property)
      const excelProperty = buildAnalyticsExcelProperty(property)

      const buffer = await exportOwnerAnalyticsExcel({
        formatDateSafe: formatDateForExport,
        properties: [excelProperty],
        mySalesData: propertySales,
        stats: {
          totalProperties: 1,
          activeProperties: property.filterKey === 'active' || property.statusKey === 'active' ? 1 : 0,
          soldProperties: property.filterKey === 'sold' || property.statusKey === 'sold' ? 1 : 0,
          totalLikes: Number(property.likesCount ?? analytics?.likesRaw) || 0,
          totalBids: Number(property.bidsCount ?? analytics?.bidsRaw) || 0,
          totalSharesSoldAgg: Number(property.raw?.shares_sold ?? property.shares_sold) || 0,
          interestCount: Number(property.bidsCount ?? analytics?.bidsRaw) || 0,
          convLikesToBidsPct:
            Number(property.likesCount ?? analytics?.likesRaw) > 0
              ? (
                  ((Number(property.bidsCount ?? analytics?.bidsRaw) || 0) /
                    (Number(property.likesCount ?? analytics?.likesRaw) || 1)) *
                  100
                ).toFixed(1)
              : '0',
          interestPerListing: Number(property.bidsCount ?? analytics?.bidsRaw) || 0,
        },
      })
      downloadXlsxBuffer(buffer, `property_analytics_${property.id}_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('OwnerPropertyAnalyticsTestPage: export excel', error)
      showNotification(t('ownerTest_profileExportError'))
    } finally {
      setExportingExcel(false)
    }
  }, [analytics, formatDateForExport, property, t])

  if (propertyLoading) {
    const skeleton = <OwnerPropertyAnalyticsSkeleton />
    if (isEmbedded) {
      return <div className="opa opa--embedded">{skeleton}</div>
    }
    return (
      <div className="opa-page">
        {skeleton}
      </div>
    )
  }

  if (!property) {
    if (isEmbedded) return null
    return <Navigate to="/owner-properties-test" replace />
  }

  const heroSpecs = getPropertyHeroSpecs(property, t)

  const kpiItems = [
    {
      label: t('ownerTest_analyticsMetricViews'),
      value: analytics.views,
      delta: property.viewsDelta,
      up: property.viewsUp,
      icon: BarChart3,
    },
    {
      label: t('ownerTest_analyticsMetricBids'),
      value: analytics.bids,
      delta: '',
      up: null,
      icon: Gavel,
    },
    {
      label: t('ownerTest_analyticsMetricLikes'),
      value: analytics.likes,
      delta: analytics.favoritesDelta,
      up: analytics.favoritesUp,
      icon: Heart,
    },
    {
      label: t('ownerTest_profileStatRequests'),
      value: analytics.leads,
      delta: analytics.leadsDelta,
      up: analytics.leadsUp,
      icon: Inbox,
    },
  ]

  const mainColumn = (
      <div className="opa-body">
        <header className="opa-header opa-desktop-only">
          <div className="opa-header__title-wrap">
            <h1 className="opa-header__title">{t('ownerAnalyticsTitle')}</h1>
            {isEmbedded ? (
              <button
                type="button"
                className="opa-back-link"
                onClick={() => goTo(OWNER_VIEWS.PROPERTIES)}
              >
                <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
                {t('ownerTest_analyticsBack')}
              </button>
            ) : (
              <Link to="/owner-properties-test" className="opa-back-link">
                <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
                {t('ownerTest_analyticsBack')}
              </Link>
            )}
          </div>
          <div className="opa-header__actions">
            <button type="button" className="opa-period-pill">
              <Calendar size={16} strokeWidth={2} aria-hidden />
              {analytics.period}
              <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
            </button>
            <OwnerSupportButton className="opa-icon-btn" />
            <OwnerNotificationsButton className="opa-icon-btn" badgeClassName="opa-icon-btn__badge" />
            <OwnerTestProfileMenu />
          </div>
        </header>

        <div
          className={`opa-property-sticky opa-mobile-only${compactHeaderVisible ? ' opa-property-sticky--visible' : ''}${heroImageFailed ? ' opa-property-sticky--no-image' : ''}`}
          aria-hidden={!compactHeaderVisible}
        >
          {isEmbedded ? (
            <button
              type="button"
              className="opa-property-sticky__back"
              aria-label={t('ownerTest_analyticsBack')}
              tabIndex={compactHeaderVisible ? 0 : -1}
              onClick={() => goTo(OWNER_VIEWS.PROPERTIES)}
            >
              <ArrowLeft size={18} strokeWidth={2.4} aria-hidden />
            </button>
          ) : (
            <Link
              to="/owner-properties-test"
              className="opa-property-sticky__back"
              aria-label={t('ownerTest_analyticsBack')}
              tabIndex={compactHeaderVisible ? 0 : -1}
            >
              <ArrowLeft size={18} strokeWidth={2.4} aria-hidden />
            </Link>
          )}
          {!heroImageFailed ? (
            <img
              src={propertyHeroImage}
              alt=""
              className="opa-property-sticky__thumb"
              onError={() => setHeroImageFailed(true)}
            />
          ) : null}
          <span className="opa-property-sticky__copy">
            <strong>{property.title}</strong>
            <small><MapPin size={11} strokeWidth={2.3} aria-hidden />{heroLocation}</small>
          </span>
          <strong className="opa-property-sticky__price">{compactPrice}</strong>
        </div>

        <div className="opa-workspace">
          <div className="opa-content">
            <div className="opa-mob-period opa-mobile-only">
              <Calendar size={16} strokeWidth={2} aria-hidden />
              <span>{analytics.period}</span>
            </div>

            <section className="opa-hero">
              <article className="opa-property-card">
                <div className="opa-property-card__cover opa-mobile-only">
                  {isEmbedded ? (
                    <button
                      type="button"
                      className="opa-property-card__back"
                      aria-label={t('ownerTest_analyticsBack')}
                      onClick={() => goTo(OWNER_VIEWS.PROPERTIES)}
                    >
                      <ArrowLeft size={20} strokeWidth={2.4} aria-hidden />
                    </button>
                  ) : (
                    <Link
                      to="/owner-properties-test"
                      className="opa-property-card__back"
                      aria-label={t('ownerTest_analyticsBack')}
                    >
                      <ArrowLeft size={20} strokeWidth={2.4} aria-hidden />
                    </Link>
                  )}
                  <img
                    src={propertyHeroImage}
                    alt={property.title}
                    className="opa-property-card__cover-img"
                    loading="eager"
                    hidden={heroImageFailed}
                    onError={() => setHeroImageFailed(true)}
                  />
                  <div className="opa-property-card__cover-fade" aria-hidden />
                  <div className="opa-property-card__mobile-brand" aria-hidden>
                    Sell<span>Your</span>Brick
                  </div>
                  <button
                    type="button"
                    className="opa-property-card__mobile-menu"
                    aria-label={t('ownerTest_ariaCabinetMenu')}
                    onClick={() => setMenuOpen(true)}
                  >
                    <MoreVertical size={21} strokeWidth={2.2} aria-hidden />
                  </button>

                  <div className="opa-property-card__hero-value" ref={heroValueRef}>
                    <strong aria-label={property.price}>
                      <AnimatedPropertyAmount
                        amount={heroAmount}
                        currency={property.currency}
                        fallback={property.price}
                        locale={intlLocale}
                      />
                    </strong>
                  </div>

                  <div className="opa-property-card__hero-summary">
                    <div className="opa-property-card__hero-summary-top">
                      <span className={`opa-property-card__hero-status opa-property-card__hero-status--${property.statusKey}`}>
                        <i aria-hidden />
                        {property.status}
                      </span>
                      <span className="opa-property-card__hero-id">{property.displayId || `#${property.id}`}</span>
                    </div>
                    <h1>{property.title}</h1>
                    <p>
                      <MapPin size={15} strokeWidth={2.3} aria-hidden />
                      {heroLocation}
                    </p>
                    <div className="opa-property-card__hero-metrics" aria-label={t('ownerTest_ariaKeyMetrics')}>
                      <span><Eye size={15} strokeWidth={2.2} aria-hidden />{analytics.views}</span>
                      <span><Heart size={15} strokeWidth={2.2} aria-hidden />{analytics.likes}</span>
                      <span>{listingTypeLabel}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="opa-property-card__scroll-cue"
                    onClick={() => mobileDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    <span className="opa-property-card__scroll-arrow" aria-hidden />
                  </button>
                </div>
                <img
                  src={propertyHeroImage}
                  alt=""
                  className="opa-property-card__img opa-desktop-only"
                  loading="lazy"
                  hidden={heroImageFailed}
                  onError={() => setHeroImageFailed(true)}
                />
                <div className="opa-property-card__body" ref={mobileDetailsRef}>
                  <span className="opa-property-card__details-eyebrow opa-mobile-only">Детали объекта</span>
                  <h2 className="opa-property-card__title">{property.title}</h2>
                  <p className="opa-property-card__details-location opa-mobile-only">
                    <MapPin size={16} strokeWidth={2.2} aria-hidden />
                    {heroLocation}
                  </p>
                  {heroDescription ? (
                    <p className="opa-property-card__description opa-mobile-only">{heroDescription}</p>
                  ) : null}
                  <div className="opa-property-card__stats opa-mobile-only" aria-label={t('ownerTest_ariaKeyMetrics')}>
                    <span className="opa-property-card__stat">
                      <Heart size={16} strokeWidth={2.2} aria-hidden />
                      <span>{analytics.likes}</span>
                      <span className="opa-property-card__stat-label">{t('ownerTest_analyticsMetricLikes')}</span>
                    </span>
                    <span className="opa-property-card__stat">
                      <Eye size={16} strokeWidth={2.2} aria-hidden />
                      <span>{analytics.views}</span>
                      <span className="opa-property-card__stat-label">{t('ownerTest_metricViews')}</span>
                    </span>
                  </div>
                  {heroSpecs.length > 0 ? (
                    <div className="opa-property-card__specs opa-mobile-only">
                      {heroSpecs.map((spec) => {
                        const Icon = spec.icon
                        return (
                          <div key={spec.id} className="opa-property-card__spec">
                            <span className="opa-property-card__spec-icon" aria-hidden>
                              <Icon size={18} strokeWidth={2.1} />
                            </span>
                            <span className="opa-property-card__spec-text">
                              <strong>
                                {spec.value}
                                {spec.suffix || ''}
                              </strong>{' '}
                              {spec.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                  <p className="opa-property-card__location opa-desktop-only">{property.location}</p>
                  <p className="opa-property-card__price">{property.price}</p>
                  <button
                    type="button"
                    className="opa-property-card__excel-btn opa-mobile-only"
                    onClick={handleExportToExcel}
                    disabled={exportingExcel}
                  >
                    {exportingExcel ? t('ownerTest_profileExporting') : t('ownerTest_analyticsDownloadExcel')}
                  </button>
                  <div className="opa-property-card__chips opa-desktop-only">
                    <span className={`opa-status opa-status--${property.statusKey}`}>{property.status}</span>
                    <span className={`opa-listing-type opa-listing-type--${property.listingType}`}>
                      <span>{t('auctionFilterSaleType')}</span>
                      <strong>{listingTypeLabel}</strong>
                    </span>
                  </div>
                </div>
              </article>

              <div className="opa-kpi-grid opa-desktop-only">
                {kpiItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <article key={item.label} className="opa-kpi">
                      <span className="opa-kpi__icon" aria-hidden>
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <span className="opa-kpi__label">{item.label}</span>
                      <span className="opa-kpi__value">{item.value}</span>
                      <DeltaBadge value={item.delta} up={item.up} />
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="opa-charts">
              <ListingHighlightBlock property={property} t={t} intlLocale={intlLocale} />
              <article className="opa-card opa-chart-card">
                <div className="opa-chart-card__head">
                  <h2 className="opa-card__title">
                    {t('ownerAnalyticsSalesDynamics')}: {selectedChartMetric.label.toLowerCase()}
                  </h2>
                  <div className="opa-metric-select">
                    <button
                      type="button"
                      className="opa-select-pill"
                      aria-haspopup="listbox"
                      aria-expanded={chartMetricOpen}
                      onClick={() => setChartMetricOpen((open) => !open)}
                    >
                      {selectedChartMetric.label}
                      <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
                    </button>
                    {chartMetricOpen && (
                      <div className="opa-metric-select__menu" role="listbox" aria-label={t('ownerTest_ariaChartMetric')}>
                        {chartMetrics.map((metric) => (
                          <button
                            key={metric.id}
                            type="button"
                            role="option"
                            aria-selected={metric.id === chartMetric}
                            className={`opa-metric-select__option${
                              metric.id === chartMetric ? ' opa-metric-select__option--active' : ''
                            }`}
                            onClick={() => {
                              setChartMetric(metric.id)
                              setChartMetricOpen(false)
                            }}
                          >
                            {metric.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="opa-chart-card__canvas">
                  {lineChartData && <Line data={lineChartData} options={lineChartOptions} />}
                </div>
              </article>

              <div className="opa-analytics-side">
                <section className="opa-analytics-ad" aria-label={t('ownerTest_adPremiumTitle')}>
                  <OwnerAdCard type="premium" />
                </section>
              </div>
            </section>

            <div className="opa-desktop-only">
              <AnalyticsTimerPanel property={property} now={timerNow} t={t} />
            </div>

          </div>
        </div>
      </div>
  )

  if (isEmbedded) return <div className="opa opa--embedded">{mainColumn}</div>

  return (
    <div className={`opa${menuOpen ? ' opa--menu-open' : ''}`}>
      <div
        className="opa-drawer-backdrop opa-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`opa-drawer opa-mobile-only${menuOpen ? ' opa-drawer--open' : ''}`}
        aria-label={t('ownerTest_ariaCabinetMenu')}
        aria-hidden={!menuOpen}
      >
        <div className="opa-drawer__head">
          <div className="opa-mob-topbar__brand">
            <LogoMark />
            <span className="opa-logo__text">{t('ownerTest_brandName')}</span>
          </div>
          <button type="button" className="opa-drawer__close" aria-label={t('ownerTest_ariaCloseMenu')} onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="opa-sidebar__divider opa-sidebar__divider--drawer" aria-hidden />
        <nav className="opa-nav opa-nav--drawer">{navItems.map(renderNavItem)}</nav>
      </aside>

      <aside className="opa-sidebar opa-desktop-only">
        <div className="opa-sidebar__brand">
          <LogoMark />
          <span className="opa-logo__text">{t('ownerTest_brandName')}</span>
        </div>
        <div className="opa-sidebar__divider" aria-hidden />
        <nav className="opa-nav" aria-label={t('ownerTest_ariaSellerCabinet')}>
          {navItems.map(renderNavItem)}
        </nav>
        <div className="opa-sidebar-promo">
          <p className="opa-sidebar-promo__title">{t('heroPitchBecomeBuyerCta')}</p>
          <p className="opa-sidebar-promo__text">{t('heroPitchBecomeBuyerBody')}</p>
          <button type="button" className="opa-btn opa-btn--primary opa-btn--sm">
            {t('heroPitchBecomeBuyerCta')}
          </button>
          <img
            className="opa-sidebar-promo__img"
            src={OWNER_PROP_IMAGES.promoSidebarBuyer}
            alt=""
            loading="lazy"
          />
        </div>
        <div className="opa-sidebar-user">
          <span className="opa-sidebar-user__avatar" aria-hidden>
            <svg viewBox="0 0 40 40">
              <defs>
                <linearGradient id="opa-user-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#33adbb" />
                  <stop offset="100%" stopColor="#007d8a" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="20" fill="url(#opa-user-grad)" />
              <circle cx="20" cy="16" r="7" fill="#f8fafc" />
              <ellipse cx="20" cy="34" rx="11" ry="8" fill="#f8fafc" />
            </svg>
          </span>
          <span className="opa-sidebar-user__info">
            <span className="opa-sidebar-user__name">{fullName}</span>
            <span className="opa-sidebar-user__role">{roleLabel}</span>
          </span>
          <button type="button" className="opa-sidebar-user__menu" aria-label={t('ownerTest_ariaProfileMenu')}>
            <MoreVertical size={18} />
          </button>
        </div>
      </aside>

      {mainColumn}

    </div>
  )
}
