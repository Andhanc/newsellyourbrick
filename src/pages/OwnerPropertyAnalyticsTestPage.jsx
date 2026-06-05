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
  Bell,
  ChevronDown,
  Menu,
  X,
  ArrowLeft,
  Calendar,
  Heart,
  CarFront,
  Inbox,
  MoreVertical,
  Plus,
  Home,
  Briefcase,
  ClipboardList,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react'
import { OWNER_PROP_IMAGES } from './ownerPropertiesTestImages'
import { getOwnerTestProperty } from './ownerPropertiesTestData'
import {
  fetchOwnerProperties,
  getOwnerPropertiesUserId,
} from '../utils/ownerPropertiesList'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
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

export default function OwnerPropertyAnalyticsTestPage() {
  const { fullName, roleLabel } = useOwnerTestProfile()
  const { propertyId: routePropertyId } = useParams()
  const { isEmbedded, goTo, propertyId: embeddedPropertyId } = useOwnerTestEmbeddedNav()
  const propertyId = isEmbedded ? embeddedPropertyId : routePropertyId
  const [property, setProperty] = useState(() => getOwnerTestProperty(propertyId))
  const [propertyLoading, setPropertyLoading] = useState(() => !getOwnerTestProperty(propertyId))
  const [menuOpen, setMenuOpen] = useState(false)
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

  const analytics = property?.analytics

  const lineChartData = useMemo(() => {
    if (!analytics) return null
    return {
      labels: isMobile ? analytics.chartLabelsMobile : analytics.chartLabelsDesktop,
      datasets: [
        {
          label: 'Просмотры',
          data: isMobile ? analytics.viewsChartMobile : analytics.viewsChartDesktop,
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
  }, [analytics, isMobile])

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
      value: property.views,
      delta: property.viewsDelta,
      up: property.viewsUp,
      icon: BarChart3,
    },
    {
      label: 'В избранное',
      value: analytics.favorites,
      delta: analytics.favoritesDelta,
      up: analytics.favoritesUp,
      icon: Heart,
    },
    {
      label: 'Тест-драйвы',
      value: analytics.testDrives,
      delta: analytics.testDrivesDelta,
      up: analytics.testDrivesUp,
      icon: CarFront,
    },
    {
      label: 'Заявки',
      value: analytics.leads,
      delta: analytics.leadsDelta,
      up: analytics.leadsUp,
      icon: Inbox,
    },
  ]

  const extraStats = [
    { label: 'Среднее время на странице', value: analytics.avgTime },
    { label: 'Показатель отказов', value: analytics.bounceRate },
    { label: 'Добавлено в избранное', value: analytics.addedToFavorites },
    { label: 'Поделились', value: analytics.shares },
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
            <button type="button" className="opa-icon-btn" aria-label="Уведомления">
              <Bell size={20} strokeWidth={2} />
              <span className="opa-icon-btn__badge">3</span>
            </button>
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
                  <span className={`opa-status opa-status--${property.statusKey}`}>{property.status}</span>
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
                  <h2 className="opa-card__title">Динамика просмотров</h2>
                  <button type="button" className="opa-select-pill">
                    Просмотры
                    <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
                  </button>
                </div>
                <div className="opa-chart-card__canvas">
                  {lineChartData && <Line data={lineChartData} options={lineChartOptions} />}
                </div>
              </article>

              <article className="opa-card opa-traffic-card opa-desktop-only">
                <h2 className="opa-card__title">Источники трафика</h2>
                <div className="opa-traffic-card__body">
                  <div className="opa-donut-wrap">
                    {donutData && <Doughnut data={donutData} options={donutOptions} />}
                    <div className="opa-donut-center">
                      <span className="opa-donut-center__label">Всего</span>
                      <span className="opa-donut-center__value">{analytics.trafficTotal}</span>
                    </div>
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

            <section className="opa-card opa-extra-stats opa-desktop-only">
              <h2 className="opa-card__title">Дополнительная статистика</h2>
              <div className="opa-extra-stats__grid">
                {extraStats.map((item) => (
                  <div key={item.label} className="opa-extra-stat">
                    <span className="opa-extra-stat__label">{item.label}</span>
                    <span className="opa-extra-stat__value">{item.value}</span>
                  </div>
                ))}
              </div>
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
