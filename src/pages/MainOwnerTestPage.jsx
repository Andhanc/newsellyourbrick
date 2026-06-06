import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
  Home,
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
  Calendar,
  Eye,
  TrendingUp,
  Menu,
  X,
  Briefcase,
  Plus,
  SlidersHorizontal,
  DollarSign,
  ClipboardList,
} from 'lucide-react'
import { MOT_PROMO_IMAGES } from './mainOwnerTestPromoImages'
import OwnerNotificationsDrawer from '../components/OwnerNotificationsDrawer'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { useOwnerTestEmbeddedNav } from '../hooks/useOwnerTestEmbeddedNav'
import './MainOwnerTestPage.css'
import './MainOwnerTestPage.mobile.css'

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

const NAV_ITEMS = [
  { id: 'home', label: 'Главная', icon: LayoutDashboard, active: true },
  { id: 'properties', label: 'Мои объекты', icon: Building2, href: '/owner-properties-test' },
  { id: 'bookings', label: 'Брони', icon: CalendarCheck },
  { id: 'sales', label: 'Продажи', icon: ShoppingBag, href: '/owner-sales-test' },
  { id: 'testdrive', label: 'Тест-драйв', icon: Car, href: '/owner-test-drive' },
  { id: 'subscriptions', label: 'Подписки', icon: CreditCard, href: '/owner-subscriptions-test' },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'messages', label: 'Сообщения', icon: MessageSquare, badge: 3 },
  { id: 'settings', label: 'Настройки', icon: Settings, href: '/owner-profile-test' },
]

const TAB_ITEMS = [
  { id: 'home', label: 'Главная', icon: Home, active: true },
  { id: 'properties', label: 'Объекты', icon: Briefcase },
  { id: 'fab', fab: true },
  { id: 'bookings', label: 'Брони', icon: ClipboardList },
  { id: 'more', label: 'Ещё', icon: SlidersHorizontal },
]

const METRICS = [
  {
    label: 'Просмотры',
    value: '12 450',
    delta: '+ 12.5%',
    spark: 'tiffany',
    icon: Eye,
    iconTone: 'tiffany',
  },
  {
    label: 'Брони',
    value: '834',
    delta: '+ 8.2%',
    spark: 'orange',
    icon: CalendarCheck,
    iconTone: 'orange',
  },
  {
    label: 'Продажи',
    value: '128',
    delta: '+ 9.7%',
    spark: 'teal',
    icon: ShoppingBag,
    iconTone: 'teal',
  },
  {
    label: 'Доход',
    value: '$48 750',
    delta: '+ 24.3%',
    spark: 'green',
    icon: DollarSign,
    iconTone: 'green',
  },
]

const ACTIVITY = [
  {
    tone: 'blue',
    icon: CalendarCheck,
    title: 'Новая бронь на объект',
    subtitle: 'Вилла у моря',
    time: '12 мин назад',
  },
  {
    tone: 'green',
    icon: Car,
    title: 'Новый тест-драйв',
    subtitle: 'Апартаменты в центре',
    time: '15 мин назад',
  },
  {
    tone: 'orange',
    icon: ShoppingBag,
    title: 'Объект продан',
    subtitle: 'Дом в пригороде',
    time: '1 час назад',
  },
  {
    tone: 'red',
    icon: MessageSquare,
    title: 'Новый запрос от покупателя',
    subtitle: 'Пентхаус с видом',
    time: '2 часа назад',
  },
]

const STATUS_LEGEND = [
  { label: 'Активные', count: 8, color: '#0abab5' },
  { label: 'Забронированные', count: 4, color: '#5eead4' },
  { label: 'Проданные', count: 3, color: '#F59E0B' },
  { label: 'Черновики', count: 3, color: '#EF4444' },
]

const MOT_TIFFANY = '#0abab5'

const DATE_PRESETS = [
  { id: 'week', label: '7 дней', from: '2024-05-25', to: '2024-05-31' },
  { id: 'month', label: 'Май', from: '2024-05-01', to: '2024-05-31' },
  { id: 'quarter', label: 'Квартал', from: '2024-04-01', to: '2024-06-30' },
]

const INITIAL_DATE_RANGE = DATE_PRESETS[1]

