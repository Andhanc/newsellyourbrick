import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  ShoppingBag,
  Car,
  CreditCard,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronDown,
  Menu,
  X,
  ArrowLeft,
  Calendar,
  Heart,
  Inbox,
  MoreVertical,
  Plus,
  Gavel,
  Home,
  Briefcase,
  ClipboardList,
  SlidersHorizontal,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { OWNER_PROP_IMAGES } from './ownerPropertiesTestImages'
import { OWNER_LISTING_TYPE_LABELS, getOwnerTestProperty } from './ownerPropertiesTestData'
import {
  fetchOwnerProperties,
  getOwnerPropertiesUserId,
} from '../utils/ownerPropertiesList'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import OwnerNotificationsButton from '../components/OwnerNotificationsButton'
import { useOwnerTestProfile } from '../context/OwnerTestProfileContext'
import { OWNER_VIEWS } from '../context/OwnerTestNavigationContext'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import './OwnerPropertyAnalyticsTestPage.css'
import './OwnerPropertyAnalyticsTestPage.mobile.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
)

const OPA_TIFFANY = '#0abab5'

const CHART_METRICS = [
  { id: 'bids', label: 'Ставки' },
  { id: 'views', label: 'Просмотры' },
  { id: 'likes', label: 'Понравилось' },
]

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard, href: '/main-owner-test' },
  { id: 'properties', label: 'Мои объекты', icon: Building2, href: '/owner-properties-test', active: true },
  { id: 'bookings', label: 'Брони', icon: CalendarCheck },
  { id: 'sales', label: 'Продажи', icon: ShoppingBag, href: '/owner-sales-test' },
  { id: 'testdrive', label: 'Тест-драйв', icon: Car, href: '/owner-test-drive' },
  { id: 'subscriptions', label: 'Подписки', icon: CreditCard, href: '/owner-subscriptions-test' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: 3 },
  { id: 'settings', label: 'Настройки', icon: Settings, href: '/owner-profile-test' },
]

const TAB_ITEMS = [
  { id: 'home', label: 'Главная', icon: Home, href: '/main-owner-test' },
  { id: 'properties', label: 'Объекты', icon: Briefcase, href: '/owner-properties-test', active: true },
  { id: 'fab', fab: true },
  { id: 'bookings', label: 'Брони', icon: ClipboardList },
  { id: 'more', label: 'Ещё', icon: SlidersHorizontal },
]

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

