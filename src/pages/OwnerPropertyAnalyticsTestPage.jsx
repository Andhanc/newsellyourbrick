import { useState, useEffect, useCallback, useMemo } from 'react'
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
  RefreshCw,
  Clock,
  Download,
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
} from '../utils/ownerPropertiesList'
import { showNotification } from '../utils/toastHelper'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import OwnerSupportButton from '../components/OwnerSupportButton'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import { useOwnerTestNavItems, useOwnerTestTabItems } from '../hooks/useOwnerTestNavItems'
import { getOwnerTestIntlLocale } from '../utils/ownerTestI18n'
import {
  formatOwnerAuctionTimerCountdown,
  getOwnerAuctionTimerFlags,
} from '../utils/ownerTestTimer'
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

const OPA_TIFFANY = '#0abab5'

const EMPTY_OWNER_SALES = {
  auction: [],
  shares: [],
  debts: [],
  buy_now: [],
  test_drive: [],
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`opa-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="opa-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
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

function getAnalyticsTimerEndTime(property) {
  return (
    property?.auctionEndTime ||
    property?.test_timer_end_date ||
    property?.auction_end_date ||
    property?.end_time ||
    property?.endTime ||
    property?.raw?.test_timer_end_date ||
    property?.raw?.auction_end_date ||
    property?.raw?.end_time ||
    property?.raw?.endTime ||
    null
  )
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
      critical: false,
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
    label: formatOwnerAuctionTimerCountdown(remainingMs, { daySeparator: ':' }),
  }
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
  const tabItems = useOwnerTestTabItems({
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
  const isMobile = useOpaMobile()

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

      const userId = getOwnerPropertiesUserId()
      if (!userId) {
        setProperty(null)
        setPropertyLoading(false)
        return
      }

      setPropertyLoading(true)
      try {
        await fetchOwnerProperties(userId)
        if (!cancelled) {
          setProperty(getOwnerTestProperty(propertyId))
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
    if (!isEmbedded || !goTo || property || !propertyId) return
    goTo(OWNER_VIEWS.PROPERTIES)
  }, [property, propertyId, isEmbedded, goTo])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

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
          backgroundColor: 'rgba(10, 186, 181, 0.14)',
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
    return (
      <div className="opa-page opa-page--loading">
        <p>{t('ownerTest_metricLoading')}…</p>
      </div>
    )
  }

  if (!property) {
    if (isEmbedded) return null
    return <Navigate to="/owner-properties-test" replace />
  }

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

        <div className="opa-workspace">
          <div className="opa-content">
            <div className="opa-mob-period opa-mobile-only">
              <Calendar size={16} strokeWidth={2} aria-hidden />
              <span>{analytics.period}</span>
            </div>

            <section className="opa-hero">
              <article className="opa-property-card">
                <img src={property.image} alt="" className="opa-property-card__img" loading="lazy" />
                <div className="opa-property-card__body">
                  <h2 className="opa-property-card__title">{property.title}</h2>
                  <p className="opa-property-card__location">{property.location}</p>
                  <p className="opa-property-card__price">{property.price}</p>
                  <div className="opa-property-card__chips">
                    <span className={`opa-status opa-status--${property.statusKey}`}>{property.status}</span>
                    <span className={`opa-listing-type opa-listing-type--${property.listingType}`}>
                      <span>{t('auctionFilterSaleType')}</span>
                      <strong>{listingTypeLabel}</strong>
                    </span>
                  </div>
                </div>
              </article>

              <div className="opa-kpi-grid">
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
                <article className="opa-report-card" aria-label={t('ownerAnalyticsExportExcel')}>
                  <span className="opa-report-card__icon" aria-hidden>
                    <Download size={21} strokeWidth={2.3} />
                  </span>
                  <div className="opa-report-card__copy">
                    <h2 className="opa-report-card__title">{t('ownerAnalyticsExportExcel')}</h2>
                    <p className="opa-report-card__text">{t('ownerTest_adPremiumText')}</p>
                  </div>
                  <button
                    type="button"
                    className="opa-report-card__button"
                    onClick={handleExportToExcel}
                    disabled={exportingExcel}
                  >
                    {exportingExcel ? t('ownerTest_profileExporting') : t('ownerTest_analyticsExport')}
                  </button>
                </article>
              </div>
            </section>

            <AnalyticsTimerPanel property={property} now={timerNow} t={t} />

          </div>
        </div>
      </div>
  )

  if (isEmbedded) return mainColumn

  return (
    <div className={`opa${menuOpen ? ' opa--menu-open' : ''}`}>
      <header className="opa-mob-topbar opa-mobile-only" aria-label={t('ownerTest_ariaMobileHeader')}>
        <div className="opa-mob-topbar__slot opa-mob-topbar__slot--left">
          <Link to="/owner-properties-test" className="opa-mob-topbar__back" aria-label={t('ownerTest_analyticsBack')}>
            <ArrowLeft size={22} strokeWidth={2} />
          </Link>
        </div>
        <div className="opa-mob-topbar__title-wrap">
          <h1 className="opa-mob-topbar__title">{property.title}</h1>
        </div>
        <div className="opa-mob-topbar__slot opa-mob-topbar__slot--right">
          <button type="button" className="opa-mob-topbar__period" aria-label={t('ownerTest_ariaAnalyticsPeriod')}>
            <RefreshCw size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

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
                  <stop offset="0%" stopColor="#53d8d3" />
                  <stop offset="100%" stopColor="#089a95" />
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

      <nav className="opa-tabbar opa-mobile-only" aria-label={t('ownerTest_ariaBottomNav')}>
        {tabItems.map((item) => {
          if (item.fab) {
            return (
              <div key="fab" className="opa-tabbar__fab-slot">
                <Link to="/owner-add-property-test" className="opa-tabbar__fab" aria-label={t('ownerTest_ariaAddProperty')}>
                  <Plus size={28} strokeWidth={2.5} />
                </Link>
              </div>
            )
          }
          const Icon = item.icon
          const className = `opa-tabbar__item${item.active ? ' opa-tabbar__item--active' : ''}`
          if (item.href) {
            return (
              <Link key={item.id} to={item.href} className={className}>
                <Icon size={22} strokeWidth={2} aria-hidden />
                <span>{item.label}</span>
              </Link>
            )
          }
          return (
            <button key={item.id} type="button" className={className}>
              <Icon size={22} strokeWidth={item.active ? 2.25 : 2} aria-hidden />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