const SPARK_COLORS = {
  tiffany: MOT_TIFFANY,
  orange: '#F59E0B',
  teal: '#14B8A6',
  green: '#22C55E',
}

function formatMotDate(value) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(date)
    .replace(/\.$/, '')
}

function dateRangeLabel(range) {
  return `${formatMotDate(range.from)} – ${formatMotDate(range.to)}`
}

function DateRangePopover({ open, draftRange, selectedRange, onDraftChange, onPreset, onApply, onClose }) {
  return (
    <div className={`mot-date-popover${open ? ' mot-date-popover--open' : ''}`}>
      <div className="mot-date-popover__head">
        <span>Период аналитики</span>
        <strong>{dateRangeLabel(draftRange)}</strong>
      </div>
      <div className="mot-date-popover__presets" aria-label="Быстрый выбор периода">
        {DATE_PRESETS.map((preset) => {
          const active = draftRange.from === preset.from && draftRange.to === preset.to
          return (
            <button
              key={preset.id}
              type="button"
              className={`mot-date-popover__preset${active ? ' mot-date-popover__preset--active' : ''}`}
              onClick={() => onPreset(preset)}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
      <div className="mot-date-popover__fields">
        <label>
          <span>С</span>
          <input
            type="date"
            value={draftRange.from}
            onChange={(event) => onDraftChange({ ...draftRange, from: event.target.value })}
          />
        </label>
        <label>
          <span>По</span>
          <input
            type="date"
            value={draftRange.to}
            onChange={(event) => onDraftChange({ ...draftRange, to: event.target.value })}
          />
        </label>
      </div>
      <div className="mot-date-popover__actions">
        <button type="button" className="mot-date-popover__ghost" onClick={onClose}>
          Отмена
        </button>
        <button type="button" className="mot-date-popover__apply" onClick={onApply}>
          Применить
        </button>
      </div>
    </div>
  )
}

function LogoMark({ className = '' }) {
  return (
    <svg className={`mot-logo__mark ${className}`.trim()} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="mot-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#53d8d3" />
          <stop offset="100%" stopColor="#089a95" />
        </linearGradient>
      </defs>
      <path d="M20 2L35 11v18L20 38 5 29V11L20 2z" fill="url(#mot-logo-grad)" />
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

function Sparkline({ variant, className = '' }) {
  const stroke = SPARK_COLORS[variant] || SPARK_COLORS.tiffany
  const path =
    variant === 'tiffany'
      ? 'M2 18 C8 14, 10 8, 16 10 S24 6, 30 4 S38 12, 46 8'
      : variant === 'orange'
        ? 'M2 17 C10 13, 14 19, 22 15 S32 9, 40 13 S44 7, 46 11'
        : 'M2 16 C10 12, 14 18, 22 14 S32 8, 40 12 S44 6, 46 10'
  return (
    <svg className={`mot-metric__spark ${className}`.trim()} viewBox="0 0 48 22" aria-hidden>
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const ACTIVITY_TONES = {
  blue: { bg: '#ecfdf5', fg: MOT_TIFFANY },
  green: { bg: '#ecfdf5', fg: '#22C55E' },
  orange: { bg: '#fff7ed', fg: '#F59E0B' },
  red: { bg: '#fef2f2', fg: '#EF4444' },
}

function ActivityIcon({ tone, icon: Icon }) {
  const c = ACTIVITY_TONES[tone] || ACTIVITY_TONES.blue
  const ResolvedIcon = Icon || TrendingUp
  return (
    <span className="mot-activity__icon" style={{ background: c.bg, color: c.fg }}>
      <ResolvedIcon size={18} strokeWidth={2.2} />
    </span>
  )
}

function useMotMobile() {
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

export default function MainOwnerTestPage() {
  const { isEmbedded } = useOwnerTestEmbeddedNav()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [selectedRange, setSelectedRange] = useState(INITIAL_DATE_RANGE)
  const [draftRange, setDraftRange] = useState(INITIAL_DATE_RANGE)
  const isMobile = useMotMobile()

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const closeDatePopover = useCallback(() => {
    setDraftRange(selectedRange)
    setDatePopoverOpen(false)
  }, [selectedRange])

  const handleApplyRange = useCallback(() => {
    setSelectedRange(draftRange)
    setDatePopoverOpen(false)
  }, [draftRange])

  const renderNavItem = useCallback(
    ({ id, label, icon: Icon, active, badge, href }) => {
      const className = `mot-nav__item${active ? ' mot-nav__item--active' : ''}`
      const inner = (
        <>
          <Icon size={20} strokeWidth={active ? 2.25 : 2} aria-hidden />
          <span>{label}</span>
          {badge != null && <span className="mot-nav__badge">{badge}</span>}
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
    document.documentElement.classList.add('mot-page-active')
    return () => document.documentElement.classList.remove('mot-page-active')
  }, [isEmbedded])

  useEffect(() => {
    if (!menuOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  useEffect(() => {
    if (!datePopoverOpen) return undefined

    const handlePointerDown = (event) => {
      if (!event.target.closest('.mot-date-control')) {
        setDraftRange(selectedRange)
        setDatePopoverOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDraftRange(selectedRange)
        setDatePopoverOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [datePopoverOpen, selectedRange])

  const lineChartData = useMemo(
    () => ({
      labels: isMobile
        ? ['1 мая', '16 мая', '31 мая']
        : ['1 мая', '8 мая', '16 мая', '24 мая', '31 мая'],
      datasets: [
        {
          label: 'Просмотры',
          data: isMobile ? [620, 1650, 1850] : [620, 1100, 1650, 1200, 1850],
          borderColor: MOT_TIFFANY,
          backgroundColor: 'rgba(10, 186, 181, 0.12)',
          fill: true,
          tension: 0.42,
          pointRadius: isMobile ? 4 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: MOT_TIFFANY,
          borderWidth: 2.5,
        },
        {
          label: 'Брони',
          data: isMobile ? [280, 580, 720] : [280, 420, 580, 480, 720],
          borderColor: '#F59E0B',
          backgroundColor: 'transparent',
          tension: 0.42,
          pointRadius: isMobile ? 4 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#F59E0B',
          borderWidth: 2.5,
        },
        {
          label: 'Продажи',
          data: isMobile ? [120, 260, 340] : [120, 180, 260, 220, 340],
          borderColor: '#22C55E',
          backgroundColor: 'transparent',
          tension: 0.42,
          pointRadius: isMobile ? 4 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#22C55E',
          borderWidth: 2.5,
        },
      ],
    }),
    [isMobile]
  )

  const lineChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
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
          grid: { color: '#F1F5F9', drawBorder: false },
          ticks: {
            color: '#94A3B8',
            font: { family: 'Inter', size: isMobile ? 10 : 11 },
            maxRotation: 0,
            maxTicksLimit: isMobile ? 3 : undefined,
          },
          border: { display: false },
        },
        y: {
          min: 0,
          max: 2000,
          ticks: {
            stepSize: 500,
            color: '#94A3B8',
            font: { family: 'Inter', size: isMobile ? 10 : 11 },
            callback: (v) => v,
          },
          grid: { color: '#F1F5F9', drawBorder: false },
          border: { display: false },
        },
      },
    }),
    [isMobile]
  )

  const donutData = useMemo(
    () => ({
      labels: STATUS_LEGEND.map((s) => s.label),
      datasets: [
        {
          data: STATUS_LEGEND.map((s) => s.count),
          backgroundColor: STATUS_LEGEND.map((s) => s.color),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    }),
    []
  )

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

  const mainColumn = (
    <div className="mot-main">
      <header className="mot-header mot-desktop-only">
        <h1 className="mot-header__title">Главная</h1>
        <div className="mot-header__actions">
          <div className="mot-date-control">
            <button
              type="button"
              className="mot-date-pill"
              aria-haspopup="dialog"
              aria-expanded={datePopoverOpen}
              onClick={() => {
                setDraftRange(selectedRange)
                setDatePopoverOpen((prev) => !prev)
              }}
            >
              <Calendar size={18} strokeWidth={2} aria-hidden />
              <span>{dateRangeLabel(selectedRange)}</span>
              <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
            </button>
            <DateRangePopover
              open={datePopoverOpen}
              draftRange={draftRange}
              selectedRange={selectedRange}
              onDraftChange={setDraftRange}
              onPreset={setDraftRange}
              onApply={handleApplyRange}
              onClose={closeDatePopover}
            />
          </div>
          <button
            type="button"
            className="mot-icon-btn"
            aria-label="Уведомления"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell size={20} strokeWidth={2} />
            <span className="mot-icon-btn__badge">3</span>
          </button>
          <OwnerTestProfileMenu />
        </div>
      </header>

      <div className="mot-mob-pagehead mot-mobile-only">
        <h1 className="mot-mob-pagehead__title">Главная</h1>
        <div className="mot-date-control mot-date-control--mobile">
          <button
            type="button"
            className="mot-date-pill mot-date-pill--compact"
            aria-haspopup="dialog"
            aria-expanded={datePopoverOpen}
            onClick={() => {
              setDraftRange(selectedRange)
              setDatePopoverOpen((prev) => !prev)
            }}
          >
            <span>{dateRangeLabel(selectedRange)}</span>
            <Calendar size={16} strokeWidth={2} aria-hidden />
          </button>
          <DateRangePopover
            open={datePopoverOpen}
            draftRange={draftRange}
            selectedRange={selectedRange}
            onDraftChange={setDraftRange}
            onPreset={setDraftRange}
            onApply={handleApplyRange}
            onClose={closeDatePopover}
          />
        </div>
      </div>

      <div className="mot-content">
        <section className="mot-metrics-wrap mot-mobile-only" aria-label="Ключевые показатели">
          <div className="mot-metrics mot-metrics--scroll">
            {METRICS.map((m) => {
              const Icon = m.icon
              return (
                <article key={m.label} className="mot-card mot-metric mot-metric--mobile">
                  <span className={`mot-metric__icon mot-metric__icon--${m.iconTone}`}>
                    <Icon size={17} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="mot-metric__label">{m.label}</span>
                  <span className="mot-metric__value">{m.value}</span>
                  <span className="mot-metric__delta">{m.delta}</span>
                  <Sparkline variant={m.spark} className="mot-metric__spark--bottom" />
                </article>
              )
            })}
          </div>
        </section>

        <section className="mot-metrics mot-desktop-only" aria-label="Ключевые показатели">
          {METRICS.map((m) => {
            const Icon = m.icon
            return (
              <article key={m.label} className="mot-card mot-metric">
                <span className={`mot-metric__icon mot-metric__icon--${m.iconTone}`}>
                  <Icon size={18} strokeWidth={2.2} aria-hidden />
                </span>
                <div className="mot-metric__head">
                  <span className="mot-metric__label">{m.label}</span>
                  <Sparkline variant={m.spark} />
                </div>
                <div className="mot-metric__figures">
                  <span className="mot-metric__value">{m.value}</span>
                  <span className="mot-metric__delta">{m.delta}</span>
                </div>
              </article>
            )
          })}
        </section>

        <section className="mot-row mot-row--chart">
          <article className="mot-card mot-chart-card">
            <div className="mot-chart-card__head">
              <h2 className="mot-card__title">Динамика просмотров</h2>
              <button type="button" className="mot-select-pill">
                Месяц
                <ChevronDown size={14} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
            <div className="mot-chart-card__legend">
              <span className="mot-legend-item">
                <i style={{ background: MOT_TIFFANY }} /> Просмотры
              </span>
              <span className="mot-legend-item">
                <i style={{ background: '#F59E0B' }} /> Брони
              </span>
              <span className="mot-legend-item">
                <i style={{ background: '#22C55E' }} /> Продажи
              </span>
            </div>
            <div className="mot-chart-card__canvas">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </article>

          <article className="mot-card mot-best mot-desktop-only">
            <h2 className="mot-card__title">Лучший объект</h2>
            <div className="mot-best__media">
              <img
                src={MOT_PROMO_IMAGES.bestProperty}
                alt=""
                className="mot-best__photo"
                loading="lazy"
                decoding="async"
              />
              <span className="mot-best__badge">Активный</span>
            </div>
            <h3 className="mot-best__name">Вилла у моря</h3>
            <p className="mot-best__location">Майами, США</p>
            <p className="mot-best__price">$2 450 000</p>
            <div className="mot-best__stats">
              <span>
                <Eye size={14} strokeWidth={2} aria-hidden /> 1245 просмотров
              </span>
              <span>
                <CalendarCheck size={14} strokeWidth={2} aria-hidden /> 32 брони
              </span>
            </div>
            <button type="button" className="mot-btn mot-btn--soft mot-btn--block">
              Подробнее
            </button>
          </article>
        </section>

        <section className="mot-row mot-row--triple">
          <article className="mot-card mot-activity-card">
            <div className="mot-activity-card__head">
              <h2 className="mot-card__title">Последняя активность</h2>
              <button type="button" className="mot-link-btn mot-link-btn--all mot-mobile-only">
                Все
              </button>
            </div>
            <ul className="mot-activity">
              {ACTIVITY.map((item) => (
                <li key={item.title + item.time} className="mot-activity__item">
                  <ActivityIcon tone={item.tone} icon={item.icon} />
                  <div className="mot-activity__body">
                    <p className="mot-activity__title">{item.title}</p>
                    <p className="mot-activity__subtitle">{item.subtitle}</p>
                  </div>
                  <time className="mot-activity__time">{item.time}</time>
                </li>
              ))}
            </ul>
            <button type="button" className="mot-link-btn mot-desktop-only">
              Все уведомления
            </button>
          </article>

          <article className="mot-card mot-status-card mot-desktop-only">
            <h2 className="mot-card__title">Распределение по статусам</h2>
            <div className="mot-status-card__body">
              <div className="mot-donut-wrap">
                <Doughnut data={donutData} options={donutOptions} />
                <div className="mot-donut-center">
                  <span className="mot-donut-center__label">Всего</span>
                  <span className="mot-donut-center__value">18</span>
                </div>
              </div>
              <ul className="mot-status-legend">
                {STATUS_LEGEND.map((s) => (
                  <li key={s.label}>
                    <i style={{ background: s.color }} />
                    <span>{s.label}</span>
                    <strong>{s.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="mot-promo-card mot-promo-card--light mot-promo-card--promote mot-desktop-only">
            <div className="mot-promo-card__copy">
              <span className="mot-promo-card__tag">Продвижение</span>
              <h2 className="mot-promo-card__title">Продвигайте свои объекты!</h2>
              <p className="mot-promo-card__text">
                Увеличьте просмотры и получайте больше броней с тарифами продвижения
              </p>
              <div className="mot-promo-card__actions">
                <button type="button" className="mot-btn mot-btn--primary mot-btn--sm">
                  Выбрать тариф
                </button>
              </div>
            </div>
            <div className="mot-promo-card__visual mot-promo-card__visual--listing" aria-hidden>
              <img src={MOT_PROMO_IMAGES.promoteListing} alt="" loading="lazy" decoding="async" />
            </div>
          </article>
        </section>

        <section className="mot-promo-grid mot-desktop-only" aria-label="Рекламные предложения">
          <article className="mot-promo-card mot-promo-card--dark mot-promo-card--buyer">
            <div className="mot-promo-card__glow" aria-hidden />
            <div className="mot-promo-card__copy">
              <span className="mot-promo-card__tag">Режим покупателя</span>
              <h2 className="mot-promo-card__title">Ищете недвижимость для себя?</h2>
              <p className="mot-promo-card__text">
                Переключитесь в режим покупателя и находите объекты по всему миру
              </p>
              <div className="mot-promo-card__actions mot-promo-card__actions--dark">
                <button type="button" className="mot-btn mot-btn--white mot-btn--sm">
                  Стать покупателем
                </button>
              </div>
            </div>
            <div className="mot-promo-card__visual mot-promo-card__visual--photo" aria-hidden>
              <img src={MOT_PROMO_IMAGES.bannerBuyer} alt="" loading="lazy" decoding="async" />
            </div>
          </article>
        </section>

        <section className="mot-mob-promo-grid mot-mobile-only" aria-label="Рекламные предложения">
          <article className="mot-mob-promo-card mot-mob-promo-card--light">
            <div className="mot-mob-promo-card__copy">
              <span className="mot-mob-promo-card__tag">Продвижение</span>
              <h2 className="mot-mob-promo-card__title">Продвигайте объекты</h2>
              <p className="mot-mob-promo-card__text">
                Больше просмотров и броней с тарифами продвижения
              </p>
              <button type="button" className="mot-btn mot-btn--primary mot-btn--sm">
                Выбрать тариф
              </button>
            </div>
            <div className="mot-mob-promo-card__visual" aria-hidden>
              <img src={MOT_PROMO_IMAGES.promoteThumb} alt="" loading="lazy" decoding="async" />
            </div>
          </article>

          <article className="mot-mob-promo-card mot-mob-promo-card--dark">
            <div className="mot-mob-promo-card__copy">
              <span className="mot-mob-promo-card__tag">Покупатель</span>
              <h2 className="mot-mob-promo-card__title">Станьте покупателем</h2>
              <p className="mot-mob-promo-card__text">
                Ищите и бронируйте недвижимость на платформе
              </p>
              <button type="button" className="mot-btn mot-btn--white mot-btn--sm">
                Стать покупателем
              </button>
            </div>
            <div className="mot-mob-promo-card__visual" aria-hidden>
              <img src={MOT_PROMO_IMAGES.buyerThumb} alt="" loading="lazy" decoding="async" />
            </div>
          </article>

        </section>
      </div>

      <OwnerNotificationsDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  )

  if (isEmbedded) return mainColumn

  return (
    <div className={`mot${menuOpen ? ' mot--menu-open' : ''}`}>
      <header className="mot-mob-topbar mot-mobile-only" aria-label="Мобильная шапка">
        <div className="mot-mob-topbar__slot mot-mob-topbar__slot--left">
          <button
            type="button"
            className="mot-mob-topbar__menu"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="mot-mob-topbar__brand">
          <LogoMark />
          <span className="mot-logo__text">SellYourBrick</span>
        </div>
        <div className="mot-mob-topbar__slot mot-mob-topbar__slot--right">
          <button
            type="button"
            className="mot-mob-topbar__bell"
            aria-label="Уведомления"
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell size={22} strokeWidth={2} />
            <span className="mot-icon-btn__badge">3</span>
          </button>
        </div>
      </header>

      <div
        className="mot-drawer-backdrop mot-mobile-only"
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <aside
        className={`mot-drawer mot-mobile-only${menuOpen ? ' mot-drawer--open' : ''}`}
        aria-label="Меню кабинета"
        aria-hidden={!menuOpen}
      >
        <div className="mot-drawer__head">
          <div className="mot-mob-topbar__brand">
            <LogoMark />
            <span className="mot-logo__text">SellYourBrick</span>
          </div>
          <button type="button" className="mot-drawer__close" aria-label="Закрыть меню" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <div className="mot-sidebar__divider mot-sidebar__divider--drawer" aria-hidden />
        <nav className="mot-nav mot-nav--drawer">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>
      </aside>

      <aside className="mot-sidebar mot-desktop-only">
        <div className="mot-sidebar__brand">
          <LogoMark />
          <span className="mot-logo__text">SellYourBrick</span>
        </div>
        <div className="mot-sidebar__divider" aria-hidden />

        <nav className="mot-nav" aria-label="Кабинет продавца">
          {NAV_ITEMS.map(renderNavItem)}
        </nav>

        <div className="mot-sidebar-promo">
          <div className="mot-sidebar-promo__glow" aria-hidden />
          <div className="mot-sidebar-promo__body">
            <span className="mot-sidebar-promo__tag">Режим покупателя</span>
            <p className="mot-sidebar-promo__title">Станьте покупателем</p>
            <p className="mot-sidebar-promo__text">
              Ищите и бронируйте недвижимость на платформе
            </p>
            <button type="button" className="mot-btn mot-btn--white mot-btn--sm">
              Стать покупателем
            </button>
          </div>
          <div className="mot-sidebar-promo__visual">
            <img src={MOT_PROMO_IMAGES.sidebarBuyer} alt="" loading="lazy" decoding="async" />
          </div>
        </div>
      </aside>

      {mainColumn}

      <nav className="mot-tabbar mot-mobile-only" aria-label="Нижняя навигация">
        {TAB_ITEMS.map((item) => {
          if (item.fab) {
            return (
              <div key="fab" className="mot-tabbar__fab-slot">
                <Link to="/owner-add-property-test" className="mot-tabbar__fab" aria-label="Добавить">
                  <Plus size={28} strokeWidth={2.5} />
                </Link>
              </div>
            )
          }
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={`mot-tabbar__item${item.active ? ' mot-tabbar__item--active' : ''}`}
            >
              <Icon size={22} strokeWidth={item.active ? 2.25 : 2} aria-hidden />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

    </div>
  )
}