function getAnalyticsTimerState(property, now = Date.now()) {
  const endTime = getAnalyticsTimerEndTime(property)
  if (!endTime && property?.auctionTimer) {
    return { expired: false, critical: false, caption: 'Осталось', label: property.auctionTimer }
  }
  if (!endTime) return null

  const endMs = new Date(endTime).getTime()
  if (!Number.isFinite(endMs)) return null

  const remainingMs = endMs - now
  if (remainingMs <= 0) {
    return { expired: true, critical: false, caption: 'Таймер', label: 'Завершён' }
  }

  const totalSeconds = Math.floor(remainingMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const two = (value) => String(value).padStart(2, '0')

  return {
    expired: false,
    critical: days === 0 && hours < 1,
    caption: 'Осталось',
    label: days > 0
      ? `${days}д ${two(hours)}:${two(minutes)}:${two(seconds)}`
      : `${two(hours)}:${two(minutes)}:${two(seconds)}`,
  }
}

function AnalyticsTimerCard({ property, now }) {
  const timer = getAnalyticsTimerState(property, now)
  if (!timer) return null

  return (
    <span
      className={[
        'opa-object-timer',
        timer.expired && 'opa-object-timer--expired',
        timer.critical && 'opa-object-timer--critical',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="opa-object-timer__icon" aria-hidden>
        <Clock size={14} strokeWidth={2.4} />
      </span>
      <span className="opa-object-timer__content">
        <span className="opa-object-timer__caption">{timer.caption}</span>
        <span className="opa-object-timer__value">{timer.label}</span>
      </span>
    </span>
  )
}

export default function OwnerPropertyAnalyticsTestPage() {
  const { fullName, roleLabel } = useOwnerTestProfile()
  const { propertyId: routePropertyId } = useParams()
  const { isEmbedded, goTo, propertyId: embeddedPropertyId } = useOwnerTestEmbeddedNav()
  const propertyId = isEmbedded ? embeddedPropertyId : routePropertyId
  const [property, setProperty] = useState(() => getOwnerTestProperty(propertyId))
  const [propertyLoading, setPropertyLoading] = useState(() => !getOwnerTestProperty(propertyId))
  const [menuOpen, setMenuOpen] = useState(false)
  const [chartMetric, setChartMetric] = useState('bids')
  const [chartMetricOpen, setChartMetricOpen] = useState(false)
  const [timerNow, setTimerNow] = useState(() => Date.now())
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
  const selectedChartMetric = CHART_METRICS.find((metric) => metric.id === chartMetric) || CHART_METRICS[0]
  const listingTypeLabel = OWNER_LISTING_TYPE_LABELS[property?.listingType] || 'Продажа'

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

  const donutData = useMemo(() => {
    if (!analytics) return null
    return {
      labels: analytics.trafficSources.map((s) => s.label),
      datasets: [
        {
          data: analytics.trafficSources.map((s) => s.pct),
          backgroundColor: analytics.trafficSources.map((s) => s.color),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    }
  }, [analytics])

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
    }),
    []
  )

  if (propertyLoading) {
    return (
      <div className="opa-page opa-page--loading">
        <p>Загрузка объекта…</p>
      </div>
    )
  }

  if (!property) {
    if (isEmbedded) return null
    return <Navigate to="/owner-properties-test" replace />
  }

  const kpiItems = [
    {
      label: 'Просмотры',
      value: analytics.views,
      delta: property.viewsDelta,
      up: property.viewsUp,
      icon: BarChart3,
    },
    {
      label: 'Ставки',
      value: analytics.bids,
      delta: '',
      up: null,
      icon: Gavel,
    },
    {
      label: 'Лайки',
      value: analytics.likes,
      delta: analytics.favoritesDelta,
      up: analytics.favoritesUp,
      icon: Heart,
    },
    {
      label: 'Заявки',
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
            <h1 className="opa-header__title">Аналитика по объекту</h1>
            {isEmbedded ? (
              <button
                type="button"
                className="opa-back-link"
                onClick={() => goTo(OWNER_VIEWS.PROPERTIES)}
              >
                <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
                Назад к объектам
              </button>
            ) : (
              <Link to="/owner-properties-test" className="opa-back-link">
                <ArrowLeft size={16} strokeWidth={2.2} aria-hidden />
                Назад к объектам
              </Link>
            )}
          </div>
          <div className="opa-header__actions">
            <button type="button" className="opa-period-pill">
              <Calendar size={16} strokeWidth={2} aria-hidden />
              {analytics.period}
              <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
            </button>
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
                      <span>Тип продажи</span>
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
                  <h2 className="opa-card__title">Динамика: {selectedChartMetric.label.toLowerCase()}</h2>
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
                      <div className="opa-metric-select__menu" role="listbox" aria-label="Метрика графика">
                        {CHART_METRICS.map((metric) => (
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

              <article className="opa-card opa-traffic-card opa-desktop-only">
                <h2 className="opa-card__title">Источники трафика</h2>
                <div className="opa-traffic-card__body">
                  <div className="opa-traffic-visual">
                    <div className="opa-donut-wrap">
                      {donutData && <Doughnut data={donutData} options={donutOptions} />}
                      <div className="opa-donut-center">
                        <span className="opa-donut-center__label">Всего</span>
                        <span className="opa-donut-center__value">{analytics.trafficTotal}</span>
                      </div>
                    </div>
                    <AnalyticsTimerCard property={property} now={timerNow} />
                  </div>
                  <ul className="opa-traffic-legend">
                    {analytics.trafficSources.map((source) => (
                      <li key={source.label}>
                        <i style={{ background: source.color }} />
                        <span>{source.label}</span>
                        <strong>{source.pct}%</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </section>

          </div>
        </div>
      </div>
  )

  if (isEmbedded) return mainColumn

  return (
    <div className={`opa${menuOpen ? ' opa--menu-open' : ''}`}>
      <header className="opa-mob-topbar opa-mobile-only" aria-label="Мобильная шапка">
        <div className="opa-mob-topbar__slot opa-mob-topbar__slot--left">
          <Link to="/owner-properties-test" className="opa-mob-topbar__back" aria-label="Назад к объектам">
            <ArrowLeft size={22} strokeWidth={2} />
          </Link>
        </div>
        <div className="opa-mob-topbar__title-wrap">
          <h1 className="opa-mob-topbar__title">{property.title}</h1>
        </div>
        <div className="opa-mob-topbar__slot opa-mob-topbar__slot--right">
          <button type="button" className="opa-mob-topbar__period" aria-label="Период">
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
        aria-label="Меню кабинета"
        aria-hidden={!menuOpen}
      >
        <div className="opa-drawer__head">
          <div className="opa-mob-topbar__brand">
            <LogoMark />
            <span className="opa-logo__text">SellYourBrick</span>
          </div>
          <button type="button" className="opa-drawer__close" aria-label="Закрыть меню" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="opa-sidebar__divider opa-sidebar__divider--drawer" aria-hidden />
        <nav className="opa-nav opa-nav--drawer">{NAV_ITEMS.map(renderNavItem)}</nav>
      </aside>

      <aside className="opa-sidebar opa-desktop-only">
        <div className="opa-sidebar__brand">
          <span className="opa-logo__mark-slot" aria-hidden />
          <span className="opa-logo__text">SellYourBrick</span>
        </div>
        <div className="opa-sidebar__divider" aria-hidden />
        <nav className="opa-nav" aria-label="Кабинет продавца">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>
        <div className="opa-sidebar-promo">
          <p className="opa-sidebar-promo__title">Станьте покупателем</p>
          <p className="opa-sidebar-promo__text">Ищите и бронируйте недвижимость на платформе</p>
          <button type="button" className="opa-btn opa-btn--primary opa-btn--sm">
            Стать покупателем
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
          <button type="button" className="opa-sidebar-user__menu" aria-label="Меню профиля">
            <MoreVertical size={18} />
          </button>
        </div>
      </aside>

      {mainColumn}

      <nav className="opa-tabbar opa-mobile-only" aria-label="Нижняя навигация">
        {TAB_ITEMS.map((item) => {
          if (item.fab) {
            return (
              <div key="fab" className="opa-tabbar__fab-slot">
                <Link to="/owner-add-property-test" className="opa-tabbar__fab" aria-label="Добавить объект">
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
